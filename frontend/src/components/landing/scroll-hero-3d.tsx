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
  const carrierRock = Math.sin(p * Math.PI * 10) * 3.8 * (1 - smoothstep(0.50, 0.64, p));
  const babyInCarrierAlpha = 1 - smoothstep(0.42, 0.52, p);

  // Stage 3: Crawling Baby (Raczkowanie)
  const crawlEnter = smoothstep(0.40, 0.50, p);
  const crawlMove = smoothstep(0.42, 0.68, p);
  const crawlFade = 1 - smoothstep(0.64, 0.74, p);
  const crawlAlpha = crawlEnter * crawlFade;
  const crawlX = lerp(640, 815, crawlMove);
  const crawlCycle = Math.sin(crawlMove * Math.PI * 5);

  // Stage 4 -> 5: Child stands up, walks right, grows from toddler to tall child
  const walkEnter = smoothstep(0.63, 0.73, p);
  const walkMove = smoothstep(0.65, 0.97, p);
  const childX = lerp(890, 1270, walkMove);
  const childScale = lerp(0.56, 0.96, walkMove);
  const isWalking = p > 0.65 && p < 0.96 ? 1 : 0;
  const stride = Math.sin(walkMove * Math.PI * 7) * isWalking;

  // Progressive ground line
  const groundWidth = lerp(390, 1410, smoothstep(0.0, 0.95, p));

  // Woman's hand & sleeve dynamic coordinates so wrist and hand join seamlessly
  const wristX = lerp(48, 72, parentsPregnant);
  const wristY = lerp(306, 312, parentsPregnant);

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
            {/* 1. LEFT: EXPECTING PARENTS (Clean anatomical layering)            */}
            {/* ================================================================= */}
            <g transform="translate(135, 0)" opacity={parentsEnter}>
              {/* --- PARTNER (MAN) --- */}
              <g transform="translate(0, 0)">
                {/* 1. Back arm & hand (drawn behind torso) */}
                <path
                  d="M 142 290 C 152 288 160 294 158 302 C 156 309 147 310 139 304 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 82 216 C 106 234 126 264 146 288 L 136 304 C 114 282 96 256 76 238 Z"
                  className="fill-cream ink"
                />

                {/* 2. Legs & Shoes (sole lines strictly inside shoe curve) */}
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

                {/* 3. Neck (drawn BEFORE torso/collar & head so top and bottom edges are tucked in!) */}
                <path
                  d="M 45 158 V 202 L 56 214 L 66 202 V 158 Z"
                  className="fill-white ink"
                />

                {/* 4. Torso pullover */}
                <path
                  d="M 16 216 C 16 202 30 194 45 194 L 56 212 L 66 194 C 82 194 94 203 96 220 L 90 360 H 16 Z"
                  className="fill-cream ink"
                />

                {/* 5. Clean shirt collar flaps wrapping the base of the neck */}
                <path
                  d="M 45 186 L 34 202 L 49 212 L 56 206 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 66 186 L 76 202 L 62 212 L 56 206 Z"
                  className="fill-white ink"
                />

                {/* 6. Head oval (covers top of neck cleanly) */}
                <path
                  d="M 35 122 C 35 98 50 85 70 85 C 90 85 99 101 97 127 C 95 153 83 171 65 171 C 48 171 35 155 35 122 Z"
                  className="fill-white ink"
                />
                {/* Hair cap */}
                <path
                  d="M 35 125 C 32 101 46 80 72 80 C 91 80 103 92 101 107 C 91 100 78 98 62 102 C 50 105 43 114 41 125 Z"
                  className="fill-dark ink"
                />
                {/* Ear (open curve, no stray chord) */}
                <path
                  d="M 41 125 C 35 124 34 134 40 137"
                  fill="none"
                  className="ink"
                />
                {/* Minimalist facial features */}
                <path d="M 68 117 Q 74 114 79 117" fill="none" className="ink" />
                <path d="M 85 118 Q 90 116 94 119" fill="none" className="ink" />
                <circle cx="74" cy="124" r="2.1" className="fill-dark" />
                <circle cx="89" cy="125" r="2.1" className="fill-dark" />
                <path d="M 83 125 L 86 138 L 80 140" fill="none" className="ink-thin" />
                <path d="M 73 149 Q 79 153 85 149" fill="none" className="ink-thin" />

                {/* 7. Front hand (drawn BEFORE sleeve cuff so cuff overlaps wrist) */}
                <path
                  d="M 15 320 C 13 333 20 342 28 339 C 34 336 34 327 30 318 Z"
                  className="fill-white ink"
                />
                {/* 8. Front sleeve (seamless open shoulder join: fill first, then open-top outline) */}
                <path
                  d="M 22 210 C 7 240 5 280 14 324 L 31 321 C 25 284 26 250 37 224 Z"
                  className="fill-cream"
                />
                <path
                  d="M 22 210 C 7 240 5 280 14 324 L 31 321 C 25 284 26 250 37 224"
                  fill="none"
                  className="ink"
                />
              </g>

              {/* --- PREGNANT WOMAN --- */}
              <g transform="translate(128, 12)">
                {/* 1. Legs & Flat Shoes (all detail lines strictly inside shoe silhouette) */}
                <path
                  d="M 48 376 L 56 480 L 66 544 H 86 L 80 480 L 66 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 65 544 L 62 564 H 114 C 114 552 102 546 86 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 64 551 Q 78 556 91 547" fill="none" className="ink-thin" />

                <path
                  d="M 18 376 L 19 482 L 25 544 H 46 L 44 482 L 38 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 25 544 L 22 564 H 76 C 76 552 64 546 46 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 24 551 Q 38 556 51 547" fill="none" className="ink-thin" />

                {/* 2. Dark maternity skirt */}
                <path
                  d="M 14 332 L 9 398 H 88 L 86 332 Z"
                  className="fill-dark ink"
                />

                {/* 3. Neck (drawn BEFORE jacket, collar and head so no horizontal bars cut across!) */}
                <path
                  d="M 41 164 V 208 L 51 220 L 60 208 V 164 Z"
                  className="fill-white ink"
                />

                {/* 4. Teal-blue maternity jacket & morphing pregnant belly profile */}
                <path
                  d={`M 15 214 C 22 201 34 198 41 198 L 51 218 L 60 198 C 72 198 81 207 86 222 C ${lerp(
                    96,
                    132,
                    parentsPregnant,
                  )} ${lerp(262, 266, parentsPregnant)} ${lerp(
                    98,
                    136,
                    parentsPregnant,
                  )} ${lerp(312, 318, parentsPregnant)} 88 344 L 12 344 C 8 296 10 246 15 214 Z`}
                  className="fill-blue ink"
                />

                {/* 5. Clean cream blouse collar wrapping neck base */}
                <path
                  d="M 41 192 L 29 210 L 45 222 L 51 215 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 60 192 L 71 210 L 57 222 L 51 215 Z"
                  className="fill-cream ink"
                />

                {/* 6. Jacket lapel line smoothly connected to collar */}
                <path
                  d="M 33 213 L 28 242 L 58 270 L 64 238 L 60 214"
                  fill="none"
                  className="ink"
                />

                {/* 7. High bun & dark hair-tie */}
                <circle cx="25" cy="77" r="18" className="fill-white ink" />
                <path d="M 16 70 C 20 63 28 63 33 67" fill="none" className="ink-thin" />
                <path
                  d="M 27 93 C 31 87 40 85 46 90 C 42 96 33 98 27 93 Z"
                  className="fill-dark ink"
                />

                {/* 8. Woman's Head (covers top of neck cleanly, no colliding face polygons) */}
                <path
                  d="M 28 130 C 28 104 44 91 64 91 C 84 91 92 108 90 134 C 88 158 76 177 58 177 C 40 177 28 160 28 130 Z"
                  className="fill-white ink"
                />
                {/* Swept hair line & ear contour (clean strokes, no double-polygon overlap) */}
                <path
                  d="M 31 148 C 36 130 41 114 52 108 C 63 102 77 104 89 111"
                  fill="none"
                  className="ink"
                />
                <path
                  d="M 38 130 C 32 129 31 139 37 142"
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

                {/* 9. Hand cradling belly (drawn BEFORE sleeve cuff so cuff overlaps wrist cleanly) */}
                <path
                  d={`M ${wristX} ${wristY - 4} C ${wristX + 15} ${wristY - 6} ${wristX + 24} ${wristY + 3} ${wristX + 18} ${wristY + 12} C ${wristX + 10} ${wristY + 15} ${wristX - 2} ${wristY + 11} ${wristX} ${wristY - 4} Z`}
                  className="fill-white ink"
                />
                {/* 10. Woman's Front Sleeve (open shoulder join: fill first, then open-top stroke) */}
                <path
                  d={`M 22 222 C 13 254 20 288 ${wristX - 3} ${wristY + 9} L ${wristX + 5} ${wristY - 5} C 36 280 33 252 40 228 Z`}
                  className="fill-blue"
                />
                <path
                  d={`M 22 222 C 13 254 20 288 ${wristX - 3} ${wristY + 9} L ${wristX + 5} ${wristY - 5} C 36 280 33 252 40 228`}
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
                {/* Carrier canopy hood */}
                <path
                  d="M 14 492 C 6 444 34 408 76 414 L 62 486 Z"
                  className="fill-blue ink"
                />
                <path d="M 29 434 L 62 486" fill="none" className="ink-thin" />

                {/* Swaddled Infant (head drawn BEFORE swaddle so swaddle tucks cleanly under chin) */}
                {babyInCarrierAlpha > 0.01 && (
                  <g opacity={babyInCarrierAlpha}>
                    {/* Baby Head */}
                    <circle cx="156" cy="458" r="23" className="fill-white ink" />
                    <path d="M 150 435 C 156 428 165 430 163 437" fill="none" className="ink" />
                    <circle cx="154" cy="455" r="1.8" className="fill-dark" />
                    <circle cx="166" cy="457" r="1.8" className="fill-dark" />
                    <path d="M 156 466 Q 161 470 166 466" fill="none" className="ink-thin" />

                    {/* Swaddled body tucking cleanly over lower head */}
                    <path
                      d="M 74 494 C 76 472 104 464 138 470 C 164 475 180 486 176 504 C 152 518 96 516 74 494 Z"
                      className="fill-white ink"
                    />
                    {/* Little baby hand emerging naturally from swaddle fold */}
                    <path
                      d="M 122 471 C 120 462 129 457 135 464 C 138 468 135 474 128 475"
                      className="fill-white ink"
                    />
                  </g>
                )}

                {/* Ergonomic curved crescent carrier shell */}
                <path
                  d="M 14 492 C 20 552 62 576 116 576 C 172 576 212 546 224 484 L 194 468 C 176 510 144 526 110 526 C 74 526 46 508 36 476 Z"
                  className="fill-cream ink"
                />
                <path d="M 34 478 C 54 518 164 522 196 469" fill="none" className="ink" />

                {/* Arched handle with curved apex grip following the arch */}
                <path
                  d="M 48 498 C 48 402 182 402 182 498"
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "3.8px" }}
                />
                <path
                  d="M 97 427 Q 115 424 133 427"
                  fill="none"
                  stroke={INK}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                />
                <circle cx="48" cy="498" r="6.5" className="fill-dark ink" />
                <circle cx="182" cy="498" r="6.5" className="fill-dark ink" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 3. CENTER: CRAWLING BABY (RACZKOWANIE)                            */}
            {/* ================================================================= */}
            {crawlAlpha > 0.01 && (
              <g transform={`translate(${crawlX}, 0)`} opacity={crawlAlpha}>
                {/* 1. Back leg & Back arm (drawn BEHIND torso so joints are tucked cleanly) */}
                <path
                  d={`M ${20 - crawlCycle * 8} 524 L ${10 - crawlCycle * 12} 564 L ${-10 - crawlCycle * 12} 573 C ${-14 - crawlCycle * 12} 575 ${-14 - crawlCycle * 12} 565 ${-6 - crawlCycle * 12} 562 L ${2 - crawlCycle * 12} 556 L ${10 - crawlCycle * 8} 520 Z`}
                  className="fill-white ink"
                />
                <path
                  d={`M 78 516 L ${92 + crawlCycle * 12} 566 C ${94 + crawlCycle * 12} 573 ${104 + crawlCycle * 12} 572 ${102 + crawlCycle * 12} 564 L 88 514 Z`}
                  className="fill-white ink"
                />

                {/* 2. Baby romper torso & cream diaper detail */}
                <path
                  d="M 14 522 C 10 498 34 486 64 488 C 90 490 104 504 100 526 C 94 542 26 544 14 522 Z"
                  className="fill-blue ink"
                />
                <path
                  d="M 12 520 C 10 500 26 490 42 492 L 38 536 C 22 536 14 530 12 520 Z"
                  className="fill-cream ink"
                />

                {/* 3. Front leg & Front arm (clean closed shapes with open-top hip/shoulder joins) */}
                <path
                  d={`M 24 528 L ${24 + crawlCycle * 12} 566 L ${6 + crawlCycle * 12} 574 C ${1 + crawlCycle * 12} 575 ${1 + crawlCycle * 12} 566 ${8 + crawlCycle * 12} 563 L ${16 + crawlCycle * 12} 558 L 14 526 Z`}
                  className="fill-white"
                />
                <path
                  d={`M 24 528 L ${24 + crawlCycle * 12} 566 L ${6 + crawlCycle * 12} 574 C ${1 + crawlCycle * 12} 575 ${1 + crawlCycle * 12} 566 ${8 + crawlCycle * 12} 563 L ${16 + crawlCycle * 12} 558 L 14 526`}
                  fill="none"
                  className="ink"
                />

                <path
                  d={`M 80 522 L ${76 - crawlCycle * 12} 568 C ${76 - crawlCycle * 12} 574 ${88 - crawlCycle * 12} 575 ${88 - crawlCycle * 12} 567 L 90 520 Z`}
                  className="fill-white"
                />
                <path
                  d={`M 80 522 L ${76 - crawlCycle * 12} 568 C ${76 - crawlCycle * 12} 574 ${88 - crawlCycle * 12} 575 ${88 - crawlCycle * 12} 567 L 90 520`}
                  fill="none"
                  className="ink"
                />

                {/* 4. Crawling Baby Head (overlaps front of romper cleanly) */}
                <circle cx="112" cy="482" r="26" className="fill-white ink" />
                <path d="M 103 457 C 109 447 121 449 119 458" fill="none" className="ink" />
                <path d="M 97 482 C 92 481 91 489 96 491" fill="none" className="ink" />
                <circle cx="118" cy="478" r="2.0" className="fill-dark" />
                <circle cx="130" cy="480" r="2.0" className="fill-dark" />
                <path d="M 126 481 L 129 488 L 124 489" fill="none" className="ink-thin" />
                <path d="M 118 495 Q 124 499 129 495" fill="none" className="ink-thin" />
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
                {/* 1. Back arm (drawn BEHIND torso; hand drawn before sleeve cuff) */}
                <g transform={`rotate(${stride * 18}, 62, 272)`}>
                  <circle cx="94" cy="364" r="9.5" className="fill-white ink" />
                  <path
                    d="M 54 270 C 72 298 86 328 99 355 L 85 364 C 70 338 58 312 44 284 Z"
                    className="fill-blue ink"
                  />
                </g>

                {/* 2. Back leg & shoe (sole line strictly inside toe curve) */}
                <g transform={`rotate(${-stride * 15}, 54, 410)`}>
                  <path
                    d="M 44 404 L 56 546 H 76 L 68 404 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 55 546 L 53 576 H 103 C 103 562 91 550 76 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="54" y1="570" x2="101.5" y2="570" className="ink-thin" />
                </g>

                {/* 3. Front leg & shoe (sole line strictly inside toe curve) */}
                <g transform={`rotate(${stride * 17}, 42, 410)`}>
                  <path
                    d="M 24 404 L 28 546 H 48 L 48 404 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 27 546 L 25 576 H 77 C 77 562 63 550 48 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="26" y1="570" x2="75.5" y2="570" className="ink-thin" />
                </g>

                {/* 4. Neck (drawn BEFORE jacket, collar and head so no horizontal lines cut across!) */}
                <path
                  d="M 43 212 V 254 L 52 264 L 60 254 V 212 Z"
                  className="fill-white ink"
                />

                {/* 5. Child's Jacket / Top */}
                <path
                  d="M 18 268 C 18 252 32 244 43 244 L 52 262 L 60 244 C 74 244 84 254 86 272 L 80 412 H 18 Z"
                  className="fill-blue ink"
                />
                {/* 6. Cream collar flaps wrapping neck base */}
                <path
                  d="M 43 238 L 31 256 L 46 268 L 52 260 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 60 238 L 71 256 L 57 268 L 52 260 Z"
                  className="fill-cream ink"
                />
                <line x1="52" y1="262" x2="52" y2="412" className="ink" />

                {/* 7. Child's Head (covers top of neck cleanly) */}
                <g
                  transform={`translate(52, 185) scale(${lerp(
                    1.14,
                    0.96,
                    walkMove,
                  )}) translate(-52, -185)`}
                >
                  <path
                    d="M 25 176 C 25 148 40 134 62 134 C 84 134 94 150 92 178 C 90 204 76 223 56 223 C 38 223 25 206 25 176 Z"
                    className="fill-white ink"
                  />
                  <path
                    d="M 26 182 C 19 160 29 132 56 128 C 78 125 97 136 97 151 C 85 145 72 144 56 148 C 42 152 34 165 26 182 Z"
                    className="fill-dark ink"
                  />
                  {/* Ear (open contour, no stray chord) */}
                  <path
                    d="M 35 176 C 29 175 28 186 34 189"
                    fill="none"
                    className="ink"
                  />
                  <path d="M 58 166 Q 64 163 69 166" fill="none" className="ink" />
                  <path d="M 76 167 Q 81 165 85 168" fill="none" className="ink" />
                  <circle cx="64" cy="174" r="2.2" className="fill-dark" />
                  <circle cx="80" cy="175" r="2.2" className="fill-dark" />
                  <path d="M 74 175 L 77 188 L 71 190" fill="none" className="ink-thin" />
                  <path d="M 63 199 Q 70 204 77 199" fill="none" className="ink" />
                </g>

                {/* 8. Front arm (hand drawn before cuff; open shoulder seam) */}
                <g transform={`rotate(${-stride * 18}, 32, 272)`}>
                  <circle cx="26" cy="368" r="9.5" className="fill-white ink" />
                  <path
                    d="M 23 266 C 12 296 11 330 18 362 L 34 360 C 28 330 30 300 39 274 Z"
                    className="fill-blue"
                  />
                  <path
                    d="M 23 266 C 12 296 11 330 18 362 L 34 360 C 28 330 30 300 39 274"
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
