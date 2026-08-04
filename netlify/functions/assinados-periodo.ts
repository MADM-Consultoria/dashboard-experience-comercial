import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db';
import { extrairToken, validarToken } from './_shared/auth';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe';

/**
 * Expõe a contagem de assinados por consultor em um período, a partir de
 * `madm.view_app_emitidos_e_assinados` (uma linha por contrato — a contagem
 * por colaborador vem de agrupar/contar linhas, não de uma coluna pronta).
 * Filtra só produto = Auxílio Acidente — a view também tem Quinquênio e
 * Concomitante, que não entram no dashboard.
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
      `select consultor_responsavel_assinatura as consultor, count(*)::int as total
         from madm.view_app_emitidos_e_assinados
        where status ilike 'signed'
          and produto ilike 'auxilio acidente'
          and data_assinatura between $1 and $2
        group by 1`,
      [inicio, fim],
    );
    const dados = filtrarPorTimeConsultor(resultado.rows, sessao.time);
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_app_emitidos_e_assinados:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
