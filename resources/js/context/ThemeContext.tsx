import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type SystemTheme = "default" | "modern";

export const SYSTEM_THEME_STORAGE_KEY = "geniusone_system_theme";
export const DEFAULT_THEME_PREFIX = "/default";

export function hasDefaultThemePrefix(pathname: string): boolean {
  const clean = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return clean === DEFAULT_THEME_PREFIX || clean.startsWith(`${DEFAULT_THEME_PREFIX}/`);
}

export function stripThemePrefix(pathname: string): string {
  const [rawPath, query] = pathname.split("?");
  const normalized = rawPath || "/";
  let stripped = normalized;

  if (normalized === DEFAULT_THEME_PREFIX || normalized === `${DEFAULT_THEME_PREFIX}/`) {
    stripped = "/dashboard";
  } else if (normalized.startsWith(`${DEFAULT_THEME_PREFIX}/`)) {
    stripped = normalized.slice(DEFAULT_THEME_PREFIX.length) || "/dashboard";
  }

  return query !== undefined ? `${stripped}?${query}` : stripped;
}

export function withThemePrefix(path: string, theme: SystemTheme): string {
  const [rawPath, query] = path.split("?");
  const cleanBase = stripThemePrefix(rawPath || "/").split("?")[0];

  // Standalone login route stays outside theme prefix
  if (cleanBase === "/login") {
    return query !== undefined ? `/login?${query}` : "/login";
  }

  let nextBase = cleanBase === "/" ? "/dashboard" : cleanBase;
  if (theme === "default") {
    nextBase = nextBase.startsWith("/") ? `${DEFAULT_THEME_PREFIX}${nextBase}` : `${DEFAULT_THEME_PREFIX}/${nextBase}`;
  }

  return query !== undefined ? `${nextBase}?${query}` : nextBase;
}

export function readStoredSystemTheme(): SystemTheme {
  if (typeof window === "undefined") return "modern";
  try {
    return localStorage.getItem(SYSTEM_THEME_STORAGE_KEY) === "default" ? "default" : "modern";
  } catch {
    return "modern";
  }
}

export function resolveInitialSystemTheme(initialThemeAttr?: string): SystemTheme {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    if (hasDefaultThemePrefix(pathname)) {
      return "default";
    }
    if (pathname === "/login") {
      return readStoredSystemTheme();
    }
  }
  return initialThemeAttr === "default" ? "default" : "modern";
}

interface ThemeContextValue {
  theme: SystemTheme;
  isDefaultTheme: boolean;
  setTheme: (nextTheme: SystemTheme, syncCurrentUrl?: boolean) => void;
  syncThemeFromPath: (pathname: string) => SystemTheme;
  formatPath: (path: string) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme = "modern",
  children,
}: {
  initialTheme?: SystemTheme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<SystemTheme>(() => resolveInitialSystemTheme(initialTheme));

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.uiTheme = theme;
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: SystemTheme, syncCurrentUrl = true) => {
    setThemeState(nextTheme);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SYSTEM_THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage quota errors
      }

      if (typeof document !== "undefined") {
        document.documentElement.dataset.uiTheme = nextTheme;
      }

      if (syncCurrentUrl) {
        const currentFull = `${window.location.pathname}${window.location.search}`;
        const nextFull = withThemePrefix(currentFull, nextTheme);
        if (nextFull !== currentFull) {
          window.history.replaceState(window.history.state, "", nextFull);
        }
      }
    }
  }, []);

  const syncThemeFromPath = useCallback((pathname: string): SystemTheme => {
    const resolved: SystemTheme = hasDefaultThemePrefix(pathname)
      ? "default"
      : pathname === "/login"
        ? readStoredSystemTheme()
        : "modern";
    setThemeState(resolved);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.uiTheme = resolved;
    }
    return resolved;
  }, []);

  const formatPath = useCallback(
    (path: string) => withThemePrefix(path, theme),
    [theme]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDefaultTheme: theme === "default",
        setTheme,
        syncThemeFromPath,
        formatPath,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
