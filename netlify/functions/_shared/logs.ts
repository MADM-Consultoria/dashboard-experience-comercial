import { getStore } from '@netlify/blobs';

export interface EventoAuditoria {
  id: string;
  usuario: string;
  tipo: 'login' | 'pagina';
  caminho?: string;
  criadoEm: string; // ISO
  ip?: string;
  userAgent?: string;
}

const LIMITE = 3000; // não deixar o store crescer sem fim
const CHANCE_LIMPEZA = 0.02; // ~1 a cada 50 registros dispara uma limpeza dos mais antigos

function getLogsStore() {
  return getStore('auth-logs');
}

/**
 * Cada evento vira uma chave própria (timestamp + sufixo aleatório), em vez
 * de todos ficarem numa lista única regravada a cada registro. Isso elimina
 * de vez a corrida de concorrência: duas gravações simultâneas nunca disputam
 * a mesma chave, então nenhuma pode apagar a outra (o bug real de uma
 * abordagem "ler lista → adicionar → salvar" é que duas chamadas concorrentes
 * podem ler a mesma versão antes de qualquer uma salvar — quem salva por
 * último apaga o que a outra tinha acabado de registrar; isso pode acontecer
 * até com trava condicional de "só grava se não mudou" quando há tentativas
 * demais em paralelo esgotando o número de novas tentativas).
 */
export async function registrarEvento(evento: Omit<EventoAuditoria, 'id' | 'criadoEm'>): Promise<void> {
  const store = getLogsStore();
  const criadoEm = new Date().toISOString();
  const chave = `evento:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const registro: EventoAuditoria = { ...evento, id: chave, criadoEm };
  await store.setJSON(chave, registro);

  if (Math.random() < CHANCE_LIMPEZA) {
    limparEventosAntigos(store).catch((err) => console.error('Falha ao limpar eventos antigos:', err));
  }
}

async function limparEventosAntigos(store: ReturnType<typeof getLogsStore>): Promise<void> {
  const { blobs } = await store.list({ prefix: 'evento:' });
  if (blobs.length <= LIMITE) return;

  const chavesOrdenadas = blobs.map((b) => b.key).sort(); // "evento:<timestamp>-..." ordena cronologicamente
  const excedentes = chavesOrdenadas.slice(0, chavesOrdenadas.length - LIMITE);
  await Promise.all(excedentes.map((chave) => store.delete(chave)));
}

export async function listarEventos(limite = 500): Promise<EventoAuditoria[]> {
  const store = getLogsStore();
  const { blobs } = await store.list({ prefix: 'evento:' });

  // Mais recentes primeiro (a chave já é ordenável por timestamp); busca só
  // o necessário em vez de baixar tudo quando o store tiver muito histórico.
  const chavesRecentes = blobs
    .map((b) => b.key)
    .sort()
    .reverse()
    .slice(0, limite);

  const eventos = await Promise.all(
    chavesRecentes.map((chave) => store.get(chave, { type: 'json' }) as Promise<EventoAuditoria | null>),
  );

  return eventos
    .filter((e): e is EventoAuditoria => e !== null)
    .sort((a, b) => (a.criadoEm > b.criadoEm ? -1 : 1));
}
