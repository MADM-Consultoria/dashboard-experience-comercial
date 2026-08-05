import { kv } from '@vercel/kv';

export interface EventoAuditoria {
  id: string;
  usuario: string;
  tipo: 'login' | 'pagina';
  caminho?: string;
  criadoEm: string; // ISO
  ip?: string;
  userAgent?: string;
}

const CHAVE_ZSET = 'auth-logs:eventos';
const LIMITE = 3000; // não deixar o sorted set crescer sem fim
const CHANCE_LIMPEZA = 0.02; // ~1 a cada 50 registros dispara uma limpeza dos mais antigos

/**
 * Sorted set do Vercel KV (Redis via Upstash) — score é o timestamp, então a ordem
 * cronológica já vem de graça do próprio Redis, sem precisar ordenar client-side.
 * Antes era Netlify Blobs (uma chave por evento); trocado na migração pra Vercel, que
 * não tem um Blobs equivalente pronto pra usar sem configuração adicional.
 */
export async function registrarEvento(evento: Omit<EventoAuditoria, 'id' | 'criadoEm'>): Promise<void> {
  const agora = Date.now();
  const criadoEm = new Date(agora).toISOString();
  const id = `evento:${agora}-${Math.random().toString(36).slice(2, 10)}`;

  const registro: EventoAuditoria = { ...evento, id, criadoEm };
  await kv.zadd(CHAVE_ZSET, { score: agora, member: JSON.stringify(registro) });

  if (Math.random() < CHANCE_LIMPEZA) {
    limparEventosAntigos().catch((err) => console.error('Falha ao limpar eventos antigos:', err));
  }
}

async function limparEventosAntigos(): Promise<void> {
  const total = await kv.zcard(CHAVE_ZSET);
  if (total <= LIMITE) return;
  // Remove do início do ranking (mais antigos, score menor) o excedente.
  await kv.zremrangebyrank(CHAVE_ZSET, 0, total - LIMITE - 1);
}

export async function listarEventos(limite = 500): Promise<EventoAuditoria[]> {
  // rev: true = mais recentes primeiro (maior score primeiro).
  const membros = await kv.zrange<string[]>(CHAVE_ZSET, 0, limite - 1, { rev: true });

  return membros
    .map((m) => {
      try {
        return typeof m === 'string' ? (JSON.parse(m) as EventoAuditoria) : (m as unknown as EventoAuditoria);
      } catch {
        return null;
      }
    })
    .filter((e): e is EventoAuditoria => e !== null);
}
