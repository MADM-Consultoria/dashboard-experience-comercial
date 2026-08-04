import type { ComponentType } from 'react';
import { CheckCircle2, FileText, Filter, Trophy, Users } from 'lucide-react';
import type { EtapaFunil } from '@/types/domain';
import { formatNumero, formatPct } from '@/lib/format';

interface EtapaMeta {
  icon: ComponentType<{ size?: number; className?: string }>;
  sublabel: string;
  de: string;
  para: string;
}

const ETAPA_META: Record<EtapaFunil['etapa'], EtapaMeta> = {
  Recebidos: { icon: Users, sublabel: 'Total de leads recebidos', de: '#3B82F6', para: '#6366F1' },
  Assinados: { icon: CheckCircle2, sublabel: 'Leads que assinaram', de: '#22C55E', para: '#16A34A' },
  Protocolados: { icon: FileText, sublabel: 'Leads protocolados', de: '#84CC16', para: '#65A30D' },
  'Venda Ganha': { icon: Trophy, sublabel: 'Processos com venda ganha', de: '#F97316', para: '#EA580C' },
};

export function FunilChart({ etapas }: { etapas: EtapaFunil[] }) {
  const total = etapas[0]?.valor || 1;
  const max = etapas[0]?.valor || 1;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Filter size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Funil Comercial</h3>
          <p className="text-[12px] text-slate-500">Acompanhe cada etapa do seu processo de vendas</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {etapas.map((etapa, i) => {
          const meta = ETAPA_META[etapa.etapa];
          const Icon = meta.icon;
          const largura = Math.max(28, (etapa.valor / max) * 100);
          const pctDoTotal = (etapa.valor / total) * 100;
          const proxima = etapas[i + 1];

          return (
            <div key={etapa.etapa} className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 w-[132px] shrink-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.de}26`, color: meta.de }}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{etapa.etapa}</p>
                  <p className="text-[10px] text-slate-500 truncate">{meta.sublabel}</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="flex flex-col items-center justify-center py-2.5 text-white transition-all duration-500"
                  style={{
                    width: `${largura}%`,
                    minWidth: '64px',
                    background: `linear-gradient(135deg, ${meta.de}, ${meta.para})`,
                    clipPath: 'polygon(3% 0, 97% 0, 91% 100%, 9% 100%)',
                  }}
                >
                  <span className="text-base font-bold leading-tight">{formatNumero(etapa.valor)}</span>
                  <span className="text-[11px] opacity-90 leading-tight">{formatPct(pctDoTotal, 1)}</span>
                </div>
              </div>

              <div className="w-[52px] shrink-0 flex flex-col items-center">
                {i === 0 && <span className="text-[9px] text-slate-500 mb-1 text-center leading-tight">Taxa de<br />conversão</span>}
                {proxima && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ backgroundColor: `${ETAPA_META[proxima.etapa].de}26`, color: ETAPA_META[proxima.etapa].de }}
                  >
                    {formatPct(proxima.taxaConversaoEtapaAnterior ?? 0, 1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
