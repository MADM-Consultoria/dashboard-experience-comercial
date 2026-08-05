import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { listarEventos } from './_shared/logs.js';

/** Só usuários com role "master" podem ver o histórico de login/navegação da equipe. */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const sessao = validarToken(extrairToken(event.headers.authorization));
  if (!sessao) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessão inválida.' }) };
  }
  if (sessao.role !== 'master') {
    return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'Acesso restrito.' }) };
  }

  try {
    const eventos = await listarEventos(1000);
    return { statusCode: 200, body: JSON.stringify({ ok: true, eventos }) };
  } catch (err) {
    console.error('Falha ao listar eventos:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os registros agora.' }) };
  }
};
