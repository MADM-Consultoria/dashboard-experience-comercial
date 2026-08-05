import type { Handler } from '@netlify/functions';
import { assinarToken, getUsuarios } from './_shared/auth.js';
import { registrarEvento } from './_shared/logs.js';
import { buscarUsuarioRegistrado, criarUsuarioRegistrado, ehLoginMaster, hashSenha, validarEmailCorporativo } from './_shared/users.js';
import { extrairIp, textoSeguro, ValidacaoError } from './_shared/validacao.js';
import { registrarTentativa, verificarLimite } from './_shared/rateLimit.js';
import { buscarTimeRestrito } from './_shared/supervisoresTime.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LIMITE_CADASTROS = 5;
const JANELA_LIMITE_MS = 60 * 60 * 1000; // 1 hora

/**
 * Autocadastro: a pessoa informa o próprio email corporativo
 * (primeiro.sobrenome@madmbrasil.com.br) e escolhe uma senha. Role é "user"
 * por padrão, exceto se o login estiver na lista MASTER_LOGINS (variável de
 * ambiente) — aí já entra como "master" e vê /logs automaticamente. Senha é
 * guardada com hash (scrypt + salt), nunca em texto puro.
 */
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
    }

    if (!process.env.AUTH_SECRET) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'AUTH_SECRET não configurado.' }) };
    }

    const ip = extrairIp(event.headers['x-forwarded-for'] ?? event.headers['x-real-ip']) ?? 'desconhecido';
    const chaveLimite = `register-ip:${ip}`;

    const limite = await verificarLimite(chaveLimite, LIMITE_CADASTROS, JANELA_LIMITE_MS);
    if (!limite.permitido) {
      const minutos = Math.ceil(limite.restanteMs / 60000);
      return {
        statusCode: 429,
        body: JSON.stringify({ ok: false, error: `Muitos cadastros seguidos. Tente novamente em ${minutos} minuto(s).` }),
      };
    }
    await registrarTentativa(chaveLimite, JANELA_LIMITE_MS);

    let body: { email?: string; senha?: string };
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Corpo inválido.' }) };
    }

    let email: string;
    let senha: string;
    try {
      email = textoSeguro(body.email, 'Email corporativo', 254);
      senha = textoSeguro(body.senha, 'Senha', 200);
    } catch (err) {
      if (err instanceof ValidacaoError) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: err.message }) };
      }
      throw err;
    }
    if (senha.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }) };
    }

    const validado = validarEmailCorporativo(email);
    if (!validado) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'Use seu email corporativo no formato nome.sobrenome@madmbrasil.com.br.' }),
      };
    }
    const { usuario, nomeExibicao } = validado;

    const jaExisteFixo = getUsuarios().some((u) => u.usuario.toLowerCase() === usuario);
    const jaExisteRegistrado = await buscarUsuarioRegistrado(usuario);
    if (jaExisteFixo || jaExisteRegistrado) {
      return { statusCode: 409, body: JSON.stringify({ ok: false, error: `Já existe uma conta para ${usuario}. Tente entrar em vez de cadastrar.` }) };
    }

    const role = ehLoginMaster(usuario) ? 'master' : 'user';

    await criarUsuarioRegistrado({
      usuario,
      nome: nomeExibicao,
      senhaHash: hashSenha(senha),
      role,
    });

    const timeRestrito = role === 'master' ? undefined : buscarTimeRestrito(usuario);

    const token = assinarToken(usuario, nomeExibicao, role, SESSION_TTL_MS, timeRestrito);
    if (!token) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Conta criada, mas falha ao gerar sessão. Tente entrar.' }) };
    }

    try {
      await registrarEvento({ usuario, tipo: 'login', ip, userAgent: event.headers['user-agent'] });
    } catch {
      // Best-effort.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, token, usuario, nome: nomeExibicao, role, time: timeRestrito }),
    };
  } catch (err) {
    console.error('Erro inesperado em auth-register:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Erro interno. Tente novamente.' }) };
  }
};
