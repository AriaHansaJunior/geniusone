import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AuthPermissionProvider } from "./context/AuthPermissionContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider, type SystemTheme } from "./context/ThemeContext";
import type { PageKey } from "./types";

const rootElement = document.getElementById("root");

if (rootElement) {
  const initialPage = rootElement.dataset.initialPage || "dashboard";
  const initialCode = rootElement.dataset.initialCode || "";
  const initialTheme: SystemTheme = rootElement.dataset.initialTheme === "default" ? "default" : "modern";

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary fallbackTitle="GeniusOne Application Error">
        <ThemeProvider initialTheme={initialTheme}>
          <NotificationProvider>
            <AuthPermissionProvider>
              <App initialPage={initialPage} initialCode={initialCode} />
            </AuthPermissionProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
