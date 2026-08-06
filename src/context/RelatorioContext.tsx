import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { criarColaboradorSintetico, type ColaboradorReal } from '@/lib/relatorioJudit';
import { listarAtivos } from '@/lib/colaboradoresAtivos';
import { useAuth } from '@/context/AuthContext';

interface RelatorioContextValue {
  colaboradores: ColaboradorReal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const RelatorioContext = createContext<RelatorioContextValue | null>(null);

/**
 * Monta a lista de colaboradores a partir do cadastro (src/lib/colaboradoresAtivos.ts), UMA VEZ
 * por sessão, compartilhada entre todas as telas via contexto — igual antes.
 *
 * madm.view_relatorio_judit (relatório mensal fechado, cargo/meta por colaborador) não é mais
 * usada: a operação decidiu não seguir com ela. Todo colaborador ativo entra "sintético" (sem
 * cargo/meta vindos dessa view) — os números reais de Recebidos/Assinados/Protocolados/Venda
 * Ganha continuam vindo certos via useIntelligence, que casa por nome com as views de período
 * (madm.view_app_kommo_leads / madm.view_app_emitidos_e_assinados), não com essa view mensal.
 */
export function RelatorioProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth();
  const [colaboradores, setColaboradores] = useState<ColaboradorReal[]>([]);

  useEffect(() => {
    if (!sessao) return;
    // Supervisor restrito: só vê o próprio time.
    const doTime = listarAtivos()
      .filter((a) => !sessao.time || a.time === sessao.time)
      .map(criarColaboradorSintetico);
    setColaboradores(doTime);
  }, [sessao]);

  return (
    <RelatorioContext.Provider value={{ colaboradores, loading: false, error: null, refetch: () => {} }}>
      {children}
    </RelatorioContext.Provider>
  );
}

export function useRelatorio() {
  const ctx = useContext(RelatorioContext);
  if (!ctx) throw new Error('useRelatorio deve ser usado dentro de RelatorioProvider');
  return ctx;
}
