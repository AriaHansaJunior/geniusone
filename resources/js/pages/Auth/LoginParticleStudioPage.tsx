import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { LoginParticleField } from "../../components/auth/LoginParticleField";
import { SignatureColorStudio } from "../../components/auth/SignatureColorStudio";
import {
  DEFAULT_LETTER_HEXES,
  DEFAULT_PARTICLE_SETTINGS,
  RGB_PRESETS,
  WORDMARK_LETTERS,
  applyLoginDarknessVars,
  loadLoginThemeMode,
  loadParticleSettings,
  saveLoginThemeMode,
  saveParticleSettings,
  type LetterColorMode,
  type LoginParticleSettings,
  type LoginThemeMode,
  type ParticleDirectionMode,
} from "../../components/auth/loginParticleConfig";
import {
  TIER_PROFILES,
  clearCachedPerfAssessment,
  loadCachedPerfAssessment,
  runQuickParticleStressTest,
  type ParticlePerfAssessment,
  type ParticlePerformanceTier,
} from "../../components/auth/loginParticlePerf";

interface LoginParticleStudioPageProps {
  onBackToLogin: () => void;
}

const DIRECTION_OPTIONS: Array<{ id: ParticleDirectionMode; label: string }> = [
  { id: "left-to-right", label: "Left to Right" },
  { id: "right-to-left", label: "Right to Left" },
  { id: "center-vortex", label: "Center Vortex" },
  { id: "ocean-wave", label: "Ocean Wave" },
  { id: "auto", label: "Auto Cycle" },
];

const COLOR_MODE_OPTIONS: Array<{ id: LetterColorMode; label: string }> = [
  { id: "cycle-shuffle", label: "Cycle Shift" },
  { id: "rgb-wave", label: "RGB Wave" },
  { id: "breathing", label: "Prism Breathe" },
  { id: "static", label: "Static Custom" },
];

const TIER_SIM_OPTIONS: Array<{ id: "auto" | ParticlePerformanceTier; label: string }> = [
  { id: "auto", label: "Auto Detect" },
  { id: "high", label: "High" },
  { id: "balanced", label: "Balanced" },
  { id: "lite", label: "Lite" },
  { id: "locked", label: "Sim Lock" },
];

const THEME_MODE_OPTIONS: Array<{ id: LoginThemeMode; label: string }> = [
  { id: "auto", label: "Auto Ambient" },
  { id: "light", label: "Light Mode" },
  { id: "dark", label: "Dark Mode" },
];

export function LoginParticleStudioPage({
  onBackToLogin,
}: LoginParticleStudioPageProps) {
  const [themeMode, setThemeMode] = useState<LoginThemeMode>(loadLoginThemeMode);
  const [previewDarkUi, setPreviewDarkUi] = useState<boolean>(() => loadLoginThemeMode() !== "light");
  const [settings, setSettings] = useState<LoginParticleSettings>(loadParticleSettings);
  const [previewRevealCard, setPreviewRevealCard] = useState<boolean>(false);
  const [isMaterialized, setIsMaterialized] = useState<boolean>(false);
  const [replaySignal, setReplaySignal] = useState<number>(0);
  const [simMode, setSimMode] = useState<"auto" | ParticlePerformanceTier>("auto");
  const [perfAssessment, setPerfAssessment] = useState<ParticlePerfAssessment | null>(
    () => loadCachedPerfAssessment()
  );

  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const previewHeaderRef = useRef<HTMLDivElement | null>(null);
  const previewCardRef = useRef<HTMLDivElement | null>(null);
  const previewFooterRef = useRef<HTMLDivElement | null>(null);

  const isStudioDarkChrome = themeMode !== "light";

  useEffect(() => {
    saveParticleSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLoginThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (perfAssessment) return;
    let cancelled = false;
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      setPerfAssessment(runQuickParticleStressTest());
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [perfAssessment]);

  const effectiveTier: ParticlePerformanceTier =
    simMode === "auto" ? perfAssessment?.tier ?? "high" : simMode;
  const effectiveProfile = TIER_PROFILES[effectiveTier];
  const isLockedPreview = effectiveTier === "locked";

  useEffect(() => {
    if (!previewViewportRef.current) return;
    if (isLockedPreview) {
      const pinnedDark = themeMode === "dark";
      setPreviewDarkUi(pinnedDark);
      applyLoginDarknessVars(previewViewportRef.current, pinnedDark ? 0.85 : 0);
    } else if (themeMode === "light") {
      setPreviewDarkUi(false);
      applyLoginDarknessVars(previewViewportRef.current, 0);
    } else if (themeMode === "dark") {
      setPreviewDarkUi(true);
      applyLoginDarknessVars(previewViewportRef.current, 0.85);
    } else {
      setPreviewDarkUi(true);
      applyLoginDarknessVars(previewViewportRef.current, 0.78);
    }
  }, [isLockedPreview, themeMode]);

  const handleRunStressTest = useCallback(() => {
    clearCachedPerfAssessment();
    const fresh = runQuickParticleStressTest({ ignoreCache: true });
    setPerfAssessment(fresh);
    setSimMode("auto");
    setReplaySignal((s) => s + 1);
  }, []);

  const handleStudioTierAutoChange = useCallback(
    (nextTier: ParticlePerformanceTier, reason: string, avgFrameMs: number) => {
      setPerfAssessment((prev) => ({
        tier: nextTier,
        source: "watchdog",
        scoreMs: avgFrameMs,
        reason,
        hardwareCores: prev?.hardwareCores ?? 4,
        deviceMemoryGb: prev?.deviceMemoryGb ?? null,
        checkedAt: Date.now(),
      }));
    },
    []
  );

  const handleCycleThemeMode = useCallback(() => {
    setThemeMode((prev) => (prev === "auto" ? "light" : prev === "light" ? "dark" : "auto"));
  }, []);

  const handleClarityChange = useCallback((clarity: number) => {
    if (previewViewportRef.current) {
      previewViewportRef.current.style.setProperty("--login-clarity", clarity.toFixed(3));
    }
  }, []);

  const handlePreviewDarknessChange = useCallback((darkness: number) => {
    applyLoginDarknessVars(previewViewportRef.current, darkness);
  }, []);

  const handleLetterColorChange = (charIdx: number, hex: string) => {
    setSettings((prev) => {
      const nextColors = Array.from({ length: WORDMARK_LETTERS.length }, (_, i) =>
        prev.letterColors[i] || DEFAULT_LETTER_HEXES[i]
      );
      nextColors[charIdx] = hex;
      return {
        ...prev,
        letterColors: nextColors,
      };
    });
  };

  const handleReplaceAllColors = (colors: string[]) => {
    setSettings((prev) => ({
      ...prev,
      letterColors: colors.slice(0, WORDMARK_LETTERS.length),
    }));
  };

  return (
    <div className={`lps-page ${isStudioDarkChrome ? "login-page--dark lps-page--dark" : ""}`}>
      {/* Studio Top Bar */}
      <header className="lps-topbar">
        <div className="lps-topbar__brand">
          <div className="brand__mark">
            <span />
            <span />
            <span />
          </div>
          <div className="lps-topbar__titles">
            <span className="lps-topbar__eyebrow">GENIUSONE SECRET STUDIO</span>
            <h1 className="lps-topbar__heading">RGB Particle &amp; Login Theme Studio</h1>
          </div>
        </div>

        <div className="lps-topbar__actions">
          <button
            type="button"
            className="login-theme-toggle"
            onClick={handleCycleThemeMode}
            title={
              themeMode === "auto"
                ? "Theme: Auto Ambient (Idle Dark -> Active Light) — click to switch"
                : themeMode === "light"
                  ? "Theme: Pinned Light — click for Dark"
                  : "Theme: Pinned Dark — click for Auto Ambient"
            }
            aria-label="Cycle Login Theme Mode"
            aria-pressed={isStudioDarkChrome}
          >
            <Icon name={isStudioDarkChrome ? "sun" : "moon"} size={15} />
          </button>

          <button
            type="button"
            className="lps-back-btn"
            onClick={onBackToLogin}
          >
            Back to Login
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="lps-workspace">
        {/* Left: Framed Live Preview Window */}
        <section className="lps-preview-shell" aria-label="Live Login Particle Preview Window">
          <div className="lps-preview-window">
            <div className="lps-window-chrome">
              <div className="lps-window-chrome__left">
                <div className="lps-window-dots" aria-hidden="true">
                  <span className="lps-dot lps-dot--red" />
                  <span className="lps-dot lps-dot--amber" />
                  <span className="lps-dot lps-dot--green" />
                </div>
                <span className="lps-window-title">Live Preview · GeniusOne</span>
              </div>

              <div className="lps-window-controls">
                <button
                  type="button"
                  className={`lps-win-btn ${!previewRevealCard ? "is-active" : ""}`}
                  onClick={() => setPreviewRevealCard(false)}
                >
                  Text Stage
                </button>
                <button
                  type="button"
                  className={`lps-win-btn ${previewRevealCard ? "is-active" : ""}`}
                  onClick={() => setPreviewRevealCard(true)}
                >
                  Card Reveal
                </button>
                <button
                  type="button"
                  className="lps-win-btn lps-win-btn--accent"
                  onClick={() => {
                    setPreviewRevealCard(false);
                    setReplaySignal((s) => s + 1);
                  }}
                >
                  Replay
                </button>
              </div>
            </div>

            <div
              ref={previewViewportRef}
              className={`lps-preview-viewport login-page ${
                previewDarkUi ? "login-page--dark" : ""
              } ${
                isLockedPreview
                  ? "login-page--static"
                  : isMaterialized || previewRevealCard
                    ? "login-page--particle-show login-page--materialized"
                    : "login-page--particle-show login-page--standby"
              }`}
            >
              {!isLockedPreview && (
                <LoginParticleField
                  containerRef={previewViewportRef}
                  cardRef={previewCardRef}
                  headerRef={previewHeaderRef}
                  footerRef={previewFooterRef}
                  lockedActive={previewRevealCard}
                  wakeSignal={0}
                  replaySignal={replaySignal}
                  themeMode={themeMode}
                  settings={settings}
                  performanceTier={effectiveTier}
                  disableAutoDowngrade={simMode !== "auto"}
                  onTierAutoChange={handleStudioTierAutoChange}
                  onClarityChange={handleClarityChange}
                  onMaterializedChange={setIsMaterialized}
                  onDarknessChange={handlePreviewDarknessChange}
                  onDarkUiChange={setPreviewDarkUi}
                />
              )}

              {/* Scaled Preview Header */}
              <div ref={previewHeaderRef} className="login-header lps-mini-header">
                <div className="login-header__brand">
                  <div className="brand__mark">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="brand__text">
                    <strong>GENIUSONE</strong>
                    <span>Enterprise Operations</span>
                  </div>
                </div>
                <div className="login-header__badge">
                  <span>PT GENIUS ONE</span>
                </div>
              </div>

              {/* Authentic Login Card Preview */}
              <div className="lps-mini-main">
                <div
                  ref={previewCardRef}
                  className={`login-card lps-preview-card ${
                    isLockedPreview || isMaterialized || previewRevealCard
                      ? "login-card--materialized"
                      : "login-card--standby"
                  }`}
                >
                  <div className="login-card__accent" />

                  <div className="login-card__content">
                    <div className="login-card__header">
                      <span className="login-card__eyebrow">ENTERPRISE PORTAL</span>
                      <h2 className="login-card__title">Sign In to GeniusOne</h2>
                      <p className="login-card__subtitle">
                        Enter your operational credentials to authenticate against the enterprise governance system.
                      </p>
                    </div>

                    <div className="login-form">
                      <div className="form-group">
                        <label htmlFor="lps-preview-username">
                          Username or Email <span className="required-mark">*</span>
                        </label>
                        <div className="input-with-icon">
                          <Icon name="user" size={16} className="input-icon" />
                          <input
                            id="lps-preview-username"
                            type="text"
                            className="form-input form-input--icon-left"
                            placeholder="Enter username or email"
                            readOnly
                            tabIndex={-1}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <div className="form-group__label-row">
                          <label htmlFor="lps-preview-password">
                            Password <span className="required-mark">*</span>
                          </label>
                          <span className="login-forgot-link">Forgot password?</span>
                        </div>
                        <div className="input-with-icon">
                          <Icon name="lock" size={16} className="input-icon" />
                          <input
                            id="lps-preview-password"
                            type="password"
                            className="form-input form-input--icon-left form-input--icon-right"
                            placeholder="Enter your password"
                            readOnly
                            tabIndex={-1}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            aria-label="Show password preview"
                            tabIndex={-1}
                          >
                            <Icon name="eye" size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="login-form__options">
                        <label className="login-checkbox">
                          <input type="checkbox" defaultChecked readOnly tabIndex={-1} />
                          <span>Remember my enterprise credentials</span>
                        </label>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        className="login-submit-btn"
                      >
                        Sign In
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview Footer matching Login */}
              <div ref={previewFooterRef} className="login-footer lps-mini-footer">
                <div className="login-footer__left">
                  <span>&copy; 2026 PT GENIUS ONE. All rights reserved.</span>
                  <span>Enterprise Operations &amp; Procurement Management</span>
                </div>
                <div className="login-footer__right">
                  <span>English (US)</span>
                  <span className="footer-separator">&bull;</span>
                  <span>Protected by Enterprise Security Standards</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Clean Non-Clipping RGB Inspector */}
        <aside className="lps-inspector" aria-label="RGB Studio Configuration">
          <div className="lps-inspector__scroll">
            {/* 1. Signature Color Studio */}
            <section className="lps-card-section">
              <div className="login-rgb-section__head">
                <span className="login-rgb-section__label">Signature Color Studio</span>
                <span className="login-rgb-section__hint">Click letter key</span>
              </div>

              <div className="login-rgb-pills">
                {RGB_PRESETS.map((preset) => {
                  const isSelected = preset.colors.every(
                    (c, i) => settings.letterColors[i]?.toLowerCase() === c.toLowerCase()
                  );
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`login-rgb-pill ${isSelected ? "is-active" : ""}`}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          letterColors: [...preset.colors],
                        }))
                      }
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <SignatureColorStudio
                letterColors={settings.letterColors}
                onChangeLetterColor={handleLetterColorChange}
                onReplaceAllColors={handleReplaceAllColors}
              />
            </section>

            {/* 2. Direction & RGB Effect Mode */}
            <section className="lps-card-section">
              <div className="login-rgb-section__head">
                <span className="login-rgb-section__label">Breakup Direction</span>
              </div>
              <div className="login-rgb-pills">
                {DIRECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`login-rgb-pill ${
                      settings.directionMode === opt.id ? "is-active" : ""
                    }`}
                    onClick={() => setSettings((prev) => ({ ...prev, directionMode: opt.id }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="login-rgb-section__head">
                <span className="login-rgb-section__label">Wordmark RGB Animation</span>
              </div>
              <div className="login-rgb-pills login-rgb-pills--2col">
                {COLOR_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`login-rgb-pill ${
                      settings.colorMode === opt.id ? "is-active" : ""
                    }`}
                    onClick={() => setSettings((prev) => ({ ...prev, colorMode: opt.id }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 3. Login Theme + Physics Sliders */}
            <section className="lps-card-section">
              <div className="login-rgb-section__head">
                <span className="login-rgb-section__label">Login Theme</span>
                <span className="login-rgb-section__value">
                  {themeMode === "auto"
                    ? "Auto Ambient"
                    : themeMode === "dark"
                      ? "Dark"
                      : "Light"}
                </span>
              </div>
              <div className="login-rgb-pills">
                {THEME_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`login-rgb-pill ${themeMode === opt.id ? "is-active" : ""}`}
                    onClick={() => setThemeMode(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="login-rgb-sliders">
                <label className="login-rgb-slider-row">
                  <div className="login-rgb-section__head">
                    <span className="login-rgb-section__label">Cycle &amp; RGB Speed</span>
                    <span className="login-rgb-section__value">{settings.speed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.1}
                    value={settings.speed}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, speed: parseFloat(e.target.value) }))
                    }
                    className="login-rgb-range"
                  />
                </label>

                <label className="login-rgb-slider-row">
                  <div className="login-rgb-section__head">
                    <span className="login-rgb-section__label">Particle Size</span>
                    <span className="login-rgb-section__value">
                      {settings.particleSize.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.8}
                    step={0.1}
                    value={settings.particleSize}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        particleSize: parseFloat(e.target.value),
                      }))
                    }
                    className="login-rgb-range"
                  />
                </label>

                <label className="login-rgb-slider-row">
                  <div className="login-rgb-section__head">
                    <span className="login-rgb-section__label">Motion Trail</span>
                    <span className="login-rgb-section__value">
                      {Math.round(settings.trailStrength * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.6}
                    step={0.1}
                    value={settings.trailStrength}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        trailStrength: parseFloat(e.target.value),
                      }))
                    }
                    className="login-rgb-range"
                  />
                </label>

                <label className="login-rgb-slider-row">
                  <div className="login-rgb-section__head">
                    <span className="login-rgb-section__label">Orbit Turbulence</span>
                    <span className="login-rgb-section__value">
                      {settings.turbulence.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={2.0}
                    step={0.1}
                    value={settings.turbulence}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        turbulence: parseFloat(e.target.value),
                      }))
                    }
                    className="login-rgb-range"
                  />
                </label>
              </div>
            </section>

            {/* 4. Adaptive Device Safety Guard & Quick Stress Test */}
            <section className="lps-card-section">
              <div className="login-rgb-section__head">
                <span className="login-rgb-section__label">Device Safety Guard</span>
                <span className={`lps-tier-badge lps-tier-badge--${effectiveTier}`}>
                  {effectiveProfile.label}
                </span>
              </div>

              <div className="lps-perf-meta">
                <span>
                  {perfAssessment
                    ? perfAssessment.reason
                    : "Evaluating browser rendering capability..."}
                </span>
                <span>
                  Density {Math.round(effectiveProfile.density * 100)}% · DPR max {effectiveProfile.maxDpr}x
                </span>
              </div>

              <div className="login-rgb-pills">
                {TIER_SIM_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`login-rgb-pill ${simMode === opt.id ? "is-active" : ""}`}
                    onClick={() => setSimMode(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="lps-footer-btn lps-footer-btn--secondary"
                onClick={handleRunStressTest}
              >
                Run Stress Test
              </button>
            </section>
          </div>

          <div className="lps-inspector__footer">
            <button
              type="button"
              className="lps-footer-btn lps-footer-btn--primary"
              onClick={() => {
                setPreviewRevealCard(false);
                setReplaySignal((s) => s + 1);
              }}
            >
              Replay Preview
            </button>
            <button
              type="button"
              className="lps-footer-btn lps-footer-btn--secondary"
              onClick={() => {
                setSettings({
                  ...DEFAULT_PARTICLE_SETTINGS,
                  letterColors: [...DEFAULT_LETTER_HEXES],
                });
                setPreviewRevealCard(false);
                setReplaySignal((s) => s + 1);
              }}
            >
              Reset Default
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default LoginParticleStudioPage;
