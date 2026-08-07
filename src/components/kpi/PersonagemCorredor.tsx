/**
 * Atleta cartoon articulado em SVG puro — nada de emoji/ícone de fonte. Personagem completo:
 * cabeça com cabelo e faixa, camisa (na cor do pace), shorts, braços dobrados no cotovelo,
 * pernas com coxa/canela separadas e tênis de verdade nos pés, mais um rastro de velocidade
 * atrás. Cada articulação é um grupo próprio animado por CSS (ver index.css, classes pc-*):
 * quadris giram em fases opostas, joelho dobra na recuperação da passada, braços balançam em
 * contra-fase às pernas do mesmo lado, corpo tem bounce vertical e a sombra no chão respira
 * em contra-fase — o conjunto dá o ciclo de corrida. Sempre virado pra direita; puramente
 * decorativo (aria-hidden), quem lê a barra é o texto ao redor.
 *
 * Estrutura de cada membro: <g posição-via-atributo-svg><g className="rotação-via-css">forma.
 * O CSS `transform` da animação substituiria (não somaria com) o transform do atributo no
 * mesmo elemento — por isso posição e rotação ficam em níveis separados.
 *
 * Sem <defs>/<linearGradient>: o card aparece 2x na mesma página (Geral + Judit) e ids de SVG
 * colidiriam — o sombreamento é feito com overlays de branco/preto translúcido.
 */

const PELE = '#f4b183';
const CABELO = '#40291e';
const SHORTS = '#1f2937';
const TENIS = '#f8fafc';
const SOLA = '#94a3b8';

/** Tênis apontando pra direita, desenhado a partir do tornozelo (0,0). */
function Tenis() {
  return (
    <g>
      <path d="M -2.2 -0.6 Q -3 2.4 -0.6 3 L 5.8 3 Q 7.6 3 6.8 1.2 Q 4.6 0.4 2 -0.4 Q 0 -1 -2.2 -0.6 Z" fill={TENIS} />
      <path d="M -2.6 2.4 L 7 2.4" stroke={SOLA} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 0.6 0.4 L 2.6 1.6" stroke={SOLA} strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

/** Braço dobrado no cotovelo (~90°, postura real de corrida) — o balanço acontece no grupo
 * pc-ombro de fora; o cotovelo fica dobrado fixo dentro dele, com manga curta na cor da camisa. */
function Braco({ cor, tras }: { cor: string; tras?: boolean }) {
  return (
    <g opacity={tras ? 0.78 : 1}>
      <path d="M 0 0 L -1.6 7 L 5 9.2" stroke={PELE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* manga curta cobrindo o ombro */}
      <path d="M 0 -0.6 L -1 4" stroke={cor} strokeWidth="4.6" strokeLinecap="round" />
      {/* mão fechada */}
      <circle cx="5.6" cy="9.4" r="1.8" fill={PELE} />
    </g>
  );
}

export function PersonagemCorredor({ cor }: { cor: string }) {
  return (
    <svg width="34" height="40" viewBox="0 0 44 52" aria-hidden="true" style={{ overflow: 'visible' }}>
      {/* rastro de velocidade atrás do corredor */}
      <g stroke={cor} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <line className="pc-vento pc-vento--1" x1="2" y1="18" x2="10" y2="18" />
        <line className="pc-vento pc-vento--2" x1="0" y1="25" x2="9" y2="25" />
        <line className="pc-vento pc-vento--3" x1="3" y1="32" x2="10" y2="32" />
      </g>

      {/* sombra no chão — respira em contra-fase ao bounce do corpo */}
      <ellipse className="pc-sombra" cx="22" cy="49" rx="9" ry="2.2" fill="#0f172a" opacity="0.15" />

      <g className="pc-corpo">
        {/* ---- camada de trás ---- */}
        <g transform="translate(22 17)">
          <g className="pc-ombro pc-ombro--tras">
            <Braco cor={cor} tras />
          </g>
        </g>

        {/* perna de trás: coxa (quadril) → canela (joelho) → tênis */}
        <g transform="translate(19.5 30)">
          <g className="pc-quadril pc-quadril--tras">
            <path d="M 0 0 L 0 9.5" stroke={PELE} strokeWidth="4.8" strokeLinecap="round" opacity="0.82" />
            <g transform="translate(0 9.5)">
              <g className="pc-joelho pc-joelho--tras">
                <path d="M 0 0 L 0 9" stroke={PELE} strokeWidth="4" strokeLinecap="round" opacity="0.82" />
                <g transform="translate(0 9)" opacity="0.85">
                  <Tenis />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* ---- tronco ---- */}
        {/* camisa: inclinada pra frente, na cor do pace */}
        <path d="M 23.5 14.5 C 21.5 19, 20.5 24, 21 30" stroke={cor} strokeWidth="9.5" strokeLinecap="round" fill="none" />
        {/* brilho lateral da camisa (pseudo-volume, sem gradient) */}
        <path d="M 25.5 16 C 24 20, 23.5 24, 23.8 28" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.28" />
        {/* sombra inferior da camisa */}
        <path d="M 21.6 24 C 21.3 26.5, 21.2 28, 21.4 29.5" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.16" />

        {/* shorts cobrindo o quadril (as coxas giram por baixo) */}
        <path d="M 16.6 27.2 L 24.6 27.4 Q 25.6 30.8 24 32.4 L 20.8 31.6 L 18.4 32.8 Q 16 31 16.6 27.2 Z" fill={SHORTS} />
        <path d="M 17.4 28 L 24.2 28.2" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />

        {/* ---- cabeça (virada pra direita) ---- */}
        <g transform="translate(28 9)">
          {/* pescoço */}
          <path d="M -3.4 3.6 L -4.6 6.4" stroke={PELE} strokeWidth="3.2" strokeLinecap="round" />
          {/* rosto */}
          <circle r="5.6" fill={PELE} />
          {/* orelha */}
          <circle cx="-2.6" cy="0.8" r="1.2" fill="#e09a63" />
          {/* cabelo: cobre topo e nuca, deixando o rosto (lado direito) livre */}
          <path d="M -5.6 0.6 A 5.6 5.6 0 0 1 4.6 -3.2 Q 1.6 -3.4 0 -2.4 Q -3.6 -4 -5.6 0.6 Z" fill={CABELO} />
          <path d="M -5.7 0.4 Q -6.6 2.6 -5.2 4.2 Q -4.6 2 -5 0.8 Z" fill={CABELO} />
          {/* faixa na testa, na cor do pace */}
          <path d="M -5 -1.2 Q 0 -3.8 5.2 -1.6" stroke={cor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* olho e boca olhando pra frente (direita) */}
          <circle cx="3" cy="0" r="0.85" fill="#1e293b" />
          <path d="M 3.4 2.6 Q 4.4 3 4.9 2.2" stroke="#c2410c" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </g>

        {/* ---- camada da frente ---- */}
        {/* perna da frente */}
        <g transform="translate(21 30)">
          <g className="pc-quadril pc-quadril--frente">
            <path d="M 0 0 L 0 9.5" stroke={PELE} strokeWidth="4.8" strokeLinecap="round" />
            <g transform="translate(0 9.5)">
              <g className="pc-joelho pc-joelho--frente">
                <path d="M 0 0 L 0 9" stroke={PELE} strokeWidth="4" strokeLinecap="round" />
                <g transform="translate(0 9)">
                  <Tenis />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* braço da frente */}
        <g transform="translate(23.5 17)">
          <g className="pc-ombro pc-ombro--frente">
            <Braco cor={cor} />
          </g>
        </g>
      </g>
    </svg>
  );
}
