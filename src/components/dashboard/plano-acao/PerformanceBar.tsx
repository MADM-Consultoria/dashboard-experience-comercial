import clsx from 'clsx';

interface PerformanceBarProps {
  label: string;
  valor: number;
  valorLabel: string;
  /** Ausente = não existe meta/média real pra comparar (ex: Recebidos, que depende só da
   * distribuição de leads, não de esforço do colaborador) — mostra só o valor, sem barra
   * de comparação nem texto de referência inventado. */
  referencia?: number;
  referenciaLabel?: string;
  cor?: string;
  /** Explicação da métrica em texto simples — vira tooltip nativo ao passar o cursor. */
  titulo?: string;
}

/** Barra horizontal com transição animada de largura — usada nas métricas com comparação real
 * (Média/Dia, Assinados, Protocolados, Conversão). Sem `referencia`, vira só um indicador do
 * valor atual. */
export function PerformanceBar({ label, valor, valorLabel, referencia, referenciaLabel, cor = '#4F7CFF', titulo }: PerformanceBarProps) {
  const temReferencia = typeof referencia === 'number';
  const pct = temReferencia ? (referencia! > 0 ? Math.min(100, (valor / referencia!) * 100) : valor > 0 ? 100 : 0) : 100;
  const acimaDaReferencia = temReferencia && referencia! > 0 && valor >= referencia!;

  return (
    <div title={titulo}>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">
          {valorLabel}
          {temReferencia && <span className="font-normal text-slate-400"> / {referenciaLabel}</span>}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={clsx('h-full rounded-full')}
          style={{ width: `${pct}%`, backgroundColor: temReferencia ? (acimaDaReferencia ? '#22C55E' : cor) : cor, transition: 'width 0.7s ease-out' }}
        />
      </div>
    </div>
  );
}
