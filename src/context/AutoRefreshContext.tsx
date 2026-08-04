import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Substitui o F5 manual: a cada 5 minutos (e só com a aba em foco — minimizada ou em outra
 * janela não conta) os dados são buscados de novo automaticamente, sem recarregar a página.
 * `tick` é o "sinal" que RelatorioContext e useIntelligence escutam pra refazer as consultas;
 * `segundosRestantes` alimenta o contador regressivo no botão de atualizar do topo.
 *
 * Não é SSE/WebSocket — não temos permissão de DDL no banco pra criar trigger/LISTEN-NOTIFY,
 * e mesmo se tivéssemos, isso exigiria uma conexão persistente por usuário logado, que é
 * exatamente o recurso escasso que já nos derrubou (limite de conexões do Postgres). Esse
 * polling de 5 em 5 minutos, só com a aba visível, é o que dá pra fazer com segurança hoje.
 */
const INTERVALO_MS = 5 * 60 * 1000;
const CHAVE_PROXIMA_ATUALIZACAO = 'madm-ops-proxima-atualizacao';

interface AutoRefreshContextValue {
  tick: number;
  segundosRestantes: number;
}

const AutoRefreshContext = createContext<AutoRefreshContextValue | null>(null);

/** Lê o horário da próxima atualização salvo no sessionStorage — se um F5 acontecer no meio
 * do caminho, o contador continua de onde estava em vez de reiniciar os 5 minutos do zero,
 * o que manteria consistência com o cache de dados (também em sessionStorage) que só expira
 * nesse mesmo horário. */
function lerOuCriarProximaAtualizacao(): number {
  try {
    const salvo = sessionStorage.getItem(CHAVE_PROXIMA_ATUALIZACAO);
    if (salvo) {
      const numero = Number(salvo);
      if (Number.isFinite(numero) && numero > Date.now()) return numero;
    }
  } catch {
    // sessionStorage indisponível — segue com um novo prazo em memória.
  }
  const nova = Date.now() + INTERVALO_MS;
  try {
    sessionStorage.setItem(CHAVE_PROXIMA_ATUALIZACAO, String(nova));
  } catch {}
  return nova;
}

function salvarProximaAtualizacao(valor: number) {
  try {
    sessionStorage.setItem(CHAVE_PROXIMA_ATUALIZACAO, String(valor));
  } catch {}
}

export function AutoRefreshProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [proximaEm, setProximaEm] = useState(lerOuCriarProximaAtualizacao);
  const [segundosRestantes, setSegundosRestantes] = useState(() => Math.max(0, Math.ceil((proximaEm - Date.now()) / 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      const restante = proximaEm - Date.now();
      if (restante > 0) {
        setSegundosRestantes(Math.ceil(restante / 1000));
        return;
      }
      if (document.visibilityState !== 'visible') {
        // Aba escondida: fica "vencido" até a pessoa voltar — o listener de
        // visibilitychange abaixo dispara a atualização assim que ela voltar.
        setSegundosRestantes(0);
        return;
      }
      setTick((t) => t + 1);
      const proxima = Date.now() + INTERVALO_MS;
      setProximaEm(proxima);
      salvarProximaAtualizacao(proxima);
      setSegundosRestantes(INTERVALO_MS / 1000);
    }, 1000);
    return () => clearInterval(id);
  }, [proximaEm]);

  useEffect(() => {
    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible' && Date.now() >= proximaEm) {
        setTick((t) => t + 1);
        const proxima = Date.now() + INTERVALO_MS;
        setProximaEm(proxima);
        salvarProximaAtualizacao(proxima);
        setSegundosRestantes(INTERVALO_MS / 1000);
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [proximaEm]);

  return <AutoRefreshContext.Provider value={{ tick, segundosRestantes }}>{children}</AutoRefreshContext.Provider>;
}

export function useAutoRefresh() {
  const ctx = useContext(AutoRefreshContext);
  if (!ctx) throw new Error('useAutoRefresh deve ser usado dentro de AutoRefreshProvider');
  return ctx;
}
