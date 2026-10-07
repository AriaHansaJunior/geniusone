import React from "react";
import ReactDOM from "react-dom/client";
import { GeniusApp } from "./components/GeniusApp";
import type { PageKey } from "./types";

const rootElement = document.getElementById("root");

if (rootElement) {
  const initialPage = (rootElement.dataset.initialPage as PageKey) || "report";

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GeniusApp initialPage={initialPage} />
    </React.StrictMode>
  );
}
