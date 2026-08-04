import { Bell, RefreshCw } from 'lucide-react';
import { CalendarioSelector } from './CalendarioSelector';
import { MobileNav } from './MobileNav';
import { UserMenu } from './UserMenu';
import { useIntelligence } from '@/lib/useIntelligence';

export function TopBar() {
  const { alertas } = useIntelligence();
  const criticos = alertas.filter((a) => a.prioridade === 'critico').length;

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-[#f8fafc]/85 dark:bg-slate-900/85 backdrop-blur px-4 lg:px-8">
      <MobileNav />

      <div className="flex items-center gap-3 ml-auto">
        <CalendarioSelector />

        <button
          onClick={() => window.location.reload()}
          title="Atualizar página"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <RefreshCw size={16} />
        </button>

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
