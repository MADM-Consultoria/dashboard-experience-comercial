import { useState } from 'react';
import { AlertTriangle, Award, FileCheck2, FileSignature, Gauge, Inbox, Percent, TrendingUp, Trophy, UserX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/kpi/KpiCard';
import { ResumoMesCard } from '@/components/kpi/ResumoMesCard';
import { Card } from '@/components/ui/Card';
import { RadarConversaoLigacoes } from '@/components/charts/RadarConversaoLigacoes';
import { FunilChart } from '@/components/charts/FunilChart';
import { AlertCard } from '@/components/alerts/AlertCard';
import { PlanoAcaoColaboradores } from '@/components/dashboard/PlanoAcaoColaboradores';
import { DetalheAssinadosModal } from '@/components/dashboard/DetalheAssinadosModal';
import { useIntelligence } from '@/lib/useIntelligence';
import { calcularPaceProjecao, classificarPace } from '@/lib/diagnostico';
import { contarDiasUteis, getPeriodoMesDoCalendario } from '@/lib/period';
import { formatNumero, formatPct } from '@/lib/format';
import { ehSupervisor } from '@/lib/colaboradoresAtivos';
import { Link } from 'react-router-dom';

export default function VisaoGeral() {
  const { periodoSelecionado, diasUteisTotaisMes, diasUteisDecorridos, kpi, vendaGanhaTotal, funil, alertas, colaboradores, loading, error } = useIntelligence();
  // "Melhor colaborador"/"Precisa de atenção" sempre olham pro MÊS INTEIRO (não um dia/intervalo
  // curto) — mas o mês em questão é o mesmo que está selecionado no calendário do topo (igual
  // ao Ranking), pra bater com o que a pessoa está filtrando em vez de ficar preso no mês real
  // do sistema.
  const periodoMesSelecionado = getPeriodoMesDoCalendario(periodoSelecionado.inicio);
  const { kpi: kpiMesAtual } = useIntelligence(periodoMesSelecionado);
  const alertasCriticos = alertas.filter((a) => a.prioridade === 'critico').slice(0, 2);
  const [modalAberto, setModalAberto] = useState<'geral' | 'judit' | null>(null);
  const diasUteisPeriodoSelecionado = contarDiasUteis({ inicio: periodoSelecionado.inicio, fim: periodoSelecionado.fim, label: '' });

  // "Geral · Assinados" é o total real da empresa inteira (Discadora + Judit
  // somados) — Judit é um recorte por canal que já está incluído dentro
  // desse total, não um valor à parte.
  const colaboradoresJudit = colaboradores.filter((c) => c.canal === 'Judit');
  // Médias de desempenho (radar) olham só pra quem está ativo — incluir gente desligada
  // (com métricas do período zeradas) puxaria a média da equipe artificialmente pra baixo.
  const colaboradoresAtivos = colaboradores.filter((c) => c.ativo && !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor'));

  const totalAssinadosGeral = kpi.totalAssinados;
  const totalAssinadosJudit = kpi.totalAssinadosJudit;

  const metaMensalGeral = kpi.metaMensalEquipe;
  const metaMensalJudit = colaboradoresJudit.reduce((a, c) => a + c.metaMensal, 0);

  const paceEquipe = calcularPaceProjecao(totalAssinadosGeral, metaMensalGeral, diasUteisDecorridos, diasUteisTotaisMes);
  const statusPaceEquipe = classificarPace(paceEquipe, metaMensalGeral);

  const paceJudit = calcularPaceProjecao(totalAssinadosJudit, metaMensalJudit, diasUteisDecorridos, diasUteisTotaisMes);
  const statusPaceJudit = classificarPace(paceJudit, metaMensalJudit);

  // Resumo do período selecionado no calendário do topo.
  // "Conversão Geral" é a conversão da empresa inteira (todo mundo, Judit incluso). "Conversão
  // Judit" usa a definição oficial via madm.kommo_leads.sdr = 'Judit' pros dois lados
  // (Assinados e Recebidos) — não mais o canal do colaborador nem madm.view_relatorio_judit.
  const conversaoGeralPeriodo = kpi.totalRecebidos > 0 ? (kpi.totalAssinados / kpi.totalRecebidos) * 100 : 0;
  const conversaoJuditPeriodo = kpi.totalRecebidosJudit > 0 ? (totalAssinadosJudit / kpi.totalRecebidosJudit) * 100 : 0;
  const atingimentoMetaPeriodo = kpi.metaMensalEquipe > 0 ? (kpi.totalAssinados / kpi.metaMensalEquipe) * 100 : 0;
  const metaComprometida = atingimentoMetaPeriodo < 90;

  const times = Array.from(new Set(colaboradores.map((c) => c.time)));
  const porTime = times.map((time) => {
    const doTime = colaboradores.filter((c) => c.time === time);
    const assinados = doTime.reduce((a, c) => a + c.assinados, 0);
    const protocolados = doTime.reduce((a, c) => a + c.protocolados, 0);
    return { time, pessoas: doTime.length, assinados, protocolados, taxa: assinados ? (protocolados / assinados) * 100 : 0 };
  });

  if (loading) {
    return (
      <div>
        <PageHeader title="Visão Geral" description="Carregando dados do banco..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Visão Geral" description="Panorama executivo da operação comercial." />
        <Card className="text-sm text-red-600">{error}</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Visão Geral"
        description={`Panorama executivo da operação comercial — Assinados de ${periodoSelecionado.label.toLowerCase()}.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ResumoMesCard
          titulo="Geral · Assinados"
          icon={FileSignature}
          atual={totalAssinadosGeral}
          meta={metaMensalGeral}
          pace={paceEquipe}
          statusPace={statusPaceEquipe}
          onClick={() => setModalAberto('geral')}
        />
        <ResumoMesCard
          titulo="Judit · Assinados"
          icon={FileSignature}
          atual={totalAssinadosJudit}
          meta={metaMensalJudit}
          pace={paceJudit}
          statusPace={statusPaceJudit}
          onClick={() => setModalAberto('judit')}
        />
      </div>

      {modalAberto === 'geral' && (
        <DetalheAssinadosModal
          titulo="Geral · Assinados"
          colaboradores={colaboradores}
          atual={totalAssinadosGeral}
          onFechar={() => setModalAberto(null)}
        />
      )}
      {modalAberto === 'judit' && (
        <DetalheAssinadosModal
          titulo="Judit · Assinados"
          colaboradores={colaboradoresJudit}
          atual={totalAssinadosJudit}
          onFechar={() => setModalAberto(null)}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard titulo="Venda Ganha" valor={formatNumero(vendaGanhaTotal)} icon={Award} accent="brand" />
        <KpiCard titulo="Recebidos" valor={formatNumero(kpi.totalRecebidos)} icon={Inbox} accent="info" />
        <KpiCard titulo="Protocolados" valor={formatNumero(kpi.totalProtocolados)} icon={FileCheck2} accent="success" />
        <KpiCard titulo="Conversão Geral" valor={formatPct(conversaoGeralPeriodo)} icon={Percent} accent="brand" />
        <KpiCard titulo="Conversão Judit" valor={formatPct(conversaoJuditPeriodo, 2)} icon={Percent} accent="warning" />
      </div>

      <Card
        className="mb-6 flex items-start gap-3"
        style={{ borderLeft: `3px solid ${metaComprometida ? '#ef4444' : '#22c55e'}` }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: metaComprometida ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: metaComprometida ? '#ef4444' : '#22c55e' }}
        >
          {metaComprometida ? <AlertTriangle size={17} /> : <TrendingUp size={17} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Em {periodoSelecionado.label.toLowerCase()} a equipe assinou {formatNumero(kpi.totalAssinados)} e protocolou {formatNumero(kpi.totalProtocolados)}
          </p>
          <p className="mt-1 text-[13px] text-slate-600">
            {metaComprometida
              ? `Isso representa só ${formatPct(atingimentoMetaPeriodo, 1)} da meta mensal de assinados — abaixo do esperado.`
              : `Isso representa ${formatPct(atingimentoMetaPeriodo, 1)} da meta mensal de assinados — dentro do esperado.`}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Desempenho da Equipe</h3>
          </div>
          <RadarConversaoLigacoes colaboradores={colaboradoresAtivos} />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Funil Comercial</h3>
          <FunilChart etapas={funil} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Trophy size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">Melhor colaborador</p>
            {kpiMesAtual.melhorColaborador ? (
              <Link to={`/colaboradores/${kpiMesAtual.melhorColaborador.id}`} className="text-sm font-semibold text-slate-900 hover:underline truncate block">
                {kpiMesAtual.melhorColaborador.nome}
              </Link>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <UserX size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">Precisa de atenção</p>
            {kpiMesAtual.colaboradorAtencao ? (
              <Link to={`/colaboradores/${kpiMesAtual.colaboradorAtencao.id}`} className="text-sm font-semibold text-slate-900 hover:underline truncate block">
                {kpiMesAtual.colaboradorAtencao.nome}
              </Link>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Gauge size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">Produtividade média da equipe</p>
            <p className="text-sm font-semibold text-slate-900">{kpi.produtividadeMedia.toFixed(1)} assinados/dia por colaborador</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Comparativo por time</h3>
          <div className="space-y-2">
            {porTime.map((t) => (
              <Link
                key={t.time}
                to={`/equipe/${encodeURIComponent(t.time)}`}
                className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 hover:bg-slate-100 transition-colors"
              >
                <span className="text-[13px] font-medium text-slate-700">{t.time} <span className="text-slate-400 font-normal">· {t.pessoas} pessoas</span></span>
                <span className="text-[13px] text-slate-600">{formatNumero(t.protocolados)} protocolados</span>
                <span className="text-[13px] font-semibold text-slate-900">{formatPct(t.taxa)}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Alertas críticos</h3>
          </div>
          {alertasCriticos.length > 0 ? (
            <div className="space-y-3">
              {alertasCriticos.map((a) => (
                <AlertCard key={a.id} alerta={a} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum alerta crítico no período. Equipe operando dentro do esperado.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <PlanoAcaoColaboradores colaboradores={colaboradores} diasUteisPeriodo={diasUteisPeriodoSelecionado} inicioPeriodoSelecionado={periodoSelecionado.inicio} />
      </div>
    </div>
  );
}
