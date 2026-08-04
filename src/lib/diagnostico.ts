import type {
  ColaboradorOperacional,
  DiagnosticoColaborador,
  DiagnosticoInsumo,
  DivergenciaMeta,
  FaixaVolume,
  NivelConversaoRelativo,
  NivelStatus,
  PaceProjecao,
} from '@/types/domain';

/**
 * Motor de diagnóstico de performance comercial (metodologia Leonardo/Sales Ops).
 *
 * Regra: cruzar Volume (Média por dia de assinados) × Qualidade (%
 * Conversão assinados/protocolados) para decidir a ação por colaborador.
 * Abaixo de 0.8/dia a amostra é pequena demais para a % de conversão ser
 * confiável — nesses casos a decisão depende do histórico, não do número
 * pontual, e o colaborador não deve entrar no mesmo gráfico dos demais.
 */

export function classificarFaixaVolume(mediaPorDia: number): FaixaVolume {
  if (mediaPorDia >= 1.9) return 'alto';
  if (mediaPorDia >= 1.5) return 'medio_alto';
  if (mediaPorDia >= 0.8) return 'medio_baixo';
  return 'baixo';
}

/**
 * Benchmark de conversão "alta/baixa" por canal, calculado como a mediana
 * atual dos colaboradores daquele canal (Discadora e Judit têm perfis de
 * conversão diferentes — não faz sentido usar um corte único).
 *
 * Ponto de partida para leitura do dashboard, não é meta oficial: validar
 * com os supervisores antes de comunicar como meta individual.
 */
export function calcularBenchmarkConversaoPorCanal(
  colaboradores: DiagnosticoInsumo[],
): Record<string, number> {
  const porCanal = new Map<string, number[]>();
  for (const c of colaboradores) {
    if (c.assinados <= 0) continue; // sem assinados, conversão não é representativa
    const lista = porCanal.get(c.classificacaoOperacional) ?? [];
    lista.push(c.conversaoAssinadosProtocoladosPct);
    porCanal.set(c.classificacaoOperacional, lista);
  }

  const benchmark: Record<string, number> = {};
  for (const [canal, valores] of porCanal) {
    benchmark[canal] = mediana(valores);
  }
  return benchmark;
}

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0 ? (ordenado[meio - 1] + ordenado[meio]) / 2 : ordenado[meio];
}

function acaoPorFaixa(faixa: FaixaVolume, nivelConversao: NivelConversaoRelativo | null): string {
  if (faixa === 'baixo') return 'Checar histórico dos últimos meses (tendência, não conversão pontual)';
  if (faixa === 'medio_baixo') return 'Entender cenário individual — não decidir só pelo número';
  if (faixa === 'medio_alto') return nivelConversao === 'baixa' ? 'Melhorar conversão assinado → protocolado' : 'Entregar mais leads';
  return nivelConversao === 'baixa' ? 'Ajustar conversão (perde ritmo do assinado ao protocolo)' : 'Manter e escalar ainda mais leads';
}

export function diagnosticarColaborador(
  colaborador: DiagnosticoInsumo,
  benchmarkPorCanal: Record<string, number>,
): DiagnosticoColaborador {
  const faixaVolume = classificarFaixaVolume(colaborador.mediaPorDia);
  const incluirNoGraficoDispersao = faixaVolume !== 'baixo';

  let nivelConversao: NivelConversaoRelativo | null = null;
  if (incluirNoGraficoDispersao) {
    const benchmark = benchmarkPorCanal[colaborador.classificacaoOperacional] ?? 0;
    nivelConversao = colaborador.conversaoAssinadosProtocoladosPct >= benchmark ? 'alta' : 'baixa';
  }

  return {
    colaborador: colaborador.colaborador,
    equipe: colaborador.equipe,
    canal: colaborador.classificacaoOperacional,
    mediaPorDia: colaborador.mediaPorDia,
    conversaoAssinadosProtocoladosPct: colaborador.conversaoAssinadosProtocoladosPct,
    faixaVolume,
    nivelConversao,
    incluirNoGraficoDispersao,
    acaoRecomendada: acaoPorFaixa(faixaVolume, nivelConversao),
    zeroProducao: colaborador.assinados === 0 && colaborador.recebidos > 0,
  };
}

export function diagnosticarEquipe(colaboradores: DiagnosticoInsumo[]): DiagnosticoColaborador[] {
  const benchmark = calcularBenchmarkConversaoPorCanal(colaboradores);
  return colaboradores.map((c) => diagnosticarColaborador(c, benchmark));
}

/** Colaboradores com leads recebidos mas zero assinado no mês — risco operacional, não de conversão. */
export function colaboradoresComZeroProducao<T extends Pick<DiagnosticoInsumo, 'assinados' | 'recebidos'>>(colaboradores: T[]): T[] {
  return colaboradores.filter((c) => c.assinados === 0 && c.recebidos > 0);
}

/**
 * pace atual = assinados realizados ÷ dias úteis decorridos
 * pace esperado = meta ÷ dias úteis totais do mês
 * projeção = pace atual × dias úteis totais
 * gap = projeção − meta
 *
 * Aplicável tanto ao total da empresa quanto a qualquer recorte (equipe, canal).
 */
export function calcularPaceProjecao(
  realizado: number,
  meta: number,
  diasUteisDecorridos: number,
  diasUteisTotais: number,
): PaceProjecao {
  const paceAtual = diasUteisDecorridos > 0 ? realizado / diasUteisDecorridos : 0;
  const paceEsperado = diasUteisTotais > 0 ? meta / diasUteisTotais : 0;
  const projecao = paceAtual * diasUteisTotais;
  const gap = projecao - meta;

  return { paceAtual, paceEsperado, projecao, gap };
}

/**
 * Classifica o pace pelo % de atingimento projetado da meta (projeção ÷ meta).
 * É um veredito independente do status de qualidade (Taxa de Protocolados) —
 * um colaborador pode ter volume ótimo (pace bom) e ainda assim qualidade
 * ruim (status crítico), ou vice-versa. São dois eixos diferentes.
 */
export function classificarPace(pace: PaceProjecao, meta: number): NivelStatus {
  const atingimento = meta > 0 ? (pace.projecao / meta) * 100 : 0;
  if (atingimento >= 100) return 'excelente';
  if (atingimento >= 85) return 'bom';
  if (atingimento >= 70) return 'atencao';
  if (atingimento >= 50) return 'alerta';
  return 'critico';
}

/**
 * A soma das metas individuais raramente bate com a meta oficial da empresa
 * (colaboradores sem produção às vezes têm meta cadastrada muito acima do
 * padrão dos demais). Nunca assumir que reconcilia — sempre expor a divergência.
 */
export function verificarDivergenciaMeta(
  colaboradores: ColaboradorOperacional[],
  metaOficial: number,
): DivergenciaMeta {
  const somaMetasIndividuais = colaboradores.reduce((acc, c) => acc + c.metaAssinadosMes, 0);
  const divergencia = somaMetasIndividuais - metaOficial;
  const divergenciaPct = metaOficial > 0 ? (divergencia / metaOficial) * 100 : 0;

  return { somaMetasIndividuais, metaOficial, divergencia, divergenciaPct };
}
