import type { PeriodoFiltro } from '@/types/domain';

/** Lista de datas ISO (YYYY-MM-DD) entre inicio e fim, inclusive — usada pra montar
 * séries diárias completas (com zero nos dias sem dado), não só os dias que vieram do banco.
 * Monta o `Date` a partir dos componentes (ano, mês, dia) em vez de `new Date(isoString)` —
 * esse construtor interpreta a string como UTC meia-noite, e em fuso negativo (Brasil, UTC-3)
 * isso "volta" um dia quando formatado com os getters locais (ex: "2026-08-01" virava "07-31"). */
export function listarDiasEntre(inicio: string, fim: string): string[] {
  const [anoI, mesI, diaI] = inicio.split('-').map(Number);
  const [anoF, mesF, diaF] = fim.split('-').map(Number);
  const dias: string[] = [];
  const cursor = new Date(anoI, mesI - 1, diaI);
  const fimData = new Date(anoF, mesF - 1, diaF);
  const pad = (n: number) => String(n).padStart(2, '0');
  while (cursor <= fimData) {
    dias.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

/** Mês anterior ao (ano, mês) informado — dia 01 até o último dia (mês fechado, sempre
 * completo). Usado pra desenhar a linha de comparação no gráfico de evolução. */
export function getMesAnterior(ano: number, mes: number) {
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const pad = (n: number) => String(n).padStart(2, '0');
  const ultimoDia = new Date(anoAnterior, mesAnterior, 0).getDate();
  return {
    inicio: `${anoAnterior}-${pad(mesAnterior)}-01`,
    fim: `${anoAnterior}-${pad(mesAnterior)}-${pad(ultimoDia)}`,
    label: `${MESES_LABEL[mesAnterior - 1]} de ${anoAnterior}`,
  };
}

const MESES_LABEL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** O "mês" de referência segue o mês do que está selecionado no calendário do topo (não
 * necessariamente o mês real de hoje) — se a diretoria filtrou "julho de 2026", telas como
 * Ranking e Evolução do colaborador têm que mostrar julho, não ficar quase vazias calculando
 * o mês real por baixo dos panos. Capado em "hoje" quando o mês selecionado é o mês corrente
 * (não faz sentido pedir dado de dias futuros). */
export function getPeriodoMesDoCalendario(inicioSelecionado: string) {
  const [ano, mes] = inicioSelecionado.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hoje = new Date();
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = ehMesAtual
    ? `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`
    : `${ano}-${pad(mes)}-${pad(ultimoDia)}`;
  return { inicio: `${ano}-${pad(mes)}-01`, fim, label: `${MESES_LABEL[mes - 1]} de ${ano}` };
}

/** Igual a `getPeriodoMesDoCalendario`, mas sem capar o fim em "hoje" — o mês inteiro, dia 1 ao
 * último dia, mesmo pro mês corrente (dias futuros simplesmente não têm dado nenhum). Usado no
 * mini-gráfico do Plano de Ação, que precisa mostrar a forma do mês completo, não só até hoje. */
export function getMesCompletoDoCalendario(inicioSelecionado: string) {
  const [ano, mes] = inicioSelecionado.split('-').map(Number);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return {
    inicio: `${ano}-${pad(mes)}-01`,
    fim: `${ano}-${pad(mes)}-${pad(ultimoDia)}`,
    label: `${MESES_LABEL[mes - 1]} de ${ano}`,
  };
}

export function contarDiasUteis(periodo: PeriodoFiltro): number {
  const inicio = new Date(periodo.inicio);
  const fim = new Date(periodo.fim);
  let count = 0;
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
