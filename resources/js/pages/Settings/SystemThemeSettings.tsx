import React from "react";
import { useTheme, type SystemTheme } from "../../context/ThemeContext";
import { useNotification } from "../../context/NotificationContext";

export function SystemThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { notifySuccess } = useNotification();

  const handleSelectTheme = (nextTheme: SystemTheme) => {
    if (theme === nextTheme) return;
    setTheme(nextTheme, true);
    const label = nextTheme === "default" ? "Default" : "Modern and Optimized";
    notifySuccess(
      "System Theme Updated",
      `Workspace layout switched to "${label}".`
    );
  };

  return (
    <div className="settings-workspace">
      <div className="settings-panel-header">
        <div>
          <span className="eyebrow">SYSTEM PREFERENCES</span>
          <h2 className="settings-panel-header__title">System Theme</h2>
          <p className="settings-panel-header__desc">
            Choose the layout mode for document detail pages and dedicated theme routes. Color palette, typography, and icons remain consistent.
          </p>
        </div>
        <span className="settings-active-pill">
          {theme === "default" ? "Active: Default" : "Active: Modern and Optimized"}
        </span>
      </div>

      <section className="theme-settings-card">
        <fieldset className="theme-settings-card__fieldset">
          <legend className="theme-settings-card__legend">Interface Presentation Mode</legend>
          <p className="theme-settings-card__hint">
            Switching the theme updates your workspace route prefix automatically so both UI layouts stay isolated and non-overlapping.
          </p>

          <div className="theme-options-grid" role="radiogroup" aria-label="System Theme">
            {/* Option 1: Default (SmartOne-style unified list layout) */}
            <label
              className={`theme-option-card ${
                theme === "default" ? "theme-option-card--selected" : ""
              }`}
            >
              <div className="theme-option-card__top">
                <div className="theme-option-card__radio-row">
                  <input
                    type="radio"
                    name="system_theme"
                    value="default"
                    className="theme-option-card__radio"
                    checked={theme === "default"}
                    onChange={() => handleSelectTheme("default")}
                  />
                  <span className="theme-option-card__title">Default</span>
                </div>
                <span className="theme-option-card__route-chip">Route: /default/...</span>
              </div>

              <p className="theme-option-card__desc">
                SmartOne-inspired unified detail layout combining action pills and vertical key-value specification lists inside a single structured card.
              </p>

              <div className="theme-wireframe" aria-hidden="true">
                <div className="theme-wireframe__bar">
                  <span className="theme-wireframe__pill" />
                  <span className="theme-wireframe__pill theme-wireframe__pill--dark" />
                  <span className="theme-wireframe__pill theme-wireframe__pill--dark" />
                </div>
                <div className="theme-wireframe__unified-box">
                  <div className="theme-wireframe__kv-col">
                    <span className="theme-wireframe__line" />
                    <span className="theme-wireframe__line theme-wireframe__line--short" />
                    <span className="theme-wireframe__line" />
                  </div>
                  <div className="theme-wireframe__kv-col">
                    <span className="theme-wireframe__line" />
                    <span className="theme-wireframe__line theme-wireframe__line--short" />
                    <span className="theme-wireframe__line" />
                  </div>
                  <div className="theme-wireframe__kv-col">
                    <span className="theme-wireframe__line" />
                    <span className="theme-wireframe__line theme-wireframe__line--short" />
                    <span className="theme-wireframe__line" />
                  </div>
                </div>
                <div className="theme-wireframe__table-strip" />
              </div>
            </label>

            {/* Option 2: Modern and Optimized (GeniusOne UI 2.0 — default active) */}
            <label
              className={`theme-option-card ${
                theme === "modern" ? "theme-option-card--selected" : ""
              }`}
            >
              <div className="theme-option-card__top">
                <div className="theme-option-card__radio-row">
                  <input
                    type="radio"
                    name="system_theme"
                    value="modern"
                    className="theme-option-card__radio"
                    checked={theme === "modern"}
                    onChange={() => handleSelectTheme("modern")}
                  />
                  <span className="theme-option-card__title">Modern and Optimized</span>
                </div>
                <span className="theme-option-card__route-chip">Route: /...</span>
              </div>

              <p className="theme-option-card__desc">
                Current GENIUSONE UI 2.0 workspace with floating summary KPI cards, workflow pipelines, and glassmorphic section panels.
              </p>

              <div className="theme-wireframe" aria-hidden="true">
                <div className="theme-wireframe__table-strip" />
                <div className="theme-wireframe__floating-grid">
                  <div className="theme-wireframe__mini-card" />
                  <div className="theme-wireframe__mini-card" />
                  <div className="theme-wireframe__mini-card" />
                  <div className="theme-wireframe__mini-card" />
                </div>
                <div className="theme-wireframe__table-strip" />
              </div>
            </label>
          </div>

          <div className="theme-settings-note">
            Both modes share the exact same database records, permissions, Lato &amp; Noto Sans typography, blue enterprise palette, and GENIUSONE icon set.
          </div>
        </fieldset>
      </section>
    </div>
  );
}
