import type { CanalOrigem, ColaboradorMetricas } from '@/types/domain';
import { classificarStatus, pct } from '@/lib/metrics';
import { ehColaboradorAtivo, type ColaboradorAtivo } from '@/lib/colaboradoresAtivos';

/**
 * Linha crua de `madm.view_relatorio_judit`, como o Postgres devolve (chaves
 * em português, com acentos/espaços). O pg pode retornar número ou string
 * dependendo do tipo da coluna — por isso todo valor numérico passa por
 * parseNumero antes de virar ColaboradorMetricas.
 */
export interface RelatorioJuditRow {
  Colaborador: string;
  Equipe: string;
  'Classificação Operacional': string;
  Recebidos: string | number;
  'Meta Assinados/Mês': string | number;
  'Meta Assinados/Atual': string | number;
  Emitidos: string | number;
  Assinados: string | number;
  'Conversão Geral (%)': string | number;
  'Assinados Judit': string | number;
  'Conversão Judit (%)': string | number;
  'Média por dia': string | number;
  'Ating. Assinados (%)': string | number;
  'Gap Assinados/Atual': string | number;
  'Gap Assinados/Mês': string | number;
  'Venda Ganha': string | number;
  'Venda Ganha Judit': string | number;
  'Meta Protocolados': string | number;
  Protocolados: string | number;
  'Protocolados Judit': string | number;
  ' Ganhos/protocolados (%)': string | number;
  'Ating. Protocolados (%)': string | number;
  'Venda Perdida': string | number;
  Ligações: string | number;
  'Tabulações Produtivas': string | number;
  'Tabulações Improdutivas': string | number;
  'Conversão Ligações (%)': string | number;
  'TMA (seg)': string | number;
}

/** Colaborador mapeado da view, com os campos extras que o domínio mock não tinha. */
export interface ColaboradorReal extends ColaboradorMetricas {
  assinadosJudit: number;
  protocoladosJudit: number;
  conversaoJudit: number;
  ligacoes: number;
  tmaSeg: number;
  vendaGanha: number;
  vendaPerdida: number;
  metaProtocolados: number;
}

function parseNumero(valor: string | number | null | undefined): number {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = valor.replace('%', '').replace(',', '.').trim();
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

export function slug(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const CHAVE_CACHE = 'madm-ops-cache-relatorio-judit';

interface CacheRelatorioSerializado {
  dados: RelatorioJuditRow[];
  expiraEm: number;
}

function lerCacheRelatorio(): RelatorioJuditRow[] | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_CACHE);
    if (!bruto) return null;
    const entrada = JSON.parse(bruto) as CacheRelatorioSerializado;
    if (typeof entrada.expiraEm !== 'number' || entrada.expiraEm < Date.now()) return null;
    return entrada.dados;
  } catch {
    return null;
  }
}

function salvarCacheRelatorio(dados: RelatorioJuditRow[]) {
  try {
    const entrada: CacheRelatorioSerializado = { dados, expiraEm: Date.now() + CACHE_TTL_MS };
    sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(entrada));
  } catch {
    // não é crítico se não conseguir salvar (modo privado etc.)
  }
}

/** Tenta de novo antes de desistir — pico passageiro de conexão no banco não pode virar
 * tela de erro se uma segunda tentativa alguns segundos depois resolveria sozinha.
 * Cache persistido em sessionStorage (5 min) pra F5/reload não bater no banco de novo,
 * seguindo o mesmo padrão de src/lib/assinadosPeriodo.ts. */
export async function fetchRelatorioJudit(token: string): Promise<RelatorioJuditRow[]> {
  const emCache = lerCacheRelatorio();
  if (emCache) return emCache;

  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const resposta = await fetch('/api/relatorio-judit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dados = await resposta.json();
      if (resposta.ok && dados.ok) {
        salvarCacheRelatorio(dados.dados as RelatorioJuditRow[]);
        return dados.dados as RelatorioJuditRow[];
      }
      if (resposta.status < 500 || tentativa === 3) {
        throw new Error(dados.error ?? 'Não foi possível carregar os dados do banco.');
      }
      ultimoErro = new Error(dados.error ?? 'Não foi possível carregar os dados do banco.');
    } catch (err) {
      ultimoErro = err;
      if (tentativa === 3) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, tentativa * 800));
  }
  throw ultimoErro;
}

export function mapRowParaColaborador(row: RelatorioJuditRow): ColaboradorReal {
  const recebidos = parseNumero(row.Recebidos);
  const assinados = parseNumero(row.Assinados);
  const protocolados = parseNumero(row.Protocolados);
  const metaMensal = parseNumero(row['Meta Assinados/Mês']);
  const conversaoAssinadosProtocolados = parseNumero(row[' Ganhos/protocolados (%)']) || pct(protocolados, assinados);
  // Canal vem da Classificação Operacional (cargo), não de ter tido algum
  // "Assinados Judit" > 0 no mês — isso classificava errado quem é Discador(a)
  // mas pegou um lead Judit avulso, ou quem é Judit mas zerou no mês.
  const canal: CanalOrigem = row['Classificação Operacional']?.toLowerCase().includes('judit') ? 'Judit' : 'Discadora';

  return {
    id: slug(row.Colaborador) || row.Colaborador,
    nome: row.Colaborador,
    cargo: row['Classificação Operacional'],
    time: row.Equipe,
    canal,
    ativo: ehColaboradorAtivo(row.Colaborador),
    recebidos,
    assinados,
    protocolados,
    metaDiaria: 0,
    metaMensal,
    atingimentoMetaMensal: parseNumero(row['Ating. Assinados (%)']),
    conversaoRecebidosAssinados: parseNumero(row['Conversão Geral (%)']) || pct(assinados, recebidos),
    conversaoAssinadosProtocolados,
    conversaoGeral: parseNumero(row['Conversão Geral (%)']),
    produtividade: parseNumero(row['Média por dia']),
    eficiencia: Math.min(
      100,
      conversaoAssinadosProtocolados * 0.55 +
        Math.min(100, parseNumero(row['Ating. Assinados (%)'])) * 0.3 +
        parseNumero(row['Conversão Geral (%)']) * 0.15,
    ),
    tendencia: 'estavel',
    variacaoPeriodoAnterior: 0,
    status: classificarStatus(conversaoAssinadosProtocolados),
    historico: [],
    assinadosJudit: parseNumero(row['Assinados Judit']),
    protocoladosJudit: parseNumero(row['Protocolados Judit']),
    conversaoJudit: parseNumero(row['Conversão Judit (%)']),
    ligacoes: parseNumero(row.Ligações),
    tmaSeg: parseNumero(row['TMA (seg)']),
    vendaGanha: parseNumero(row['Venda Ganha']),
    vendaPerdida: parseNumero(row['Venda Perdida']),
    metaProtocolados: parseNumero(row['Meta Protocolados']),
  };
}

/**
 * Colaborador ativo (lista da diretoria) que ainda não foi sincronizado em
 * madm.view_relatorio_judit — sem cargo/meta real, mas os números do período
 * (Recebidos/Assinados/Protocolados/Venda Ganha) ainda vêm certos via
 * useIntelligence, que casa por nome com as views de período.
 */
export function criarColaboradorSintetico(ativo: ColaboradorAtivo): ColaboradorReal {
  return {
    id: slug(ativo.nome) || ativo.nome,
    nome: ativo.nome,
    cargo: ativo.canal,
    time: ativo.time,
    canal: ativo.canal,
    ativo: true,
    recebidos: 0,
    assinados: 0,
    protocolados: 0,
    metaDiaria: 0,
    metaMensal: 0,
    atingimentoMetaMensal: 0,
    conversaoRecebidosAssinados: 0,
    conversaoAssinadosProtocolados: 0,
    conversaoGeral: 0,
    produtividade: 0,
    eficiencia: 0,
    tendencia: 'estavel',
    variacaoPeriodoAnterior: 0,
    status: 'critico',
    historico: [],
    assinadosJudit: 0,
    protocoladosJudit: 0,
    conversaoJudit: 0,
    ligacoes: 0,
    tmaSeg: 0,
    vendaGanha: 0,
    vendaPerdida: 0,
    metaProtocolados: 0,
  };
}
