import { useState, useEffect, useCallback } from "react";
import { AppShell } from "./layout/AppShell";
import { ListingPage } from "../pages/ListingPage";
import { FoundationPage } from "../pages/FoundationPage";
import { DetailDrawer } from "./ui/DetailDrawer";
import { navigation } from "../data/mockData";
import type { PageKey, TableRow } from "../types";

interface GeniusAppProps {
  initialPage?: PageKey;
}

function resolvePageFromPath(pathname: string, defaultPage: PageKey = "report"): PageKey {
  const cleanPath = pathname.replace(/\/$/, "");
  if (cleanPath === "/pr" || cleanPath === "/purchase-requests") return "pr";
  if (cleanPath === "/po" || cleanPath === "/purchase-orders") return "po";
  if (cleanPath === "/report" || cleanPath === "/pr-po-report") return "report";
  if (cleanPath === "/warehouse" || cleanPath.startsWith("/warehouse")) return "warehouse";
  if (cleanPath === "/foundation" || cleanPath === "/design-foundation") return "foundation";
  return defaultPage;
}

export function GeniusApp({ initialPage = "report" }: GeniusAppProps) {
  const [page, setPage] = useState<PageKey>(() => {
    if (typeof window !== "undefined") {
      return resolvePageFromPath(window.location.pathname, initialPage);
    }
    return initialPage;
  });

  const [detail, setDetail] = useState<TableRow | null>(null);

  // Handle in-app navigation and URL synchronisation
  const handleNavigate = useCallback((newPage: PageKey) => {
    setPage(newPage);
    setDetail(null);

    const targetNav = navigation.find((item) => item.key === newPage);
    if (targetNav && typeof window !== "undefined") {
      window.history.pushState({ page: newPage }, "", targetNav.path);
    }
  }, []);

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const detected = resolvePageFromPath(window.location.pathname, "report");
        setPage(detected);
        setDetail(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <AppShell activePage={page} onNavigate={handleNavigate}>
      {page === "foundation" ? (
        <FoundationPage />
      ) : (
        <ListingPage page={page} onDetail={setDetail} />
      )}

      {detail && (
        <DetailDrawer row={detail} onClose={() => setDetail(null)} />
      )}
    </AppShell>
  );
}

export default GeniusApp;
