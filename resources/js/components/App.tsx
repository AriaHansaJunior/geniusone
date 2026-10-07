import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "./layout/AppLayout";
import { PurchaseRequest } from "../pages/PurchaseRequest";
import { PurchaseOrder } from "../pages/PurchaseOrder";
import { PurchaseOrderReport } from "../pages/PurchaseOrderReport";
import { Warehouse } from "../pages/Warehouse";
import { DetailDrawer } from "./ui/DetailDrawer";
import { navigation } from "../data/mockData";
import type { PageKey, TableRow } from "../types";

interface AppProps {
  initialPage?: PageKey;
}

function resolvePageFromPath(pathname: string, defaultPage: PageKey = "report"): PageKey {
  const cleanPath = pathname.replace(/\/$/, "");
  if (cleanPath === "/pr" || cleanPath === "/purchase-requests") return "pr";
  if (cleanPath === "/po" || cleanPath === "/purchase-orders") return "po";
  if (cleanPath === "/report" || cleanPath === "/pr-po-report") return "report";
  if (cleanPath === "/warehouse" || cleanPath.startsWith("/warehouse")) return "warehouse";
  return defaultPage;
}

export function App({ initialPage = "report" }: AppProps) {
  const [page, setPage] = useState<PageKey>(() => {
    if (typeof window !== "undefined") {
      return resolvePageFromPath(window.location.pathname, initialPage);
    }
    return initialPage;
  });

  const [detail, setDetail] = useState<TableRow | null>(null);

  // Reset scroll position to top view whenever the active page changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
    }
  }, [page]);

  // Synchronise in-app navigation with browser History API
  const handleNavigate = useCallback((newPage: PageKey) => {
    setPage(newPage);
    setDetail(null);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      const targetNav = navigation.find((item) => item.key === newPage);
      if (targetNav) {
        window.history.pushState({ page: newPage }, "", targetNav.path);
      }
    }
  }, []);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const detected = resolvePageFromPath(window.location.pathname, "report");
        setPage(detected);
        setDetail(null);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <AppLayout activePage={page} onNavigate={handleNavigate}>
      {page === "pr" && <PurchaseRequest onDetail={setDetail} />}
      {page === "po" && <PurchaseOrder onDetail={setDetail} />}
      {page === "report" && <PurchaseOrderReport onDetail={setDetail} />}
      {page === "warehouse" && <Warehouse onDetail={setDetail} />}

      {detail && (
        <DetailDrawer row={detail} onClose={() => setDetail(null)} />
      )}
    </AppLayout>
  );
}

export default App;
