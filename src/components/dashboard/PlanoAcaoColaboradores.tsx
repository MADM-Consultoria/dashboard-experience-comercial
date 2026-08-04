import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { estaDeFerias } from '@/lib/colaboradoresEmFerias';
import { useAuth } from '@/context/AuthContext';
import { listarDiasEntre } from '@/lib/period';
import { fetchAssinadosDiarioTodos } from '@/lib/assinadosDiarioColaborador';
import { normalizarNome } from '@/lib/assinadosPeriodo';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { NivelStatus } from '@/types/domain';
import type { ColaboradorReal } from '@/lib/relatorioJudit';
import { CollaboratorCard } from './plano-acao/CollaboratorCard';
import { RelogioBrasilia } from './plano-acao/RelogioBrasilia';
import { SummaryCards, type ResumoPlanoAcao } from './plano-acao/SummaryCards';
import { calcularMediaEquipe, calcularScoreInteligente, mediaDiaColaborador } from './plano-acao/score';

const STATUS_FILTROS: NivelStatus[] = ['critico', 'alerta', 'atencao', 'bom', 'excelente'];

function ultimos7Dias(): { inicio: string; fim: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hoje = new Date();
  const fim = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const inicioDate = new Date(hoje);
  inicioDate.setDate(inicioDate.getDate() - 6);
  const inicio = `${inicioDate.getFullYear()}-${pad(inicioDate.getMonth() + 1)}-${pad(inicioDate.getDate())}`;
  return { inicio, fim };
}

export function PlanoAcaoColaboradores({ colaboradores, diasUteisPeriodo }: { colaboradores: ColaboradorReal[]; diasUteisPeriodo: number }) {
  const { sessao } = useAuth();
  const [filtroStatus, setFiltroStatus] = useState<NivelStatus | null>(null);
  const [seriesPorConsultor, setSeriesPorConsultor] = useState<Map<string, number[]>>(new Map());

  // Só quem realmente produz E ainda está ativo entra no plano de ação — ex-funcionário
  // não recebe plano de ação, mas os assinados dele continuam contando nos totais da empresa
  // (Visão Geral). Cargo é lista positiva (Discador/Discadora/Judit) em vez de excluir só
  // "supervisor", pra não deixar passar variante administrativa nenhuma.
  const cargosProducao = new Set(['discador', 'discadora', 'judit']);
  const comProducao = colaboradores.filter((c) => c.ativo && cargosProducao.has(c.cargo.trim().toLowerCase()) && !estaDeFerias(c.nome));

  // Sparklines dos últimos 7 dias reais — uma única consulta pra equipe inteira, não uma por
  // card exibido, pra não multiplicar chamada ao banco por 10-40 colaboradores na tela.
  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    const { inicio, fim } = ultimos7Dias();
    fetchAssinadosDiarioTodos(sessao.token, inicio, fim)
      .then((porConsultor) => {
        if (cancelado) return;
        const dias = listarDiasEntre(inicio, fim);
        const series = new Map<string, number[]>();
        for (const c of comProducao) {
          const chave = normalizarNome(c.nome);
          const linhas = porConsultor.get(chave) ?? [];
          const porDia = new Map(linhas.map((l) => [l.dia, l.total]));
          series.set(chave, dias.map((d) => porDia.get(d) ?? 0));
        }
        setSeriesPorConsultor(series);
      })
      .catch(() => {
        if (!cancelado) setSeriesPorConsultor(new Map());
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao, comProducao.map((c) => c.id).join(',')]);

  const media = useMemo(() => calcularMediaEquipe(comProducao, diasUteisPeriodo), [comProducao, diasUteisPeriodo]);

  const comScore = useMemo(
    () => comProducao.map((c) => ({ colaborador: c, ...calcularScoreInteligente(c, media, diasUteisPeriodo) })),
    [comProducao, media, diasUteisPeriodo],
  );

  const resumo: ResumoPlanoAcao = useMemo(() => {
    const precisamAtencao = comScore.filter((x) => x.banda === 'atencao' || x.banda === 'alerta' || x.banda === 'critico').length;
    const acimaDaMeta = comProducao.filter((c) => c.metaMensal > 0 && c.atingimentoMetaMensal >= 100).length;
    const semProtocolar = comProducao.filter((c) => c.assinados > 0 && c.protocolados === 0).length;
    const conversaoBaixa = comProducao.filter((c) => c.conversaoRecebidosAssinados < 5 && c.recebidos >= 5).length;
    const conversaoMedia = comProducao.length ? comProducao.reduce((a, c) => a + c.conversaoAssinadosProtocolados, 0) / comProducao.length : 0;
    const mediaDiaEquipe = comProducao.length ? comProducao.reduce((a, c) => a + mediaDiaColaborador(c, diasUteisPeriodo), 0) / comProducao.length : 0;
    const melhor = [...comScore].sort((a, b) => b.score - a.score)[0] ?? null;
    const protocolosPendentes = comProducao.reduce((a, c) => a + Math.max(0, c.assinados - c.protocolados), 0);

    return {
      precisamAtencao,
      acimaDaMeta,
      semProtocolar,
      conversaoBaixa,
      conversaoMedia,
      mediaDia: mediaDiaEquipe,
      melhorColaborador: melhor?.colaborador.nome ?? null,
      protocolosPendentes,
    };
  }, [comScore, comProducao, diasUteisPeriodo]);

  const linhas = comScore
    .filter((x) => !filtroStatus || x.banda === filtroStatus)
    .sort((a, b) => a.score - b.score);

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
          {resumo.precisamAtencao === 0
            ? 'Nenhum colaborador precisa de atenção agora.'
            : `Hoje ${resumo.precisamAtencao === 1 ? 'existe 1 colaborador' : `existem ${resumo.precisamAtencao} colaboradores`} que precisam de atenção.`}
        </p>
      </div>

      <SummaryCards resumo={resumo} />

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
              indice={indice}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
