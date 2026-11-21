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
const ACCENT = "#527561"; // OtwarteKarty signature sage green
const ACCENT_BLUE = "#3b7a9c"; // Editorial blue-teal accent
const ACCENT_LIGHT = "#dce5d7";

const DURATION_MS = 5600; // Autonomous story progression duration

interface Milestone {
  id: string;
  name: string;
  progress: number;
}

const MILESTONES: Milestone[] = [
  { id: "pregnancy", name: "1. Ciąża i oczekiwanie", progress: 0.0 },
  { id: "carrier", name: "2. Narodziny i niemowlę", progress: 0.28 },
  { id: "crawl", name: "3. Pierwszy rok (raczkowanie)", progress: 0.58 },
  { id: "steps", name: "4. Samodzielność i rozwój", progress: 0.98 },
];

export function LandingHero() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasFinished, setHasFinished] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState("pregnancy");
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const userInteractedRef = useRef(false);

  // Autonomous playback loop on mount
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setProgress(1);
      setHasFinished(true);
      setIsPlaying(false);
      setCurrentMilestone("steps");
      return;
    }

    function runAnimation(now: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const rawT = clamp(elapsed / DURATION_MS, 0, 1);
      // Gentle ease-in-out curve
      const easedT = rawT < 0.5
        ? 2 * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      setProgress(easedT);

      // Determine active milestone badge
      if (easedT < 0.22) setCurrentMilestone("pregnancy");
      else if (easedT < 0.50) setCurrentMilestone("carrier");
      else if (easedT < 0.85) setCurrentMilestone("crawl");
      else setCurrentMilestone("steps");

      if (rawT < 1 && !userInteractedRef.current) {
        rafRef.current = window.requestAnimationFrame(runAnimation);
      } else {
        if (!userInteractedRef.current) {
          setProgress(1);
          setCurrentMilestone("steps");
          setIsPlaying(false);
          setHasFinished(true);
        }
      }
    }

    rafRef.current = window.requestAnimationFrame(runAnimation);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleReplay() {
    userInteractedRef.current = false;
    setProgress(0);
    setCurrentMilestone("pregnancy");
    setHasFinished(false);
    setIsPlaying(true);
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

      if (easedT < 0.22) setCurrentMilestone("pregnancy");
      else if (easedT < 0.50) setCurrentMilestone("carrier");
      else if (easedT < 0.85) setCurrentMilestone("crawl");
      else setCurrentMilestone("steps");

      if (rawT < 1 && !userInteractedRef.current) {
        rafRef.current = window.requestAnimationFrame(loop);
      } else {
        if (!userInteractedRef.current) {
          setProgress(1);
          setCurrentMilestone("steps");
          setIsPlaying(false);
          setHasFinished(true);
        }
      }
    }

    rafRef.current = window.requestAnimationFrame(loop);
  }

  function handleSelectMilestone(targetP: number, id: string) {
    userInteractedRef.current = true;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setHasFinished(true);
    setProgress(targetP);
    setCurrentMilestone(id);
  }

  function scrollToGame(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    const gameSection = document.getElementById("gra-otwartekarty");
    if (gameSection) {
      gameSection.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Animation math (0.0 -> 1.0 progression strictly left-to-right)
  const p = progress;

  // Stage 1 (Parents visible at left, pregnant belly profile)
  const parentsEnter = 1;
  const parentsPregnant = 1 - smoothstep(0.14, 0.28, p);

  // Stage 2: Baby in Carrier (Nosidełko) appears to the right of parents (p: 0.05 -> 0.48)
  const carrierEnter = smoothstep(0.04, 0.18, p);
  const carrierRock = Math.sin(p * Math.PI * 10) * 4.2 * (1 - smoothstep(0.50, 0.64, p));
  const babyInCarrierAlpha = 1 - smoothstep(0.42, 0.52, p);

  // Stage 3: Crawling Baby (Raczkowanie) emerges moving right (p: 0.42 -> 0.68)
  const crawlEnter = smoothstep(0.40, 0.50, p);
  const crawlMove = smoothstep(0.42, 0.68, p);
  const crawlFade = 1 - smoothstep(0.64, 0.74, p);
  const crawlAlpha = crawlEnter * crawlFade;
  const crawlX = lerp(635, 815, crawlMove);
  const crawlCycle = Math.sin(crawlMove * Math.PI * 5);

  // Stage 4 -> 5: Child stands up, walks right, grows from toddler to tall child (p: 0.64 -> 0.98)
  const walkEnter = smoothstep(0.63, 0.73, p);
  const walkMove = smoothstep(0.65, 0.97, p);
  const childX = lerp(885, 1275, walkMove);
  const childScale = lerp(0.56, 0.96, walkMove);
  const isWalking = p > 0.65 && p < 0.96 ? 1 : 0;
  const stride = Math.sin(walkMove * Math.PI * 7) * isWalking;

  // Ground line progressive draw from left to right
  const groundWidth = lerp(390, 1410, smoothstep(0.0, 0.95, p));

  return (
    <section className="landing-hero" aria-label="Wprowadzenie do przewodnika rodzicielskiego OtwarteKarty">
      {/* Editorial Hero Header */}
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

      {/* Autonomous Editorial Vector Art Canvas */}
      <div className="landing-animation-card">
        <div className="landing-animation-viewport">
          <svg
            className="landing-animation-svg"
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

            {/* Continuous editorial floor line drawing from left to right */}
            <line
              x1="50"
              y1="576"
              x2={groundWidth}
              y2="576"
              className="ink"
            />

            {/* 1. LEFT: EXPECTING PARENTS */}
            <g transform="translate(135, 0)" opacity={parentsEnter}>
              {/* Partner (Man) */}
              <g transform="translate(0, 0)">
                <path
                  d="M 78 362 L 94 470 L 98 552 H 72 L 64 470 L 54 362 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 72 552 L 70 576 H 122 C 122 563 111 555 98 552 Z"
                  className="fill-cream ink"
                />
                <line x1="70" y1="571" x2="122" y2="571" className="ink-thin" />
                <path
                  d="M 42 362 L 46 472 L 48 552 H 22 L 18 472 L 16 362 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 22 552 L 20 576 H 74 C 74 563 62 555 48 552 Z"
                  className="fill-cream ink"
                />
                <line x1="20" y1="571" x2="74" y2="571" className="ink-thin" />
                <path
                  d="M 86 226 C 112 242 132 272 154 294 L 146 310 C 120 292 102 268 78 250 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 16 218 C 16 204 32 196 54 196 C 78 196 94 205 98 222 L 92 364 H 16 Z"
                  className="fill-cream ink"
                />
                <path d="M 38 194 L 56 224 L 74 194" fill="none" className="ink" />
                <path
                  d="M 42 186 L 34 204 L 54 214 L 72 204 L 66 186 Z"
                  className="fill-white ink"
                />
                <path d="M 44 166 V 196 H 66 V 166 Z" className="fill-white ink" />
                <path
                  d="M 34 122 C 34 98 50 86 70 86 C 90 86 100 102 98 128 C 96 154 84 172 66 172 C 48 172 34 156 34 122 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 34 126 C 31 102 46 80 72 80 C 92 80 104 92 102 108 C 92 100 78 98 62 102 C 50 105 44 114 42 126 Z"
                  className="fill-dark ink"
                />
                <path d="M 42 124 C 35 122 33 134 40 138" className="fill-white ink" />
                <path d="M 68 117 Q 74 114 79 117" fill="none" className="ink" />
                <path d="M 86 118 Q 91 116 95 119" fill="none" className="ink" />
                <circle cx="74" cy="124" r="2.1" className="fill-dark" />
                <circle cx="90" cy="125" r="2.1" className="fill-dark" />
                <path d="M 84 125 L 87 139 L 81 141" fill="none" className="ink-thin" />
                <path d="M 73 150 Q 80 154 86 150" fill="none" className="ink-thin" />
                <path
                  d="M 22 214 C 6 244 4 282 14 326 L 30 324 C 24 286 24 252 36 226 Z"
                  className="fill-cream ink"
                />
                <path
                  d="M 14 326 C 14 338 22 344 30 340 C 34 337 33 329 30 324 Z"
                  className="fill-white ink"
                />
              </g>

              {/* Pregnant Woman */}
              <g transform="translate(128, 12)">
                <path
                  d="M 66 376 L 82 480 L 86 544 H 66 L 54 480 L 46 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 65 544 L 62 564 H 116 C 116 552 104 546 86 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 64 550 Q 82 556 96 550" fill="none" className="ink-thin" />
                <path d="M 101 548 V 564" fill="none" className="ink-thin" />
                <path
                  d="M 38 376 L 44 482 L 46 544 H 26 L 18 482 L 18 376 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 25 544 L 22 564 H 78 C 78 552 65 546 46 544 Z"
                  className="fill-cream ink"
                />
                <path d="M 24 550 Q 42 556 58 550" fill="none" className="ink-thin" />
                <path d="M 63 548 V 564" fill="none" className="ink-thin" />
                <path
                  d="M 14 326 L 8 398 H 88 L 86 326 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 34 196 L 26 218 L 52 232 L 74 216 L 66 196 Z"
                  className="fill-cream ink"
                />
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
                <path
                  d="M 30 206 L 24 242 L 62 274 L 68 236 L 62 206"
                  fill="none"
                  className="ink"
                />
                <path d="M 40 174 V 204 H 60 V 174 Z" className="fill-white ink" />
                <circle cx="25" cy="76" r="19" className="fill-white ink" />
                <path d="M 15 68 C 19 60 28 60 33 65" fill="none" className="ink-thin" />
                <path
                  d="M 27 94 C 31 87 40 85 46 90 C 42 97 33 99 27 94 Z"
                  className="fill-dark ink"
                />
                <path
                  d="M 28 130 C 28 104 44 92 64 92 C 84 92 92 108 90 134 C 88 158 76 178 58 178 C 40 178 28 160 28 130 Z"
                  className="fill-white ink"
                />
                <path
                  d="M 38 158 C 22 146 20 114 34 96 C 48 82 78 84 96 104 C 98 110 92 114 84 112 C 70 108 56 106 46 116 C 45 124 42 142 38 158 Z"
                  className="fill-white ink"
                />
                <path d="M 38 128 C 31 126 30 138 37 142" className="fill-white ink" />
                <path d="M 60 124 Q 66 121 71 124" fill="none" className="ink" />
                <path d="M 78 125 Q 83 123 87 126" fill="none" className="ink" />
                <circle cx="66" cy="131" r="2.0" className="fill-dark" />
                <circle cx="81" cy="132" r="2.0" className="fill-dark" />
                <path d="M 75 132 L 78 145 L 72 147" fill="none" className="ink-thin" />
                <path d="M 66 156 Q 72 159 77 156" fill="none" className="ink-thin" />
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

            {/* 2. CENTER-LEFT: BABY IN CARRIER */}
            {carrierEnter > 0.01 && (
              <g
                transform={`translate(${lerp(415, 455, carrierEnter)}, ${lerp(
                  18,
                  0,
                  carrierEnter,
                )}) rotate(${carrierRock}, 95, 540)`}
                opacity={carrierEnter}
              >
                <path
                  d="M 12 492 C 18 552 62 576 116 576 C 172 576 212 546 224 484 L 194 468 C 176 510 144 526 110 526 C 74 526 46 508 36 476 Z"
                  className="fill-cream ink"
                />
                <path d="M 32 478 C 52 518 164 522 198 468" fill="none" className="ink" />
                <path
                  d="M 12 492 C 4 442 32 406 76 412 L 62 486 Z"
                  className="fill-blue ink"
                />
                <path d="M 28 432 L 62 486" fill="none" className="ink-thin" />
                {babyInCarrierAlpha > 0.01 && (
                  <g opacity={babyInCarrierAlpha}>
                    <path
                      d="M 78 494 C 78 472 104 464 138 470 C 164 475 182 488 178 506 C 154 520 98 518 78 494 Z"
                      className="fill-white ink"
                    />
                    <circle cx="158" cy="456" r="24" className="fill-white ink" />
                    <path d="M 152 432 C 158 424 168 426 166 434" fill="none" className="ink" />
                    <circle cx="156" cy="454" r="1.8" className="fill-dark" />
                    <circle cx="168" cy="456" r="1.8" className="fill-dark" />
                    <path d="M 158 465 Q 163 469 168 465" fill="none" className="ink-thin" />
                    <circle cx="128" cy="466" r="8" className="fill-white ink" />
                  </g>
                )}
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
                <circle cx="48" cy="498" r="7" className="fill-dark ink" />
                <circle cx="182" cy="498" r="7" className="fill-dark ink" />
              </g>
            )}

            {/* 3. CENTER: CRAWLING BABY */}
            {crawlAlpha > 0.01 && (
              <g transform={`translate(${crawlX}, 0)`} opacity={crawlAlpha}>
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
                <path
                  d="M 14 522 C 10 498 34 486 64 488 C 90 490 104 504 100 526 C 94 542 26 544 14 522 Z"
                  className="fill-blue ink"
                />
                <path
                  d="M 12 520 C 10 500 26 490 42 492 L 38 536 C 22 536 14 530 12 520 Z"
                  className="fill-cream ink"
                />
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
                <circle cx="112" cy="482" r="27" className="fill-white ink" />
                <path d="M 102 456 C 108 444 122 446 120 457" fill="none" className="ink" />
                <path d="M 98 482 C 93 480 92 489 97 492" className="fill-white ink" />
                <circle cx="118" cy="478" r="2.0" className="fill-dark" />
                <circle cx="130" cy="480" r="2.0" className="fill-dark" />
                <path d="M 126 481 L 129 488 L 124 489" fill="none" className="ink-thin" />
                <path d="M 118 495 Q 124 499 129 495" fill="none" className="ink-thin" />
              </g>
            )}

            {/* 4 -> 5. RIGHT: WALKING & GROWING CHILD */}
            {walkEnter > 0.01 && (
              <g
                transform={`translate(${childX}, 576) scale(${childScale}) translate(0, -576)`}
                opacity={walkEnter}
              >
                <g transform={`rotate(${-stride * 16}, 54, 410)`}>
                  <path
                    d="M 44 404 L 56 546 H 76 L 68 404 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 55 546 L 53 576 H 104 C 104 562 92 550 76 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="53" y1="570" x2="104" y2="570" className="ink-thin" />
                </g>

                <g transform={`rotate(${stride * 18}, 42, 410)`}>
                  <path
                    d="M 24 404 L 28 546 H 48 L 48 404 Z"
                    className="fill-dark ink"
                  />
                  <path
                    d="M 27 546 L 25 576 H 78 C 78 562 64 550 48 546 Z"
                    className="fill-cream ink"
                  />
                  <line x1="25" y1="570" x2="78" y2="570" className="ink-thin" />
                </g>

                <g transform={`rotate(${stride * 20}, 62, 276)`}>
                  <path
                    d="M 54 272 C 74 302 88 332 102 358 L 88 368 C 72 342 58 314 44 286 Z"
                    className="fill-blue ink"
                  />
                  <circle cx="96" cy="366" r="10" className="fill-white ink" />
                </g>

                <path
                  d="M 18 268 C 18 252 34 244 52 244 C 70 244 84 254 86 272 L 80 412 H 18 Z"
                  className="fill-blue ink"
                />
                <path
                  d="M 36 244 L 30 264 L 54 276 L 72 262 L 66 244 Z"
                  className="fill-cream ink"
                />
                <line x1="54" y1="276" x2="54" y2="412" className="ink" />
                <path d="M 42 222 V 248 H 60 V 222 Z" className="fill-white ink" />

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
                  <path
                    d="M 26 184 C 18 162 28 132 56 128 C 78 125 98 136 98 152 C 86 146 72 144 56 148 C 42 152 34 166 26 184 Z"
                    className="fill-dark ink"
                  />
                  <path d="M 34 176 C 27 174 26 186 33 190" className="fill-white ink" />
                  <path d="M 58 166 Q 64 163 69 166" fill="none" className="ink" />
                  <path d="M 76 167 Q 81 165 85 168" fill="none" className="ink" />
                  <circle cx="64" cy="174" r="2.2" className="fill-dark" />
                  <circle cx="80" cy="175" r="2.2" className="fill-dark" />
                  <path d="M 74 175 L 77 188 L 71 190" fill="none" className="ink-thin" />
                  <path d="M 63 199 Q 70 204 77 199" fill="none" className="ink" />
                </g>

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

        {/* Milestone Timeline & Replay Controls */}
        <div className="landing-milestones-bar">
          <nav className="milestone-tabs" aria-label="Etapy rozwoju dziecka">
            {MILESTONES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`milestone-tab ${currentMilestone === m.id ? "active" : ""}`}
                onClick={() => handleSelectMilestone(m.progress, m.id)}
                aria-current={currentMilestone === m.id ? "step" : undefined}
              >
                <span className="milestone-tab-dot" aria-hidden="true" />
                <span>{m.name}</span>
              </button>
            ))}
          </nav>

          <div className="animation-controls">
            <button
              type="button"
              className="replay-button"
              onClick={handleReplay}
              aria-label="Odtwórz animację od początku"
            >
              <span aria-hidden="true">↺</span>
              <span>Odtwórz animację</span>
            </button>
          </div>
        </div>
      </div>

      {/* BECKONING CTA BOX: Welcoming expecting and new parents */}
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
              <small className="cta-sub-title">5 szybkich rund · Symulacja urlopów i zasiłków · Gotowy plan</small>
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

// Backwards compatibility alias
export const ScrollHero3D = LandingHero;
