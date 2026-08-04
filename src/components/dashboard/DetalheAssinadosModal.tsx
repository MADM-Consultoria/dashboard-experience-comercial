import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatNumero, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import type { NivelStatus } from '@/types/domain';

interface Props {
  titulo: string;
  colaboradores: ColaboradorReal[];
  atual: number;
  onFechar: () => void;
}

const CORES_TIME = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

/**
 * Modal: quem realmente assinou no período, ordenado por quem mais contribuiu — soma
 * dos "Assinados" da lista bate exatamente com o total do card que foi clicado. Todos os
 * gráficos (top contribuintes, distribuição por time, funil Recebidos→Assinados→Protocolados,
 * status da equipe e taxa de protocolados dos top contribuintes) vêm da mesma lista, sem
 * inventar nenhum dado que não esteja nela.
 */
export function DetalheAssinadosModal({ titulo, colaboradores, atual, onFechar }: Props) {
  const contribuiram = [...colaboradores].filter((c) => c.assinados > 0).sort((a, b) => b.assinados - a.assinados);

  const topContribuintes = contribuiram.slice(0, 8).map((c) => ({
    nome: c.nome.split(' ').slice(0, 2).join(' '),
    assinados: c.assinados,
  }));

  const porTime = Array.from(
    contribuiram.reduce((mapa, c) => {
      mapa.set(c.time, (mapa.get(c.time) ?? 0) + c.assinados);
      return mapa;
    }, new Map<string, number>()),
  )
    .map(([time, assinados]) => ({ time: time.replace('Equipe ', ''), assinados }))
    .sort((a, b) => b.assinados - a.assinados);

  // Funil real da mesma lista: soma de Recebidos/Assinados/Protocolados de quem contribuiu.
  const funil = [
    { etapa: 'Recebidos', valor: contribuiram.reduce((a, c) => a + c.recebidos, 0) },
    { etapa: 'Assinados', valor: atual },
    { etapa: 'Protocolados', valor: contribuiram.reduce((a, c) => a + c.protocolados, 0) },
  ];

  const ORDEM_STATUS: NivelStatus[] = ['excelente', 'bom', 'atencao', 'alerta', 'critico'];
  const porStatus = ORDEM_STATUS.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    quantidade: contribuiram.filter((c) => c.status === status).length,
  })).filter((s) => s.quantidade > 0);

  const conversaoTopContribuintes = contribuiram.slice(0, 8).map((c) => ({
    nome: c.nome.split(' ')[0],
    taxa: c.conversaoAssinadosProtocolados,
  }));

  // Portal direto pro <body>: o <main> do layout usa animate-fade-in (transform),
  // que cria um "containing block" pra position:fixed — sem o portal o modal fica
  // preso dentro da caixa do <main> em vez de cobrir a tela toda.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-10" onClick={onFechar}>
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <Card className="relative shadow-2xl modal-surface">
          <button
            onClick={onFechar}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>

          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
            <p className="text-sm text-slate-500">
              {formatNumero(atual)} assinado(s) — {contribuiram.length} colaborador(es) contribuíram
            </p>
          </div>

          {contribuiram.length === 0 ? (
            <p className="text-sm text-slate-500">Ninguém assinou nesse período.</p>
          ) : (
            <>
              <ul className="space-y-2 max-h-[35vh] overflow-y-auto pr-1 mb-4">
              {contribuiram.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
                  <Avatar nome={c.nome} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/colaboradores/${c.id}`} onClick={onFechar} className="text-sm font-semibold text-slate-900 hover:underline truncate block">
                      {c.nome}
                    </Link>
                    <p className="text-[12px] text-slate-500 truncate">{c.time}</p>
                  </div>
                  <StatusPill status={c.status} />
                  <span className="text-base font-bold text-slate-900 shrink-0 w-10 text-right">{formatNumero(c.assinados)}</span>
                </li>
              ))}
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-2">Top contribuintes</p>
                  <div className="space-y-2">
                    {topContribuintes.map((c) => {
                      const maiorValor = topContribuintes[0]?.assinados || 1;
                      const pct = Math.max(6, (c.assinados / maiorValor) * 100);
                      return (
                        <div key={c.nome} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-[11px] text-slate-500 truncate" title={c.nome}>{c.nome}</span>
                          <div className="flex-1 h-4 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 shrink-0 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-300">{formatNumero(c.assinados)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {porTime.length > 1 && (
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-2">Distribuição por time</p>
                    <ResponsiveContainer width="100%" height={Math.max(140, topContribuintes.length * 28)}>
                      <BarChart data={porTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Assinados']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="assinados" radius={[4, 4, 0, 0]} barSize={28}>
                          {porTime.map((_, indice) => (
                            <Cell key={indice} fill={CORES_TIME[indice % CORES_TIME.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-2">Funil: Recebidos → Assinados → Protocolados</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={funil} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                      <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Total']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={36}>
                        <Cell fill="#0ea5e9" />
                        <Cell fill="#2563eb" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <p className="text-[12px] font-medium text-slate-500 mb-2">Status da equipe</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={porStatus} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                      <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Colaboradores']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="quantidade" radius={[4, 4, 0, 0]} barSize={28}>
                        {porStatus.map((s) => (
                          <Cell key={s.status} fill={STATUS_COLOR[s.status]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[12px] font-medium text-slate-500 mb-2">Taxa de protocolados — top contribuintes</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={conversaoTopContribuintes} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} unit="%" />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}%`, 'Taxa de protocolados']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="taxa" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>,
    document.body,
  );
}
