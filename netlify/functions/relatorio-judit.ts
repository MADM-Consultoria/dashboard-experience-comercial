import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db.js';
import { extrairToken, validarToken } from './_shared/auth.js';

/**
 * Expõe a view `madm.view_relatorio_judit` (métricas mensais agregadas por
 * colaborador) para alimentar o dashboard com dados reais em vez de mock.
 * Somente leitura — nenhum outro comando SQL além do SELECT abaixo.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const sessao = validarToken(extrairToken(event.headers.authorization));
  if (!sessao) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: 'Sessão inválida.' }) };
  }

  try {
    const resultado = await getPool().query('select * from madm.view_relatorio_judit');
    // Supervisor restrito: só as linhas do próprio time — a coluna "Equipe" já vem pronta na view.
    const dados = sessao.time ? resultado.rows.filter((r) => r.Equipe === sessao.time) : resultado.rows;
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_relatorio_judit:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
