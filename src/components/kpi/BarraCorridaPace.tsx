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

export function BarraCorridaPace({ paceAtual, paceEsperado, limiarCorrida = LIMIAR_PACE_CANSADO_PADRAO }: { paceAtual: number; paceEsperado: number; limiarCorrida?: number }) {
  // Chegada fixa em 100% da pista; se o pace atual já superou o esperado, o corredor encosta na
  // bandeira em vez de estourar pra fora da pista — "passou da meta" já fica claro pela cor.
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

      {/* pt-8 (32px) deixa o corredor (40px de altura) em pé com os tênis pisando na pista */}
      <div className="relative pt-8 pb-1">
        <div
          className="absolute transition-[left] duration-700 ease-out motion-reduce:transition-none"
          style={{ left: `${pct}%`, transform: 'translateX(-55%)', top: 0 }}
        >
          <PersonagemCorredor cor={cor} cansado={cansado} />
        </div>

        {/* pista de corrida: asfalto claro com acostamento escuro e faixa central tracejada;
            o progresso é um "pill" azul/verde que avança por dentro da pista */}
        <div className="h-5 rounded-full bg-slate-100 border-2 border-slate-300 shadow-inner overflow-hidden relative">
          {/* faixa central tracejada da estrada */}
          <div
            className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[2px] opacity-70"
            style={{
              backgroundImage: 'repeating-linear-gradient(to right, #ffffff 0 8px, transparent 8px 16px)',
            }}
          />
          <div
            className="absolute left-1 top-1 bottom-1 rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `calc(${pct}% - 4px)`, minWidth: pct > 0 ? '12px' : '0', backgroundColor: cor }}
          >
            {/* brilho no início do pill, como o farol da imagem */}
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-3 rounded-full bg-white/80" />
          </div>
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
