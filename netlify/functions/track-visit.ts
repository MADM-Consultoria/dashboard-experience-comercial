import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { registrarEvento } from './_shared/logs.js';
import { caminhoSeguro, extrairIp, ValidacaoError } from './_shared/validacao.js';

/** Registra qual página um colaborador logado visitou, para a governança de acesso. */
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
    }

    const sessao = validarToken(extrairToken(event.headers.authorization));
    if (!sessao) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessão inválida.' }) };
    }

    let body: { caminho?: string };
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Corpo inválido.' }) };
    }

    let caminho: string;
    try {
      caminho = caminhoSeguro(body.caminho);
    } catch (err) {
      if (err instanceof ValidacaoError) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: err.message }) };
      }
      throw err;
    }

    try {
      await registrarEvento({
        usuario: sessao.usuario,
        tipo: 'pagina',
        caminho,
        ip: extrairIp(event.headers['x-forwarded-for'] ?? event.headers['x-real-ip']),
      });
    } catch (err) {
      // Rastreamento é best-effort: nunca deve derrubar a navegação do usuário por causa disso.
      console.error('Falha ao registrar visita:', err);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Erro inesperado em track-visit:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Erro interno.' }) };
  }
};
