/**
 * Corredor humano em flat design vetorial (estilo ilustração de dashboard SaaS) — redesenho
 * completo: nada aqui é traço de "boneco de palito". Tronco atlético é uma FORMA preenchida
 * (ombros largos, cintura estreita), pernas têm coxa e canela modeladas com afilamento
 * natural, braços dobrados a ~90° com mão fechada, cabeça com corte de cabelo moderno.
 * Profundidade no estilo flat: membros do lado de trás usam um tom de pele mais escuro
 * (não opacity), como nas ilustrações vetoriais profissionais.
 *
 * Sempre correndo da esquerda pra direita — cabeça, olhar, tronco inclinado e a passada
 * deixam a direção evidente. A animação (CSS, classes pc-* em index.css) mantém o ciclo de
 * corrida: coxas balançam em contra-fase, joelho dobra na recuperação, braços bombam em
 * contra-fase às pernas, bounce vertical no corpo, sombra que respira e rastro de vento.
 * Puramente decorativo (aria-hidden) — quem lê a barra é o texto ao redor.
 *
 * Estrutura de cada membro: <g posição-via-atributo-svg><g className="rotação-via-css">forma.
 * O CSS `transform` da animação substituiria (não somaria com) o transform do atributo no
 * mesmo elemento — por isso posição e rotação ficam em níveis separados.
 *
 * Sem <defs>/<linearGradient>: o card aparece 2x na mesma página (Geral + Judit) e ids de SVG
 * colidiriam — o volume é sugerido com overlays translúcidos e os dois tons de pele.
 */

const PELE = '#f4b183';
const PELE_TRAS = '#d98f5f';
const CABELO = '#33261d';
const SHORTS = '#1f2937';
const TENIS = '#f8fafc';
const SOLA = '#94a3b8';

/** Tênis apontando pra direita, desenhado a partir do tornozelo (0,0). */
function Tenis({ escuro }: { escuro?: boolean }) {
  return (
    <g>
      <path
        d="M -2.2 -0.6 Q -3 2.4 -0.6 3 L 5.8 3 Q 7.6 3 6.8 1.2 Q 4.6 0.4 2 -0.4 Q 0 -1 -2.2 -0.6 Z"
        fill={escuro ? '#dbe3ec' : TENIS}
      />
      <path d="M -2.6 2.4 L 7 2.4" stroke={SOLA} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 0.6 0.4 L 2.6 1.6" stroke={SOLA} strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

/** Coxa modelada (larga no quadril, afinando até o joelho), desenhada reta pra baixo a partir
 * do quadril (0,0) — o balanço é rotação via CSS no grupo de fora. */
function Coxa({ pele }: { pele: string }) {
  return <path d="M -2.8 0.6 Q 0 -2.2 2.8 0.6 C 3.1 4, 2.6 7, 2 9.7 L -2 9.7 C -2.6 7, -3.1 4, -2.8 0.6 Z" fill={pele} />;
}

/** Canela (joelho → tornozelo), mais fina que a coxa e afinando até o pé. */
function Canela({ pele }: { pele: string }) {
  return <path d="M -2.1 0.4 Q 0 -1.7 2.1 0.4 C 2.3 3.4, 1.9 6.4, 1.4 9.2 L -1.4 9.2 C -1.9 6.4, -2.3 3.4, -2.1 0.4 Z" fill={pele} />;
}

/** Braço dobrado a ~90° no cotovelo (postura real de corrida), com manga curta na cor da
 * camisa e mão fechada — o bombeio acontece no grupo pc-ombro de fora. */
function Braco({ cor, tras }: { cor: string; tras?: boolean }) {
  const pele = tras ? PELE_TRAS : PELE;
  return (
    <g>
      <path d="M 0 0 L -1.8 6.8 L 4.8 8.8" stroke={pele} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* mão fechada */}
      <circle cx="5.5" cy="9" r="2" fill={pele} />
      {/* manga curta cobrindo o ombro */}
      <path d="M 0 -0.4 L -0.9 3.8" stroke={cor} strokeWidth="5" strokeLinecap="round" />
      {tras && <path d="M 0 -0.4 L -0.9 3.8" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" opacity="0.22" />}
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
        {/* ---- camada de trás (tom de pele mais escuro = profundidade flat) ---- */}
        <g transform="translate(21.6 16.2)">
          <g className="pc-ombro pc-ombro--tras">
            <Braco cor={cor} tras />
          </g>
        </g>

        <g transform="translate(19.6 30)">
          <g className="pc-quadril pc-quadril--tras">
            <Coxa pele={PELE_TRAS} />
            <g transform="translate(0 9.5)">
              <g className="pc-joelho pc-joelho--tras">
                <Canela pele={PELE_TRAS} />
                <g transform="translate(0 9)">
                  <Tenis escuro />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* pescoço */}
        <path d="M 22.4 11.6 L 25.6 12.4 L 24.9 15.6 L 21.9 14.9 Z" fill={PELE} />

        {/* ---- tronco atlético (forma preenchida: ombros largos, cintura estreita),
               inclinação leve de sprint ---- */}
        <path
          d="M 18.5 16.8
             Q 22.8 11.8 27.1 16.4
             C 26.7 20.6, 25.2 24.6, 23.7 28.8
             L 18.9 28.3
             C 18.2 24.2, 18.5 20.2, 18.5 16.8 Z"
          fill={cor}
        />
        {/* volume flat: brilho no peito + sombra perto da cintura */}
        <path d="M 25.6 17.4 C 25.4 20.6, 24.6 23.8, 23.9 26.6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.24" />
        <path d="M 19.5 21 C 19.3 23.6, 19.4 25.8, 19.6 27.6" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.14" />

        {/* ---- perna da frente (embaixo dos shorts, por cima do tronco) ---- */}
        <g transform="translate(20.8 30)">
          <g className="pc-quadril pc-quadril--frente">
            <Coxa pele={PELE} />
            <g transform="translate(0 9.5)">
              <g className="pc-joelho pc-joelho--frente">
                <Canela pele={PELE} />
                <g transform="translate(0 9)">
                  <Tenis />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* shorts por cima do topo das coxas — as pernas giram por baixo */}
        <path d="M 16.7 27.2 L 24.7 27.2 Q 25.6 30.4 24.3 32.5 L 20.8 31.6 L 18.5 32.8 Q 16.1 30.7 16.7 27.2 Z" fill={SHORTS} />
        <path d="M 17.5 28 L 24.2 28" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.2" />

        {/* ---- cabeça (alinhada sobre os ombros, olhando pra direita) ---- */}
        <g transform="translate(24.6 8)">
          <circle r="5.5" fill={PELE} />
          {/* orelha */}
          <circle cx="-2.5" cy="0.9" r="1.15" fill={PELE_TRAS} />
          {/* corte moderno: topo com topete pra frente + nuca curta */}
          <path
            d="M -5.5 0.8 A 5.5 5.5 0 0 1 4.4 -3.1
               Q 5.9 -2.4 5.3 -1.1
               Q 3.3 -2.3 2.1 -1.7
               Q 0.3 -3.5 -2.2 -2.7
               Q -4.6 -2.3 -5.5 0.8 Z"
            fill={CABELO}
          />
          <path d="M -5.5 0.6 Q -6.3 2.8 -5 4.6 Q -4.4 2.4 -4.9 1 Z" fill={CABELO} />
          {/* olho voltado pra frente (direção da corrida) */}
          <circle cx="3.1" cy="0.1" r="0.8" fill="#1e293b" />
        </g>

        {/* ---- braço da frente ---- */}
        <g transform="translate(23 16.2)">
          <g className="pc-ombro pc-ombro--frente">
            <Braco cor={cor} />
          </g>
        </g>
      </g>
    </svg>
  );
}
