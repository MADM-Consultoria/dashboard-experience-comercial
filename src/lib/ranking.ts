import type { ColaboradorMetricas, Medalha, RankingItem, TipoRanking } from '@/types/domain';

const CAMPO_POR_TIPO: Record<TipoRanking, (c: ColaboradorMetricas) => number> = {
  geral: (c) => c.assinados,
  conversao: (c) => c.conversaoAssinadosProtocolados,
  protocolados: (c) => c.protocolados,
  recebidos: (c) => c.recebidos,
  assinados: (c) => c.assinados,
  evolucao: (c) => c.variacaoPeriodoAnterior,
  eficiencia: (c) => c.eficiencia,
};

export const LABEL_RANKING: Record<TipoRanking, string> = {
  geral: 'Ranking Geral',
  conversao: 'Ranking de Conversão',
  protocolados: 'Ranking de Protocolados',
  recebidos: 'Ranking de Recebidos',
  assinados: 'Ranking de Assinados',
  evolucao: 'Ranking de Evolução',
  eficiencia: 'Ranking de Eficiência',
};

/**
 * Top 3 sempre leva ouro/prata/bronze — a posição já reflete quem mais assinou no mês.
 * Fora do pódio, a medalha segue o status real do colaborador.
 */
function medalhaPorPosicaoEStatus(posicao: number, colaborador: ColaboradorMetricas): Medalha {
  if (posicao === 1) return 'ouro';
  if (posicao === 2) return 'prata';
  if (posicao === 3) return 'bronze';
  if (colaborador.status === 'critico') return 'critico';
  if (colaborador.status === 'alerta') return 'atencao';
  return 'destaque';
}

export function calcularRanking(colaboradores: ColaboradorMetricas[], tipo: TipoRanking): RankingItem[] {
  const extrator = CAMPO_POR_TIPO[tipo];

  // Ranking Geral = quem mais assinou no mês fica em 1º, e assim por diante.
  const ordenado = [...colaboradores].sort((a, b) => extrator(b) - extrator(a));

  return ordenado.map((colaborador, index) => ({
    posicao: index + 1,
    colaborador,
    valor: extrator(colaborador),
    medalha: medalhaPorPosicaoEStatus(index + 1, colaborador),
  }));
}
