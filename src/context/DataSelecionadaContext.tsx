import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface DataSelecionadaContextValue {
  /** Início/fim (ISO, inclusive) do período selecionado — um único dia ou um intervalo. */
  inicio: string;
  fim: string;
  label: string;
  /** Define o período por dois cliques no calendário: clicar 2x no mesmo dia = dia único; clicar em dois dias = intervalo entre eles (em qualquer ordem). */
  selecionarPeriodo: (a: string, b: string) => void;
}

const DataSelecionadaContext = createContext<DataSelecionadaContextValue | null>(null);

function hojeIso(): string {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
}

const MESES_LABEL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function formatarBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function ehMesInteiro(inicio: string, fim: string): boolean {
  const [anoI, mesI, diaI] = inicio.split('-').map(Number);
  const [anoF, mesF, diaF] = fim.split('-').map(Number);
  const ultimoDia = new Date(anoF, mesF, 0).getDate();
  return anoI === anoF && mesI === mesF && diaI === 1 && diaF === ultimoDia;
}

function primeiroDiaDoMesAtualIso(): string {
  const hoje = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-01`;
}

const CHAVE_SESSION_STORAGE = 'madm-ops-periodo-selecionado';
const REGEX_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o período salvo no sessionStorage (sobrevive a F5/refresh, some quando fecha a aba). */
function lerPeriodoSalvo(): { inicio: string; fim: string } | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSION_STORAGE);
    if (!bruto) return null;
    const salvo = JSON.parse(bruto);
    if (typeof salvo?.inicio === 'string' && typeof salvo?.fim === 'string' && REGEX_ISO.test(salvo.inicio) && REGEX_ISO.test(salvo.fim)) {
      return { inicio: salvo.inicio, fim: salvo.fim };
    }
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — cai no padrão sem quebrar.
  }
  return null;
}

function salvarPeriodo(inicio: string, fim: string) {
  try {
    sessionStorage.setItem(CHAVE_SESSION_STORAGE, JSON.stringify({ inicio, fim }));
  } catch {
    // idem — não é crítico se não conseguir salvar.
  }
}

/** Chamado no logout — a próxima entrada (login de novo ou aba nova) tem que
 * começar sempre no padrão "dia 01 do mês até hoje", não no filtro que ficou
 * salvo de uma sessão anterior. */
export function limparPeriodoSalvo() {
  try {
    sessionStorage.removeItem(CHAVE_SESSION_STORAGE);
  } catch {
    // idem — não é crítico se não conseguir limpar.
  }
}

/**
 * Filtro de período selecionado no calendário do topo: dois cliques definem o
 * intervalo (o mesmo dia duas vezes = dia único; dois dias diferentes = tudo
 * entre eles, em qualquer ordem). Alimenta a contagem de Assinados vinda de
 * madm.view_app_emitidos_e_assinados (ver src/lib/assinadosPeriodo.ts).
 *
 * Ao abrir o dashboard pela primeira vez (aba/sessão nova), o período começa
 * em "dia 01 do mês até hoje". Depois de escolher uma data, ela fica salva no
 * sessionStorage — dar Refresh (F5 ou o botão no topo) mantém a mesma data em
 * vez de voltar pro padrão e consultar o banco de novo à toa.
 */
export function DataSelecionadaProvider({ children }: { children: ReactNode }) {
  const salvo = lerPeriodoSalvo();
  const [inicio, setInicio] = useState<string>(salvo?.inicio ?? primeiroDiaDoMesAtualIso);
  const [fim, setFim] = useState<string>(salvo?.fim ?? hojeIso);

  function selecionarPeriodo(a: string, b: string) {
    const novoInicio = a < b ? a : b;
    const novoFim = a < b ? b : a;
    setInicio(novoInicio);
    setFim(novoFim);
    salvarPeriodo(novoInicio, novoFim);
  }

  const valor = useMemo<DataSelecionadaContextValue>(() => {
    if (inicio === fim) {
      return { inicio, fim, label: formatarBr(inicio), selecionarPeriodo };
    }
    if (ehMesInteiro(inicio, fim)) {
      const [ano, mes] = inicio.split('-').map(Number);
      return { inicio, fim, label: `${MESES_LABEL[mes - 1]} de ${ano}`, selecionarPeriodo };
    }
    if (inicio === primeiroDiaDoMesAtualIso() && fim === hojeIso()) {
      const [ano, mes] = inicio.split('-').map(Number);
      return { inicio, fim, label: `${MESES_LABEL[mes - 1]} de ${ano} até hoje`, selecionarPeriodo };
    }
    return { inicio, fim, label: `${formatarBr(inicio)} a ${formatarBr(fim)}`, selecionarPeriodo };
  }, [inicio, fim]);

  return <DataSelecionadaContext.Provider value={valor}>{children}</DataSelecionadaContext.Provider>;
}

export function useDataSelecionada() {
  const ctx = useContext(DataSelecionadaContext);
  if (!ctx) throw new Error('useDataSelecionada deve ser usado dentro de DataSelecionadaProvider');
  return ctx;
}
