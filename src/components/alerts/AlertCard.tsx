import { Link } from 'react-router-dom';
import type { AlertaInteligente } from '@/types/domain';
import { PRIORIDADE_COLOR, PRIORIDADE_LABEL, formatNumero, formatPct } from '@/lib/format';
import { AlertOctagon } from 'lucide-react';

const TITULO_TIPO: Record<AlertaInteligente['tipo'], string> = {
  taxa_protocolados_baixa: 'Taxa de Protocolados abaixo do esperado',
  meta_comprometida: 'Meta do período comprometida',
  queda_produtividade: 'Queda de produtividade',
  baixa_conversao_inicial: 'Baixa conversão inicial',
  venda_ganha_baixa: 'Venda Ganha abaixo do esperado no mês',
};

export function AlertCard({ alerta }: { alerta: AlertaInteligente }) {
  const cor = PRIORIDADE_COLOR[alerta.prioridade];
  const valorExibido = alerta.tipo === 'venda_ganha_baixa' ? `${formatNumero(alerta.taxa)} venda(s)` : formatPct(alerta.taxa);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
            <AlertOctagon size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: cor, backgroundColor: `${cor}1a` }}
              >
                Alerta {PRIORIDADE_LABEL[alerta.prioridade]}
              </span>
              <Link to={`/colaboradores/${alerta.colaboradorId}`} className="text-sm font-semibold text-slate-900 hover:underline">
                {alerta.colaboradorNome}
              </Link>
            </div>
            <p className="mt-1 text-[13px] text-slate-600">{TITULO_TIPO[alerta.tipo]} — {valorExibido}</p>
            <p className="mt-1 text-[13px] text-slate-500">{alerta.impacto}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 pl-12">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Possível motivo</p>
          <ul className="space-y-1">
            {alerta.possiveisMotivos.map((m, i) => (
              <li key={i} className="text-[12.5px] text-slate-500 flex gap-1.5">
                <span className="text-slate-400">•</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Sugestão de ação</p>
          <ul className="space-y-1">
            {alerta.sugestoesAcao.map((s, i) => (
              <li key={i} className="text-[12.5px] text-slate-500 flex gap-1.5">
                <span className="text-slate-400">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
