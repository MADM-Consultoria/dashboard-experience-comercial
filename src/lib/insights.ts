import type { ColaboradorMetricas, InsightAutomatico, KpiEquipe } from '@/types/domain';

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

/**
 * "IA de BI": um conjunto de regras heurísticas que interpretam os números
 * como um gerente comercial experiente interpretaria, gerando frases prontas
 * para a diretoria. Não depende de nenhum serviço externo — tudo é derivado
 * das métricas já calculadas em src/lib/metrics.ts.
 */
export function gerarInsights(colaboradores: ColaboradorMetricas[], kpi: KpiEquipe): InsightAutomatico[] {
  seq = 0;
  const insights: InsightAutomatico[] = [];
  if (colaboradores.length === 0) return insights;

  // Perda pós-assinatura (gargalo estrutural do funil)
  const perdaPosAssinatura = 100 - kpi.taxaProtocolados;
  if (perdaPosAssinatura > 15) {
    insights.push({
      id: nextId('insight'),
      titulo: 'Gargalo pós-assinatura',
      descricao: `A equipe está assinando muitos contratos, mas ${perdaPosAssinatura.toFixed(0)}% deles não chegam a ser protocolados. Esse é o maior ponto de perda do funil comercial.`,
      categoria: 'gargalo',
      severidade: perdaPosAssinatura > 35 ? 'critico' : perdaPosAssinatura > 25 ? 'alerta' : 'atencao',
    });
  }

  // Concentração de produção
  const ordenadosPorProtocolo = [...colaboradores].sort((a, b) => b.protocolados - a.protocolados);
  const totalProtocolados = colaboradores.reduce((a, c) => a + c.protocolados, 0);
  if (totalProtocolados > 0 && ordenadosPorProtocolo.length >= 2) {
    const top2 = ordenadosPorProtocolo.slice(0, 2).reduce((a, c) => a + c.protocolados, 0);
    const participacao = (top2 / totalProtocolados) * 100;
    if (participacao >= 45) {
      insights.push({
        id: nextId('insight'),
        titulo: 'Concentração de resultado em poucos colaboradores',
        descricao: `${ordenadosPorProtocolo[0].nome} e ${ordenadosPorProtocolo[1].nome} concentram ${participacao.toFixed(0)}% de todos os protocolos da equipe — risco de dependência operacional.`,
        categoria: 'risco',
        severidade: participacao >= 60 ? 'alerta' : 'atencao',
      });
    }
  }

  // Colaboradores abaixo da meta
  const abaixoDaMeta = colaboradores.filter((c) => c.atingimentoMetaMensal < 85);
  if (abaixoDaMeta.length > 0) {
    insights.push({
      id: nextId('insight'),
      titulo: 'Metas em risco',
      descricao: `${abaixoDaMeta.length} colaborador(es) estão abaixo de 85% da meta do período: ${abaixoDaMeta.map((c) => c.nome).join(', ')}.`,
      categoria: 'risco',
      severidade: abaixoDaMeta.length >= colaboradores.length / 2 ? 'critico' : 'alerta',
    });
  }

  // Variação de produtividade da equipe
  if (Math.abs(kpi.variacaoProdutividade) >= 8) {
    insights.push({
      id: nextId('insight'),
      titulo: kpi.variacaoProdutividade < 0 ? 'Queda de produtividade da equipe' : 'Crescimento de produtividade da equipe',
      descricao: `A produtividade média ${kpi.variacaoProdutividade < 0 ? 'caiu' : 'cresceu'} ${Math.abs(kpi.variacaoProdutividade).toFixed(0)}% em relação ao período anterior.`,
      categoria: kpi.variacaoProdutividade < 0 ? 'risco' : 'destaque',
      severidade: kpi.variacaoProdutividade < -10 ? 'alerta' : kpi.variacaoProdutividade < 0 ? 'atencao' : 'bom',
    });
  }

  // Maior gargalo operacional (etapa do funil)
  const convMedia1 = colaboradores.reduce((a, c) => a + c.conversaoRecebidosAssinados, 0) / colaboradores.length;
  const convMedia2 = colaboradores.reduce((a, c) => a + c.conversaoAssinadosProtocolados, 0) / colaboradores.length;
  const etapaMaisFraca = convMedia1 < convMedia2 ? 'Emitidos → Assinados' : 'Assinados → Protocolados';
  insights.push({
    id: nextId('insight'),
    titulo: 'Maior gargalo operacional identificado',
    descricao: `A etapa "${etapaMaisFraca}" apresenta a menor taxa de conversão média da equipe e representa o principal ponto de perda de processos.`,
    categoria: 'gargalo',
    severidade: 'atencao',
  });

  // Destaque positivo
  if (kpi.melhorColaborador) {
    insights.push({
      id: nextId('insight'),
      titulo: 'Destaque de performance',
      descricao: `${kpi.melhorColaborador.nome} lidera a eficiência da equipe com ${kpi.melhorColaborador.eficiencia.toFixed(0)} pontos e taxa de protocolados de ${kpi.melhorColaborador.conversaoAssinadosProtocolados.toFixed(0)}% — um modelo a ser replicado.`,
      categoria: 'destaque',
      severidade: 'excelente',
    });
  }

  // Oportunidade de treinamento
  const precisamTreinamento = colaboradores.filter((c) => c.status === 'alerta' || c.status === 'critico');
  if (precisamTreinamento.length > 0) {
    insights.push({
      id: nextId('insight'),
      titulo: 'Oportunidade de treinamento',
      descricao: `${precisamTreinamento.map((c) => c.nome).join(', ')} apresentam taxa de protocolados consistentemente baixa e podem se beneficiar de treinamento focado em follow-up de documentação.`,
      categoria: 'oportunidade',
      severidade: 'atencao',
    });
  }

  return insights;
}
