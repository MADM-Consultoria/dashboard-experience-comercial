import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { criarColaboradorSintetico, fetchRelatorioJudit, mapRowParaColaborador, type ColaboradorReal } from '@/lib/relatorioJudit';
import { listarAtivos } from '@/lib/colaboradoresAtivos';
import { normalizarNome } from '@/lib/assinadosPeriodo';
import { useAuth } from '@/context/AuthContext';

interface RelatorioContextValue {
  colaboradores: ColaboradorReal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const RelatorioContext = createContext<RelatorioContextValue | null>(null);

/**
 * Busca a view do banco UMA VEZ por sessão (não a cada troca de página) e
 * compartilha entre todas as telas via contexto. Antes, cada página chamava
 * useIntelligence() de forma independente e refazia a consulta no banco a
 * cada navegação — isso deixava a troca de tela lenta e gerava consultas
 * repetidas desnecessárias.
 */
export function RelatorioProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth();
  const [colaboradores, setColaboradores] = useState<ColaboradorReal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!sessao) return;
    let cancelado = false;

    setLoading(true);
    fetchRelatorioJudit(sessao.token)
      .then((rows) => {
        if (cancelado) return;
        const doRelatorio = rows.map(mapRowParaColaborador);
        // Quem está na lista de ativos mas ainda não foi sincronizado em
        // view_relatorio_judit precisa ser sintetizado, senão os números reais
        // de Recebidos/Assinados/Protocolados dessa pessoa ficam invisíveis.
        const nomesNoRelatorio = new Set(doRelatorio.map((c) => normalizarNome(c.nome)));
        // Supervisor restrito: a view já veio filtrada pro time dele (ver relatorio-judit.ts),
        // então só sintetiza gente do MESMO time — senão vazaria nome de outros times aqui.
        const sinteticos = listarAtivos()
          .filter((a) => !nomesNoRelatorio.has(normalizarNome(a.nome)))
          .filter((a) => !sessao.time || a.time === sessao.time)
          .map(criarColaboradorSintetico);
        setColaboradores([...doRelatorio, ...sinteticos]);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sessao, versao]);

  return (
    <RelatorioContext.Provider value={{ colaboradores, loading, error, refetch: () => setVersao((v) => v + 1) }}>
      {children}
    </RelatorioContext.Provider>
  );
}

export function useRelatorio() {
  const ctx = useContext(RelatorioContext);
  if (!ctx) throw new Error('useRelatorio deve ser usado dentro de RelatorioProvider');
  return ctx;
}
