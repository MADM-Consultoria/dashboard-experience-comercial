import type { AlertaInteligente, ColaboradorMetricas, NivelPrioridadeAlerta } from '@/types/domain';
import { normalizarNome } from '@/lib/assinadosPeriodo';

// Alinhado ao limiar de "atenção" de classificarStatus (src/lib/metrics.ts) — se o
// status já considera abaixo de 70% um problema, o motor de alertas precisa disparar
// no mesmo ponto, senão a tela do colaborador mostra "sem alerta" com status ruim.
const LIMIAR_TAXA_PROTOCOLADOS = 70;

// Norte definido junto com a operação: 20+ venda ganha no mês é o esperado ("bom", sem
// alerta); abaixo disso já preocupa; abaixo de 10 (metade do esperado) é crítico.
const VENDA_GANHA_BOM = 20;
const VENDA_GANHA_CRITICO = 10;

function prioridadePorTaxa(taxa: number): NivelPrioridadeAlerta {
  if (taxa < 45) return 'critico';
  if (taxa < 60) return 'alto';
  return 'medio';
}

function motivosProvaveis(colaborador: ColaboradorMetricas): string[] {
  const motivos: string[] = [];
  if (colaborador.conversaoAssinadosProtocolados < 60) {
    motivos.push('Demora no retorno do cliente após a assinatura.');
    motivos.push('Documentação incompleta impedindo o protocolo.');
  }
  if (colaborador.tendencia === 'caindo') {
    motivos.push('Baixo acompanhamento da carteira nas últimas semanas.');
  }
  if (colaborador.produtividade < colaborador.metaDiaria * 0.7) {
    motivos.push('Volume de casos abaixo do esperado, reduzindo o ritmo de protocolo.');
  }
  if (motivos.length === 0) motivos.push('Possível gargalo pontual em casos específicos da carteira.');
  return motivos;
}

function sugestoesAcao(colaborador: ColaboradorMetricas): string[] {
  const sugestoes = ['Revisar carteira de clientes assinados e não protocolados.', 'Entrar em contato novamente com os clientes pendentes.'];
  if (colaborador.tendencia === 'caindo') sugestoes.push('Agendar 1:1 para entender queda recente de performance.');
  sugestoes.push('Priorizar o fechamento de protocolos antes de captar novos clientes.');
  return sugestoes;
}

/**
 * `vendaGanhaMensal` é sempre a contagem do mês corrente (dia 01 até hoje), independente
 * do filtro de calendário selecionado na tela — mesmo padrão do "Melhor colaborador" do
 * Ranking, pra não gerar alerta de "venda ganha baixa" só porque o usuário filtrou 1 dia.
 */
export function gerarAlertas(colaboradores: ColaboradorMetricas[], vendaGanhaMensal: Map<string, number>): AlertaInteligente[] {
  const alertas: AlertaInteligente[] = [];

  for (const colaborador of colaboradores) {
    const vendaGanhaMes = vendaGanhaMensal.get(normalizarNome(colaborador.nome)) ?? 0;
    if (vendaGanhaMes < VENDA_GANHA_BOM) {
      alertas.push({
        id: `alerta-venda-ganha-${colaborador.id}`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        tipo: 'venda_ganha_baixa',
        prioridade: vendaGanhaMes < VENDA_GANHA_CRITICO ? 'critico' : 'alto',
        taxa: vendaGanhaMes,
        impacto: `${vendaGanhaMes} venda(s) ganha(s) no mês — abaixo do esperado de ${VENDA_GANHA_BOM}.`,
        possiveisMotivos: ['Volume de protocolos abaixo do necessário para gerar venda ganha.', 'Demora no fechamento dos casos já protocolados.'],
        sugestoesAcao: ['Revisar carteira de protocolados aguardando desfecho.', 'Priorizar casos com maior chance de fechamento este mês.'],
        criadoEm: new Date().toISOString(),
      });
    }

    if (colaborador.assinados === 0) continue;

    if (colaborador.conversaoAssinadosProtocolados < LIMIAR_TAXA_PROTOCOLADOS) {
      const casosPendentes = colaborador.assinados - colaborador.protocolados;
      alertas.push({
        id: `alerta-taxa-${colaborador.id}`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        tipo: 'taxa_protocolados_baixa',
        prioridade: prioridadePorTaxa(colaborador.conversaoAssinadosProtocolados),
        taxa: colaborador.conversaoAssinadosProtocolados,
        impacto: `${casosPendentes} contrato(s) assinado(s) ainda sem protocolo no período — abaixo do mínimo esperado de ${LIMIAR_TAXA_PROTOCOLADOS}%.`,
        possiveisMotivos: motivosProvaveis(colaborador),
        sugestoesAcao: sugestoesAcao(colaborador),
        criadoEm: new Date().toISOString(),
      });
    }

    if (colaborador.metaMensal > 0 && colaborador.atingimentoMetaMensal < 70) {
      alertas.push({
        id: `alerta-meta-${colaborador.id}`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        tipo: 'meta_comprometida',
        prioridade: colaborador.atingimentoMetaMensal < 50 ? 'critico' : 'alto',
        taxa: colaborador.atingimentoMetaMensal,
        impacto: `Meta do período atingida em apenas ${colaborador.atingimentoMetaMensal.toFixed(0)}%, comprometendo o resultado mensal da equipe.`,
        possiveisMotivos: ['Queda no volume de emissão.', 'Perda de conversão em alguma etapa do funil.'],
        sugestoesAcao: ['Redistribuir parte da carteira entre a equipe.', 'Definir plano de recuperação semanal com metas parciais.'],
        criadoEm: new Date().toISOString(),
      });
    }

    if (colaborador.tendencia === 'caindo' && colaborador.variacaoPeriodoAnterior < -15) {
      alertas.push({
        id: `alerta-queda-${colaborador.id}`,
        colaboradorId: colaborador.id,
        colaboradorNome: colaborador.nome,
        tipo: 'queda_produtividade',
        prioridade: 'alto',
        taxa: colaborador.variacaoPeriodoAnterior,
        impacto: `Produtividade caiu ${Math.abs(colaborador.variacaoPeriodoAnterior).toFixed(0)}% em relação ao período anterior.`,
        possiveisMotivos: ['Possível desmotivação ou sobrecarga.', 'Mudança no perfil de clientes atendidos.'],
        sugestoesAcao: ['Conversa individual de acompanhamento.', 'Avaliar necessidade de treinamento de reforço.'],
        criadoEm: new Date().toISOString(),
      });
    }
  }

  const prioridadeOrdem: Record<NivelPrioridadeAlerta, number> = { critico: 0, alto: 1, medio: 2 };
  return alertas.sort((a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade] || a.taxa - b.taxa);
}
