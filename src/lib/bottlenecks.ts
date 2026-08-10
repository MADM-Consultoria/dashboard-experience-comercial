
import type { ColaboradorMetricas, EtapaFunil, Gargalo, KpiEquipe } from '@/types/domain';

/** ColaboradorReal (relatorioJudit.ts) tem `vendaGanha`, mas o tipo base ColaboradorMetricas
 * não — como esta function só recebe o objeto real em runtime, declara aqui só o campo extra
 * que precisa, mesmo padrão já usado em aplicarAssinadosPeriodo.ts. */
type ColaboradorComVendaGanha = ColaboradorMetricas & { vendaGanha?: number };

export function calcularFunilEquipe(kpi: KpiEquipe, totalVendaGanha: number): EtapaFunil[] {
  return [
    { etapa: 'Recebidos', valor: kpi.totalRecebidos, taxaConversaoEtapaAnterior: null },
    { etapa: 'Assinados', valor: kpi.totalAssinados, taxaConversaoEtapaAnterior: kpi.taxaConversaoGeral > 0 ? (kpi.totalAssinados / (kpi.totalRecebidos || 1)) * 100 : 0 },
    // Venda Ganha antes de Protocolados na exibição (pedido) — sua própria taxa continua
    // Assinados → Venda Ganha, que é uma comparação direta e sempre coerente (≤100% na
    // prática).
    { etapa: 'Venda Ganha', valor: totalVendaGanha, taxaConversaoEtapaAnterior: (totalVendaGanha / (kpi.totalAssinados || 1)) * 100 },
    // Protocolados não é estritamente posterior a Venda Ganha dentro do mesmo período filtrado
    // (a data de protocolo e a de venda ganha são colunas independentes de kommo_leads — um
    // caso pode ganhar a venda num mês tendo sido protocolado num mês anterior, ou vice-versa),
    // então dividir pelo total de Venda Ganha do período pode passar de 100% e não faz sentido
    // pra quem está lendo. Em vez disso, mostra a taxa de conversão geral: quantos % dos
    // Recebidos viraram Protocolados.
    { etapa: 'Protocolados', valor: kpi.totalProtocolados, taxaConversaoEtapaAnterior: (kpi.totalProtocolados / (kpi.totalRecebidos || 1)) * 100 },
  ];
}

/**
 * Varre os colaboradores e a equipe em busca de gargalos operacionais,
 * priorizando sempre a perda estimada em quantidade de processos.
 */
export function detectarGargalos(colaboradores: ColaboradorComVendaGanha[], kpi: KpiEquipe): Gargalo[] {
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
      // Impacto = % que AINDA FALTA protocolar (inverso da taxa de conversão) — barra cheia
      // quer dizer "quase tudo parado", não "quase tudo indo bem".
      impactoPct: 100 - kpi.taxaProtocolados,
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
      impactoPct: 100 - taxaRecebidosAssinados,
      severidade: taxaRecebidosAssinados < 60 ? 'alerta' : 'atencao',
      recomendacoes: ['Revisar script de fechamento e reduzir o tempo de retorno ao cliente.'],
    });
  }

  // Gargalos por colaborador — maior perda individual. "Perda" = casos assinados que ainda não
  // fecharam por NENHUM dos dois caminhos possíveis (Protocolados no jurídico OU Venda Ganha
  // por outro advogado) — mesma definição de "caso fechado" que já decide conversaoAssinados-
  // Protocolados e colaborador.status (ver aplicarAssinadosPeriodo.ts). Contar só Protocolados
  // aqui e usar colaborador.status (que já soma Venda Ganha) pra severidade criava uma
  // contradição visível: quem fechou tudo via Venda Ganha aparecia com perda alta E "Excelente"
  // ao mesmo tempo, porque as duas contas usavam regras diferentes pro que é "resolvido".
  const porPerda = [...colaboradores]
    .map((c) => ({ colaborador: c, perda: c.assinados - c.protocolados - (c.vendaGanha ?? 0) }))
    .filter((x) => x.perda > 0)
    .sort((a, b) => b.perda - a.perda);

  for (const { colaborador, perda } of porPerda.slice(0, 3)) {
    gargalos.push({
      id: `gargalo-colaborador-${colaborador.id}`,
      tipo: 'colaborador',
      titulo: `${colaborador.nome} concentra a maior perda individual`,
      descricao: `${perda} assinado(s) sem protocolo nem venda ganha (${colaborador.conversaoAssinadosProtocolados.toFixed(0)}% resolvido).`,
      impactoEstimado: `${perda} processo(s) represado(s)`,
      perdaEstimada: perda,
      impactoPct: 100 - colaborador.conversaoAssinadosProtocolados,
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
      // % da equipe afetada — real, não uma taxa de conversão como nos outros tipos.
      impactoPct: (metasComprometidas.length / (colaboradores.length || 1)) * 100,
      severidade: metasComprometidas.length >= colaboradores.length / 2 ? 'critico' : 'alerta',
      recomendacoes: ['Redistribuir carteira e acompanhar semanalmente.'],
    });
  }

  return gargalos.sort((a, b) => b.perdaEstimada - a.perdaEstimada);
}
