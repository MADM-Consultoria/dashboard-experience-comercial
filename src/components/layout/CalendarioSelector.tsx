import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useDataSelecionada } from '@/context/DataSelecionadaContext';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function isoDate(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function CalendarioSelector() {
  const { inicio, fim, label, selecionarPeriodo } = useDataSelecionada();
  const [aberto, setAberto] = useState(false);
  const [primeiroClique, setPrimeiroClique] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const [anoRef, mesRefNum] = inicio.split('-').map(Number);
  const [mesVisivel, setMesVisivel] = useState({ ano: anoRef, mes: mesRefNum - 1 });

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setPrimeiroClique(null);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const primeiroDiaSemana = new Date(mesVisivel.ano, mesVisivel.mes, 1).getDay();
  const totalDias = new Date(mesVisivel.ano, mesVisivel.mes + 1, 0).getDate();
  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)];

  function mudarMes(delta: number) {
    setMesVisivel((atual) => {
      const novoMes = atual.mes + delta;
      if (novoMes < 0) return { ano: atual.ano - 1, mes: 11 };
      if (novoMes > 11) return { ano: atual.ano + 1, mes: 0 };
      return { ano: atual.ano, mes: novoMes };
    });
  }

  function aoClicarDia(isoCelula: string) {
    if (!primeiroClique) {
      setPrimeiroClique(isoCelula);
      return;
    }
    selecionarPeriodo(primeiroClique, isoCelula);
    setPrimeiroClique(null);
    setAberto(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 sm:px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors max-w-[9.5rem] sm:max-w-none"
      >
        <Calendar size={15} className="text-slate-500 shrink-0" />
        <span className="truncate sm:whitespace-nowrap">{label}</span>
      </button>

      {aberto && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 z-20 w-auto sm:w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => mudarMes(-1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronLeft size={15} />
            </button>
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
              {MESES[mesVisivel.mes]} {mesVisivel.ano}
            </span>
            <button onClick={() => mudarMes(1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const isoCelula = isoDate(mesVisivel.ano, mesVisivel.mes, dia);
              const ehPrimeiroClique = primeiroClique === isoCelula;
              const dentroDoIntervaloAtual = !primeiroClique && isoCelula >= inicio && isoCelula <= fim;

              return (
                <button
                  key={i}
                  onClick={() => aoClicarDia(isoCelula)}
                  className={clsx(
                    'h-8 w-8 rounded-lg text-[12px] transition-colors',
                    ehPrimeiroClique
                      ? 'bg-blue-600 text-white font-semibold ring-2 ring-blue-300'
                      : dentroDoIntervaloAtual
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700',
                  )}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            {primeiroClique
              ? 'Agora clique no último dia do período (clique no mesmo dia de novo pra um dia só).'
              : `Clique em um dia pra selecioná-lo, ou em dois dias pra ver o intervalo entre eles. Período atual: ${label}.`}
          </p>
        </div>
      )}
    </div>
  );
}
