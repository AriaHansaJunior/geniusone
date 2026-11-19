export type Rgb = readonly [number, number, number];

export type ParticleDirectionMode =
  | "left-to-right"
  | "right-to-left"
  | "center-vortex"
  | "ocean-wave"
  | "auto";

export type LetterColorMode =
  | "static"
  | "cycle-shuffle"
  | "rgb-wave"
  | "breathing";

export type LoginThemeMode = "auto" | "light" | "dark";

export interface LoginParticleSettings {
  directionMode: ParticleDirectionMode;
  colorMode: LetterColorMode;
  letterColors: string[];
  speed: number;
  particleSize: number;
  trailStrength: number;
  turbulence: number;
}

export const WORDMARK_TEXT = "GeniusOne";
export const WORDMARK_LETTERS = ["G", "e", "n", "i", "u", "s", "O", "n", "e"] as const;

export const DEFAULT_LETTER_HEXES: string[] = [
  "#e11d48", // G - crimson rose
  "#ea580c", // e - orange
  "#d97706", // n - amber gold
  "#16a34a", // i - emerald
  "#0891b2", // u - cyan teal
  "#2563eb", // s - royal blue
  "#6d28d9", // O - violet
  "#9333ea", // n - purple
  "#db2777", // e - magenta pink
];

export const SIGNATURE_SWATCHES: string[] = [
  "#e11d48",
  "#f43f5e",
  "#fb923c",
  "#f59e0b",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#0ea5e9",
  "#2563eb",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
];

export const RGB_PRESETS: Array<{
  id: string;
  label: string;
  colors: string[];
}> = [
  {
    id: "rainbow",
    label: "Prism Rainbow",
    colors: DEFAULT_LETTER_HEXES,
  },
  {
    id: "cyber-neon",
    label: "Cyber Neon",
    colors: ["#ff007f", "#ff2a85", "#c026d3", "#7c3aed", "#2563eb", "#06b6d4", "#22d3ee", "#00f5d4", "#f72585"],
  },
  {
    id: "ocean-ice",
    label: "Ocean Ice",
    colors: ["#0369a1", "#0284c7", "#0ea5e9", "#06b6d4", "#14b8a6", "#2dd4bf", "#38bdf8", "#6366f1", "#4f46e5"],
  },
  {
    id: "sunset-fire",
    label: "Sunset Flame",
    colors: ["#dc2626", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#f97316", "#ec4899", "#db2777", "#be123c"],
  },
  {
    id: "emerald-matrix",
    label: "Emerald Matrix",
    colors: ["#14532d", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#10b981", "#059669", "#14b8a6", "#0d9488"],
  },
];

export const DEFAULT_PARTICLE_SETTINGS: LoginParticleSettings = {
  directionMode: "left-to-right",
  colorMode: "cycle-shuffle",
  letterColors: [...DEFAULT_LETTER_HEXES],
  speed: 1.0,
  particleSize: 1.0,
  trailStrength: 1.0,
  turbulence: 1.0,
};

const STUDIO_STORAGE_KEY = "geniusone_login_particle_studio_v1";
const LOGIN_DARK_MODE_KEY = "geniusone_login_dark_mode";
const LOGIN_THEME_MODE_KEY = "geniusone_login_theme_mode_v2";
const LOGIN_MANUAL_DARK_KEY = "geniusone_login_manual_dark_v3";

export function normalizeHex(input: string, fallback = "#2563eb"): string {
  const clean = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean.toLowerCase()}`;
  return fallback;
}

export function loadParticleSettings(): LoginParticleSettings {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_PARTICLE_SETTINGS,
      letterColors: [...DEFAULT_LETTER_HEXES],
    };
  }
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PARTICLE_SETTINGS,
        letterColors: [...DEFAULT_LETTER_HEXES],
      };
    }
    const parsed = JSON.parse(raw);
    const colors = Array.isArray(parsed.letterColors) && parsed.letterColors.length >= WORDMARK_LETTERS.length
      ? parsed.letterColors
          .slice(0, WORDMARK_LETTERS.length)
          .map((c: unknown, idx: number) =>
            typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)
              ? c.toLowerCase()
              : DEFAULT_LETTER_HEXES[idx]
          )
      : [...DEFAULT_LETTER_HEXES];

    return {
      directionMode: parsed.directionMode || DEFAULT_PARTICLE_SETTINGS.directionMode,
      colorMode: parsed.colorMode || DEFAULT_PARTICLE_SETTINGS.colorMode,
      letterColors: colors,
      speed: typeof parsed.speed === "number" ? Math.min(2.5, Math.max(0.5, parsed.speed)) : 1.0,
      particleSize: typeof parsed.particleSize === "number" ? Math.min(1.8, Math.max(0.6, parsed.particleSize)) : 1.0,
      trailStrength: typeof parsed.trailStrength === "number" ? Math.min(1.6, Math.max(0, parsed.trailStrength)) : 1.0,
      turbulence: typeof parsed.turbulence === "number" ? Math.min(2.0, Math.max(0.3, parsed.turbulence)) : 1.0,
    };
  } catch {
    return {
      ...DEFAULT_PARTICLE_SETTINGS,
      letterColors: [...DEFAULT_LETTER_HEXES],
    };
  }
}

export function saveParticleSettings(settings: LoginParticleSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage write errors
  }
}

export function loadLoginManualDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LOGIN_MANUAL_DARK_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveLoginManualDark(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOGIN_MANUAL_DARK_KEY, String(enabled));
  } catch {
    // ignore storage write errors
  }
}

export function applyLoginDarknessVars(
  el: HTMLElement | null,
  darkness: number,
  controlsOpacity = 1
): void {
  if (!el) return;
  const d = Math.max(0, Math.min(1, darkness));
  const darkBg = Math.max(0, Math.min(1, d / 0.72));
  const oledBg = Math.max(0, Math.min(1, (d - 0.68) / 0.32));
  const ctrl = Math.max(0, Math.min(1, controlsOpacity));
  el.style.setProperty("--login-darkness", d.toFixed(3));
  el.style.setProperty("--login-dark-bg", darkBg.toFixed(3));
  el.style.setProperty("--login-oled-bg", oledBg.toFixed(3));
  el.style.setProperty("--login-controls-opacity", ctrl.toFixed(3));
}

export function loadLoginThemeMode(): LoginThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(LOGIN_THEME_MODE_KEY);
    if (raw === "auto" || raw === "light" || raw === "dark") {
      return raw;
    }
    return "auto";
  } catch {
    return "auto";
  }
}

export function saveLoginThemeMode(mode: LoginThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOGIN_THEME_MODE_KEY, mode);
    localStorage.setItem(LOGIN_DARK_MODE_KEY, String(mode === "dark"));
  } catch {
    // ignore storage write errors
  }
}

export function loadLoginDarkMode(): boolean {
  return loadLoginThemeMode() === "dark";
}

export function saveLoginDarkMode(enabled: boolean): void {
  saveLoginThemeMode(enabled ? "dark" : "light");
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return [37, 99, 235];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return [37, 99, 235];
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hsvToRgb(hDeg: number, sNorm: number, vNorm: number): Rgb {
  const h = ((hDeg % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, sNorm));
  const v = Math.max(0, Math.min(1, vNorm));
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const [rRaw, gRaw, bRaw] = hexToRgb(hex);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return {
    h,
    s: max === 0 ? 0 : d / max,
    v: max,
  };
}

export function hslToRgb(hDeg: number, sPct = 84, lPct = 52): Rgb {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = sPct / 100;
  const l = lPct / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return [val, val, val];
  }

  const hue2rgb = (p: number, q: number, tInput: number) => {
    let t = tInput;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function shiftRgbHue(rgb: Rgb, shiftDeg: number): Rgb {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return hslToRgb(h + shiftDeg, Math.round(s * 100), Math.round(l * 100));
}

export function interpolateGradientHexes(startHex: string, endHex: string, count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return [normalizeHex(startHex)];
  const a = hexToRgb(startHex);
  const b = hexToRgb(endHex);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push(
      rgbToHex(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
      )
    );
  }
  return out;
}
