import { useEffect, useRef, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { CalendarioSelector } from './CalendarioSelector';
import { MobileNav } from './MobileNav';
import { UserMenu } from './UserMenu';
import { RelogioBrasilia } from '@/components/dashboard/plano-acao/RelogioBrasilia';
import { useIntelligence } from '@/lib/useIntelligence';
import { useAutoRefreshCountdown } from '@/context/AutoRefreshContext';
import { useAuth } from '@/context/AuthContext';

function formatarContagem(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Os dados já se atualizam sozinhos a cada 5 min (ver AutoRefreshContext) — esse botão não
 * força mais um reload da página; em vez disso mostra quanto falta pra próxima atualização
 * automática, pra deixar claro que não precisa apertar nada. */
function BotaoAtualizar() {
  const segundosRestantes = useAutoRefreshCountdown();
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mostrarAviso) return;
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMostrarAviso(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [mostrarAviso]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMostrarAviso((v) => !v)}
        title="Os dados atualizam automaticamente"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <RefreshCw size={16} />
      </button>
      {mostrarAviso && (
        <div className="absolute right-0 top-11 z-20 w-60 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-3 animate-fade-in">
          <p className="text-[12px] text-slate-600 dark:text-slate-300">
            Os dados já atualizam sozinhos, sem precisar recarregar a página.
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            Próxima atualização em {formatarContagem(segundosRestantes)}
          </p>
        </div>
      )}
    </div>
  );
}

/** Nome do time restrito pro supervisor logado (sessao.time já vem como "Equipe Felipe").
 * Master não tem time restrito, não mostra nada. */
function useNomeTimeSupervisor() {
  const { sessao } = useAuth();
  return sessao?.time ?? null;
}

export function TopBar() {
  const { alertas } = useIntelligence();
  const criticos = alertas.filter((a) => a.prioridade === 'critico').length;
  const nomeTime = useNomeTimeSupervisor();

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-[#f8fafc]/85 dark:bg-slate-900/85 backdrop-blur px-4 py-2 lg:px-8">
      <MobileNav />

      {nomeTime && (
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-extrabold uppercase tracking-wide selo-time hidden sm:inline-block">
          {nomeTime}
        </span>
      )}

      <div className="flex items-center gap-3 ml-auto">
        <div className="flex flex-col items-end gap-1">
          <CalendarioSelector />
          <RelogioBrasilia />
        </div>

        <BotaoAtualizar />

        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500">
          <Bell size={16} />
          {criticos > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-slate-900 px-1">
              {criticos}
            </span>
          )}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
