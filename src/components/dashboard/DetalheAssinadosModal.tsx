import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
  meta: number;
  onFechar: () => void;
}

const CORES_TIME = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

/** Meio círculo: assinados até agora em cima, % da meta embaixo — mesmo dado que já aparece
 * no resumo do topo (card "Geral/Judit · Assinados"), só que como progresso visual em vez de
 * texto, pra bater o olho rápido no meio dos outros gráficos do modal. */
function GaugeProgressoMeta({ atual, meta }: { atual: number; meta: number }) {
  const progresso = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  const dados = [{ value: progresso, fill: '#22c55e' }];

  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={140}>
        <RadialBarChart data={dados} startAngle={180} endAngle={0} innerRadius="75%" outerRadius="100%" barSize={14}>
          {/* Sem isso, o Recharts calcula a escala do arco com base no próprio valor plotado
             (domínio automático) — um valor de 10 sempre preenche 100% do arco dele mesmo,
             não 10% de uma escala fixa. Precisa fixar o domínio em [0, 100] pra o preenchimento
             realmente refletir a porcentagem. */}
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#e2e8f0' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-[58%] flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900">{formatNumero(atual)}</span>
        <span className="text-[11px] text-slate-500">{meta > 0 ? `${progresso.toFixed(0)}% da meta (${formatNumero(meta)})` : 'sem meta cadastrada'}</span>
      </div>
    </div>
  );
}

/**
 * Modal: quem realmente assinou no período, ordenado por quem mais contribuiu — soma
 * dos "Assinados" da lista bate exatamente com o total do card que foi clicado. Todos os
 * gráficos (progresso vs. meta, distribuição por time, funil Recebidos→Assinados→Protocolados,
 * status da equipe e taxa de protocolados dos top contribuintes) vêm da mesma lista, sem
 * inventar nenhum dado que não esteja nela.
 */
export function DetalheAssinadosModal({ titulo, colaboradores, atual, meta, onFechar }: Props) {
  const contribuiram = [...colaboradores].filter((c) => c.assinados > 0).sort((a, b) => b.assinados - a.assinados);

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
    taxa: c.conversaoRecebidosAssinados,
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
                  <p className="text-[12px] font-medium text-slate-500 mb-2">Progresso do mês</p>
                  <GaugeProgressoMeta atual={atual} meta={meta} />
                </div>

                {porTime.length > 1 && (
                  <div>
                    <p className="text-[12px] font-medium text-slate-500 mb-2">Distribuição por time</p>
                    <ResponsiveContainer width="100%" height={Math.max(140, porTime.length * 28)}>
                      <BarChart data={porTime} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                        <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Assinados']} contentStyle={{ fontSize: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} labelStyle={{ color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
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
                      <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Total']} contentStyle={{ fontSize: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} labelStyle={{ color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
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
                      <Tooltip formatter={(v) => [formatNumero(Number(v)), 'Colaboradores']} contentStyle={{ fontSize: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} labelStyle={{ color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
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
                <p className="text-[12px] font-medium text-slate-500 mb-2">Taxa de assinados — top contribuintes</p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={conversaoTopContribuintes} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} unit="%" />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}%`, 'Taxa de assinados']} contentStyle={{ fontSize: 12, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#1e293b' }} labelStyle={{ color: '#1e293b' }} itemStyle={{ color: '#1e293b' }} />
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
