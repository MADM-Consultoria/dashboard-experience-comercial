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
  /** Só usada como fallback do componente "Assinados" da classificação pra quem não tem meta
   * cadastrada (ver calcularClassificacao) — não vira barra de comparação no card. */
  assinados: number;
  /** Referência do componente "Venda Ganha" da classificação. */
  vendaGanha: number;
}

export function calcularMediaEquipe(colaboradores: ColaboradorReal[], diasUteisPeriodo: number): MediaEquipe {
  const n = colaboradores.length || 1;
  return {
    recebidos: colaboradores.reduce((a, c) => a + c.recebidos, 0) / n,
    protocolados: colaboradores.reduce((a, c) => a + c.protocolados, 0) / n,
    mediaDia: diasUteisPeriodo > 0 ? colaboradores.reduce((a, c) => a + c.assinados, 0) / diasUteisPeriodo / n : 0,
    assinados: colaboradores.reduce((a, c) => a + c.assinados, 0) / n,
    vendaGanha: colaboradores.reduce((a, c) => a + c.vendaGanha, 0) / n,
  };
}

export function mediaDiaColaborador(c: ColaboradorReal, diasUteisPeriodo: number): number {
  return diasUteisPeriodo > 0 ? c.assinados / diasUteisPeriodo : 0;
}

export interface ClassificacaoResultado {
  banda: NivelStatus;
  /** Índice interno 0-100 usado só pra ordenar os cards (melhores primeiro) — não é exibido em
   * lugar nenhum da tela, só a banda (Excelente/Bom/Atenção/Alerta/Crítico) que ele define. */
  indice: number;
  /** Sub-notas 0-100 de cada componente antes do peso — usadas só internamente (ordenação e
   * complemento das mensagens da IA). Não tem número final auditável exposto na tela: a
   * classificação é o próprio resultado, sem um "score" separado pra alguém ter que validar. */
  detalhe: {
    assinadosScore: number;
    /** true = comparou com a meta pessoal real; false = sem meta cadastrada, comparou com a
     * média da equipe em vez disso (ver calcularClassificacao). */
    assinadosUsouMeta: boolean;
    protocoladosScore: number;
    vendaGanhaScore: number;
  };
}

export const BANDA_LABEL: Record<NivelStatus, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  atencao: 'Atenção',
  alerta: 'Alerta',
  critico: 'Crítico',
};

/**
 * Classificação do colaborador (Excelente/Bom/Atenção/Alerta/Crítico), definida com a
 * operação a partir de só 3 métricas — Assinados, Protocolados e Venda Ganha —, sem misturar
 * outras taxas (conversão, média/dia) que exigiam explicar uma fórmula própria pra alguém
 * questionar. Pesos:
 *   Assinados (vs. meta real do mês)   50%
 *   Protocolados (vs. média da equipe) 25%
 *   Venda Ganha (vs. média da equipe)  25%
 *
 * Quem não tem meta mensal cadastrada (metaMensal = 0, mostrado como "sem meta" no card) NÃO
 * pode ter o componente Assinados contado como 0% — isso penalizava silenciosamente quem nem
 * deveria estar sendo medido contra uma meta que não existe. Nesse caso, compara com a média
 * de assinados da equipe em vez da meta pessoal.
 */
export function calcularClassificacao(c: ColaboradorReal, media: MediaEquipe): ClassificacaoResultado {
  const assinadosUsouMeta = c.metaMensal > 0;
  const assinadosScore = assinadosUsouMeta
    ? Math.min(100, c.atingimentoMetaMensal)
    : media.assinados > 0
      ? Math.min(100, (c.assinados / media.assinados) * 100)
      : c.assinados > 0
        ? 100
        : 0;
  const protocoladosScore = media.protocolados > 0 ? Math.min(100, (c.protocolados / media.protocolados) * 100) : c.protocolados > 0 ? 100 : 0;
  const vendaGanhaScore = media.vendaGanha > 0 ? Math.min(100, (c.vendaGanha / media.vendaGanha) * 100) : c.vendaGanha > 0 ? 100 : 0;

  const indice = assinadosScore * 0.5 + protocoladosScore * 0.25 + vendaGanhaScore * 0.25;
  const arredondado = Math.round(indice);

  const banda: NivelStatus = arredondado >= 90 ? 'excelente' : arredondado >= 70 ? 'bom' : arredondado >= 50 ? 'atencao' : arredondado >= 30 ? 'alerta' : 'critico';
  return {
    banda,
    indice: arredondado,
    detalhe: { assinadosScore, assinadosUsouMeta, protocoladosScore, vendaGanhaScore },
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
    return `Poucos leads (${formatNumero(c.recebidos)}, méd. ${media.recebidos.toFixed(1)}) mas assina bem (${formatNumero(c.assinados)}). Gargalo: só ${formatNumero(c.protocolados)} protocolado(s) — priorizar isso.`;
  }

  // Recebeu muito lead, mas converte pouco em assinatura — e o pouco que assina, protocola bem.
  if (nivelRecebidos === 'alto' && nivelAssinados === 'baixo' && nivelProtocolados !== 'baixo') {
    return `Lead alto (${formatNumero(c.recebidos)}, méd. ${media.recebidos.toFixed(1)}) mas converte pouco (${formatNumero(c.assinados)} assinados). Protocola bem (${formatNumero(c.protocolados)}) — revisar abordagem, não a carga de leads.`;
  }

  // Assina bem (ou acima da meta), mas protocola muito abaixo da equipe — funil represado.
  if (nivelAssinados !== 'baixo' && nivelProtocolados === 'baixo') {
    return `Assinou bem (${formatNumero(c.assinados)}) mas protocolou só ${formatNumero(c.protocolados)} (méd. ${media.protocolados.toFixed(1)}) — funil represado no protocolo. Reservar tempo essa semana pra colocar em dia.`;
  }

  // Assina pouco, mas o pouco que assina vira protocolo acima da média — execução ótima, falta volume.
  if (nivelAssinados === 'baixo' && nivelProtocolados === 'alto') {
    return `Assina pouco (${formatNumero(c.assinados)}) mas protocola quase tudo (${formatNumero(c.protocolados)}, acima da méd. ${media.protocolados.toFixed(1)}) — falta volume, não execução. Avaliar lead na carteira.`;
  }

  // Recebeu pouco lead E assina pouco — problema pode não ser do colaborador, é distribuição.
  if (nivelRecebidos === 'baixo' && nivelAssinados === 'baixo' && nivelProtocolados !== 'baixo') {
    return `Poucos leads (${formatNumero(c.recebidos)}, méd. ${media.recebidos.toFixed(1)}) explicam o baixo volume (${formatNumero(c.assinados)} assinados); protocola bem (${formatNumero(c.protocolados)}). Avaliar redistribuição de carteira.`;
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
    return ' Também zerou protocolados — conferir os dois juntos.';
  }
  if (c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5) {
    return ` Conversão também baixa (${formatPct(c.conversaoRecebidosAssinados, 1)}) — pode não ser só pontual.`;
  }
  if (c.conversaoRecebidosAssinados > 20) {
    return ` Conversão segue alta (${formatPct(c.conversaoRecebidosAssinados, 1)}) — reforça que é pontual.`;
  }
  if (media.recebidos > 0 && c.recebidos < media.recebidos * 0.5) {
    return ` Também recebeu poucos leads (${formatNumero(c.recebidos)}) — pode explicar.`;
  }
  return escolherPor(c.id, [
    ' Confirmar se é pontual (férias, mudança de carteira).',
    ' Nada mais fora do lugar — provável ser pontual.',
    ' Resto normal — mais provável ser algo pontual.',
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
      `${formatNumero(c.assinados)} assinado(s), 0 protocolado. Separar horário hoje pra protocolar antes de captar mais leads.`,
    );
  } else if (media.protocolados > 0 && c.protocolados > 0 && c.protocolados < media.protocolados * 0.5) {
    recomendacoes.push(
      `Protocolou ${formatNumero(c.protocolados)}, menos da metade da média (${media.protocolados.toFixed(1)}). Checar o que trava o fechamento.`,
    );
  }

  if (c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5) {
    recomendacoes.push(
      `Conversão de ${formatPct(c.conversaoRecebidosAssinados, 1)} (${formatNumero(c.recebidos)} leads → ${formatNumero(c.assinados)} assinados), abaixo do mínimo (5%). Revisar abordagem nos leads em mãos.`,
    );
  }

  if (media.mediaDia > 0 && mediaDia < media.mediaDia * 0.7) {
    const percentAbaixo = Math.round(100 - (mediaDia / media.mediaDia) * 100);
    recomendacoes.push(
      `Ritmo de ${mediaDia.toFixed(1)}/dia, ${percentAbaixo}% abaixo da média (${media.mediaDia.toFixed(1)}/dia). Conversar até o fim da semana.`,
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
      // Classificação ainda boa mas zerou de vez — provavelmente interrupção pontual (férias, licença,
      // trocou de carteira), não desempenho ruim. O complemento busca algo real que distinga
      // esse caso do de outra pessoa na mesma situação, em vez de repetir a mesma frase.
      mensagem = `Zerou na 2ª metade (vinha de ${antes}). Classificação ainda ${BANDA_LABEL[banda].toLowerCase()}.${complementoZerouBandaBoa(c, media)}`;
    } else if (zerou) {
      mensagem = `Zerou os assinados na 2ª metade (vinha de ${antes}). Conversa essa semana antes que o mês feche assim.`;
    } else if (quedaPct >= 50) {
      mensagem = `Caiu ${quedaPct}% nos assinados (${antes} → ${depois}, 1ª → 2ª metade). Prioridade, não só acompanhamento.`;
    } else {
      mensagem = `Ritmo caiu ${quedaPct}% no mês (${antes} → ${depois} assinados). Ajuste simples pode reverter — vale conversa rápida.`;
    }
    recomendacoes.push(mensagem);
  }

  if (c.metaMensal > 0 && c.atingimentoMetaMensal < 50) {
    recomendacoes.push(
      `Bateu só ${formatPct(c.atingimentoMetaMensal, 0)} da meta (${formatNumero(c.assinados)} de ${formatNumero(c.metaMensal)}). Definir plano de recuperação com metas semanais menores.`,
    );
  }

  if (banda === 'excelente') {
    recomendacoes.push(
      `${formatPct(c.conversaoRecebidosAssinados, 1)} de conversão, ${formatNumero(c.assinados)} assinados — destaque. Reconhecer e usar de exemplo com a equipe.`,
    );
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Sem pontos críticos — manter o acompanhamento de rotina.');
  }
  return recomendacoes;
}
