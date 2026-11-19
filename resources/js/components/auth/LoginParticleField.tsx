import React, { useEffect, useRef } from "react";
import {
  DEFAULT_LETTER_HEXES,
  DEFAULT_PARTICLE_SETTINGS,
  WORDMARK_LETTERS,
  hexToRgb,
  hslToRgb,
  shiftRgbHue,
  type LoginParticleSettings,
  type LoginThemeMode,
  type ParticleDirectionMode,
  type Rgb,
} from "./loginParticleConfig";
import {
  TIER_PROFILES,
  downgradeTier,
  type ParticlePerformanceTier,
} from "./loginParticlePerf";

interface LoginParticleFieldProps {
  containerRef: React.RefObject<HTMLElement | null>;
  cardRef: React.RefObject<HTMLElement | null>;
  headerRef?: React.RefObject<HTMLElement | null>;
  footerRef?: React.RefObject<HTMLElement | null>;
  lockedActive: boolean;
  wakeSignal: number;
  replaySignal?: number;
  darkMode?: boolean;
  themeMode?: LoginThemeMode;
  settings?: LoginParticleSettings;
  performanceTier?: ParticlePerformanceTier;
  disableAutoDowngrade?: boolean;
  onTierAutoChange?: (nextTier: ParticlePerformanceTier, reason: string, avgFrameMs: number) => void;
  onClarityChange?: (clarity: number) => void;
  onMaterializedChange?: (materialized: boolean) => void;
  onDarknessChange?: (darkness: number, controlsOpacity: number) => void;
  onDarkUiChange?: (isDarkUi: boolean) => void;
}

interface WordmarkPoint {
  nx: number;
  ny: number;
  progressX: number;
  letterIndex: number;
}

interface Particle {
  role: "card" | "header" | "footer";
  cardAx: number;
  cardAy: number;
  cardRgb: Rgb;
  cardDarkRgb: Rgb;
  textNx: number;
  textNy: number;
  textProgressX: number;
  letterIndex: number;
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
  densitySlot: number;
}

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

const AUTO_DIRECTIONS: ReadonlyArray<Exclude<ParticleDirectionMode, "auto">> = [
  "left-to-right",
  "right-to-left",
  "ocean-wave",
  "center-vortex",
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
    darkRgb: Rgb;
    cardSize: number;
    cardAlpha: number;
  }

  const spots: Spot[] = [];

  const whiteSurface: Rgb = [255, 255, 255];
  const iceSurface: Rgb = [241, 246, 255];
  const darkSurface: Rgb = [15, 23, 42];
  const darkAltSurface: Rgb = [23, 33, 56];

  for (let gy = 0; gy < 20; gy++) {
    for (let gx = 0; gx < 20; gx++) {
      const alt = (gx + gy) % 3 === 0;
      spots.push({
        role: "card",
        ax: 0.03 + (gx / 19) * 0.94,
        ay: 0.03 + (gy / 19) * 0.94,
        rgb: alt ? iceSurface : whiteSurface,
        darkRgb: alt ? darkAltSurface : darkSurface,
        cardSize: 12,
        cardAlpha: 0.92,
      });
    }
  }

  const blueAccent: Rgb = [0, 113, 227];
  const neonBlueAccent: Rgb = [56, 189, 248];
  const deepBlueAccent: Rgb = [29, 78, 216];
  const violetAccent: Rgb = [99, 102, 241];
  const subtleBorder: Rgb = [203, 213, 225];
  const darkBorder: Rgb = [51, 65, 85];

  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    spots.push({
      role: "card",
      ax: t,
      ay: 0.005,
      rgb: t < 0.5 ? blueAccent : deepBlueAccent,
      darkRgb: t < 0.5 ? neonBlueAccent : violetAccent,
      cardSize: 2.2,
      cardAlpha: 0.95,
    });
    spots.push({
      role: "card",
      ax: t,
      ay: 0.995,
      rgb: subtleBorder,
      darkRgb: darkBorder,
      cardSize: 1.5,
      cardAlpha: 0.78,
    });
  }
  for (let i = 1; i < 96; i++) {
    const t = i / 96;
    spots.push({ role: "card", ax: 0.004, ay: t, rgb: subtleBorder, darkRgb: darkBorder, cardSize: 1.5, cardAlpha: 0.78 });
    spots.push({ role: "card", ax: 0.996, ay: t, rgb: subtleBorder, darkRgb: darkBorder, cardSize: 1.5, cardAlpha: 0.78 });
  }

  for (let i = 0; i < 55; i++) {
    spots.push({
      role: "card",
      ax: 0.085 + (i / 54) * 0.34,
      ay: 0.11,
      rgb: blueAccent,
      darkRgb: neonBlueAccent,
      cardSize: 1.8,
      cardAlpha: 0.9,
    });
  }
  const darkInk: Rgb = [15, 23, 42];
  const lightInk: Rgb = [241, 245, 249];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 85; i++) {
      spots.push({
        role: "card",
        ax: 0.085 + (i / 84) * 0.62,
        ay: 0.165 + r * 0.018,
        rgb: darkInk,
        darkRgb: lightInk,
        cardSize: 2.4,
        cardAlpha: 0.9,
      });
    }
  }

  const inputOutline: Rgb = [203, 213, 225];
  const darkInputOutline: Rgb = [71, 85, 105];
  const pushInputOutline = (yTop: number, yBot: number) => {
    for (let i = 0; i <= 56; i++) {
      const x = 0.085 + (i / 56) * 0.83;
      spots.push({ role: "card", ax: x, ay: yTop, rgb: inputOutline, darkRgb: darkInputOutline, cardSize: 1.6, cardAlpha: 0.85 });
      spots.push({ role: "card", ax: x, ay: yBot, rgb: inputOutline, darkRgb: darkInputOutline, cardSize: 1.6, cardAlpha: 0.85 });
    }
    for (let j = 1; j < 6; j++) {
      const y = yTop + (j / 6) * (yBot - yTop);
      spots.push({ role: "card", ax: 0.085, ay: y, rgb: inputOutline, darkRgb: darkInputOutline, cardSize: 1.6, cardAlpha: 0.85 });
      spots.push({ role: "card", ax: 0.915, ay: y, rgb: inputOutline, darkRgb: darkInputOutline, cardSize: 1.6, cardAlpha: 0.85 });
    }
  };
  pushInputOutline(0.365, 0.455);
  pushInputOutline(0.565, 0.655);

  const ctaLeft: Rgb = [0, 113, 227];
  const ctaMid: Rgb = [37, 99, 235];
  const ctaRight: Rgb = [79, 70, 229];
  for (let row = 0; row < 5; row++) {
    const y = 0.798 + (row / 4) * 0.082;
    for (let col = 0; col <= 68; col++) {
      const t = col / 68;
      const c = t < 0.35 ? ctaLeft : t < 0.7 ? ctaMid : ctaRight;
      spots.push({
        role: "card",
        ax: 0.085 + t * 0.83,
        ay: y,
        rgb: c,
        darkRgb: t < 0.5 ? neonBlueAccent : violetAccent,
        cardSize: 2.8,
        cardAlpha: 0.94,
      });
    }
  }

  for (let i = 0; i < 65; i++) {
    spots.push({
      role: "header",
      ax: 0.02 + (i / 64) * 0.96,
      ay: 0.5,
      rgb: whiteSurface,
      darkRgb: darkSurface,
      cardSize: 10,
      cardAlpha: 0.85,
    });
  }
  for (let i = 0; i < 120; i++) {
    const t = i / 119;
    const spec = spectrumRgbAt(t);
    spots.push({
      role: "header",
      ax: t,
      ay: 0.96,
      rgb: spec,
      darkRgb: spec,
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
      darkRgb: i < 15 ? neonBlueAccent : lightInk,
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
      darkRgb: neonBlueAccent,
      cardSize: 1.9,
      cardAlpha: 0.88,
    });
  }

  for (let i = 0; i < 55; i++) {
    spots.push({
      role: "footer",
      ax: 0.02 + (i / 54) * 0.96,
      ay: 0.5,
      rgb: whiteSurface,
      darkRgb: darkSurface,
      cardSize: 9,
      cardAlpha: 0.85,
    });
  }
  for (let i = 0; i < 120; i++) {
    const t = i / 119;
    const spec = spectrumRgbAt(1 - t);
    spots.push({
      role: "footer",
      ax: t,
      ay: 0.04,
      rgb: spec,
      darkRgb: spec,
      cardSize: 1.8,
      cardAlpha: 0.9,
    });
  }
  const slateText: Rgb = [100, 116, 139];
  const darkFooterText: Rgb = [148, 163, 184];
  for (let i = 0; i < 45; i++) {
    spots.push({
      role: "footer",
      ax: 0.02 + (i / 44) * 0.24,
      ay: 0.5,
      rgb: slateText,
      darkRgb: darkFooterText,
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
      darkRgb: darkFooterText,
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
      cardDarkRgb: s.darkRgb,
      textNx: tp.nx,
      textNy: tp.ny,
      textProgressX: tp.progressX,
      letterIndex: tp.letterIndex,
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
      densitySlot: ((i * 2654435761) >>> 0) % 100,
    });
  }

  return particles;
}

function resolveLetterPaletteForFrame(
  settings: LoginParticleSettings,
  cycleIndex: number,
  simTime: number,
  darkness: number
): Rgb[] {
  const count = WORDMARK_LETTERS.length;
  const baseRgbs: Rgb[] = WORDMARK_LETTERS.map((_, idx) =>
    hexToRgb(settings.letterColors[idx] || DEFAULT_LETTER_HEXES[idx])
  );

  if (settings.colorMode === "rgb-wave") {
    const lightPct = 50 + clamp(darkness, 0, 1) * 12;
    const hueRate = 115 * settings.speed;
    return WORDMARK_LETTERS.map((_, idx) => {
      const hue = idx * 36 - simTime * hueRate + cycleIndex * 40;
      return hslToRgb(hue, 88, lightPct);
    });
  }

  if (settings.colorMode === "breathing") {
    const breathDeg = Math.sin(simTime * 1.35 * settings.speed) * 48 + cycleIndex * 65;
    return baseRgbs.map((rgb, idx) => shiftRgbHue(rgb, breathDeg + idx * 8));
  }

  if (settings.colorMode === "cycle-shuffle") {
    if (cycleIndex === 0) return baseRgbs;
    const shiftSlot = (cycleIndex * 2) % count;
    const cycleHueOffset = (cycleIndex * 47) % 360;
    return WORDMARK_LETTERS.map((_, idx) => {
      const picked = baseRgbs[(idx + shiftSlot) % count];
      return shiftRgbHue(picked, cycleHueOffset + (idx % 2 === 0 ? 18 : -18));
    });
  }

  return baseRgbs;
}

export function LoginParticleField({
  containerRef,
  cardRef,
  headerRef,
  footerRef,
  lockedActive,
  wakeSignal,
  replaySignal = 0,
  darkMode = false,
  themeMode,
  settings = DEFAULT_PARTICLE_SETTINGS,
  performanceTier = "high",
  disableAutoDowngrade = false,
  onTierAutoChange,
  onClarityChange,
  onMaterializedChange,
  onDarknessChange,
  onDarkUiChange,
}: LoginParticleFieldProps) {
  const resolvedThemeMode: LoginThemeMode = themeMode ?? (darkMode ? "dark" : "auto");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lockedRef = useRef<boolean>(lockedActive);
  const themeModeRef = useRef<LoginThemeMode>(resolvedThemeMode);
  const settingsRef = useRef<LoginParticleSettings>(settings);
  const tierRef = useRef<ParticlePerformanceTier>(performanceTier);
  const disableDowngradeRef = useRef<boolean>(disableAutoDowngrade);
  const onTierAutoChangeRef = useRef(onTierAutoChange);
  const onClarityRef = useRef(onClarityChange);
  const onMaterializedRef = useRef(onMaterializedChange);
  const onDarknessRef = useRef(onDarknessChange);
  const onDarkUiRef = useRef(onDarkUiChange);
  const wakeUntilRef = useRef<number>(0);
  const replayRequestedRef = useRef<boolean>(false);
  const syncGeometryCallbackRef = useRef<(() => void) | null>(null);

  lockedRef.current = lockedActive;
  themeModeRef.current = resolvedThemeMode;
  settingsRef.current = settings;
  tierRef.current = performanceTier;
  disableDowngradeRef.current = disableAutoDowngrade;
  onTierAutoChangeRef.current = onTierAutoChange;
  onClarityRef.current = onClarityChange;
  onMaterializedRef.current = onMaterializedChange;
  onDarknessRef.current = onDarknessChange;
  onDarkUiRef.current = onDarkUiChange;

  useEffect(() => {
    syncGeometryCallbackRef.current?.();
  }, [performanceTier]);

  useEffect(() => {
    if (wakeSignal > 0) {
      wakeUntilRef.current = performance.now() + 2800;
    }
  }, [wakeSignal]);

  useEffect(() => {
    if (replaySignal > 0) {
      replayRequestedRef.current = true;
    }
  }, [replaySignal]);

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

    if (reducedMotion || tierRef.current === "locked") {
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

      const tierProfile = TIER_PROFILES[tierRef.current];
      const dpr = Math.min(window.devicePixelRatio || 1, tierProfile.maxDpr);
      const w = Math.max(1, Math.floor(containerRect.width));
      const h = Math.max(1, Math.floor(containerRect.height));
      const targetW = Math.max(1, Math.floor(w * dpr));
      const targetH = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncGeometryCallbackRef.current = syncGeometry;
    syncGeometry();
    const particles = buildStageParticles(containerRect.width, containerRect.height);

    const pointer = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
      active: false,
      wakeEnergy: 0,
    };

    let cardFocus = lockedRef.current ? 1 : 0;
    let settledProgress = lockedRef.current ? 1 : 0;
    let lastMaterialized = lockedRef.current;
    let leaveAt = 0;

    let darkness =
      themeModeRef.current === "light"
        ? 0
        : themeModeRef.current === "dark"
          ? 0.85
          : lockedRef.current
            ? 0
            : 0.78;
    let idleSeconds = 0;
    let controlsOpacity = 1;
    let lastPointerActivityAt = performance.now();
    let lastEmittedDarkness = -1;
    let lastEmittedControlsOpacity = -1;
    let lastDarkUi = darkness >= 0.45;

    onClarityRef.current?.(lockedRef.current ? 1 : 0);
    onMaterializedRef.current?.(lastMaterialized);
    onDarknessRef.current?.(darkness, controlsOpacity);
    onDarkUiRef.current?.(lastDarkUi);

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
      lastPointerActivityAt = performance.now();
      if (pointer.active) {
        const stepDx = nextX - pointer.x;
        const stepDy = nextY - pointer.y;
        pointer.vx = clamp(stepDx, -40, 40);
        pointer.vy = clamp(stepDy, -40, 40);

        const stepDist = Math.hypot(stepDx, stepDy);
        if (stepDist > 0.5) {
          const prox = computeCenterProximity(nextX, nextY);
          const toCenterX = cardLeft + cardWidth * 0.5 - nextX;
          const toCenterY = cardTop + cardHeight * 0.5 - nextY;
          const distToCenter = Math.hypot(toCenterX, toCenterY);
          const alignment =
            distToCenter > 1
              ? (stepDx * toCenterX + stepDy * toCenterY) / (stepDist * distToCenter)
              : 1;
          const towardWeight =
            prox >= 0.72
              ? 1.15
              : clamp(Math.max(0, alignment) * 0.95 + prox * 0.55, 0, 1.35);
          pointer.wakeEnergy = clamp(
            pointer.wakeEnergy + (stepDist / 165) * towardWeight,
            0,
            1
          );
        }
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
    let ewmaFrameMs = 16.7;
    let slowFrameStreak = 0;
    let measuredFrames = 0;
    let lastDowngradeAt = 0;

    const CYCLE_SEC = 11.4;

    const tick = (now: number) => {
      const currentTier = tierRef.current;
      const tierProfile = TIER_PROFILES[currentTier];
      if (currentTier === "locked" || tierProfile.density <= 0) {
        ctx.clearRect(0, 0, containerRect.width, containerRect.height);
        onClarityRef.current?.(1);
        onMaterializedRef.current?.(true);
        return;
      }

      const activeSettings = settingsRef.current;
      const currentThemeMode = themeModeRef.current;
      const frameDeltaMs = Math.max(0, now - lastNow);
      const rawDtSec = Math.min(0.035, Math.max(0.004, frameDeltaMs / 1000));
      const dtSec = rawDtSec * activeSettings.speed;
      const dt = rawDtSec * 60;
      lastNow = now;

      if (replayRequestedRef.current) {
        replayRequestedRef.current = false;
        const nextCycle = Math.floor(simTime / CYCLE_SEC) + 1;
        simTime = nextCycle * CYCLE_SEC + 1.85;
      } else {
        simTime += dtSec;
      }

      const w = containerRect.width;
      const h = containerRect.height;
      const cx = cardLeft + cardWidth * 0.5;
      const cy = cardTop + cardHeight * 0.5;

      pointer.vx *= Math.exp(-8 * rawDtSec);
      pointer.vy *= Math.exp(-8 * rawDtSec);

      const centerProx = pointer.active ? computeCenterProximity(pointer.x, pointer.y) : 0;
      const energyDecay = pointer.active && centerProx > 0.45 ? 0.32 : 1.25;
      pointer.wakeEnergy *= Math.exp(-energyDecay * rawDtSec);

      let desiredFocus = 0;
      if (lockedRef.current || now < wakeUntilRef.current) {
        desiredFocus = 1;
      } else if (pointer.active) {
        desiredFocus = centerProx;
      } else if (now - leaveAt < 260) {
        desiredFocus = cardFocus;
      }

      const smoothRate = desiredFocus > cardFocus ? 6.2 : 3.4;
      cardFocus += (desiredFocus - cardFocus) * (1 - Math.exp(-smoothRate * rawDtSec));
      if (Math.abs(desiredFocus - cardFocus) < 0.001) {
        cardFocus = desiredFocus;
      }

      // Adaptive Ambient Darkness:
      // - Idle triggers Dark Mode immediately and progressively deepens darkness to save screen power.
      // - Moving cursor intensively toward center smoothly dawns to Light Mode without blinking.
      let targetDarkness = darkness;
      let darkSmoothRate = 1.4;
      if (currentThemeMode === "light") {
        targetDarkness = 0;
        darkSmoothRate = 1.85;
      } else if (currentThemeMode === "dark") {
        targetDarkness = 0.85;
        darkSmoothRate = 1.85;
      } else {
        const isWakingToCenter =
          lockedRef.current ||
          now < wakeUntilRef.current ||
          centerProx > 0.45 ||
          (centerProx > 0.14 && pointer.wakeEnergy > 0.34);

        if (isWakingToCenter) {
          idleSeconds = 0;
          targetDarkness = 0;
          darkSmoothRate = 1.55;
        } else {
          idleSeconds += rawDtSec;
          const powerSaveDepth = clamp((idleSeconds - 1.8) / 11.5, 0, 1);
          targetDarkness = 0.78 + powerSaveDepth * 0.22;
          darkSmoothRate = darkness < 0.75 ? 1.15 : 0.34;
        }
      }

      darkness += (targetDarkness - darkness) * (1 - Math.exp(-darkSmoothRate * rawDtSec));
      if (Math.abs(targetDarkness - darkness) < 0.002) {
        darkness = targetDarkness;
      }

      const controlsShouldShow =
        lockedRef.current ||
        now < wakeUntilRef.current ||
        centerProx > 0.35 ||
        now - lastPointerActivityAt < 3200 ||
        currentThemeMode === "light";
      const targetControlsOpacity = controlsShouldShow ? 1 : 0;
      const controlsRate = controlsShouldShow ? 7.5 : 0.72;
      controlsOpacity +=
        (targetControlsOpacity - controlsOpacity) * (1 - Math.exp(-controlsRate * rawDtSec));
      if (Math.abs(targetControlsOpacity - controlsOpacity) < 0.003) {
        controlsOpacity = targetControlsOpacity;
      }

      if (
        Math.abs(darkness - lastEmittedDarkness) >= 0.004 ||
        Math.abs(controlsOpacity - lastEmittedControlsOpacity) >= 0.005 ||
        darkness === 0 ||
        darkness === 1
      ) {
        lastEmittedDarkness = darkness;
        lastEmittedControlsOpacity = controlsOpacity;
        onDarknessRef.current?.(darkness, controlsOpacity);
      }

      const nextDarkUi = darkness >= 0.45;
      if (nextDarkUi !== lastDarkUi) {
        lastDarkUi = nextDarkUi;
        onDarkUiRef.current?.(nextDarkUi);
      }

      const cycleIndex = Math.floor(simTime / CYCLE_SEC);
      const cycleT = simTime % CYCLE_SEC;

      const wordmarkRise = smoothstep(2.0, 3.8, cycleT);
      const wordmarkFadeFallback = 1 - smoothstep(9.8, 11.1, cycleT);
      const wavePhase = clamp((cycleT - 7.3) / 3.4, 0, 1);

      const resolvedDirection: Exclude<ParticleDirectionMode, "auto"> =
        activeSettings.directionMode === "auto"
          ? AUTO_DIRECTIONS[cycleIndex % AUTO_DIRECTIONS.length]
          : activeSettings.directionMode;

      const activeLetterPalette = resolveLetterPaletteForFrame(
        activeSettings,
        cycleIndex,
        simTime,
        darkness
      );

      const standbyMix = 1 - cardFocus;
      const colorMorphToCard = smoothstep(0.32, 0.88, cardFocus);
      const formSurfaceWeight = smoothstep(0.45, 0.92, cardFocus);
      const lockSnapAssist = smoothstep(0.55, 0.98, cardFocus) * (1 - Math.exp(-10 * rawDtSec));

      const stageRadiusX = w * 0.46;
      const stageRadiusY = h * 0.45;
      const wordmarkWidth = Math.min(w * 0.84, 780);
      const wordmarkHeight = wordmarkWidth * 0.22;

      let cardDistSum = 0;
      let cardDistCount = 0;

      const wordmarkPresenceGlobal = wordmarkRise * wordmarkFadeFallback;
      const turb = activeSettings.turbulence;
      const safeCharTotal = WORDMARK_LETTERS.length;
      const densityPct = Math.round(tierProfile.density * 100);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.densitySlot >= densityPct) continue;
        p.prevX = p.x;
        p.prevY = p.y;

        const armBase = (p.armIndex * Math.PI) / 2;
        const spiralTwist = p.radialBias * 2.65;
        const theta = armBase + spiralTwist - simTime * 0.56 * p.orbitSpeed;
        const rPulse = p.radialBias * (0.86 + 0.16 * Math.sin(simTime * 1.15 + p.phase));

        let standbyX =
          cx +
          Math.cos(theta) * stageRadiusX * rPulse +
          Math.sin(simTime * 1.35 + p.phase) * 16 * turb;
        let standbyY =
          cy +
          Math.sin(theta) * stageRadiusY * rPulse +
          Math.cos(simTime * 1.2 + p.phase) * 14 * turb;

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

        const letterOrder =
          resolvedDirection === "right-to-left"
            ? (safeCharTotal - 1 - p.letterIndex) / safeCharTotal
            : p.letterIndex / safeCharTotal;

        const letterEnterStagger = clamp(wordmarkRise * 1.38 - letterOrder * 0.38, 0, 1);

        let textX = cx + p.textNx * wordmarkWidth + Math.cos(simTime * 2.1 + p.phase) * 0.45;
        let textY = cy + p.textNy * wordmarkHeight + Math.sin(simTime * 2.2 + p.textProgressX * 4.5) * 0.9;
        let perParticleHold = 1;

        if (wavePhase > 0) {
          if (resolvedDirection === "left-to-right") {
            const waveFront = wavePhase * 1.48 - 0.14;
            const swept = clamp(waveFront - p.textProgressX, 0, 1);
            const crest = smoothstep(0, 0.34, swept);
            perParticleHold = 1 - smoothstep(0.18, 0.65, swept);
            const windY = Math.sin(p.phase + wavePhase * 6 + p.textProgressX * 8) * 58;
            textX += crest * (170 + 135 * p.radialBias);
            textY += crest * windY - crest * 18 * Math.cos(p.phase);
          } else if (resolvedDirection === "right-to-left") {
            const waveFront = wavePhase * 1.48 - 0.14;
            const swept = clamp(waveFront - (1 - p.textProgressX), 0, 1);
            const crest = smoothstep(0, 0.34, swept);
            perParticleHold = 1 - smoothstep(0.18, 0.65, swept);
            const windY = Math.sin(p.phase + wavePhase * 6 + p.textProgressX * 8) * 58;
            textX -= crest * (170 + 135 * p.radialBias);
            textY += crest * windY - crest * 18 * Math.cos(p.phase);
          } else if (resolvedDirection === "ocean-wave") {
            const waveFront = wavePhase * 1.55 - 0.18;
            const behind = clamp(waveFront - p.textProgressX, 0, 1);
            const crest = smoothstep(0, 0.42, behind);
            perParticleHold = 1 - smoothstep(0.24, 0.72, behind);
            const ocean = Math.sin(p.textProgressX * 14 - simTime * 9.5 + p.phase * 0.35);
            textX += crest * (ocean * 42 + crest * 85 * Math.cos(p.phase));
            textY += crest * (ocean * 96 - crest * 64);
          } else {
            const distFromCenter = Math.abs(p.textProgressX - 0.5) * 2;
            const vortexProgress = clamp(wavePhase * 1.45 - (1 - distFromCenter) * 0.35, 0, 1);
            const burst = smoothstep(0, 0.55, vortexProgress);
            perParticleHold = 1 - smoothstep(0.22, 0.78, vortexProgress);
            const swirlAngle = p.phase + vortexProgress * 3.4;
            textX += Math.cos(swirlAngle) * burst * 140 * p.radialBias;
            textY += Math.sin(swirlAngle) * burst * 95 * p.radialBias;
          }
        }

        const effectiveLetterWeight = letterEnterStagger * Math.min(wordmarkFadeFallback, perParticleHold);
        const textMixWeight = p.role === "card" ? effectiveLetterWeight : effectiveLetterWeight * 0.42;

        standbyX = standbyX * (1 - textMixWeight) + textX * textMixWeight;
        standbyY = standbyY * (1 - textMixWeight) + textY * textMixWeight;

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

        const wordPull = p.role === "card" ? effectiveLetterWeight * standbyMix : effectiveLetterWeight * 0.3 * standbyMix;
        const stiffness = (0.036 + wordPull * 0.105 + formSurfaceWeight * 0.24) * dt * (0.75 + activeSettings.speed * 0.25);
        const damping = Math.exp(-(4.3 + wordPull * 2.8 + formSurfaceWeight * 6.5) * rawDtSec);

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

        if (lockSnapAssist > 0) {
          p.x += (uiTargetX - p.x) * lockSnapAssist;
          p.y += (uiTargetY - p.y) * lockSnapAssist;
        }

        if (p.role === "card") {
          cardDistSum += Math.hypot(uiTargetX - p.x, uiTargetY - p.y);
          cardDistCount += 1;
        }
      }

      const avgCardErr = cardDistCount > 0 ? cardDistSum / cardDistCount : 0;
      const settlementTarget = 1 - smoothstep(8, 72, avgCardErr);
      settledProgress += (settlementTarget - settledProgress) * (1 - Math.exp(-9 * rawDtSec));

      const effectiveReadiness = lockedRef.current
        ? Math.max(0.92, Math.min(cardFocus, settledProgress))
        : Math.min(cardFocus, settledProgress);
      const htmlClarity = smoothstep(0.76, 0.985, effectiveReadiness);

      const nextMaterialized = htmlClarity >= 0.88 || lockedRef.current;
      if (nextMaterialized !== lastMaterialized) {
        lastMaterialized = nextMaterialized;
        onMaterializedRef.current?.(nextMaterialized);
      }
      onClarityRef.current?.(lockedRef.current ? 1 : htmlClarity);

      ctx.clearRect(0, 0, w, h);

      const particleAlphaMaster = lockedRef.current ? 0 : 1 - htmlClarity;
      if (particleAlphaMaster <= 0.004) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (tierProfile.enableHalo) {
        const haloR = Math.max(cardWidth, cardHeight) * (0.72 + standbyMix * 0.38);
        const halo = ctx.createRadialGradient(cx, cy, 14, cx, cy, haloR);
        const powerDimFactor = 1 - clamp((darkness - 0.74) / 0.24, 0, 1);
        const innerR = Math.round(99 + (56 - 99) * darkness);
        const innerG = Math.round(102 + (189 - 102) * darkness);
        const innerB = Math.round(241 + (248 - 241) * darkness);
        const innerAlpha = (0.06 + darkness * 0.08) * particleAlphaMaster * powerDimFactor;
        const midR = Math.round(56 + (129 - 56) * darkness);
        const midG = Math.round(189 + (140 - 189) * darkness);
        const midB = 248;
        const midAlpha = (0.035 + darkness * 0.045) * particleAlphaMaster * powerDimFactor;
        const outerR = Math.round(255 * (1 - darkness) + 15 * darkness);
        const outerG = Math.round(255 * (1 - darkness) + 23 * darkness);
        const outerB = Math.round(255 * (1 - darkness) + 42 * darkness);

        halo.addColorStop(0, `rgba(${innerR}, ${innerG}, ${innerB}, ${innerAlpha.toFixed(4)})`);
        halo.addColorStop(0.55, `rgba(${midR}, ${midG}, ${midB}, ${midAlpha.toFixed(4)})`);
        halo.addColorStop(1, `rgba(${outerR}, ${outerG}, ${outerB}, 0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);
      }

      const wordmarkPresence = wordmarkPresenceGlobal * standbyMix;
      const wordmarkColorWeight = wordmarkPresenceGlobal * (1 - colorMorphToCard);
      const sizeScale = activeSettings.particleSize;
      const trailScale = tierProfile.enableTrails ? activeSettings.trailStrength : 0;
      const useRectShape = tierProfile.shape === "rect";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.densitySlot >= densityPct) continue;
        const speed = Math.hypot(p.x - p.prevX, p.y - p.prevY);

        const dynamicLetterRgb = activeLetterPalette[p.letterIndex] || p.rainbowRgb;
        const fromRgb: Rgb = p.role === "card" && wordmarkColorWeight > 0.22 ? dynamicLetterRgb : p.rainbowRgb;
        const targetUiRgb: Rgb = [
          Math.round(p.cardRgb[0] + (p.cardDarkRgb[0] - p.cardRgb[0]) * darkness),
          Math.round(p.cardRgb[1] + (p.cardDarkRgb[1] - p.cardRgb[1]) * darkness),
          Math.round(p.cardRgb[2] + (p.cardDarkRgb[2] - p.cardRgb[2]) * darkness),
        ];

        const alphaBase = p.baseAlpha * (1 - formSurfaceWeight) + p.cardAlpha * formSurfaceWeight;
        const dotAlpha = clamp(alphaBase * particleAlphaMaster * (0.94 + wordmarkPresence * 0.12), 0, 0.98);
        const radius =
          p.size * sizeScale * (1 - formSurfaceWeight) * (1 - wordmarkPresence * 0.16) +
          p.cardSize * formSurfaceWeight;

        const fillCss = mixCssRgb(fromRgb, targetUiRgb, colorMorphToCard, dotAlpha);

        if (trailScale > 0.05 && speed > 0.65 && speed < 140 && dotAlpha > 0.04 && formSurfaceWeight < 0.85) {
          const trailMult = 2.1 * trailScale;
          ctx.beginPath();
          ctx.moveTo(p.prevX - p.vx * trailMult, p.prevY - p.vy * trailMult);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = mixCssRgb(
            fromRgb,
            targetUiRgb,
            colorMorphToCard,
            dotAlpha * Math.min(0.55, 0.34 * trailScale) * (1 - formSurfaceWeight)
          );
          ctx.lineWidth = Math.max(0.8, p.size * sizeScale * 0.72);
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.fillStyle = fillCss;
        if (useRectShape) {
          const d = radius * 1.9;
          ctx.fillRect(p.x - radius, p.y - radius, d, d);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Live FPS Watchdog: monitor active visible frames and auto-downgrade before stutter hurts UX
      if (
        !disableDowngradeRef.current &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        frameDeltaMs > 0 &&
        frameDeltaMs < 180 &&
        particleAlphaMaster > 0.15
      ) {
        ewmaFrameMs = ewmaFrameMs * 0.88 + frameDeltaMs * 0.12;
        measuredFrames += 1;
        if (frameDeltaMs > 30) {
          slowFrameStreak += 1;
        } else {
          slowFrameStreak = Math.max(0, slowFrameStreak - 1);
        }

        if (
          measuredFrames >= 24 &&
          now - lastDowngradeAt > 2500 &&
          (ewmaFrameMs > 29 || slowFrameStreak >= 14)
        ) {
          const avgSample = ewmaFrameMs;
          const nextTier = downgradeTier(currentTier);
          tierRef.current = nextTier;
          ewmaFrameMs = 16.7;
          slowFrameStreak = 0;
          measuredFrames = 0;
          lastDowngradeAt = now;
          syncGeometry();
          const estFps = Math.max(1, Math.round(1000 / Math.max(1, avgSample)));
          const reason =
            nextTier === "locked"
              ? `Locked: Sustained low FPS (${estFps} fps) detected`
              : `Auto-adjusted to ${TIER_PROFILES[nextTier].label} (${estFps} fps)`;
          onTierAutoChangeRef.current?.(nextTier, reason, Number(avgSample.toFixed(1)));
          if (nextTier === "locked") {
            ctx.clearRect(0, 0, w, h);
            onClarityRef.current?.(1);
            onMaterializedRef.current?.(true);
            return;
          }
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      syncGeometryCallbackRef.current = null;
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, [containerRef, cardRef, headerRef, footerRef, performanceTier === "locked"]);

  return <canvas ref={canvasRef} className="login-particle-canvas" aria-hidden="true" />;
}

export default LoginParticleField;
