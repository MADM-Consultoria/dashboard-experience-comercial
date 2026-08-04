import { createHmac, timingSafeEqual } from 'node:crypto';

export interface DashboardUser {
  usuario: string;
  senha: string;
  role?: 'master' | 'user';
  nome?: string;
}

export interface SessaoValidada {
  usuario: string;
  nome: string;
  role: 'master' | 'user';
  /** Time ao qual o usuário está restrito (supervisores) — ausente = vê a empresa inteira. */
  time?: string;
}

export function getUsuarios(): DashboardUser[] {
  try {
    return JSON.parse(process.env.DASHBOARD_USERS ?? '[]');
  } catch {
    return [];
  }
}

/** Compara duas strings em tempo constante — evita vazar por timing quantos caracteres da senha acertaram. */
export function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Ainda gasta um tempo comparável, pra não vazar diferença de tamanho por timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function assinar(payload: string, segredo: string) {
  return createHmac('sha256', segredo).update(payload).digest('base64url');
}

export function assinarToken(usuario: string, nome: string, role: 'master' | 'user', ttlMs: number, time?: string): string | null {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;
  const payload = JSON.stringify({ usuario, nome, role, time, exp: Date.now() + ttlMs });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const assinatura = assinar(payloadB64, authSecret);
  return `${payloadB64}.${assinatura}`;
}

/** Usado pelas demais funções para validar o token enviado pelo frontend (header Authorization: Bearer <token>). */
export function validarToken(token: string | undefined | null): SessaoValidada | null {
  const authSecret = process.env.AUTH_SECRET;
  if (!token || !authSecret) return null;

  const [payloadB64, assinatura] = token.split('.');
  if (!payloadB64 || !assinatura) return null;

  const esperado = assinar(payloadB64, authSecret);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (typeof payload.usuario !== 'string') return null;
    return {
      usuario: payload.usuario,
      nome: typeof payload.nome === 'string' ? payload.nome : payload.usuario,
      role: payload.role === 'master' ? 'master' : 'user',
      time: typeof payload.time === 'string' ? payload.time : undefined,
    };
  } catch {
    return null;
  }
}

export function extrairToken(authorizationHeader: string | undefined | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [tipo, token] = authorizationHeader.split(' ');
  return tipo === 'Bearer' ? token : undefined;
}
