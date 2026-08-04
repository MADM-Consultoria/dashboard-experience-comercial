import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ColaboradorReal } from '@/lib/relatorioJudit';

/** Mesmas dimensões do radar individual do colaborador (Conversão Assinatura,
 * Taxa Protocolados, Eficiência, Atingimento Meta, Produtividade), agregadas
 * para a equipe inteira em um único polígono. */
export function RadarConversaoLigacoes({ colaboradores }: { colaboradores: ColaboradorReal[] }) {
  const media = (campo: keyof ColaboradorReal) =>
    colaboradores.length ? colaboradores.reduce((a, c) => a + Number(c[campo]), 0) / colaboradores.length : 0;

  const dados = [
    { metrica: 'Conversão Assinatura', equipe: media('conversaoRecebidosAssinados') },
    { metrica: 'Taxa Protocolados', equipe: media('conversaoAssinadosProtocolados') },
    { metrica: 'Eficiência', equipe: media('eficiencia') },
    { metrica: 'Atingimento Meta', equipe: Math.min(100, media('atingimentoMetaMensal')) },
    { metrica: 'Produtividade', equipe: Math.min(100, media('produtividade') * 10) },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={dados} outerRadius={95}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metrica" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Radar name="Equipe" dataKey="equipe" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} isAnimationActive={false} />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
          formatter={(v) => [`${Number(v).toFixed(0)}`, 'Equipe']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
