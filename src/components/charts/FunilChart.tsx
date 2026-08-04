import type { ComponentType } from 'react';
import { CheckCircle2, FileText, Filter, Trophy, Users } from 'lucide-react';
import type { EtapaFunil } from '@/types/domain';
import { formatNumero, formatPct } from '@/lib/format';

interface EtapaMeta {
  icon: ComponentType<{ size?: number; className?: string }>;
  sublabel: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

// Cores exatas do PRD do componente (dark mode fixo, independente do tema do resto do
// dashboard — é a especificação visual que foi pedida pra esse componente especificamente).
const ETAPA_META: Record<EtapaFunil['etapa'], EtapaMeta> = {
  Recebidos: {
    icon: Users,
    sublabel: 'Total de leads recebidos',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3B82F6',
  },
  Assinados: {
    icon: CheckCircle2,
    sublabel: 'Leads que assinaram',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10B981',
  },
  Protocolados: {
    icon: FileText,
    sublabel: 'Leads protocolados',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    iconBg: 'rgba(132, 204, 22, 0.2)',
    iconColor: '#84CC16',
  },
  'Venda Ganha': {
    icon: Trophy,
    sublabel: 'Processos com venda ganha',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#F59E0B',
  },
};

// Cada etapa ocupa exatamente ROW_H px nas 2 colunas (cards da etapa | pílula de conversão) —
// são 2 empilhamentos flex INDEPENDENTES com a MESMA altura fixa por item, então a linha i cai
// sempre no mesmo pixel nas duas colunas, garantido pela estrutura e não por coincidência.
const ROW_H = 88;
const ROW_GAP = 12;
const BAR_H = 56;
const BADGE_H = 24;

export function FunilChart({ etapas }: { etapas: EtapaFunil[] }) {
  const total = etapas[0]?.valor || 1;
  const max = etapas[0]?.valor || 1;
  const alturaTotal = etapas.length * ROW_H + (etapas.length - 1) * ROW_GAP;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#0B0F19', border: '1px solid #1F2937' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Filter size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Funil Comercial</h3>
          <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Acompanhe cada etapa do seu processo de vendas</p>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Cards das etapas — ícone/nome à esquerda, trapézio à direita, tudo dentro do mesmo card */}
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: ROW_GAP }}>
          {etapas.map((etapa) => {
            const meta = ETAPA_META[etapa.etapa];
            const Icon = meta.icon;
            const largura = Math.max(28, (etapa.valor / max) * 100);
            const pctDoTotal = (etapa.valor / total) * 100;
            return (
              <div
                key={etapa.etapa}
                className="flex items-center gap-3 rounded-xl"
                style={{ height: ROW_H, padding: '16px 20px', backgroundColor: 'rgba(17, 24, 39, 0.7)', border: '1px solid #1F2937' }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.iconBg, color: meta.iconColor }}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 shrink-0" style={{ width: 96 }}>
                  <p className="font-semibold text-white truncate" style={{ fontSize: 16, lineHeight: 1.2 }}>{etapa.etapa}</p>
                  <p className="truncate" style={{ fontSize: 12, color: '#9CA3AF' }}>{meta.sublabel}</p>
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-center">
                  <div
                    className="flex flex-col items-center justify-center text-white transition-[width] duration-500"
                    style={{
                      width: `${largura}%`,
                      height: BAR_H,
                      background: meta.gradient,
                      clipPath: 'polygon(6% 0, 94% 0, 84% 100%, 16% 100%)',
                    }}
                  >
                    <span className="font-bold leading-tight" style={{ fontSize: 24 }}>{formatNumero(etapa.valor)}</span>
                    <span className="leading-tight" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{formatPct(pctDoTotal, 1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pílulas de conversão estágio a estágio + linha pontilhada guia */}
        <div className="relative shrink-0" style={{ width: 74, height: alturaTotal }}>
          <p className="absolute text-center w-full" style={{ top: -20, fontSize: 11, color: '#9CA3AF' }}>Taxa de conversão</p>
          {etapas.map((etapa, i) => {
            const proxima = etapas[i + 1];
            if (!proxima) return null;
            const corProxima = ETAPA_META[proxima.etapa].iconColor;
            const centroY = i * (ROW_H + ROW_GAP) + ROW_H / 2;
            return (
              <div key={etapa.etapa}>
                <span
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold whitespace-nowrap"
                  style={{
                    top: centroY,
                    fontSize: 12,
                    borderRadius: 16,
                    padding: '4px 10px',
                    color: corProxima,
                    backgroundColor: `${corProxima}1a`,
                  }}
                >
                  {formatPct(proxima.taxaConversaoEtapaAnterior ?? 0, 1)}
                </span>
                <div
                  className="absolute left-1/2 border-l border-dashed"
                  style={{ top: centroY + BADGE_H / 2, height: ROW_H + ROW_GAP - BADGE_H, borderColor: '#374151' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
