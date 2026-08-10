/**
 * Mapeamento consultor → time, usado para restringir supervisores (ver
 * `supervisoresTime.ts`) aos dados só do próprio time — em todas as consultas
 * ao banco, não só na tela. Mesma lista de `src/lib/colaboradoresAtivos.ts`
 * (mantida em espelho aqui porque funções do Netlify não importam de `src/`).
 * Atualizar aqui sempre que a equipe mudar.
 */
function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOME_PARA_TIME: Record<string, string> = {
  'Bruno do Carmo da Cruz': 'Equipe Bruno',
  'Alex Sandro Ricardo de Horatorio Soterio': 'Equipe Bruno',
  'Carlos Vinicius Rodrigues da Silva': 'Equipe Bruno',
  'Fabiana Cristina da Silva Rodrigues': 'Equipe Bruno',
  'Gabriela Oliveira Guimarães': 'Equipe Bruno',
  'Gustavo Lucas Ciriaco': 'Equipe Bruno',
  'Hana Carolina Pereira do Nascimento': 'Equipe Bruno',
  'Igor Silva dos Santos': 'Equipe Bruno',
  'Janayna Rinaldis Ventre': 'Equipe Bruno',
  'Juan Pablo Queiroz Silva': 'Equipe Bruno',
  'Luana Alves da Silva': 'Equipe Bruno',
  'Marcelo Cruzati Junior': 'Equipe Bruno',
  'Ramira Araujo da Silva': 'Equipe Bruno',

  'Debora Cordeiro Russo': 'Equipe Debora',
  'Beatrice Nesria Bakhti': 'Equipe Debora',
  'Gabrielle Gonçalves Barboza Scott': 'Equipe Debora',
  'Josefa de Sena Lima': 'Equipe Debora',
  'Juliana Moreira de Moraes': 'Equipe Debora',
  'Ketellyn Campos Novaes': 'Equipe Debora',
  'Ketlyn Menezes de Sá': 'Equipe Debora',
  'Larissa Tainara Ortiz Moreira': 'Equipe Debora',
  'Larissa Tayna Silva dos Santos': 'Equipe Debora',
  'Lucas Vinicius Lima Nogueira': 'Equipe Debora',
  'Marcelly Florencio Cardoso': 'Equipe Debora',
  'Mariana Oliveira Rodrigues': 'Equipe Debora',
  'Natalia Silva Nascimento': 'Equipe Debora',
  'Rayssa Alves dos Santos': 'Equipe Debora',

  'Felipe Uzuelli': 'Equipe Felipe',
  'Alessandra Silva Grob': 'Equipe Felipe',
  'Anny Karoline Silva de Lima': 'Equipe Felipe',
  'Bianca Fernandes Ferreira': 'Equipe Felipe',
  'Diogo dos Santos Dementino': 'Equipe Felipe',
  'Gabriela Porfirio': 'Equipe Felipe',
  'Jessica de Souza Ramos': 'Equipe Felipe',
  'Raniele Nascimento da Silva': 'Equipe Felipe',
  'Rayssa Oliveira da Silva': 'Equipe Felipe',
  'Rodrigo Fernandes Silva': 'Equipe Felipe',
  'Ryan Pablo Viana dos Santos': 'Equipe Felipe',
  'Stefani Tauane Sousa Silva': 'Equipe Felipe',
  'Tabata Juliana Ferreira de Lima': 'Equipe Felipe',
  'Tayane Pigini de Jesus': 'Equipe Felipe',
  'Vanderson Barbosa Savagin': 'Equipe Felipe',

  'Aline Sobrinho de Oliveira': 'Equipe Ribeirao',
  'Amanda Tomas Zago': 'Equipe Ribeirao',
  'Camila Fernanda Bueno da Silva Gelotte': 'Equipe Ribeirao',
  'Dauane Teixeira Bernardes': 'Equipe Ribeirao',
  'Dayara Sthefany da Silva Bonfim Carvalho': 'Equipe Ribeirao',
  'Giovana Bueno Silva': 'Equipe Ribeirao',
  'Pedro Henrique do Nascimento Chaves': 'Equipe Ribeirao',
  'Simone de Souza Santos': 'Equipe Ribeirao',
  'Thamires Lemos Bernardes Mantello': 'Equipe Ribeirao',
};

const POR_NOME_NORMALIZADO = new Map(Object.entries(NOME_PARA_TIME).map(([nome, time]) => [normalizarNome(nome), time]));

export function timeDoConsultor(nome: string | null | undefined): string | undefined {
  if (!nome) return undefined;
  return POR_NOME_NORMALIZADO.get(normalizarNome(nome));
}

/** Filtra linhas `{ consultor, ... }` pro time restrito — se `time` for undefined (usuário sem
 * restrição, ex: master), devolve tudo sem filtrar. */
export function filtrarPorTimeConsultor<T extends { consultor: string | null }>(linhas: T[], time: string | undefined): T[] {
  if (!time) return linhas;
  return linhas.filter((l) => timeDoConsultor(l.consultor) === time);
}
