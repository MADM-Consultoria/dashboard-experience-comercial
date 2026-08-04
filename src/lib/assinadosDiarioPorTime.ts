export interface AssinadosDiarioLinha {
  dia: string; // ISO (YYYY-MM-DD)
  time: string;
  total: number;
}

interface LinhaBruta {
  dia: string;
  equipe: string | null;
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
        throw new Error(dados.error ?? 'Não foi possível carregar a evolução das equipes.');
      }
      ultimoErro = new Error(dados.error ?? 'Não foi possível carregar a evolução das equipes.');
    } catch (err) {
      ultimoErro = err;
      if (tentativa === tentativas) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, tentativa * 800));
  }
  throw ultimoErro;
}

/** Assinados por dia e por time no intervalo — madm.view_app_emitidos_e_assinados (data_assinatura). */
export async function fetchAssinadosDiarioPorTime(token: string, inicio: string, fim: string): Promise<AssinadosDiarioLinha[]> {
  const params = new URLSearchParams({ inicio, fim });
  const dados = await fetchComRetry(`/.netlify/functions/assinados-diario-por-time?${params.toString()}`, token);

  return (dados.dados as LinhaBruta[])
    .filter((l) => l.equipe)
    .map((l) => ({
      dia: typeof l.dia === 'string' ? l.dia.slice(0, 10) : l.dia,
      time: l.equipe as string,
      total: typeof l.total === 'number' ? l.total : Number(l.total) || 0,
    }));
}
