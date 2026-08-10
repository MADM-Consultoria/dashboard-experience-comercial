import { normalizarNome } from '@/lib/assinadosPeriodo';
import type { CanalOrigem } from '@/types/domain';

export interface ColaboradorAtivo {
  nome: string;
  time: string;
  canal: CanalOrigem;
}

/**
 * Lista oficial de colaboradores ativos, passada pela diretoria — usada só
 * pra marcar `ativo: true/false` e pras listagens por pessoa (Equipe, Plano
 * de Ação, Ranking). NÃO filtra os totais da empresa: quem desligou continua
 * contando pra Recebidos/Assinados/Protocolados/Venda Ganha, porque esse
 * resultado já foi gerado pra empresa antes de sair.
 *
 * Time/canal aqui servem só pra gente conseguir criar o colaborador quando
 * ele existe em madm.view_app_kommo_leads / view_app_emitidos_e_assinados mas
 * ainda não foi sincronizado em madm.view_relatorio_judit (ver
 * `colaboradoresSemRelatorio` abaixo) — nesses casos não tem cargo/meta reais,
 * só o necessário pra aparecer certo nas telas.
 *
 * Atualizar aqui sempre que a equipe mudar.
 */
const ATIVOS: ColaboradorAtivo[] = [
  // Supervisor: Bruno do Carmo da Cruz
  { nome: 'Bruno do Carmo da Cruz', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Alex Sandro Ricardo de Horatorio Soterio', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Carlos Vinicius Rodrigues da Silva', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Fabiana Cristina da Silva Rodrigues', time: 'Equipe Bruno', canal: 'Judit' },
  { nome: 'Gabriela Oliveira Guimarães', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Gustavo Lucas Ciriaco', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Hana Carolina Pereira do Nascimento', time: 'Equipe Bruno', canal: 'Judit' },
  { nome: 'Igor Silva dos Santos', time: 'Equipe Bruno', canal: 'Judit' },
  { nome: 'Janayna Rinaldis Ventre', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Juan Pablo Queiroz Silva', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Luana Alves da Silva', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Marcelo Cruzati Junior', time: 'Equipe Bruno', canal: 'Discadora' },
  { nome: 'Ramira Araujo da Silva', time: 'Equipe Bruno', canal: 'Discadora' },

  // Supervisora: Debora Cordeiro Russo
  { nome: 'Debora Cordeiro Russo', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Beatrice Nesria Bakhti', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Gabrielle Gonçalves Barboza Scott', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Josefa de Sena Lima', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Juliana Moreira de Moraes', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Ketellyn Campos Novaes', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Ketlyn Menezes de Sá', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Larissa Tainara Ortiz Moreira', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Larissa Tayna Silva dos Santos', time: 'Equipe Debora', canal: 'Judit' },
  { nome: 'Lucas Vinicius Lima Nogueira', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Marcelly Florencio Cardoso', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Mariana Oliveira Rodrigues', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Natalia Silva Nascimento', time: 'Equipe Debora', canal: 'Discadora' },
  { nome: 'Rayssa Alves dos Santos', time: 'Equipe Debora', canal: 'Discadora' },

  // Supervisor: Felipe Uzuelli
  { nome: 'Felipe Uzuelli', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Alessandra Silva Grob', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Anny Karoline Silva de Lima', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Bianca Fernandes Ferreira', time: 'Equipe Felipe', canal: 'Judit' },
  { nome: 'Diogo dos Santos Dementino', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Gabriela Porfirio', time: 'Equipe Felipe', canal: 'Judit' },
  { nome: 'Jessica de Souza Ramos', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Raniele Nascimento da Silva', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Rayssa Oliveira da Silva', time: 'Equipe Felipe', canal: 'Judit' },
  { nome: 'Rodrigo Fernandes Silva', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Ryan Pablo Viana dos Santos', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Stefani Tauane Sousa Silva', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Tabata Juliana Ferreira de Lima', time: 'Equipe Felipe', canal: 'Judit' },
  { nome: 'Tayane Pigini de Jesus', time: 'Equipe Felipe', canal: 'Discadora' },
  { nome: 'Vanderson Barbosa Savagin', time: 'Equipe Felipe', canal: 'Discadora' },

  // Equipe: Ribeirão Preto
  { nome: 'Aline Sobrinho de Oliveira', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Amanda Tomas Zago', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Camila Fernanda Bueno da Silva Gelotte', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Dauane Teixeira Bernardes', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Dayara Sthefany da Silva Bonfim Carvalho', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Giovana Bueno Silva', time: 'Equipe Ribeirao', canal: 'Judit' },
  { nome: 'Pedro Henrique do Nascimento Chaves', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Simone de Souza Santos', time: 'Equipe Ribeirao', canal: 'Discadora' },
  { nome: 'Thamires Lemos Bernardes Mantello', time: 'Equipe Ribeirao', canal: 'Judit' },
];

const POR_NOME_NORMALIZADO = new Map(ATIVOS.map((c) => [normalizarNome(c.nome), c]));

export function ehColaboradorAtivo(nome: string): boolean {
  return POR_NOME_NORMALIZADO.has(normalizarNome(nome));
}

/**
 * Nomes dos supervisores de cada time — checagem por nome, não só por texto de cargo.
 * O campo "Classificação Operacional" vindo do banco nem sempre contém literalmente a
 * palavra "supervisor" (pode vir "Coordenador(a)" ou variação parecida), então confiar só
 * no texto do cargo deixava supervisor(a) vazar pras listas de colaborador (Ranking,
 * Precisa de atenção, Melhor colaborador etc).
 */
const NOMES_SUPERVISORES = ['Bruno do Carmo da Cruz', 'Debora Cordeiro Russo', 'Felipe Uzuelli'];
const SUPERVISORES_NORMALIZADOS = new Set(NOMES_SUPERVISORES.map(normalizarNome));

export function ehSupervisor(nome: string): boolean {
  return SUPERVISORES_NORMALIZADOS.has(normalizarNome(nome));
}

export function buscarAtivoPorNome(nome: string): ColaboradorAtivo | undefined {
  return POR_NOME_NORMALIZADO.get(normalizarNome(nome));
}

/** Todos os ativos, pra checar quem da lista não veio em madm.view_relatorio_judit e precisa ser sintetizado. */
export function listarAtivos(): ColaboradorAtivo[] {
  return ATIVOS;
}
