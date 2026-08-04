import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, Award, FileCheck2, FilePenLine, FileStack, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { KpiCard } from '@/components/kpi/KpiCard';
import { RadarPerformance } from '@/components/charts/RadarPerformance';
import { GaugeEficiencia } from '@/components/charts/GaugeEficiencia';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useIntelligence } from '@/lib/useIntelligence';
import { useAuth } from '@/context/AuthContext';
import { calcularRanking } from '@/lib/ranking';
import { calcularPaceProjecao, classificarPace } from '@/lib/diagnostico';
import { getMesAnterior, getPeriodoMesDoCalendario, listarDiasEntre } from '@/lib/period';
import { fetchAssinadosDiarioColaborador } from '@/lib/assinadosDiarioColaborador';
import { formatCargo, formatNumero, formatPct, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';

export default function ColaboradorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessao } = useAuth();
  const { colaboradores, alertas, gargalos, diasUteisTotaisMes, diasUteisDecorridos, periodoSelecionado, loading } = useIntelligence();

  const colaborador = colaboradores.find((c) => c.id === id);
  const rankingGeral = calcularRanking(colaboradores, 'geral');
  const posicao = rankingGeral.find((r) => r.colaborador.id === id)?.posicao;

  // Segue o mês do que está selecionado no calendário do topo (igual ao Ranking) — não o
  // mês real do sistema, senão o gráfico fica quase vazio quando o mês corrente mal começou
  // mas a diretoria está olhando um mês anterior filtrado.
  const periodoMesEvolucao = getPeriodoMesDoCalendario(periodoSelecionado.inicio);
  const [anoMesEvolucao, mesMesEvolucao] = periodoMesEvolucao.inicio.split('-').map(Number);
  const periodoMesAnterior = getMesAnterior(anoMesEvolucao, mesMesEvolucao);
  const [evolucaoMensal, setEvolucaoMensal] = useState<{ dia: number; atual: number; anterior: number }[]>([]);
  useEffect(() => {
    if (!sessao || !colaborador) return;
    let cancelado = false;
    const diasAtual = listarDiasEntre(periodoMesEvolucao.inicio, periodoMesEvolucao.fim);
    const diasAnterior = listarDiasEntre(periodoMesAnterior.inicio, periodoMesAnterior.fim);
    Promise.all([
      fetchAssinadosDiarioColaborador(sessao.token, colaborador.nome, periodoMesEvolucao.inicio, periodoMesEvolucao.fim),
      fetchAssinadosDiarioColaborador(sessao.token, colaborador.nome, periodoMesAnterior.inicio, periodoMesAnterior.fim),
    ])
      .then(([linhasAtual, linhasAnterior]) => {
        if (cancelado) return;
        const porDiaAtual = new Map(linhasAtual.map((l) => [l.dia, l.total]));
        const porDiaAnterior = new Map(linhasAnterior.map((l) => [l.dia, l.total]));
        // Alinha os dois meses pelo número do dia (1, 2, 3...), não pela data literal, pra
        // as duas linhas ficarem lado a lado no mesmo eixo X e dar pra comparar visualmente.
        const totalDias = Math.max(diasAtual.length, diasAnterior.length);
        const combinado = Array.from({ length: totalDias }, (_, indice) => ({
          dia: indice + 1,
          atual: diasAtual[indice] ? porDiaAtual.get(diasAtual[indice]) ?? 0 : 0,
          anterior: diasAnterior[indice] ? porDiaAnterior.get(diasAnterior[indice]) ?? 0 : 0,
        }));
        setEvolucaoMensal(combinado);
      })
      .catch(() => {
        if (!cancelado) setEvolucaoMensal([]);
      });
    return () => {
      cancelado = true;
    };
  }, [sessao, colaborador?.nome, periodoMesEvolucao.inicio, periodoMesEvolucao.fim, periodoMesAnterior.inicio, periodoMesAnterior.fim]);

  const pace = colaborador
    ? calcularPaceProjecao(colaborador.assinados, colaborador.metaMensal, diasUteisDecorridos, diasUteisTotaisMes)
    : null;
  const statusPace = pace && colaborador ? classificarPace(pace, colaborador.metaMensal) : null;

  if (loading) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="text-slate-500">Carregando...</p>
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="text-slate-500">Colaborador não encontrado.</p>
      </div>
    );
  }

  const alertasColaborador = alertas.filter((a) => a.colaboradorId === id);
  const gargalosColaborador = gargalos.filter((g) => g.colaboradorId === id);

  const recomendacoes = [
    statusPace === 'critico' &&
      `Pace muito abaixo do esperado (gap de ${formatNumero(pace!.gap)} vs. meta) — no ritmo atual não fecha o mês, agir agora.`,
    statusPace === 'alerta' && `Pace abaixo do esperado (gap de ${formatNumero(pace!.gap)} vs. meta) — acompanhar de perto.`,
    colaborador.conversaoAssinadosProtocolados < 60 && 'Revisar imediatamente a carteira de assinados sem protocolo.',
    colaborador.atingimentoMetaMensal < 70 && 'Redefinir plano de recuperação de meta com acompanhamento semanal.',
    colaborador.tendencia === 'caindo' && 'Agendar 1:1 de acompanhamento para entender a queda de performance.',
    colaborador.conversaoRecebidosAssinados < 70 && 'Reforçar técnicas de fechamento comercial (etapa emissão → assinatura).',
  ].filter(Boolean) as string[];

  const recomendacaoEngajamento =
    recomendacoes.length === 0 && (colaborador.status === 'excelente' || colaborador.status === 'bom')
      ? colaborador.status === 'excelente'
        ? `${colaborador.nome.split(' ')[0]} está com resultado excelente — reconhecer publicamente e envolvê-lo(a) em mentoria de colegas pode manter o engajamento em alta e ajudar a elevar o padrão do time.`
        : `Resultado consistente e dentro do esperado — oferecer uma meta desafio ou reconhecimento pontual pode ser o empurrão para levar ${colaborador.nome.split(' ')[0]} ao próximo nível.`
      : null;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={15} /> Voltar
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar nome={colaborador.nome} size={56} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{colaborador.nome}</h1>
            <p className="text-sm text-slate-500">{formatCargo(colaborador.cargo)} · {colaborador.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={colaborador.status} />
          {posicao && <span className="text-sm text-slate-500">#{posicao} no ranking geral</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <KpiCard titulo="Recebidos" valor={formatNumero(colaborador.recebidos)} icon={FileStack} accent="info" />
        <KpiCard
          titulo="Assinados"
          valor={colaborador.metaMensal > 0 ? `${formatNumero(colaborador.assinados)} / ${formatNumero(colaborador.metaMensal)}` : formatNumero(colaborador.assinados)}
          icon={FilePenLine}
          accent="brand"
          subtitulo={periodoSelecionado.label}
        />
        <KpiCard titulo="Protocolados" valor={formatNumero(colaborador.protocolados)} icon={FileCheck2} accent="success" variacao={colaborador.variacaoPeriodoAnterior} subtitulo="vs. período anterior" />
        <KpiCard titulo="Venda Ganha" valor={formatNumero(colaborador.vendaGanha ?? 0)} icon={Award} accent="warning" />
        <KpiCard
          titulo={colaborador.metaMensal > 0 ? 'Atingimento da Meta' : 'Conversão Geral'}
          valor={formatPct(colaborador.metaMensal > 0 ? colaborador.atingimentoMetaMensal : colaborador.conversaoGeral, 0)}
          icon={Target}
          accent={colaborador.metaMensal === 0 ? 'info' : colaborador.atingimentoMetaMensal >= 90 ? 'success' : 'warning'}
          subtitulo={colaborador.metaMensal === 0 ? 'Meta não cadastrada — usando Conv. Geral' : undefined}
        />
      </div>

      {colaborador.metaMensal === 0 && (
        <Card className="mb-6 text-sm text-slate-500">
          Meta do mês não cadastrada para este colaborador no banco — pace indisponível.
        </Card>
      )}

      {colaborador.metaMensal > 0 && pace && statusPace && (
        <Card className="mb-6" style={{ borderLeft: `3px solid ${STATUS_COLOR[statusPace]}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-700">Pace do mês</h3>
              <StatusPill status={statusPace} />
            </div>
            <span className="text-[11px] text-slate-500">
              {diasUteisDecorridos} de {diasUteisTotaisMes} dias úteis decorridos · meta: {formatNumero(colaborador.metaMensal)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-slate-500">Pace atual</p>
              <p className="text-base font-semibold text-slate-900">{pace.paceAtual.toFixed(2)}/dia</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Pace esperado</p>
              <p className="text-base font-semibold text-slate-900">{pace.paceEsperado.toFixed(2)}/dia</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Projeção do mês</p>
              <p className="text-base font-semibold text-slate-900">{formatNumero(pace.projecao)}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Gap vs. meta</p>
              <p className="text-base font-semibold flex items-center gap-1" style={{ color: STATUS_COLOR[statusPace] }}>
                <TrendingUp size={14} className={pace.gap >= 0 ? '' : 'rotate-180'} />
                {pace.gap >= 0 ? '+' : ''}{formatNumero(pace.gap)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Pace mede <span className="font-medium text-slate-600">volume</span> de assinados vs. meta do mês; o status "
            {STATUS_LABEL[colaborador.status]}" no topo mede <span className="font-medium text-slate-600">qualidade</span> (Protocolados +
            Venda Ganha, os dois contam como caso fechado, sobre Assinados). Quando o pace está em alerta ou crítico, isso já entra
            como recomendação abaixo — os dois se complementam, não competem.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Evolução do mês <span className="font-normal text-slate-400">· assinados por dia, {periodoMesEvolucao.label} vs. {periodoMesAnterior.label}</span>
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolucaoMensal} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} label={{ value: 'dia do mês', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip
                formatter={(v, name) => [formatNumero(Number(v)), name === 'atual' ? periodoMesEvolucao.label : periodoMesAnterior.label]}
                labelFormatter={(l) => `Dia ${l}`}
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, color: '#1e293b' }}
                labelStyle={{ color: '#1e293b' }}
                itemStyle={{ color: '#1e293b' }}
              />
              <Legend
                formatter={(value) => (value === 'atual' ? periodoMesEvolucao.label : periodoMesAnterior.label)}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Line type="monotone" dataKey="anterior" name="anterior" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="atual" name="atual" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-slate-700 self-start mb-2">Eficiência</h3>
          <GaugeEficiencia valor={colaborador.eficiencia} label="score de eficiência" />
          <div className={clsx('grid gap-4 w-full mt-2 text-center', colaborador.canal === 'Judit' ? 'grid-cols-2' : 'grid-cols-1')}>
            <div>
              <p className="text-[11px] text-slate-500">Conv. Geral</p>
              <p className="text-sm font-semibold text-slate-700">{formatPct(colaborador.conversaoGeral)}</p>
            </div>
            {colaborador.canal === 'Judit' && (
              <div>
                <p className="text-[11px] text-slate-500">Conv. Judit</p>
                <p className="text-sm font-semibold text-slate-700">{formatPct(colaborador.conversaoJudit)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Comparação com a equipe</h3>
          <RadarPerformance colaborador={colaborador} media={colaboradores} />
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Recomendações</h3>
            <StatusPill status={colaborador.status} />
          </div>

          {recomendacoes.length > 0 ? (
            <ul className="space-y-2">
              {recomendacoes.map((r, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-slate-600 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <span className="text-blue-600">→</span>
                  {r}
                </li>
              ))}
            </ul>
          ) : alertasColaborador.length > 0 ? (
            <div className="space-y-3">
              {alertasColaborador.map((a) => (
                <AlertCard key={a.id} alerta={a} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${STATUS_COLOR[colaborador.status]}1a`, color: STATUS_COLOR[colaborador.status] }}>
                  <ShieldCheck size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {colaborador.status === 'excelente' || colaborador.status === 'bom'
                      ? `Nenhum alerta disparado — nível ${STATUS_LABEL[colaborador.status].toLowerCase()}`
                      : `Nenhum alerta crítico disparado, mas o status geral está em ${STATUS_LABEL[colaborador.status].toLowerCase()}`}
                  </p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    {colaborador.status === 'excelente' || colaborador.status === 'bom'
                      ? 'Taxa de Protocolados, atingimento de meta e produtividade estão dentro do esperado no período. Não há risco identificado no momento.'
                      : 'Nenhuma métrica cruzou os limiares automáticos de alerta (Taxa de Protocolados, meta ou queda de produtividade) — mas o status geral já sinaliza que o resultado está abaixo do ideal.'}
                  </p>
                  <p className="mt-2 text-[13px] text-slate-600">
                    <span className="font-medium">Sugestão:</span>{' '}
                    {recomendacaoEngajamento
                      ? recomendacaoEngajamento
                      : 'Acompanhar de perto nas próximas semanas para evitar que o status regrida para alerta ou crítico.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {gargalosColaborador.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-2">Possíveis gargalos identificados</p>
              <ul className="space-y-2">
                {gargalosColaborador.map((g) => (
                  <li key={g.id} className="text-[13px] text-slate-500">{g.descricao}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Admissão em {colaborador.time} · Meta diária: {colaborador.metaDiaria} · Meta do período: {colaborador.metaMensal} ·{' '}
        <Link to={`/equipe/${encodeURIComponent(colaborador.time)}`} className="text-blue-600 hover:underline">ver todos os colaboradores do time</Link>
      </p>
    </div>
  );
}
