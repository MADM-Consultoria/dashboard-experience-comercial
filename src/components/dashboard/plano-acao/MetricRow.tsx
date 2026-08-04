import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricRowProps {
  icon: LucideIcon;
  cor: string;
  label: string;
  titulo?: string;
  /** Valor simples (Recebidos, Média/Dia, Conversão) — vira uma linha label/valor dentro do
   * quadrado colorido. Ausente quando `children` é passado (Assinados/Protocolados, que têm
   * conteúdo mais rico: valor do mês + quadradinhos de ritmo diário). */
  value?: ReactNode;
  children?: ReactNode;
}

/** Linha de métrica com ícone em destaque — usada em todas as métricas do card do Plano de
 * Ação, pra dar identidade visual consistente em vez de barras de progresso sem significado
 * (ex: Recebidos/Média-Dia/Conversão não têm meta real pra virar barra). Assinados e
 * Protocolados usam a mesma casca visual, mas com os quadradinhos de ritmo diário como
 * conteúdo (via `children`) em vez de um valor único. */
export function MetricRow({ icon: Icon, cor, label, titulo, value, children }: MetricRowProps) {
  return (
    <div
      title={titulo}
      className="flex items-start gap-3 rounded-xl border px-3 py-2"
      style={{ backgroundColor: `${cor}0d`, borderColor: `${cor}33` }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}26`, color: cor }}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        {children ?? (
          <div className="flex items-center justify-between h-8">
            <span className="text-[12px] text-slate-500">{label}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
