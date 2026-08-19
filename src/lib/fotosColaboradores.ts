import { normalizarNome } from '@/lib/assinadosPeriodo';
import alessandraGrob from '@/assets/colaboradores/alessandra-grob.jpg';
import bianca from '@/assets/colaboradores/bianca.jpg';
import diogoSantos from '@/assets/colaboradores/diogo-santos.jpg';
import felipeUzuelli from '@/assets/colaboradores/felipe-uzuelli.jpg';
import gabrielaGuimaraes from '@/assets/colaboradores/gabriela-guimaraes.jpg';
import gabrielleGoncalves from '@/assets/colaboradores/gabrielle-goncalves.jpg';
import hanaCarolina from '@/assets/colaboradores/hana-carolina.jpg';
import igorSantos from '@/assets/colaboradores/igor-santos.jpg';
import julianaMoreira from '@/assets/colaboradores/juliana-moreira.jpg';
import larissaTayna from '@/assets/colaboradores/larissa-tayna.jpg';
import marceloCruzati from '@/assets/colaboradores/marcelo-cruzati.jpg';
import rayssaAlves from '@/assets/colaboradores/rayssa-alves.jpg';
import rodrigoFernandes from '@/assets/colaboradores/rodrigo-fernandes.jpg';
import stefaniTauane from '@/assets/colaboradores/stefani-tauane.jpg';
import tabata from '@/assets/colaboradores/tabata.jpg';

/**
 * Fotos reais recebidas da operação (pasta Comercial no Drive) — só quem teve o nome batendo
 * com segurança (nome completo ou nome+sobrenome idêntico) entrou aqui. O resto da equipe
 * continua com a bolinha de iniciais (ver Avatar.tsx) até termos a foto certa confirmada; nunca
 * associar por nome parecido/ambíguo, senão arrisca colocar a foto de uma pessoa em outra.
 */
const FOTOS_POR_NOME: Record<string, string> = {
  'felipe uzuelli': felipeUzuelli,
  'alessandra silva grob': alessandraGrob,
  'gabriela oliveira guimaraes': gabrielaGuimaraes,
  'hana carolina pereira do nascimento': hanaCarolina,
  'igor silva dos santos': igorSantos,
  'marcelo cruzati junior': marceloCruzati,
  'gabrielle goncalves barboza scott': gabrielleGoncalves,
  'juliana moreira de moraes': julianaMoreira,
  'larissa tayna silva dos santos': larissaTayna,
  'rayssa alves dos santos': rayssaAlves,
  'bianca fernandes ferreira': bianca,
  'diogo dos santos dementino': diogoSantos,
  'rodrigo fernandes silva': rodrigoFernandes,
  'stefani tauane sousa silva': stefaniTauane,
  'tabata juliana ferreira de lima': tabata,
};

export function buscarFotoColaborador(nome: string): string | undefined {
  return FOTOS_POR_NOME[normalizarNome(nome)];
}
