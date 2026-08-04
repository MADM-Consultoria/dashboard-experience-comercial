import type { Handler } from '@netlify/functions';
import { connectLambda } from '@netlify/blobs';
import { extrairToken, validarToken } from './_shared/auth';
import { registrarEvento } from './_shared/logs';
import { caminhoSeguro, extrairIp, ValidacaoError } from './_shared/validacao';

/** Registra qual página um colaborador logado visitou, para a governança de acesso. */
export const handler: Handler = async (event) => {
  // O tipo de HandlerEvent (@netlify/functions) e o esperado por connectLambda
  // (@netlify/blobs) divergem entre as versões atuais dos dois pacotes — o cast é
  // só pra bater a assinatura de tipos, o objeto em runtime já tem o que o Blobs precisa.
  connectLambda(event as unknown as Parameters<typeof connectLambda>[0]);
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
        ip: extrairIp(event.headers['x-nf-client-connection-ip'] ?? event.headers['client-ip']),
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
