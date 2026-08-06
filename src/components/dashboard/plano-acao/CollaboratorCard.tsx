import { useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
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

interface PontoComparativo {
  dia: number;
  atual: number;
  anterior: number;
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
  const { sessao } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [comparativoAberto, setComparativoAberto] = useState(false);
  const [comparativoCarregando, setComparativoCarregando] = useState(false);
  const [comparativoDados, setComparativoDados] = useState<PontoComparativo[] | null>(null);
  const [labelMesAnterior, setLabelMesAnterior] = useState('');
  const { banda } = calcularClassificacao(c, media);
  // Tooltip explica o que define a classificação dessa pessoa — sem expor um número de score
  // à parte que precisaria de fórmula própria pra alguém questionar.
  const tituloClassificacao = 'Classificação definida por Assinados (peso 50%), Protocolados (peso 25%) e Venda Ganha (peso 25%), cada um comparado com a meta ou a média da equipe.';
  const tendencia = calcularTendenciaSerie(serieUltimosDias);
  const recomendacoes = gerarRecomendacoesIA(c, media, diasUteisPeriodo, tendencia, banda, serieUltimosDias);

  const IconeTendencia = tendencia === 'subindo' ? ArrowUp : tendencia === 'caindo' ? ArrowDown : Minus;
  const corTendencia = tendencia === 'subindo' ? '#22C55E' : tendencia === 'caindo' ? '#EF4444' : '#94A3B8';

  // Comparativo Assinados: mês atual x mês passado, buscado só quando a pessoa clica (não faz
  // sentido puxar isso pra todo mundo de cara — a maioria nunca vai abrir). `diasSerie` já é o
  // mês inteiro do período selecionado (dia 1 ao último dia), então o mês/ano de referência vem
  // do primeiro dia dela. Alinha pelo número do dia (1, 2, 3...), não pela data literal, mesmo
  // padrão do gráfico de evolução do colaborador.
  async function alternarComparativo() {
    if (comparativoAberto) {
      setComparativoAberto(false);
      return;
    }
    setComparativoAberto(true);
    if (comparativoDados || comparativoCarregando || !sessao || diasSerie.length === 0) return;
    setComparativoCarregando(true);
    try {
      const [ano, mes] = diasSerie[0].split('-').map(Number);
      const mesAnterior = getMesAnterior(ano, mes);
      const diasAnterior = listarDiasEntre(mesAnterior.inicio, mesAnterior.fim);
      const linhasAnterior = await fetchAssinadosDiarioColaborador(sessao.token, c.nome, mesAnterior.inicio, mesAnterior.fim);
      const porDiaAnterior = new Map(linhasAnterior.map((l) => [l.dia, l.total]));
      const totalDias = Math.max(diasSerie.length, diasAnterior.length);
      const combinado: PontoComparativo[] = Array.from({ length: totalDias }, (_, indice) => ({
        dia: indice + 1,
        atual: diasSerie[indice] ? serieUltimosDias[indice] ?? 0 : 0,
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
            <p className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 leading-snug rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 p-3">
              <Sparkles size={12} className="text-blue-500 mt-0.5 shrink-0" />
              {recomendacoes[0]}
            </p>
          )}

          {/* Tendência do mês (dia 1 até hoje) — passe o cursor sobre a linha pra ver o dia e o valor de cada ponto */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
              <p className="text-[10px] text-slate-500">Assinados por dia no mês</p>
              <div className="flex items-center gap-2">
                {!comparativoAberto && (
                  <span
                    className="text-[10px] font-medium flex items-center gap-0.5 shrink-0"
                    style={{ color: corTendencia }}
                    title="Compara a 1ª metade com a 2ª metade dos assinados dos últimos 7 dias com dado."
                  >
                    <IconeTendencia size={10} /> {tendencia === 'subindo' ? 'Em alta' : tendencia === 'caindo' ? 'Em queda' : 'Estável'}
                  </span>
                )}
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

            {!comparativoAberto && <Sparkline serie={serieUltimosDias} dias={diasSerie} tendencia={tendencia} />}

            {comparativoAberto && comparativoCarregando && (
              <div className="h-[140px] flex items-center justify-center text-[11px] text-slate-400">Carregando comparativo...</div>
            )}

            {comparativoAberto && !comparativoCarregando && comparativoDados && comparativoDados.length > 0 && (
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
                    <Legend
                      formatter={(value) => (value === 'atual' ? 'Este mês' : labelMesAnterior)}
                      wrapperStyle={{ fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="anterior" name="anterior" stroke="#f97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="atual" name="atual" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {comparativoAberto && !comparativoCarregando && comparativoDados?.length === 0 && (
              <p className="text-[11px] text-slate-400 py-4 text-center">Não foi possível carregar o mês passado agora.</p>
            )}
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
