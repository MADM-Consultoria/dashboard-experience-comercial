import type { ColaboradorMetricas, EtapaFunil, Gargalo, KpiEquipe } from '@/types/domain';

export function calcularFunilEquipe(kpi: KpiEquipe): EtapaFunil[] {
  return [
    { etapa: 'Recebidos', valor: kpi.totalRecebidos, taxaConversaoEtapaAnterior: null },
    { etapa: 'Assinados', valor: kpi.totalAssinados, taxaConversaoEtapaAnterior: kpi.taxaConversaoGeral > 0 ? (kpi.totalAssinados / (kpi.totalRecebidos || 1)) * 100 : 0 },
    { etapa: 'Protocolados', valor: kpi.totalProtocolados, taxaConversaoEtapaAnterior: (kpi.totalProtocolados / (kpi.totalAssinados || 1)) * 100 },
  ];
}

/**
 * Varre os colaboradores e a equipe em busca de gargalos operacionais,
 * priorizando sempre a perda estimada em quantidade de processos.
 */
export function detectarGargalos(colaboradores: ColaboradorMetricas[], kpi: KpiEquipe): Gargalo[] {
  const gargalos: Gargalo[] = [];

  // Gargalo estrutural: etapa Assinados -> Protocolados
  const perdaAssinadosProtocolados = kpi.totalAssinados - kpi.totalProtocolados;
  if (kpi.taxaProtocolados < 80 && perdaAssinadosProtocolados > 0) {
    gargalos.push({
      id: 'gargalo-etapa-protocolo',
      tipo: 'etapa_funil',
      titulo: 'Assinados → Protocolados é o maior gargalo',
      descricao: `${perdaAssinadosProtocolados} assinado(s) ainda sem protocolo (${kpi.taxaProtocolados.toFixed(0)}%).`,
      impactoEstimado: `${perdaAssinadosProtocolados} processo(s) parados`,
      perdaEstimada: perdaAssinadosProtocolados,
      severidade: kpi.taxaProtocolados < 60 ? 'critico' : kpi.taxaProtocolados < 75 ? 'alerta' : 'atencao',
      recomendacoes: ['Definir SLA de protocolo e monitorar diariamente os assinados pendentes.'],
    });
  }

  // Gargalo estrutural: etapa Recebidos -> Assinados
  const perdaRecebidosAssinados = kpi.totalRecebidos - kpi.totalAssinados;
  const taxaRecebidosAssinados = (kpi.totalAssinados / (kpi.totalRecebidos || 1)) * 100;
  if (taxaRecebidosAssinados < 75 && perdaRecebidosAssinados > 0) {
    gargalos.push({
      id: 'gargalo-etapa-assinatura',
      tipo: 'etapa_funil',
      titulo: 'Recebidos → Assinados perde oportunidades',
      descricao: `${perdaRecebidosAssinados} recebido(s) não assinado(s) (${taxaRecebidosAssinados.toFixed(0)}%).`,
      impactoEstimado: `${perdaRecebidosAssinados} oportunidade(s) perdida(s)`,
      perdaEstimada: perdaRecebidosAssinados,
      severidade: taxaRecebidosAssinados < 60 ? 'alerta' : 'atencao',
      recomendacoes: ['Revisar script de fechamento e reduzir o tempo de retorno ao cliente.'],
    });
  }

  // Gargalos por colaborador — maior perda individual
  const porPerda = [...colaboradores]
    .map((c) => ({ colaborador: c, perda: c.assinados - c.protocolados }))
    .filter((x) => x.perda > 0)
    .sort((a, b) => b.perda - a.perda);

  for (const { colaborador, perda } of porPerda.slice(0, 3)) {
    gargalos.push({
      id: `gargalo-colaborador-${colaborador.id}`,
      tipo: 'colaborador',
      titulo: `${colaborador.nome} concentra a maior perda individual`,
      descricao: `${perda} assinado(s) sem protocolo (${colaborador.conversaoAssinadosProtocolados.toFixed(0)}%).`,
      impactoEstimado: `${perda} processo(s) represado(s)`,
      perdaEstimada: perda,
      severidade: colaborador.status,
      colaboradorId: colaborador.id,
      recomendacoes: ['Auditar a carteira e redistribuir os casos parados.'],
    });
  }

  // Metas comprometidas
  const metasComprometidas = colaboradores.filter((c) => c.metaMensal > 0 && c.atingimentoMetaMensal < 70);
  if (metasComprometidas.length > 0) {
    gargalos.push({
      id: 'gargalo-metas',
      tipo: 'processo',
      titulo: 'Metas mensais comprometidas',
      descricao: `${metasComprometidas.length} colaborador(es) abaixo de 70% da meta.`,
      impactoEstimado: 'Risco direto ao resultado mensal da equipe',
      perdaEstimada: metasComprometidas.reduce((a, c) => a + Math.max(0, c.metaMensal - c.protocolados), 0),
      severidade: metasComprometidas.length >= colaboradores.length / 2 ? 'critico' : 'alerta',
      recomendacoes: ['Redistribuir carteira e acompanhar semanalmente.'],
    });
  }

  return gargalos.sort((a, b) => b.perdaEstimada - a.perdaEstimada);
}
