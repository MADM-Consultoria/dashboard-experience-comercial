import type { EtapaFunil } from '@/types/domain';
import { formatNumero, formatPct } from '@/lib/format';

// Recebidos (verde claro) -> Assinados (verde escuro) -> Protocolados (verde bem escuro, etapa final concluída).
const CORES = ['#86efac', '#16a34a', '#14532d'];

export function FunilChart({ etapas }: { etapas: EtapaFunil[] }) {
  const max = etapas[0]?.valor || 1;

  return (
    <div className="flex flex-col gap-3">
      {etapas.map((etapa, i) => {
        const largura = Math.max(12, (etapa.valor / max) * 100);
        return (
          <div key={etapa.etapa}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">{etapa.etapa}</span>
              <div className="flex items-center gap-3">
                {etapa.taxaConversaoEtapaAnterior !== null && (
                  <span className="text-xs text-slate-500">{formatPct(etapa.taxaConversaoEtapaAnterior, 1)} conversão</span>
                )}
                <span className="text-sm font-semibold text-slate-900">{formatNumero(etapa.valor)}</span>
              </div>
            </div>
            <div className="h-8 w-full rounded-lg bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center transition-all duration-500"
                style={{ width: `${largura}%`, backgroundColor: CORES[i] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
