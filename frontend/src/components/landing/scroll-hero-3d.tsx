"use client";

import { useEffect, useRef, useState } from "react";

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

const INK = "#1c1d1f";
const WHITE = "#ffffff";
const CREAM = "#f3eae0";
const ACCENT = "#527561";
const ACCENT_BLUE = "#3b7a9c";
const ACCENT_LIGHT = "#dce5d7";

const DURATION_MS = 5600;

export function LandingHero() {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setProgress(1);
      return;
    }

    function runAnimation(now: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const rawT = clamp(elapsed / DURATION_MS, 0, 1);
      const easedT = rawT < 0.5
        ? 2 * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      setProgress(easedT);

      if (rawT < 1) {
        rafRef.current = window.requestAnimationFrame(runAnimation);
      } else {
        setProgress(1);
      }
    }

    rafRef.current = window.requestAnimationFrame(runAnimation);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleReplay() {
    setProgress(0);
    startTimeRef.current = performance.now();
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);

    function loop(now: number) {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const rawT = clamp(elapsed / DURATION_MS, 0, 1);
      const easedT = rawT < 0.5
        ? 2 * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      setProgress(easedT);

      if (rawT < 1) {
        rafRef.current = window.requestAnimationFrame(loop);
      } else {
        setProgress(1);
      }
    }

    rafRef.current = window.requestAnimationFrame(loop);
  }

  const p = progress;

  // Stage 1: Expecting couple on the left
  const parentsEnter = 1;
  const parentsPregnant = 1 - smoothstep(0.14, 0.28, p);

  // Stage 2: Baby in Koszyk (Nosidełko) with straight rim and baby head partially peeking out
  const carrierEnter = smoothstep(0.04, 0.18, p);
  const carrierRock = Math.sin(p * Math.PI * 10) * 2.8 * (1 - smoothstep(0.50, 0.64, p));
  const babyInCarrierAlpha = 1 - smoothstep(0.42, 0.52, p);

  // Stage 3: Crawling Baby
  const crawlEnter = smoothstep(0.40, 0.50, p);
  const crawlMove = smoothstep(0.42, 0.68, p);
  const crawlFade = 1 - smoothstep(0.64, 0.74, p);
  const crawlAlpha = crawlEnter * crawlFade;
  const crawlX = lerp(655, 825, crawlMove);
  const crawlSwing = Math.sin(crawlMove * Math.PI * 6) * 6;

  // Stage 4 -> 5: Child stands up, walks right, grows smoothly
  const walkEnter = smoothstep(0.63, 0.73, p);
  const walkMove = smoothstep(0.65, 0.97, p);
  const childX = lerp(910, 1265, walkMove);
  const childScale = lerp(0.70, 0.96, walkMove);
  const isWalking = p > 0.65 && p < 0.96 ? 1 : 0;
  const stride = Math.sin(walkMove * Math.PI * 7) * isWalking;

  // Progressive ground line
  const groundWidth = lerp(390, 1410, smoothstep(0.0, 0.95, p));

  // Woman's hand & sleeve dynamic coordinates
  const wristX = lerp(52, 74, parentsPregnant);
  const wristY = lerp(304, 310, parentsPregnant);

  return (
    <section className="landing-hero" aria-label="Wprowadzenie do przewodnika rodzicielskiego OtwarteKarty">
      <div className="landing-hero-content">
        <h1 className="landing-title">
          Witaj w <em>OtwarteKarty</em>.
        </h1>
        <p className="landing-subtitle">
          Przewodnik po urlopach i zasiłkach rodzicielskich ZUS. Ułóż plan dla Waszej rodziny
          w 5 krokach, porównaj strategie i sprawdź dokładne wyliczenia w kalkulatorze.
        </p>
      </div>

      {/* Subtle borderless contrasting area for the animation */}
      <div className="landing-animation-band">
        <div className="landing-animation-viewport">
          <svg
            className="landing-animation-svg"
            viewBox="0 0 1480 640"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Animacja wzrostu dziecka od lewej do prawej: rodzice, koszyk niemowlęcy, raczkowanie i dorastające dziecko"
          >
            <defs>
              <style>{`
                .ink { stroke: ${INK}; stroke-width: 2.2px; stroke-linecap: round; stroke-linejoin: round; }
                .ink-thin { stroke: ${INK}; stroke-width: 1.6px; stroke-linecap: round; stroke-linejoin: round; }
                .fill-white { fill: ${WHITE}; }
                .fill-cream { fill: ${CREAM}; }
                .fill-dark { fill: ${INK}; }
                .fill-sage { fill: ${ACCENT}; }
                .fill-blue { fill: ${ACCENT_BLUE}; }
                .fill-soft { fill: ${ACCENT_LIGHT}; }
              `}</style>
            </defs>

            {/* Continuous ground line */}
            <line
              x1="60"
              y1="576"
              x2={groundWidth}
              y2="576"
              className="ink"
            />

            {/* ================================================================= */}
            {/* 1. LEFT: EXPECTING PARENTS                                        */}
            {/* ================================================================= */}
            <g transform="translate(135, 0)" opacity={parentsEnter}>
              {/* --- PARTNER (MAN) --- */}
              <g transform="translate(0, 0)">
                <path
                  d="M 80 214 C 104 232 124 256 140 278 L 128 294 C 110 274 92 250 74 234 Z"
                  className="fill-cream ink"
                />

                <path
                  d="M 56 356 L 64 468 L 72 552 H 98 L 94 468 L 80 356 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 72 552 L 70 576 H 120 C 120 563 109 555 98 552 Z"
                  className="fill-cream ink"
                />
                <line x1="71" y1="571" x2="118.5" y2="571" className="ink-thin" />

                <path
                  d="M 18 356 L 20 470 L 22 552 H 48 L 46 470 L 44 356 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 22 552 L 20 576 H 72 C 72 563 60 555 48 552 Z"
                  className="fill-cream ink"
                />
                <line x1="21" y1="571" x2="70.5" y2="571" className="ink-thin" />

                <path
                  d="M 45 158 V 202 H 66 V 158 Z"
                  className="fill-white ink"
                />

                <path
                  d="M 16 216 C 16 200 30 194 44 194 C 50 202 61 202 67 194 C 82 194 94 203 96 220 L 90 360 H 16 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 41 195 C 48 206 63 206 70 195"
                  fill="none"
                  className="ink"
                />

                <path
                  d="M 35 122 C 35 98 50 85 70 85 C 90 85 99 101 97 127 C 95 153 83 171 65 171 C 48 171 35 155 35 122 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 35 125 C 32 101 46 80 72 80 C 91 80 103 92 101 107 C 91 100 78 98 62 102 C 50 105 43 114 41 125 Z"
                  className="fill-dark ink"
                />
                <path d="M 68 117 Q 74 114 79 117" fill="none" className="ink" />
                <path d="M 85 118 Q 90 116 94 119" fill="none" className="ink" />
                <circle cx="74" cy="124" r="2.1" className="fill-dark" />
                <circle cx="89" cy="125" r="2.1" className="fill-dark" />
                <path d="M 83 125 L 86 138 L 80 140" fill="none" className="ink-thin" />
                <path d="M 73 149 Q 79 153 85 149" fill="none" className="ink-thin" />

                <path
                  d="M 15 320 C 13 333 20 342 28 339 C 34 336 34 327 30 318 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 20 212 C 6 242 5 280 14 323 L 31 320 C 25 284 26 250 36 226 Z"
                  className="fill-cream"
                />
                <path
                  d="M 20 212 C 6 242 5 280 14 323 L 31 320 C 25 284 26 250 36 226"
                  fill="none"
                  className="ink"
                />
              </g>

              {/* --- PREGNANT WOMAN --- */}
              <g transform="translate(128, 12)">
                <path
                  d="M 48 376 L 56 480 L 66 544 H 86 L 80 480 L 66 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 65 544 L 62 564 H 114 C 114 552 102 546 86 544 Z"
                  className="fill-cream ink"
                />
                <line x1="63" y1="559" x2="112" y2="559" className="ink-thin" />

                <path
                  d="M 18 376 L 19 482 L 25 544 H 46 L 44 482 L 38 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 25 544 L 22 564 H 76 C 76 552 64 546 46 544 Z"
                  className="fill-cream ink"
                />
                <line x1="23" y1="559" x2="74" y2="559" className="ink-thin" />

                <path
                  d="M 14 332 L 9 398 H 88 L 86 332 Z"
                  className="fill-dark ink"
                />

                <path
                  d="M 41 164 V 206 H 60 V 164 Z"
                  className="fill-white ink"
                />

                <path
                  d={`M 14 216 C 18 202 28 196 39 196 C 46 205 56 205 63 196 C 74 196 82 206 86 222 C ${lerp(
                    96,
                    132,
                    parentsPregnant,
                  )} ${lerp(262, 266, parentsPregnant)} ${lerp(
                    98,
                    136,
                    parentsPregnant,
                  )} ${lerp(312, 318, parentsPregnant)} 88 344 L 12 344 C 8 296 10 248 14 216 Z`}
                  className="fill-blue ink"
                />
                <path
                  d="M 36 197 C 44 209 58 209 66 197"
                  fill="none"
                  className="ink"
                />

                <circle cx="25" cy="77" r="18" className="fill-white ink" />
                <path
                  d="M 27 93 C 31 87 40 85 46 90 C 42 96 33 98 27 93 Z"
                  className="fill-dark ink"
                />

                <path
                  d="M 28 130 C 28 104 44 91 64 91 C 84 91 92 108 90 134 C 88 158 76 177 58 177 C 40 177 28 160 28 130 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 31 144 C 37 124 44 110 56 105 C 67 101 79 104 89 111"
                  fill="none"
                  className="ink"
                />
                <path d="M 60 124 Q 66 121 71 124" fill="none" className="ink" />
                <path d="M 78 125 Q 83 123 87 126" fill="none" className="ink" />
                <circle cx="66" cy="131" r="2.0" className="fill-dark" />
                <circle cx="81" cy="132" r="2.0" className="fill-dark" />
                <path d="M 75 132 L 78 145 L 72 147" fill="none" className="ink-thin" />
                <path d="M 66 155 Q 72 158 77 155" fill="none" className="ink-thin" />

                <path
                  d={`M ${wristX - 2} ${wristY - 5} C ${wristX + 14} ${wristY - 7} ${wristX + 24} ${wristY + 2} ${wristX + 18} ${wristY + 11} C ${wristX + 10} ${wristY + 14} ${wristX - 3} ${wristY + 10} ${wristX - 2} ${wristY - 5} Z`}
                  className="fill-white ink"
                />
                <path
                  d={`M 18 224 C 10 256 16 290 ${wristX - 4} ${wristY + 8} L ${wristX + 4} ${wristY - 6} C 36 280 32 254 36 234 Z`}
                  className="fill-blue"
                />
                <path
                  d={`M 18 224 C 10 256 16 290 ${wristX - 4} ${wristY + 8} L ${wristX + 4} ${wristY - 6} C 36 280 32 254 36 234`}
                  fill="none"
                  className="ink"
                />
              </g>
            </g>

            {/* ================================================================= */}
            {/* 2. CENTER-LEFT: KOSZYK (Straight top edge, baby head peeking out) */}
            {/* ================================================================= */}
            {carrierEnter > 0.01 && (
              <g
                transform={`translate(${lerp(422, 460, carrierEnter)}, ${lerp(
                  14,
                  0,
                  carrierEnter,
                )}) rotate(${carrierRock}, 118, 540)`}
                opacity={carrierEnter}
              >
                {/* 1. Baby Head drawn FIRST so its lower part is naturally tucked behind the straight edge of the koszyk */}
                {babyInCarrierAlpha > 0.01 && (
                  <g opacity={babyInCarrierAlpha}>
                    <circle cx="148" cy="480" r="22" className="fill-white ink" />
                    {/* Delicate hair curl on top of peeking head */}
                    <path d="M 143 458 C 147 451 155 453 153 459" fill="none" className="ink" />
                    {/* Peaceful eyes visible just above the straight basket edge */}
                    <circle cx="145" cy="474" r="1.8" className="fill-dark" />
                    <circle cx="156" cy="475" r="1.8" className="fill-dark" />
                  </g>
                )}

                {/* 2. Canopy hood on the left, meeting the straight edge at y=486 */}
                <path
                  d="M 22 486 C 20 434 50 406 94 410 L 94 486 Z"
                  className="fill-blue ink"
                />

                {/* 3. Koszyk body with a STRAIGHT top edge (M 20 486 H 214) covering the lower half of the baby's head */}
                <path
                  d="M 20 486 H 214 L 200 546 C 194 566 174 576 148 576 H 86 C 60 576 40 566 34 546 Z"
                  className="fill-cream ink"
                />
                {/* Clean straight horizontal rim band below the top edge */}
                <line x1="23" y1="498" x2="211" y2="498" className="ink-thin" />

                {/* 4. Arched handle attached to the straight rim */}
                <path
                  d="M 58 486 C 58 400 178 400 178 486"
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "3.4px" }}
                />
                <path
                  d="M 103 422 Q 118 419 133 422"
                  fill="none"
                  stroke={INK}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="58" cy="486" r="5.5" className="fill-dark ink" />
                <circle cx="178" cy="486" r="5.5" className="fill-dark ink" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 3. CENTER: CRAWLING BABY (Clean rounded limbs behind romper)      */}
            {/* ================================================================= */}
            {crawlAlpha > 0.01 && (
              <g transform={`translate(${crawlX}, 0)`} opacity={crawlAlpha}>
                {/* All 4 limbs drawn behind the romper torso so joints are 100% seamless */}
                <g transform={`rotate(${-crawlSwing}, 36, 524)`}>
                  <path
                    d="M 28 522 L 16 564 C 14 572 24 576 28 568 L 42 526 Z"
                    className="fill-white ink"
                  />
                </g>
                <g transform={`rotate(${crawlSwing}, 42, 524)`}>
                  <path
                    d="M 34 522 L 24 566 C 22 574 33 576 36 568 L 48 526 Z"
                    className="fill-white ink"
                  />
                </g>
                <g transform={`rotate(${crawlSwing}, 88, 522)`}>
                  <path
                    d="M 82 520 L 90 566 C 91 574 101 574 100 566 L 94 518 Z"
                    className="fill-white ink"
                  />
                </g>
                <g transform={`rotate(${-crawlSwing}, 84, 522)`}>
                  <path
                    d="M 78 520 L 76 566 C 76 574 87 574 88 566 L 90 520 Z"
                    className="fill-white ink"
                  />
                </g>

                {/* Cozy one-piece baby romper overlapping limb joints cleanly */}
                <path
                  d="M 24 520 C 20 498 42 488 74 490 C 96 492 106 504 102 522 C 96 538 32 538 24 520 Z"
                  className="fill-blue ink"
                />

                {/* Cute Baby Head with delicate top curl (no dark bar across forehead) */}
                <circle cx="110" cy="484" r="22" className="fill-white ink" />
                <path d="M 105 462 C 110 455 118 457 116 463" fill="none" className="ink" />
                <circle cx="113" cy="482" r="1.9" className="fill-dark" />
                <circle cx="123" cy="483" r="1.9" className="fill-dark" />
                <path d="M 113 494 Q 118 498 123 494" fill="none" className="ink-thin" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 4 -> 5. RIGHT: WALKING & GROWING CHILD                            */}
            {/* ================================================================= */}
            {walkEnter > 0.01 && (
              <g
                transform={`translate(${childX}, 576) scale(${childScale}) translate(0, -576)`}
                opacity={walkEnter}
              >
                <g transform={`rotate(${stride * 13}, 58, 316)`}>
                  <path
                    d="M 68 386 C 72 397 79 403 85 399 C 89 396 87 387 80 380 Z"
                    className="fill-white ink"
                  />
                  <path
                    d="M 54 312 C 66 336 74 362 82 384 L 68 390 C 60 368 52 344 44 322 Z"
                    className="fill-blue ink"
                  />
                </g>

                <g transform={`rotate(${-stride * 12}, 56, 434)`}>
                  <path
                    d="M 46 430 L 50 554 H 68 L 66 430 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 49 554 L 48 576 H 84 C 84 564 76 556 68 554 Z"
                    className="fill-cream ink"
                  />
                  <line x1="49" y1="571" x2="82.5" y2="571" className="ink-thin" />
                </g>

                <g transform={`rotate(${stride * 13}, 38, 434)`}>
                  <path
                    d="M 28 430 L 30 554 H 48 L 48 430 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 29 554 L 28 576 H 64 C 64 564 56 556 48 554 Z"
                    className="fill-cream ink"
                  />
                  <line x1="29" y1="571" x2="62.5" y2="571" className="ink-thin" />
                </g>

                <path
                  d="M 43 276 V 306 H 59 V 276 Z"
                  className="fill-white ink"
                />

                <path
                  d="M 20 322 C 20 306 32 298 42 298 C 47 305 55 305 60 298 C 72 298 80 308 82 324 L 78 436 H 20 Z"
                  className="fill-blue ink"
                />
                <path
                  d="M 39 299 C 46 308 56 308 63 299"
                  fill="none"
                  className="ink"
                />

                <path
                  d="M 26 244 C 26 216 40 202 56 202 C 74 202 86 216 84 244 C 82 270 70 286 54 286 C 38 286 26 270 26 244 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 26 250 C 21 226 32 198 56 196 C 76 195 90 206 88 222 C 79 215 66 214 52 218 C 39 222 33 234 30 250 Z"
                  className="fill-dark ink"
                />
                <path d="M 55 233 Q 60 230 65 233" fill="none" className="ink" />
                <path d="M 70 234 Q 75 232 79 235" fill="none" className="ink" />
                <circle cx="60" cy="240" r="2.1" className="fill-dark" />
                <circle cx="74" cy="241" r="2.1" className="fill-dark" />
                <path d="M 68 242 L 71 252 L 66 254" fill="none" className="ink-thin" />
                <path d="M 58 263 Q 65 269 72 263" fill="none" className="ink-thin" />

                <g transform={`rotate(${-stride * 13}, 32, 316)`}>
                  <path
                    d="M 21 392 C 19 403 24 411 31 409 C 37 407 37 398 34 390 Z"
                    className="fill-white ink"
                  />
                  <path
                    d="M 24 314 C 16 340 16 368 20 394 L 35 392 C 31 368 32 342 38 322 Z"
                    className="fill-blue"
                  />
                  <path
                    d="M 24 314 C 16 340 16 368 20 394 L 35 392 C 31 368 32 342 38 322"
                    fill="none"
                    className="ink"
                  />
                </g>
              </g>
            )}
          </svg>

          <button
            type="button"
            className="replay-button-subtle"
            onClick={handleReplay}
            aria-label="Odtwórz animację od początku"
            title="Odtwórz animację"
          >
            <span aria-hidden="true">↺</span>
            <span>Odtwórz ponownie</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export const ScrollHero3D = LandingHero;
