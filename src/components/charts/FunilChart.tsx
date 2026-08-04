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

// Cada etapa ocupa exatamente ROW_H px de altura nas 3 colunas (label, trapézio, badge) — como
// as 3 colunas são 3 empilhamentos flex INDEPENDENTES com a MESMA altura fixa por item, a linha
// i cai sempre no mesmo pixel (i × ROW_H) nas três, sem depender de grid nenhum recalculando
// larguras diferentes entre uma "linha" e outra. É isso que garante o alinhamento.
const ROW_H = 88;
const BAR_H = 64;
const BADGE_H = 22;

export function FunilChart({ etapas }: { etapas: EtapaFunil[] }) {
  const total = etapas[0]?.valor || 1;
  const max = etapas[0]?.valor || 1;
  const alturaTotal = etapas.length * ROW_H;

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

      <div className="flex gap-3">
        {/* Coluna 1: ícone + nome */}
        <div className="flex flex-col shrink-0" style={{ width: 140 }}>
          {etapas.map((etapa) => {
            const meta = ETAPA_META[etapa.etapa];
            const Icon = meta.icon;
            return (
              <div key={etapa.etapa} className="flex items-center gap-2.5 min-w-0" style={{ height: ROW_H }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.de}26`, color: meta.de }}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{etapa.etapa}</p>
                  <p className="text-[10px] text-slate-500 truncate">{meta.sublabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coluna 2: trapézios */}
        <div className="flex flex-col flex-1 min-w-0">
          {etapas.map((etapa) => {
            const meta = ETAPA_META[etapa.etapa];
            const largura = Math.max(24, (etapa.valor / max) * 100);
            const pctDoTotal = (etapa.valor / total) * 100;
            return (
              <div key={etapa.etapa} className="flex items-center" style={{ height: ROW_H }}>
                <div
                  className="flex flex-col items-center justify-center text-white transition-[width] duration-500"
                  style={{
                    width: `${largura}%`,
                    height: BAR_H,
                    background: `linear-gradient(135deg, ${meta.de}, ${meta.para})`,
                    clipPath: 'polygon(6% 0, 94% 0, 84% 100%, 16% 100%)',
                  }}
                >
                  <span className="text-lg font-bold leading-tight">{formatNumero(etapa.valor)}</span>
                  <span className="text-[11px] opacity-90 leading-tight">{formatPct(pctDoTotal, 1)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Coluna 3: badge de conversão pro próximo estágio + conector pontilhado */}
        <div className="relative shrink-0" style={{ width: 58, height: alturaTotal }}>
          <p className="absolute text-[9px] text-slate-500 text-center leading-tight w-full" style={{ top: -20 }}>
            Taxa de conversão
          </p>
          {etapas.map((etapa, i) => {
            const proxima = etapas[i + 1];
            if (!proxima) return null;
            const corProxima = ETAPA_META[proxima.etapa].de;
            const centroY = i * ROW_H + ROW_H / 2;
            return (
              <div key={etapa.etapa}>
                <span
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                  style={{ top: centroY, backgroundColor: `${corProxima}26`, color: corProxima }}
                >
                  {formatPct(proxima.taxaConversaoEtapaAnterior ?? 0, 1)}
                </span>
                <div
                  className="absolute left-1/2 border-l border-dashed"
                  style={{ top: centroY + BADGE_H / 2, height: ROW_H - BADGE_H, borderColor: '#475569' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
