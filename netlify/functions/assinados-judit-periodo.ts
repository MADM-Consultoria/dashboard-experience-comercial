import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe.js';
import { obterCache } from './_shared/dashboardCache.js';
import { assinadosJuditPorConsultor } from './_shared/dashboardAgregacoes.js';

/**
 * Assinados do canal Judit no período — definição oficial: lead trabalhado por um SDR "Judit"
 * (madm.kommo_leads.sdr), qualificado E assinado dentro do mesmo período. A partir do cache
 * central do dashboard — não consulta o Postgres diretamente.
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
    const linhas = assinadosJuditPorConsultor(dados, inicio, fim);
    const porConsultor = filtrarPorTimeConsultor(linhas, sessao.time);
    // Restrito a um time: o total não pode vir da contagem bruta (empresa inteira) — some só
    // as linhas do time depois de filtradas, senão o card de total vazaria o número da empresa.
    const total = sessao.time
      ? porConsultor.reduce((a, r) => a + r.total, 0)
      : linhas.reduce((a, r) => a + r.total, 0);
    return { statusCode: 200, body: JSON.stringify({ ok: true, total, porConsultor }) };
  } catch (err) {
    console.error('Falha ao ler cache de assinados Judit:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
