import { STATUS_COLOR } from '@/lib/format';
import type { NivelStatus } from '@/types/domain';

/** Anel de progresso em SVG puro (sem lib nova) — a transição de `stroke-dashoffset` já
 * anima suavemente via CSS quando o valor muda, sem precisar de framer-motion. */
export function ScoreCircle({ score, banda, size = 72 }: { score: number; banda: NivelStatus; size?: number }) {
  const cor = STATUS_COLOR[banda];
  const raio = (size - 8) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - score / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={raio} fill="none" stroke="currentColor" strokeWidth={6} className="text-slate-100 dark:text-slate-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-slate-900 leading-none">{score}</span>
      </div>
    </div>
  );
}
