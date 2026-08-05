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

/** Versão compacta — só o essencial (quem, o quê, o número) pra bater o olho rápido. O detalhe
 * completo (possível motivo, sugestão de ação) fica no perfil do colaborador, não precisa
 * duplicar aqui; o card cheio deixava a coluna desproporcionalmente alta comparado ao resto
 * da tela. */
export function AlertCard({ alerta }: { alerta: AlertaInteligente }) {
  const cor = PRIORIDADE_COLOR[alerta.prioridade];
  const valorExibido = alerta.tipo === 'venda_ganha_baixa' ? `${formatNumero(alerta.taxa)} venda(s)` : formatPct(alerta.taxa);

  return (
    <Link
      to={`/colaboradores/${alerta.colaboradorId}#gargalos-colaborador`}
      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
        <AlertOctagon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: cor, backgroundColor: `${cor}1a` }}
          >
            {PRIORIDADE_LABEL[alerta.prioridade]}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{alerta.colaboradorNome}</span>
        </div>
        <p className="mt-0.5 text-[12.5px] text-slate-600 truncate">{TITULO_TIPO[alerta.tipo]} — {valorExibido}</p>
      </div>
    </Link>
  );
}
