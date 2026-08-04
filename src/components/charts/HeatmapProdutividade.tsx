import type { ColaboradorMetricas, RegistroDiario } from '@/types/domain';

interface Props {
  colaboradores: ColaboradorMetricas[];
  registros: RegistroDiario[];
}

function intensidade(valor: number, max: number): string {
  if (max === 0) return 'rgba(37,99,235,0.05)';
  const ratio = Math.min(1, valor / max);
  const alpha = 0.08 + ratio * 0.75;
  return `rgba(37,99,235,${alpha.toFixed(2)})`;
}

export function HeatmapProdutividade({ colaboradores, registros }: Props) {
  const dias = [...new Set(registros.map((r) => r.data))].sort().slice(-14);

  const matriz = colaboradores.map((c) => {
    const linha = dias.map((dia) => {
      const registro = registros.find((r) => r.colaboradorId === c.id && r.data === dia);
      return registro?.protocolados ?? 0;
    });
    return { colaborador: c, linha };
  });

  const max = Math.max(1, ...matriz.flatMap((m) => m.linha));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[140px_repeat(14,1fr)] gap-1 mb-1">
          <div />
          {dias.map((d) => (
            <div key={d} className="text-center text-[10px] text-slate-500">
              {d.slice(8, 10)}/{d.slice(5, 7)}
            </div>
          ))}
        </div>
        {matriz.map(({ colaborador, linha }) => (
          <div key={colaborador.id} className="grid grid-cols-[140px_repeat(14,1fr)] gap-1 mb-1 items-center">
            <div className="text-xs text-slate-600 truncate pr-2">{colaborador.nome.split(' ').slice(0, 2).join(' ')}</div>
            {linha.map((valor, i) => (
              <div
                key={i}
                title={`${valor} protocolado(s)`}
                className="h-6 rounded-[4px] flex items-center justify-center text-[10px] text-slate-600"
                style={{ backgroundColor: intensidade(valor, max) }}
              >
                {valor > 0 ? valor : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
