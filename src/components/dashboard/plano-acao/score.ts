import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import { formatNumero, formatPct } from '@/lib/format';

/** Médias reais da equipe (do grupo em produção que entra no Plano de Ação). `recebidos` não
 * vira barra de comparação no card (depende da distribuição de leads, não do colaborador),
 * mas é um número real e continua útil como referência interna pro diagnóstico combinado da
 * IA — "recebeu pouco/muito lead" só faz sentido comparado com o que o resto da equipe recebeu. */
export interface MediaEquipe {
  recebidos: number;
  protocolados: number;
  mediaDia: number;
  /** Só usada como fallback do componente "Assinados" do Score pra quem não tem meta
   * cadastrada (ver calcularScoreInteligente) — não vira barra de comparação no card. */
  assinados: number;
}

export function calcularMediaEquipe(colaboradores: ColaboradorReal[], diasUteisPeriodo: number): MediaEquipe {
  const n = colaboradores.length || 1;
  return {
    recebidos: colaboradores.reduce((a, c) => a + c.recebidos, 0) / n,
    protocolados: colaboradores.reduce((a, c) => a + c.protocolados, 0) / n,
    mediaDia: diasUteisPeriodo > 0 ? colaboradores.reduce((a, c) => a + c.assinados, 0) / diasUteisPeriodo / n : 0,
    assinados: colaboradores.reduce((a, c) => a + c.assinados, 0) / n,
  };
}

export function mediaDiaColaborador(c: ColaboradorReal, diasUteisPeriodo: number): number {
  return diasUteisPeriodo > 0 ? c.assinados / diasUteisPeriodo : 0;
}

export interface ScoreResultado {
  score: number; // 0-100
  banda: NivelStatus;
  /** Sub-notas 0-100 de cada componente antes do peso — só pra montar um tooltip auditável
   * (mostrar exatamente de onde veio o número quando alguém questionar o score de alguém). */
  detalhe: {
    conversaoScore: number;
    protocoladosScore: number;
    assinadosScore: number;
    /** true = comparou com a meta pessoal real; false = sem meta cadastrada, comparou com a
     * média da equipe em vez disso (ver calcularScoreInteligente). */
    assinadosUsouMeta: boolean;
    mediaDiaScore: number;
  };
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
 *
 * Quem não tem meta mensal cadastrada (metaMensal = 0, mostrado como "sem meta" no card) NÃO
 * pode ter o componente Assinados contado como 0% — isso penalizava silenciosamente quem nem
 * deveria estar sendo medido contra uma meta que não existe. Nesse caso, compara com a média
 * de assinados da equipe em vez da meta pessoal (mesmo padrão já usado em Protocolados e
 * Média/Dia, que também caem pra média da equipe).
 */
export function calcularScoreInteligente(c: ColaboradorReal, media: MediaEquipe, diasUteisPeriodo: number): ScoreResultado {
  const conversaoScore = Math.min(100, c.conversaoAssinadosProtocolados);
  const protocoladosScore = media.protocolados > 0 ? Math.min(100, (c.protocolados / media.protocolados) * 100) : c.protocolados > 0 ? 100 : 0;
  const assinadosUsouMeta = c.metaMensal > 0;
  const assinadosScore = assinadosUsouMeta
    ? Math.min(100, c.atingimentoMetaMensal)
    : media.assinados > 0
      ? Math.min(100, (c.assinados / media.assinados) * 100)
      : c.assinados > 0
        ? 100
        : 0;
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);
  const mediaDiaScore = media.mediaDia > 0 ? Math.min(100, (mediaDia / media.mediaDia) * 100) : mediaDia > 0 ? 100 : 0;

  const score = conversaoScore * 0.4 + protocoladosScore * 0.25 + assinadosScore * 0.2 + mediaDiaScore * 0.15;
  const arredondado = Math.round(score);

  const banda: NivelStatus = arredondado >= 90 ? 'excelente' : arredondado >= 70 ? 'bom' : arredondado >= 50 ? 'atencao' : arredondado >= 30 ? 'alerta' : 'critico';
  return {
    score: arredondado,
    banda,
    detalhe: { conversaoScore, protocoladosScore, assinadosScore, assinadosUsouMeta, mediaDiaScore },
  };
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

type Nivel = 'baixo' | 'medio' | 'alto';

/** Compara um valor real com a média real da equipe — abaixo de 60% da média é "baixo", acima
 * de 140% é "alto", o resto é "médio". Usado só pra cruzar Recebidos/Assinados/Protocolados
 * entre si no diagnóstico combinado; nunca vira um número exibido sozinho. */
function nivelRelativo(valor: number, media: number): Nivel {
  if (media <= 0) return valor > 0 ? 'alto' : 'medio';
  const razao = valor / media;
  if (razao < 0.6) return 'baixo';
  if (razao > 1.4) return 'alto';
  return 'medio';
}

/**
 * Cruza Recebidos × Assinados × Protocolados do colaborador (cada um comparado com sua própria
 * referência real — Recebidos e Protocolados com a média da equipe, Assinados com a meta real)
 * pra identificar QUAL combinação específica está acontecendo — o mesmo "assinou pouco" tem
 * causa (e ação) completamente diferente se veio de pouco lead, de má conversão com lead de
 * sobra, ou de represamento no protocolo. Sem isso, dois colaboradores com problemas opostos
 * recebiam a mesma recomendação genérica só porque um número batia com um limiar isolado.
 */
function diagnosticoCombinado(c: ColaboradorReal, media: MediaEquipe): string | null {
  const nivelRecebidos = nivelRelativo(c.recebidos, media.recebidos);
  const nivelAssinados: Nivel = c.metaMensal > 0 ? (c.atingimentoMetaMensal < 60 ? 'baixo' : c.atingimentoMetaMensal > 100 ? 'alto' : 'medio') : 'medio';
  const nivelProtocolados: Nivel = c.assinados > 0 && c.protocolados === 0 ? 'baixo' : nivelRelativo(c.protocolados, media.protocolados);

  // Recebeu pouco, mas mesmo assim assina bem — o problema está em protocolar, não em vender.
  if (nivelRecebidos === 'baixo' && nivelAssinados !== 'baixo' && nivelProtocolados === 'baixo') {
    return `Recebeu só ${formatNumero(c.recebidos)} leads (média da equipe é ${media.recebidos.toFixed(1)}), mas mesmo com pouco volume assinou bem (${formatNumero(c.assinados)}). O gargalo real está em protocolar: só ${formatNumero(c.protocolados)} protocolado(s) até agora. Priorizar o protocolo dos casos já assinados antes de pedir mais leads pra essa pessoa.`;
  }

  // Recebeu muito lead, mas converte pouco em assinatura — e o pouco que assina, protocola bem.
  if (nivelRecebidos === 'alto' && nivelAssinados === 'baixo' && nivelProtocolados !== 'baixo') {
    return `Recebeu bastante lead (${formatNumero(c.recebidos)}, acima da média de ${media.recebidos.toFixed(1)} da equipe), mas converteu pouco em assinatura (${formatNumero(c.assinados)}). O que assina, no entanto, quase sempre vira protocolo (${formatNumero(c.protocolados)}) — a execução depois da venda está boa, o problema é a conversão do lead em contrato. Revisar a abordagem comercial, não a carga de leads.`;
  }

  // Assina bem (ou acima da meta), mas protocola muito abaixo da equipe — funil represado.
  if (nivelAssinados !== 'baixo' && nivelProtocolados === 'baixo') {
    return `Assinou ${formatNumero(c.assinados)} — dentro ou acima do esperado —, mas protocolou só ${formatNumero(c.protocolados)}, bem abaixo da média da equipe (${media.protocolados.toFixed(1)}). O funil está represado na etapa de protocolo, não na de vendas. Separar um bloco de tempo essa semana só pra colocar os casos assinados em dia.`;
  }

  // Assina pouco, mas o pouco que assina vira protocolo acima da média — execução ótima, falta volume.
  if (nivelAssinados === 'baixo' && nivelProtocolados === 'alto') {
    return `Assinou pouco (${formatNumero(c.assinados)}, abaixo da meta), mas o que assina protocola quase todo — ${formatNumero(c.protocolados)} protocolados, acima da média da equipe (${media.protocolados.toFixed(1)}). A execução depois da assinatura está ótima; o problema é volume de entrada. Avaliar se falta lead na carteira ou se é ritmo de abordagem.`;
  }

  // Recebeu pouco lead E assina pouco — problema pode não ser do colaborador, é distribuição.
  if (nivelRecebidos === 'baixo' && nivelAssinados === 'baixo' && nivelProtocolados !== 'baixo') {
    return `Recebeu só ${formatNumero(c.recebidos)} leads no período (média da equipe é ${media.recebidos.toFixed(1)}) — o volume baixo de assinados (${formatNumero(c.assinados)}) pode ser reflexo direto disso, não de desempenho: o que assina, protocola bem (${formatNumero(c.protocolados)}). Avaliar redistribuição de carteira antes de cobrar volume.`;
  }

  return null;
}

/** Escolhe determinístico (mesma pessoa sempre cai na mesma opção, mas pessoas diferentes
 * caem em opções diferentes) — usado só quando não sobra nenhum dado real que distinga um
 * caso do outro, pra pelo menos não repetir a MESMA frase literal em cards vizinhos. */
function escolherPor(id: string, opcoes: string[]): string {
  let soma = 0;
  for (let i = 0; i < id.length; i++) soma += id.charCodeAt(i);
  return opcoes[soma % opcoes.length];
}

/**
 * Frase de "zerou os assinados, mas o score ainda tá bom" — em vez de um único template com
 * só o número trocando (que em times grandes acaba repetindo a MESMA frase pra várias
 * pessoas), busca no resto dos dados reais do colaborador algo que distinga esse caso
 * especificamente: protocolados também zerados, conversão fora do normal, ou poucos leads
 * recebidos. Só cai no fallback (variado por pessoa) quando nada mais se destaca.
 */
function complementoZerouBandaBoa(c: ColaboradorReal, media: MediaEquipe): string {
  if (c.protocolados === 0) {
    return ' Também não protocolou nada esse mês — vale conferir os dois pontos na mesma conversa.';
  }
  if (c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5) {
    return ` A conversão geral também está baixa (${formatPct(c.conversaoRecebidosAssinados, 1)}), então talvez não seja só uma pausa.`;
  }
  if (c.conversaoRecebidosAssinados > 20) {
    return ` A conversão geral segue alta (${formatPct(c.conversaoRecebidosAssinados, 1)}), o que reforça que deve ser mesmo só uma pausa pontual.`;
  }
  if (media.recebidos > 0 && c.recebidos < media.recebidos * 0.5) {
    return ` Também recebeu poucos leads esse mês (${formatNumero(c.recebidos)}, bem abaixo da média da equipe) — pode ser parte da explicação.`;
  }
  return escolherPor(c.id, [
    ' Vale só confirmar se é pausa pontual (férias, mudança de carteira) antes de virar uma queda de verdade.',
    ' Sem nenhum outro número fora do lugar — provavelmente é só uma pausa; uma conversa rápida já tira a dúvida.',
    ' O resto dos números segue normal, então é mais provável que seja algo pontual do que uma queda real.',
  ]);
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

  // Cruza Recebidos × Assinados × Protocolados primeiro — cobre os casos onde o mesmo "número
  // baixo" tem causas opostas (pouco lead vs. má conversão vs. represamento no protocolo). Só
  // cai nos checks isolados abaixo se nenhuma combinação específica se encaixar.
  const diagnostico = diagnosticoCombinado(c, media);
  if (diagnostico) {
    recomendacoes.push(diagnostico);
  } else if (c.assinados > 0 && c.protocolados === 0) {
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
    const quedaPct = antes > 0 ? Math.round(((antes - depois) / antes) * 100) : 100;
    const zerou = depois === 0 && antes > 0;
    const bandaBoa = banda === 'excelente' || banda === 'bom';

    let mensagem: string;
    if (zerou && bandaBoa) {
      // Score ainda bom mas zerou de vez — provavelmente pausa pontual (férias, licença,
      // trocou de carteira), não desempenho ruim. O complemento busca algo real que distinga
      // esse caso do de outra pessoa na mesma situação, em vez de repetir a mesma frase.
      mensagem = `Vinha de ${antes} assinado(s) na 1ª metade do mês e zerou na 2ª — mas o score (${score}) ainda está em ${BANDA_LABEL[banda].split(' · ')[1].toLowerCase()}.${complementoZerouBandaBoa(c, media)}`;
    } else if (zerou) {
      mensagem = `Zerou os assinados na 2ª metade do mês depois de ${antes} na 1ª, e o score (${score}) já reflete isso. Conversa individual essa semana pra entender a causa antes que o mês feche assim.`;
    } else if (quedaPct >= 50) {
      mensagem = `Caiu ${quedaPct}% nos assinados — de ${antes} na 1ª metade do mês pra ${depois} na 2ª. Queda grande o bastante pra tratar como prioridade, não só acompanhar.`;
    } else {
      mensagem = `Ritmo caiu ${quedaPct}% ao longo do mês (${antes} → ${depois} assinados, 1ª pra 2ª metade). Ainda dá pra reverter com um ajuste simples — vale uma conversa rápida pra identificar o que mudou.`;
    }
    recomendacoes.push(mensagem);
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
