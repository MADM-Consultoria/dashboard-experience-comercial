import { kv } from '@vercel/kv';

/**
 * Limitador de tentativas simples (por IP), guardado no Vercel KV (Redis).
 * Protege login e cadastro contra força bruta e criação em massa de contas
 * — o principal risco real de um site sem banco de dados ainda conectado
 * (não há SQL para injetar, mas há um formulário de senha exposto ao mundo).
 */
interface RegistroLimite {
  tentativas: number;
  iniciadoEm: number;
}

function chaveKv(chave: string): string {
  return `rate-limit:${chave}`;
}

export interface ResultadoLimite {
  permitido: boolean;
  restanteMs: number;
}

export async function verificarLimite(chave: string, maxTentativas: number, janelaMs: number): Promise<ResultadoLimite> {
  const registro = await kv.get<RegistroLimite>(chaveKv(chave));
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
  const registro = await kv.get<RegistroLimite>(chaveKv(chave));
  const agora = Date.now();
  const expiracaoSegundos = Math.ceil(janelaMs / 1000);

  if (!registro || agora - registro.iniciadoEm > janelaMs) {
    await kv.set(chaveKv(chave), { tentativas: 1, iniciadoEm: agora }, { ex: expiracaoSegundos });
  } else {
    await kv.set(chaveKv(chave), { tentativas: registro.tentativas + 1, iniciadoEm: registro.iniciadoEm }, { ex: expiracaoSegundos });
  }
}

export async function limparTentativas(chave: string): Promise<void> {
  await kv.del(chaveKv(chave));
}
