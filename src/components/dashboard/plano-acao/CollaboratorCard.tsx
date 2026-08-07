import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronRight, Minus, Sparkles } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { Sparkline } from './Sparkline';
import { QuickActions } from './QuickActions';
import { calcularClassificacao, calcularTendenciaSerie, gerarRecomendacoesIA, type MediaEquipe } from './score';
import { formatCargo, formatNumero } from '@/lib/format';
import { getMesAnterior, listarDiasEntre } from '@/lib/period';
import { fetchAssinadosDiarioColaborador } from '@/lib/assinadosDiarioColaborador';
import { fetchProtocoladosDiarioColaborador } from '@/lib/protocoladosDiarioColaborador';
import { fetchVendaGanhaDiarioColaborador } from '@/lib/vendaGanhaDiarioColaborador';
import { useAuth } from '@/context/AuthContext';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

interface CollaboratorCardProps {
  colaborador: ColaboradorReal;
  media: MediaEquipe;
  diasUteisPeriodo: number;
  serieUltimosDias: number[];
  serieProtocoladosUltimosDias: number[];
  serieVendaGanhaUltimosDias: number[];
  diasSerie: string[];
  indice: number;
}

interface PontoComparativo {
  dia: number;
  atual: number;
  anterior: number;
}

/** Busca a série diária de um colaborador no mês anterior — mesma função pras 3 métricas
 * (Assinados/Protocolados/Venda Ganha), o que muda é qual fetch é passado. */
type FetchDiarioColaborador = (token: string, nomeColaborador: string, inicio: string, fim: string) => Promise<{ dia: string; total: number }[]>;

/**
 * Um bloco "X por dia no mês" com o botão "Fazer comparativo com o mês passado" — reaproveitado
 * pros 3 gráficos do card (Assinados, Protocolados, Venda Ganha). Busca o mês anterior sob
 * demanda, só quando a pessoa clica (não faz sentido puxar isso pra todo mundo de cara).
 */
function BlocoMetricaMensal({
  titulo,
  nomeColaborador,
  serieAtual,
  diasSerie,
  fetchDiario,
  corLinha,
  unidade,
  tendencia,
  badgeTendencia,
}: {
  titulo: string;
  nomeColaborador: string;
  serieAtual: number[];
  diasSerie: string[];
  fetchDiario: FetchDiarioColaborador;
  corLinha?: string;
  unidade: string;
  tendencia: 'subindo' | 'caindo' | 'estavel';
  badgeTendencia?: React.ReactNode;
}) {
  const { sessao } = useAuth();
  const [comparativoAberto, setComparativoAberto] = useState(false);
  const [comparativoCarregando, setComparativoCarregando] = useState(false);
  const [comparativoDados, setComparativoDados] = useState<PontoComparativo[] | null>(null);
  const [labelMesAnterior, setLabelMesAnterior] = useState('');

  // `diasSerie` já é o mês inteiro do período selecionado (dia 1 ao último dia), então o
  // mês/ano de referência vem do primeiro dia dela. Alinha pelo número do dia (1, 2, 3...), não
  // pela data literal, mesmo padrão do gráfico de evolução do colaborador.
  async function buscarComparativo() {
    if (comparativoDados || comparativoCarregando || !sessao || diasSerie.length === 0) return;
    setComparativoCarregando(true);
    try {
      const [ano, mes] = diasSerie[0].split('-').map(Number);
      const mesAnterior = getMesAnterior(ano, mes);
      const diasAnterior = listarDiasEntre(mesAnterior.inicio, mesAnterior.fim);
      const linhasAnterior = await fetchDiario(sessao.token, nomeColaborador, mesAnterior.inicio, mesAnterior.fim);
      const porDiaAnterior = new Map(linhasAnterior.map((l) => [l.dia, l.total]));
      const totalDias = Math.max(diasSerie.length, diasAnterior.length);
      const combinado: PontoComparativo[] = Array.from({ length: totalDias }, (_, indice) => ({
        dia: indice + 1,
        atual: diasSerie[indice] ? serieAtual[indice] ?? 0 : 0,
        anterior: diasAnterior[indice] ? porDiaAnterior.get(diasAnterior[indice]) ?? 0 : 0,
      }));
      setComparativoDados(combinado);
      setLabelMesAnterior(mesAnterior.label);
    } catch {
      setComparativoDados([]);
    } finally {
      setComparativoCarregando(false);
    }
  }

  function alternarComparativo() {
    setComparativoAberto((v) => !v);
  }

  // Se a pessoa clicar em "Fazer comparativo" antes de `diasSerie` (a série do mês inteiro,
  // buscada uma vez pra equipe toda em PlanoAcaoColaboradores) terminar de carregar, a busca
  // de antes ficava presa pra sempre — não tinha spinner nem gráfico, e reabrir não ajudava
  // porque o guard rejeitava de novo. Aqui, sempre que o painel está aberto e ainda falta
  // buscar (dados null), tenta buscar — e tenta de novo automaticamente assim que `diasSerie`
  // finalmente chegar.
  useEffect(() => {
    if (comparativoAberto && !comparativoDados && !comparativoCarregando) {
      buscarComparativo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparativoAberto, diasSerie]);

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
        <p className="text-[10px] text-slate-500">{titulo}</p>
        <div className="flex items-center gap-2">
          {!comparativoAberto && badgeTendencia}
          <button
            type="button"
            onClick={alternarComparativo}
            className="group flex items-center gap-0.5 text-[10px] font-medium text-blue-600 hover:text-blue-700 shrink-0"
          >
            <span className="underline decoration-blue-300 decoration-dotted underline-offset-2 transition-all duration-150 group-hover:decoration-blue-600 group-hover:decoration-solid">
              {comparativoAberto ? 'Ver só este mês' : 'Fazer comparativo com o mês passado'}
            </span>
            <ChevronRight size={11} className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {!comparativoAberto && <Sparkline serie={serieAtual} dias={diasSerie} tendencia={tendencia} corFixa={corLinha} unidade={unidade} />}

      {comparativoAberto && !comparativoDados && (
        <div className="h-[140px] flex items-center justify-center text-[11px] text-slate-400">Carregando comparativo...</div>
      )}

      {comparativoAberto && comparativoDados && comparativoDados.length > 0 && (
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparativoDados} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={22} allowDecimals={false} />
              <Tooltip
                formatter={(v, name) => [formatNumero(Number(v)), name === 'atual' ? 'Este mês' : labelMesAnterior]}
                labelFormatter={(dia) => `Dia ${dia}`}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend formatter={(value) => (value === 'atual' ? 'Este mês' : labelMesAnterior)} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="anterior" name="anterior" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="atual" name="atual" stroke={corLinha ?? '#2563eb'} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {comparativoAberto && comparativoDados?.length === 0 && (
        <p className="text-[11px] text-slate-400 py-4 text-center">Não foi possível carregar o mês passado agora.</p>
      )}
    </div>
  );
}

/**
 * Card do Plano de Ação: por padrão mostra só o essencial pra bater o olho (quem é, status,
 * classificação) — a análise em si (mensagem da IA + gráficos) fica escondida até clicar em
 * "Ver plano de ação". Números crus de Recebidos/Assinados/Protocolados/Conversão não aparecem
 * mais aqui (já existem em Equipe/Ranking/Colaborador); esse card é só o diagnóstico e o plano.
 */
export function CollaboratorCard({
  colaborador: c,
  media,
  diasUteisPeriodo,
  serieUltimosDias,
  serieProtocoladosUltimosDias,
  serieVendaGanhaUltimosDias,
  diasSerie,
  indice,
}: CollaboratorCardProps) {
  const [aberto, setAberto] = useState(false);
  const { banda } = calcularClassificacao(c, media);
  // Tooltip explica o que define a classificação dessa pessoa — sem expor um número de score
  // à parte que precisaria de fórmula própria pra alguém questionar.
  const tituloClassificacao = 'Classificação definida por Assinados (peso 50%), Protocolados (peso 25%) e Venda Ganha (peso 25%), cada um comparado com a meta ou a média da equipe.';
  const tendencia = calcularTendenciaSerie(serieUltimosDias);
  const recomendacoes = gerarRecomendacoesIA(c, media, diasUteisPeriodo, tendencia, banda, serieUltimosDias);

  const IconeTendencia = tendencia === 'subindo' ? ArrowUp : tendencia === 'caindo' ? ArrowDown : Minus;
  const corTendencia = tendencia === 'subindo' ? '#22C55E' : tendencia === 'caindo' ? '#EF4444' : '#94A3B8';

  return (
    <div
      className="animate-fade-in rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] hover:border-slate-300 dark:hover:border-slate-600"
      style={{ animationDelay: `${Math.min(indice, 12) * 40}ms` }}
    >
      {/* Cabeçalho — sempre visível: quem é e a classificação, pra bater o olho e já entender o essencial */}
      <div className="flex items-center gap-3">
        <Avatar nome={c.nome} size={44} />
        <div className="min-w-0 flex-1">
          <Link to={`/colaboradores/${c.id}`} className="text-sm font-semibold text-slate-900 truncate hover:text-blue-600 hover:underline block">
            {c.nome}
          </Link>
          <p className="text-[12px] text-slate-500 truncate">{c.time} · {formatCargo(c.cargo)}</p>
        </div>
      </div>

      {/* Só o status aqui — misturar com a tendência ("Bom" de um lado, "Em queda" do outro)
         confundia quem bate o olho rápido sem saber qual dos dois vale. A tendência aparece
         só depois de expandir, junto do gráfico que a explica. */}
      <div className="flex items-center" title={tituloClassificacao}>
        <StatusPill status={banda} />
      </div>

      {/* Plano de ação (mensagem da IA + gráficos pequenos) só aparece depois de clicar em "Ver
         plano de ação" — o card fechado fica só com o essencial pra bater o olho na grade toda. */}
      {aberto && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {recomendacoes.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-3">
              <p className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 leading-snug">
                <Sparkles size={12} className="text-blue-500 mt-0.5 shrink-0" />
                {recomendacoes[0]}
              </p>
              {/* Outras recomendações que também se aplicam ao mesmo colaborador — não são
                 alternativas nem repetição, cada uma vem de um número real diferente (ex:
                 conversão baixa E ritmo abaixo da média ao mesmo tempo). Complementam a
                 primeira em vez de competir com ela por atenção. */}
              {recomendacoes.length > 1 && (
                <ul className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  {recomendacoes.slice(1).map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      <span className="mt-1 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <BlocoMetricaMensal
            titulo="Assinados por dia no mês"
            nomeColaborador={c.nome}
            serieAtual={serieUltimosDias}
            diasSerie={diasSerie}
            fetchDiario={fetchAssinadosDiarioColaborador}
            unidade="assinado"
            tendencia={tendencia}
            badgeTendencia={
              <span
                className="text-[10px] font-medium flex items-center gap-0.5 shrink-0"
                style={{ color: corTendencia }}
                title="Compara a 1ª metade com a 2ª metade dos assinados dos últimos 7 dias com dado."
              >
                <IconeTendencia size={10} /> {tendencia === 'subindo' ? 'Em alta' : tendencia === 'caindo' ? 'Em queda' : 'Estável'}
              </span>
            }
          />

          <BlocoMetricaMensal
            titulo="Protocolados por dia no mês"
            nomeColaborador={c.nome}
            serieAtual={serieProtocoladosUltimosDias}
            diasSerie={diasSerie}
            fetchDiario={fetchProtocoladosDiarioColaborador}
            corLinha="#3B82F6"
            unidade="protocolado"
            tendencia="estavel"
          />

          <BlocoMetricaMensal
            titulo="Venda Ganha por dia no mês"
            nomeColaborador={c.nome}
            serieAtual={serieVendaGanhaUltimosDias}
            diasSerie={diasSerie}
            fetchDiario={fetchVendaGanhaDiarioColaborador}
            corLinha="#8B5CF6"
            unidade="venda ganha"
            tendencia="estavel"
          />
        </div>
      )}

      <QuickActions aberto={aberto} onToggle={() => setAberto((v) => !v)} />
    </div>
  );
}
