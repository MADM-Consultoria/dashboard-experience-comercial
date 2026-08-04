import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db';
import { extrairToken, validarToken } from './_shared/auth';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe';

/**
 * Expõe a contagem de recebidos (leads qualificados) por consultor em um
 * período, a partir de `madm.view_app_kommo_leads` — recebidos são contados
 * pela data de qualificação (`data_qualificacao`), uma linha por lead.
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

  const inicio = event.queryStringParameters?.inicio;
  const fim = event.queryStringParameters?.fim;
  if (!inicio || !fim || !/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Parâmetros inicio/fim (YYYY-MM-DD) são obrigatórios.' }) };
  }

  try {
    const resultado = await getPool().query(
      `select lead_usuario_responsavel as consultor, count(*)::int as total
         from madm.view_app_kommo_leads
        where data_qualificacao between $1 and $2
        group by 1`,
      [inicio, fim],
    );
    const dados = filtrarPorTimeConsultor(resultado.rows, sessao.time);
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_app_kommo_leads:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
