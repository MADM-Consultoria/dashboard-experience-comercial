import { Line, LineChart, ResponsiveContainer } from 'recharts';

/** Mini gráfico de linha sem eixo/grade — só a forma da série dos últimos dias, real
 * (mesmos dados de `assinados-diario-colaborador`), verde se a tendência é de alta,
 * vermelho se de queda, cinza se estável. */
export function Sparkline({ serie, tendencia }: { serie: number[]; tendencia: 'subindo' | 'caindo' | 'estavel' }) {
  const cor = tendencia === 'subindo' ? '#22c55e' : tendencia === 'caindo' ? '#ef4444' : '#94a3b8';
  const dados = serie.map((v, i) => ({ i, v }));

  return (
    <div className="h-9 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={cor} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
