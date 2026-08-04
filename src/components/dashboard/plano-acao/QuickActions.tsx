import { Headphones, History, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/** "Ver detalhes" é a única ação com destino real hoje (perfil do colaborador). As outras
 * três aparecem como o produto pede (ícone, hover, visual rico), mas ficam desabilitadas
 * com um aviso — não faz sentido fingir que "Enviar feedback"/"Escutar ligações"/"Ver
 * histórico de ligações" funcionam quando não existe integração nenhuma por trás ainda. */
export function QuickActions({ colaboradorId }: { colaboradorId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to={`/colaboradores/${colaboradorId}`}
        className="flex-1 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold py-2 transition-colors"
      >
        Ver detalhes
      </Link>
      <button type="button" disabled title="Em breve" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed">
        <MessageCircle size={14} />
      </button>
      <button type="button" disabled title="Em breve" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed">
        <Headphones size={14} />
      </button>
      <button type="button" disabled title="Em breve" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed">
        <History size={14} />
      </button>
    </div>
  );
}
