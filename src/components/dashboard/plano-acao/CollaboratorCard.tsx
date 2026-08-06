import { useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScoreCircle } from './ScoreCircle';
import { Sparkline } from './Sparkline';
import { QuickActions } from './QuickActions';
import { calcularScoreInteligente, calcularTendenciaSerie, gerarRecomendacoesIA, type MediaEquipe } from './score';
import { formatCargo } from '@/lib/format';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

interface CollaboratorCardProps {
  colaborador: ColaboradorReal;
  media: MediaEquipe;
  diasUteisPeriodo: number;
  serieUltimosDias: number[];
  serieProtocoladosUltimosDias: number[];
  diasSerie: string[];
  indice: number;
}

/**
 * Card do Plano de Ação: por padrão mostra só o essencial pra bater o olho (quem é, status,
 * score) — a análise em si (mensagem da IA + gráficos) fica escondida até clicar em "Ver plano
 * de ação". Números crus de Recebidos/Assinados/Protocolados/Conversão não aparecem mais aqui
 * (já existem em Equipe/Ranking/Colaborador); esse card é só o diagnóstico e o plano.
 */
export function CollaboratorCard({
  colaborador: c,
  media,
  diasUteisPeriodo,
  serieUltimosDias,
  serieProtocoladosUltimosDias,
  diasSerie,
  indice,
}: CollaboratorCardProps) {
  const [aberto, setAberto] = useState(false);
  const { score, banda, detalhe } = calcularScoreInteligente(c, media, diasUteisPeriodo);
  // Tooltip auditável: mostra exatamente as 4 sub-notas (0-100) e os pesos que formam o score
  // dessa pessoa especificamente — pra responder "como esse score funciona" com o número real
  // dela, não uma explicação genérica da fórmula.
  const tituloScore =
    `Score ${score} = Conversão ${Math.round(detalhe.conversaoScore)} × 40% + Protocolados ${Math.round(detalhe.protocoladosScore)} × 25% + ` +
    `Assinados ${Math.round(detalhe.assinadosScore)} × 20% + Média/Dia ${Math.round(detalhe.mediaDiaScore)} × 15%. ` +
    (detalhe.assinadosUsouMeta
      ? 'Assinados comparado com a meta mensal real.'
      : 'Sem meta cadastrada — Assinados comparado com a média da equipe em vez de 0%.');
  const tendencia = calcularTendenciaSerie(serieUltimosDias);
  const recomendacoes = gerarRecomendacoesIA(c, media, diasUteisPeriodo, tendencia, banda, score, serieUltimosDias);

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
        <div title={tituloScore}>
          <ScoreCircle score={score} banda={banda} size={40} />
        </div>
      </div>

      {/* Só o status aqui — misturar com a tendência ("Bom" de um lado, "Em queda" do outro)
         confundia quem bate o olho rápido sem saber qual dos dois vale. A tendência aparece
         só depois de expandir, junto do gráfico que a explica. */}
      <div className="flex items-center">
        <StatusPill status={banda} />
      </div>

      {/* Plano de ação (mensagem da IA + gráficos pequenos) só aparece depois de clicar em "Ver
         plano de ação" — o card fechado fica só com o essencial pra bater o olho na grade toda. */}
      {aberto && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {recomendacoes.length > 0 && (
            <p className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 leading-snug rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-3">
              <Sparkles size={12} className="text-blue-500 mt-0.5 shrink-0" />
              {recomendacoes[0]}
            </p>
          )}

          {/* Tendência do mês (dia 1 até hoje) — passe o cursor sobre a linha pra ver o dia e o valor de cada ponto */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-500">Assinados por dia no mês</p>
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

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 mb-1">Protocolados por dia no mês</p>
            <Sparkline serie={serieProtocoladosUltimosDias} dias={diasSerie} tendencia="estavel" corFixa="#3B82F6" unidade="protocolado" />
          </div>
        </div>
      )}

      <QuickActions aberto={aberto} onToggle={() => setAberto((v) => !v)} />
    </div>
  );
}
