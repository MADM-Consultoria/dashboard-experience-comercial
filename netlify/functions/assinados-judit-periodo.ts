import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db';
import { extrairToken, validarToken } from './_shared/auth';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe';

/**
 * Assinados do canal Judit no período — definição oficial passada pela operação:
 * lead trabalhado por um SDR "Judit" (madm.kommo_leads.sdr), qualificado E assinado
 * dentro do mesmo período. Diferente do "canal" por colaborador usado no resto do
 * app (Classificação Operacional), que é só uma aproximação.
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
        `select count(distinct e.id_kommo)::int as total
           from madm.emitidos_e_assinados e
           join madm.kommo_leads k on k.id = e.id_kommo::bigint
          where k.data_qualificacao between $1 and $2
            and e.data_assinatura between $1 and $2
            and k.sdr = 'Judit'`,
        [inicio, fim],
      ),
      getPool().query(
        `select e.consultor_responsavel_assinatura as consultor, count(distinct e.id_kommo)::int as total
           from madm.emitidos_e_assinados e
           join madm.kommo_leads k on k.id = e.id_kommo::bigint
          where k.data_qualificacao between $1 and $2
            and e.data_assinatura between $1 and $2
            and k.sdr = 'Judit'
          group by 1`,
        [inicio, fim],
      ),
    ]);
    const porConsultor = filtrarPorTimeConsultor(porConsultorResult.rows, sessao.time);
    // Restrito a um time: o total não pode vir da consulta bruta (empresa inteira) — some só
    // as linhas do time depois de filtradas, senão o card de total vazaria o número da empresa.
    const total = sessao.time ? porConsultor.reduce((a, r) => a + (Number(r.total) || 0), 0) : totalResult.rows[0]?.total ?? 0;
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, total, porConsultor }),
    };
  } catch (err) {
    console.error('Falha ao consultar assinados Judit (sdr):', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
