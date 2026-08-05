import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db.js';
import { extrairToken, validarToken } from './_shared/auth.js';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe.js';

/**
 * Recebidos (leads qualificados) do canal Judit no período — mesma definição oficial
 * usada em assinados-judit-periodo: lead trabalhado por um SDR "Judit"
 * (madm.kommo_leads.sdr), qualificado dentro do período (data_qualificacao). Substitui de
 * vez a "Conversão Judit" antiga que vinha pronta de madm.view_relatorio_judit (relatório
 * mensal estático) — agora Recebidos e Assinados Judit vêm da mesma fonte real.
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
    const [totalResult, porConsultorResult] = await Promise.all([
      getPool().query(
        `select count(*)::int as total
           from madm.kommo_leads
          where data_qualificacao between $1 and $2
            and sdr = 'Judit'`,
        [inicio, fim],
      ),
      getPool().query(
        `select lead_usuario_responsavel as consultor, count(*)::int as total
           from madm.kommo_leads
          where data_qualificacao between $1 and $2
            and sdr = 'Judit'
          group by 1`,
        [inicio, fim],
      ),
    ]);
    const porConsultor = filtrarPorTimeConsultor(porConsultorResult.rows, sessao.time);
    const total = sessao.time ? porConsultor.reduce((a, r) => a + (Number(r.total) || 0), 0) : totalResult.rows[0]?.total ?? 0;
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, total, porConsultor }),
    };
  } catch (err) {
    console.error('Falha ao consultar recebidos Judit (sdr):', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
