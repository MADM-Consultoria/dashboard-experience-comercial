import type { Handler } from '@netlify/functions';
import { getPool } from './_shared/db.js';
import { extrairToken, validarToken } from './_shared/auth.js';
import { filtrarPorTimeConsultor } from './_shared/timesEquipe.js';

/**
 * Expõe a contagem de venda ganha por dia e por consultor (lead_usuario_responsavel), a partir
 * de `madm.view_app_kommo_leads` — mesma definição de venda-ganha-periodo.ts (data de ganho,
 * funis/etapas do fluxo de venda ganha), só que agrupado por dia também, pro comparativo
 * mês atual x mês passado do Plano de Ação. Somente leitura — nenhum outro comando SQL além
 * do SELECT abaixo.
 */
const FUNIS_VENDA_GANHA = ['JURIDICO AUDITORIA DE GANHO', 'AUDITORIA DE GANHO', 'PRO'];
const ETAPAS_VENDA_GANHA = [
  'AG PROTOCOLO',
  'PROTOCOLADO',
  'Venda ganha',
  'AG PRONTUÁRIO',
  'ENTRADA',
  'Coleta dados Hospital',
  'E-MAIL NÃO RESPONDIDO',
  'E-MAIL RESPONDIDO',
  'AÇÃO DO CLIENTE',
  'ASSINATURA DO ADV',
  'PENDÊNCIA PRO',
  'VALIDAÇÃO SUPERVISOR',
  'FINALIZADO',
  'ANALISE DE PRONTUÁRIO',
];

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
      `select data_ganho::date as dia, lead_usuario_responsavel as consultor, count(*)::int as total
         from madm.view_app_kommo_leads
        where data_ganho between $1 and $2
          and funil_vendas = any($3)
          and etapa_lead = any($4)
        group by 1, 2
        order by 1`,
      [inicio, fim, FUNIS_VENDA_GANHA, ETAPAS_VENDA_GANHA],
    );
    const dados = filtrarPorTimeConsultor(resultado.rows, sessao.time);
    return { statusCode: 200, body: JSON.stringify({ ok: true, dados }) };
  } catch (err) {
    console.error('Falha ao consultar view_app_kommo_leads (venda ganha diário por colaborador):', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Não foi possível carregar os dados agora.' }) };
  }
};
