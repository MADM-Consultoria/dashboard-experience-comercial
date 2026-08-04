import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const FORMATADOR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Relógio em tempo real (fuso de Brasília) ao lado do título — contexto pro supervisor
 * entender que um score baixo logo cedo pode ser só o dia ainda não ter avançado, não
 * necessariamente desempenho ruim. */
export function RelogioBrasilia() {
  const [hora, setHora] = useState(() => FORMATADOR.format(new Date()));

  useEffect(() => {
    const id = setInterval(() => setHora(FORMATADOR.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 text-[12px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">
      <Clock size={12} className="text-blue-500" />
      {hora} <span className="text-slate-400 font-normal">· Brasília</span>
    </span>
  );
}
