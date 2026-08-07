/**
 * Corredor articulado em SVG puro — nada de emoji/ícone de fonte. Corpo, cabeça, dois braços
 * (ombro) e duas pernas (quadril + joelho) como grupos separados, cada um com sua própria
 * animação CSS de rotação em torno da própria articulação — perna e braço do mesmo lado giram
 * em fases opostas (braço da frente sincroniza com a perna de trás, como numa corrida de
 * verdade), e o corpo todo sobe/desce um pouco a cada passada. Sempre virado pra direita,
 * puramente decorativo (aria-hidden) — quem lê a barra é o texto ao redor.
 *
 * Cada membro é: <g posição-fixa-via-atributo-svg><g className="anima-rotação-via-css">forma.
 * Não dá pra combinar translate (posição) + rotate (animação) no mesmo elemento porque o CSS
 * `transform` da animação substituiria o `transform` do atributo SVG inteiro, não soma — por
 * isso a posição de cada articulação fica num nível separado da rotação que a anima.
 */
export function PersonagemCorredor({ cor }: { cor: string }) {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true" style={{ overflow: 'visible' }}>
      {/* sombra no chão — cresce/encolhe em contra-fase ao corpo, reforça o impacto do passo */}
      <ellipse className="pc-sombra" cx="17" cy="37" rx="8" ry="2" fill="#0f172a" opacity="0.14" />

      <g className="pc-corpo">
        {/* braço de trás — desenhado primeiro pra ficar atrás do tronco */}
        <g transform="translate(15 15)">
          <g className="pc-ombro pc-ombro--tras">
            <line x1="0" y1="0" x2="-6" y2="8" stroke={cor} strokeWidth="3.4" strokeLinecap="round" opacity="0.85" />
          </g>
        </g>

        {/* perna de trás (quadril → joelho → pé) */}
        <g transform="translate(15 24)">
          <g className="pc-quadril pc-quadril--tras">
            <line x1="0" y1="0" x2="-4" y2="9" stroke={cor} strokeWidth="4.2" strokeLinecap="round" opacity="0.85" />
            <g transform="translate(-4 9)">
              <g className="pc-joelho pc-joelho--tras">
                <line x1="0" y1="0" x2="3" y2="8" stroke={cor} strokeWidth="3.6" strokeLinecap="round" opacity="0.85" />
              </g>
            </g>
          </g>
        </g>

        {/* tronco — leve inclinação pra frente, típico de quem tá correndo */}
        <path d="M 17 14 C 15.5 18, 15 21, 16 25" stroke={cor} strokeWidth="7.5" strokeLinecap="round" fill="none" />

        {/* cabeça, virada pra direita (sentido da corrida) */}
        <g transform="translate(19.5 8)">
          <circle r="5.4" fill={cor} />
          <circle cx="2.4" cy="-0.6" r="0.9" fill="#0f172a" opacity="0.55" />
        </g>

        {/* perna da frente */}
        <g transform="translate(15 24)">
          <g className="pc-quadril pc-quadril--frente">
            <line x1="0" y1="0" x2="6" y2="8" stroke={cor} strokeWidth="4.2" strokeLinecap="round" />
            <g transform="translate(6 8)">
              <g className="pc-joelho pc-joelho--frente">
                <line x1="0" y1="0" x2="-2" y2="9" stroke={cor} strokeWidth="3.6" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </g>

        {/* braço da frente */}
        <g transform="translate(15 15)">
          <g className="pc-ombro pc-ombro--frente">
            <line x1="0" y1="0" x2="7" y2="6" stroke={cor} strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
