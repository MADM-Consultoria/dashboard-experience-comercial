import { PersonagemCorredor } from './PersonagemCorredor';

/**
 * Pace atual x pace esperado como uma trilha de marcos (estilo "jornada"/onboarding gamificado):
 * INÍCIO à esquerda, META com bandeira à direita, marcos de 25/50/75% entre eles, e o corredor
 * avança sobre um traço pontilhado até a posição atual, com um selo "VOCÊ ESTÁ AQUI" embaixo
 * dele. Marcos já ultrapassados ganham check; o corredor sempre corre pra direita — só a cor
 * muda (azul atrás do ritmo, verde quando alcança ou passa a meta). Quando o pace tá muito
 * abaixo do esperado (abaixo do limiar), o corredor passa a andar devagar e cansado, suando —
 * reforça visualmente que tá abaixo do esperado, sem tirar os números.
 */
// Limiar no VALOR do pace (assinados/dia), não em % da meta: com média no limiar ou acima o
// boneco corre; abaixo disso anda cansado. Compara arredondado em 1 casa, igual ao número
// "Pace atual: X.X/dia" que aparece no card — o que se lê é o que decide. Cada card passa o
// seu limiar (Geral 50,3; Judit 25,0 — meta menor, pace/dia naturalmente menor).
const LIMIAR_PACE_CANSADO_PADRAO = 50.3;

/** Mesmo critério do boneco, exportado pro card decidir qual mensagem mostrar (aviso de pace
 * baixo vs pace bom) — um único limiar decide animação E texto, nunca desencontrados. */
export function paceEstaCansado(paceAtual: number, limiarCorrida: number = LIMIAR_PACE_CANSADO_PADRAO): boolean {
  return Math.round(paceAtual * 10) / 10 < limiarCorrida;
}

const MARCOS = [25, 50, 75];

export function BarraCorridaPace({ paceAtual, paceEsperado, limiarCorrida = LIMIAR_PACE_CANSADO_PADRAO }: { paceAtual: number; paceEsperado: number; limiarCorrida?: number }) {
  // Chegada fixa em 100% da trilha; se o pace atual já superou o esperado, o corredor encosta na
  // bandeira em vez de estourar pra fora — "passou da meta" já fica claro pela cor.
  const pct = paceEsperado > 0 ? Math.min(100, (paceAtual / paceEsperado) * 100) : 0;
  const naFrente = paceEsperado > 0 && paceAtual >= paceEsperado;
  const cor = naFrente ? '#22c55e' : '#2563eb';
  const cansado = paceEstaCansado(paceAtual, limiarCorrida);

  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-500">Pace atual: <strong className="text-slate-700">{paceAtual.toFixed(1)}</strong>/dia</span>
        <span className="text-[11px] text-slate-500">Meta: <strong className="text-slate-700">{paceEsperado.toFixed(1)}</strong>/dia</span>
      </div>

      {/* pt-14 dá espaço pro corredor + chips de início/meta em cima da trilha;
          pb-9 dá espaço pro selo "você está aqui" embaixo */}
      <div className="relative pt-14 pb-9 px-1">
        {/* chip INÍCIO, alinhado com o marco em 0% */}
        <div className="absolute left-0 top-6 -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold tracking-wide text-slate-500 whitespace-nowrap">
          INÍCIO
        </div>

        {/* chip META, alinhado com o marco em 100% */}
        <div className="absolute right-0 top-6 -translate-x-1/2 -translate-y-full flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold tracking-wide text-slate-500 whitespace-nowrap">
          <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden="true">
            <line x1="1" y1="0" x2="1" y2="10" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 1.6 0.8 L 7.4 2.5 L 1.6 4.6 Z" fill="#1e293b" />
          </svg>
          META
        </div>

        {/* traço pontilhado da trilha, passando pelo centro dos marcos */}
        <div
          className="absolute left-0 right-0 top-6 h-0 border-t-2 border-dotted border-slate-300"
          aria-hidden="true"
        />

        {/* marco de início (0%) */}
        <div className="absolute left-0 top-6 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-300" />

        {/* marcos intermediários — ganham check azul assim que o pace já passou deles */}
        {MARCOS.map((m) => {
          const passou = pct >= m;
          return (
            <div key={m} className="absolute top-6 -translate-y-1/2" style={{ left: `${m}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="text-[9px] font-semibold text-slate-400 text-center mb-1 -mt-5 whitespace-nowrap">{m}%</div>
              {passou ? (
                <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: cor }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                    <path d="M 1 4.2 L 3.2 6.4 L 7 1.4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
              ) : (
                <div className="h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-300" />
              )}
            </div>
          );
        })}

        {/* marco de chegada (100%) — vira bandeira quando alcançado/passado */}
        <div className="absolute right-0 top-6 -translate-x-1/2 -translate-y-1/2">
          {pct >= 100 ? (
            <div className="h-4 w-4 rounded-full flex items-center justify-center bg-slate-800">
              <svg width="7" height="9" viewBox="0 0 7 9" aria-hidden="true">
                <line x1="0.8" y1="0" x2="0.8" y2="9" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                <path d="M 1.3 0.6 L 6.6 2.2 L 1.3 4 Z" fill="#f8fafc" />
              </svg>
            </div>
          ) : (
            <div className="h-3.5 w-3.5 rounded-full bg-white border-2 border-slate-300" />
          )}
        </div>

        {/* corredor + marcador da posição atual + selo "você está aqui" */}
        <div
          className="absolute top-0 transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
        >
          <div className="flex justify-center">
            <PersonagemCorredor cor={cor} cansado={cansado} />
          </div>

          {/* dot preenchido marcando a posição exata, com halo */}
          <div className="flex justify-center -mt-2">
            <span className="relative flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping" style={{ backgroundColor: cor }} />
              <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: cor }} />
            </span>
          </div>

          {/* selo "você está aqui", com setinha apontando pro dot acima */}
          <div className="flex justify-center mt-1">
            <div className="relative px-2 py-1 rounded-md text-[9px] font-bold text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: cor }}>
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45"
                style={{ backgroundColor: cor }}
              />
              VOCÊ ESTÁ AQUI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
