interface ContagemPorConsultorRow {
  consultor: string | null;
  total: string | number;
}

/**
 * Tenta de novo (com pequeno atraso crescente) antes de desistir — picos passageiros de conexão
 * no banco (ex: limite de conexões momentaneamente cheio) não podem virar um card de erro na cara
 * do usuário se uma segunda tentativa alguns segundos depois resolveria sozinha.
 */
async function fetchComRetry(url: string, token: string, tentativas = 3): Promise<{ resposta: Response; dados: any }> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json();
      if (resposta.ok && dados.ok) return { resposta, dados };
      // 500 pode ser transiente (conexão); 400/401/403 não adianta tentar de novo.
      if (resposta.status < 500 || tentativa === tentativas) return { resposta, dados };
      ultimoErro = new Error(dados.error ?? 'Falha ao carregar dados.');
    } catch (err) {
      ultimoErro = err;
      if (tentativa === tentativas) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, tentativa * 800));
  }
  throw ultimoErro;
}

export interface ContagemPeriodo {
  /** Total bruto do período — igual a `select count(*) ... where data between $1 and $2`, sem
   * agrupar por consultor. É esse número que tem que bater com uma conferência manual no banco;
   * nunca deriva de somar por colaborador, porque isso perde linhas sem responsável reconhecido. */
  totalBruto: number;
  /** Mesma contagem, mas agrupada por consultor (nome normalizado) — usada só pra atribuir o
   * número de cada colaborador nas telas individuais (Equipe, Plano de Ação, Ranking). */
  porConsultor: Map<string, number>;
}

/** Normaliza nome pra casar "Alessandra Silva Grob" (views novas) com "ALESSANDRA SILVA GROB" (view mensal). */
export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cache persistido no `sessionStorage` (não só em memória) por endpoint+período —
 * nenhuma das colunas de data usadas aqui (data_qualificacao, data_protocolo_juridico_auditoria,
 * data_ganho, data_assinatura) tem índice no banco, então cada consulta é um Seq Scan completo
 * na tabela. Trocar de tela e voltar pro mesmo período, reabrir o calendário na mesma data, OU
 * dar F5/recarregar a página não deve gerar consulta nova — só em memória o cache se perderia
 * a cada reload, e a pessoa apertando F5 repetido voltaria a bater no banco toda vez (foi
 * exatamente isso que ajudou a esgotar as conexões antes). Expira em 5 min.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const PREFIXO_CACHE = 'madm-ops-cache-periodo-';

interface CacheEntradaSerializada {
  totalBruto: number;
  porConsultor: [string, number][];
  expiraEm: number;
}

function lerCachePeriodo(chave: string): ContagemPeriodo | null {
  try {
    const bruto = sessionStorage.getItem(PREFIXO_CACHE + chave);
    if (!bruto) return null;
    const entrada = JSON.parse(bruto) as CacheEntradaSerializada;
    if (typeof entrada.expiraEm !== 'number' || entrada.expiraEm < Date.now()) return null;
    return { totalBruto: entrada.totalBruto, porConsultor: new Map(entrada.porConsultor) };
  } catch {
    return null; // sessionStorage indisponível (modo privado, etc.) — cai no fetch normal.
  }
}

function salvarCachePeriodo(chave: string, valor: ContagemPeriodo) {
  try {
    const entrada: CacheEntradaSerializada = {
      totalBruto: valor.totalBruto,
      porConsultor: Array.from(valor.porConsultor.entries()),
      expiraEm: Date.now() + CACHE_TTL_MS,
    };
    sessionStorage.setItem(PREFIXO_CACHE + chave, JSON.stringify(entrada));
  } catch {
    // idem — não é crítico se não conseguir salvar.
  }
}

async function fetchContagemPeriodo(endpoint: string, token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  const chaveCache = `${endpoint}|${inicio}|${fim}`;
  const emCache = lerCachePeriodo(chaveCache);
  if (emCache) return emCache;

  const params = new URLSearchParams({ inicio, fim });
  const { resposta, dados } = await fetchComRetry(`/api/${endpoint}?${params.toString()}`, token);
  if (!resposta.ok || !dados.ok) {
    throw new Error(dados.error ?? 'Não foi possível carregar os dados do período.');
  }

  const porConsultor = new Map<string, number>();
  let totalBruto = 0;
  for (const row of dados.dados as ContagemPorConsultorRow[]) {
    const total = typeof row.total === 'number' ? row.total : Number(row.total) || 0;
    totalBruto += total;
    if (!row.consultor) continue; // linha sem responsável — entra no totalBruto, mas não dá pra atribuir a ninguém
    const chave = normalizarNome(row.consultor);
    porConsultor.set(chave, (porConsultor.get(chave) ?? 0) + total);
  }

  const valor: ContagemPeriodo = { totalBruto, porConsultor };
  salvarCachePeriodo(chaveCache, valor);
  return valor;
}

/** Assinados no período — madm.view_app_emitidos_e_assinados (data_assinatura). */
export function fetchAssinadosPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemPeriodo('assinados-periodo', token, inicio, fim);
}

/** Recebidos (leads qualificados) no período — madm.view_app_kommo_leads (data_qualificacao). */
export function fetchRecebidosPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemPeriodo('recebidos-periodo', token, inicio, fim);
}

/** Protocolados no período — madm.view_app_kommo_leads (data_protocolo_juridico_auditoria). */
export function fetchProtocoladosPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemPeriodo('protocolados-periodo', token, inicio, fim);
}

/** Venda ganha no período — madm.view_app_kommo_leads (data_ganho). */
export function fetchVendaGanhaPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemPeriodo('venda-ganha-periodo', token, inicio, fim);
}

/** Mesmo formato de resposta que assinados-judit-periodo/recebidos-judit-periodo: `{ total, porConsultor }`
 * em vez de `{ dados }` — porque o `total` já vem de uma consulta independente (não soma do agrupamento).
 * Usa o mesmo cache persistido em sessionStorage que fetchContagemPeriodo (sobrevive a F5). */
async function fetchContagemJuditPeriodo(endpoint: string, token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  const chaveCache = `${endpoint}|${inicio}|${fim}`;
  const emCache = lerCachePeriodo(chaveCache);
  if (emCache) return emCache;

  const params = new URLSearchParams({ inicio, fim });
  const { resposta, dados } = await fetchComRetry(`/api/${endpoint}?${params.toString()}`, token);
  if (!resposta.ok || !dados.ok) {
    throw new Error(dados.error ?? 'Não foi possível carregar os dados do período.');
  }

  const porConsultor = new Map<string, number>();
  for (const row of dados.porConsultor as ContagemPorConsultorRow[]) {
    if (!row.consultor) continue;
    const total = typeof row.total === 'number' ? row.total : Number(row.total) || 0;
    const chave = normalizarNome(row.consultor);
    porConsultor.set(chave, (porConsultor.get(chave) ?? 0) + total);
  }

  const valor: ContagemPeriodo = { totalBruto: typeof dados.total === 'number' ? dados.total : Number(dados.total) || 0, porConsultor };
  salvarCachePeriodo(chaveCache, valor);
  return valor;
}

/**
 * Assinados Judit no período — definição oficial: lead com SDR "Judit" (madm.kommo_leads.sdr),
 * qualificado E assinado dentro do mesmo período (madm.emitidos_e_assinados JOIN
 * madm.kommo_leads). O `totalBruto` vem de um `count(distinct id_kommo)` independente do
 * agrupamento por consultor, pelo mesmo motivo dos outros períodos: nunca derivar o total da
 * empresa somando por colaborador.
 */
export function fetchAssinadosJuditPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemJuditPeriodo('assinados-judit-periodo', token, inicio, fim);
}

/**
 * Recebidos Judit no período — lead com SDR "Judit", qualificado dentro do período
 * (data_qualificacao). Junto com fetchAssinadosJuditPeriodo, substitui de vez a "Conversão
 * Judit" que vinha pronta de madm.view_relatorio_judit (relatório mensal estático, não mais usado).
 */
export function fetchRecebidosJuditPeriodo(token: string, inicio: string, fim: string): Promise<ContagemPeriodo> {
  return fetchContagemJuditPeriodo('recebidos-judit-periodo', token, inicio, fim);
}
