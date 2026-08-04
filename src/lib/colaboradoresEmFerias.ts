import { normalizarNome } from '@/lib/assinadosPeriodo';

/**
 * Colaboradores de férias no momento — não fazem sentido em Alertas, Gargalos,
 * Plano de Ação ou Ranking (são listas de "quem precisa de atenção" ou "quem
 * está competindo"), já que a baixa produção é esperada, não um problema real.
 * Continuam aparecendo normalmente em Equipe e no card individual, com os
 * números reais do período (geralmente perto de zero, o que é o esperado).
 *
 * Atualizar aqui sempre que alguém sair ou voltar de férias — remover o nome
 * assim que a pessoa retornar.
 */
const EM_FERIAS = ['Alessandra Silva Grob'];

const EM_FERIAS_NORMALIZADOS = new Set(EM_FERIAS.map(normalizarNome));

export function estaDeFerias(nome: string): boolean {
  return EM_FERIAS_NORMALIZADOS.has(normalizarNome(nome));
}
