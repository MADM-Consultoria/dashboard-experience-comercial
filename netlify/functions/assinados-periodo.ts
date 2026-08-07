import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe.js';
import { obterCache } from './_shared/dashboardCache.js';
import { assinadosPorConsultor } from './_shared/dashboardAgregacoes.js';

/**
 * Expõe a contagem de assinados por consultor em um período, a partir do cache central do
 * dashboard (ver `_shared/dashboardCache.ts`) — não consulta o Postgres diretamente. Mesma
 * definição de sempre (madm.view_app_emitidos_e_assinados, status = signed, produto = auxílio
 * acidente, por `data_assinatura`), só que agregada em memória a partir dos dados já buscados
 * periodicamente por `cron-atualizar-cache.ts`.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const sessao = validarToken(extrairToken(event.headers.authorization));
  if (!sessao) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessão inválida.' }) };
  }

  const inicio = event.queryStringParameters?.inicio;
  const fim = event.queryStringParameters?.fim;
  if (!inicio || !fim || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Parâmetros inicio/fim (YYYY-MM-DD) são obrigatórios.' }) };
  }

  try {
    const { dados } = await obterCache();
    const linhas = assinadosPorConsultor(dados, inicio, fim);
    const filtradas = filtrarPorTimeConsultor(linhas, sessao.time);
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados: filtradas }) };
  } catch (err) {
    console.error('Falha ao ler cache de assinados:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
