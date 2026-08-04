import { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScoreCircle } from './ScoreCircle';
import { Sparkline } from './Sparkline';
import { PerformanceBar } from './PerformanceBar';
import { QuadradosRitmo } from './QuadradosRitmo';
import { QuickActions } from './QuickActions';
import { calcularScoreInteligente, calcularTendenciaSerie, gerarRecomendacoesIA, mediaDiaColaborador, type MediaEquipe } from './score';
import { formatCargo, formatNumero, formatPct } from '@/lib/format';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

interface CollaboratorCardProps {
  colaborador: ColaboradorReal;
  media: MediaEquipe;
  diasUteisPeriodo: number;
  diasUteisTotaisMes: number;
  serieUltimosDias: number[];
  serieProtocoladosUltimosDias: number[];
  diasSerie: string[];
  indice: number;
}

export function CollaboratorCard({
  colaborador: c,
  media,
  diasUteisPeriodo,
  diasUteisTotaisMes,
  serieUltimosDias,
  serieProtocoladosUltimosDias,
  diasSerie,
  indice,
}: CollaboratorCardProps) {
  const [aberto, setAberto] = useState(false);
  const { score, banda } = calcularScoreInteligente(c, media, diasUteisPeriodo);
  const tendencia = calcularTendenciaSerie(serieUltimosDias);
  const recomendacoes = gerarRecomendacoesIA(c, media, diasUteisPeriodo, tendencia, banda, score, serieUltimosDias);
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);

  // Ritmo de hoje (quadradinhos): meta diária = meta mensal ÷ dias úteis do MÊS INTEIRO (não do
  // período filtrado — se o filtro for só 1 ou 2 dias, dividir por eles infla a meta diária pra
  // dezenas de quadrados). Arredondada pra cima. "Hoje" é achado pelo índice da data de hoje na
  // série do mês — se o período filtrado não inclui hoje (ex: mês passado), não tem ritmo de
  // hoje pra mostrar. Mesma lógica pra Assinados e Protocolados, cada um com sua própria meta.
  const hojeISO = (() => {
    const hoje = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  })();
  const indiceHoje = diasSerie.indexOf(hojeISO);

  const numQuadradosAssinados = c.metaMensal > 0 && diasUteisTotaisMes > 0 ? Math.max(1, Math.ceil(c.metaMensal / diasUteisTotaisMes)) : 0;
  const assinadosHoje = indiceHoje >= 0 ? serieUltimosDias[indiceHoje] : undefined;

  const numQuadradosProtocolados = c.metaProtocolados > 0 && diasUteisTotaisMes > 0 ? Math.max(1, Math.ceil(c.metaProtocolados / diasUteisTotaisMes)) : 0;
  const protocoladosHoje = indiceHoje >= 0 ? serieProtocoladosUltimosDias[indiceHoje] : undefined;

  const IconeTendencia = tendencia === 'subindo' ? ArrowUp : tendencia === 'caindo' ? ArrowDown : Minus;
  const corTendencia = tendencia === 'subindo' ? '#22C55E' : tendencia === 'caindo' ? '#EF4444' : '#94A3B8';

  return (
    <div
      className="animate-fade-in rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] hover:border-slate-300 dark:hover:border-slate-600"
      style={{ animationDelay: `${Math.min(indice, 12) * 40}ms` }}
    >
      {/* Cabeçalho — sempre visível: quem é, status e o score, pra bater o olho e já entender o essencial */}
      <div className="flex items-center gap-3">
        <Avatar nome={c.nome} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{c.nome}</p>
          <p className="text-[12px] text-slate-500 truncate">{c.time} · {formatCargo(c.cargo)}</p>
        </div>
        <div title="Score Inteligente: pondera Conversão (40%), Protocolados (25%), Assinados (20%) e Média/Dia (15%) frente à equipe.">
          <ScoreCircle score={score} banda={banda} size={40} />
        </div>
      </div>

      {/* Só o status aqui — misturar com a tendência ("Bom" de um lado, "Em queda" do outro)
         confundia quem bate o olho rápido sem saber qual dos dois vale. A tendência aparece
         só depois de expandir, junto do gráfico que a explica. */}
      <div className="flex items-center">
        <StatusPill status={banda} />
      </div>

      {/* Resumo do problema — só a recomendação mais relevante, sem precisar expandir pra saber o que fazer */}
      {recomendacoes.length > 0 && (
        <p className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 leading-snug rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-3">
          <Sparkles size={12} className="text-blue-500 mt-0.5 shrink-0" />
          {recomendacoes[0]}
        </p>
      )}

      {aberto && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Métricas com barra de comparação — Recebidos não tem meta/média real (depende só
             da distribuição de leads, não do colaborador), por isso é só o valor, sem referência. */}
          <div className="space-y-2.5">
            <PerformanceBar label="Recebidos" valor={c.recebidos} valorLabel={formatNumero(c.recebidos)} cor="#86EFAC" titulo="Total de leads recebidos no período. Não tem meta nem média de equipe — depende da distribuição de leads, não do colaborador." />
            <PerformanceBar label="Média/Dia" valor={mediaDia} valorLabel={mediaDia.toFixed(1)} cor="#4F7CFF" titulo="Assinados por dia útil no período." />
            <QuadradosRitmo
              label="Assinados"
              valorMes={c.assinados}
              meta={c.metaMensal}
              metaLabel={`${formatNumero(c.metaMensal)} meta`}
              valorHoje={assinadosHoje}
              numQuadrados={numQuadradosAssinados}
            />
            <QuadradosRitmo
              label="Protocolados"
              valorMes={c.protocolados}
              meta={c.metaProtocolados}
              metaLabel={`${formatNumero(c.metaProtocolados)} meta`}
              valorHoje={protocoladosHoje}
              numQuadrados={numQuadradosProtocolados}
            />
            <PerformanceBar label="Conversão" valor={c.conversaoRecebidosAssinados} valorLabel={formatPct(c.conversaoRecebidosAssinados, 1)} cor="#4F7CFF" titulo="Percentual de leads recebidos que viraram contrato assinado." />
          </div>

          {/* Tendência do mês (dia 1 até hoje) — passe o cursor sobre a linha pra ver o dia e o valor de cada ponto */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500">Assinados por dia no mês (passe o cursor pra ver os valores)</p>
              <span
                className="text-[10px] font-medium flex items-center gap-0.5 shrink-0 ml-2"
                style={{ color: corTendencia }}
                title="Compara a 1ª metade com a 2ª metade dos assinados dos últimos 7 dias com dado."
              >
                <IconeTendencia size={10} /> {tendencia === 'subindo' ? 'Em alta' : tendencia === 'caindo' ? 'Em queda' : 'Estável'}
              </span>
            </div>
            <Sparkline serie={serieUltimosDias} dias={diasSerie} tendencia={tendencia} />
          </div>
        </div>
      )}

      <QuickActions aberto={aberto} onToggle={() => setAberto((v) => !v)} />
    </div>
  );
}
