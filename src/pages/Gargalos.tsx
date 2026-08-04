import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/kpi/KpiCard';
import { useIntelligence } from '@/lib/useIntelligence';
import { formatNumero, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { Gargalo } from '@/types/domain';
import { AlertTriangle, ArrowRight, ChevronDown, GitMerge, ListTree, TrendingDown, Users } from 'lucide-react';

const TIPO_LABEL: Record<Gargalo['tipo'], string> = {
  etapa_funil: 'Etapa do funil',
  colaborador: 'Colaborador',
  processo: 'Processo',
};

const TIPO_ICON: Record<Gargalo['tipo'], typeof GitMerge> = {
  etapa_funil: GitMerge,
  colaborador: Users,
  processo: ListTree,
};

const TIPOS: Array<Gargalo['tipo']> = ['etapa_funil', 'colaborador', 'processo'];

export default function Gargalos() {
  const { gargalos } = useIntelligence();
  const [filtroTipo, setFiltroTipo] = useState<Gargalo['tipo'] | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  const filtrados = gargalos.filter((g) => !filtroTipo || g.tipo === filtroTipo);
  const perdaTotal = gargalos.reduce((a, g) => a + g.perdaEstimada, 0);
  const criticos = gargalos.filter((g) => g.severidade === 'critico').length;

  return (
    <div>
      <PageHeader
        title="Gargalos"
        description="Onde a empresa está perdendo processos — e o que fazer a respeito."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard titulo="Gargalos identificados" valor={formatNumero(gargalos.length)} icon={AlertTriangle} accent={gargalos.length ? 'warning' : 'success'} />
        <KpiCard titulo="Processos represados" valor={formatNumero(perdaTotal)} icon={TrendingDown} accent="danger" subtitulo="soma da perda estimada" />
        <KpiCard titulo="Críticos" valor={formatNumero(criticos)} icon={AlertTriangle} accent={criticos ? 'danger' : 'success'} />
        <KpiCard titulo="Por colaborador" valor={formatNumero(gargalos.filter((g) => g.tipo === 'colaborador').length)} icon={Users} accent="info" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
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

      {filtrados.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">Nenhum gargalo relevante identificado com esse filtro.</p>
        </Card>
      )}

      <div className="space-y-3">
        {filtrados.map((g) => {
          const cor = STATUS_COLOR[g.severidade];
          const aberto = expandidos.has(g.id);
          const TipoIcon = TIPO_ICON[g.tipo];

          return (
            <Card key={g.id} padded={false} className="overflow-hidden">
              <button onClick={() => toggle(g.id)} className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${cor}1a`, color: cor }}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: cor, backgroundColor: `${cor}1a` }}>
                        {STATUS_LABEL[g.severidade]}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <TipoIcon size={11} /> {TIPO_LABEL[g.tipo]}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{g.titulo}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] text-slate-500">Perda estimada</p>
                    <p className="text-sm font-semibold text-slate-900">{formatNumero(g.perdaEstimada)}</p>
                  </div>
                  <ChevronDown size={18} className={clsx('text-slate-400 transition-transform', aberto && 'rotate-180')} />
                </div>
              </button>

              {aberto && (
                <div className="px-4 pb-4 pl-[68px] border-t border-slate-100 pt-3 animate-fade-in">
                  <p className="text-[13px] text-slate-600 max-w-2xl mb-1">{g.descricao}</p>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
