"use client";

import { useEffect, useRef, useState } from "react";

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface QuadFace {
  v: [Vec3, Vec3, Vec3, Vec3];
  normal: Vec3;
  center: Vec3;
  tint: "clay" | "sage" | "warm" | "cradle" | "outline";
  group: "woman" | "man" | "carrier" | "child" | "plinth";
}

interface MeshGroup {
  quads: QuadFace[];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Build a clean quad-mesh lofted tube along a spine with elliptical cross-sections.
// Produces authentic 100% quad topology like a subdivided base-mesh sculpture.
interface LoftRing {
  x: number;
  y: number;
  z: number;
  rx: number;
  rz: number;
  tiltX?: number;
  tiltZ?: number;
  bulgeFront?: number;
}

function buildLoftedQuadMesh(
  rings: LoftRing[],
  segments: number,
  group: QuadFace["group"],
  tint: QuadFace["tint"],
  capEnds = true,
): QuadFace[] {
  const quads: QuadFace[] = [];
  const ringVerts: Vec3[][] = rings.map((r) => {
    const pts: Vec3[] = [];
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      // Front is +z. If bulgeFront is set, push positive z outward smoothly
      const frontFactor = sinA > 0 && r.bulgeFront ? Math.pow(sinA, 1.5) * r.bulgeFront : 0;
      const lx = cosA * (r.rx + frontFactor * 0.22);
      const lz = sinA * r.rz + frontFactor;
      const ly = (r.tiltX ? lx * r.tiltX : 0) + (r.tiltZ ? lz * r.tiltZ : 0);
      pts.push({
        x: r.x + lx,
        y: r.y + ly,
        z: r.z + lz,
      });
    }
    return pts;
  });

  for (let i = 0; i < ringVerts.length - 1; i++) {
    const curr = ringVerts[i];
    const next = ringVerts[i + 1];
    for (let s = 0; s < segments; s++) {
      const sNext = (s + 1) % segments;
      const v0 = curr[s];
      const v1 = curr[sNext];
      const v2 = next[sNext];
      const v3 = next[s];
      quads.push(makeQuad(v0, v1, v2, v3, group, tint));
    }
  }

  // Quad caps at ends when segments === 8
  if (capEnds && segments === 8 && ringVerts.length >= 2) {
    const bot = ringVerts[0];
    quads.push(makeQuad(bot[0], bot[7], bot[4], bot[3], group, tint));
    quads.push(makeQuad(bot[0], bot[3], bot[2], bot[1], group, tint));
    quads.push(makeQuad(bot[4], bot[7], bot[6], bot[5], group, tint));
    const top = ringVerts[ringVerts.length - 1];
    quads.push(makeQuad(top[0], top[1], top[2], top[3], group, tint));
    quads.push(makeQuad(top[0], top[3], top[4], top[7], group, tint));
    quads.push(makeQuad(top[4], top[5], top[6], top[7], group, tint));
  }

  return quads;
}

function makeQuad(
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  v3: Vec3,
  group: QuadFace["group"],
  tint: QuadFace["tint"],
): QuadFace {
  const center = {
    x: (v0.x + v1.x + v2.x + v3.x) * 0.25,
    y: (v0.y + v1.y + v2.y + v3.y) * 0.25,
    z: (v0.z + v1.z + v2.z + v3.z) * 0.25,
  };
  const e1 = sub(v1, v0);
  const e2 = sub(v3, v0);
  const normal = normalize(cross(e1, e2));
  return { v: [v0, v1, v2, v3], normal, center, tint, group };
}

interface HumanoidSpec {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  scale: number;
  pregnant?: number; // 0..1
  headScale?: number; // 1 for adult, 1.35 for toddler/baby
  shoulderWidth: number;
  hipWidth: number;
  armPose: "couple-left" | "couple-right" | "child-open" | "baby-tucked";
  group: QuadFace["group"];
  tint: QuadFace["tint"];
}

function buildQuadHumanoid(spec: HumanoidSpec): QuadFace[] {
  const {
    offsetX,
    offsetY,
    offsetZ,
    scale,
    pregnant = 0,
    headScale = 1,
    shoulderWidth,
    hipWidth,
    armPose,
    group,
    tint,
  } = spec;
  const quads: QuadFace[] = [];
  const segs = 8;

  // Torso + Pelvis + Neck + Cranium (continuous quad topology flow)
  const torsoRings: LoftRing[] = [
    // Pelvis base
    { x: 0, y: 0.92, z: 0, rx: hipWidth * 0.72, rz: 0.16 },
    { x: 0, y: 1.05, z: 0.01, rx: hipWidth, rz: 0.21, bulgeFront: pregnant * 0.16 },
    // Waist / Abdomen (pregnancy belly curves out smoothly in quads)
    { x: 0, y: 1.24, z: 0.02, rx: hipWidth * 0.88 + pregnant * 0.07, rz: 0.20, bulgeFront: pregnant * 0.34 },
    { x: 0, y: 1.44, z: 0.02, rx: hipWidth * 0.86 + pregnant * 0.05, rz: 0.20, bulgeFront: pregnant * 0.26 },
    // Ribcage / Chest
    { x: 0, y: 1.66, z: 0.01, rx: shoulderWidth * 0.86, rz: 0.22, bulgeFront: pregnant * 0.08 + 0.04 },
    // Shoulders
    { x: 0, y: 1.86, z: 0, rx: shoulderWidth, rz: 0.20 },
    { x: 0, y: 1.97, z: 0, rx: 0.17, rz: 0.15 },
    // Neck
    { x: 0, y: 2.08, z: 0.01, rx: 0.125, rz: 0.125 },
    // Jaw / Head base
    { x: 0, y: 2.17, z: 0.03, rx: 0.19 * headScale, rz: 0.22 * headScale, bulgeFront: 0.04 * headScale },
    // Face mid (cheekbones / nose ridge)
    { x: 0, y: 2.34 * (0.94 + headScale * 0.06), z: 0.03, rx: 0.23 * headScale, rz: 0.26 * headScale, bulgeFront: 0.05 * headScale },
    // Forehead
    { x: 0, y: 2.52 * (0.91 + headScale * 0.09), z: 0.01, rx: 0.21 * headScale, rz: 0.24 * headScale },
    // Crown
    { x: 0, y: 2.65 * (0.89 + headScale * 0.11), z: -0.01, rx: 0.12 * headScale, rz: 0.14 * headScale },
  ];
  quads.push(...buildLoftedQuadMesh(torsoRings, segs, group, tint, true));

  // Left & Right Legs (5 quad loops each: thigh, knee, calf, ankle, foot)
  for (const side of [-1, 1] as const) {
    const hipX = side * hipWidth * 0.56;
    const ankleX = side * hipWidth * 0.52;
    const legRings: LoftRing[] = [
      { x: hipX, y: 0.96, z: 0, rx: 0.155, rz: 0.165 },
      { x: hipX * 0.98, y: 0.72, z: 0.02, rx: 0.14, rz: 0.15 },
      { x: hipX * 0.95, y: 0.50, z: 0.03, rx: 0.115, rz: 0.125 }, // knee
      { x: ankleX, y: 0.28, z: -0.01, rx: 0.12, rz: 0.13 }, // calf
      { x: ankleX, y: 0.09, z: 0, rx: 0.085, rz: 0.095 }, // ankle
      { x: ankleX, y: 0.01, z: 0.07, rx: 0.095, rz: 0.16, bulgeFront: 0.06 }, // foot
    ];
    quads.push(...buildLoftedQuadMesh(legRings, segs, group, tint, true));
  }

  // Left & Right Arms (posed naturally per character role)
  for (const side of [-1, 1] as const) {
    const shX = side * (shoulderWidth + 0.03);
    let elbow: Vec3;
    let wrist: Vec3;
    let hand: Vec3;

    if (armPose === "couple-left") {
      // Pregnant woman: outer arm cradles belly, inner arm reaches toward partner
      if (side === -1) {
        elbow = { x: shX - 0.16, y: 1.48, z: 0.10 };
        wrist = { x: -0.14, y: 1.24, z: 0.34 };
        hand = { x: -0.04, y: 1.21, z: 0.38 };
      } else {
        elbow = { x: shX + 0.14, y: 1.48, z: 0.06 };
        wrist = { x: shX + 0.22, y: 1.22, z: 0.14 };
        hand = { x: shX + 0.26, y: 1.15, z: 0.16 };
      }
    } else if (armPose === "couple-right") {
      // Partner: inner arm warm around/near partner, outer arm relaxed
      if (side === -1) {
        elbow = { x: shX - 0.14, y: 1.48, z: 0.08 };
        wrist = { x: shX - 0.22, y: 1.22, z: 0.15 };
        hand = { x: shX - 0.26, y: 1.15, z: 0.17 };
      } else {
        elbow = { x: shX + 0.18, y: 1.50, z: 0.03 };
        wrist = { x: shX + 0.14, y: 1.16, z: 0.09 };
        hand = { x: shX + 0.11, y: 1.04, z: 0.11 };
      }
    } else if (armPose === "child-open") {
      // Growing child: expressive, slightly open curious stance
      elbow = { x: shX + side * 0.20, y: 1.54, z: 0.06 };
      wrist = { x: shX + side * 0.28, y: 1.28, z: 0.16 };
      hand = { x: shX + side * 0.31, y: 1.18, z: 0.20 };
    } else {
      // Baby tucked
      elbow = { x: shX + side * 0.10, y: 1.52, z: 0.14 };
      wrist = { x: side * 0.16, y: 1.38, z: 0.28 };
      hand = { x: side * 0.10, y: 1.35, z: 0.31 };
    }

    const armRings: LoftRing[] = [
      { x: shX, y: 1.84, z: 0, rx: 0.115, rz: 0.115 },
      { x: elbow.x, y: elbow.y, z: elbow.z, rx: 0.095, rz: 0.095 },
      { x: wrist.x, y: wrist.y, z: wrist.z, rx: 0.075, rz: 0.08 },
      { x: hand.x, y: hand.y, z: hand.z, rx: 0.085, rz: 0.095 },
    ];
    quads.push(...buildLoftedQuadMesh(armRings, segs, group, tint, true));
  }

  // Transform all vertices by scale and offset
  return quads.map((q) => {
    const tv = q.v.map((pt) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY,
      z: pt.z * scale + offsetZ,
    })) as [Vec3, Vec3, Vec3, Vec3];
    return makeQuad(tv[0], tv[1], tv[2], tv[3], q.group, q.tint);
  });
}

// Build Stage 2: Baby in an ergonomic 3D quad-mesh carrier (nosidełko / fotelik-kołyska)
function buildBabyInCarrier(): QuadFace[] {
  const quads: QuadFace[] = [];

  // Ergonomic bassinet / carrier shell (ribbed quad mesh cradle)
  const shellRings: LoftRing[] = [
    { x: 0, y: 0.12, z: -0.05, rx: 0.36, rz: 0.44 },
    { x: 0, y: 0.24, z: -0.03, rx: 0.64, rz: 0.78 },
    { x: 0, y: 0.48, z: 0.0, rx: 0.78, rz: 0.96 },
    { x: 0, y: 0.76, z: 0.02, rx: 0.82, rz: 1.02, tiltZ: -0.14 },
    { x: 0, y: 0.96, z: -0.12, rx: 0.68, rz: 0.74, tiltZ: -0.25 },
  ];
  quads.push(...buildLoftedQuadMesh(shellRings, 12, "carrier", "cradle", false));

  // Canopy hood over the top of the carrier (structured quad arch)
  const hoodRings: LoftRing[] = [
    { x: -0.74, y: 0.82, z: -0.08, rx: 0.06, rz: 0.36 },
    { x: -0.48, y: 1.28, z: -0.14, rx: 0.06, rz: 0.42 },
    { x: 0, y: 1.48, z: -0.16, rx: 0.06, rz: 0.45 },
    { x: 0.48, y: 1.28, z: -0.14, rx: 0.06, rz: 0.42 },
    { x: 0.74, y: 0.82, z: -0.08, rx: 0.06, rz: 0.36 },
  ];
  quads.push(...buildLoftedQuadMesh(hoodRings, 8, "carrier", "sage", true));

  // Carry handle arch (distinctive nosidełko handle curving over the cradle)
  const handleRings: LoftRing[] = [
    { x: -0.80, y: 0.68, z: 0.08, rx: 0.055, rz: 0.055 },
    { x: -0.68, y: 1.26, z: 0.12, rx: 0.055, rz: 0.055 },
    { x: -0.34, y: 1.68, z: 0.15, rx: 0.06, rz: 0.06 },
    { x: 0, y: 1.78, z: 0.16, rx: 0.068, rz: 0.068 },
    { x: 0.34, y: 1.68, z: 0.15, rx: 0.06, rz: 0.06 },
    { x: 0.68, y: 1.26, z: 0.12, rx: 0.055, rz: 0.055 },
    { x: 0.80, y: 0.68, z: 0.08, rx: 0.055, rz: 0.055 },
  ];
  quads.push(...buildLoftedQuadMesh(handleRings, 8, "carrier", "warm", true));

  // Swaddled infant nestled inside the carrier (quad mesh head + swaddled torso + tucked limbs)
  const babyBodyRings: LoftRing[] = [
    { x: 0, y: 0.38, z: 0.38, rx: 0.22, rz: 0.20 },
    { x: 0, y: 0.46, z: 0.24, rx: 0.34, rz: 0.26, bulgeFront: 0.08 },
    { x: 0, y: 0.58, z: 0.08, rx: 0.38, rz: 0.28, bulgeFront: 0.10 },
    { x: 0, y: 0.72, z: -0.06, rx: 0.33, rz: 0.25 },
    { x: 0, y: 0.82, z: -0.14, rx: 0.18, rz: 0.18 },
    // Baby head resting on pillow cushion
    { x: 0, y: 0.94, z: -0.18, rx: 0.28, rz: 0.28, bulgeFront: 0.06 },
    { x: 0, y: 1.12, z: -0.20, rx: 0.31, rz: 0.31, bulgeFront: 0.08 },
    { x: 0, y: 1.28, z: -0.22, rx: 0.22, rz: 0.24 },
  ];
  quads.push(...buildLoftedQuadMesh(babyBodyRings, 8, "carrier", "clay", true));

  // Little baby hands resting on chest
  for (const side of [-1, 1] as const) {
    const babyArm: LoftRing[] = [
      { x: side * 0.32, y: 0.74, z: -0.02, rx: 0.09, rz: 0.09 },
      { x: side * 0.28, y: 0.68, z: 0.16, rx: 0.08, rz: 0.08 },
      { x: side * 0.15, y: 0.66, z: 0.26, rx: 0.085, rz: 0.085 },
    ];
    quads.push(...buildLoftedQuadMesh(babyArm, 8, "carrier", "clay", true));
  }

  return quads;
}

// Low-poly architectural plinth / stage ring under the characters
function buildPlinth(): QuadFace[] {
  const rings: LoftRing[] = [
    { x: 0, y: -0.14, z: 0, rx: 1.62, rz: 1.32 },
    { x: 0, y: -0.02, z: 0, rx: 1.72, rz: 1.40 },
    { x: 0, y: 0.0, z: 0, rx: 1.48, rz: 1.18 },
    { x: 0, y: 0.01, z: 0, rx: 0.42, rz: 0.34 },
  ];
  return buildLoftedQuadMesh(rings, 16, "plinth", "cradle", false);
}

interface StageCopy {
  id: string;
  roundBadge: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  statLabel: string;
  statValue: string;
  meshTag: string;
}

const STAGES: StageCopy[] = [
  {
    id: "stage-expecting",
    roundBadge: "ROZDZIAŁ I · CIĄŻA I PRZYGOTOWANIA",
    eyebrow: "01 / 03 · DWOJE DOROSŁYCH",
    title: "Zaczyna się od Was",
    accent: "i wspólnego spokoju.",
    description:
      "Kobieta w ciąży i partner stoją przed pierwszymi decyzjami: kiedy przejść na zwolnienie lub wcześniejszy macierzyński, kto jest płatnikiem zasiłku i jak zabezpieczyć domowy budżet.",
    statLabel: "Podstawa wymiaru i ochrona",
    statValue: "100% zasiłku chorobowego w ciąży · 20 tyg. macierzyńskiego",
    meshTag: "DUAL HUMANOID BASE MESH · 100% QUADS",
  },
  {
    id: "stage-carrier",
    roundBadge: "ROZDZIAŁ II · PORÓD I PIERWSZE MIESIĄCE",
    eyebrow: "02 / 03 · DZIECKO W NOSIDEŁKU",
    title: "Nowy człowiek",
    accent: "w centrum uwagi.",
    description:
      "Świat skupia się wokół nosidełka. To czas na 2 tygodnie urlopu ojcowskiego, wybór stawki 100%/70% lub uśrednionego 81,5% za cały rok oraz pierwsze formalności bez wychodzenia z domu.",
    statLabel: "Wspólny start po narodzinach",
    statValue: "14 dni ojcowskiego · wybór wariantu 81,5% lub 100%/70%",
    meshTag: "INFANT CARRIER TOPOLOGY · SUBDIVIDED QUADS",
  },
  {
    id: "stage-growing",
    roundBadge: "ROZDZIAŁ III · PIERWSZY ROK I KOLEJNE LATA",
    eyebrow: "03 / 03 · DZIECKO ROŚNIE",
    title: "Od pierwszych kroków",
    accent: "aż po samodzielność.",
    description:
      "Dziecko rośnie na Waszych oczach — od malucha po starszaka. Wykorzystujecie 41 tygodni urlopu rodzicielskiego (w tym 9 tygodni nieprzenoszalnych dla drugiego rodzica) i łączycie urlop z pracą na część etatu.",
    statLabel: "Długofalowy plan rodziny",
    statValue: "41 tyg. rodzicielskiego · 9 tyg. wyłącznej puli · łączenie z etatem",
    meshTag: "DYNAMIC GROWTH MORPH · SCALED QUAD RIG",
  },
];

export function ScrollHero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [progressText, setProgressText] = useState(0);
  const progressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const meshesRef = useRef<MeshGroup | null>(null);

  // Build deterministic 3D quad meshes once
  useEffect(() => {
    const woman = buildQuadHumanoid({
      offsetX: -0.68,
      offsetY: 0,
      offsetZ: 0.04,
      scale: 0.94,
      pregnant: 1,
      headScale: 1.02,
      shoulderWidth: 0.37,
      hipWidth: 0.36,
      armPose: "couple-left",
      group: "woman",
      tint: "clay",
    });

    const man = buildQuadHumanoid({
      offsetX: 0.68,
      offsetY: 0,
      offsetZ: -0.04,
      scale: 1.02,
      pregnant: 0,
      headScale: 0.98,
      shoulderWidth: 0.44,
      hipWidth: 0.33,
      armPose: "couple-right",
      group: "man",
      tint: "sage",
    });

    const carrier = buildBabyInCarrier();

    // Base child mesh (centered at origin, we will dynamically morph its proportions from toddler to big kid!)
    const child = buildQuadHumanoid({
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      scale: 1.0,
      pregnant: 0,
      headScale: 1.08,
      shoulderWidth: 0.40,
      hipWidth: 0.33,
      armPose: "child-open",
      group: "child",
      tint: "clay",
    });

    const plinth = buildPlinth();

    meshesRef.current = {
      quads: [...plinth, ...woman, ...man, ...carrier, ...child],
    };
  }, []);

  // Scroll listener and animation loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function updateScrollProgress() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const raw = clamp(-rect.top / scrollable, 0, 1);
      progressRef.current = raw;
      if (reducedMotion) {
        smoothProgressRef.current = raw;
      }
      const nextStage = raw < 0.34 ? 0 : raw < 0.67 ? 1 : 2;
      setActiveStage((prev) => (prev === nextStage ? prev : nextStage));
      setProgressText(Math.round(raw * 100));
    }

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress, { passive: true });

    // Palette definitions matching OtwarteKarty design system + architectural quad-mesh studio look
    const palettes: Record<
      QuadFace["tint"],
      { base: [number, number, number]; warm: [number, number, number]; wire: string }
    > = {
      clay: { base: [223, 228, 220], warm: [246, 241, 232], wire: "rgba(36, 60, 52, 0.36)" },
      sage: { base: [193, 209, 189], warm: [226, 236, 220], wire: "rgba(36, 60, 52, 0.38)" },
      warm: { base: [216, 194, 179], warm: [242, 228, 217], wire: "rgba(74, 58, 48, 0.35)" },
      cradle: { base: [208, 216, 206], warm: [238, 242, 235], wire: "rgba(36, 60, 52, 0.30)" },
      outline: { base: [180, 192, 180], warm: [210, 220, 210], wire: "rgba(36, 60, 52, 0.45)" },
    };

    const lightDir1 = normalize({ x: 0.55, y: 0.72, z: 0.65 });
    const lightDir2 = normalize({ x: -0.65, y: 0.35, z: -0.45 });

    function renderFrame(time: number) {
      if (!canvas || !ctx || !meshesRef.current) return;

      // Smoothly damp scroll and pointer
      const targetP = progressRef.current;
      smoothProgressRef.current = reducedMotion
        ? targetP
        : lerp(smoothProgressRef.current, targetP, 0.11);
      const p = smoothProgressRef.current;

      pointerRef.current.x = lerp(pointerRef.current.x, pointerRef.current.targetX, 0.08);
      pointerRef.current.y = lerp(pointerRef.current.y, pointerRef.current.targetY, 0.08);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Phase weights:
      // Stage 0 (p: 0.00 -> 0.32): Couple (Pregnant Woman + Partner)
      // Transition 0->1 (p: 0.27 -> 0.42): Couple converges into center -> Baby in Carrier emerges
      // Stage 1 (p: 0.38 -> 0.63): Baby in Carrier rotates & rocks gently
      // Transition 1->2 (p: 0.58 -> 0.72): Carrier opens/dissolves -> Growing Child emerges
      // Stage 2 (p: 0.68 -> 1.00): Child grows continuously from small toddler (0.50 scale) to tall grown youth (1.08 scale)

      const coupleAlpha = 1 - smoothstep(0.28, 0.41, p);
      const coupleConverge = smoothstep(0.24, 0.41, p);

      const carrierEnter = smoothstep(0.29, 0.43, p);
      const carrierExit = 1 - smoothstep(0.58, 0.71, p);
      const carrierAlpha = carrierEnter * carrierExit;

      const childAlpha = smoothstep(0.60, 0.73, p);
      // Growth factor within Stage 3: 0 = toddler (1 yr), 1 = tall grown child / youth
      const childGrowth = smoothstep(0.64, 0.97, p);

      // Global camera rotation driven by scroll + subtle idle breathing + pointer parallax
      const idleAngle = reducedMotion ? 0 : Math.sin(time * 0.0007) * 0.08;
      const yaw =
        lerp(-0.28, 0.52, p) +
        idleAngle +
        pointerRef.current.x * 0.32;
      const pitch =
        lerp(0.14, 0.08, p) +
        pointerRef.current.y * 0.16;

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Draw subtle architectural 3D studio grid lines / aura behind mesh
      const cx = w * 0.5;
      const cy = h * 0.56;
      const fovScale = Math.min(w, h) * 0.36;

      const bgGrad = ctx.createRadialGradient(cx, cy - h * 0.08, 12, cx, cy, Math.max(w, h) * 0.55);
      bgGrad.addColorStop(0, "rgba(235, 243, 230, 0.85)");
      bgGrad.addColorStop(0.55, "rgba(246, 248, 243, 0.45)");
      bgGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Transform a 3D point depending on its group & current scroll morph
      function transformVertex(pt: Vec3, group: QuadFace["group"]): { pos: Vec3; alpha: number } | null {
        let x = pt.x;
        let y = pt.y;
        let z = pt.z;
        let alpha = 1;

        if (group === "woman" || group === "man") {
          if (coupleAlpha <= 0.01) return null;
          alpha = coupleAlpha;
          // As couple transitions into baby carrier, they step closer together and morph downward into the cradle center
          const sign = group === "woman" ? -1 : 1;
          x = lerp(x, sign * 0.12, coupleConverge);
          y = lerp(y, y * 0.52 + 0.25, coupleConverge);
          z = lerp(z, z * 0.6, coupleConverge);
        } else if (group === "carrier") {
          if (carrierAlpha <= 0.01) return null;
          alpha = carrierAlpha;
          const enterScale = lerp(0.55, 1.0, carrierEnter);
          const exitMorph = 1 - carrierExit;
          const rockAngle = reducedMotion ? 0 : Math.sin(time * 0.0018) * 0.045;
          const cosR = Math.cos(rockAngle);
          const sinR = Math.sin(rockAngle);
          const ry = y * cosR - z * sinR;
          const rz = y * sinR + z * cosR;
          x = x * enterScale * lerp(1, 0.65, exitMorph);
          y = ry * enterScale + lerp(0.18, 0.06, carrierEnter) + exitMorph * 0.35;
          z = rz * enterScale;
        } else if (group === "child") {
          if (childAlpha <= 0.01) return null;
          alpha = childAlpha;
          // Allometric human growth morph!
          // Toddler (childGrowth=0): shorter legs, fuller head proportion, overall height ~0.52
          // Older child / teen (childGrowth=1): long legs, balanced head, overall height ~1.06
          const heightScale = lerp(0.50, 1.07, childGrowth);
          const widthScale = lerp(0.58, 1.02, childGrowth);
          // Allometric head scaling: when y > 2.05 (head region), toddler has relatively bigger head
          const isHead = pt.y > 2.05;
          const headBoost = isHead ? lerp(1.28, 0.98, childGrowth) : 1.0;
          const headCenterY = 2.35;

          const localX = isHead ? pt.x * headBoost : pt.x;
          const localZ = isHead ? pt.z * headBoost : pt.z;
          const localY = isHead
            ? headCenterY + (pt.y - headCenterY) * headBoost
            : pt.y;

          // Emerge smoothly from carrier level
          const emergeLift = lerp(-0.12, 0, smoothstep(0.60, 0.74, p));
          x = localX * widthScale;
          y = localY * heightScale + emergeLift;
          z = localZ * widthScale;
        } else if (group === "plinth") {
          alpha = 0.9;
        }

        // Center vertically around y = 1.22 so model sits nicely in viewport
        const cy3d = y - 1.22;

        // Rotate around Y (yaw), then X (pitch)
        const rx = x * cosY - z * sinY;
        const rz1 = x * sinY + z * cosY;
        const ry = cy3d * cosP - rz1 * sinP;
        const rz = cy3d * sinP + rz1 * cosP;

        return { pos: { x: rx, y: ry, z: rz }, alpha };
      }

      interface ProjectedQuad {
        pts: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
        depth: number;
        fill: string;
        stroke: string;
        alpha: number;
      }

      const drawList: ProjectedQuad[] = [];
      const cameraDist = 4.5;

      for (const q of meshesRef.current.quads) {
        const t0 = transformVertex(q.v[0], q.group);
        if (!t0) continue;
        const t1 = transformVertex(q.v[1], q.group)!;
        const t2 = transformVertex(q.v[2], q.group)!;
        const t3 = transformVertex(q.v[3], q.group)!;

        // Compute world-space normal of transformed quad
        const e1 = sub(t1.pos, t0.pos);
        const e2 = sub(t3.pos, t0.pos);
        const n = normalize(cross(e1, e2));

        // Average depth
        const avgZ = (t0.pos.z + t1.pos.z + t2.pos.z + t3.pos.z) * 0.25;

        // Perspective projection
        const proj = (v: Vec3) => {
          const persp = cameraDist / Math.max(1.2, cameraDist - v.z);
          return {
            x: cx + v.x * fovScale * persp,
            y: cy - v.y * fovScale * persp,
          };
        };

        const p0 = proj(t0.pos);
        const p1 = proj(t1.pos);
        const p2 = proj(t2.pos);
        const p3 = proj(t3.pos);

        // Two-light studio clay/mesh shading with Fresnel rim
        const ndotl1 = Math.max(0, dot(n, lightDir1));
        const ndotl2 = Math.max(0, dot(n, lightDir2));
        const rim = Math.pow(1 - Math.abs(n.z), 2.2) * 0.28;
        const lighting = clamp(0.32 + ndotl1 * 0.56 + ndotl2 * 0.22 + rim, 0.18, 1.08);

        const pal = palettes[q.tint];
        const r = Math.round(lerp(pal.base[0] * 0.72, pal.warm[0], lighting));
        const g = Math.round(lerp(pal.base[1] * 0.74, pal.warm[1], lighting));
        const b = Math.round(lerp(pal.base[2] * 0.72, pal.warm[2], lighting));

        drawList.push({
          pts: [p0, p1, p2, p3],
          depth: avgZ,
          fill: `rgb(${r}, ${g}, ${b})`,
          stroke: pal.wire,
          alpha: t0.alpha,
        });
      }

      // Painter's algorithm sort (back to front)
      drawList.sort((a, b) => a.depth - b.depth);

      // Draw dynamic measurement scale rings during Stage 3 (growth visualization)
      if (childAlpha > 0.05) {
        const meterLevels = [
          { y: -1.18, label: "50 cm · narodziny" },
          { y: -0.45, label: "80 cm · 1. rok" },
          { y: 0.35, label: "110 cm · przedszkole" },
          { y: 1.15, label: "145 cm · kolejne lata" },
        ];
        ctx.save();
        ctx.globalAlpha = childAlpha * 0.55;
        ctx.strokeStyle = "#8fa780";
        ctx.fillStyle = "#527561";
        ctx.font = "600 10px Arial, sans-serif";
        for (const lvl of meterLevels) {
          const persp = cameraDist / cameraDist;
          const py = cy - lvl.y * fovScale * persp;
          ctx.beginPath();
          ctx.setLineDash([4, 6]);
          ctx.moveTo(cx - fovScale * 0.95, py);
          ctx.lineTo(cx + fovScale * 0.95, py);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillText(lvl.label, cx + fovScale * 0.52, py - 5);
        }
        ctx.restore();
      }

      // Render all quad faces with crisp quad wireframe edges (inspired by 100% QUADS base mesh reference)
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.05;
      for (const item of drawList) {
        ctx.globalAlpha = item.alpha;
        ctx.beginPath();
        ctx.moveTo(item.pts[0].x, item.pts[0].y);
        ctx.lineTo(item.pts[1].x, item.pts[1].y);
        ctx.lineTo(item.pts[2].x, item.pts[2].y);
        ctx.lineTo(item.pts[3].x, item.pts[3].y);
        ctx.closePath();
        ctx.fillStyle = item.fill;
        ctx.fill();
        ctx.strokeStyle = item.stroke;
        ctx.stroke();
      }

      ctx.restore();

      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    }

    rafId = window.requestAnimationFrame(renderFrame);

    // If reduced motion, re-render whenever scroll occurs
    const onScrollReduced = () => {
      if (reducedMotion) {
        window.requestAnimationFrame(renderFrame);
      }
    };
    window.addEventListener("scroll", onScrollReduced, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      window.removeEventListener("scroll", onScrollReduced);
    };
  }, []);

  function scrollToGame() {
    const target = document.getElementById("gra-otwartekarty");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function scrollToStage(index: number) {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const topDoc = window.scrollY + rect.top;
    const scrollable = Math.max(1, rect.height - window.innerHeight);
    const ratios = [0.06, 0.48, 0.90];
    window.scrollTo({
      top: topDoc + scrollable * (ratios[index] ?? 0),
      behavior: "smooth",
    });
  }

  const stage = STAGES[activeStage] ?? STAGES[0];

  return (
    <section
      className="scroll-hero"
      ref={containerRef}
      aria-label="Wprowadzenie: od ciąży przez pierwsze miesiące po kolejne lata dziecka"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
        pointerRef.current.targetX = clamp(nx, -1, 1);
        pointerRef.current.targetY = clamp(ny, -1, 1);
      }}
      onPointerLeave={() => {
        pointerRef.current.targetX = 0;
        pointerRef.current.targetY = 0;
      }}
    >
      <div className="scroll-hero-sticky">
        <div className="scroll-hero-grid">
          {/* Left column: editorial story & stage milestones synchronized with scroll */}
          <div className="scroll-hero-copy">
            <div className="scroll-hero-pill">
              <span className="scroll-hero-dot" aria-hidden="true" />
              <span>{stage.roundBadge}</span>
            </div>

            <p className="eyebrow scroll-hero-eyebrow">{stage.eyebrow}</p>

            <h2 className="scroll-hero-title" key={stage.id}>
              {stage.title} <span>{stage.accent}</span>
            </h2>

            <p className="scroll-hero-description">{stage.description}</p>

            <div className="scroll-hero-callout">
              <span className="eyebrow">{stage.statLabel}</span>
              <strong>{stage.statValue}</strong>
            </div>

            <div className="scroll-hero-nav" role="tablist" aria-label="Etapy historii rodziny">
              {STAGES.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeStage === idx}
                  className={`scroll-stage-tab ${activeStage === idx ? "is-active" : ""}`}
                  onClick={() => scrollToStage(idx)}
                >
                  <span className="scroll-stage-num">0{idx + 1}</span>
                  <span className="scroll-stage-name">
                    {idx === 0 ? "Ciąża (Dorośli)" : idx === 1 ? "W nosidełku" : "Dziecko rośnie"}
                  </span>
                </button>
              ))}
            </div>

            <div className="scroll-hero-actions">
              <button type="button" className="button button-primary" onClick={scrollToGame}>
                Przejdź do stołu z kartami ↓
              </button>
              <span className="scroll-hero-hint">
                Przewijaj w dół, aby zobaczyć transformację ({progressText}%)
              </span>
            </div>
          </div>

          {/* Right column: interactive 3D low-poly quad mesh viewport */}
          <div className="scroll-hero-viewport">
            <div className="scroll-mesh-hud" aria-hidden="true">
              <span>{stage.meshTag}</span>
              <span>SCROLL MORPH · {progressText}%</span>
            </div>
            <canvas
              ref={canvasRef}
              className="scroll-hero-canvas"
              aria-label="Trójwymiarowa siatka postaci: para oczekująca dziecka, niemowlę w nosidełku i rosnące dziecko"
            />
            <div className="scroll-mesh-footer" aria-hidden="true">
              <div className="scroll-progress-bar">
                <span style={{ width: `${Math.max(6, progressText)}%` }} />
              </div>
              <div className="scroll-mesh-legend">
                <span className={activeStage === 0 ? "is-current" : ""}>I. Kobieta w ciąży i mężczyzna</span>
                <span className={activeStage === 1 ? "is-current" : ""}>II. Dziecko w nosidełku</span>
                <span className={activeStage === 2 ? "is-current" : ""}>III. Wzrost dziecka</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
