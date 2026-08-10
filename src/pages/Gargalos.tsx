import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard } from '@/components/kpi/KpiCard';
import { useIntelligence } from '@/lib/useIntelligence';
import { formatNumero, formatPct, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { Gargalo } from '@/types/domain';
import { Activity, AlertTriangle, ArrowRight, ArrowUpDown, ChevronDown, GitMerge, ListTree, Sparkles, TrendingDown, Users } from 'lucide-react';

const TIPO_LABEL: Record<Gargalo['tipo'], string> = {
  etapa_funil: 'Etapa do funil',
  colaborador: 'Colaborador',
  processo: 'Processo',
};

const TIPO_IMPACTO_LABEL: Record<Gargalo['tipo'], string> = {
  etapa_funil: 'Impacto no funil',
  colaborador: 'Impacto individual',
  processo: 'Impacto na equipe',
};

const TIPO_ICON: Record<Gargalo['tipo'], typeof GitMerge> = {
  etapa_funil: GitMerge,
  colaborador: Users,
  processo: ListTree,
};

const TIPOS: Array<Gargalo['tipo']> = ['etapa_funil', 'colaborador', 'processo'];

type Ordenacao = 'perda' | 'impacto';

const ORDENACAO_LABEL: Record<Ordenacao, string> = {
  perda: 'Maior perda estimada',
  impacto: 'Maior impacto',
};

export default function Gargalos() {
  const { gargalos } = useIntelligence();
  const [filtroTipo, setFiltroTipo] = useState<Gargalo['tipo'] | null>(null);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('perda');
  const [menuOrdenacaoAberto, setMenuOrdenacaoAberto] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  const filtrados = useMemo(() => {
    const lista = gargalos.filter((g) => !filtroTipo || g.tipo === filtroTipo);
    // detectarGargalos já devolve ordenado por perda — só reordena de verdade quando o
    // critério escolhido é outro (perda continua sendo a ordem "natural" dos dados).
    if (ordenacao === 'impacto') return [...lista].sort((a, b) => b.impactoPct - a.impactoPct);
    return lista;
  }, [gargalos, filtroTipo, ordenacao]);

  const perdaTotal = gargalos.reduce((a, g) => a + g.perdaEstimada, 0);
  const criticos = gargalos.filter((g) => g.severidade === 'critico').length;
  const emAlerta = gargalos.filter((g) => g.severidade === 'alerta').length;

  return (
    <div>
      <PageHeader title="Gargalos" description="Onde a empresa está perdendo processos — e o que fazer a respeito." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard titulo="Gargalos identificados" valor={formatNumero(gargalos.length)} icon={AlertTriangle} accent={gargalos.length ? 'warning' : 'success'} />
        <KpiCard titulo="Processos represados" valor={formatNumero(perdaTotal)} icon={TrendingDown} accent="danger" subtitulo="soma da perda estimada" />
        <KpiCard titulo="Críticos" valor={formatNumero(criticos)} icon={AlertTriangle} accent={criticos ? 'danger' : 'success'} subtitulo={emAlerta > 0 ? `+ ${emAlerta} em alerta` : undefined} />
        <KpiCard titulo="Por colaborador" valor={formatNumero(gargalos.filter((g) => g.tipo === 'colaborador').length)} icon={Users} accent="info" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroTipo(null)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors',
              filtroTipo === null ? 'bg-blue-500/15 border-blue-500/40 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
            )}
          >
            Todos ({gargalos.length})
          </button>
          {TIPOS.map((tipo) => {
            const Icon = TIPO_ICON[tipo];
            const count = gargalos.filter((g) => g.tipo === tipo).length;
            if (count === 0) return null;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors',
                  filtroTipo === tipo ? 'bg-blue-500/15 border-blue-500/40 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                )}
              >
                <Icon size={13} /> {TIPO_LABEL[tipo]} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOrdenacaoAberto((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowUpDown size={13} className="text-slate-400" />
            Ordenar por <span className="font-medium text-slate-800">{ORDENACAO_LABEL[ordenacao]}</span>
            <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', menuOrdenacaoAberto && 'rotate-180')} />
          </button>
          {menuOrdenacaoAberto && (
            <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 animate-fade-in">
              {(Object.keys(ORDENACAO_LABEL) as Ordenacao[]).map((opcao) => (
                <button
                  key={opcao}
                  onClick={() => {
                    setOrdenacao(opcao);
                    setMenuOrdenacaoAberto(false);
                  }}
                  className={clsx(
                    'block w-full text-left px-3.5 py-2 text-[13px] transition-colors',
                    ordenacao === opcao ? 'text-blue-700 font-medium bg-blue-500/10' : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {ORDENACAO_LABEL[opcao]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtrados.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum gargalo relevante identificado com esse filtro.</p>
        </Card>
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtrados.map((g) => {
            const cor = STATUS_COLOR[g.severidade];
            const aberto = expandidos.has(g.id);
            const TipoIcon = TIPO_ICON[g.tipo];
            const bandaBoa = g.severidade === 'excelente' || g.severidade === 'bom';

            return (
              <div key={g.id}>
                <button onClick={() => toggle(g.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
                    {bandaBoa ? <TrendingDown size={18} className="rotate-180" /> : <AlertTriangle size={18} />}
                  </div>

                  <div className="min-w-0 flex-1 xl:flex-none xl:w-[340px]">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: cor, backgroundColor: `${cor}1a` }}>
                        {STATUS_LABEL[g.severidade]}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <TipoIcon size={11} /> {TIPO_LABEL[g.tipo]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{g.titulo}</h3>
                    <p className="text-[12px] text-slate-500 truncate">{g.descricao}</p>
                  </div>

                  <div className="hidden md:flex items-center shrink-0">
                    {g.tipo === 'colaborador' && g.colaboradorId ? (
                      <Avatar nome={g.titulo} size={30} />
                    ) : (
                      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <TipoIcon size={14} />
                      </div>
                    )}
                  </div>

                  <div className="hidden lg:block w-40 shrink-0">
                    <p className="text-[11px] text-slate-500 mb-1">{TIPO_IMPACTO_LABEL[g.tipo]}</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, g.impactoPct))}%`, backgroundColor: cor }} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 w-9 text-right">{formatPct(g.impactoPct, 0)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 w-24">
                    <p className="text-[11px] text-slate-500">Perda estimada</p>
                    <p className="text-sm font-semibold text-slate-900">{formatNumero(g.perdaEstimada)} proc.</p>
                  </div>

                  <ChevronDown size={18} className={clsx('shrink-0 text-slate-400 transition-transform', aberto && 'rotate-180')} />
                </button>

                {aberto && (
                  <div className="px-4 pb-4 pl-[68px] pt-1 animate-fade-in">
                    <p className="text-[12px] text-slate-500 mb-3">Impacto: {g.impactoEstimado}</p>
                    {g.colaboradorId && (
                      <Link to={`/colaboradores/${g.colaboradorId}`} className="mb-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        ver colaborador <ArrowRight size={12} />
                      </Link>
                    )}
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Ação recomendada</p>
                    <ul className="space-y-1">
                      {g.recomendacoes.map((r, i) => (
                        <li key={i} className="text-[12.5px] text-slate-500 flex gap-1.5">
                          <span className="text-slate-400">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 bg-slate-50/60">
            <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Sparkles size={13} className="text-blue-500 shrink-0" />
              Dica: foque primeiro nos gargalos críticos com maior perda estimada pra maximizar resultados.
            </p>
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3.5 py-2 text-[12.5px] font-medium text-blue-700 hover:bg-blue-500/20 transition-colors shrink-0"
            >
              <Activity size={13} /> Ver Plano de Ação <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
