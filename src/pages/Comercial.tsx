import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { MetaAtingimentoChart, TaxaProtocoladosChart, RankingProdutividadeLollipop } from '@/components/charts/ProdutividadeWidgets';
import { KpiCard } from '@/components/kpi/KpiCard';
import { ResumoMesCard } from '@/components/kpi/ResumoMesCard';
import { useIntelligence } from '@/lib/useIntelligence';
import { calcularPaceProjecao } from '@/lib/diagnostico';
import { formatNumero, formatPct } from '@/lib/format';
import { Activity, FileStack, Gauge, TrendingUp } from 'lucide-react';

export default function Comercial() {
  const { kpi, colaboradores, diasUteisTotaisMes, diasUteisDecorridos, loading, error } = useIntelligence();

  const mediaAssinadosPorDia = colaboradores.length ? colaboradores.reduce((a, c) => a + c.produtividade, 0) / colaboradores.length : 0;
  const conversaoRecebidosAssinados = colaboradores.length ? colaboradores.reduce((a, c) => a + c.conversaoRecebidosAssinados, 0) / colaboradores.length : 0;

  const assinadosJudit = colaboradores.reduce((a, c) => a + c.assinadosJudit, 0);
  // METAS FIXAS: madm.view_relatorio_judit está com 0 linhas no banco agora, então
  // kpi.metaMensalEquipe vem 0. Combinado com a operação: usar os números oficiais do mês
  // (2.724 geral, 1.498 Judit) fixos enquanto isso — trocar assim que a view voltar a ter dado.
  const metaMensalGeral = kpi.metaMensalEquipe || 2724;
  const metaMensalJudit = kpi.metaMensalEquipe || 1498;

  const paceEquipe = calcularPaceProjecao(kpi.totalAssinados, metaMensalGeral, diasUteisDecorridos, diasUteisTotaisMes);
  const paceJudit = calcularPaceProjecao(assinadosJudit, metaMensalJudit, diasUteisDecorridos, diasUteisTotaisMes);

  if (loading) {
    return (
      <div>
        <PageHeader title="Comercial" description="Carregando dados do banco..." />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Comercial" description="Volume de produção comercial da equipe." />
        <Card className="text-sm text-red-600">{error}</Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Comercial" description="Volume de produção comercial da equipe e comparação entre colaboradores." />

      <div className="grid grid-cols-1 xl:grid-cols-6 gap-4 mb-6">
        <div className="xl:col-span-2">
          <ResumoMesCard titulo="Geral · Assinados" icon={Gauge} atual={kpi.totalAssinados} meta={metaMensalGeral} pace={paceEquipe} />
        </div>
        <div className="xl:col-span-2">
          <ResumoMesCard titulo="Judit · Assinados" icon={TrendingUp} atual={assinadosJudit} meta={metaMensalJudit} pace={paceJudit} />
        </div>
        <div className="xl:col-span-2 grid grid-cols-2 gap-4">
          <KpiCard titulo="Recebidos no período" valor={formatNumero(kpi.totalRecebidos)} icon={FileStack} accent="info" />
          <KpiCard titulo="Média por dia (assinados)" valor={`${mediaAssinadosPorDia.toFixed(1)}/dia`} icon={Gauge} accent="warning" />
          <KpiCard titulo="Conversão Recebidos → Assinados" valor={formatPct(conversaoRecebidosAssinados)} icon={TrendingUp} accent="brand" />
          <KpiCard titulo="Produtividade média" valor={`${kpi.produtividadeMedia.toFixed(1)}/dia`} icon={Activity} accent="warning" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Ranking de Produtividade</h3>
          <RankingProdutividadeLollipop colaboradores={colaboradores} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Atingimento de Meta</h3>
          <MetaAtingimentoChart colaboradores={colaboradores} />
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Taxa de Fechamento <span className="font-normal text-slate-400">· Protocolados + Venda Ganha</span></h3>
          <TaxaProtocoladosChart colaboradores={colaboradores} />
        </Card>
      </div>
    </div>
  );
}
