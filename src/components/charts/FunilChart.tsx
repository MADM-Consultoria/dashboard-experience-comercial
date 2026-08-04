import type { ComponentType } from 'react';
import { CheckCircle2, ChevronDown, FileText, Filter, Trophy, Users } from 'lucide-react';
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

const COLUNAS = 'grid-cols-[140px_1fr_58px]';

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

      <div className={`grid ${COLUNAS} items-end gap-3`}>
        <div />
        <div />
        <p className="text-[9px] text-slate-500 text-center leading-tight">Taxa de conversão</p>
      </div>

      <div className="flex flex-col">
        {etapas.map((etapa, i) => {
          const meta = ETAPA_META[etapa.etapa];
          const Icon = meta.icon;
          const largura = Math.max(24, (etapa.valor / max) * 100);
          const pctDoTotal = (etapa.valor / total) * 100;
          const proxima = etapas[i + 1];

          return (
            <div key={etapa.etapa}>
              <div className={`grid ${COLUNAS} items-center gap-3`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.de}26`, color: meta.de }}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{etapa.etapa}</p>
                    <p className="text-[10px] text-slate-500 truncate">{meta.sublabel}</p>
                  </div>
                </div>

                <div className="h-16 w-full flex items-center">
                  <div
                    className="flex h-full flex-col items-center justify-center text-white transition-[width] duration-500 rounded-l-md"
                    style={{
                      width: `${largura}%`,
                      background: `linear-gradient(135deg, ${meta.de}, ${meta.para})`,
                      clipPath: 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)',
                    }}
                  >
                    <span className="text-lg font-bold leading-tight">{formatNumero(etapa.valor)}</span>
                    <span className="text-[11px] opacity-90 leading-tight">{formatPct(pctDoTotal, 1)}</span>
                  </div>
                </div>

                <div className="relative flex items-center justify-center h-16">
                  {proxima && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                      style={{ backgroundColor: `${ETAPA_META[proxima.etapa].de}26`, color: ETAPA_META[proxima.etapa].de }}
                    >
                      {formatPct(proxima.taxaConversaoEtapaAnterior ?? 0, 1)}
                    </span>
                  )}
                </div>
              </div>

              {proxima && (
                <div className={`grid ${COLUNAS} gap-3`}>
                  <div />
                  <div />
                  <div className="flex flex-col items-center h-4">
                    <div className="w-px flex-1 border-l border-dashed" style={{ borderColor: '#475569' }} />
                    <ChevronDown size={10} className="text-slate-500 -mt-0.5" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
