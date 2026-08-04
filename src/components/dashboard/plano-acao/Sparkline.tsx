import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';

function formatarDia(iso?: string): string {
  if (!iso) return '';
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

function TooltipSparkline({ active, payload }: { active?: boolean; payload?: { payload: { dia?: string; v: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { dia, v } = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-2.5 py-1.5 text-[11px]">
      {dia && <p className="text-slate-500">{formatarDia(dia)}</p>}
      <p className="font-semibold text-slate-900 dark:text-slate-100">{v} assinado{v === 1 ? '' : 's'}</p>
    </div>
  );
}

/** Mini gráfico de linha sem eixo/grade — só a forma da série dos últimos dias, real
 * (mesmos dados de `assinados-diario-colaborador`), verde se a tendência é de alta,
 * vermelho se de queda, cinza se estável. Passar o cursor mostra o dia e o valor exato de
 * cada ponto — sem isso a linha sozinha não diz muito pra quem está batendo o olho rápido. */
export function Sparkline({ serie, dias, tendencia }: { serie: number[]; dias?: string[]; tendencia: 'subindo' | 'caindo' | 'estavel' }) {
  const cor = tendencia === 'subindo' ? '#22c55e' : tendencia === 'caindo' ? '#ef4444' : '#94a3b8';
  const dados = serie.map((v, i) => ({ i, v, dia: dias?.[i] }));

  return (
    <div className="h-9 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Tooltip content={<TooltipSparkline />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line type="monotone" dataKey="v" stroke={cor} strokeWidth={2} dot={false} activeDot={{ r: 3 }} isAnimationActive={true} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
