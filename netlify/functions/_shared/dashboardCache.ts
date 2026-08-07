import { Pool } from 'pg';
import { kv } from '@vercel/kv';
import { buscarDadosBrutos, type DadosBrutos } from './dashboardQueries.js';

/**
 * Serviço central de cache do dashboard.
 *
 * Por que existir: o Postgres usado aqui (`svc_relatorio_supervisao`) tem um limite muito baixo
 * de conexões simultâneas. Antes, cada rota do dashboard (assinados, recebidos, protocolados,
 * venda ganha, Judit...) abria sua própria conexão a cada request de cada usuário — com poucos
 * usuários simultâneos já estourava o limite e as consultas começavam a falhar.
 *
 * Como resolve: só ESTE módulo toca o Postgres, com um pool de no máximo 1 conexão. Ele busca os
 * dados brutos (ver `dashboardQueries.ts`) periodicamente — acionado pela function de cron
 * (`cron-atualizar-cache.ts`, que o Vercel Cron dispara 1x/min, o mínimo que a plataforma
 * permite) — e guarda o resultado em memória E no Vercel KV. Todas as rotas do dashboard
 * (`assinados-periodo.ts` etc.) só leem esse cache e agregam em memória (`dashboardAgregacoes.ts`)
 * — nenhuma delas roda SQL. Resultado: não importa se é 1 ou 100 usuários simultâneos, o Postgres
 * só recebe consultas desse único serviço, no intervalo configurado.
 *
 * Por que memória E KV: memória é instantânea mas não sobrevive a uma instância "fria" (cold
 * start) nem é compartilhada entre instâncias diferentes da function — o KV é a fonte da
 * verdade entre instâncias/cold starts; a memória é só um atalho pra não ler do KV a cada
 * request na mesma instância "quente".
 */

export interface MetaCache {
  /** Quando os dados foram buscados do banco com sucesso pela última vez. */
  atualizadoEm: string;
  /** Janela [inicio, fim] efetivamente buscada no banco. */
  janela: { inicio: string; fim: string };
  /** Preenchido só quando a ÚLTIMA tentativa de atualizar falhou — o cache continua sendo o
   * último válido, isso é só um aviso de que ele pode estar desatualizado. */
  ultimoErro?: string;
}

interface CacheCompleto {
  dados: DadosBrutos;
  meta: MetaCache;
}

const CHAVE_KV_DADOS = 'dashboard-cache:dados';
const CHAVE_KV_META = 'dashboard-cache:meta';

let cacheMemoria: CacheCompleto | null = null;
let pool: Pool | null = null;

function getPoolCache(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      // Única conexão com o Postgres do dashboard inteiro — ver comentário do módulo.
      max: 1,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

/** Janela de dados buscada: do dia 1 do mês passado até hoje. Cobre o mês atual inteiro (a
 * maioria das telas), o mês passado inteiro (comparativos do Plano de Ação) e qualquer recorte
 * dentro desse intervalo que o usuário escolher no calendário. Recortes fora dessa janela
 * (datas mais antigas) não são cobertos por este cache. */
function calcularJanela(): { inicio: string; fim: string } {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const mesAtual0 = hoje.getMonth(); // 0-11
  const anoMesAnterior = mesAtual0 === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear();
  const mesAnterior1 = mesAtual0 === 0 ? 12 : mesAtual0; // 1-12, mês anterior ao atual
  return {
    inicio: `${anoMesAnterior}-${pad(mesAnterior1)}-01`,
    fim: `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`,
  };
}

/** Intervalo mínimo entre atualizações reais no banco — configurável por variável de ambiente.
 * O Vercel Cron aciona a function a cada 1 minuto (o mínimo da plataforma), mas se o intervalo
 * configurado for maior, os disparos "extras" dentro dessa janela são ignorados (no-op rápido),
 * então o efeito prático é esse intervalo, não o do cron. */
export function intervaloConfiguradoMs(): number {
  const bruto = Number(process.env.DASHBOARD_CACHE_INTERVALO_MS);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : 60_000;
}

/** Busca no banco e substitui o cache (memória + KV). Se falhar, mantém o último cache válido
 * (memória e KV não são tocados) e só registra o erro no log e na meta — nunca derruba quem
 * chamou. */
export async function atualizarCache(): Promise<void> {
  const janela = calcularJanela();
  try {
    const dados = await buscarDadosBrutos(getPoolCache(), janela.inicio, janela.fim);
    const meta: MetaCache = { atualizadoEm: new Date().toISOString(), janela };
    cacheMemoria = { dados, meta };
    await Promise.all([kv.set(CHAVE_KV_DADOS, dados), kv.set(CHAVE_KV_META, meta)]);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error('[dashboardCache] Falha ao atualizar — mantendo o último cache válido:', mensagem);
    if (cacheMemoria) {
      cacheMemoria = { ...cacheMemoria, meta: { ...cacheMemoria.meta, ultimoErro: mensagem } };
    }
    // Também registra o erro na meta do KV (sem sobrescrever os dados), pra quem olhar o cache
    // de outra instância "fria" também saber que a última tentativa falhou.
    try {
      const metaAtualKv = await kv.get<MetaCache>(CHAVE_KV_META);
      if (metaAtualKv) await kv.set(CHAVE_KV_META, { ...metaAtualKv, ultimoErro: mensagem });
    } catch {
      // Se nem isso funcionar, segue com o que já está em memória — não é crítico.
    }
  }
}

/** Só atualiza de verdade se já passou o intervalo configurado desde a última atualização bem
 * sucedida — usado pela function de cron, pra o intervalo real ficar configurável por env var
 * mesmo o Vercel Cron só permitindo agendar de 1 em 1 minuto no mínimo. */
export async function atualizarCacheSeNecessario(): Promise<void> {
  if (!cacheMemoria) await carregarDoKvSeVazio();
  if (cacheMemoria && Date.now() - new Date(cacheMemoria.meta.atualizadoEm).getTime() < intervaloConfiguradoMs()) {
    return;
  }
  await atualizarCache();
}

async function carregarDoKvSeVazio(): Promise<void> {
  try {
    const [dados, meta] = await Promise.all([kv.get<DadosBrutos>(CHAVE_KV_DADOS), kv.get<MetaCache>(CHAVE_KV_META)]);
    if (dados && meta) cacheMemoria = { dados, meta };
  } catch (err) {
    console.error('[dashboardCache] Falha ao carregar cache do KV:', err);
  }
}

/** Usado pelas rotas do dashboard — NUNCA roda SQL, só lê. Se a instância está "fria" e não tem
 * nada em memória ainda, tenta o KV (outra instância, ou o cron, já deve ter atualizado). Se
 * mesmo assim não existir nenhum cache ainda (bem no primeiro boot da aplicação, antes do cron
 * rodar pela 1ª vez — janela de no máximo ~1 min), devolve vazio com `ultimoErro` explicando,
 * em vez de consultar o banco na hora: se toda rota fizesse isso, várias instâncias concorrentes
 * tentando popular o cache ao mesmo tempo voltaria a estourar o limite de conexões — exatamente
 * o problema que esse cache existe pra resolver. */
export async function obterCache(): Promise<CacheCompleto> {
  if (cacheMemoria) return cacheMemoria;
  await carregarDoKvSeVazio();
  if (cacheMemoria) return cacheMemoria;
  return {
    dados: { assinados: [], leads: [], leadsJudit: [], assinadosJudit: [] },
    meta: { atualizadoEm: '', janela: calcularJanela(), ultimoErro: 'Cache ainda não inicializado — aguardando a primeira execução do cron.' },
  };
}

/** Só a meta (sem os dados brutos) — usado pela tela de Configurações pra mostrar quando o
 * cache foi atualizado pela última vez, sem carregar o dataset inteiro à toa. */
export async function obterMetaCache(): Promise<MetaCache> {
  const { meta } = await obterCache();
  return meta;
}
