import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BarraCorridaPace, paceEstaCansado } from './BarraCorridaPace';
import type { PaceProjecao } from '@/types/domain';
import { formatNumero } from '@/lib/format';

interface ResumoMesCardProps {
  titulo: string;
  /** Ícone lucide OU um emoji literal (string). */
  icon: LucideIcon | string;
  atual: number;
  meta: number;
  pace: PaceProjecao;
  /** Pace mínimo (valor/dia) pro boneco correr em vez de andar cansado — ver BarraCorridaPace. */
  limiarCorrida?: number;
  onClick?: () => void;
}

/** Card executivo "Geral/Judit · Assinados": progresso do mês + pace + aviso de pace, no estilo do resumo-mês. */
export function ResumoMesCard({ titulo, icon: Icon, atual, meta, pace, limiarCorrida, onClick }: ResumoMesCardProps) {
  const progresso = meta > 0 ? (atual / meta) * 100 : 0;
  // A mensagem segue o MESMO limiar do boneco (paceEstaCansado): boneco andando cansado →
  // aviso de pace baixo; boneco correndo → mensagem de pace bom. Nunca um dizendo uma coisa
  // e o outro mostrando outra.
  const paceRuim = paceEstaCansado(pace.paceAtual, limiarCorrida);

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

      <BarraCorridaPace paceAtual={pace.paceAtual} paceEsperado={pace.paceEsperado} limiarCorrida={limiarCorrida} />

      {paceRuim ? (
        <p className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[12px] text-amber-700">
          <AlertTriangle size={13} className="shrink-0 text-amber-500" />
          Pace atual abaixo do pace esperado pra bater a meta esse mês.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-[12px] text-emerald-700">
          <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
          Pace bom — ritmo dentro do esperado pra esse mês.
        </p>
      )}
    </Card>
  );
}
