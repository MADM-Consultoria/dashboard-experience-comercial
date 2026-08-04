import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export interface UsuarioRegistrado {
  usuario: string; // login: primeiro.sobrenome@madmbrasil.com.br
  nome: string; // nome de exibição: "Primeiro Sobrenome"
  senhaHash: string; // formato "salt:hash", ambos hex
  role: 'master' | 'user';
  criadoEm: string;
}

const CHAVE = 'usuarios';
const DOMINIO = '@madmbrasil.com.br';

function getUsersStore() {
  return getStore('dashboard-registered-users');
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * Valida que o email corporativo segue o formato primeiro.sobrenome@madmbrasil.com.br
 * (só letras em cada parte, um ponto separando nome e sobrenome) e deriva o
 * nome de exibição a partir dele. Retorna null se o formato for inválido.
 */
export function validarEmailCorporativo(email: string): { usuario: string; nomeExibicao: string } | null {
  const normalizado = email.trim().toLowerCase();
  if (!normalizado.endsWith(DOMINIO)) return null;

  const localPart = normalizado.slice(0, -DOMINIO.length);
  const partes = localPart.split('.');
  if (partes.length < 2 || partes.some((p) => !/^[a-z]+$/.test(p))) return null;

  const nomeExibicao = partes.map(capitalizar).join(' ');
  return { usuario: normalizado, nomeExibicao };
}

/**
 * Logins (parte antes do @) que devem virar "master" automaticamente ao se
 * cadastrarem — configurado via variável de ambiente MASTER_LOGINS, separado
 * por vírgula. Ex: "gustavo.santos,bruno.resende,antonio.filho".
 */
export function ehLoginMaster(usuario: string): boolean {
  const lista = (process.env.MASTER_LOGINS ?? '')
    .split(',')
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);

  const localPart = usuario.split('@')[0];
  return lista.includes(usuario) || lista.includes(localPart);
}

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hashArmazenado] = senhaHash.split(':');
  if (!salt || !hashArmazenado) return false;
  const hashCalculado = scryptSync(senha, salt, 64).toString('hex');
  const a = Buffer.from(hashCalculado, 'hex');
  const b = Buffer.from(hashArmazenado, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function listarUsuariosRegistrados(): Promise<UsuarioRegistrado[]> {
  const store = getUsersStore();
  const atuais = (await store.get(CHAVE, { type: 'json' })) as UsuarioRegistrado[] | null;
  return atuais ?? [];
}

export async function buscarUsuarioRegistrado(usuario: string): Promise<UsuarioRegistrado | null> {
  const lista = await listarUsuariosRegistrados();
  return lista.find((u) => u.usuario === usuario) ?? null;
}

export async function criarUsuarioRegistrado(dados: Omit<UsuarioRegistrado, 'criadoEm'>): Promise<void> {
  const store = getUsersStore();
  const lista = await listarUsuariosRegistrados();
  lista.push({ ...dados, criadoEm: new Date().toISOString() });
  await store.setJSON(CHAVE, lista);
}
