import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { LogOut, Settings, User, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { iniciais } from '@/lib/format';
import { Card } from '@/components/ui/Card';

function ModalPerfil({ onFechar }: { onFechar: () => void }) {
  const { sessao } = useAuth();
  if (!sessao) return null;

  // Renderizado via portal direto no <body>: o header usa backdrop-blur, que cria
  // um "containing block" pra elementos position:fixed dentro dele — sem o portal,
  // o modal ficaria preso na caixinha do header em vez de cobrir a tela toda.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onFechar}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <Card className="relative modal-surface">
          <button
            onClick={onFechar}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-semibold text-white mb-3">
              {iniciais(sessao.nome)}
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{sessao.nome}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sessao.usuario}</p>
            <span className="mt-3 inline-block rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">
              {sessao.role === 'master' ? 'Administrador' : 'Usuário'}
            </span>
          </div>
        </Card>
      </div>
    </div>,
    document.body,
  );
}

export function UserMenu() {
  const { sessao, logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[11px] font-semibold text-white cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-lg hover:ring-2 hover:ring-blue-400/50 active:scale-95"
      >
        {iniciais(sessao?.nome ?? 'Usuário')}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1.5 text-[13px]">
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{sessao?.nome}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sessao?.usuario}</p>
          </div>
          <button
            onClick={() => {
              setPerfilAberto(true);
              setAberto(false);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-slate-600 dark:text-slate-300 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 hover:pl-5 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <User size={15} /> Perfil
          </button>
          <Link
            to="/configuracoes"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-slate-600 dark:text-slate-300 transition-all duration-150 hover:bg-slate-50 dark:hover:bg-slate-700 hover:pl-5 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Settings size={15} /> Configurações
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-t border-slate-100 dark:border-slate-700 mt-1"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      )}

      {perfilAberto && <ModalPerfil onFechar={() => setPerfilAberto(false)} />}
    </div>
  );
}
