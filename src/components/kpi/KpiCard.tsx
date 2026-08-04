import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import clsx from 'clsx';

interface KpiCardProps {
  titulo: string;
  valor: string;
  /** Ícone lucide OU um emoji literal (string) — algumas telas pedem emoji de verdade em vez do ícone monocromático. */
  icon: LucideIcon | string;
  variacao?: number; // % — positivo = bom, negativo = ruim (a menos que invertido)
  variacaoInvertida?: boolean; // quando queda é positiva (ex: nenhum caso hoje)
  subtitulo?: string;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
}

const ACCENTS: Record<NonNullable<KpiCardProps['accent']>, string> = {
  brand: 'text-blue-600 bg-blue-500/10',
  success: 'text-emerald-400 bg-emerald-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  danger: 'text-red-400 bg-red-500/10',
  info: 'text-sky-400 bg-sky-500/10',
};

export function KpiCard({ titulo, valor, icon: Icon, variacao, variacaoInvertida, subtitulo, accent = 'brand' }: KpiCardProps) {
  const positivo = variacao !== undefined ? (variacaoInvertida ? variacao < 0 : variacao > 0) : null;

  return (
    <Card className="flex flex-col gap-3">
      {typeof Icon === 'string' ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-slate-500 leading-snug">{titulo}</p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg leading-none opacity-70 saturate-[.6]">
            {Icon}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-slate-500 leading-snug">{titulo}</p>
          <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ACCENTS[accent])}>
            <Icon size={16} />
          </span>
        </div>
      )}

      <p className="text-2xl font-semibold text-slate-900 tracking-tight">{valor}</p>

      <div className="flex items-center gap-2 min-h-[18px]">
        {variacao !== undefined && Math.abs(variacao) >= 0.5 && (
          <span
            className={clsx(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              positivo ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {positivo ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(variacao).toFixed(1)}%
          </span>
        )}
        {variacao !== undefined && Math.abs(variacao) < 0.5 && (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500">
            <Minus size={13} /> estável
          </span>
        )}
        {subtitulo && <span className="text-xs text-slate-500">{subtitulo}</span>}
      </div>
    </Card>
  );
}
