import { PersonagemCorredor } from './PersonagemCorredor';

/**
 * Pace atual x pace esperado como uma corrida: o personagem corre até onde o ritmo atual está,
 * a linha de chegada é o pace esperado. Mesmos dois números que já apareciam como texto — só
 * que visual, pra bater o olho na hora se o ritmo tá na frente ou atrás sem ler número nenhum.
 * O corredor sempre corre pra direita, em direção à bandeira — só a cor muda (azul atrás do
 * ritmo, verde quando alcança ou passa a meta).
 */
export function BarraCorridaPace({ paceAtual, paceEsperado }: { paceAtual: number; paceEsperado: number }) {
  // Chegada fixa em 100% da pista; se o pace atual já superou o esperado, o corredor encosta na
  // bandeira em vez de estourar pra fora da pista — "passou da meta" já fica claro pela cor.
  const pct = paceEsperado > 0 ? Math.min(100, (paceAtual / paceEsperado) * 100) : 0;
  const naFrente = paceEsperado > 0 && paceAtual >= paceEsperado;
  const cor = naFrente ? '#22c55e' : '#2563eb';

  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-500">Pace atual: <strong className="text-slate-700">{paceAtual.toFixed(1)}</strong>/dia</span>
        <span className="text-[11px] text-slate-500">Meta: <strong className="text-slate-700">{paceEsperado.toFixed(1)}</strong>/dia</span>
      </div>

      {/* pt-8 dá espaço pro corredor ficar em pé acima da pista sem cortar a cabeça/braços */}
      <div className="relative pt-8 pb-1">
        <div
          className="absolute transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `${pct}%`, transform: 'translateX(-62%)', top: 0 }}
        >
          <PersonagemCorredor cor={cor} />
        </div>

        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>

        <span className="absolute -right-1 -top-0.5 text-sm leading-none" title={`Meta: ${paceEsperado.toFixed(1)}/dia`}>
          🏁
        </span>
      </div>
    </div>
  );
}
