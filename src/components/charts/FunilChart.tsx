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

const ETAPA_META: Record<EtapaFunil['etapa'], EtapaMeta> = {
  Recebidos: {
    icon: Users,
    sublabel: 'Total de leads recebidos',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #4F46E5 100%)',
    iconBg: 'rgba(59, 130, 246, 0.16)',
    iconColor: '#3B82F6',
  },
  Assinados: {
    icon: CheckCircle2,
    sublabel: 'Leads que assinaram',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    iconBg: 'rgba(16, 185, 129, 0.16)',
    iconColor: '#10B981',
  },
  Protocolados: {
    icon: FileText,
    sublabel: 'Leads protocolados',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    iconBg: 'rgba(132, 204, 22, 0.16)',
    iconColor: '#84CC16',
  },
  'Venda Ganha': {
    icon: Trophy,
    sublabel: 'Processos com venda ganha',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    iconBg: 'rgba(245, 158, 11, 0.16)',
    iconColor: '#F59E0B',
  },
};

const ROW_H = 88;
const ROW_GAP = 12;
const BAR_H = 56;

// Larguras fixas por etapa (não proporcionais ao valor real) — decisão visual pra sempre
// desenhar o mesmo afunilamento, independente de quão perto os números estejam uns dos outros.
const LARGURA_ETAPA: Record<EtapaFunil['etapa'], number> = {
  Recebidos: 96,
  Assinados: 72,
  'Venda Ganha': 50,
  Protocolados: 32,
};

interface FunilChartProps {
  etapas: EtapaFunil[];
  /** Assinados ÷ Recebidos do período. */
  conversaoGeral: number;
  /** Assinados ÷ Recebidos, só do canal Judit. */
  conversaoJudit: number;
  /** Protocolados ÷ Assinados do período. */
  conversaoProtocolados: number;
}

export function FunilChart({ etapas, conversaoGeral, conversaoJudit, conversaoProtocolados }: FunilChartProps) {
  const alturaTotal = etapas.length * ROW_H + (etapas.length - 1) * ROW_GAP;
  const taxas = [
    { label: 'Conversão Geral', valor: conversaoGeral, cor: '#3B82F6' },
    { label: 'Conversão Judit', valor: conversaoJudit, cor: '#F59E0B' },
    { label: 'Conversão Protocolados', valor: conversaoProtocolados, cor: '#84CC16' },
  ];
  // Distribui as 3 taxas espaçadas uniformemente ao longo da mesma altura da pilha de etapas.
  const espacamento = alturaTotal / (taxas.length + 1);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-5">
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
        {/* Cards das etapas — ícone/nome à esquerda, trapézio à direita, tudo dentro do mesmo card */}
        <div className="flex flex-col flex-1 min-w-0" style={{ gap: ROW_GAP }}>
          {etapas.map((etapa) => {
            const meta = ETAPA_META[etapa.etapa];
            const Icon = meta.icon;
            const largura = LARGURA_ETAPA[etapa.etapa];
            return (
              <div
                key={etapa.etapa}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60"
                style={{ height: ROW_H, padding: '16px 20px' }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.iconBg, color: meta.iconColor }}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 shrink-0" style={{ width: 96 }}>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate" style={{ fontSize: 16, lineHeight: 1.2 }}>{etapa.etapa}</p>
                  <p className="truncate text-slate-500" style={{ fontSize: 12 }}>{meta.sublabel}</p>
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-center">
                  <div
                    className="flex items-center justify-center text-white transition-[width] duration-500"
                    style={{
                      width: `${largura}%`,
                      height: BAR_H,
                      background: meta.gradient,
                      clipPath: 'polygon(6% 0, 94% 0, 84% 100%, 16% 100%)',
                    }}
                  >
                    <span className="font-bold leading-tight" style={{ fontSize: 24 }}>{formatNumero(etapa.valor)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 taxas de conversão gerais do período — não são mais por etapa do funil. Nome só
           aparece no tooltip ao passar o cursor; visualmente é uma linha do tempo (pílulas
           ligadas por um traço pontilhado), igual ao que já existia antes por etapa. */}
        <div className="relative shrink-0" style={{ width: 90, height: alturaTotal }}>
          <p className="absolute text-center w-full text-slate-500" style={{ top: -20, fontSize: 11 }}>Taxa de conversão</p>
          <div
            className="absolute left-1/2 border-l border-dashed border-slate-300 dark:border-slate-600"
            style={{ top: espacamento, height: espacamento * (taxas.length - 1) }}
          />
          {taxas.map((t, i) => (
            <div
              key={t.label}
              className="group absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ top: espacamento * (i + 1) }}
            >
              <span
                className="block font-semibold whitespace-nowrap cursor-default"
                style={{ fontSize: 12, borderRadius: 16, padding: '4px 10px', color: t.cor, backgroundColor: `${t.cor}26` }}
              >
                {formatPct(t.valor, 1)}
              </span>
              <span className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 dark:bg-slate-700 px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
