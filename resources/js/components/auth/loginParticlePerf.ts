export type ParticlePerformanceTier = "high" | "balanced" | "lite" | "locked";

export interface ParticleTierProfile {
  tier: ParticlePerformanceTier;
  label: string;
  density: number;
  maxDpr: number;
  enableTrails: boolean;
  enableHalo: boolean;
  shape: "arc" | "rect" | "none";
}

export interface ParticlePerfAssessment {
  tier: ParticlePerformanceTier;
  source: "query" | "preflight" | "stress-test" | "watchdog" | "cache";
  scoreMs: number;
  reason: string;
  hardwareCores: number;
  deviceMemoryGb: number | null;
  checkedAt: number;
}

export const TIER_PROFILES: Record<ParticlePerformanceTier, ParticleTierProfile> = {
  high: {
    tier: "high",
    label: "High (100%)",
    density: 1.0,
    maxDpr: 2,
    enableTrails: true,
    enableHalo: true,
    shape: "arc",
  },
  balanced: {
    tier: "balanced",
    label: "Balanced (52%)",
    density: 0.52,
    maxDpr: 1.25,
    enableTrails: false,
    enableHalo: true,
    shape: "arc",
  },
  lite: {
    tier: "lite",
    label: "Lite (26%)",
    density: 0.26,
    maxDpr: 1,
    enableTrails: false,
    enableHalo: false,
    shape: "rect",
  },
  locked: {
    tier: "locked",
    label: "Locked (Static)",
    density: 0,
    maxDpr: 1,
    enableTrails: false,
    enableHalo: false,
    shape: "none",
  },
};

const PERF_CACHE_STORAGE_KEY = "geniusone_login_particle_perf_v2";
const PERF_CACHE_TTL_MS = 30 * 60 * 1000;

export function downgradeTier(tier: ParticlePerformanceTier): ParticlePerformanceTier {
  if (tier === "high") return "balanced";
  if (tier === "balanced") return "lite";
  return "locked";
}

export function shouldRenderParticleAtIndex(index: number, density: number): boolean {
  if (density >= 0.999) return true;
  if (density <= 0.001) return false;
  const threshold = Math.round(density * 100);
  // Multiplicative hash gives uniform spatial thinning without directional bias
  const hash = ((index * 2654435761) >>> 0) % 100;
  return hash < threshold;
}

export function readPerfQueryOverride(): {
  tier: ParticlePerformanceTier | null;
  forceRetest: boolean;
} {
  if (typeof window === "undefined") {
    return { tier: null, forceRetest: false };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("perf") || "").trim().toLowerCase();
    if (raw === "high") return { tier: "high", forceRetest: false };
    if (raw === "balanced" || raw === "mid") return { tier: "balanced", forceRetest: false };
    if (raw === "lite" || raw === "low") return { tier: "lite", forceRetest: false };
    if (raw === "lock" || raw === "locked" || raw === "off") {
      return { tier: "locked", forceRetest: false };
    }
    if (raw === "retest" || raw === "auto") {
      return { tier: null, forceRetest: true };
    }
  } catch {
    // ignore URL parse issues
  }
  return { tier: null, forceRetest: false };
}

export function loadCachedPerfAssessment(): ParticlePerfAssessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PERF_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParticlePerfAssessment>;
    if (!parsed || typeof parsed.tier !== "string") return null;
    if (!(parsed.tier in TIER_PROFILES)) return null;
    if (typeof parsed.checkedAt !== "number" || Date.now() - parsed.checkedAt > PERF_CACHE_TTL_MS) {
      return null;
    }
    return {
      tier: parsed.tier as ParticlePerformanceTier,
      source: "cache",
      scoreMs: typeof parsed.scoreMs === "number" ? parsed.scoreMs : 0,
      reason: typeof parsed.reason === "string" ? parsed.reason : "Cached device capability",
      hardwareCores: typeof parsed.hardwareCores === "number" ? parsed.hardwareCores : 4,
      deviceMemoryGb: typeof parsed.deviceMemoryGb === "number" ? parsed.deviceMemoryGb : null,
      checkedAt: parsed.checkedAt,
    };
  } catch {
    return null;
  }
}

export function savePerfAssessment(assessment: ParticlePerfAssessment): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PERF_CACHE_STORAGE_KEY, JSON.stringify(assessment));
  } catch {
    // ignore storage write failures
  }
}

export function clearCachedPerfAssessment(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PERF_CACHE_STORAGE_KEY);
  } catch {
    // ignore storage delete failures
  }
}

function readHardwareCapabilities(): {
  cores: number;
  memoryGb: number | null;
  reducedMotion: boolean;
  saveData: boolean;
} {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { cores: 4, memoryGb: null, reducedMotion: false, saveData: false };
  }
  const navAny = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    cores: typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4,
    memoryGb: typeof navAny.deviceMemory === "number" ? navAny.deviceMemory : null,
    reducedMotion: Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches),
    saveData: Boolean(navAny.connection?.saveData),
  };
}

/**
 * Runs a fast bounded offscreen stress test (~15-75ms) simulating real particle math + Canvas 2D draws.
 * Exits early if a single batch already exceeds the slow threshold so weak laptops never hang.
 */
export function runQuickParticleStressTest(options?: {
  ignoreCache?: boolean;
}): ParticlePerfAssessment {
  const { tier: queryTier, forceRetest } = readPerfQueryOverride();
  const hw = readHardwareCapabilities();

  if (queryTier) {
    return {
      tier: queryTier,
      source: "query",
      scoreMs: queryTier === "high" ? 4.2 : queryTier === "balanced" ? 12.4 : queryTier === "lite" ? 21.0 : 34.0,
      reason: `Simulated via ?perf=${queryTier}`,
      hardwareCores: hw.cores,
      deviceMemoryGb: hw.memoryGb,
      checkedAt: Date.now(),
    };
  }

  if (hw.reducedMotion) {
    return {
      tier: "locked",
      source: "preflight",
      scoreMs: 0,
      reason: "Locked: System reduced-motion preference is active",
      hardwareCores: hw.cores,
      deviceMemoryGb: hw.memoryGb,
      checkedAt: Date.now(),
    };
  }

  if (!options?.ignoreCache && !forceRetest) {
    const cached = loadCachedPerfAssessment();
    if (cached) return cached;
  }

  if (typeof document === "undefined") {
    return {
      tier: "high",
      source: "preflight",
      scoreMs: 5,
      reason: "Server context fallback",
      hardwareCores: hw.cores,
      deviceMemoryGb: hw.memoryGb,
      checkedAt: Date.now(),
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const lockedResult: ParticlePerfAssessment = {
      tier: "locked",
      source: "preflight",
      scoreMs: 99,
      reason: "Locked: Canvas 2D acceleration unavailable",
      hardwareCores: hw.cores,
      deviceMemoryGb: hw.memoryGb,
      checkedAt: Date.now(),
    };
    savePerfAssessment(lockedResult);
    return lockedResult;
  }

  // Tiny unmeasured warmup so initial Skia canvas allocation does not skew pass 0
  for (let w = 0; w < 60; w++) {
    ctx.beginPath();
    ctx.arc(40 + w * 4, 40, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(99,102,241,0.5)";
    ctx.fill();
  }

  // Simulate 1,800 particles/frame across up to 3 bounded probe passes.
  // Scale factor matches ~2,165 stage particles with trails + trig math.
  const SAMPLE_PARTICLES = 900;
  const SCALE_TO_FULL_FRAME = 2.4;
  const passCosts: number[] = [];

  for (let pass = 0; pass < 3; pass++) {
    const t0 = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createRadialGradient(320, 180, 12, 320, 180, 260);
    grad.addColorStop(0, "rgba(56, 189, 248, 0.14)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let accX = 0;
    for (let i = 0; i < SAMPLE_PARTICLES; i++) {
      const a = pass * 0.4 + i * 0.017;
      const px = 320 + Math.cos(a) * 180 + Math.sin(a * 1.7) * 24;
      const py = 180 + Math.sin(a) * 110 + Math.cos(a * 1.3) * 18;
      accX += Math.hypot(px - 320, py - 180) * 0.0001;

      if ((i & 1) === 0) {
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 2);
        ctx.lineTo(px, py);
        ctx.strokeStyle = `rgba(59,130,246,${0.28 + (i % 5) * 0.05})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px + accX * 0.001, py, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${0.55 + (i % 4) * 0.1})`;
      ctx.fill();
    }

    const passElapsed = performance.now() - t0;
    passCosts.push(passElapsed * SCALE_TO_FULL_FRAME);

    // Early bailout only if device is severely slow (>70ms for a single half-frame probe)
    if (passElapsed > 70) {
      break;
    }
  }

  // Use median (or max if early bailout) to discard single JIT outlier while catching sustained lag
  const sorted = [...passCosts].sort((a, b) => a - b);
  const measuredMs =
    passCosts.length === 1
      ? passCosts[0]
      : sorted[Math.floor(sorted.length / 2)];

  let tier: ParticlePerformanceTier = "high";
  let reason = `Stress test passed (${measuredMs.toFixed(1)} ms/frame eq.)`;

  if (measuredMs > 26 || (hw.cores <= 2 && measuredMs > 18)) {
    tier = "locked";
    reason = `Locked: Device stress test too slow (${measuredMs.toFixed(1)} ms/frame eq.)`;
  } else if (measuredMs > 16.5 || hw.saveData || (hw.memoryGb !== null && hw.memoryGb <= 2)) {
    tier = "lite";
    reason = hw.saveData
      ? "Lite mode: Data Saver enabled"
      : `Lite mode: Constrained hardware (${measuredMs.toFixed(1)} ms/frame eq.)`;
  } else if (measuredMs > 9.5 || hw.cores <= 2) {
    tier = "balanced";
    reason = `Balanced mode: Adaptive density (${measuredMs.toFixed(1)} ms/frame eq.)`;
  }

  const assessment: ParticlePerfAssessment = {
    tier,
    source: "stress-test",
    scoreMs: Number(measuredMs.toFixed(2)),
    reason,
    hardwareCores: hw.cores,
    deviceMemoryGb: hw.memoryGb,
    checkedAt: Date.now(),
  };

  savePerfAssessment(assessment);
  return assessment;
}
