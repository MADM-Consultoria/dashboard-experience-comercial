import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ColaboradorMetricas } from '@/types/domain';

export function RadarPerformance({ colaborador, media }: { colaborador: ColaboradorMetricas; media: ColaboradorMetricas[] }) {
  const mediaEquipe = (campo: keyof ColaboradorMetricas) =>
    media.length ? (media.reduce((a, c) => a + Number(c[campo]), 0) / media.length) : 0;

  const dados = [
    { metrica: 'Conversão Assinatura', colaborador: colaborador.conversaoRecebidosAssinados, equipe: mediaEquipe('conversaoRecebidosAssinados') },
    { metrica: 'Taxa Protocolados', colaborador: colaborador.conversaoAssinadosProtocolados, equipe: mediaEquipe('conversaoAssinadosProtocolados') },
    { metrica: 'Eficiência', colaborador: colaborador.eficiencia, equipe: mediaEquipe('eficiencia') },
    { metrica: 'Atingimento Meta', colaborador: Math.min(100, colaborador.atingimentoMetaMensal), equipe: Math.min(100, mediaEquipe('atingimentoMetaMensal')) },
    { metrica: 'Produtividade', colaborador: Math.min(100, (colaborador.produtividade / (colaborador.metaDiaria || 1)) * 100), equipe: 70 },
  ];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={dados} outerRadius={95}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metrica" tick={{ fill: '#94a3b8', fontSize: 11 }} />
        <Radar name="Equipe" dataKey="equipe" stroke="#64748b" fill="#64748b" fillOpacity={0.15} />
        <Radar name={colaborador.nome.split(' ')[0]} dataKey="colaborador" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
        <Tooltip formatter={(v) => `${Number(v).toFixed(0)}%`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
