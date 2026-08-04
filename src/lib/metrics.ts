import type { ColaboradorMetricas, KpiEquipe, NivelStatus } from '@/types/domain';

export function pct(numerador: number, denominador: number): number {
  if (!denominador) return 0;
  return (numerador / denominador) * 100;
}

/**
 * Classifica o status de um colaborador com base na Taxa de Protocolados
 * (Protocolados / Assinados) — o indicador mais importante da plataforma.
 */
export function classificarStatus(taxaProtocolados: number): NivelStatus {
  if (taxaProtocolados >= 85) return 'excelente';
  if (taxaProtocolados >= 70) return 'bom';
  if (taxaProtocolados >= 60) return 'atencao';
  if (taxaProtocolados >= 45) return 'alerta';
  return 'critico';
}

export function calcularKpiEquipe(colaboradores: ColaboradorMetricas[], diasUteisPeriodo: number): KpiEquipe {
  const totalRecebidos = colaboradores.reduce((a, c) => a + c.recebidos, 0);
  const totalAssinados = colaboradores.reduce((a, c) => a + c.assinados, 0);
  const totalProtocolados = colaboradores.reduce((a, c) => a + c.protocolados, 0);
  // Aproximação por canal — useIntelligence sobrescreve com o total real (sdr = 'Judit') logo em seguida.
  const totalAssinadosJudit = colaboradores.filter((c) => c.canal === 'Judit').reduce((a, c) => a + c.assinados, 0);
  const totalRecebidosJudit = colaboradores.filter((c) => c.canal === 'Judit').reduce((a, c) => a + c.recebidos, 0);

  const metaDiariaEquipe = colaboradores.reduce((a, c) => a + c.metaDiaria, 0);
  const metaMensalEquipe = colaboradores.reduce((a, c) => a + c.metaMensal, 0);
  const metaPeriodoEquipe = metaDiariaEquipe * diasUteisPeriodo;

  const taxaConversaoGeral = pct(totalProtocolados, totalRecebidos);
  const taxaProtocolados = pct(totalProtocolados, totalAssinados);
  const produtividadeMedia = colaboradores.length ? colaboradores.reduce((a, c) => a + c.produtividade, 0) / colaboradores.length : 0;

  const ordenadosPorEficiencia = [...colaboradores].sort((a, b) => b.eficiencia - a.eficiencia);
  const melhorColaborador = ordenadosPorEficiencia[0] ?? null;
  const colaboradorAtencao = [...colaboradores].sort((a, b) => a.conversaoAssinadosProtocolados - b.conversaoAssinadosProtocolados)[0] ?? null;

  const eficienciaGeral = colaboradores.length ? colaboradores.reduce((a, c) => a + c.eficiencia, 0) / colaboradores.length : 0;

  const produtividadeAnteriorEstimada = colaboradores.length
    ? colaboradores.reduce((a, c) => a + c.produtividade / (1 + c.variacaoPeriodoAnterior / 100 || 1), 0) / colaboradores.length
    : 0;
  const variacaoProdutividade = produtividadeAnteriorEstimada > 0 ? pct(produtividadeMedia - produtividadeAnteriorEstimada, produtividadeAnteriorEstimada) : 0;

  return {
    totalRecebidos,
    totalAssinados,
    totalProtocolados,
    totalAssinadosJudit,
    totalRecebidosJudit,
    metaDiariaEquipe,
    metaMensalEquipe,
    // média diária de protocolados no período vs. meta diária da equipe (não o total do período — senão infla artificialmente com períodos maiores)
    progressoMetaDiaria: pct(totalProtocolados / (diasUteisPeriodo || 1), metaDiariaEquipe || 1),
    progressoMetaMensal: pct(totalProtocolados, metaPeriodoEquipe || 1),
    taxaConversaoGeral,
    taxaProtocolados,
    produtividadeMedia,
    melhorColaborador,
    colaboradorAtencao,
    eficienciaGeral,
    variacaoProdutividade,
  };
}
