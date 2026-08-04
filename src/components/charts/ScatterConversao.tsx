import { CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { ColaboradorMetricas } from '@/types/domain';
import { STATUS_COLOR } from '@/lib/format';

export function ScatterConversao({ colaboradores }: { colaboradores: ColaboradorMetricas[] }) {
  const dados = colaboradores.map((c) => ({
    nome: c.nome,
    assinados: c.assinados,
    protocolados: c.protocolados,
    eficiencia: c.eficiencia,
    fill: STATUS_COLOR[c.status],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="assinados" name="Assinados" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis type="number" dataKey="protocolados" name="Protocolados" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
        <ZAxis type="number" dataKey="eficiencia" range={[80, 260]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
          formatter={(value, name) => [value as number, name]}
          labelFormatter={() => ''}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const p = payload[0].payload as (typeof dados)[number];
            return (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 10px', fontSize: 12 }}>
                <p style={{ color: '#334155', fontWeight: 600, marginBottom: 4 }}>{p.nome}</p>
                <p style={{ color: '#64748b' }}>Assinados: {p.assinados}</p>
                <p style={{ color: '#64748b' }}>Protocolados: {p.protocolados}</p>
              </div>
            );
          }}
        />
        <Scatter data={dados} fillOpacity={0.85}>
          {dados.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
