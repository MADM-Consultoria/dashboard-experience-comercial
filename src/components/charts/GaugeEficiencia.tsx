import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { STATUS_COLOR } from '@/lib/format';
import { classificarStatus } from '@/lib/metrics';

export function GaugeEficiencia({ valor, label }: { valor: number; label?: string }) {
  const status = classificarStatus(valor);
  const cor = STATUS_COLOR[status];
  const dados = [{ name: 'valor', value: valor, fill: cor }];

  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart
          data={dados}
          startAngle={210}
          endAngle={-30}
          innerRadius="75%"
          outerRadius="100%"
          barSize={14}
        >
          {/* Sem isso, o Recharts escala o arco pelo próprio valor plotado (domínio
             automático) — preenche 100% dele mesmo, não da escala 0-100 real. */}
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#e2e8f0' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute top-[52%] -translate-y-1/2 flex flex-col items-center">
        <span className="text-2xl font-semibold text-slate-900">{valor.toFixed(0)}</span>
        <span className="text-[11px] text-slate-500">{label ?? 'pontos'}</span>
      </div>
    </div>
  );
}
