import type { Handler } from '@netlify/functions';
import { extrairToken, validarToken } from './_shared/auth.js';
import { obterCache } from './_shared/dashboardCache.js';
import { assinadosDiarioPorTime } from './_shared/dashboardAgregacoes.js';

/**
 * Expõe a contagem de assinados por dia e por time, a partir do cache central do dashboard —
 * não consulta o Postgres diretamente. Alimenta o gráfico de evolução das equipes em Equipe.
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
    const linhas = assinadosDiarioPorTime(dados, inicio, fim);
    // Já tem o nome do time na linha — restringe direto, sem precisar do mapa consultor→time.
    const filtradas = sessao.time ? linhas.filter((r) => r.equipe === sessao.time) : linhas;
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados: filtradas }) };
  } catch (err) {
    console.error('Falha ao ler cache de assinados diário por time:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
