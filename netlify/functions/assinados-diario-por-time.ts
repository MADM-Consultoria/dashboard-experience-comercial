import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db';
import { extrairToken, validarToken } from './_shared/auth';

/**
 * Expõe a contagem de assinados por dia e por time (equipe_responsavel_assinatura),
 * a partir de `madm.view_app_emitidos_e_assinados` — alimenta o gráfico de
 * evolução das equipes em Equipe. Somente leitura — nenhum outro comando SQL
 * além do SELECT abaixo.
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
      `select data_assinatura::date as dia, equipe_responsavel_assinatura as equipe, count(*)::int as total
         from madm.view_app_emitidos_e_assinados
        where status ilike 'signed'
          and produto ilike 'auxilio acidente'
          and data_assinatura between $1 and $2
        group by 1, 2
        order by 1`,
      [inicio, fim],
    );
    // Já tem o nome do time na linha — restringe direto, sem precisar do mapa consultor→time.
    const dados = sessao.time ? resultado.rows.filter((r) => r.equipe === sessao.time) : resultado.rows;
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_app_emitidos_e_assinados (diário por time):', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
