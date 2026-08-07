import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { intervaloConfiguradoMs, obterMetaCache } from './_shared/dashboardCache.js';

/**
 * Expõe quando o cache central do dashboard (ver `_shared/dashboardCache.ts`) foi atualizado
 * pela última vez com sucesso, e o intervalo configurado — é como dá pra saber, de fora, se o
 * cron está rodando de verdade e quanto falta pra próxima atualização, sem precisar olhar log
 * da Vercel. Usado pela tela de Configurações.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const sessao = validarToken(extrairToken(event.headers.authorization));
  if (!sessao) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessão inválida.' }) };
  }

  const meta = await obterMetaCache();
  return { statusCode: 200, body: JSON.stringify({ ok: true, ...meta, intervaloMs: intervaloConfiguradoMs() }) };
};
