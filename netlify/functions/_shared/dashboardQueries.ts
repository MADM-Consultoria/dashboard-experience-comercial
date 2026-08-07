import type { Pool } from 'pg';

/**
 * Todas as consultas SQL que alimentam o dashboard, num único lugar. Cada uma busca dados BRUTOS
 * (linha a linha, sem agrupar por consultor/dia) pra uma janela ampla — quem agrupa/filtra pro
 * recorte exato que cada tela pede é `dashboardAgregacoes.ts`, em memória, sem bater no banco de
 * novo. Isso é o que permite 1 única consulta periódica (ver `dashboardCache.ts`) alimentar
 * qualquer período que o usuário escolher no calendário, contanto que caia dentro da janela.
 *
 * Mesmas definições de negócio que já existiam nas functions antigas (assinados-periodo.ts,
 * protocolados-periodo.ts, venda-ganha-periodo.ts, assinados-judit-periodo.ts etc.) — só mudou
 * de onde a query roda e quando.
 */

export interface LinhaAssinado {
  /** data_assinatura, já como YYYY-MM-DD */
  dia: string;
  consultor: string | null;
  equipe: string | null;
}

export interface LinhaLead {
  /** data_qualificacao, já como YYYY-MM-DD (null se o lead não foi qualificado) */
  diaQualificacao: string | null;
  /** data_ganho, já como YYYY-MM-DD (null se o lead não ganhou) */
  diaGanho: string | null;
  consultor: string | null;
  funilVendas: string | null;
  etapaLead: string | null;
}

/** `madm.kommo_leads` (tabela, não a view) — só essa tem a coluna `sdr`, usada pelas definições
 * oficiais de Judit. Colunas diferentes da view `view_app_kommo_leads` (que não tem `sdr`). */
export interface LinhaLeadJudit {
  diaQualificacao: string | null;
  consultor: string | null;
  sdr: string | null;
}

export interface LinhaAssinadoJudit {
  idKommo: string;
  consultor: string | null;
  diaQualificacao: string;
  diaAssinatura: string;
}

export interface DadosBrutos {
  assinados: LinhaAssinado[];
  leads: LinhaLead[];
  leadsJudit: LinhaLeadJudit[];
  assinadosJudit: LinhaAssinadoJudit[];
}

/**
 * Busca tudo que o dashboard precisa pra janela [inicio, fim] — 4 consultas, na mesma conexão
 * (pool `max: 1`, ver dashboardCache.ts), rodadas em paralelo já que são independentes entre si.
 * Nenhum filtro de negócio (funil/etapa/sdr/produto) fica de fora daqui: o que muda pra cada
 * tela é só o agrupamento/recorte, aplicado depois em dashboardAgregacoes.ts.
 */
export async function buscarDadosBrutos(pool: Pool, inicio: string, fim: string): Promise<DadosBrutos> {
  const [assinadosRes, leadsRes, leadsJuditRes, assinadosJuditRes] = await Promise.all([
    pool.query(
      `select data_assinatura::date::text as dia,
              consultor_responsavel_assinatura as consultor,
              equipe_responsavel_assinatura as equipe
         from madm.view_app_emitidos_e_assinados
        where status ilike 'signed'
          and produto ilike 'auxilio acidente'
          and data_assinatura between $1 and $2`,
      [inicio, fim],
    ),
    pool.query(
      `select data_qualificacao::date::text as "diaQualificacao",
              data_ganho::date::text as "diaGanho",
              lead_usuario_responsavel as consultor,
              funil_vendas as "funilVendas",
              etapa_lead as "etapaLead"
         from madm.view_app_kommo_leads
        where (data_qualificacao between $1 and $2)
           or (data_ganho between $1 and $2)`,
      [inicio, fim],
    ),
    pool.query(
      `select data_qualificacao::date::text as "diaQualificacao",
              lead_usuario_responsavel as consultor,
              sdr
         from madm.kommo_leads
        where data_qualificacao between $1 and $2`,
      [inicio, fim],
    ),
    pool.query(
      `select e.id_kommo as "idKommo",
              e.consultor_responsavel_assinatura as consultor,
              k.data_qualificacao::date::text as "diaQualificacao",
              e.data_assinatura::date::text as "diaAssinatura"
         from madm.emitidos_e_assinados e
         join madm.kommo_leads k on k.id = e.id_kommo::bigint
        where k.sdr = 'Judit'
          and k.data_qualificacao between $1 and $2
          and e.data_assinatura between $1 and $2`,
      [inicio, fim],
    ),
  ]);

  return {
    assinados: assinadosRes.rows.map((r) => ({ dia: r.dia, consultor: r.consultor, equipe: r.equipe })),
    leads: leadsRes.rows.map((r) => ({
      diaQualificacao: r.diaQualificacao,
      diaGanho: r.diaGanho,
      consultor: r.consultor,
      funilVendas: r.funilVendas,
      etapaLead: r.etapaLead,
    })),
    leadsJudit: leadsJuditRes.rows.map((r) => ({
      diaQualificacao: r.diaQualificacao,
      consultor: r.consultor,
      sdr: r.sdr,
    })),
    assinadosJudit: assinadosJuditRes.rows.map((r) => ({
      idKommo: String(r.idKommo),
      consultor: r.consultor,
      diaQualificacao: r.diaQualificacao,
      diaAssinatura: r.diaAssinatura,
    })),
  };
}
