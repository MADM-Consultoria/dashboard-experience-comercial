import type { InsightAutomatico } from '@/types/domain';
import { STATUS_COLOR } from '@/lib/format';
import { AlertTriangle, Lightbulb, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

const ICONE: Record<InsightAutomatico['categoria'], typeof Lightbulb> = {
  gargalo: AlertTriangle,
  oportunidade: Lightbulb,
  risco: TrendingDown,
  destaque: Sparkles,
  tendencia: TrendingUp,
};

export function InsightCard({ insight }: { insight: InsightAutomatico }) {
  const Icon = ICONE[insight.categoria];
  const cor = STATUS_COLOR[insight.severidade];

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-100">{insight.titulo}</p>
        <p className="mt-0.5 text-[13px] text-slate-500 leading-relaxed">{insight.descricao}</p>
      </div>
    </div>
  );
}
