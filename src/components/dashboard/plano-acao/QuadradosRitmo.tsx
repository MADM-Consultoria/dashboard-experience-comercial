import { formatNumero } from '@/lib/format';

/** Vermelho = nada feito hoje. Amarelo = já fez algo, mas ainda longe da meta do dia. Azul =
 * falta só 1 pro ritmo do dia. Verde = bateu (ou passou) o ritmo do dia. */
function tierQuadrados(hoje: number, n: number): { pintados: number; cor: string } {
  if (hoje <= 0) return { pintados: n, cor: '#EF4444' };
  if (hoje >= n) return { pintados: n, cor: '#22C55E' };
  if (hoje === n - 1) return { pintados: hoje, cor: '#3B82F6' };
  return { pintados: hoje, cor: '#EAB308' };
}

interface QuadradosRitmoProps {
  label: string;
  valorMes: number;
  meta: number;
  metaLabel: string;
  /** Valor só do dia de hoje — `undefined` quando o período filtrado não inclui o dia de hoje
   * (ex: diretoria olhando um mês passado), caso em que não faz sentido falar em "ritmo de hoje". */
  valorHoje: number | undefined;
  /** Meta diária arredondada pra cima (meta ÷ dias úteis do mês inteiro) — quantos quadradinhos
   * existem. Ex: meta de 969 ÷ ~31 dias úteis ≈ 3,1/dia → 4 quadrados. */
  numQuadrados: number;
}

/** Indicador de ritmo diário — quadradinhos que vão sendo pintados conforme o colaborador
 * produz hoje, coloridos pela distância até a meta diária (a meta do mês inteiro continua
 * exibida como texto ao lado). Usado em Assinados e Protocolados no Plano de Ação. */
export function QuadradosRitmo({ label, valorMes, meta, metaLabel, valorHoje, numQuadrados }: QuadradosRitmoProps) {
  const temRitmoHoje = numQuadrados > 0 && typeof valorHoje === 'number';

  return (
    <div title={temRitmoHoje ? `Ritmo de hoje: quanto já foi feito hoje frente à meta diária (${metaLabel.toLowerCase()} ÷ dias úteis do mês).` : undefined}>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">
          {formatNumero(valorMes)}
          <span className="font-normal text-slate-400"> / {meta > 0 ? metaLabel : 'sem meta'}</span>
        </span>
      </div>

      {temRitmoHoje ? (
        (() => {
          const { pintados, cor } = tierQuadrados(valorHoje!, numQuadrados);
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
              <span className="text-[10px] text-slate-400">{valorHoje} hoje</span>
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
