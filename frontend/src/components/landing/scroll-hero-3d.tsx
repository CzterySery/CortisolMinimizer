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

// ============================================================================
// EDITORIAL 2D VECTOR LINE-ART SCROLL ANIMATION (Left -> Right Progression)
// Style matched to user's reference image:
// - Clean crisp dark ink outlines (#1c1d1f, 2.2px, round caps/joins)
// - Pure white skin & hair volumes with black hair-tie/brow/eye details
// - Flat solid accent fills: sage/teal-green (#527561 / #397a98), warm cream (#f3eae0),
//   charcoal darks (#1c1d1f), soft olive (#a6b585)
// - Progression strictly from LEFT to RIGHT as the user scrolls:
//   1. Left (x: 110..330): Expecting Couple (Man + Pregnant Woman with high bun)
//   2. Center-Left (x: 430..610): Baby in ergonomic carrier/cradle (nosidełko)
//   3. Center (x: 690..870): Baby crawling on hands and knees to the right (raczkowanie)
//   4. Center-Right (x: 940..1120): Toddler taking first steps to the right
//   5. Far-Right (x: 1180..1380): Grown child striding confidently forward
// ============================================================================

const INK = "#1c1d1f";
const WHITE = "#ffffff";
const CREAM = "#f3eae0";
const ACCENT = "#527561"; // OtwarteKarty signature sage green (harmonizing with reference's flat jacket fill)
const ACCENT_BLUE = "#3b7a9c"; // Reference editorial blue-teal accent
const ACCENT_LIGHT = "#dce5d7";

export function ScrollHero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function onScroll() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const raw = clamp(-rect.top / scrollable, 0, 1);
      targetRef.current = raw;
      if (reducedMotion) {
        currentRef.current = raw;
        setProgress(raw);
      }
    }

    function tick() {
      const next = lerp(currentRef.current, targetRef.current, 0.14);
      if (Math.abs(next - currentRef.current) > 0.0004 || Math.abs(targetRef.current - currentRef.current) > 0.0004) {
        currentRef.current = next;
        setProgress(next);
      }
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(tick);
      }
    }

    onScroll();
    if (!reducedMotion) {
      rafId = window.requestAnimationFrame(tick);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Scroll timings (0.0 -> 1.0, strictly left-to-right story):
  const p = progress;

  // Stage 1 (Always visible at left, subtle breathing/weight shift as scroll begins)
  const parentsEnter = 1;
  const parentsPregnant = 1 - smoothstep(0.14, 0.28, p); // belly gently softens after carrier appears

  // Stage 2: Baby in Carrier (Nosidełko) appears to the right of parents and stays longer in focus (p: 0.05 -> 0.48)
  const carrierEnter = smoothstep(0.04, 0.18, p);
  const carrierRock = Math.sin(p * Math.PI * 10) * 4.2 * (1 - smoothstep(0.50, 0.64, p));
  const babyInCarrierAlpha = 1 - smoothstep(0.42, 0.52, p);

  // Stage 3: Crawling Baby (Raczkowanie) emerges from carrier moving right (p: 0.42 -> 0.68)
  const crawlEnter = smoothstep(0.40, 0.50, p);
  const crawlMove = smoothstep(0.42, 0.68, p);
  const crawlFade = 1 - smoothstep(0.64, 0.74, p);
  const crawlAlpha = crawlEnter * crawlFade;
  const crawlX = lerp(635, 815, crawlMove);
  const crawlCycle = Math.sin(crawlMove * Math.PI * 5);

  // Stage 4 -> 5: Child stands up, walks right, and grows from toddler to tall child (p: 0.64 -> 0.98)
  const walkEnter = smoothstep(0.63, 0.73, p);
  const walkMove = smoothstep(0.65, 0.97, p);
  // Continuous left-to-right travel from x = 885 to x = 1275
  const childX = lerp(885, 1275, walkMove);
  // Continuous growth scale from toddler (0.56) to tall older child (0.96)
  const childScale = lerp(0.56, 0.96, walkMove);
  // Walking stride cycle as child moves right
  const isWalking = p > 0.65 && p < 0.96 ? 1 : 0;
  const stride = Math.sin(walkMove * Math.PI * 7) * isWalking;

  // Ground line progressive draw from left to right
  const groundWidth = lerp(390, 1410, smoothstep(0.0, 0.95, p));

  return (
    <section
      className="scroll-hero"
      ref={containerRef}
      aria-label="Ilustracja 2D: od rodziców w ciąży, przez niemowlę w nosidełku i raczkowanie, aż po rosnące dziecko idące w prawo"
    >
      <div className="scroll-hero-sticky">
        <div className="scroll-hero-viewport">
          <svg
            className="scroll-hero-svg"
            viewBox="0 0 1480 680"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Animacja wzrostu dziecka od lewej do prawej: rodzice, nosidełko, raczkowanie i dorastające dziecko"
          >
            <defs>
              <style>{`
                .ink { stroke: ${INK}; stroke-width: 2.3px; stroke-linecap: round; stroke-linejoin: round; }
                .ink-thin { stroke: ${INK}; stroke-width: 1.7px; stroke-linecap: round; stroke-linejoin: round; }
                .fill-white { fill: ${WHITE}; }
                .fill-cream { fill: ${CREAM}; }
                .fill-dark { fill: ${INK}; }
                .fill-sage { fill: ${ACCENT}; }
                .fill-blue { fill: ${ACCENT_BLUE}; }
                .fill-soft { fill: ${ACCENT_LIGHT}; }
              `}</style>
            </defs>

            {/* Minimalist continuous editorial floor line drawing from left to right */}
            <line
              x1="50"
              y1="576"
              x2={groundWidth}
              y2="576"
              className="ink"
            />

            {/* ================================================================= */}
            {/* 1. LEFT: EXPECTING PARENTS (Man & Pregnant Woman facing right)    */}
            {/* ================================================================= */}
            <g
              transform="translate(135, 0)"
              opacity={parentsEnter}
            >
              {/* --- PARTNER (MAN) standing on the left, facing slightly right --- */}
              <g transform="translate(0, 0)">
                {/* Back leg (right leg) */}
                <path
                  d="M 78 362 L 94 470 L 98 552 H 72 L 64 470 L 54 362 Z"
                  className="fill-dark ink"
                />
                {/* Back shoe */}
                <path
                  d="M 72 552 L 70 576 H 122 C 122 563 111 555 98 552 Z"
                  className="fill-cream ink"
                />
                <line x1="70" y1="571" x2="122" y2="571" className="ink-thin" />

                {/* Front leg (left leg) */}
                <path
                  d="M 42 362 L 46 472 L 48 552 H 22 L 18 472 L 16 362 Z"
                  className="fill-dark ink"
                />
                {/* Front shoe */}
                <path
                  d="M 22 552 L 20 576 H 74 C 74 563 62 555 48 552 Z"
                  className="fill-cream ink"
                />
                <line x1="20" y1="571" x2="74" y2="571" className="ink-thin" />

                {/* Back arm (reaching affectionately toward partner) */}
                <path
                  d="M 86 226 C 112 242 132 272 154 294 L 146 310 C 120 292 102 268 78 250 Z"
                  className="fill-cream ink"
                />

                {/* Torso / Shirt & Pullover */}
                <path
                  d="M 16 218 C 16 204 32 196 54 196 C 78 196 94 205 98 222 L 92 364 H 16 Z"
                  className="fill-cream ink"
                />
                {/* Collar & V-neck detail */}
                <path
                  d="M 38 194 L 56 224 L 74 194"
                  fill="none"
                  className="ink"
                />
                <path
                  d="M 42 186 L 34 204 L 54 214 L 72 204 L 66 186 Z"
                  className="fill-white ink"
                />

                {/* Neck & Head (clean white fill + minimalist facial lines like reference) */}
                <path
                  d="M 44 166 V 196 H 66 V 166 Z"
                  className="fill-white ink"
                />
                {/* Head oval facing 3/4 right */}
                <path
                  d="M 34 122 C 34 98 50 86 70 86 C 90 86 100 102 98 128 C 96 154 84 172 66 172 C 48 172 34 156 34 122 Z"
                  className="fill-white ink"
                />
                {/* Minimalist hair cap (dark ink fill or clean white with line art) */}
                <path
                  d="M 34 126 C 31 102 46 80 72 80 C 92 80 104 92 102 108 C 92 100 78 98 62 102 C 50 105 44 114 42 126 Z"
                  className="fill-dark ink"
                />
                {/* Ear */}
                <path
                  d="M 42 124 C 35 122 33 134 40 138"
                   className="fill-white ink"
                />
                {/* Minimalist face: eyebrows, dot eyes, L-nose, gentle smile */}
                <path d="M 68 117 Q 74 114 79 117" fill="none" className="ink" />
                <path d="M 86 118 Q 91 116 95 119" fill="none" className="ink" />
                <circle cx="74" cy="124" r="2.1" className="fill-dark" />
                <circle cx="90" cy="125" r="2.1" className="fill-dark" />
                <path d="M 84 125 L 87 139 L 81 141" fill="none" className="ink-thin" />
                <path d="M 73 150 Q 80 154 86 150" fill="none" className="ink-thin" />

                {/* Front arm (left arm, relaxed at side / pocket) */}
                <path
                  d="M 22 214 C 6 244 4 282 14 326 L 30 324 C 24 286 24 252 36 226 Z"
                  className="fill-cream ink"
                />
                {/* Hand at hip/pocket */}
                <path
                  d="M 14 326 C 14 338 22 344 30 340 C 34 337 33 329 30 324 Z"
                  className="fill-white ink"
                />
              </g>

              {/* --- PREGNANT WOMAN standing beside him, facing 3/4 right (styled directly after reference!) --- */}
              <g transform="translate(128, 12)">
                {/* Back leg */}
                <path
                  d="M 66 376 L 82 480 L 86 544 H 66 L 54 480 L 46 376 Z"
                  className="fill-white ink"
                />
                {/* Back flat shoe (cream with toe line, exact match to reference) */}
                <path
                  d="M 65 544 L 62 564 H 116 C 116 552 104 546 86 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 64 550 Q 82 556 96 550" fill="none" className="ink-thin" />
                <path d="M 101 548 V 564" fill="none" className="ink-thin" />

                {/* Front leg */}
                <path
                  d="M 38 376 L 44 482 L 46 544 H 26 L 18 482 L 18 376 Z"
                  className="fill-white ink"
                />
                {/* Front flat shoe */}
                <path
                  d="M 25 544 L 22 564 H 78 C 78 552 65 546 46 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 24 550 Q 42 556 58 550" fill="none" className="ink-thin" />
                <path d="M 63 548 V 564" fill="none" className="ink-thin" />

                {/* Dark skirt / maternity dress lower half */}
                <path
                  d="M 14 326 L 8 398 H 88 L 86 326 Z"
                  className="fill-dark ink"
                />

                {/* Cream blouse collar at neck */}
                <path
                  d="M 34 196 L 26 218 L 52 232 L 74 216 L 66 196 Z"
                  className="fill-cream ink"
                />

                {/* Teal-blue / Sage jacket & pregnant belly profile (morphs belly curvature via parentsPregnant) */}
                <path
                  d={`M 16 214 C 24 202 40 200 54 200 C 68 200 80 208 86 224 C ${lerp(
                    96,
                    132,
                    parentsPregnant,
                  )} ${lerp(262, 266, parentsPregnant)} ${lerp(
                    98,
                    136,
                    parentsPregnant,
                  )} ${lerp(312, 318, parentsPregnant)} 88 344 L 12 344 C 8 296 10 246 16 214 Z`}
                  className="fill-blue ink"
                />
                {/* Jacket lapel lines (exact editorial style from reference) */}
                <path
                  d="M 30 206 L 24 242 L 62 274 L 68 236 L 62 206"
                  fill="none"
                  className="ink"
                />

                {/* Neck */}
                <path
                  d="M 40 174 V 204 H 60 V 174 Z"
                  className="fill-white ink"
                />

                {/* High bun with dark hair-tie (signature hairstyle from user's reference image!) */}
                <circle cx="25" cy="76" r="19" className="fill-white ink" />
                <path d="M 15 68 C 19 60 28 60 33 65" fill="none" className="ink-thin" />
                {/* Dark scrunchie / hair band */}
                <path
                  d="M 27 94 C 31 87 40 85 46 90 C 42 97 33 99 27 94 Z"
                  className="fill-dark ink"
                />

                {/* Woman's Head & Hair silhouette */}
                <path
                  d="M 28 130 C 28 104 44 92 64 92 C 84 92 92 108 90 134 C 88 158 76 178 58 178 C 40 178 28 160 28 130 Z"
                  className="fill-white ink"
                />
                {/* Swept side-part hair volume */}
                <path
                  d="M 38 158 C 22 146 20 114 34 96 C 48 82 78 84 96 104 C 98 110 92 114 84 112 C 70 108 56 106 46 116 C 45 124 42 142 38 158 Z"
                  className="fill-white ink"
                />
                {/* Ear */}
                <path
                  d="M 38 128 C 31 126 30 138 37 142"
                  className="fill-white ink"
                />
                {/* Minimalist face details matching reference */}
                <path d="M 60 124 Q 66 121 71 124" fill="none" className="ink" />
                <path d="M 78 125 Q 83 123 87 126" fill="none" className="ink" />
                <circle cx="66" cy="131" r="2.0" className="fill-dark" />
                <circle cx="81" cy="132" r="2.0" className="fill-dark" />
                <path d="M 75 132 L 78 145 L 72 147" fill="none" className="ink-thin" />
                <path d="M 66 156 Q 72 159 77 156" fill="none" className="ink-thin" />

                {/* Woman's Front Arm & Hand gently cradling her pregnant belly */}
                <path
                  d={`M 24 224 C 14 256 22 292 ${lerp(46, 72, parentsPregnant)} ${lerp(
                    312,
                    318,
                    parentsPregnant,
                  )} L ${lerp(54, 80, parentsPregnant)} ${lerp(
                    298,
                    302,
                    parentsPregnant,
                  )} C 38 282 34 254 42 228 Z`}
                  className="fill-blue ink"
                />
                {/* Expressive line-art hand resting on belly */}
                <path
                  d={`M ${lerp(50, 76, parentsPregnant)} ${lerp(
                    300,
                    304,
                    parentsPregnant,
                  )} C ${lerp(64, 92, parentsPregnant)} ${lerp(
                    298,
                    302,
                    parentsPregnant,
                  )} ${lerp(72, 102, parentsPregnant)} ${lerp(
                    308,
                    312,
                    parentsPregnant,
                  )} ${lerp(66, 94, parentsPregnant)} ${lerp(
                    318,
                    322,
                    parentsPregnant,
                  )} C ${lerp(58, 84, parentsPregnant)} ${lerp(
                    320,
                    324,
                    parentsPregnant,
                  )} ${lerp(48, 72, parentsPregnant)} ${lerp(
                    316,
                    320,
                    parentsPregnant,
                  )} ${lerp(50, 76, parentsPregnant)} ${lerp(
                    300,
                    304,
                    parentsPregnant,
                  )} Z`}
                  className="fill-white ink"
                />
              </g>
            </g>

            {/* ================================================================= */}
            {/* 2. CENTER-LEFT: BABY IN CARRIER (NOSIDEŁKO)                       */}
            {/* ================================================================= */}
            {carrierEnter > 0.01 && (
              <g
                transform={`translate(${lerp(415, 455, carrierEnter)}, ${lerp(
                  18,
                  0,
                  carrierEnter,
                )}) rotate(${carrierRock}, 95, 540)`}
                opacity={carrierEnter}
              >
                {/* Ergonomic curved crescent carrier shell resting on floor at y=576 */}
                <path
                  d="M 12 492 C 18 552 62 576 116 576 C 172 576 212 546 224 484 L 194 468 C 176 510 144 526 110 526 C 74 526 46 508 36 476 Z"
                  className="fill-cream ink"
                />
                {/* Soft inner mattress rim */}
                <path
                  d="M 32 478 C 52 518 164 522 198 468"
                  fill="none"
                  className="ink"
                />
                {/* Carrier sun-canopy hood on the left end of the cradle */}
                <path
                  d="M 12 492 C 4 442 32 406 76 412 L 62 486 Z"
                  className="fill-blue ink"
                />
                <path d="M 28 432 L 62 486" fill="none" className="ink-thin" />

                {/* Swaddled Infant inside the carrier (fades out as baby crawls out to the right!) */}
                {babyInCarrierAlpha > 0.01 && (
                  <g opacity={babyInCarrierAlpha}>
                    {/* Swaddled body */}
                    <path
                      d="M 78 494 C 78 472 104 464 138 470 C 164 475 182 488 178 506 C 154 520 98 518 78 494 Z"
                      className="fill-white ink"
                    />
                    {/* Baby Head peeking up on the right side of the cradle */}
                    <circle cx="158" cy="456" r="24" className="fill-white ink" />
                    {/* Little baby hair curl */}
                    <path
                      d="M 152 432 C 158 424 168 426 166 434"
                      fill="none"
                      className="ink"
                    />
                    {/* Baby eyes & smile */}
                    <circle cx="156" cy="454" r="1.8" className="fill-dark" />
                    <circle cx="168" cy="456" r="1.8" className="fill-dark" />
                    <path
                      d="M 158 465 Q 163 469 168 465"
                      fill="none"
                      className="ink-thin"
                    />
                    {/* Little waving baby hand */}
                    <circle cx="128" cy="466" r="8" className="fill-white ink" />
                  </g>
                )}

                {/* Carrier arched handle with dark grip at top */}
                <path
                  d="M 48 498 C 44 398 184 398 182 498"
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "4.5px" }}
                />
                <path
                  d="M 96 422 H 134"
                  fill="none"
                  stroke={INK}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Handle pivot joint circle */}
                <circle cx="48" cy="498" r="7" className="fill-dark ink" />
                <circle cx="182" cy="498" r="7" className="fill-dark ink" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 3. CENTER: CRAWLING BABY (RACZKOWANIE) moving left -> right       */}
            {/* ================================================================= */}
            {crawlAlpha > 0.01 && (
              <g
                transform={`translate(${crawlX}, 0)`}
                opacity={crawlAlpha}
              >
                {/* Back knee & lower leg crawling */}
                <path
                  d={`M ${24 - crawlCycle * 10} 534 L ${12 - crawlCycle * 14} 568 L ${-14 - crawlCycle * 14} 574`}
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "14px" }}
                />
                <path
                  d={`M ${24 - crawlCycle * 10} 534 L ${12 - crawlCycle * 14} 568 L ${-14 - crawlCycle * 14} 574`}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Back arm supporting torso */}
                <path
                  d={`M 82 518 L ${96 + crawlCycle * 14} 570`}
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "13px" }}
                />
                <path
                  d={`M 82 518 L ${96 + crawlCycle * 14} 570`}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth="9"
                  strokeLinecap="round"
                />

                {/* Baby romper / onesie torso (horizontal crawling posture) */}
                <path
                  d="M 14 522 C 10 498 34 486 64 488 C 90 490 104 504 100 526 C 94 542 26 544 14 522 Z"
                  className="fill-blue ink"
                />
                {/* Diaper / shorts back detail */}
                <path
                  d="M 12 520 C 10 500 26 490 42 492 L 38 536 C 22 536 14 530 12 520 Z"
                  className="fill-cream ink"
                />

                {/* Front knee & foot crawling */}
                <path
                  d={`M 28 526 L ${28 + crawlCycle * 14} 568 L ${2 + crawlCycle * 14} 574`}
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "15px" }}
                />
                <path
                  d={`M 28 526 L ${28 + crawlCycle * 14} 568 L ${2 + crawlCycle * 14} 574`}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Front arm reaching right */}
                <path
                  d={`M 86 518 L ${80 - crawlCycle * 14} 570 L ${92 - crawlCycle * 14} 573`}
                  fill="none"
                  className="ink"
                  style={{ strokeWidth: "14px" }}
                />
                <path
                  d={`M 86 518 L ${80 - crawlCycle * 14} 570 L ${92 - crawlCycle * 14} 573`}
                  fill="none"
                  stroke={WHITE}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Crawling Baby Head looking eagerly to the right */}
                <circle cx="112" cy="482" r="27" className="fill-white ink" />
                {/* Cute tuft of hair */}
                <path
                  d="M 102 456 C 108 444 122 446 120 457"
                  fill="none"
                  className="ink"
                />
                {/* Ear */}
                <path
                  d="M 98 482 C 93 480 92 489 97 492"
                  className="fill-white ink"
                />
                {/* Face looking right */}
                <circle cx="118" cy="478" r="2.0" className="fill-dark" />
                <circle cx="130" cy="480" r="2.0" className="fill-dark" />
                <path d="M 126 481 L 129 488 L 124 489" fill="none" className="ink-thin" />
                <path d="M 118 495 Q 124 499 129 495" fill="none" className="ink-thin" />
              </g>
            )}

            {/* ================================================================= */}
            {/* 4 -> 5. RIGHT: WALKING & GROWING CHILD (Toddler -> Big Kid)       */}
            {/* Moves strictly left-to-right while scaling smoothly from 0.56->0.96*/}
            {/* ================================================================= */}
            {walkEnter > 0.01 && (
              <g
                transform={`translate(${childX}, 576) scale(${childScale}) translate(0, -576)`}
                opacity={walkEnter}
              >
                {/* Back leg swinging with walking stride */}
                <g transform={`rotate(${-stride * 16}, 54, 410)`}>
                  <path
                    d="M 44 404 L 56 546 H 76 L 68 404 Z"
                    className="fill-dark ink"
                  />
                  {/* Back shoe */}
                  <path
                    d="M 55 546 L 53 576 H 104 C 104 562 92 550 76 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="53" y1="570" x2="104" y2="570" className="ink-thin" />
                </g>

                {/* Front leg swinging with walking stride */}
                <g transform={`rotate(${stride * 18}, 42, 410)`}>
                  <path
                    d="M 24 404 L 28 546 H 48 L 48 404 Z"
                    className="fill-dark ink"
                  />
                  {/* Front shoe */}
                  <path
                    d="M 27 546 L 25 576 H 78 C 78 562 64 550 48 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="25" y1="570" x2="78" y2="570" className="ink-thin" />
                </g>

                {/* Back arm swinging forward as child walks right */}
                <g transform={`rotate(${stride * 20}, 62, 276)`}>
                  <path
                    d="M 54 272 C 74 302 88 332 102 358 L 88 368 C 72 342 58 314 44 286 Z"
                    className="fill-blue ink"
                  />
                  <circle cx="96" cy="366" r="10" className="fill-white ink" />
                </g>

                {/* Child's Jacket / Top (matching mother's editorial blue-teal & cream palette) */}
                <path
                  d="M 18 268 C 18 252 34 244 52 244 C 70 244 84 254 86 272 L 80 412 H 18 Z"
                  className="fill-blue ink"
                />
                {/* Cream collar & vertical jacket detail */}
                <path
                  d="M 36 244 L 30 264 L 54 276 L 72 262 L 66 244 Z"
                  className="fill-cream ink"
                />
                <line x1="54" y1="276" x2="54" y2="412" className="ink" />

                {/* Neck */}
                <path
                  d="M 42 222 V 248 H 60 V 222 Z"
                  className="fill-white ink"
                />

                {/* Child's Head (allometrically slightly larger when toddler, balanced when older) */}
                <g
                  transform={`translate(52, 185) scale(${lerp(
                    1.16,
                    0.96,
                    walkMove,
                  )}) translate(-52, -185)`}
                >
                  <path
                    d="M 24 176 C 24 148 40 134 62 134 C 84 134 94 150 92 178 C 90 204 76 224 56 224 C 38 224 24 206 24 176 Z"
                    className="fill-white ink"
                  />
                  {/* Playful editorial hair with top wave */}
                  <path
                    d="M 26 184 C 18 162 28 132 56 128 C 78 125 98 136 98 152 C 86 146 72 144 56 148 C 42 152 34 166 26 184 Z"
                    className="fill-dark ink"
                  />
                  {/* Ear */}
                  <path
                    d="M 34 176 C 27 174 26 186 33 190"
                    className="fill-white ink"
                  />
                  {/* Eyes, eyebrows, L-nose, happy smile facing right */}
                  <path d="M 58 166 Q 64 163 69 166" fill="none" className="ink" />
                  <path d="M 76 167 Q 81 165 85 168" fill="none" className="ink" />
                  <circle cx="64" cy="174" r="2.2" className="fill-dark" />
                  <circle cx="80" cy="175" r="2.2" className="fill-dark" />
                  <path d="M 74 175 L 77 188 L 71 190" fill="none" className="ink-thin" />
                  <path d="M 63 199 Q 70 204 77 199" fill="none" className="ink" />
                </g>

                {/* Front arm swinging naturally */}
                <g transform={`rotate(${-stride * 20}, 34, 276)`}>
                  <path
                    d="M 24 270 C 12 300 10 334 18 366 L 34 364 C 28 334 30 304 40 278 Z"
                    className="fill-blue ink"
                  />
                  <circle cx="26" cy="372" r="10" className="fill-white ink" />
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>
    </section>
  );
}
