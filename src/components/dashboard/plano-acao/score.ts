import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import { formatNumero, formatPct } from '@/lib/format';

/** Médias reais da equipe (do grupo em produção que entra no Plano de Ação) — usadas só
 * internamente pro Score Inteligente e pra "IA Recomenda" (Protocolados, Média/Dia). Recebidos
 * e Conversão não têm média exibida no card — são valores que dependem só da distribuição de
 * leads, não de esforço do colaborador, então comparar com a equipe seria enganoso. */
export interface MediaEquipe {
  protocolados: number;
  mediaDia: number;
}

export function calcularMediaEquipe(colaboradores: ColaboradorReal[], diasUteisPeriodo: number): MediaEquipe {
  const n = colaboradores.length || 1;
  return {
    protocolados: colaboradores.reduce((a, c) => a + c.protocolados, 0) / n,
    mediaDia: diasUteisPeriodo > 0 ? colaboradores.reduce((a, c) => a + c.assinados, 0) / diasUteisPeriodo / n : 0,
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
 * "IA Recomenda" — motor de regras 100% baseado em dados reais do colaborador, sempre citando
 * os números concretos do caso (nunca uma frase genérica que sirva pra qualquer um) e uma ação
 * que já nasce ligada a esse número. Mais de uma recomendação pode se aplicar ao mesmo tempo;
 * a mais crítica primeiro, pra aparecer resumida no topo do card.
 */
export function gerarRecomendacoesIA(
  c: ColaboradorReal,
  media: MediaEquipe,
  diasUteisPeriodo: number,
  tendencia: 'subindo' | 'caindo' | 'estavel',
  banda: NivelStatus,
  score: number,
  serie: number[],
): string[] {
  const recomendacoes: string[] = [];
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);

  if (c.assinados > 0 && c.protocolados === 0) {
    recomendacoes.push(
      `${formatNumero(c.assinados)} contrato${c.assinados === 1 ? '' : 's'} assinado${c.assinados === 1 ? '' : 's'} e nenhum protocolado ainda. Separar um horário hoje só pra protocolar esses casos antes de captar mais leads.`,
    );
  } else if (media.protocolados > 0 && c.protocolados > 0 && c.protocolados < media.protocolados * 0.5) {
    recomendacoes.push(
      `Protocolou ${formatNumero(c.protocolados)}, menos da metade da média da equipe (${media.protocolados.toFixed(1)}). Checar com o colaborador o que está travando o fechamento dos casos já assinados.`,
    );
  }

  if (c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5) {
    recomendacoes.push(
      `Converteu só ${formatPct(c.conversaoRecebidosAssinados, 1)} dos ${formatNumero(c.recebidos)} recebidos em assinados (${formatNumero(c.assinados)} no total) — abaixo do mínimo saudável de 5%. Revisar a abordagem comercial nos leads que já tem em mãos antes de pedir mais volume.`,
    );
  }

  if (media.mediaDia > 0 && mediaDia < media.mediaDia * 0.7) {
    const percentAbaixo = Math.round(100 - (mediaDia / media.mediaDia) * 100);
    recomendacoes.push(
      `Ritmo de ${mediaDia.toFixed(1)} assinados/dia, ${percentAbaixo}% abaixo da média da equipe (${media.mediaDia.toFixed(1)}/dia). Avaliar se falta volume de leads na carteira ou se é abordagem — conversar antes do fim da semana.`,
    );
  }

  if (tendencia === 'caindo' && serie.length >= 2) {
    const meio = Math.floor(serie.length / 2);
    const antes = serie.slice(0, meio).reduce((a, b) => a + b, 0);
    const depois = serie.slice(meio).reduce((a, b) => a + b, 0);
    recomendacoes.push(
      `Caiu de ${antes} para ${depois} assinados entre a 1ª e a 2ª metade do mês. Fazer um acompanhamento individual essa semana pra entender o motivo antes que vire uma tendência maior.`,
    );
  }

  if (c.metaMensal > 0 && c.atingimentoMetaMensal < 50) {
    recomendacoes.push(
      `Bateu só ${formatPct(c.atingimentoMetaMensal, 0)} da meta mensal (${formatNumero(c.assinados)} de ${formatNumero(c.metaMensal)}). Definir com o colaborador um plano de recuperação com metas semanais menores.`,
    );
  }

  if (banda === 'excelente') {
    recomendacoes.push(
      `Score ${score}, ${formatPct(c.conversaoRecebidosAssinados, 1)} de conversão e ${formatNumero(c.assinados)} assinados no período — desempenho de destaque. Reconhecer publicamente e usar como exemplo de abordagem com a equipe.`,
    );
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push(`Score ${score}, sem pontos críticos no momento — manter o acompanhamento de rotina.`);
  }
  return recomendacoes;
}
