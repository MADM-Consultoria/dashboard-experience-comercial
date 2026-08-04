import type { ComponentType } from 'react';
import { CheckCircle2, ChevronDown, FileText, Filter, Trophy, Users } from 'lucide-react';
import type { EtapaFunil } from '@/types/domain';
import { formatNumero, formatPct } from '@/lib/format';

interface EtapaMeta {
  icon: ComponentType<{ size?: number; className?: string }>;
  de: string;
  para: string;
}

const ETAPA_META: Record<EtapaFunil['etapa'], EtapaMeta> = {
  Recebidos: { icon: Users, de: '#3B82F6', para: '#6366F1' },
  Assinados: { icon: CheckCircle2, de: '#22C55E', para: '#16A34A' },
  Protocolados: { icon: FileText, de: '#84CC16', para: '#65A30D' },
  'Venda Ganha': { icon: Trophy, de: '#F97316', para: '#EA580C' },
};

/** Cada etapa é centralizada embaixo da anterior e mais estreita — é isso, sozinho, que desenha
 * o funil. Nada de colunas fixas lado a lado: só uma pilha de trapézios de largura decrescente,
 * todos com o mesmo eixo central. */
export function FunilChart({ etapas }: { etapas: EtapaFunil[] }) {
  const total = etapas[0]?.valor || 1;
  const max = etapas[0]?.valor || 1;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Filter size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Funil Comercial</h3>
          <p className="text-[12px] text-slate-500">Acompanhe cada etapa do seu processo de vendas</p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {etapas.map((etapa, i) => {
          const meta = ETAPA_META[etapa.etapa];
          const Icon = meta.icon;
          const largura = Math.max(22, (etapa.valor / max) * 100);
          const pctDoTotal = (etapa.valor / total) * 100;
          const proxima = etapas[i + 1];

          return (
            <div key={etapa.etapa} className="w-full flex flex-col items-center">
              <div
                className="flex items-center justify-center gap-2 py-3 text-white transition-[width] duration-500"
                style={{
                  width: `${largura}%`,
                  minWidth: '120px',
                  background: `linear-gradient(135deg, ${meta.de}, ${meta.para})`,
                  clipPath: 'polygon(4% 0, 96% 0, 88% 100%, 12% 100%)',
                }}
              >
                <Icon size={15} className="shrink-0 opacity-90" />
                <div className="text-center leading-tight">
                  <p className="text-[12px] font-medium opacity-90">{etapa.etapa}</p>
                  <p className="text-base font-bold -mt-0.5">
                    {formatNumero(etapa.valor)} <span className="text-[11px] font-normal opacity-90">· {formatPct(pctDoTotal, 1)}</span>
                  </p>
                </div>
              </div>

              {proxima && (
                <div className="flex flex-col items-center py-1">
                  <ChevronDown size={12} className="text-slate-400" />
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                    style={{ backgroundColor: `${ETAPA_META[proxima.etapa].de}26`, color: ETAPA_META[proxima.etapa].de }}
                  >
                    {formatPct(proxima.taxaConversaoEtapaAnterior ?? 0, 1)} conversão
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
