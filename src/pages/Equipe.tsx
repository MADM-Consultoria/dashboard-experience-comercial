import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
  Search,
  Table as TableIcon,
  UserCheck,
  Users,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { KpiCard } from '@/components/kpi/KpiCard';
import { useIntelligence } from '@/lib/useIntelligence';
import { useAuth } from '@/context/AuthContext';
import { normalizarNome } from '@/lib/assinadosPeriodo';
import { fetchAssinadosDiarioPorTime, type AssinadosDiarioLinha } from '@/lib/assinadosDiarioPorTime';
import { formatCargo, formatNumero, formatPct, MEDALHA_COR, MEDALHA_ICON } from '@/lib/format';
import { ehSupervisor } from '@/lib/colaboradoresAtivos';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import clsx from 'clsx';

export default function Equipe() {
  const { supervisor } = useParams<{ supervisor: string }>();
  const { colaboradores, loading, periodoSelecionado } = useIntelligence();
  const [busca, setBusca] = useState('');

  if (loading) {
    return (
      <div>
        <PageHeader title="Equipe" description="Carregando dados do banco..." />
      </div>
    );
  }

  if (!supervisor) {
    return <ListaSupervisores colaboradores={colaboradores} labelPeriodo={periodoSelecionado.label} busca={busca} setBusca={setBusca} />;
  }

  return <ColaboradoresDoSupervisor supervisor={supervisor} colaboradores={colaboradores} labelPeriodo={periodoSelecionado.label} />;
}

function BuscaColaborador({ busca, setBusca }: { busca: string; setBusca: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 w-full sm:w-64">
      <Search size={15} className="text-slate-500 shrink-0" />
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar colaborador..."
        className="bg-transparent text-[13px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none w-full"
      />
    </div>
  );
}

const CORES_TIME = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

interface RankingSupervisor {
  nomeTime: string;
  supervisor: ColaboradorReal | null;
  quantidadeTime: number;
  protocolados: number;
  vendaGanha: number;
  pontuacao: number;
}

// 2º e 3º com a mesma altura de degrau, 1º mais alto — mesmo padrão visual do pódio da
// tela de Ranking (src/pages/Ranking.tsx), só que aqui ranqueando times/supervisores.
const PODIO_ESTILO = {
  1: { altura: 'h-28', cor: '#f59e0b', gradiente: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%)', ordem: 'order-2' },
  2: { altura: 'h-20', cor: '#94a3b8', gradiente: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)', ordem: 'order-1' },
  3: { altura: 'h-20', cor: '#c2703d', gradiente: 'linear-gradient(180deg, #fed7aa 0%, #ea9a5f 100%)', ordem: 'order-3' },
} as const;

const MEDALHA_POR_POSICAO = ['ouro', 'prata', 'bronze'] as const;

function CardPodioTime({ item, posicao }: { item: RankingSupervisor; posicao: 1 | 2 | 3 }) {
  const estilo = PODIO_ESTILO[posicao];
  const medalha = MEDALHA_POR_POSICAO[posicao - 1];
  const IconeMedalha = MEDALHA_ICON[medalha];

  return (
    <div className={clsx('flex flex-col items-center', estilo.ordem)}>
      <Link to={`/equipe/${encodeURIComponent(item.nomeTime)}`} className="flex flex-col items-center group w-28 md:w-36">
        {item.supervisor ? (
          <Avatar nome={item.supervisor.nome} size={posicao === 1 ? 52 : 42} />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-blue-500/15 text-blue-600"
            style={{ width: posicao === 1 ? 52 : 42, height: posicao === 1 ? 52 : 42 }}
          >
            <Users size={posicao === 1 ? 22 : 18} />
          </div>
        )}
        <span className="mt-2 text-[13px] font-semibold text-slate-800 text-center group-hover:underline truncate max-w-full">
          {item.supervisor ? item.supervisor.nome : item.nomeTime}
        </span>
        <span className="text-[11px] text-slate-500 truncate max-w-full">
          {item.supervisor ? item.nomeTime : 'Sem supervisor(a)'}
        </span>
        <span className="text-sm font-bold mt-1" style={{ color: estilo.cor }}>
          {formatNumero(item.pontuacao)} pts
        </span>
        <span className="text-[11px] text-slate-500 mt-0.5">
          {formatNumero(item.protocolados)} protoc. · {formatNumero(item.vendaGanha)} venda
        </span>
      </Link>
      <div
        className={clsx('w-24 md:w-28 mt-3 rounded-t-lg flex flex-col items-center justify-start pt-3 gap-1.5 shadow-lg', estilo.altura)}
        style={{ borderTop: `3px solid ${estilo.cor}`, background: estilo.gradiente, boxShadow: `0 8px 20px -6px ${estilo.cor}66` }}
      >
        <span className="text-2xl font-bold leading-none" style={{ color: estilo.cor }}>{posicao}º</span>
        <IconeMedalha size={22} style={{ color: MEDALHA_COR[medalha] }} />
      </div>
    </div>
  );
}

function ultimos30Dias(): { inicio: string; fim: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hoje = new Date();
  const fim = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const inicioDate = new Date(hoje);
  inicioDate.setDate(inicioDate.getDate() - 29);
  const inicio = `${inicioDate.getFullYear()}-${pad(inicioDate.getMonth() + 1)}-${pad(inicioDate.getDate())}`;
  return { inicio, fim };
}

function listaDeDias(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(inicio);
  const fimData = new Date(fim);
  while (cursor <= fimData) {
    const pad = (n: number) => String(n).padStart(2, '0');
    dias.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

type OrdenarPor = 'desempenho' | 'recebidos' | 'assinados' | 'protocolados';

function ListaSupervisores({
  colaboradores,
  labelPeriodo,
  busca,
  setBusca,
}: {
  colaboradores: ColaboradorReal[];
  labelPeriodo: string;
  busca: string;
  setBusca: (v: string) => void;
}) {
  const { sessao } = useAuth();
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('desempenho');
  const [diario, setDiario] = useState<AssinadosDiarioLinha[]>([]);

  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    const { inicio, fim } = ultimos30Dias();
    fetchAssinadosDiarioPorTime(sessao.token, inicio, fim)
      .then((linhas) => {
        if (!cancelado) setDiario(linhas);
      })
      .catch(() => {
        if (!cancelado) setDiario([]);
      });
    return () => {
      cancelado = true;
    };
  }, [sessao]);

  // Times/cards de Equipe mostram só quem está ativo hoje — ex-funcionário
  // continua contando pros totais da empresa (Visão Geral), mas não aparece
  // aqui como se ainda estivesse na operação.
  const ativos = colaboradores.filter((c) => c.ativo);
  const colaboradoresAtivos = ativos.filter((c) => !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor'));
  const supervisores = ativos.filter((c) => ehSupervisor(c.nome) || c.cargo.toLowerCase().includes('supervisor'));

  const buscaNormalizada = normalizarNome(busca.trim());
  const resultadosBusca = buscaNormalizada
    ? colaboradoresAtivos.filter((c) => normalizarNome(c.nome).includes(buscaNormalizada))
    : null;

  const times = Array.from(new Set(ativos.map((c) => c.time))).sort();

  const { inicio: inicio30, fim: fim30 } = ultimos30Dias();
  const dias30 = useMemo(() => listaDeDias(inicio30, fim30), [inicio30, fim30]);

  const diarioPorTime = useMemo(() => {
    const mapa = new Map<string, Map<string, number>>();
    for (const linha of diario) {
      if (!mapa.has(linha.time)) mapa.set(linha.time, new Map());
      mapa.get(linha.time)!.set(linha.dia, linha.total);
    }
    return mapa;
  }, [diario]);

  const dadosPorTime = times.map((nome, indice) => {
    const time = ativos.filter((c) => c.time === nome && !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor'));
    const recebidos = time.reduce((a, c) => a + c.recebidos, 0);
    const assinados = time.reduce((a, c) => a + c.assinados, 0);
    const protocolados = time.reduce((a, c) => a + c.protocolados, 0);
    const vendaGanha = time.reduce((a, c) => a + c.vendaGanha, 0);
    const taxaConversao = assinados ? (protocolados / assinados) * 100 : 0;
    const serieDiaria = dias30.map((dia) => diarioPorTime.get(nome)?.get(dia) ?? 0);
    return { nome, pessoas: time.length, recebidos, assinados, protocolados, vendaGanha, taxaConversao, serieDiaria, cor: CORES_TIME[indice % CORES_TIME.length] };
  });

  const ordenados = [...dadosPorTime].sort((a, b) => {
    if (ordenarPor === 'desempenho') return b.taxaConversao - a.taxaConversao;
    if (ordenarPor === 'recebidos') return b.recebidos - a.recebidos;
    if (ordenarPor === 'assinados') return b.assinados - a.assinados;
    return b.protocolados - a.protocolados;
  });

  // Gráfico de evolução: um ponto por dia, uma linha por time.
  const dadosEvolucao = dias30.map((dia) => {
    const ponto: Record<string, string | number> = { dia: dia.slice(5) };
    for (const nome of times) ponto[nome] = diarioPorTime.get(nome)?.get(dia) ?? 0;
    return ponto;
  });

  // "Teia": compara a taxa de conversão de cada time num único eixo por time.
  const dadosRadar = dadosPorTime.map((t) => ({ time: t.nome.replace('Equipe ', ''), taxa: t.taxaConversao }));

  const rankingSupervisores: RankingSupervisor[] = times
    .map((nomeTime) => {
      const time = dadosPorTime.find((t) => t.nome === nomeTime);
      const supervisor = supervisores.find((s) => s.time === nomeTime) ?? null;
      const quantidadeTime = colaboradoresAtivos.filter((c) => c.time === nomeTime).length;
      const pontuacao = (time?.protocolados ?? 0) + (time?.vendaGanha ?? 0);
      return { nomeTime, supervisor, quantidadeTime, protocolados: time?.protocolados ?? 0, vendaGanha: time?.vendaGanha ?? 0, pontuacao };
    })
    .sort((a, b) => b.pontuacao - a.pontuacao);
  const podioSupervisores = rankingSupervisores.slice(0, 3);
  const restoSupervisores = rankingSupervisores.slice(3);

  return (
    <div>
      <PageHeader
        title="Equipe"
        description={`Selecione um supervisor para ver os colaboradores do time. Assinados de ${labelPeriodo}.`}
        actions={<BuscaColaborador busca={busca} setBusca={setBusca} />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard titulo="Colaboradores ativos" valor={`${colaboradoresAtivos.length}`} icon={UserCheck} accent="brand" />
      </div>

      {resultadosBusca ? (
        resultadosBusca.length === 0 ? (
          <p className="text-slate-500">Nenhum colaborador encontrado para "{busca}".</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {resultadosBusca.map((c) => (
              <ColaboradorCard key={c.id} c={c} />
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Desempenho por Equipe</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setVisualizacao('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium ${visualizacao === 'cards' ? 'bg-blue-500/15 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <LayoutGrid size={13} /> Cards
                </button>
                <button
                  onClick={() => setVisualizacao('tabela')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border-l border-slate-200 ${visualizacao === 'tabela' ? 'bg-blue-500/15 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <TableIcon size={13} /> Tabela
                </button>
              </div>
              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as OrdenarPor)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-600 outline-none"
              >
                <option value="desempenho">Ordenar por: Desempenho</option>
                <option value="recebidos">Ordenar por: Recebidos</option>
                <option value="assinados">Ordenar por: Assinados</option>
                <option value="protocolados">Ordenar por: Protocolados</option>
              </select>
            </div>
          </div>

          {visualizacao === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {ordenados.map((t) => (
                <Link key={t.nome} to={`/equipe/${encodeURIComponent(t.nome)}`}>
                  <Card className="h-full transition-all duration-200 hover:border-blue-500/40 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(37,99,235,0.35)] group">
                    <div className="flex flex-col items-center text-center pt-1 mb-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 shrink-0">
                        <Users size={16} />
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-2">{t.nome}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{t.pessoas} colaborador(es)</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <p className="text-[11px] text-slate-500">Recebidos</p>
                        <p className="text-sm font-semibold text-slate-700">{formatNumero(t.recebidos)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Assinados</p>
                        <p className="text-sm font-semibold text-slate-700">{formatNumero(t.assinados)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Protocolados</p>
                        <p className="text-sm font-semibold text-slate-700">{formatNumero(t.protocolados)}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>Taxa de conversão</span>
                        <span className="font-semibold text-slate-700">{formatPct(t.taxaConversao, 1)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, t.taxaConversao)}%`, backgroundColor: t.cor }} />
                      </div>
                    </div>

                    <div className="h-10 -mx-1 mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={t.serieDiaria.map((v, i) => ({ i, v }))}>
                          <Line type="monotone" dataKey="v" stroke={t.cor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <span className="text-[12px] font-medium text-blue-600 group-hover:underline inline-flex items-center gap-1">
                      Ver detalhes da equipe <ArrowRight size={12} />
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-4 font-medium w-10">#</th>
                      <th className="py-2 pr-4 font-medium">Equipe</th>
                      <th className="py-2 pr-4 font-medium">Recebidos</th>
                      <th className="py-2 pr-4 font-medium">Assinados</th>
                      <th className="py-2 pr-4 font-medium">Protocolados</th>
                      <th className="py-2 pr-4 font-medium">Taxa de conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordenados.map((t, indice) => (
                      <tr key={t.nome} className="border-b border-slate-200/60 hover:bg-slate-50">
                        <td className="py-2.5 pr-4 text-slate-500 font-semibold">{indice + 1}º</td>
                        <td className="py-2.5 pr-4">
                          <Link to={`/equipe/${encodeURIComponent(t.nome)}`} className="font-medium text-slate-800 hover:underline">
                            {t.nome}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{formatNumero(t.recebidos)}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{formatNumero(t.assinados)}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{formatNumero(t.protocolados)}</td>
                        <td className="py-2.5 pr-4 text-slate-700 font-semibold">{formatPct(t.taxaConversao, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Evolução das Equipes <span className="font-normal text-slate-400">· últimos 30 dias</span></h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosEvolucao} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} />
                  {times.map((nome, indice) => (
                    <Line key={nome} type="monotone" dataKey={nome} name={nome} stroke={CORES_TIME[indice % CORES_TIME.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Distribuição dos Resultados <span className="font-normal text-slate-400">· taxa de conversão</span></h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={dadosRadar} outerRadius={75}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Radar name="Taxa de conversão" dataKey="taxa" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                  <Tooltip formatter={(v) => [formatPct(Number(v), 1), 'Taxa de conversão']} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Ranking de Supervisores <span className="font-normal text-slate-400">· Protocolados + Venda Ganha do time</span></h3>
            {rankingSupervisores.length === 0 ? (
              <Card><p className="text-sm text-slate-500">Nenhum time cadastrado.</p></Card>
            ) : (
              <>
                {podioSupervisores.length === 3 && (
                  <Card className="mb-4">
                    <div className="flex items-end justify-center gap-8 md:gap-16">
                      {podioSupervisores.map((item, indice) => (
                        <CardPodioTime key={item.nomeTime} item={item} posicao={(indice + 1) as 1 | 2 | 3} />
                      ))}
                    </div>
                  </Card>
                )}

                {restoSupervisores.length > 0 && (
                  <Card>
                    <ul className="divide-y divide-slate-100">
                      {restoSupervisores.map((item, indice) => (
                        <li key={item.nomeTime} className="flex items-center gap-3 py-2.5">
                          <span className="w-6 shrink-0 text-sm font-semibold text-slate-500 text-center">{indice + 4}º</span>
                          {item.supervisor ? (
                            <Avatar nome={item.supervisor.nome} size={32} />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600">
                              <Users size={15} />
                            </div>
                          )}
                          <Link to={`/equipe/${encodeURIComponent(item.nomeTime)}`} className="min-w-0 flex-1 hover:underline">
                            <p className="text-[13px] font-medium text-slate-800 truncate">
                              {item.supervisor ? item.supervisor.nome : item.nomeTime}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {item.supervisor ? item.nomeTime : 'Sem supervisor(a)'}
                            </p>
                          </Link>
                          <span className="text-[12px] text-slate-500 shrink-0">{formatNumero(item.protocolados)} protoc.</span>
                          <span className="text-[12px] text-slate-500 shrink-0">{formatNumero(item.vendaGanha)} venda</span>
                          <span className="text-sm font-bold text-blue-600 shrink-0 w-16 text-right">{formatNumero(item.pontuacao)} pts</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ColaboradorCard({ c }: { c: ColaboradorReal }) {
  return (
    <Link to={`/colaboradores/${c.id}`}>
      <Card className="h-full transition-all duration-200 hover:border-blue-500/40 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(37,99,235,0.35)] group">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar nome={c.nome} size={40} />
            <div>
              <p className="text-sm font-semibold text-slate-900">{c.nome}</p>
              <p className="text-[12px] text-slate-500">{formatCargo(c.cargo)} · {c.time}</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
          <div>
            <p className="text-[11px] text-slate-500 whitespace-nowrap">Recebidos</p>
            <p className="text-sm font-semibold text-slate-700">{formatNumero(c.recebidos)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 whitespace-nowrap">Assinados</p>
            <p className="text-sm font-semibold text-slate-700">{formatNumero(c.assinados)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 whitespace-nowrap">Protocolados</p>
            <p className="text-sm font-semibold text-slate-700">{formatNumero(c.protocolados)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 whitespace-nowrap">Venda Ganha</p>
            <p className="text-sm font-semibold text-slate-700">{formatNumero(c.vendaGanha)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500">Taxa de Assinados</p>
            <p className="text-base font-semibold text-slate-900">{formatPct(c.conversaoRecebidosAssinados)}</p>
          </div>
          <StatusPill status={c.status} />
        </div>
      </Card>
    </Link>
  );
}

function ColaboradoresDoSupervisor({
  supervisor,
  colaboradores,
  labelPeriodo,
}: {
  supervisor: string;
  colaboradores: ColaboradorReal[];
  labelPeriodo: string;
}) {
  const doTime = colaboradores.filter((c) => c.ativo && c.time === supervisor && !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor'));

  return (
    <div>
      <Link to="/equipe" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 w-fit">
        <ArrowLeft size={15} /> Voltar para equipes
      </Link>

      <PageHeader title={supervisor} description={`Performance individual de cada consultor do time. Assinados de ${labelPeriodo}.`} />

      {doTime.length === 0 ? (
        <p className="text-slate-500">Nenhum colaborador encontrado para este supervisor.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {doTime.map((c) => (
            <ColaboradorCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
