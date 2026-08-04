import type { Handler } from '@netlify/functions';
import { connectLambda } from '@netlify/blobs';
import { extrairToken, validarToken } from './_shared/auth';
import { listarEventos } from './_shared/logs';

/** Só usuários com role "master" podem ver o histórico de login/navegação da equipe. */
export const handler: Handler = async (event) => {
  // O tipo de HandlerEvent (@netlify/functions) e o esperado por connectLambda
  // (@netlify/blobs) divergem entre as versões atuais dos dois pacotes — o cast é
  // só pra bater a assinatura de tipos, o objeto em runtime já tem o que o Blobs precisa.
  connectLambda(event as unknown as Parameters<typeof connectLambda>[0]);

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
