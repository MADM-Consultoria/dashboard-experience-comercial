import type { ColaboradorMetricas } from '@/types/domain';
import { STATUS_COLOR } from '@/lib/format';

/** Atingimento de meta do período, colaborador a colaborador — mostra quem já
 * bateu (ou está perto de bater) a meta e quem está ficando para trás, o que
 * o ranking de produtividade sozinho não deixa claro (produtividade alta não
 * garante meta batida se a meta individual for maior). */
export function MetaAtingimentoChart({ colaboradores, limite = 6 }: { colaboradores: ColaboradorMetricas[]; limite?: number }) {
  const top = [...colaboradores].sort((a, b) => b.atingimentoMetaMensal - a.atingimentoMetaMensal).slice(0, limite);

  return (
    <div className="space-y-3">
      {top.map((c) => {
        const pct = Math.min(100, c.atingimentoMetaMensal);
        return (
          <div key={c.id}>
            <div className="flex items-center justify-between mb-1 text-[12px]">
              <span className="text-slate-600 truncate">{c.nome}</span>
              <span className="font-semibold text-slate-900">{c.atingimentoMetaMensal.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[c.status] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RankingProdutividadeLollipop({ colaboradores, limite = 6 }: { colaboradores: ColaboradorMetricas[]; limite?: number }) {
  const top = [...colaboradores].sort((a, b) => b.produtividade - a.produtividade).slice(0, limite);
  const max = Math.max(1, ...top.map((c) => c.produtividade));

  return (
    <div className="space-y-3.5">
      {top.map((c) => {
        const pct = Math.min(100, (c.produtividade / max) * 100);
        return (
          <div key={c.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[12px] text-slate-600">{c.nome.split(' ')[0]} {c.nome.split(' ')[1]?.[0]}.</span>
            <div className="relative flex-1 h-px bg-slate-200">
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-semibold text-white"
                style={{
                  left: `calc(${pct}% - 12px)`,
                  width: 24,
                  height: 24,
                  backgroundColor: STATUS_COLOR[c.status],
                }}
              >
                {c.produtividade.toFixed(1)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Taxa de fechamento (Protocolados + Venda Ganha sobre Assinados) por colaborador — o
 * indicador de qualidade que define o status de cada um (ver src/lib/aplicarAssinadosPeriodo.ts).
 * Protocolados (jurídico) e Venda Ganha (outros advogados) contam igual, são o mesmo tipo de
 * desfecho por equipes diferentes. Complementa o ranking de produtividade (volume) mostrando
 * quem converte bem o que assina, não só quem produz mais. */
export function TaxaProtocoladosChart({ colaboradores, limite = 5 }: { colaboradores: ColaboradorMetricas[]; limite?: number }) {
  const top = [...colaboradores].sort((a, b) => b.conversaoAssinadosProtocolados - a.conversaoAssinadosProtocolados).slice(0, limite);

  return (
    <div className="space-y-2">
      {top.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-white" style={{ backgroundColor: STATUS_COLOR[c.status] }}>
          <span className="text-[13px] font-medium truncate">{c.nome.split(' ')[0]}</span>
          <span className="text-[13px] font-semibold">{c.conversaoAssinadosProtocolados.toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}
