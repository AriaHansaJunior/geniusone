import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { AuthPermissionProvider } from "./context/AuthPermissionContext";
import type { PageKey } from "./types";

const rootElement = document.getElementById("root");

if (rootElement) {
  const initialPage = rootElement.dataset.initialPage || "dashboard";
  const initialCode = rootElement.dataset.initialCode || "";

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary fallbackTitle="GeniusOne Application Error">
        <AuthPermissionProvider>
          <App initialPage={initialPage} initialCode={initialCode} />
        </AuthPermissionProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
