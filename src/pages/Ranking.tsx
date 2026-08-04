import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useIntelligence } from '@/lib/useIntelligence';
import { useDataSelecionada } from '@/context/DataSelecionadaContext';
import { getPeriodoMesDoCalendario } from '@/lib/period';
import { calcularRanking, LABEL_RANKING } from '@/lib/ranking';
import type { RankingItem, TipoRanking } from '@/types/domain';
import { formatNumero, formatPct, MEDALHA_COR, MEDALHA_ICON, MEDALHA_LABEL } from '@/lib/format';
import { estaDeFerias } from '@/lib/colaboradoresEmFerias';
import { ehSupervisor } from '@/lib/colaboradoresAtivos';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

const TIPOS: TipoRanking[] = ['geral', 'conversao', 'protocolados', 'assinados'];

function formatarValor(tipo: TipoRanking, valor: number): string {
  if (tipo === 'conversao' || tipo === 'evolucao') return `${valor >= 0 && tipo === 'evolucao' ? '+' : ''}${formatPct(valor)}`;
  if (tipo === 'eficiencia' || tipo === 'geral') return valor.toFixed(0);
  return formatNumero(valor);
}

// 2º e 3º com a mesma altura de degrau — mantém os avatares deles alinhados,
// só o 1º fica mais alto pra destacar.
const PODIO_ESTILO = {
  1: { altura: 'h-32', cor: '#f59e0b', gradiente: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 100%)', ordem: 'order-2' },
  2: { altura: 'h-24', cor: '#94a3b8', gradiente: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)', ordem: 'order-1' },
  3: { altura: 'h-24', cor: '#c2703d', gradiente: 'linear-gradient(180deg, #fed7aa 0%, #ea9a5f 100%)', ordem: 'order-3' },
} as const;

function CardPodio({ item, tipo }: { item: RankingItem; tipo: TipoRanking }) {
  const posicao = item.posicao as 1 | 2 | 3;
  const estilo = PODIO_ESTILO[posicao];

  return (
    <div className={clsx('flex flex-col items-center', estilo.ordem)}>
      <Link to={`/colaboradores/${item.colaborador.id}`} className="flex flex-col items-center group w-28 md:w-36">
        <Avatar nome={item.colaborador.nome} size={posicao === 1 ? 56 : 44} />
        <span className="mt-2 text-[13px] font-semibold text-slate-800 text-center group-hover:underline">
          {item.colaborador.nome}
        </span>
        <span className="text-[11px] text-slate-500">{item.colaborador.time}</span>
        <span className="text-sm font-bold mt-1" style={{ color: estilo.cor }}>
          {formatarValor(tipo, item.valor)}
        </span>
      </Link>
      <div
        className={clsx('w-24 md:w-28 mt-3 rounded-t-lg flex flex-col items-center justify-start pt-3 gap-1.5 shadow-lg', estilo.altura)}
        style={{ borderTop: `3px solid ${estilo.cor}`, background: estilo.gradiente, boxShadow: `0 8px 20px -6px ${estilo.cor}66` }}
      >
        <span className="text-2xl font-bold leading-none" style={{ color: estilo.cor }}>{posicao}º</span>
        {(() => {
          const IconeMedalha = MEDALHA_ICON[item.medalha];
          return <IconeMedalha size={24} style={{ color: MEDALHA_COR[item.medalha] }} />;
        })()}
      </div>
    </div>
  );
}

export default function Ranking() {
  // Ranking sempre reflete o MÊS INTEIRO (não um dia/intervalo curto) — mas o mês em
  // questão é o mesmo que está selecionado no calendário do topo, pra não divergir do
  // que a pessoa filtrou pra olhar.
  const { inicio: inicioSelecionado } = useDataSelecionada();
  const periodoMes = useMemo(() => getPeriodoMesDoCalendario(inicioSelecionado), [inicioSelecionado]);
  const { colaboradores } = useIntelligence(periodoMes);
  const [tipo, setTipo] = useState<TipoRanking>('geral');
  // Ranking é sobre quem está na operação hoje — ex-funcionário continua contando nos
  // totais da empresa (Visão Geral), mas não faz sentido competir num ranking atual.
  const ativos = colaboradores.filter((c) => c.ativo && !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor') && !estaDeFerias(c.nome));
  const ranking = calcularRanking(ativos, tipo);

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div>
      <PageHeader title="Ranking" description={`Comparativo de performance da equipe em ${periodoMes.label}, sob diferentes perspectivas.`} />

      <div className="flex flex-wrap gap-2 mb-6">
        {TIPOS.map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-colors',
              tipo === t ? 'bg-blue-500/15 border-blue-500/40 text-blue-700' : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
            )}
          >
            {LABEL_RANKING[t]}
          </button>
        ))}
      </div>

      {podio.length === 3 && (
        <Card className="mb-6">
          <div className="flex items-end justify-center gap-8 md:gap-16">
            {podio.map((item) => (
              <CardPodio key={item.colaborador.id} item={item} tipo={tipo} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-medium w-16">#</th>
                <th className="py-2 pr-4 font-medium">Colaborador</th>
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">{LABEL_RANKING[tipo]}</th>
                <th className="py-2 pr-4 font-medium">Medalha</th>
              </tr>
            </thead>
            <tbody>
              {resto.map((item) => (
                <tr key={item.colaborador.id} className="border-b border-slate-200/60 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 text-slate-500 font-semibold">{item.posicao}º</td>
                  <td className="py-2.5 pr-4">
                    <Link to={`/colaboradores/${item.colaborador.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar nome={item.colaborador.nome} size={28} />
                      <span className="text-slate-700">{item.colaborador.nome}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">{item.colaborador.time}</td>
                  <td className="py-2.5 pr-4 text-slate-700 font-semibold">{formatarValor(tipo, item.valor)}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      {(() => {
                        const IconeMedalha = MEDALHA_ICON[item.medalha];
                        return <IconeMedalha size={15} style={{ color: MEDALHA_COR[item.medalha] }} />;
                      })()}
                      {MEDALHA_LABEL[item.medalha]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
