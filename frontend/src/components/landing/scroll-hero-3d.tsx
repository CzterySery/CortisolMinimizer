"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  const [hasFinished, setHasFinished] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setProgress(1);
      setHasFinished(true);
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
        setHasFinished(true);
      }
    }

    rafRef.current = window.requestAnimationFrame(runAnimation);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleReplay() {
    setProgress(0);
    setHasFinished(false);
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
        setHasFinished(true);
      }
    }

    rafRef.current = window.requestAnimationFrame(loop);
  }

  function scrollToGame(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    const gameSection = document.getElementById("gra-otwartekarty");
    if (gameSection) {
      gameSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  const p = progress;

  // Stage 1: Expecting couple on the left
  const parentsEnter = 1;
  const parentsPregnant = 1 - smoothstep(0.14, 0.28, p);

  // Stage 2: Baby in Carrier (Nosidełko)
  const carrierEnter = smoothstep(0.04, 0.18, p);
  const carrierRock = Math.sin(p * Math.PI * 10) * 3.5 * (1 - smoothstep(0.50, 0.64, p));
  const babyInCarrierAlpha = 1 - smoothstep(0.42, 0.52, p);

  // Stage 3: Crawling Baby (Raczkowanie)
  const crawlEnter = smoothstep(0.40, 0.50, p);
  const crawlMove = smoothstep(0.42, 0.68, p);
  const crawlFade = 1 - smoothstep(0.64, 0.74, p);
  const crawlAlpha = crawlEnter * crawlFade;
  const crawlX = lerp(650, 825, crawlMove);
  const crawlSwing = Math.sin(crawlMove * Math.PI * 6) * 7;

  // Stage 4 -> 5: Child stands up, walks right, grows smoothly from toddler to older child
  const walkEnter = smoothstep(0.63, 0.73, p);
  const walkMove = smoothstep(0.65, 0.97, p);
  const childX = lerp(910, 1265, walkMove);
  const childScale = lerp(0.70, 0.96, walkMove);
  const isWalking = p > 0.65 && p < 0.96 ? 1 : 0;
  const stride = Math.sin(walkMove * Math.PI * 7) * isWalking;

  // Progressive ground line
  const groundWidth = lerp(390, 1410, smoothstep(0.0, 0.95, p));

  // Woman's hand & sleeve dynamic coordinates (clean spacing, zero line clusters)
  const wristX = lerp(52, 74, parentsPregnant);
  const wristY = lerp(304, 310, parentsPregnant);

  return (
    <section className="landing-hero" aria-label="Wprowadzenie do przewodnika rodzicielskiego OtwarteKarty">
      <div className="landing-hero-content">
        <span className="landing-badge">
          Przewodnik dla przyszłych i świeżo upieczonych rodziców · HackNation 2026
        </span>
        <h1 className="landing-title">
          Nowy rozdział w Waszym życiu. <em>Świadome decyzje od pierwszych dni.</em>
        </h1>
        <p className="landing-subtitle">
          Spodziewacie się dziecka lub właśnie zostaliście rodzicami? Zamiast gubić się w gąszczu
          przepisów ZUS i Kodeksu pracy, zagrajcie w 5 prostych rund. Poznajcie Wasze prawa,
          wysokość zasiłków i zaplanujcie optymalny czas z maluchem.
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
            aria-label="Animacja wzrostu dziecka od lewej do prawej: rodzice, nosidełko, raczkowanie i dorastające dziecko"
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
            {/* 1. LEFT: EXPECTING PARENTS (Zero line clusters, clean sleeves)    */}
            {/* ================================================================= */}
            <g transform="translate(135, 0)" opacity={parentsEnter}>
              {/* --- PARTNER (MAN) --- */}
              <g transform="translate(0, 0)">
                {/* 1. Back arm affectionately reaching behind partner's back */}
                <path
                  d="M 80 214 C 104 232 124 256 140 278 L 128 294 C 110 274 92 250 74 234 Z"
                  className="fill-cream ink"
                />

                {/* 2. Legs & Shoes */}
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

                {/* 3. Neck (tucked behind head and collar) */}
                <path
                  d="M 45 158 V 202 H 66 V 158 Z"
                  className="fill-white ink"
                />

                {/* 4. Torso pullover with a single clean crew-neck collar curve (no clustered triangles) */}
                <path
                  d="M 16 216 C 16 200 30 194 44 194 C 50 202 61 202 67 194 C 82 194 94 203 96 220 L 90 360 H 16 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 41 195 C 48 206 63 206 70 195"
                  fill="none"
                  className="ink"
                />

                {/* 5. Head oval */}
                <path
                  d="M 35 122 C 35 98 50 85 70 85 C 90 85 99 101 97 127 C 95 153 83 171 65 171 C 48 171 35 155 35 122 Z"
                  className="fill-white ink"
                />
                {/* Hair cap */}
                <path
                  d="M 35 125 C 32 101 46 80 72 80 C 91 80 103 92 101 107 C 91 100 78 98 62 102 C 50 105 43 114 41 125 Z"
                  className="fill-dark ink"
                />
                {/* Facial features */}
                <path d="M 68 117 Q 74 114 79 117" fill="none" className="ink" />
                <path d="M 85 118 Q 90 116 94 119" fill="none" className="ink" />
                <circle cx="74" cy="124" r="2.1" className="fill-dark" />
                <circle cx="89" cy="125" r="2.1" className="fill-dark" />
                <path d="M 83 125 L 86 138 L 80 140" fill="none" className="ink-thin" />
                <path d="M 73 149 Q 79 153 85 149" fill="none" className="ink-thin" />

                {/* 6. Front hand & seamless sleeve */}
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

              {/* --- PREGNANT WOMAN (Clean blouse & sleeve, zero cluster points) --- */}
              <g transform="translate(128, 12)">
                {/* 1. Legs & Flat Shoes */}
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

                {/* 2. Dark maternity skirt */}
                <path
                  d="M 14 332 L 9 398 H 88 L 86 332 Z"
                  className="fill-dark ink"
                />

                {/* 3. Neck (tucked cleanly under head and blouse neckline) */}
                <path
                  d="M 41 164 V 206 H 60 V 164 Z"
                  className="fill-white ink"
                />

                {/* 4. Teal-blue maternity blouse with a single smooth scoop neckline (no lapels or triangle clusters) */}
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
                {/* Soft cream neckline trim */}
                <path
                  d="M 36 197 C 44 209 58 209 66 197"
                  fill="none"
                  className="ink"
                />

                {/* 5. High bun & dark hair-tie */}
                <circle cx="25" cy="77" r="18" className="fill-white ink" />
                <path
                  d="M 27 93 C 31 87 40 85 46 90 C 42 96 33 98 27 93 Z"
                  className="fill-dark ink"
                />

                {/* 6. Woman's Head */}
                <path
                  d="M 28 130 C 28 104 44 91 64 91 C 84 91 92 108 90 134 C 88 158 76 177 58 177 C 40 177 28 160 28 130 Z"
                  className="fill-white ink"
                />
                {/* Single clean hair sweep line */}
                <path
                  d="M 31 144 C 37 124 44 110 56 105 C 67 101 79 104 89 111"
                  fill="none"
                  className="ink"
                />
                {/* Face details */}
                <path d="M 60 124 Q 66 121 71 124" fill="none" className="ink" />
                <path d="M 78 125 Q 83 123 87 126" fill="none" className="ink" />
                <circle cx="66" cy="131" r="2.0" className="fill-dark" />
                <circle cx="81" cy="132" r="2.0" className="fill-dark" />
                <path d="M 75 132 L 78 145 L 72 147" fill="none" className="ink-thin" />
                <path d="M 66 155 Q 72 158 77 155" fill="none" className="ink-thin" />

                {/* 7. Hand gently resting on belly (drawn before sleeve cuff) */}
                <path
                  d={`M ${wristX - 2} ${wristY - 5} C ${wristX + 14} ${wristY - 7} ${wristX + 24} ${wristY + 2} ${wristX + 18} ${wristY + 11} C ${wristX + 10} ${wristY + 14} ${wristX - 3} ${wristY + 10} ${wristX - 2} ${wristY - 5} Z`}
                  className="fill-white ink"
                />
                {/* 8. Clean, smooth front sleeve with open shoulder join and zero crossing lines */}
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
            {/* 2. CENTER-LEFT: BABY IN CARRIER (NOSIDEŁKO)                       */}
            {/* ================================================================= */}
            {carrierEnter > 0.01 && (
              <g
                transform={`translate(${lerp(420, 458, carrierEnter)}, ${lerp(
                  16,
                  0,
                  carrierEnter,
                )}) rotate(${carrierRock}, 115, 540)`}
                opacity={carrierEnter}
              >
                {/* Carrier canopy hood (clean silhouette, no inner line cluster) */}
                <path
                  d="M 14 492 C 6 444 34 408 76 414 L 62 486 Z"
                  className="fill-blue ink"
                />

                {/* Swaddled Infant */}
                {babyInCarrierAlpha > 0.01 && (
                  <g opacity={babyInCarrierAlpha}>
                    <circle cx="156" cy="458" r="23" className="fill-white ink" />
                    <path d="M 150 436 C 156 429 165 431 163 438" fill="none" className="ink" />
                    <circle cx="153" cy="455" r="1.9" className="fill-dark" />
                    <circle cx="165" cy="457" r="1.9" className="fill-dark" />
                    <path d="M 155 466 Q 160 470 165 466" fill="none" className="ink-thin" />

                    <path
                      d="M 74 494 C 76 472 104 464 138 470 C 164 475 180 486 176 504 C 152 518 96 516 74 494 Z"
                      className="fill-white ink"
                    />
                  </g>
                )}

                {/* Ergonomic curved crescent carrier shell */}
                <path
                  d="M 14 492 C 20 552 62 576 116 576 C 172 576 212 546 224 484 L 194 468 C 176 510 144 526 110 526 C 74 526 46 508 36 476 Z"
                  className="fill-cream ink"
                />

                {/* Arched handle */}
                <path
                  d="M 48 498 C 48 402 182 402 182 498"
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "3.5px" }}
                />
                <path
                  d="M 98 426 Q 115 423 132 426"
                  fill="none"
                  stroke={INK}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <circle cx="48" cy="498" r="6" className="fill-dark ink" />
                <circle cx="182" cy="498" r="6" className="fill-dark ink" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 3. CENTER: CUTE CRAWLING BABY (Proportional rigid-pivot limbs)    */}
            {/* ================================================================= */}
            {crawlAlpha > 0.01 && (
              <g transform={`translate(${crawlX}, 0)`} opacity={crawlAlpha}>
                {/* 1. Back leg & Back arm (pivoting smoothly behind torso) */}
                <g transform={`rotate(${-crawlSwing}, 38, 526)`}>
                  <path
                    d="M 30 524 C 24 544 16 560 4 566 C -2 569 0 576 8 575 C 22 573 34 554 42 528 Z"
                    className="fill-white ink"
                  />
                </g>
                <g transform={`rotate(${crawlSwing}, 92, 522)`}>
                  <path
                    d="M 86 520 L 94 566 C 95 573 105 573 104 565 L 98 518 Z"
                    className="fill-white ink"
                  />
                </g>

                {/* 2. Cozy one-piece baby romper */}
                <path
                  d="M 24 520 C 20 498 42 488 74 490 C 96 492 106 504 102 522 C 96 538 32 538 24 520 Z"
                  className="fill-blue ink"
                />
                {/* Soft cream diaper cover at back */}
                <path
                  d="M 22 518 C 20 500 34 490 48 492 L 44 534 C 30 534 24 528 22 518 Z"
                  className="fill-cream ink"
                />

                {/* 3. Front bent leg & Front arm (rigid rotation around hip/shoulder) */}
                <g transform={`rotate(${crawlSwing}, 38, 526)`}>
                  <path
                    d="M 32 524 C 30 546 22 562 10 568 C 4 571 6 576 15 575 C 28 574 42 554 45 526 Z"
                    className="fill-white"
                  />
                  <path
                    d="M 32 524 C 30 546 22 562 10 568 C 4 571 6 576 15 575 C 28 574 42 554 45 526"
                    fill="none"
                    className="ink"
                  />
                </g>
                <g transform={`rotate(${-crawlSwing}, 88, 522)`}>
                  <path
                    d="M 82 520 L 80 566 C 80 574 91 574 92 566 L 94 520 Z"
                    className="fill-white"
                  />
                  <path
                    d="M 82 520 L 80 566 C 80 574 91 574 92 566 L 94 520"
                    fill="none"
                    className="ink"
                  />
                </g>

                {/* 4. Cute Baby Head with warm expression */}
                <circle cx="110" cy="486" r="24" className="fill-white ink" />
                {/* Soft dark baby hair tuft */}
                <path
                  d="M 96 467 C 102 458 118 458 124 466 C 116 463 104 463 96 467 Z"
                  className="fill-dark ink"
                />
                {/* Cute eyes & gentle smile properly inset inside face */}
                <circle cx="113" cy="484" r="2.0" className="fill-dark" />
                <circle cx="124" cy="485" r="2.0" className="fill-dark" />
                <path d="M 119 487 Q 122 490 119 492" fill="none" className="ink-thin" />
                <path d="M 113 498 Q 118 502 123 498" fill="none" className="ink-thin" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 4 -> 5. RIGHT: WALKING & GROWING CHILD (Clean, natural anatomy)   */}
            {/* ================================================================= */}
            {walkEnter > 0.01 && (
              <g
                transform={`translate(${childX}, 576) scale(${childScale}) translate(0, -576)`}
                opacity={walkEnter}
              >
                {/* 1. Back arm (unified hand & sleeve behind torso) */}
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

                {/* 2. Back leg & neat proportional sneaker */}
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

                {/* 3. Front leg & neat proportional sneaker */}
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

                {/* 4. Neck (layered cleanly behind head and sweater collar) */}
                <path
                  d="M 43 276 V 306 H 59 V 276 Z"
                  className="fill-white ink"
                />

                {/* 5. Cozy Crew-Neck Sweater (clean, uncluttered silhouette) */}
                <path
                  d="M 20 322 C 20 306 32 298 42 298 C 47 305 55 305 60 298 C 72 298 80 308 82 324 L 78 436 H 20 Z"
                  className="fill-blue ink"
                />
                {/* Soft cream crew-neck collar curve */}
                <path
                  d="M 39 299 C 46 308 56 308 63 299"
                  fill="none"
                  className="ink"
                />

                {/* 6. Child's Head (proportional, warm expression, full hair cap) */}
                <path
                  d="M 26 244 C 26 216 40 202 56 202 C 74 202 86 216 84 244 C 82 270 70 286 54 286 C 38 286 26 270 26 244 Z"
                  className="fill-white ink"
                />
                {/* Full, natural hair cap covering back and top of head */}
                <path
                  d="M 26 250 C 21 226 32 198 56 196 C 76 195 90 206 88 222 C 79 215 66 214 52 218 C 39 222 33 234 30 250 Z"
                  className="fill-dark ink"
                />
                {/* Friendly eyes, brows, small nose & happy smile */}
                <path d="M 55 233 Q 60 230 65 233" fill="none" className="ink" />
                <path d="M 70 234 Q 75 232 79 235" fill="none" className="ink" />
                <circle cx="60" cy="240" r="2.1" className="fill-dark" />
                <circle cx="74" cy="241" r="2.1" className="fill-dark" />
                <path d="M 68 242 L 71 252 L 66 254" fill="none" className="ink-thin" />
                <path d="M 58 263 Q 65 269 72 263" fill="none" className="ink" />

                {/* 7. Front arm (smooth hand tucked under open-shoulder sleeve) */}
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

      {/* BECKONING CTA BOX */}
      <div className={`landing-beckon-box ${hasFinished ? "is-finished" : "is-playing"}`}>
        <div className="landing-beckon-header">
          <span className="landing-beckon-badge">
            {hasFinished ? "🌟 Wasza kolej na ruch!" : "👶 Nowy rozdział w Waszym życiu"}
          </span>
          <p className="landing-beckon-text">
            {hasFinished
              ? "Dziecko rośnie w mgnieniu oka — zaplanujcie Wasz wspólny czas i budżet już teraz. Sprawdźcie, jak ułożyć urlopy i zasiłki na Waszych zasadach."
              : "Oczekujecie dziecka lub właśnie zostaliście rodzicami? Zobaczcie, jak ułożyć urlopy i zasiłki na Waszych zasadach."}
          </p>
        </div>

        <div className="landing-cta-actions">
          <a
            href="#gra-otwartekarty"
            className="landing-cta-button primary-cta"
            onClick={scrollToGame}
            id="start-game-cta"
          >
            <span className="cta-icon-pill" aria-hidden="true">🃏</span>
            <span className="cta-text-wrapper">
              <strong className="cta-main-title">Zagraj w OtwarteKarty i poznaj swoje opcje</strong>
              <small className="cta-sub-title">5 szybkich rund · Drzewo decyzji · Gotowy plan</small>
            </span>
            <span className="cta-arrow-badge" aria-hidden="true">↓</span>
          </a>

          <Link href="/calculator" className="landing-cta-button secondary-cta">
            <span>Przejdź do pełnego kalkulatora ZUS</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="landing-trust-pills">
          <span>✓ 100% zgodne z Kodeksem pracy i ustawą zasiłkową</span>
          <span>✓ Bezpłatnie i bez rejestracji</span>
          <span>✓ Dokładne kwoty i dni opieki</span>
        </div>
      </div>
    </section>
  );
}

export const ScrollHero3D = LandingHero;
