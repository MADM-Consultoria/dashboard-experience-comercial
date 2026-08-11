import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const FORMATADOR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Relógio em tempo real (fuso de Brasília) — contexto pro supervisor entender que um score
 * baixo logo cedo pode ser só o dia ainda não ter avançado, não necessariamente desempenho
 * ruim. Fica no TopBar, embaixo do filtro de período — tom sutil (cinza), não é um alerta. */
export function RelogioBrasilia() {
  const [hora, setHora] = useState(() => FORMATADOR.format(new Date()));

  useEffect(() => {
    const id = setInterval(() => setHora(FORMATADOR.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
      <Clock size={10} className="text-slate-400 dark:text-slate-500" />
      {hora} · Brasília
    </span>
  );
}
