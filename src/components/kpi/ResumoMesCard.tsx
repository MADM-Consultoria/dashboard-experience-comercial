import type { LucideIcon } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { NivelStatus } from '@/types/domain';
import { formatNumero } from '@/lib/format';

interface ResumoMesCardProps {
  titulo: string;
  /** Ícone lucide OU um emoji literal (string). */
  icon: LucideIcon | string;
  atual: number;
  meta: number;
  /** Classificação do ritmo do mês (ver classificarPace em diagnostico.ts) — só usada aqui pra
   * decidir se mostra um aviso simples ("ritmo abaixo do esperado"), sem expor os números de
   * pace/projeção calculados por trás. Menos número exposto = menos coisa pra explicar/validar. */
  statusPace: NivelStatus;
  onClick?: () => void;
}

/** Card executivo "Geral/Judit · Assinados": progresso do mês + aviso de ritmo, no estilo do resumo-mês. */
export function ResumoMesCard({ titulo, icon: Icon, atual, meta, statusPace, onClick }: ResumoMesCardProps) {
  const progresso = meta > 0 ? (atual / meta) * 100 : 0;
  // Aviso simples só quando o ritmo está ruim — quando está bom, o card fica quieto (silêncio
  // já é a informação: nada pra ajustar). Sem número de pace/gap/projeção exposto.
  const ritmoRuim = statusPace === 'atencao' || statusPace === 'alerta' || statusPace === 'critico';

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

      {ritmoRuim && (
        <p className="flex items-center gap-1.5 pt-3 border-t border-slate-100 text-[12px] text-amber-700">
          <AlertTriangle size={13} className="shrink-0 text-amber-500" />
          Ritmo abaixo do necessário pra bater a meta esse mês.
        </p>
      )}
    </Card>
  );
}
