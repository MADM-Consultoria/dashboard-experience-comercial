import { useEffect, useMemo, useState } from 'react';
import { calcularKpiEquipe, pct } from '@/lib/metrics';
import { calcularRanking } from '@/lib/ranking';
import { gerarAlertas } from '@/lib/alerts';
import { gerarInsights } from '@/lib/insights';
import { calcularFunilEquipe, detectarGargalos } from '@/lib/bottlenecks';
import { contarDiasUteis } from '@/lib/period';
import { ajustarColaboradoresParaPeriodo } from '@/lib/aplicarAssinadosPeriodo';
import { estaDeFerias } from '@/lib/colaboradoresEmFerias';
import { ehSupervisor } from '@/lib/colaboradoresAtivos';
import {
  fetchAssinadosJuditPeriodo,
  fetchAssinadosPeriodo,
  fetchProtocoladosPeriodo,
  fetchRecebidosJuditPeriodo,
  fetchRecebidosPeriodo,
  fetchVendaGanhaPeriodo,
  type ContagemPeriodo,
} from '@/lib/assinadosPeriodo';
import { useRelatorio } from '@/context/RelatorioContext';
import { useAuth } from '@/context/AuthContext';
import { useDataSelecionada } from '@/context/DataSelecionadaContext';

const CONTAGEM_VAZIA: ContagemPeriodo = { totalBruto: 0, porConsultor: new Map() };

/** Mês calendário corrente — usado só para o cálculo de dias úteis decorridos (pace). */
export function getPeriodoMesAtualReal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    inicio: `${ano}-${pad(mes)}-01`,
    fim: `${ano}-${pad(mes)}-${pad(ultimoDia)}`,
    fimHoje: `${ano}-${pad(mes)}-${pad(hoje.getDate())}`,
    label: 'Mês atual',
  };
}

/**
 * Hook central da plataforma: computa KPIs, alertas, insights, funil e gargalos
 * a partir dos colaboradores já buscados uma única vez por RelatorioProvider
 * (src/context/RelatorioContext.tsx) — nenhuma página busca no banco por conta
 * própria, só reaproveita o que já está em memória.
 *
 * Os totais da empresa (Recebidos/Assinados/Protocolados/Venda Ganha) vêm do
 * `totalBruto` de cada consulta — a mesma contagem de uma conferência manual
 * (`select count(*) from view_app_kommo_leads where data_x between ...`), sem
 * agrupar por consultor. Nunca somamos por colaborador pra chegar no total da
 * empresa: isso sempre vai divergir, porque nem toda linha tem um responsável
 * que a gente consiga casar por nome com madm.view_relatorio_judit. O
 * agrupamento por consultor (`porConsultor`) só alimenta as telas por pessoa
 * (Equipe, Plano de Ação, Ranking), onde essa perda é aceitável.
 */
export function useIntelligence(periodoFixo?: { inicio: string; fim: string; label: string }) {
  const { colaboradores: colaboradoresBase, loading: loadingRelatorio, error: errorRelatorio } = useRelatorio();
  const { sessao } = useAuth();
  const periodoSelecionadoCalendario = useDataSelecionada();
  const { inicio, fim, label: labelPeriodo } = periodoFixo ?? periodoSelecionadoCalendario;

  const [assinadosPeriodo, setAssinadosPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [recebidosPeriodo, setRecebidosPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [protocoladosPeriodo, setProtocoladosPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [vendaGanhaPeriodo, setVendaGanhaPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [assinadosJuditPeriodo, setAssinadosJuditPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [recebidosJuditPeriodo, setRecebidosJuditPeriodo] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [vendaGanhaMesAtual, setVendaGanhaMesAtual] = useState<ContagemPeriodo>(CONTAGEM_VAZIA);
  const [loadingPeriodo, setLoadingPeriodo] = useState(true);
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null);

  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    setLoadingPeriodo(true);
    setErrorPeriodo(null);
    Promise.all([
      fetchAssinadosPeriodo(sessao.token, inicio, fim),
      fetchRecebidosPeriodo(sessao.token, inicio, fim),
      fetchProtocoladosPeriodo(sessao.token, inicio, fim),
      fetchVendaGanhaPeriodo(sessao.token, inicio, fim),
      fetchAssinadosJuditPeriodo(sessao.token, inicio, fim),
      fetchRecebidosJuditPeriodo(sessao.token, inicio, fim),
    ])
      .then(([assinados, recebidos, protocolados, vendaGanha, assinadosJudit, recebidosJudit]) => {
        if (!cancelado) {
          setAssinadosPeriodo(assinados);
          setRecebidosPeriodo(recebidos);
          setProtocoladosPeriodo(protocolados);
          setVendaGanhaPeriodo(vendaGanha);
          setAssinadosJuditPeriodo(assinadosJudit);
          setRecebidosJuditPeriodo(recebidosJudit);
        }
      })
      .catch((err) => {
        if (!cancelado) setErrorPeriodo(err instanceof Error ? err.message : 'Erro ao carregar os dados do período.');
      })
      .finally(() => {
        if (!cancelado) setLoadingPeriodo(false);
      });
    return () => {
      cancelado = true;
    };
  }, [sessao, inicio, fim]);

  const periodoMes = getPeriodoMesAtualReal();

  // Alerta de "venda ganha baixa" sempre olha pro mês corrente, independente de qual
  // período essa chamada do hook representa (calendário selecionado ou mês fixo) — nada
  // de alerta oscilando porque o usuário filtrou o calendário pra 1 dia específico.
  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;
    fetchVendaGanhaPeriodo(sessao.token, periodoMes.inicio, periodoMes.fimHoje)
      .then((valor) => {
        if (!cancelado) setVendaGanhaMesAtual(valor);
      })
      .catch(() => {
        if (!cancelado) setVendaGanhaMesAtual(CONTAGEM_VAZIA);
      });
    return () => {
      cancelado = true;
    };
  }, [sessao, periodoMes.inicio, periodoMes.fimHoje]);
  const diasUteisTotaisMes = contarDiasUteis({ inicio: periodoMes.inicio, fim: periodoMes.fim, label: periodoMes.label });
  const diasUteisDecorridos = contarDiasUteis({ inicio: periodoMes.inicio, fim: periodoMes.fimHoje, label: periodoMes.label });

  const { colaboradores, kpi, alertas, insights, funil, gargalos, vendaGanhaTotal } = useMemo(() => {
    const colaboradores = ajustarColaboradoresParaPeriodo(
      colaboradoresBase,
      assinadosPeriodo.porConsultor,
      recebidosPeriodo.porConsultor,
      protocoladosPeriodo.porConsultor,
      vendaGanhaPeriodo.porConsultor,
      recebidosJuditPeriodo.porConsultor,
      assinadosJuditPeriodo.porConsultor,
      diasUteisDecorridos,
      diasUteisTotaisMes,
    );
    // Totais (kpi) somam TODO MUNDO — quem desligou continua contando pro resultado da empresa.
    // Alertas/insights/gargalos e "melhor colaborador"/"precisa de atenção" olham só pra quem
    // está ativo hoje, não é supervisor e não está de férias — não faz sentido gerar plano de
    // ação ou destaque pra alguém que já não está na operação ou que só produziu pouco porque
    // estava fora nesse período.
    const ativos = colaboradores.filter((c) => c.ativo && !ehSupervisor(c.nome) && !c.cargo.toLowerCase().includes('supervisor') && !estaDeFerias(c.nome));
    const kpi = calcularKpiEquipe(colaboradores, diasUteisDecorridos);

    // Substitui os totais agregados pelo totalBruto (conferível direto no banco) — não pela soma
    // por colaborador, que sempre vai ficar menor por causa de linha sem responsável reconhecido.
    kpi.totalRecebidos = recebidosPeriodo.totalBruto;
    kpi.totalAssinados = assinadosPeriodo.totalBruto;
    kpi.totalProtocolados = protocoladosPeriodo.totalBruto;
    kpi.taxaConversaoGeral = pct(kpi.totalProtocolados, kpi.totalRecebidos);
    kpi.taxaProtocolados = pct(kpi.totalProtocolados, kpi.totalAssinados);

    // Assinados/Recebidos Judit: definição oficial via madm.kommo_leads.sdr = 'Judit' — não
    // mais a aproximação por canal/cargo do colaborador nem o valor estático de
    // madm.view_relatorio_judit (não usamos mais essa view pra conversão Judit).
    kpi.totalAssinadosJudit = assinadosJuditPeriodo.totalBruto;
    kpi.totalRecebidosJudit = recebidosJuditPeriodo.totalBruto;

    const kpiAtivos = calcularKpiEquipe(ativos, diasUteisDecorridos);
    // "Melhor colaborador" tem que ser sempre o mesmo nome do 1º lugar do Ranking Geral
    // (que ordena por assinados no mês) — nada de um critério diferente aqui que possa
    // divergir do que a tela de Ranking mostra.
    const rankingGeralAtivos = calcularRanking(ativos, 'geral');
    kpi.melhorColaborador = rankingGeralAtivos[0]?.colaborador ?? kpiAtivos.melhorColaborador;
    kpi.colaboradorAtencao = kpiAtivos.colaboradorAtencao;
    const alertas = gerarAlertas(ativos, vendaGanhaMesAtual.porConsultor);
    const insights = gerarInsights(ativos, kpi);
    const funil = calcularFunilEquipe(kpi);
    const gargalos = detectarGargalos(ativos, kpi);
    return { colaboradores, kpi, alertas, insights, funil, gargalos, vendaGanhaTotal: vendaGanhaPeriodo.totalBruto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradoresBase, assinadosPeriodo, recebidosPeriodo, protocoladosPeriodo, vendaGanhaPeriodo, assinadosJuditPeriodo, recebidosJuditPeriodo, vendaGanhaMesAtual, diasUteisDecorridos, diasUteisTotaisMes]);

  return {
    periodo: periodoMes,
    periodoSelecionado: { inicio, fim, label: labelPeriodo },
    diasUteisTotaisMes,
    diasUteisDecorridos,
    colaboradores,
    kpi,
    vendaGanhaTotal,
    alertas,
    insights,
    funil,
    gargalos,
    loading: loadingRelatorio || loadingPeriodo,
    error: errorRelatorio ?? errorPeriodo,
  };
}
