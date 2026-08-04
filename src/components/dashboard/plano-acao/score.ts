import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

/** Médias reais da equipe (do grupo em produção que entra no Plano de Ação) — usadas como
 * referência de comparação em vez de metas fixas que não existem no banco pra Recebidos,
 * Protocolados e Média/Dia (só Assinados tem meta real, `metaMensal`, vinda do relatório). */
export interface MediaEquipe {
  recebidos: number;
  protocolados: number;
  mediaDia: number;
  conversao: number;
}

export function calcularMediaEquipe(colaboradores: ColaboradorReal[], diasUteisPeriodo: number): MediaEquipe {
  const n = colaboradores.length || 1;
  return {
    recebidos: colaboradores.reduce((a, c) => a + c.recebidos, 0) / n,
    protocolados: colaboradores.reduce((a, c) => a + c.protocolados, 0) / n,
    mediaDia: diasUteisPeriodo > 0 ? colaboradores.reduce((a, c) => a + c.assinados, 0) / diasUteisPeriodo / n : 0,
    conversao: colaboradores.reduce((a, c) => a + c.conversaoAssinadosProtocolados, 0) / n,
  };
}

export function mediaDiaColaborador(c: ColaboradorReal, diasUteisPeriodo: number): number {
  return diasUteisPeriodo > 0 ? c.assinados / diasUteisPeriodo : 0;
}

export interface ScoreResultado {
  score: number; // 0-100
  banda: NivelStatus;
}

export const BANDA_LABEL: Record<NivelStatus, string> = {
  excelente: '90-100 · Excelente',
  bom: '70-89 · Bom',
  atencao: '50-69 · Atenção',
  alerta: '30-49 · Alerta',
  critico: '0-29 · Crítico',
};

/**
 * Score Inteligente (0-100), pesos definidos com a operação:
 *   Conversão (Assinados → Protocolados)  40%
 *   Protocolados (vs. média da equipe)    25%
 *   Assinados (vs. meta real do mês)      20%
 *   Média/Dia (vs. média da equipe)       15%
 * Cada componente é normalizado 0-100 antes de aplicar o peso — nenhum deles usa uma meta
 * inventada: Assinados usa a meta real do banco, os outros três usam a média real da equipe
 * que está sendo exibida no momento (mesmo grupo, mesmo período).
 */
export function calcularScoreInteligente(c: ColaboradorReal, media: MediaEquipe, diasUteisPeriodo: number): ScoreResultado {
  const conversaoScore = Math.min(100, c.conversaoAssinadosProtocolados);
  const protocoladosScore = media.protocolados > 0 ? Math.min(100, (c.protocolados / media.protocolados) * 100) : c.protocolados > 0 ? 100 : 0;
  const assinadosScore = Math.min(100, c.atingimentoMetaMensal);
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);
  const mediaDiaScore = media.mediaDia > 0 ? Math.min(100, (mediaDia / media.mediaDia) * 100) : mediaDia > 0 ? 100 : 0;

  const score = conversaoScore * 0.4 + protocoladosScore * 0.25 + assinadosScore * 0.2 + mediaDiaScore * 0.15;
  const arredondado = Math.round(score);

  const banda: NivelStatus = arredondado >= 90 ? 'excelente' : arredondado >= 70 ? 'bom' : arredondado >= 50 ? 'atencao' : arredondado >= 30 ? 'alerta' : 'critico';
  return { score: arredondado, banda };
}

/** Tendência real dos últimos dias com dado (comparando a 2ª metade da série com a 1ª) —
 * mesmo método usado em outras telas do dashboard pra evitar inventar "tendência". */
export function calcularTendenciaSerie(serie: number[]): 'subindo' | 'caindo' | 'estavel' {
  const meio = Math.floor(serie.length / 2);
  const antes = serie.slice(0, meio).reduce((a, b) => a + b, 0);
  const depois = serie.slice(meio).reduce((a, b) => a + b, 0);
  if (antes === 0 && depois === 0) return 'estavel';
  if (antes === 0) return 'subindo';
  const variacao = ((depois - antes) / antes) * 100;
  if (variacao >= 10) return 'subindo';
  if (variacao <= -10) return 'caindo';
  return 'estavel';
}

/**
 * "IA Recomenda" — motor de regras 100% baseado em dados reais do colaborador, nunca texto
 * genérico solto. Mais de uma recomendação pode se aplicar ao mesmo tempo.
 */
export function gerarRecomendacoesIA(c: ColaboradorReal, media: MediaEquipe, diasUteisPeriodo: number, tendencia: 'subindo' | 'caindo' | 'estavel', banda: NivelStatus): string[] {
  const recomendacoes: string[] = [];

  if (c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5) {
    recomendacoes.push('Conversão de Recebidos para Assinados muito abaixo do esperado. Revisar abordagem comercial.');
  }
  if (c.assinados > 0 && c.protocolados === 0) {
    recomendacoes.push('Possui assinaturas sem protocolo. Priorizar os protocolos pendentes.');
  }
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);
  if (media.mediaDia > 0 && mediaDia < media.mediaDia * 0.7) {
    recomendacoes.push('Recebendo poucos leads por dia em relação à equipe. Avaliar redistribuição da carteira.');
  }
  if (tendencia === 'caindo') {
    recomendacoes.push('Desempenho em queda nos últimos dias. Fazer acompanhamento individual.');
  }
  if (banda === 'excelente') {
    recomendacoes.push('Desempenho excelente — reconhecer publicamente e compartilhar boas práticas com a equipe.');
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Sem pontos críticos no momento — manter o acompanhamento de rotina.');
  }
  return recomendacoes;
}
