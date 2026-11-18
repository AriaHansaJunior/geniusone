import React, { useEffect, useRef } from "react";

interface LoginParticleFieldProps {
  containerRef: React.RefObject<HTMLElement | null>;
  cardRef: React.RefObject<HTMLElement | null>;
  headerRef?: React.RefObject<HTMLElement | null>;
  footerRef?: React.RefObject<HTMLElement | null>;
  lockedActive: boolean;
  wakeSignal: number;
  onClarityChange?: (clarity: number) => void;
  onMaterializedChange?: (materialized: boolean) => void;
}

type Rgb = readonly [number, number, number];

interface WordmarkPoint {
  nx: number;
  ny: number;
  progressX: number;
  letterIndex: number;
  rgb: Rgb;
}

interface Particle {
  role: "card" | "header" | "footer";
  cardAx: number;
  cardAy: number;
  cardRgb: Rgb;
  textNx: number;
  textNy: number;
  textProgressX: number;
  letterIndex: number;
  wordmarkRgb: Rgb;
  rainbowRgb: Rgb;
  x: number;
  y: number;
  vx: number;
  vy: number;
  prevX: number;
  prevY: number;
  phase: number;
  orbitSpeed: number;
  armIndex: number;
  radialBias: number;
  size: number;
  cardSize: number;
  baseAlpha: number;
  cardAlpha: number;
}

// 9 distinct vivid colors — 1 solid color per letter in "GeniusOne"
const WORDMARK_LETTERS = ["G", "e", "n", "i", "u", "s", "O", "n", "e"];
const LETTER_RGBS: Rgb[] = [
  [225, 29, 72],  // G - crimson rose
  [234, 88, 12],  // e - orange
  [217, 119, 6],  // n - amber gold
  [22, 163, 74],  // i - emerald
  [8, 145, 178],  // u - cyan teal
  [37, 99, 235],  // s - royal blue
  [109, 40, 217], // O - violet
  [147, 51, 234], // n - purple
  [219, 39, 119], // e - magenta pink
];

const SPECTRUM_RGBS: Rgb[] = [
  [244, 63, 94],
  [251, 113, 133],
  [251, 146, 60],
  [245, 158, 11],
  [34, 197, 94],
  [20, 184, 166],
  [6, 182, 212],
  [59, 130, 246],
  [99, 102, 241],
  [168, 85, 247],
  [236, 72, 153],
];

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hashSeed(index: number, salt: number): number {
  const raw = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function spectrumRgbAt(t: number): Rgb {
  const norm = ((t % 1) + 1) % 1;
  const idx = Math.floor(norm * SPECTRUM_RGBS.length) % SPECTRUM_RGBS.length;
  return SPECTRUM_RGBS[idx];
}

function mixCssRgb(a: Rgb, b: Rgb, t: number, alpha: number): string {
  const k = clamp(t, 0, 1);
  const r = Math.round(a[0] + (b[0] - a[0]) * k);
  const g = Math.round(a[1] + (b[1] - a[1]) * k);
  const bl = Math.round(a[2] + (b[2] - a[2]) * k);
  return `rgba(${r},${g},${bl},${clamp(alpha, 0, 1).toFixed(3)})`;
}

function sampleWordmarkPoints(targetCount: number): WordmarkPoint[] {
  if (typeof document === "undefined") return [];

  const offscreen = document.createElement("canvas");
  const w = 1040;
  const h = 240;
  offscreen.width = w;
  offscreen.height = h;
  const octx = offscreen.getContext("2d");
  if (!octx) return [];

  const fontSpec = '900 132px "Inter", "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';
  octx.font = fontSpec;
  const extraGap = 10;
  const charWidths = WORDMARK_LETTERS.map((ch) => octx.measureText(ch).width);
  const totalWidth =
    charWidths.reduce((sum, cw) => sum + cw, 0) +
    extraGap * (WORDMARK_LETTERS.length - 1);

  let cursorX = (w - totalWidth) * 0.5;
  const baselineY = h * 0.52;

  const perLetterRaw: Array<Array<{ x: number; y: number; letterIndex: number }>> = [];
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;

  for (let li = 0; li < WORDMARK_LETTERS.length; li++) {
    const ch = WORDMARK_LETTERS[li];
    octx.clearRect(0, 0, w, h);
    octx.fillStyle = "#000000";
    octx.font = fontSpec;
    octx.textAlign = "left";
    octx.textBaseline = "middle";
    octx.fillText(ch, cursorX, baselineY);
    cursorX += charWidths[li] + extraGap;

    const data = octx.getImageData(0, 0, w, h).data;
    const pts: Array<{ x: number; y: number; letterIndex: number }> = [];
    const step = 4;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 125) {
          pts.push({ x, y, letterIndex: li });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    perLetterRaw.push(pts);
  }

  const allRaw = perLetterRaw.flat();
  if (allRaw.length === 0) return [];

  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;

  const result: WordmarkPoint[] = [];
  const totalRaw = allRaw.length;

  for (let i = 0; i < targetCount; i++) {
    const raw = allRaw[Math.floor((i / targetCount) * totalRaw) % totalRaw];
    const jx = (hashSeed(i, 19) - 0.5) * 0.0014;
    const jy = (hashSeed(i, 31) - 0.5) * 0.004;
    result.push({
      nx: (raw.x - centerX) / spanX + jx,
      ny: (raw.y - centerY) / spanY + jy,
      progressX: clamp((raw.x - minX) / spanX, 0, 1),
      letterIndex: raw.letterIndex,
      rgb: LETTER_RGBS[raw.letterIndex],
    });
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(hashSeed(i, 61) * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }

  return result;
}

function buildStageParticles(width: number, height: number): Particle[] {
  interface Spot {
    role: Particle["role"];
    ax: number;
    ay: number;
    rgb: Rgb;
    cardSize: number;
    cardAlpha: number;
  }

  const spots: Spot[] = [];

  // A) Frosted-White Card Surface Mosaic (forms a real glowing white card out of particles!)
  const whiteSurface: Rgb = [255, 255, 255];
  const iceSurface: Rgb = [241, 246, 255];
  for (let gy = 0; gy < 20; gy++) {
    for (let gx = 0; gx < 20; gx++) {
      spots.push({
        role: "card",
        ax: 0.03 + (gx / 19) * 0.94,
        ay: 0.03 + (gy / 19) * 0.94,
        rgb: (gx + gy) % 3 === 0 ? iceSurface : whiteSurface,
        cardSize: 12,
        cardAlpha: 0.92,
      });
    }
  }

  // B) Card Perimeter & Top Blue Accent Stripe
  const blueAccent: Rgb = [0, 113, 227];
  const deepBlueAccent: Rgb = [29, 78, 216];
  const subtleBorder: Rgb = [203, 213, 225];

  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    spots.push({
      role: "card",
      ax: t,
      ay: 0.005,
      rgb: t < 0.5 ? blueAccent : deepBlueAccent,
      cardSize: 2.2,
      cardAlpha: 0.95,
    });
    spots.push({
      role: "card",
      ax: t,
      ay: 0.995,
      rgb: subtleBorder,
      cardSize: 1.5,
      cardAlpha: 0.78,
    });
  }
  for (let i = 1; i < 96; i++) {
    const t = i / 96;
    spots.push({ role: "card", ax: 0.004, ay: t, rgb: subtleBorder, cardSize: 1.5, cardAlpha: 0.78 });
    spots.push({ role: "card", ax: 0.996, ay: t, rgb: subtleBorder, cardSize: 1.5, cardAlpha: 0.78 });
  }

  // C) Card True UI Layout Particles:
  // Eyebrow ("ENTERPRISE PORTAL")
  for (let i = 0; i < 55; i++) {
    spots.push({
      role: "card",
      ax: 0.085 + (i / 54) * 0.34,
      ay: 0.11,
      rgb: blueAccent,
      cardSize: 1.8,
      cardAlpha: 0.9,
    });
  }
  // Heading ("Sign In to GeniusOne")
  const darkInk: Rgb = [15, 23, 42];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 85; i++) {
      spots.push({
        role: "card",
        ax: 0.085 + (i / 84) * 0.62,
        ay: 0.165 + r * 0.018,
        rgb: darkInk,
        cardSize: 2.4,
        cardAlpha: 0.9,
      });
    }
  }
  // Input field outlines
  const inputOutline: Rgb = [203, 213, 225];
  const pushInputOutline = (yTop: number, yBot: number) => {
    for (let i = 0; i <= 56; i++) {
      const x = 0.085 + (i / 56) * 0.83;
      spots.push({ role: "card", ax: x, ay: yTop, rgb: inputOutline, cardSize: 1.6, cardAlpha: 0.85 });
      spots.push({ role: "card", ax: x, ay: yBot, rgb: inputOutline, cardSize: 1.6, cardAlpha: 0.85 });
    }
    for (let j = 1; j < 6; j++) {
      const y = yTop + (j / 6) * (yBot - yTop);
      spots.push({ role: "card", ax: 0.085, ay: y, rgb: inputOutline, cardSize: 1.6, cardAlpha: 0.85 });
      spots.push({ role: "card", ax: 0.915, ay: y, rgb: inputOutline, cardSize: 1.6, cardAlpha: 0.85 });
    }
  };
  pushInputOutline(0.365, 0.455);
  pushInputOutline(0.565, 0.655);

  // Sign In primary button pill (blue -> violet gradient!)
  const ctaLeft: Rgb = [0, 113, 227];
  const ctaMid: Rgb = [37, 99, 235];
  const ctaRight: Rgb = [79, 70, 229];
  for (let row = 0; row < 5; row++) {
    const y = 0.798 + (row / 4) * 0.082;
    for (let col = 0; col <= 68; col++) {
      const t = col / 68;
      spots.push({
        role: "card",
        ax: 0.085 + t * 0.83,
        ay: y,
        rgb: t < 0.35 ? ctaLeft : t < 0.7 ? ctaMid : ctaRight,
        cardSize: 2.8,
        cardAlpha: 0.94,
      });
    }
  }

  // D) Header bar particles (frosted bar + brand mark + badge + rainbow line)
  for (let i = 0; i < 65; i++) {
    spots.push({
      role: "header",
      ax: 0.02 + (i / 64) * 0.96,
      ay: 0.5,
      rgb: whiteSurface,
      cardSize: 10,
      cardAlpha: 0.85,
    });
  }
  for (let i = 0; i < 120; i++) {
    const t = i / 119;
    spots.push({
      role: "header",
      ax: t,
      ay: 0.96,
      rgb: spectrumRgbAt(t),
      cardSize: 1.8,
      cardAlpha: 0.9,
    });
  }
  for (let i = 0; i < 45; i++) {
    spots.push({
      role: "header",
      ax: 0.02 + (i / 44) * 0.12,
      ay: 0.36 + (i % 3) * 0.14,
      rgb: i < 15 ? blueAccent : darkInk,
      cardSize: 2.0,
      cardAlpha: 0.9,
    });
  }
  for (let i = 0; i < 30; i++) {
    spots.push({
      role: "header",
      ax: 0.91 + (i / 29) * 0.065,
      ay: 0.42 + (i % 2) * 0.16,
      rgb: ctaMid,
      cardSize: 1.9,
      cardAlpha: 0.88,
    });
  }

  // E) Footer bar particles (frosted bar + left & right text blocks + rainbow line)
  for (let i = 0; i < 55; i++) {
    spots.push({
      role: "footer",
      ax: 0.02 + (i / 54) * 0.96,
      ay: 0.5,
      rgb: whiteSurface,
      cardSize: 9,
      cardAlpha: 0.85,
    });
  }
  for (let i = 0; i < 120; i++) {
    const t = i / 119;
    spots.push({
      role: "footer",
      ax: t,
      ay: 0.04,
      rgb: spectrumRgbAt(1 - t),
      cardSize: 1.8,
      cardAlpha: 0.9,
    });
  }
  const slateText: Rgb = [100, 116, 139];
  for (let i = 0; i < 45; i++) {
    spots.push({
      role: "footer",
      ax: 0.02 + (i / 44) * 0.24,
      ay: 0.5,
      rgb: slateText,
      cardSize: 1.8,
      cardAlpha: 0.85,
    });
  }
  for (let i = 0; i < 35; i++) {
    spots.push({
      role: "footer",
      ax: 0.78 + (i / 34) * 0.19,
      ay: 0.5,
      rgb: slateText,
      cardSize: 1.8,
      cardAlpha: 0.85,
    });
  }

  const totalCount = spots.length;
  const wordmarkPoints = sampleWordmarkPoints(totalCount);
  const cx = width * 0.5;
  const cy = height * 0.5;

  const particles: Particle[] = [];
  for (let i = 0; i < totalCount; i++) {
    const s = spots[i];
    const r1 = hashSeed(i, 2);
    const r2 = hashSeed(i, 5);
    const r3 = hashSeed(i, 7);
    const r4 = hashSeed(i, 13);

    const tp = wordmarkPoints[i] || {
      nx: r1 - 0.5,
      ny: (r2 - 0.5) * 0.25,
      progressX: r1,
      letterIndex: i % WORDMARK_LETTERS.length,
      rgb: LETTER_RGBS[i % WORDMARK_LETTERS.length],
    };

    const startAngle = r1 * Math.PI * 2;
    const startR = (0.12 + r2 * 0.52) * Math.min(width, height);
    const sx = cx + Math.cos(startAngle) * startR;
    const sy = cy + Math.sin(startAngle) * startR;

    particles.push({
      role: s.role,
      cardAx: s.ax,
      cardAy: s.ay,
      cardRgb: s.rgb,
      textNx: tp.nx,
      textNy: tp.ny,
      textProgressX: tp.progressX,
      letterIndex: tp.letterIndex,
      wordmarkRgb: tp.rgb,
      rainbowRgb: spectrumRgbAt(r1 * 0.6 + tp.progressX * 0.4),
      x: sx,
      y: sy,
      vx: (r3 - 0.5) * 1.4,
      vy: (r4 - 0.5) * 1.4,
      prevX: sx,
      prevY: sy,
      phase: r1 * Math.PI * 2,
      orbitSpeed: (r2 > 0.45 ? 1 : 0.74) * (0.48 + r3 * 0.52),
      armIndex: i % 4,
      radialBias: 0.22 + Math.pow(r4, 0.72) * 0.78,
      size: 1.35 + r3 * 1.15,
      cardSize: s.cardSize,
      baseAlpha: 0.68 + r2 * 0.28,
      cardAlpha: s.cardAlpha,
    });
  }

  return particles;
}

export function LoginParticleField({
  containerRef,
  cardRef,
  headerRef,
  footerRef,
  lockedActive,
  wakeSignal,
  onClarityChange,
  onMaterializedChange,
}: LoginParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lockedRef = useRef<boolean>(lockedActive);
  const onClarityRef = useRef(onClarityChange);
  const onMaterializedRef = useRef(onMaterializedChange);
  const wakeUntilRef = useRef<number>(0);

  lockedRef.current = lockedActive;
  onClarityRef.current = onClarityChange;
  onMaterializedRef.current = onMaterializedChange;

  useEffect(() => {
    if (wakeSignal > 0) {
      wakeUntilRef.current = performance.now() + 2800;
    }
  }, [wakeSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const card = cardRef.current;
    if (!canvas || !container || !card) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (reducedMotion) {
      onClarityRef.current?.(1);
      onMaterializedRef.current?.(true);
      return;
    }

    let containerRect = container.getBoundingClientRect();
    let cardLeft = 0;
    let cardTop = 0;
    let cardWidth = 440;
    let cardHeight = 460;
    let headerTop = 0;
    let headerHeight = 64;
    let footerTop = containerRect.height - 48;
    let footerHeight = 48;

    const syncGeometry = () => {
      containerRect = container.getBoundingClientRect();
      const cRect = card.getBoundingClientRect();
      if (cRect.width > 0 && cRect.height > 0) {
        cardWidth = cRect.width;
        cardHeight = cRect.height;
        cardLeft = cRect.left - containerRect.left;
        cardTop = cRect.top - containerRect.top;
      } else {
        cardLeft = (containerRect.width - cardWidth) * 0.5;
        cardTop = (containerRect.height - cardHeight) * 0.5;
      }

      if (headerRef?.current) {
        const hRect = headerRef.current.getBoundingClientRect();
        headerTop = hRect.top - containerRect.top;
        headerHeight = hRect.height || 64;
      }
      if (footerRef?.current) {
        const fRect = footerRef.current.getBoundingClientRect();
        footerTop = fRect.top - containerRect.top;
        footerHeight = fRect.height || 48;
      } else {
        footerTop = containerRect.height - 48;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(containerRect.width));
      const h = Math.max(1, Math.floor(containerRect.height));
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    syncGeometry();
    const particles = buildStageParticles(containerRect.width, containerRect.height);

    const pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      active: false,
    };

    let cardFocus = lockedRef.current ? 1 : 0;
    let settledProgress = lockedRef.current ? 1 : 0;
    let lastMaterialized = lockedRef.current;
    let leaveAt = 0;

    onClarityRef.current?.(lockedRef.current ? 1 : 0);
    onMaterializedRef.current?.(lastMaterialized);

    const computeCenterProximity = (px: number, py: number): number => {
      const cx = cardLeft + cardWidth * 0.5;
      const cy = cardTop + cardHeight * 0.5;
      const dx = px - cx;
      const dy = py - cy;

      const innerHalfW = cardWidth * 0.5 + 14;
      const innerHalfH = cardHeight * 0.5 + 14;
      const outerHalfW = innerHalfW + Math.max(185, containerRect.width * 0.24);
      const outerHalfH = innerHalfH + Math.max(135, containerRect.height * 0.22);

      const innerRatio = Math.hypot(dx / innerHalfW, dy / innerHalfH);
      if (innerRatio <= 1) return 1;

      const outerRatio = Math.hypot(dx / outerHalfW, dy / outerHalfH);
      if (outerRatio >= 1) return 0;

      const span = Math.max(0.25, outerRatio - innerRatio);
      const linear = clamp(1 - (innerRatio - 1) / (span + (innerRatio - 1)), 0, 1);
      return linear * linear * (3 - 2 * linear);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const nextX = e.clientX - containerRect.left;
      const nextY = e.clientY - containerRect.top;
      if (pointer.active) {
        pointer.vx = clamp(nextX - pointer.x, -40, 40);
        pointer.vy = clamp(nextY - pointer.y, -40, 40);
      }
      pointer.x = nextX;
      pointer.y = nextY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.vx = 0;
      pointer.vy = 0;
      leaveAt = performance.now();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("blur", handlePointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      syncGeometry();
    });
    resizeObserver.observe(container);
    resizeObserver.observe(card);
    if (headerRef?.current) resizeObserver.observe(headerRef.current);
    if (footerRef?.current) resizeObserver.observe(footerRef.current);

    let rafId = 0;
    let simTime = 0;
    let lastNow = performance.now();

    const CYCLE_SEC = 11.4;

    const tick = (now: number) => {
      const dtSec = Math.min(0.035, Math.max(0.004, (now - lastNow) / 1000));
      const dt = dtSec * 60;
      lastNow = now;
      simTime += dtSec;

      const w = containerRect.width;
      const h = containerRect.height;
      const cx = cardLeft + cardWidth * 0.5;
      const cy = cardTop + cardHeight * 0.5;

      pointer.vx *= Math.exp(-8 * dtSec);
      pointer.vy *= Math.exp(-8 * dtSec);

      let desiredFocus = 0;
      if (lockedRef.current || now < wakeUntilRef.current) {
        desiredFocus = 1;
      } else if (pointer.active) {
        desiredFocus = computeCenterProximity(pointer.x, pointer.y);
      } else if (now - leaveAt < 260) {
        desiredFocus = cardFocus;
      }

      const smoothRate = desiredFocus > cardFocus ? 6.2 : 3.4;
      cardFocus += (desiredFocus - cardFocus) * (1 - Math.exp(-smoothRate * dtSec));
      if (Math.abs(desiredFocus - cardFocus) < 0.001) {
        cardFocus = desiredFocus;
      }

      const cycleT = simTime % CYCLE_SEC;
      const wordmarkMix = smoothstep(2.4, 4.1, cycleT) * (1 - smoothstep(8.1, 10.6, cycleT));
      const wavePhase = clamp((cycleT - 7.3) / 3.6, 0, 1);

      const standbyMix = 1 - cardFocus;
      const colorMorphToCard = smoothstep(0.32, 0.88, cardFocus);
      const formSurfaceWeight = smoothstep(0.45, 0.92, cardFocus);
      // Direct magnetic lock assist once focus approaches center so zero stragglers lag behind!
      const lockSnapAssist = smoothstep(0.55, 0.98, cardFocus) * (1 - Math.exp(-10 * dtSec));

      const stageRadiusX = w * 0.46;
      const stageRadiusY = h * 0.45;
      const wordmarkWidth = Math.min(w * 0.82, 740);
      const wordmarkHeight = wordmarkWidth * 0.22;

      // Update particle positions first and measure real convergence to card targets!
      let cardDistSum = 0;
      let cardDistCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;

        // 1) Standby spiral + continuous orbital curves
        const armBase = (p.armIndex * Math.PI) / 2;
        const spiralTwist = p.radialBias * 2.65;
        const theta = armBase + spiralTwist - simTime * 0.56 * p.orbitSpeed;
        const rPulse = p.radialBias * (0.86 + 0.16 * Math.sin(simTime * 1.15 + p.phase));

        let standbyX =
          cx +
          Math.cos(theta) * stageRadiusX * rPulse +
          Math.sin(simTime * 1.35 + p.phase) * 16;
        let standbyY =
          cy +
          Math.sin(theta) * stageRadiusY * rPulse +
          Math.cos(simTime * 1.2 + p.phase) * 14;

        if (p.role === "header" || p.role === "footer") {
          const bandBaseY = p.role === "header" ? headerHeight * 0.55 : footerTop + footerHeight * 0.45;
          const lissajousX = cx + Math.sin(simTime * 0.52 * p.orbitSpeed + p.phase) * (w * 0.46);
          const lissajousY =
            bandBaseY +
            Math.cos(simTime * 1.15 * p.orbitSpeed + p.phase * 1.7) * 34 +
            Math.sin(simTime * 0.8 + p.cardAx * Math.PI * 2) * 18;
          const vortexBlend = 0.45 + 0.35 * Math.sin(simTime * 0.45 + p.phase);
          standbyX = standbyX * vortexBlend + lissajousX * (1 - vortexBlend);
          standbyY = standbyY * vortexBlend + lissajousY * (1 - vortexBlend);
        }

        // 2) "GeniusOne" particle wordmark & ocean wave
        const letterStagger = clamp(
          wordmarkMix * 1.35 - (p.letterIndex / WORDMARK_LETTERS.length) * 0.35,
          0,
          1
        );
        let textX = cx + p.textNx * wordmarkWidth + Math.cos(simTime * 2.1 + p.phase) * 0.45;
        let textY = cy + p.textNy * wordmarkHeight + Math.sin(simTime * 2.2 + p.textProgressX * 4.5) * 0.9;

        if (wavePhase > 0 && wavePhase < 1) {
          const waveFront = wavePhase * 1.55 - 0.18;
          const behind = waveFront - p.textProgressX;
          if (behind > 0) {
            const crest = smoothstep(0, 0.46, behind);
            const ocean = Math.sin(p.textProgressX * 14 - simTime * 10.2 + p.phase * 0.35);
            textX += crest * (ocean * 36 + crest * 115 * Math.cos(p.phase * 0.6));
            textY += crest * (ocean * 72 - Math.sin(p.phase) * 44 * crest);
          }
        }

        const textMixWeight = p.role === "card" ? letterStagger : letterStagger * 0.45;
        standbyX = standbyX * (1 - textMixWeight) + textX * textMixWeight;
        standbyY = standbyY * (1 - textMixWeight) + textY * textMixWeight;

        // 3) UI Target coordinates (Header + Card + Footer)
        let uiTargetX = cardLeft + p.cardAx * cardWidth;
        let uiTargetY = cardTop + p.cardAy * cardHeight;
        if (p.role === "header") {
          uiTargetX = p.cardAx * w;
          uiTargetY = headerTop + p.cardAy * headerHeight;
        } else if (p.role === "footer") {
          uiTargetX = p.cardAx * w;
          uiTargetY = footerTop + p.cardAy * footerHeight;
        }

        const vortexLift = Math.sin(cardFocus * Math.PI) * (1 - cardFocus) * 32;
        const bridgeAngle = p.phase + cardFocus * 2.4;
        const targetX = standbyX * standbyMix + uiTargetX * cardFocus + Math.cos(bridgeAngle) * vortexLift;
        const targetY = standbyY * standbyMix + uiTargetY * cardFocus + Math.sin(bridgeAngle) * vortexLift;

        const wordPull = p.role === "card" ? wordmarkMix * standbyMix : wordmarkMix * 0.3 * standbyMix;
        const stiffness = (0.036 + wordPull * 0.1 + formSurfaceWeight * 0.24) * dt;
        const damping = Math.exp(-(4.3 + wordPull * 2.8 + formSurfaceWeight * 6.5) * dtSec);

        p.vx = (p.vx + (targetX - p.x) * stiffness) * damping;
        p.vy = (p.vy + (targetY - p.y) * stiffness) * damping;

        if (pointer.active && standbyMix > 0.12) {
          const mdx = p.x - pointer.x;
          const mdy = p.y - pointer.y;
          const distSq = mdx * mdx + mdy * mdy;
          if (distSq > 9 && distSq < 25600) {
            const mDist = Math.sqrt(distSq);
            const falloff = (160 - mDist) / 160;
            const tangX = -mdy / mDist;
            const tangY = mdx / mDist;
            p.vx += (tangX * 0.55 * falloff + pointer.vx * 0.045 * falloff) * standbyMix * dt;
            p.vy += (tangY * 0.55 * falloff + pointer.vy * 0.045 * falloff) * standbyMix * dt;
          }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Smooth homing assist once entering center so particles visibly lock onto card silhouette BEFORE reveal
        if (lockSnapAssist > 0) {
          p.x += (uiTargetX - p.x) * lockSnapAssist;
          p.y += (uiTargetY - p.y) * lockSnapAssist;
        }

        if (p.role === "card") {
          cardDistSum += Math.hypot(uiTargetX - p.x, uiTargetY - p.y);
          cardDistCount += 1;
        }
      }

      // Compute TRUE visual particle settlement (only reveal HTML card once particles are ALREADY seated on card!)
      const avgCardErr = cardDistCount > 0 ? cardDistSum / cardDistCount : 0;
      const settlementTarget = 1 - smoothstep(8, 72, avgCardErr);
      settledProgress += (settlementTarget - settledProgress) * (1 - Math.exp(-9 * dtSec));

      // HTML clarity lags behind particle arrival: particles first assemble card shape -> THEN HTML cross-dissolves 1:1
      const effectiveReadiness = lockedRef.current ? Math.max(0.92, Math.min(cardFocus, settledProgress)) : Math.min(cardFocus, settledProgress);
      const htmlClarity = smoothstep(0.76, 0.985, effectiveReadiness);

      const nextMaterialized = htmlClarity >= 0.88 || lockedRef.current;
      if (nextMaterialized !== lastMaterialized) {
        lastMaterialized = nextMaterialized;
        onMaterializedRef.current?.(nextMaterialized);
      }
      onClarityRef.current?.(lockedRef.current ? 1 : htmlClarity);

      ctx.clearRect(0, 0, w, h);

      // Simultaneous 1:1 cross-dissolve: particles drop to 0 at exact speed HTML card reaches 1.0 -> NO confetti over solid card!
      const particleAlphaMaster = lockedRef.current ? 0 : 1 - htmlClarity;
      if (particleAlphaMaster <= 0.004) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const haloR = Math.max(cardWidth, cardHeight) * (0.72 + standbyMix * 0.38);
      const halo = ctx.createRadialGradient(cx, cy, 14, cx, cy, haloR);
      halo.addColorStop(0, `rgba(99, 102, 241, ${0.06 * particleAlphaMaster})`);
      halo.addColorStop(0.55, `rgba(56, 189, 248, ${0.035 * particleAlphaMaster})`);
      halo.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      const wordmarkPresence = wordmarkMix * standbyMix;
      const wordmarkColorWeight = wordmarkMix * (1 - colorMorphToCard);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed = Math.hypot(p.x - p.prevX, p.y - p.prevY);

        // Smooth RGB transition: rainbow galaxy <-> wordmark letter color <-> true card/UI frosted colors
        const fromRgb: Rgb = p.role === "card" && wordmarkColorWeight > 0.25 ? p.wordmarkRgb : p.rainbowRgb;
        const alphaBase = p.baseAlpha * (1 - formSurfaceWeight) + p.cardAlpha * formSurfaceWeight;
        const dotAlpha = clamp(alphaBase * particleAlphaMaster * (0.94 + wordmarkPresence * 0.12), 0, 0.98);
        const radius =
          p.size * (1 - formSurfaceWeight) * (1 - wordmarkPresence * 0.16) +
          p.cardSize * formSurfaceWeight;

        const fillCss = mixCssRgb(fromRgb, p.cardRgb, colorMorphToCard, dotAlpha);

        // Motion trails only while moving dynamically (vanish smoothly as dots settle onto card)
        if (speed > 0.65 && speed < 140 && dotAlpha > 0.04 && formSurfaceWeight < 0.85) {
          ctx.beginPath();
          ctx.moveTo(p.prevX - p.vx * 2.1, p.prevY - p.vy * 2.1);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = mixCssRgb(
            fromRgb,
            p.cardRgb,
            colorMorphToCard,
            dotAlpha * 0.34 * (1 - formSurfaceWeight)
          );
          ctx.lineWidth = Math.max(0.8, p.size * 0.72);
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillCss;
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, [containerRef, cardRef, headerRef, footerRef]);

  return <canvas ref={canvasRef} className="login-particle-canvas" aria-hidden="true" />;
}

export default LoginParticleField;
