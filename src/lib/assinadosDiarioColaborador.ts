import { normalizarNome } from '@/lib/assinadosPeriodo';

export interface AssinadosDiarioColaboradorLinha {
  dia: string; // ISO (YYYY-MM-DD)
  total: number;
}

interface LinhaBruta {
  dia: string;
  consultor: string | null;
  total: string | number;
}

/** Tenta de novo antes de desistir — pico passageiro de conexão no banco não pode virar
 * gráfico vazio se uma segunda tentativa alguns segundos depois resolveria sozinha. */
async function fetchComRetry(url: string, token: string, tentativas = 3): Promise<any> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const dados = await resposta.json();
      if (resposta.ok && dados.ok) return dados;
      if (resposta.status < 500 || tentativa === tentativas) {
        throw new Error(dados.error ?? 'Não foi possível carregar a evolução do colaborador.');
      }
      ultimoErro = new Error(dados.error ?? 'Não foi possível carregar a evolução do colaborador.');
    } catch (err) {
      ultimoErro = err;
      if (tentativa === tentativas) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, tentativa * 800));
  }
  throw ultimoErro;
}

/** Assinados por dia de um único colaborador no intervalo — madm.view_app_emitidos_e_assinados
 * (data_assinatura), filtrado no cliente por nome normalizado (mesmo padrão do resto do app). */
export async function fetchAssinadosDiarioColaborador(token: string, nomeColaborador: string, inicio: string, fim: string): Promise<AssinadosDiarioColaboradorLinha[]> {
  const params = new URLSearchParams({ inicio, fim });
  const dados = await fetchComRetry(`/.netlify/functions/assinados-diario-colaborador?${params.toString()}`, token);

  const chave = normalizarNome(nomeColaborador);
  return (dados.dados as LinhaBruta[])
    .filter((l) => l.consultor && normalizarNome(l.consultor) === chave)
    .map((l) => ({
      dia: typeof l.dia === 'string' ? l.dia.slice(0, 10) : l.dia,
      total: typeof l.total === 'number' ? l.total : Number(l.total) || 0,
    }));
}
