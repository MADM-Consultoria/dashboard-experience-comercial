import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Substitui o F5 manual: a cada 5 minutos (e só com a aba em foco — minimizada ou em outra
 * janela não conta) os dados são buscados de novo automaticamente, sem recarregar a página.
 * `tick` é o "sinal" que RelatorioContext e useIntelligence escutam pra refazer as consultas;
 * `segundosRestantes` alimenta o contador regressivo no botão de atualizar do topo.
 *
 * `tick` e `segundosRestantes` vivem em contexts SEPARADOS de propósito — segundosRestantes
 * muda todo santo segundo, e se estivesse no mesmo objeto de contexto que `tick`, qualquer
 * componente que só lê `tick` (RelatorioContext, useIntelligence, ou seja, a página inteira)
 * re-renderizaria a cada segundo também, porque o valor do Provider mudaria de referência a
 * cada tick do relógio. Foi exatamente isso que causava o "piscar" nos gráficos da Visão
 * Geral — o SVG inteiro (Radar, Funil etc.) remontava a cada segundo sem nenhum dado novo.
 *
 * Não é SSE/WebSocket — não temos permissão de DDL no banco pra criar trigger/LISTEN-NOTIFY,
 * e mesmo se tivéssemos, isso exigiria uma conexão persistente por usuário logado, que é
 * exatamente o recurso escasso que já nos derrubou (limite de conexões do Postgres). Esse
 * polling de 5 em 5 minutos, só com a aba visível, é o que dá pra fazer com segurança hoje.
 */
const INTERVALO_MS = 5 * 60 * 1000;
const CHAVE_PROXIMA_ATUALIZACAO = 'madm-ops-proxima-atualizacao';

const TickContext = createContext<number | null>(null);
const CountdownContext = createContext<number | null>(null);

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

/** Isola o contador regressivo (muda a cada segundo) num componente próprio, bem no fundo da
 * árvore — só ele re-renderiza a cada segundo, não o Provider inteiro nem quem só usa `tick`. */
function CountdownProvider({ children, onVencer }: { children: ReactNode; onVencer: () => void }) {
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
        // visibilitychange no provider externo dispara a atualização assim que ela voltar.
        setSegundosRestantes(0);
        return;
      }
      const proxima = Date.now() + INTERVALO_MS;
      setProximaEm(proxima);
      salvarProximaAtualizacao(proxima);
      setSegundosRestantes(INTERVALO_MS / 1000);
      onVencer();
    }, 1000);
    return () => clearInterval(id);
  }, [proximaEm, onVencer]);

  useEffect(() => {
    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible' && Date.now() >= proximaEm) {
        const proxima = Date.now() + INTERVALO_MS;
        setProximaEm(proxima);
        salvarProximaAtualizacao(proxima);
        setSegundosRestantes(INTERVALO_MS / 1000);
        onVencer();
      }
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [proximaEm, onVencer]);

  return <CountdownContext.Provider value={segundosRestantes}>{children}</CountdownContext.Provider>;
}

export function AutoRefreshProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const onVencer = useMemo(() => () => setTick((t) => t + 1), []);

  return (
    <TickContext.Provider value={tick}>
      <CountdownProvider onVencer={onVencer}>{children}</CountdownProvider>
    </TickContext.Provider>
  );
}

/** Só o sinal de "hora de recarregar os dados" — não muda a cada segundo, então quem só usa
 * isso (RelatorioContext, useIntelligence) não re-renderiza sem necessidade. */
export function useAutoRefreshTick() {
  const tick = useContext(TickContext);
  if (tick === null) throw new Error('useAutoRefreshTick deve ser usado dentro de AutoRefreshProvider');
  return tick;
}

/** O contador regressivo em segundos — só quem realmente mostra o "faltam X:XX" (o botão do
 * topo) deve usar isso, já que muda a cada segundo. */
export function useAutoRefreshCountdown() {
  const segundos = useContext(CountdownContext);
  if (segundos === null) throw new Error('useAutoRefreshCountdown deve ser usado dentro de AutoRefreshProvider');
  return segundos;
}
