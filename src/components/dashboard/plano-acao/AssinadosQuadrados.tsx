import { formatNumero } from '@/lib/format';

/** Vermelho = nada assinado hoje. Amarelo = já assinou algo, mas ainda longe da meta do dia.
 * Azul = falta só 1 pro ritmo do dia. Verde = bateu (ou passou) o ritmo do dia. */
function tierQuadrados(hoje: number, n: number): { pintados: number; cor: string } {
  if (hoje <= 0) return { pintados: n, cor: '#EF4444' };
  if (hoje >= n) return { pintados: n, cor: '#22C55E' };
  if (hoje === n - 1) return { pintados: hoje, cor: '#3B82F6' };
  return { pintados: hoje, cor: '#EAB308' };
}

interface AssinadosQuadradosProps {
  valorMes: number;
  metaMensal: number;
  /** Assinados só do dia de hoje — `undefined` quando o período filtrado não inclui o dia de
   * hoje (ex: diretoria olhando um mês passado), caso em que não faz sentido falar em "ritmo
   * de hoje". */
  assinadosHoje: number | undefined;
  /** Meta diária arredondada pra cima (meta mensal ÷ dias úteis do mês) — quantos quadradinhos
   * existem. Ex: meta de 969 ÷ ~31 dias úteis ≈ 3,1/dia → 4 quadradinhos. */
  numQuadrados: number;
}

/** Substitui a barra de progresso de Assinados por um indicador de ritmo diário — quadradinhos
 * que vão sendo pintados conforme o colaborador assina hoje, coloridos pela distância até a
 * meta diária (não a meta do mês inteiro, essa continua exibida como texto). */
export function AssinadosQuadrados({ valorMes, metaMensal, assinadosHoje, numQuadrados }: AssinadosQuadradosProps) {
  const temRitmoHoje = numQuadrados > 0 && typeof assinadosHoje === 'number';

  return (
    <div title={temRitmoHoje ? 'Ritmo de hoje: quantos contratos já foram assinados hoje frente à meta diária (meta mensal ÷ dias úteis do mês).' : undefined}>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-500">Assinados</span>
        <span className="font-semibold text-slate-700">
          {formatNumero(valorMes)}
          <span className="font-normal text-slate-400"> / {metaMensal > 0 ? `${formatNumero(metaMensal)} meta` : 'sem meta'}</span>
        </span>
      </div>

      {temRitmoHoje ? (
        (() => {
          const { pintados, cor } = tierQuadrados(assinadosHoje!, numQuadrados);
          return (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: numQuadrados }).map((_, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-[3px] border border-slate-200 dark:border-slate-600 transition-colors duration-300"
                    style={i < pintados ? { backgroundColor: cor, borderColor: cor } : undefined}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400">{assinadosHoje} hoje</span>
            </div>
          );
        })()
      ) : (
        <div className="h-4 flex items-center">
          <span className="text-[11px] text-slate-400">Sem dado de "hoje" para o período filtrado.</span>
        </div>
      )}
    </div>
  );
}
