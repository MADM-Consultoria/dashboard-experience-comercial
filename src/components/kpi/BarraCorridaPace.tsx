import { PersonagemCorredor } from './PersonagemCorredor';

/**
 * Pace atual x pace esperado como uma corrida: o personagem corre até onde o ritmo atual está,
 * a linha de chegada é o pace esperado. Mesmos dois números que já apareciam como texto — só
 * que visual, pra bater o olho na hora se o ritmo tá na frente ou atrás sem ler número nenhum.
 * O corredor sempre corre pra direita, em direção à bandeira — só a cor muda (azul atrás do
 * ritmo, verde quando alcança ou passa a meta). Quando o pace tá muito abaixo do esperado
 * (menos da metade), o corredor passa a andar devagar e cansado, suando — reforça visualmente
 * que tá abaixo do esperado, sem tirar os números.
 */
const LIMIAR_PACE_CANSADO = 0.503;

export function BarraCorridaPace({ paceAtual, paceEsperado }: { paceAtual: number; paceEsperado: number }) {
  // Chegada fixa em 100% da pista; se o pace atual já superou o esperado, o corredor encosta na
  // bandeira em vez de estourar pra fora da pista — "passou da meta" já fica claro pela cor.
  const pct = paceEsperado > 0 ? Math.min(100, (paceAtual / paceEsperado) * 100) : 0;
  const naFrente = paceEsperado > 0 && paceAtual >= paceEsperado;
  const cor = naFrente ? '#22c55e' : '#2563eb';
  const cansado = paceEsperado > 0 && paceAtual / paceEsperado < LIMIAR_PACE_CANSADO;

  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-500">Pace atual: <strong className="text-slate-700">{paceAtual.toFixed(1)}</strong>/dia</span>
        <span className="text-[11px] text-slate-500">Meta: <strong className="text-slate-700">{paceEsperado.toFixed(1)}</strong>/dia</span>
      </div>

      {/* pt-8 (32px) deixa o corredor (40px de altura) em pé com os tênis pisando na pista */}
      <div className="relative pt-8 pb-1">
        <div
          className="absolute transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `${pct}%`, transform: 'translateX(-55%)', top: 0 }}
        >
          <PersonagemCorredor cor={cor} cansado={cansado} />
        </div>

        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>

        {/* bandeira de chegada em SVG (sem emoji), plantada logo acima do fim da pista */}
        <svg
          width="14"
          height="20"
          viewBox="0 0 14 20"
          className="absolute -right-1 bottom-2"
          aria-hidden="true"
        >
          <title>{`Meta: ${paceEsperado.toFixed(1)}/dia`}</title>
          <line x1="2" y1="1" x2="2" y2="19" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 3 1.5 L 13 3.5 L 3 8 Z" fill="#1e293b" />
          <rect x="3.6" y="2.4" width="2.2" height="2.2" fill="#f8fafc" opacity="0.9" />
          <rect x="7" y="3.4" width="2.2" height="2.2" fill="#f8fafc" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
}
