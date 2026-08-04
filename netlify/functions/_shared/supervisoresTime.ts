/**
 * Supervisores restritos ao próprio time — login com um desses emails corporativos
 * embarca `time` no token (ver auth.ts), e todas as consultas ao banco filtram os
 * resultados só pro time correspondente (ver timesEquipe.ts). Quem não está nesta
 * lista (inclusive todo `role: 'master'`) continua vendo a empresa inteira.
 * Atualizar aqui conforme novos supervisores/coordenadores forem definidos.
 */
const EMAIL_PARA_TIME: Record<string, string> = {
  'felipe.uzuelli@madmbrasil.com.br': 'Equipe Felipe',
  'debora.russo@madmbrasil.com.br': 'Equipe Debora',
  'bruno.cruz@madmbrasil.com.br': 'Equipe Bruno',
  'amanda.camaforte@madmbrasil.com.br': 'Equipe Ribeirao',
  'gabriela.lima@madmbrasil.com.br': 'Equipe Ribeirao',
  'kleber.lucas@madmbrasil.com.br': 'Equipe Felipe',
};

export function buscarTimeRestrito(usuario: string): string | undefined {
  return EMAIL_PARA_TIME[usuario.trim().toLowerCase()];
}
