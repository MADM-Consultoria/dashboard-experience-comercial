import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { NivelStatus, PaceProjecao } from '@/types/domain';
import { formatNumero, STATUS_COLOR } from '@/lib/format';

interface ResumoMesCardProps {
  titulo: string;
  /** Ícone lucide OU um emoji literal (string). */
  icon: LucideIcon | string;
  atual: number;
  meta: number;
  pace: PaceProjecao;
  statusPace: NivelStatus;
  onClick?: () => void;
}

/** Card executivo "Geral/Judit · Assinados": progresso do mês + pace + projeção, no estilo do resumo-mês. */
export function ResumoMesCard({ titulo, icon: Icon, atual, meta, pace, statusPace, onClick }: ResumoMesCardProps) {
  const progresso = meta > 0 ? (atual / meta) * 100 : 0;

  return (
    <Card
      onClick={onClick}
      className={
        onClick
          ? 'cursor-pointer transition-all hover:border-blue-400/60 hover:shadow-md hover:-translate-y-0.5'
          : undefined
      }
    >
      {typeof Icon === 'string' ? (
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{titulo}</p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg leading-none opacity-70 saturate-[.6]">
            {Icon}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{titulo}</p>
          <Icon size={18} className="shrink-0 text-blue-600" />
        </div>
      )}

      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-slate-900">{formatNumero(atual)}</span>
        <span className="text-sm text-slate-400">/ {formatNumero(meta)}</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, progresso)}%` }} />
      </div>
      <div className="flex justify-end mt-1 mb-4">
        <span className="text-xs text-slate-500">{progresso.toFixed(0)}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Pace atual/dia</p>
          <p className="text-sm font-semibold text-slate-900">{pace.paceAtual.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Pace esperado</p>
          <p className="text-sm font-semibold text-slate-900">{pace.paceEsperado.toFixed(1)}</p>
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-slate-100 text-[12px] text-slate-500">
        Projeção ao fim do mês: <span className="font-semibold text-slate-700">{formatNumero(pace.projecao)}</span> · gap de{' '}
        <span className="font-semibold" style={{ color: STATUS_COLOR[statusPace] }}>
          {pace.gap >= 0 ? '+' : ''}{formatNumero(pace.gap)}
        </span>{' '}
        vs meta
      </p>
    </Card>
  );
}
