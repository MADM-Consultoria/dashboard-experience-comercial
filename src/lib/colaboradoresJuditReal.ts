import { normalizarNome } from '@/lib/assinadosPeriodo';

/**
 * Quem realmente faz parte do time Judit hoje, segundo SELECT em madm.kommo_leads
 * (coluna sdr = 'Judit', responsável do lead) no período de 01/07 até a data da
 * conferência — a coluna "Classificação Operacional" de madm.view_relatorio_judit está
 * desatualizada pra algumas dessas pessoas (aparecem como "Discadora" mesmo trabalhando
 * majoritariamente com leads Judit). Lista confirmada manualmente com a operação, porque o
 * % de leads Judit por responsável não tem um corte natural que separe os dois grupos sozinho
 * (varia de forma contínua de ~20% a 100% entre todo mundo que já pegou algum lead Judit).
 */
const NOMES_JUDIT_REAL = new Set(
  [
    'Fabiana Cristina da Silva Rodrigues',
    'Hana Carolina Pereira do Nascimento',
    'Bianca Fernandes Ferreira',
    'Gabriela Porfirio',
    'Tabata Juliana Ferreira de Lima',
    'Giovana Bueno Silva',
    'Igor Silva dos Santos',
    'Larissa Tayna Silva dos Santos',
    'Rayssa Oliveira da Silva',
    'Thamires Lemos Bernardes Mantello',
  ].map(normalizarNome),
);

export function ehJuditReal(nome: string): boolean {
  return NOMES_JUDIT_REAL.has(normalizarNome(nome));
}
