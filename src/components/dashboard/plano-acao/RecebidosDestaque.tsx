import { Inbox } from 'lucide-react';
import { formatNumero } from '@/lib/format';

/** Recebidos não tem meta nem média real pra comparar (depende da distribuição de leads, não
 * do colaborador) — em vez de forçar numa barra de progresso sempre 100% cheia (o que não
 * significa nada), vira um destaque simples com ícone e número. */
export function RecebidosDestaque({ valor }: { valor: number }) {
  return (
    <div
      title="Total de leads recebidos no período. Não tem meta nem média de equipe — depende da distribuição de leads, não do colaborador."
      className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-2"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
        <Inbox size={15} />
      </div>
      <div className="min-w-0 flex-1 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">Recebidos</span>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNumero(valor)}</span>
      </div>
    </div>
  );
}
