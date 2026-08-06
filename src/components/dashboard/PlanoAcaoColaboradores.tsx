import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { estaDeFerias } from '@/lib/colaboradoresEmFerias';
import { ehSupervisor } from '@/lib/colaboradoresAtivos';
import { useAuth } from '@/context/AuthContext';
import { getMesCompletoDoCalendario, listarDiasEntre } from '@/lib/period';
import { fetchAssinadosDiarioTodos } from '@/lib/assinadosDiarioColaborador';
import { fetchProtocoladosDiarioTodos } from '@/lib/protocoladosDiarioColaborador';
import { normalizarNome } from '@/lib/assinadosPeriodo';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import { CollaboratorCard } from './plano-acao/CollaboratorCard';
import { RelogioBrasilia } from './plano-acao/RelogioBrasilia';
import { calcularMediaEquipe, calcularScoreInteligente } from './plano-acao/score';

const STATUS_FILTROS: NivelStatus[] = ['critico', 'alerta', 'atencao', 'bom', 'excelente'];

export function PlanoAcaoColaboradores({
  colaboradores,
  diasUteisPeriodo,
  inicioPeriodoSelecionado,
}: {
  colaboradores: ColaboradorReal[];
  diasUteisPeriodo: number;
  /** Data de início do filtro de calendário do topo — o mini-gráfico usa o mês inteiro (dia 1
   * ao último dia) desse mês, não sempre o mês real corrente, pra respeitar o mesmo filtro que
   * o resto da tela já usa (as métricas de cada colaborador já vêm filtradas por período). */
  inicioPeriodoSelecionado: string;
}) {
  const { sessao } = useAuth();
  const [filtroStatus, setFiltroStatus] = useState<NivelStatus | null>(null);
  const [seriesPorConsultor, setSeriesPorConsultor] = useState<Map<string, number[]>>(new Map());
  const [seriesProtocoladosPorConsultor, setSeriesProtocoladosPorConsultor] = useState<Map<string, number[]>>(new Map());
  const [diasSerie, setDiasSerie] = useState<string[]>([]);

  // Só quem realmente produz E ainda está ativo entra no plano de ação — ex-funcionário
  // não recebe plano de ação, mas os assinados dele continuam contando nos totais da empresa
  // (Visão Geral). Cargo é lista positiva (Discador/Discadora/Judit) em vez de excluir só
  // "supervisor", pra não deixar passar variante administrativa nenhuma — mas o texto do
  // cargo sozinho não basta (supervisor pode vir com "Discadora" igual todo mundo no banco),
  // por isso também checa pelo nome, igual Ranking/Equipe/Visão Geral já fazem.
  const cargosProducao = new Set(['discador', 'discadora', 'judit']);
  const comProducao = colaboradores.filter(
    (c) => c.ativo && cargosProducao.has(c.cargo.trim().toLowerCase()) && !ehSupervisor(c.nome) && !estaDeFerias(c.nome),
  );

  // Sparklines e ritmo diário do mês inteiro do período filtrado (dia 1 ao último dia) — uma
  // única consulta pra equipe inteira de cada métrica, não uma por card exibido, pra não
  // multiplicar chamada ao banco por 10-40 colaboradores na tela.
  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    const { inicio, fim } = getMesCompletoDoCalendario(inicioPeriodoSelecionado);
    const dias = listarDiasEntre(inicio, fim);

    function montarSeries(porConsultor: Map<string, { dia: string; total: number }[]>) {
      const series = new Map<string, number[]>();
      for (const c of comProducao) {
        const chave = normalizarNome(c.nome);
        const linhas = porConsultor.get(chave) ?? [];
        const porDia = new Map(linhas.map((l) => [l.dia, l.total]));
        series.set(chave, dias.map((d) => porDia.get(d) ?? 0));
      }
      return series;
    }

    fetchAssinadosDiarioTodos(sessao.token, inicio, fim)
      .then((porConsultor) => {
        if (cancelado) return;
        setSeriesPorConsultor(montarSeries(porConsultor));
        setDiasSerie(dias);
      })
      .catch(() => {
        if (!cancelado) setSeriesPorConsultor(new Map());
      });

    fetchProtocoladosDiarioTodos(sessao.token, inicio, fim)
      .then((porConsultor) => {
        if (!cancelado) setSeriesProtocoladosPorConsultor(montarSeries(porConsultor));
      })
      .catch(() => {
        if (!cancelado) setSeriesProtocoladosPorConsultor(new Map());
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao, comProducao.map((c) => c.id).join(','), inicioPeriodoSelecionado]);

  const media = useMemo(() => calcularMediaEquipe(comProducao, diasUteisPeriodo), [comProducao, diasUteisPeriodo]);

  const comScore = useMemo(
    () => comProducao.map((c) => ({ colaborador: c, ...calcularScoreInteligente(c, media, diasUteisPeriodo) })),
    [comProducao, media, diasUteisPeriodo],
  );

  const precisamAtencao = useMemo(
    () => comScore.filter((x) => x.banda === 'atencao' || x.banda === 'alerta' || x.banda === 'critico').length,
    [comScore],
  );

  // Melhores primeiro, críticos por último — quem for filtrar por status já vai direto no que
  // precisa, sem a grade inteira abrir liderada pelos piores casos.
  const linhas = comScore
    .filter((x) => !filtroStatus || x.banda === filtroStatus)
    .sort((a, b) => b.score - a.score);

  return (
    <Card>
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900">Plano de ação por colaborador</h3>
          </div>
          <RelogioBrasilia />
        </div>
        <p className="text-[13px] text-slate-500">
          {precisamAtencao === 0
            ? 'Nenhum colaborador precisa de atenção agora.'
            : `Hoje ${precisamAtencao === 1 ? 'existe 1 colaborador' : `existem ${precisamAtencao} colaboradores`} que precisam de atenção.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFiltroStatus(null)}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-[12px] font-medium border transition-colors',
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
              'rounded-full px-3.5 py-1.5 text-[12px] font-medium border transition-colors',
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

      {linhas.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">Nenhum colaborador com esse status no período.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {linhas.map((x, indice) => (
            <CollaboratorCard
              key={x.colaborador.id}
              colaborador={x.colaborador}
              media={media}
              diasUteisPeriodo={diasUteisPeriodo}
              serieUltimosDias={seriesPorConsultor.get(normalizarNome(x.colaborador.nome)) ?? []}
              serieProtocoladosUltimosDias={seriesProtocoladosPorConsultor.get(normalizarNome(x.colaborador.nome)) ?? []}
              diasSerie={diasSerie}
              indice={indice}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
