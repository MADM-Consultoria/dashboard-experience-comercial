import clsx from 'clsx';

interface PerformanceBarProps {
  label: string;
  valor: number;
  valorLabel: string;
  referencia: number;
  referenciaLabel: string;
  cor?: string;
}

/** Barra horizontal com transição animada de largura — usada em todas as métricas com
 * comparação (Recebidos, Média/Dia, Assinados, Protocolados, Conversão). */
export function PerformanceBar({ label, valor, valorLabel, referencia, referenciaLabel, cor = '#4F7CFF' }: PerformanceBarProps) {
  const pct = referencia > 0 ? Math.min(100, (valor / referencia) * 100) : valor > 0 ? 100 : 0;
  const acimaDaReferencia = referencia > 0 && valor >= referencia;

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">
          {valorLabel} <span className="font-normal text-slate-400">/ {referenciaLabel}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={clsx('h-full rounded-full')}
          style={{ width: `${pct}%`, backgroundColor: acimaDaReferencia ? '#22C55E' : cor, transition: 'width 0.7s ease-out' }}
        />
      </div>
    </div>
  );
}
