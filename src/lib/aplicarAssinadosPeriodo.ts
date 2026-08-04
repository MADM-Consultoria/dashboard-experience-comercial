import type { ColaboradorMetricas, NivelStatus } from '@/types/domain';
import { classificarStatus, pct } from '@/lib/metrics';
import { calcularPaceProjecao, classificarPace } from '@/lib/diagnostico';
import { normalizarNome } from '@/lib/assinadosPeriodo';

/**
 * Amostra mínima de assinados pra confiar 100% na Taxa de Protocolados no
 * score de eficiência. Com 1 assinado e 1 protocolado a taxa dá 100% (parece
 * "excelente"), mas é ruído estatístico, não desempenho real — sem isso
 * alguém com pouquíssima produção podia sair na frente no Ranking Geral só
 * por sorte de amostra pequena.
 */
export const VOLUME_MINIMO_CONFIANCA = 5;

/** Pior primeiro — usado pra combinar dois indicadores e ficar com o mais crítico dos dois. */
const SEVERIDADE: Record<NivelStatus, number> = { critico: 0, alerta: 1, atencao: 2, bom: 3, excelente: 4 };

function piorStatus(a: NivelStatus, b: NivelStatus): NivelStatus {
  return SEVERIDADE[a] <= SEVERIDADE[b] ? a : b;
}

/**
 * Substitui `recebidos` (por data_qualificacao), `assinados` (por
 * data_assinatura), `protocolados` (por data_protocolo_juridico_auditoria) e
 * `vendaGanha` (por data_ganho) de cada colaborador pelos totais reais do
 * período selecionado no calendário — todas vêm de madm.view_app_kommo_leads
 * / madm.view_app_emitidos_e_assinados — e recalcula em cascata tudo que
 * depende delas — conversões, eficiência, status — pra nenhum card/gráfico
 * ficar com números de bases diferentes entre si.
 *
 * O `status` final é o pior entre qualidade e pace (volume de assinados vs.
 * meta do mês) — nunca mais aparece "Excelente" na StatusPill enquanto o pace
 * está em alerta/crítico: os dois têm que concordar, porque pra quem lê o
 * dashboard "excelente" quer dizer bom nos dois sentidos, não só num deles.
 *
 * Qualidade = (Protocolados + Venda Ganha) / Assinados. Protocolados e Venda
 * Ganha são o mesmo tipo de desfecho — só que conduzido por equipes diferentes
 * (jurídico protocola, outros advogados fecham como venda ganha) — então os
 * dois contam igual pra fechar um caso assinado. Com poucos assinados no
 * período (< VOLUME_MINIMO_CONFIANCA), essa taxa não tem tempo/amostra
 * suficiente pra significar algo — por isso a qualidade não classifica pior
 * que "atenção" nesse caso, mesmo que a razão bruta dê baixa (ex.: quem
 * acabou de assinar um lote grande num único dia não teve chance ainda de
 * protocolar/fechar quase nada — isso é atraso de pipeline, não desempenho
 * ruim).
 */
export function ajustarColaboradoresParaPeriodo<T extends ColaboradorMetricas & { vendaGanha?: number; conversaoJudit?: number }>(
  colaboradores: T[],
  porNomeAssinados: Map<string, number>,
  porNomeRecebidos: Map<string, number>,
  porNomeProtocolados: Map<string, number>,
  porNomeVendaGanha: Map<string, number>,
  porNomeRecebidosJudit: Map<string, number>,
  porNomeAssinadosJudit: Map<string, number>,
  diasUteisDecorridos: number,
  diasUteisTotaisMes: number,
): T[] {
  return colaboradores.map((c) => {
    const chave = normalizarNome(c.nome);
    const recebidos = porNomeRecebidos.get(chave) ?? 0;
    const assinados = porNomeAssinados.get(chave) ?? 0;
    const protocolados = porNomeProtocolados.get(chave) ?? 0;
    const vendaGanha = porNomeVendaGanha.get(chave) ?? 0;
    // Conversão Judit: mesma definição oficial de assinados/recebidos Judit (sdr = 'Judit'),
    // não mais o valor estático de madm.view_relatorio_judit.
    const conversaoJudit = pct(porNomeAssinadosJudit.get(chave) ?? 0, porNomeRecebidosJudit.get(chave) ?? 0);
    const conversaoRecebidosAssinados = pct(assinados, recebidos);
    // Protocolados (jurídico) e Venda Ganha (outros advogados) são o mesmo desfecho final
    // de um caso assinado — contam juntos pra taxa de qualidade.
    const conversaoAssinadosProtocolados = pct(protocolados + vendaGanha, assinados);
    const atingimentoMetaMensal = pct(assinados, c.metaMensal);
    const confiancaVolume = Math.min(1, assinados / VOLUME_MINIMO_CONFIANCA);
    const eficiencia = Math.min(
      100,
      (Math.min(100, conversaoAssinadosProtocolados) * 0.55 + Math.min(100, atingimentoMetaMensal) * 0.3 + conversaoRecebidosAssinados * 0.15) *
        confiancaVolume,
    );

    let statusQualidade = classificarStatus(conversaoAssinadosProtocolados);
    // Amostra insuficiente pra confiar na taxa — nunca deixa cair pra alerta/crítico só por
    // pipeline ainda não ter tido tempo de processar (mesmo corte de VOLUME_MINIMO_CONFIANCA
    // usado no Ranking e na Eficiência acima).
    if (confiancaVolume < 1 && SEVERIDADE[statusQualidade] < SEVERIDADE.atencao) {
      statusQualidade = 'atencao';
    }
    let status = statusQualidade;
    if (c.metaMensal > 0) {
      const pace = calcularPaceProjecao(assinados, c.metaMensal, diasUteisDecorridos, diasUteisTotaisMes);
      const statusPace = classificarPace(pace, c.metaMensal);
      status = piorStatus(statusQualidade, statusPace);
    }

    return {
      ...c,
      recebidos,
      assinados,
      protocolados,
      vendaGanha,
      conversaoRecebidosAssinados,
      conversaoAssinadosProtocolados,
      conversaoGeral: conversaoRecebidosAssinados,
      conversaoJudit,
      atingimentoMetaMensal,
      eficiencia,
      status,
    };
  });
}
