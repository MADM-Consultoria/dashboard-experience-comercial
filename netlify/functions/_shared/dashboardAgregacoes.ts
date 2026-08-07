import type { DadosBrutos } from './dashboardQueries.js';

/**
 * Reaplica, em memória, exatamente os mesmos filtros/agrupamentos que cada rota antiga fazia em
 * SQL — só que sobre os dados já buscados por `dashboardCache.ts`, sem bater no banco de novo.
 * Cada função aqui é o equivalente 1:1 de uma query antiga; nenhuma regra de negócio (funil,
 * etapa, sdr, produto, status) mudou, só o lugar onde o filtro roda.
 */

const FUNIL_PROTOCOLADO = 'JURIDICO AUDITORIA DE GANHO';
const ETAPA_PROTOCOLADO = 'PROTOCOLADO';

const FUNIS_VENDA_GANHA = new Set(['JURIDICO AUDITORIA DE GANHO', 'AUDITORIA DE GANHO', 'PRO']);
const ETAPAS_VENDA_GANHA = new Set([
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
]);

function entre(data: string | null, inicio: string, fim: string): boolean {
  if (!data) return false;
  return data >= inicio && data <= fim;
}

function contarPorChave(chaves: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const chave of chaves) mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  return mapa;
}

export interface LinhaConsultorTotal {
  consultor: string | null;
  total: number;
}

export interface LinhaDiaConsultorTotal {
  dia: string;
  consultor: string | null;
  total: number;
}

/** Assinados por consultor no período — equivalente a assinados-periodo.ts. */
export function assinadosPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.assinados.filter((r) => entre(r.dia, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => r.consultor ?? ''));
  return Array.from(mapa, ([consultor, total]) => ({ consultor: consultor || null, total }));
}

/** Assinados por dia e consultor — equivalente a assinados-diario-colaborador.ts. */
export function assinadosDiarioPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaDiaConsultorTotal[] {
  const linhas = dados.assinados.filter((r) => entre(r.dia, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => `${r.dia}|${r.consultor ?? ''}`));
  return Array.from(mapa, ([chave, total]) => {
    const [dia, consultor] = chave.split('|');
    return { dia, consultor: consultor || null, total };
  });
}

/** Assinados por dia e time — equivalente a assinados-diario-por-time.ts. */
export function assinadosDiarioPorTime(dados: DadosBrutos, inicio: string, fim: string): { dia: string; equipe: string; total: number }[] {
  const linhas = dados.assinados.filter((r) => entre(r.dia, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => `${r.dia}|${r.equipe ?? ''}`));
  return Array.from(mapa, ([chave, total]) => {
    const [dia, equipe] = chave.split('|');
    return { dia, equipe, total };
  });
}

/** Recebidos (qualificados) por consultor no período — equivalente a recebidos-periodo.ts. */
export function recebidosPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.leads.filter((r) => entre(r.diaQualificacao, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => r.consultor ?? ''));
  return Array.from(mapa, ([consultor, total]) => ({ consultor: consultor || null, total }));
}

function ehProtocolado(r: DadosBrutos['leads'][number], inicio: string, fim: string): boolean {
  return entre(r.diaGanho, inicio, fim) && r.funilVendas === FUNIL_PROTOCOLADO && r.etapaLead === ETAPA_PROTOCOLADO;
}

/** Protocolados por consultor no período — equivalente a protocolados-periodo.ts. */
export function protocoladosPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.leads.filter((r) => ehProtocolado(r, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => r.consultor ?? ''));
  return Array.from(mapa, ([consultor, total]) => ({ consultor: consultor || null, total }));
}

/** Protocolados por dia e consultor — equivalente a protocolados-diario-colaborador.ts. */
export function protocoladosDiarioPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaDiaConsultorTotal[] {
  const linhas = dados.leads.filter((r) => ehProtocolado(r, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => `${r.diaGanho}|${r.consultor ?? ''}`));
  return Array.from(mapa, ([chave, total]) => {
    const [dia, consultor] = chave.split('|');
    return { dia, consultor: consultor || null, total };
  });
}

function ehVendaGanha(r: DadosBrutos['leads'][number], inicio: string, fim: string): boolean {
  return (
    entre(r.diaGanho, inicio, fim) &&
    !!r.funilVendas &&
    FUNIS_VENDA_GANHA.has(r.funilVendas) &&
    !!r.etapaLead &&
    ETAPAS_VENDA_GANHA.has(r.etapaLead)
  );
}

/** Venda ganha por consultor no período — equivalente a venda-ganha-periodo.ts. */
export function vendaGanhaPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.leads.filter((r) => ehVendaGanha(r, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => r.consultor ?? ''));
  return Array.from(mapa, ([consultor, total]) => ({ consultor: consultor || null, total }));
}

/** Venda ganha por dia e consultor — equivalente a venda-ganha-diario-colaborador.ts. */
export function vendaGanhaDiarioPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaDiaConsultorTotal[] {
  const linhas = dados.leads.filter((r) => ehVendaGanha(r, inicio, fim));
  const mapa = contarPorChave(linhas.map((r) => `${r.diaGanho}|${r.consultor ?? ''}`));
  return Array.from(mapa, ([chave, total]) => {
    const [dia, consultor] = chave.split('|');
    return { dia, consultor: consultor || null, total };
  });
}

/** Recebidos do canal Judit por consultor — equivalente a recebidos-judit-periodo.ts. */
export function recebidosJuditPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.leadsJudit.filter((r) => entre(r.diaQualificacao, inicio, fim) && r.sdr === 'Judit');
  const mapa = contarPorChave(linhas.map((r) => r.consultor ?? ''));
  return Array.from(mapa, ([consultor, total]) => ({ consultor: consultor || null, total }));
}

/** Assinados do canal Judit por consultor — equivalente a assinados-judit-periodo.ts.
 * `count(distinct id_kommo)` no SQL original vira dedupe por Set aqui, mesma semântica. */
export function assinadosJuditPorConsultor(dados: DadosBrutos, inicio: string, fim: string): LinhaConsultorTotal[] {
  const linhas = dados.assinadosJudit.filter((r) => entre(r.diaQualificacao, inicio, fim) && entre(r.diaAssinatura, inicio, fim));
  const porConsultor = new Map<string, Set<string>>();
  for (const r of linhas) {
    const chave = r.consultor ?? '';
    if (!porConsultor.has(chave)) porConsultor.set(chave, new Set());
    porConsultor.get(chave)!.add(r.idKommo);
  }
  return Array.from(porConsultor, ([consultor, ids]) => ({ consultor: consultor || null, total: ids.size }));
}
