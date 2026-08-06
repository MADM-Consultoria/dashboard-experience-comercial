import { normalizarNome } from '@/lib/assinadosPeriodo';

export interface ProtocoladosDiarioColaboradorLinha {
  dia: string; // ISO (YYYY-MM-DD)
  total: number;
}

interface LinhaBruta {
  dia: string;
  consultor: string | null;
  total: string | number;
}

/** Tenta de novo antes de desistir — pico passageiro de conexão no banco não pode virar
 * indicador vazio se uma segunda tentativa alguns segundos depois resolveria sozinha. */
async function fetchComRetry(url: string, token: string, tentativas = 3): Promise<any> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json();
      if (resposta.ok && dados.ok) return dados;
      if (resposta.status < 500 || tentativa === tentativas) {
        throw new Error(dados.error ?? 'Não foi possível carregar os protocolados do colaborador.');
      }
      ultimoErro = new Error(dados.error ?? 'Não foi possível carregar os protocolados do colaborador.');
    } catch (err) {
      ultimoErro = err;
      if (tentativa === tentativas) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, tentativa * 800));
  }
  throw ultimoErro;
}

/** Protocolados por dia de um único colaborador no intervalo — mesma view de
 * fetchProtocoladosDiarioTodos, filtrado no cliente por nome normalizado (mesmo padrão de
 * fetchAssinadosDiarioColaborador). Usado no comparativo mês atual x mês passado do card do
 * Plano de Ação, buscado só quando a pessoa pede (não teria sentido buscar pra todo mundo de
 * cara, já que a maioria nunca abre o comparativo). */
export async function fetchProtocoladosDiarioColaborador(token: string, nomeColaborador: string, inicio: string, fim: string): Promise<ProtocoladosDiarioColaboradorLinha[]> {
  const params = new URLSearchParams({ inicio, fim });
  const dados = await fetchComRetry(`/api/protocolados-diario-colaborador?${params.toString()}`, token);

  const chave = normalizarNome(nomeColaborador);
  return (dados.dados as LinhaBruta[])
    .filter((l) => l.consultor && normalizarNome(l.consultor) === chave)
    .map((l) => ({
      dia: typeof l.dia === 'string' ? l.dia.slice(0, 10) : l.dia,
      total: typeof l.total === 'number' ? l.total : Number(l.total) || 0,
    }));
}

/** Mesma consulta, mas devolve TODO MUNDO agrupado por nome normalizado — usada quando
 * precisamos da série diária de vários colaboradores ao mesmo tempo (ritmo diário de
 * Protocolados no Plano de Ação). Uma chamada só ao banco em vez de uma por colaborador exibido. */
export async function fetchProtocoladosDiarioTodos(token: string, inicio: string, fim: string): Promise<Map<string, ProtocoladosDiarioColaboradorLinha[]>> {
  const params = new URLSearchParams({ inicio, fim });
  const dados = await fetchComRetry(`/api/protocolados-diario-colaborador?${params.toString()}`, token);

  const porConsultor = new Map<string, ProtocoladosDiarioColaboradorLinha[]>();
  for (const l of dados.dados as LinhaBruta[]) {
    if (!l.consultor) continue;
    const chave = normalizarNome(l.consultor);
    const linha = { dia: typeof l.dia === 'string' ? l.dia.slice(0, 10) : l.dia, total: typeof l.total === 'number' ? l.total : Number(l.total) || 0 };
    if (!porConsultor.has(chave)) porConsultor.set(chave, []);
    porConsultor.get(chave)!.push(linha);
  }
  return porConsultor;
}
