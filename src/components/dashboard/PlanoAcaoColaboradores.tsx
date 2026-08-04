import { useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from 'react-router-dom';
import { formatCargo, formatNumero, formatPct, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import { estaDeFerias } from '@/lib/colaboradoresEmFerias';
import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

const STATUS_FILTROS: NivelStatus[] = ['critico', 'alerta', 'atencao', 'bom', 'excelente'];

/** Ação recomendada derivada diretamente do status real do colaborador (Taxa de
 * Protocolados) — nada de heurística à parte, pra bater com o que a StatusPill
 * mostra em qualquer outra tela. Dashboard vai pra diretoria: mensagem sempre
 * ancorada no número real, nunca genérica. */
function getAcaoDisplay(c: ColaboradorReal): { label: string; cor: string; texto: string } {
  const taxa = c.conversaoAssinadosProtocolados;
  switch (c.status) {
    case 'critico':
      return { label: 'Crítico', cor: STATUS_COLOR.critico, texto: `${formatPct(taxa, 0)} de protocolados — ação urgente.` };
    case 'alerta':
      return { label: 'Alerta', cor: STATUS_COLOR.alerta, texto: `${formatPct(taxa, 0)} de protocolados — acompanhar de perto.` };
    case 'atencao':
      return { label: 'Atenção', cor: STATUS_COLOR.atencao, texto: `${formatPct(taxa, 0)} de protocolados — no limite.` };
    case 'bom':
      return { label: 'Bom', cor: STATUS_COLOR.bom, texto: `${formatPct(taxa, 0)} de protocolados — dentro do esperado.` };
    case 'excelente':
      return { label: 'Excelente', cor: STATUS_COLOR.excelente, texto: `${formatPct(taxa, 0)} de protocolados — destaque.` };
  }
}

export function PlanoAcaoColaboradores({ colaboradores, diasUteisPeriodo }: { colaboradores: ColaboradorReal[]; diasUteisPeriodo: number }) {
  const [filtroStatus, setFiltroStatus] = useState<NivelStatus | null>(null);

  // Só quem realmente produz E ainda está ativo entra no plano de ação — ex-funcionário
  // não recebe plano de ação, mas os assinados dele continuam contando nos totais da empresa
  // (Visão Geral). Cargo é lista positiva (Discador/Discadora/Judit) em vez de excluir só
  // "supervisor", pra não deixar passar variante administrativa nenhuma.
  const cargosProducao = new Set(['discador', 'discadora', 'judit']);
  const comProducao = colaboradores.filter((c) => c.ativo && cargosProducao.has(c.cargo.trim().toLowerCase()) && !estaDeFerias(c.nome));

  const linhas = comProducao
    .filter((c) => !filtroStatus || c.status === filtroStatus)
    .sort((a, b) => a.conversaoAssinadosProtocolados - b.conversaoAssinadosProtocolados);

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-700">Plano de ação por colaborador</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroStatus(null)}
            className={clsx(
              'rounded-full px-3 py-1 text-[12px] font-medium border transition-colors',
              filtroStatus === null ? 'bg-blue-500/15 border-blue-500/40 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
            )}
          >
            Todos
          </button>
          {STATUS_FILTROS.map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={clsx(
                'rounded-full px-3 py-1 text-[12px] font-medium border transition-colors',
                filtroStatus !== status && 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              )}
              style={
                filtroStatus === status
                  ? { backgroundColor: `${STATUS_COLOR[status]}1a`, borderColor: `${STATUS_COLOR[status]}66`, color: STATUS_COLOR[status] }
                  : undefined
              }
            >
              {STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Colaborador</th>
              <th className="py-2 pr-4 font-medium">Equipe</th>
              <th className="py-2 pr-4 font-medium">Canal</th>
              <th className="py-2 pr-4 font-medium">Média/dia</th>
              <th className="py-2 pr-4 font-medium">Assinados</th>
              <th className="py-2 pr-4 font-medium">Protocolados</th>
              <th className="py-2 pr-4 font-medium">Conversão</th>
              <th className="py-2 pr-4 font-medium">Ação recomendada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-slate-500">Nenhum colaborador com esse status no período.</td>
              </tr>
            )}
            {linhas.map((c) => {
              const acao = getAcaoDisplay(c);
              return (
                <tr key={c.id} className="border-b border-slate-200/60 hover:bg-slate-50 align-top">
                  <td className="py-2.5 pr-4">
                    <Link to={`/colaboradores/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar nome={c.nome} size={26} />
                      <span className="text-slate-700 font-medium">{c.nome}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{c.time}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{formatCargo(c.cargo)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{(diasUteisPeriodo > 0 ? c.assinados / diasUteisPeriodo : 0).toFixed(1)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{formatNumero(c.assinados)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{formatNumero(c.protocolados)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{formatPct(c.conversaoGeral, 0)}</td>
                  <td className="py-2.5 pr-4 max-w-xs">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium mb-1"
                      style={{ backgroundColor: `${acao.cor}1a`, color: acao.cor }}
                    >
                      {acao.label}
                    </span>
                    <p className="text-[12px] text-slate-500">{acao.texto}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
