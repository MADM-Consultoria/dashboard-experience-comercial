import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { montarItensNav } from './navItems';

export function Sidebar() {
  const { sessao } = useAuth();
  const itens = montarItensNav(sessao?.role === 'master');

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-200 dark:border-slate-700">
        <img src="/logo-madm.png" alt="MADM" className="h-9 w-9 object-contain shrink-0" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">MADM Ops</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Inteligência Comercial</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                isActive ? 'bg-blue-500/15 text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} className={clsx(isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-600')} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
