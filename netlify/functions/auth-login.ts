import type { Handler } from '@netlify/functions';
import { connectLambda } from '@netlify/blobs';
import { assinarToken, compararSeguro, getUsuarios } from './_shared/auth';
import { registrarEvento } from './_shared/logs';
import { buscarUsuarioRegistrado, verificarSenha } from './_shared/users';
import { extrairIp, textoSeguro, ValidacaoError } from './_shared/validacao';
import { limparTentativas, registrarTentativa, verificarLimite } from './_shared/rateLimit';
import { buscarTimeRestrito } from './_shared/supervisoresTime';

/**
 * Login com duas fontes de usuários:
 * 1. Usuários fixos configurados via variável de ambiente DASHBOARD_USERS
 *    (JSON: [{"usuario":"diretoria","senha":"...","role":"master","nome":"Diretoria"}]).
 * 2. Usuários que se cadastraram pelo próprio login (netlify/functions/auth-register.ts),
 *    guardados no Netlify Blobs com senha em hash (nunca em texto puro).
 *
 * Em caso de sucesso, devolve um token assinado (HMAC) com validade de 12h e
 * registra o evento de login (quem entrou e quando) para a governança de
 * acesso ver em /logs.
 */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LIMITE_TENTATIVAS = 10;
const JANELA_LIMITE_MS = 15 * 60 * 1000; // 15 minutos

export const handler: Handler = async (event) => {
  // O tipo de HandlerEvent (@netlify/functions) e o esperado por connectLambda
  // (@netlify/blobs) divergem entre as versões atuais dos dois pacotes — o cast é
  // só pra bater a assinatura de tipos, o objeto em runtime já tem o que o Blobs precisa.
  connectLambda(event as unknown as Parameters<typeof connectLambda>[0]);
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
    }

    if (!process.env.AUTH_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'AUTH_SECRET não configurado.' }) };
    }

    const ip = extrairIp(event.headers['x-nf-client-connection-ip'] ?? event.headers['client-ip']) ?? 'desconhecido';
    const chaveLimite = `login-ip:${ip}`;

    const limite = await verificarLimite(chaveLimite, LIMITE_TENTATIVAS, JANELA_LIMITE_MS);
    if (!limite.permitido) {
      const minutos = Math.ceil(limite.restanteMs / 60000);
      return {
        statusCode: 429,
        body: JSON.stringify({ ok: false, error: `Muitas tentativas. Tente novamente em ${minutos} minuto(s).` }),
      };
    }

    let body: { usuario?: string; senha?: string };
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Corpo inválido.' }) };
    }

    let usuario: string;
    let senha: string;
    try {
      usuario = textoSeguro(body.usuario, 'Usuário', 254);
      senha = textoSeguro(body.senha, 'Senha', 200);
    } catch (err) {
      if (err instanceof ValidacaoError) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: err.message }) };
      }
      throw err;
    }

    const usuarioNormalizado = usuario.toLowerCase();

    const fixo = getUsuarios().find((u) => u.usuario.toLowerCase() === usuarioNormalizado && compararSeguro(u.senha, senha));

    let usuarioFinal: string;
    let nomeFinal: string;
    let role: 'master' | 'user';

    if (fixo) {
      usuarioFinal = fixo.usuario;
      nomeFinal = fixo.nome ?? fixo.usuario;
      role = fixo.role === 'master' ? 'master' : 'user';
    } else {
      const registrado = await buscarUsuarioRegistrado(usuarioNormalizado);
      if (!registrado || !verificarSenha(senha, registrado.senhaHash)) {
        await registrarTentativa(chaveLimite, JANELA_LIMITE_MS);
        return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Usuário ou senha inválidos.' }) };
      }
      usuarioFinal = registrado.usuario;
      nomeFinal = registrado.nome;
      role = registrado.role;
    }

    await limparTentativas(chaveLimite);

    // Supervisor restrito ao próprio time — "master" nunca é restringido, mesmo que o
    // email por acaso esteja na lista (não deveria estar, mas a checagem é uma garantia extra).
    const timeRestrito = role === 'master' ? undefined : buscarTimeRestrito(usuarioFinal);

    const token = assinarToken(usuarioFinal, nomeFinal, role, SESSION_TTL_MS, timeRestrito);
    if (!token) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Falha ao gerar sessão.' }) };
    }

    try {
      await registrarEvento({
        usuario: usuarioFinal,
        tipo: 'login',
        ip,
        userAgent: event.headers['user-agent'],
      });
    } catch {
      // Não bloquear o login se o log falhar — a governança é importante, mas não pode travar o acesso.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, token, usuario: usuarioFinal, nome: nomeFinal, role, time: timeRestrito }),
    };
  } catch (err) {
    console.error('Erro inesperado em auth-login:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Erro interno. Tente novamente.' }) };
  }
};
