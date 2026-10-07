import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";
import type { PageKey } from "./types";

const rootElement = document.getElementById("root");

if (rootElement) {
  const initialPage = (rootElement.dataset.initialPage as PageKey) || "report";

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App initialPage={initialPage} />
    </React.StrictMode>
  );
}
