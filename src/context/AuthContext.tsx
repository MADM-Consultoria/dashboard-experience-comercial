import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { limparPeriodoSalvo } from '@/context/DataSelecionadaContext';

const STORAGE_KEY = 'madm-ops-auth-token';
const CONTAS_SALVAS_KEY = 'madm-ops-contas-salvas';

export type PapelUsuario = 'master' | 'user';

interface SessaoAuth {
  token: string;
  usuario: string;
  nome: string;
  role: PapelUsuario;
  /** Time ao qual a pessoa está restrita (supervisores) — ausente = vê a empresa inteira. */
  time?: string;
}

export interface ContaSalva {
  usuario: string;
  nome: string;
}

interface AuthContextValue {
  sessao: SessaoAuth | null;
  carregando: boolean;
  contasSalvas: ContaSalva[];
  login: (usuario: string, senha: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  registrar: (email: string, senha: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  removerContaSalva: (usuario: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function lerPayload(token: string): { exp?: number; role?: string; nome?: string } | null {
  try {
    const [payloadB64] = token.split('.');
    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}

function tokenExpirado(token: string): boolean {
  const payload = lerPayload(token);
  return !payload || typeof payload.exp !== 'number' || payload.exp < Date.now();
}

function lerContasSalvas(): ContaSalva[] {
  try {
    const raw = localStorage.getItem(CONTAS_SALVAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Apaga os caches de dados em sessionStorage (períodos, relatório, contador do auto-refresh)
 * no logout — senão, num computador compartilhado, a próxima pessoa a logar nesse mesmo
 * navegador/aba veria por até 5 min os números da sessão anterior antes do primeiro fetch real. */
function limparCachesDeDados() {
  const prefixos = ['madm-ops-cache-periodo-', 'madm-ops-cache-relatorio-judit', 'madm-ops-proxima-atualizacao'];
  try {
    const chaves = Object.keys(sessionStorage);
    for (const chave of chaves) {
      if (prefixos.some((p) => chave.startsWith(p) || chave === p)) sessionStorage.removeItem(chave);
    }
  } catch {
    // sessionStorage indisponível — nada a limpar.
  }
}

function salvarConta(conta: ContaSalva) {
  const atuais = lerContasSalvas().filter((c) => c.usuario !== conta.usuario);
  const novaLista = [conta, ...atuais].slice(0, 6);
  localStorage.setItem(CONTAS_SALVAS_KEY, JSON.stringify(novaLista));
  return novaLista;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoAuth | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [contasSalvas, setContasSalvas] = useState<ContaSalva[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const salva: SessaoAuth = JSON.parse(raw);
        if (!tokenExpirado(salva.token)) {
          setSessao(salva);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setContasSalvas(lerContasSalvas());
    setCarregando(false);
  }, []);

  function aplicarSessao(dados: { token: string; usuario: string; nome: string; role: string; time?: string }) {
    const novaSessao: SessaoAuth = {
      token: dados.token,
      usuario: dados.usuario,
      nome: dados.nome,
      role: dados.role === 'master' ? 'master' : 'user',
      time: dados.time,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(novaSessao));
    setSessao(novaSessao);
    setContasSalvas(salvarConta({ usuario: novaSessao.usuario, nome: novaSessao.nome }));
  }

  async function login(usuario: string, senha: string) {
    try {
      const resposta = await fetch('/.netlify/functions/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.ok) {
        return { ok: false as const, error: dados.error ?? 'Não foi possível entrar.' };
      }
      aplicarSessao(dados);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  async function registrar(email: string, senha: string) {
    try {
      const resposta = await fetch('/.netlify/functions/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.ok) {
        return { ok: false as const, error: dados.error ?? 'Não foi possível criar a conta.' };
      }
      aplicarSessao(dados);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: 'Erro de conexão. Tente novamente.' };
    }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    limparPeriodoSalvo();
    limparCachesDeDados();
    setSessao(null);
  }

  function removerContaSalva(usuario: string) {
    const novaLista = lerContasSalvas().filter((c) => c.usuario !== usuario);
    localStorage.setItem(CONTAS_SALVAS_KEY, JSON.stringify(novaLista));
    setContasSalvas(novaLista);
  }

  return (
    <AuthContext.Provider value={{ sessao, carregando, contasSalvas, login, registrar, logout, removerContaSalva }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
