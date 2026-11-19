import React, { useEffect, useRef, useState } from "react";
import {
  DEFAULT_LETTER_HEXES,
  SIGNATURE_SWATCHES,
  WORDMARK_LETTERS,
  hexToHsv,
  hexToRgb,
  hslToRgb,
  hsvToRgb,
  interpolateGradientHexes,
  normalizeHex,
  rgbToHex,
} from "./loginParticleConfig";

interface SignatureColorStudioProps {
  letterColors: string[];
  onChangeLetterColor: (index: number, hex: string) => void;
  onReplaceAllColors: (colors: string[]) => void;
}

function ColorSwatchCanvas({ hex }: { hex: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = normalizeHex(hex);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [hex]);

  return (
    <canvas
      ref={ref}
      width={64}
      height={16}
      className="lps-keycap__bar"
      aria-hidden="true"
    />
  );
}

export function SignatureColorStudio({
  letterColors,
  onChangeLetterColor,
  onReplaceAllColors,
}: SignatureColorStudioProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const safeIdx = Math.min(selectedIndex, WORDMARK_LETTERS.length - 1);
  const activeHex = normalizeHex(
    letterColors[safeIdx] || DEFAULT_LETTER_HEXES[safeIdx]
  );

  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => hexToHsv(activeHex));
  const [hexDraft, setHexDraft] = useState<string>(activeHex.toUpperCase());

  const padCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hueCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingPadRef = useRef<boolean>(false);
  const draggingHueRef = useRef<boolean>(false);

  useEffect(() => {
    const parsed = hexToHsv(activeHex);
    setHsv((prev) => ({
      h: parsed.s > 0.02 ? parsed.h : prev.h,
      s: parsed.s,
      v: parsed.v,
    }));
    setHexDraft(activeHex.toUpperCase());
  }, [activeHex, safeIdx]);

  useEffect(() => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const [hr, hg, hb] = hsvToRgb(hsv.h, 1, 1);

    ctx.fillStyle = `rgb(${hr},${hg},${hb})`;
    ctx.fillRect(0, 0, w, h);

    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);

    const rx = hsv.s * w;
    const ry = (1 - hsv.v) * h;
    ctx.beginPath();
    ctx.arc(rx, ry, 7, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx, ry, 8.5, 0, Math.PI * 2);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(15,23,42,0.72)";
    ctx.stroke();
  }, [hsv]);

  useEffect(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#ff0000");
    grad.addColorStop(0.17, "#ffff00");
    grad.addColorStop(0.33, "#00ff00");
    grad.addColorStop(0.5, "#00ffff");
    grad.addColorStop(0.67, "#0000ff");
    grad.addColorStop(0.83, "#ff00ff");
    grad.addColorStop(1, "#ff0000");

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const hx = (hsv.h / 360) * w;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(15,23,42,0.85)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(Math.max(1, Math.min(w - 7, hx - 3)), 1, 6, h - 2);
    ctx.strokeRect(Math.max(1, Math.min(w - 7, hx - 3)), 1, 6, h - 2);
  }, [hsv.h]);

  const commitHsv = (nextHsv: { h: number; s: number; v: number }) => {
    setHsv(nextHsv);
    const [r, g, b] = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const nextHex = rgbToHex(r, g, b);
    setHexDraft(nextHex.toUpperCase());
    onChangeLetterColor(safeIdx, nextHex);
  };

  const pickPadFromPointer = (clientX: number, clientY: number) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / Math.max(1, rect.height)));
    commitHsv({ h: hsv.h, s, v });
  };

  const pickHueFromPointer = (clientX: number) => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    commitHsv({ h: ratio * 360, s: hsv.s, v: hsv.v });
  };

  const handleApplyTwinGradient = () => {
    const first = letterColors[0] || DEFAULT_LETTER_HEXES[0];
    const last = letterColors[WORDMARK_LETTERS.length - 1] || DEFAULT_LETTER_HEXES[WORDMARK_LETTERS.length - 1];
    onReplaceAllColors(interpolateGradientHexes(first, last, WORDMARK_LETTERS.length));
  };

  const handleApplySpectrumSweep = () => {
    const count = WORDMARK_LETTERS.length;
    const startHue = hsv.h;
    const generated = Array.from({ length: count }, (_, idx) => {
      const hue = startHue + (idx / Math.max(1, count - 1)) * 285;
      const [r, g, b] = hslToRgb(hue, 88, 54);
      return rgbToHex(r, g, b);
    });
    onReplaceAllColors(generated);
  };

  const [rgbR, rgbG, rgbB] = hexToRgb(activeHex);

  return (
    <div className="lps-color-studio">
      {/* 9-Key RGB Strip for GeniusOne */}
      <div className="lps-keycap-strip">
        {WORDMARK_LETTERS.map((ch, idx) => {
          const tileHex = normalizeHex(
            letterColors[idx] || DEFAULT_LETTER_HEXES[idx]
          );
          return (
            <button
              key={`${ch}-${idx}`}
              type="button"
              className={`lps-keycap ${idx === safeIdx ? "is-selected" : ""}`}
              onClick={() => setSelectedIndex(idx)}
              title={`Edit color for "${ch}" (#${idx + 1})`}
            >
              <span className="lps-keycap__char">{ch}</span>
              <ColorSwatchCanvas hex={tileHex} />
            </button>
          );
        })}
      </div>

      {/* 2D Saturation x Value Canvas */}
      <canvas
        ref={padCanvasRef}
        width={320}
        height={132}
        className="lps-color-pad"
        onPointerDown={(e) => {
          draggingPadRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pickPadFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingPadRef.current) {
            pickPadFromPointer(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          draggingPadRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          draggingPadRef.current = false;
        }}
      />

      {/* Rainbow Hue Bar Canvas */}
      <canvas
        ref={hueCanvasRef}
        width={320}
        height={16}
        className="lps-hue-bar"
        onPointerDown={(e) => {
          draggingHueRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pickHueFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingHueRef.current) {
            pickHueFromPointer(e.clientX);
          }
        }}
        onPointerUp={(e) => {
          draggingHueRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          draggingHueRef.current = false;
        }}
      />

      {/* Selected Key Readout + Hex Editor */}
      <div className="lps-color-readout">
        <div className="lps-color-readout__badge">
          <ColorSwatchCanvas hex={activeHex} />
          <span className="lps-color-readout__rgb">
            Key #{safeIdx + 1} ({WORDMARK_LETTERS[safeIdx]}) · RGB({rgbR}, {rgbG}, {rgbB})
          </span>
        </div>

        <input
          type="text"
          maxLength={7}
          value={hexDraft}
          onChange={(e) => {
            const val = e.target.value;
            setHexDraft(val);
            const clean = val.trim().replace(/^#/, "");
            if (/^[0-9a-fA-F]{6}$/.test(clean)) {
              onChangeLetterColor(safeIdx, `#${clean.toLowerCase()}`);
            }
          }}
          className="lps-hex-input"
          aria-label="Hex color code"
          placeholder="#E11D48"
        />
      </div>

      {/* Curated Swatches (2 neat rows of 6) */}
      <div className="lps-swatch-grid">
        {SIGNATURE_SWATCHES.map((swatchHex) => (
          <button
            key={swatchHex}
            type="button"
            className={`lps-swatch-btn ${
              activeHex.toLowerCase() === swatchHex.toLowerCase() ? "is-active" : ""
            }`}
            onClick={() => onChangeLetterColor(safeIdx, swatchHex)}
            title={`Apply ${swatchHex}`}
            aria-label={`Apply color ${swatchHex}`}
          >
            <ColorSwatchCanvas hex={swatchHex} />
          </button>
        ))}
      </div>

      {/* Gradient Generators */}
      <div className="login-rgb-pills login-rgb-pills--2col">
        <button
          type="button"
          className="login-rgb-pill"
          onClick={handleApplyTwinGradient}
        >
          Twin-Color Blend
        </button>
        <button
          type="button"
          className="login-rgb-pill"
          onClick={handleApplySpectrumSweep}
        >
          Spectrum Spread
        </button>
      </div>
    </div>
  );
}
