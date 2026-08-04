import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { montarItensNav } from './navItems';

/** Menu de navegação em gaveta, só aparece abaixo do breakpoint lg (onde a Sidebar fica escondida). */
export function MobileNav() {
  const { sessao } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const itens = montarItensNav(sessao?.role === 'master');

  // Trava o scroll da página de fundo enquanto a gaveta está aberta — sem
  // isso, no celular a página por trás rola junto e o menu parece "pular"
  // ou desalinhar (o bug mais comum desse tipo de painel em mobile).
  useEffect(() => {
    if (!aberto) return;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [aberto]);

  function abrir() {
    setAberto(true);
    // dois quadros: monta fechado, depois anima para aberto (evita o painel
    // "aparecer" já deslizado, que em alguns navegadores mobile falha o
    // primeiro paint da transição).
    requestAnimationFrame(() => requestAnimationFrame(() => setVisivel(true)));
  }

  function fechar() {
    setVisivel(false);
    setTimeout(() => setAberto(false), 220);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Abrir menu de navegação"
        className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
      >
        <Menu size={18} />
      </button>

      {aberto && createPortal(
        <div className="fixed inset-0 z-[999] lg:hidden overflow-hidden">
          <div
            className={clsx(
              'absolute inset-0 bg-slate-900/40 transition-opacity duration-200',
              visivel ? 'opacity-100' : 'opacity-0',
            )}
            onClick={fechar}
          />
          <aside
            className={clsx(
              'absolute left-0 top-0 h-full w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col',
              'transition-transform duration-200 ease-out',
              visivel ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex items-center justify-between gap-2.5 px-4 h-16 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src="/logo-madm.png" alt="MADM" className="h-9 w-9 object-contain shrink-0" />
                <div className="leading-tight min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">MADM Ops</p>
                  <p className="text-[11px] text-slate-500 truncate">Inteligência Comercial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-3 space-y-0.5">
              {itens.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={fechar}
                  className={({ isActive }) =>
                    clsx(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                      isActive ? 'bg-blue-500/15 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
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
        </div>,
        document.body,
      )}
    </>
  );
}
