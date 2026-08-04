import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { montarItensNav } from './navItems';

const CHAVE_COLAPSADA = 'madm-ops-sidebar-colapsada';

function lerColapsada(): boolean {
  try {
    return localStorage.getItem(CHAVE_COLAPSADA) === '1';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const { sessao } = useAuth();
  const itens = montarItensNav(sessao?.role === 'master');
  const [colapsada, setColapsada] = useState(lerColapsada);

  function alternar() {
    setColapsada((v) => {
      const novo = !v;
      try {
        localStorage.setItem(CHAVE_COLAPSADA, novo ? '1' : '0');
      } catch {}
      return novo;
    });
  }

  return (
    <aside
      className={clsx(
        'hidden lg:flex shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-screen sticky top-0 transition-[width] duration-200',
        colapsada ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={clsx('flex items-center h-16 border-b border-slate-200 dark:border-slate-700', colapsada ? 'justify-center px-2' : 'gap-2.5 px-6')}>
        <img src="/logo-madm.png" alt="MADM" className="h-9 w-9 object-contain shrink-0" />
        {!colapsada && (
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">MADM Ops</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Inteligência Comercial</p>
          </div>
        )}
      </div>

      {/* Sem overflow-y-auto aqui: o CSS obriga overflow-x a virar "auto" junto (não dá pra ter
         y rolável e x visível ao mesmo tempo), o que criava aquela setinha de scroll horizontal
         cortando o tooltip. A lista de itens é curta o bastante pra nunca precisar rolar. */}
      <nav className={clsx('flex-1 py-4 space-y-0.5', colapsada ? 'px-2' : 'px-3')}>
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center rounded-lg py-2.5 text-[13.5px] font-medium transition-colors',
                colapsada ? 'justify-center px-0' : 'gap-3 px-3',
                isActive ? 'bg-blue-500/15 text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} className={clsx('shrink-0', isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-600')} />
                {!colapsada && <span className="truncate">{item.label}</span>}
                {colapsada && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 dark:bg-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={alternar}
        title={colapsada ? 'Expandir menu' : 'Minimizar menu'}
        className={clsx(
          'flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 py-3 text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors',
          colapsada ? 'justify-center px-2' : 'justify-end px-3',
        )}
      >
        {colapsada ? <ChevronRight size={16} /> : (
          <>
            Minimizar <ChevronLeft size={16} />
          </>
        )}
      </button>
    </aside>
  );
}
