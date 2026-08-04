import { getStore } from '@netlify/blobs';

/**
 * Limitador de tentativas simples (por IP), guardado em Netlify Blobs.
 * Protege login e cadastro contra força bruta e criação em massa de contas
 * — o principal risco real de um site sem banco de dados ainda conectado
 * (não há SQL para injetar, mas há um formulário de senha exposto ao mundo).
 */
interface RegistroLimite {
  tentativas: number;
  iniciadoEm: number;
}

function getRateLimitStore() {
  return getStore('rate-limit');
}

export interface ResultadoLimite {
  permitido: boolean;
  restanteMs: number;
}

export async function verificarLimite(chave: string, maxTentativas: number, janelaMs: number): Promise<ResultadoLimite> {
  const store = getRateLimitStore();
  const registro = (await store.get(chave, { type: 'json' })) as RegistroLimite | null;
  const agora = Date.now();

  if (!registro || agora - registro.iniciadoEm > janelaMs) {
    return { permitido: true, restanteMs: 0 };
  }

  if (registro.tentativas >= maxTentativas) {
    return { permitido: false, restanteMs: janelaMs - (agora - registro.iniciadoEm) };
  }

  return { permitido: true, restanteMs: 0 };
}

export async function registrarTentativa(chave: string, janelaMs: number): Promise<void> {
  const store = getRateLimitStore();
  const registro = (await store.get(chave, { type: 'json' })) as RegistroLimite | null;
  const agora = Date.now();

  if (!registro || agora - registro.iniciadoEm > janelaMs) {
    await store.setJSON(chave, { tentativas: 1, iniciadoEm: agora });
  } else {
    await store.setJSON(chave, { tentativas: registro.tentativas + 1, iniciadoEm: registro.iniciadoEm });
  }
}

export async function limparTentativas(chave: string): Promise<void> {
  const store = getRateLimitStore();
  await store.delete(chave);
}
