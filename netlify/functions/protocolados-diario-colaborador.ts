import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db.js';
import { extrairToken, validarToken } from './_shared/auth.js';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe.js';

/**
 * Expõe a contagem de protocolados por dia e por consultor (lead_usuario_responsavel), a
 * partir de `madm.view_app_kommo_leads` — mesma fonte/coluna de protocolados-periodo.ts, só
 * que agrupado por dia também (data_protocolo_juridico_auditoria), pro ritmo diário do Plano
 * de Ação. Somente leitura — nenhum outro comando SQL além do SELECT abaixo.
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
      `select data_protocolo_juridico_auditoria::date as dia, lead_usuario_responsavel as consultor, count(*)::int as total
         from madm.view_app_kommo_leads
        where data_protocolo_juridico_auditoria between $1 and $2
        group by 1, 2
        order by 1`,
      [inicio, fim],
    );
    const dados = filtrarPorTimeConsultor(resultado.rows, sessao.time);
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_app_kommo_leads (protocolados diário por colaborador):', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
