import { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScoreCircle } from './ScoreCircle';
import { Sparkline } from './Sparkline';
import { PerformanceBar } from './PerformanceBar';
import { QuickActions } from './QuickActions';
import { calcularScoreInteligente, calcularTendenciaSerie, gerarRecomendacoesIA, mediaDiaColaborador, type MediaEquipe } from './score';
import { formatCargo, formatNumero, formatPct } from '@/lib/format';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

interface CollaboratorCardProps {
  colaborador: ColaboradorReal;
  media: MediaEquipe;
  diasUteisPeriodo: number;
  serieUltimosDias: number[];
  indice: number;
}

export function CollaboratorCard({ colaborador: c, media, diasUteisPeriodo, serieUltimosDias, indice }: CollaboratorCardProps) {
  const [aberto, setAberto] = useState(false);
  const { score, banda } = calcularScoreInteligente(c, media, diasUteisPeriodo);
  const tendencia = calcularTendenciaSerie(serieUltimosDias);
  const recomendacoes = gerarRecomendacoesIA(c, media, diasUteisPeriodo, tendencia, banda);
  const mediaDia = mediaDiaColaborador(c, diasUteisPeriodo);
  const deltaConversao = c.conversaoAssinadosProtocolados - media.conversao;

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
        <ScoreCircle score={score} banda={banda} size={40} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusPill status={banda} />
        <span className="text-[10px] font-medium flex items-center gap-0.5" style={{ color: corTendencia }}>
          <IconeTendencia size={10} /> {tendencia === 'subindo' ? 'Em alta' : tendencia === 'caindo' ? 'Em queda' : 'Estável'}
        </span>
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
          {/* Métricas com barra de comparação */}
          <div className="space-y-2.5">
            <PerformanceBar label="Recebidos" valor={c.recebidos} valorLabel={formatNumero(c.recebidos)} referencia={media.recebidos} referenciaLabel={`${formatNumero(media.recebidos)} méd. equipe`} cor="#4F7CFF" />
            <PerformanceBar label="Média/Dia" valor={mediaDia} valorLabel={mediaDia.toFixed(1)} referencia={media.mediaDia} referenciaLabel={`${media.mediaDia.toFixed(1)} méd. equipe`} cor="#4F7CFF" />
            <PerformanceBar label="Assinados" valor={c.assinados} valorLabel={formatNumero(c.assinados)} referencia={c.metaMensal} referenciaLabel={c.metaMensal > 0 ? `${formatNumero(c.metaMensal)} meta` : 'sem meta'} cor="#4F7CFF" />
            <PerformanceBar label="Protocolados" valor={c.protocolados} valorLabel={formatNumero(c.protocolados)} referencia={media.protocolados} referenciaLabel={`${formatNumero(media.protocolados)} méd. equipe`} cor="#4F7CFF" />
            <PerformanceBar label="Conversão" valor={c.conversaoAssinadosProtocolados} valorLabel={formatPct(c.conversaoAssinadosProtocolados, 1)} referencia={media.conversao} referenciaLabel={`${formatPct(media.conversao, 1)} méd. equipe`} cor="#4F7CFF" />
          </div>

          {/* Comparação com a equipe + tendência de 7 dias */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-slate-500">Conversão vs. equipe</p>
              <p className="text-[13px] font-semibold text-slate-700">{formatPct(media.conversao, 1)}</p>
              <p className="text-[12px] font-bold flex items-center gap-0.5" style={{ color: deltaConversao >= 0 ? '#22C55E' : '#EF4444' }}>
                {deltaConversao >= 0 ? '▲' : '▼'} {deltaConversao >= 0 ? '+' : ''}{deltaConversao.toFixed(1)}%
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-slate-500 mb-1">7 dias</p>
              <Sparkline serie={serieUltimosDias} tendencia={tendencia} />
            </div>
          </div>

          {/* IA Recomenda — lista completa (a primeira já aparece resumida acima) */}
          {recomendacoes.length > 1 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1.5">
                <Sparkles size={12} className="text-blue-500" /> IA Recomenda
              </p>
              <ul className="space-y-1">
                {recomendacoes.slice(1).map((r, i) => (
                  <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <QuickActions aberto={aberto} onToggle={() => setAberto((v) => !v)} />
    </div>
  );
}
