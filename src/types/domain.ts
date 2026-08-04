/**
 * Modelo de domínio da plataforma de inteligência comercial. Os dados reais
 * vêm de madm.view_relatorio_judit (ver src/lib/relatorioJudit.ts), mapeados
 * pra esse shape pra alimentar src/lib/metrics.ts, alerts.ts etc.
 */

export type NivelStatus = 'excelente' | 'bom' | 'atencao' | 'alerta' | 'critico';

export type NivelPrioridadeAlerta = 'critico' | 'alto' | 'medio';

export type TendenciaDirecao = 'subindo' | 'estavel' | 'caindo';

/** Um ponto de produção diária, base de todas as séries temporais. */
export interface RegistroDiario {
  data: string; // ISO date (YYYY-MM-DD)
  colaboradorId: string;
  emitidos: number;
  assinados: number;
  protocolados: number;
  /** Ligações produtivas (que geraram contato efetivo) feitas no dia — insumo do funil antes de "emitidos". */
  ligacoesProdutivas: number;
}

/** Canal de origem do lead do colaborador — Judit é a automação de leads, mesclada entre os times. */
export type CanalOrigem = 'Judit' | 'Discadora';

/** Cadastro de um colaborador, tal como viria da aba "Equipe" da planilha. */
export interface ColaboradorCadastro {
  id: string;
  nome: string;
  cargo: string;
  time: string;
  canal: CanalOrigem;
  avatarUrl?: string;
  metaDiaria: number;
  metaMensal: number;
  dataAdmissao: string; // ISO date
  ativo: boolean;
}

/** Colaborador com todas as métricas já calculadas para o período selecionado. */
export interface ColaboradorMetricas {
  id: string;
  nome: string;
  cargo: string;
  time: string;
  canal: CanalOrigem;
  avatarUrl?: string;
  /** Segue a lista de ativos da diretoria (src/lib/colaboradoresAtivos.ts) — quem desligou continua
   * contando pros totais da empresa (Recebidos/Assinados/Protocolados/Venda Ganha), mas some das
   * listagens por pessoa (Equipe, Plano de Ação, Ranking). */
  ativo: boolean;

  recebidos: number;
  assinados: number;
  protocolados: number;

  metaDiaria: number;
  metaMensal: number;
  atingimentoMetaMensal: number; // %

  conversaoRecebidosAssinados: number; // %
  conversaoAssinadosProtocolados: number; // % <- indicador principal (Taxa de Protocolados)
  conversaoGeral: number; // %

  produtividade: number; // média diária de protocolados
  eficiencia: number; // score 0-100 combinando conversão + atingimento de meta
  tendencia: TendenciaDirecao;
  variacaoPeriodoAnterior: number; // % de variação de protocolados vs período anterior

  status: NivelStatus;
  historico: RegistroDiario[];
}

export interface KpiEquipe {
  totalRecebidos: number;
  totalAssinados: number;
  totalProtocolados: number;
  /** Assinados do canal Judit (madm.kommo_leads.sdr = 'Judit') no período. */
  totalAssinadosJudit: number;
  /** Recebidos do canal Judit (madm.kommo_leads.sdr = 'Judit', data_qualificacao) no período. */
  totalRecebidosJudit: number;
  metaDiariaEquipe: number;
  metaMensalEquipe: number;
  progressoMetaDiaria: number; // %
  progressoMetaMensal: number; // %
  taxaConversaoGeral: number; // %
  taxaProtocolados: number; // % <- indicador principal agregado
  produtividadeMedia: number;
  melhorColaborador: ColaboradorMetricas | null;
  colaboradorAtencao: ColaboradorMetricas | null;
  eficienciaGeral: number; // score 0-100
  variacaoProdutividade: number; // % vs período anterior
}

export interface AlertaInteligente {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  tipo: 'taxa_protocolados_baixa' | 'meta_comprometida' | 'queda_produtividade' | 'baixa_conversao_inicial' | 'venda_ganha_baixa';
  prioridade: NivelPrioridadeAlerta;
  taxa: number;
  impacto: string;
  possiveisMotivos: string[];
  sugestoesAcao: string[];
  criadoEm: string; // ISO date
}

export interface InsightAutomatico {
  id: string;
  titulo: string;
  descricao: string;
  categoria: 'gargalo' | 'oportunidade' | 'risco' | 'destaque' | 'tendencia';
  severidade: NivelStatus;
}

export type TipoRanking =
  | 'geral'
  | 'conversao'
  | 'protocolados'
  | 'recebidos'
  | 'assinados'
  | 'evolucao'
  | 'eficiencia';

export type Medalha = 'ouro' | 'prata' | 'bronze' | 'destaque' | 'atencao' | 'critico';

export interface RankingItem {
  posicao: number;
  colaborador: ColaboradorMetricas;
  valor: number;
  medalha: Medalha;
}

export interface EtapaFunil {
  etapa: 'Recebidos' | 'Assinados' | 'Protocolados' | 'Venda Ganha';
  valor: number;
  taxaConversaoEtapaAnterior: number | null; // %
}

export interface Gargalo {
  id: string;
  tipo: 'etapa_funil' | 'colaborador' | 'processo';
  titulo: string;
  descricao: string;
  impactoEstimado: string;
  perdaEstimada: number; // quantidade de processos perdidos estimados
  severidade: NivelStatus;
  colaboradorId?: string;
  recomendacoes: string[];
}

export interface PeriodoFiltro {
  inicio: string;
  fim: string;
  label: string;
}

/**
 * Linha "crua" da planilha operacional (abas Geral-pessoa / View), um
 * colaborador por registro. Este é o shape de entrada do motor de
 * diagnóstico em src/lib/diagnostico.ts — antes de qualquer cálculo.
 */
export interface ColaboradorOperacional {
  colaborador: string;
  equipe: string;
  /** "Judit" | "Discadora" (ou outro canal) — define o benchmark de conversão usado. */
  classificacaoOperacional: string;
  mediaPorDia: number;
  recebidos: number;
  emitidos: number;
  assinados: number;
  protocolados: number;
  conversaoGeralPct: number;
  conversaoAssinadosProtocoladosPct: number;
  metaAssinadosMes: number;
  metaAssinadosAtual: number;
  atingAssinadosPct: number;
  gapAssinadosAtual: number;
  gapAssinadosMes: number;
  vendaGanha: number;
  vendaGanhaJudit: number;
  metaProtocolados: number;
  protocoladosJudit: number;
  ganhosProtocoladosPct: number;
  atingProtocoladosPct: number;
  vendaPerdida: number;
  ligacoes: number;
  tabulacoesProdutivas: number;
  tabulacoesImprodutivas: number;
  conversaoLigacoesPct: number;
  tmaSeg: number;
  assinadosJudit: number;
  conversaoJuditPct: number;
}

/**
 * Insumo mínimo para o motor de diagnóstico (src/lib/diagnostico.ts) — um
 * subconjunto de ColaboradorOperacional. Qualquer fonte de dados que exponha
 * esses campos serve (a planilha crua ou ColaboradorMetricas já calculado
 * pelo app), sem precisar preencher os demais campos irrelevantes ao diagnóstico.
 */
export interface DiagnosticoInsumo {
  colaborador: string;
  equipe: string;
  classificacaoOperacional: string;
  mediaPorDia: number;
  assinados: number;
  recebidos: number;
  conversaoAssinadosProtocoladosPct: number;
}

export type FaixaVolume = 'alto' | 'medio_alto' | 'medio_baixo' | 'baixo';

export type NivelConversaoRelativo = 'alta' | 'baixa';

/**
 * Resultado do cruzamento Volume × Qualidade para um colaborador, seguindo
 * a regra de decisão definida por Leonardo (Sales Ops).
 */
export interface DiagnosticoColaborador {
  colaborador: string;
  equipe: string;
  canal: string;
  mediaPorDia: number;
  conversaoAssinadosProtocoladosPct: number;
  faixaVolume: FaixaVolume;
  /** Só definido para faixas >= 0.8/dia — abaixo disso a amostra é pequena demais. */
  nivelConversao: NivelConversaoRelativo | null;
  /** Faixa <0.8/dia não entra no gráfico de dispersão conversão × volume (ruído estatístico). */
  incluirNoGraficoDispersao: boolean;
  acaoRecomendada: string;
  zeroProducao: boolean;
}

export interface PaceProjecao {
  paceAtual: number;
  paceEsperado: number;
  projecao: number;
  gap: number;
}

export interface DivergenciaMeta {
  somaMetasIndividuais: number;
  metaOficial: number;
  divergencia: number;
  divergenciaPct: number;
}
