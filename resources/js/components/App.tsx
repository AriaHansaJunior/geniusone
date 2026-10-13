import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "./layout/AppLayout";
import { Dashboard } from "../pages/Dashboard";
import { PurchaseRequisition } from "../pages/PurchaseRequisition";
import { PurchaseOrder } from "../pages/PurchaseOrder";
import { PurchaseOrderReport } from "../pages/PurchaseOrderReport";
import { Warehouse } from "../pages/Warehouse";
import { PurchaseRequisitionDetail } from "../pages/PurchaseRequisitionDetail";
import { PurchaseOrderDetail } from "../pages/PurchaseOrderDetail";
import { PurchaseOrderReportDetail } from "../pages/PurchaseOrderReportDetail";
import { WarehouseDetail } from "../pages/WarehouseDetail";
import { WarehouseCreate } from "../pages/WarehouseCreate";
import { EditProfile } from "../pages/EditProfile";
import { Login } from "../pages/Login";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { pageMeta, docToSlug } from "../data/mockData";
import { navigationConfig } from "../config/navigation";
import type { PageKey, ViewState, TableRow } from "../types";

interface AppProps {
  initialPage?: string;
  initialCode?: string;
}

function resolveViewStateFromPath(pathname: string, defaultPage: PageKey = "dashboard"): ViewState {
  const cleanPath = decodeURIComponent(pathname).replace(/\/$/, "");

  // Root or Dashboard
  if (cleanPath === "" || cleanPath === "/dashboard") {
    return { type: "dashboard" };
  }

  // Authentication & User Profile routes
  if (cleanPath === "/login") {
    return { type: "login" };
  }
  if (cleanPath === "/profile/edit" || cleanPath === "/edit-profile") {
    return { type: "edit-profile" };
  }

  // Create routes
  if (
    cleanPath === "/warehouse/create" ||
    cleanPath === "/warehouse/add" ||
    cleanPath === "/warehouse/incoming/receive-material-bpb/create" ||
    cleanPath === "/warehouse/incoming/receive-material-bpb/add"
  ) {
    return { type: "warehouse-create" };
  }

  // Detail routes (hierarchical & legacy short aliases)
  const prDetailMatch = cleanPath.match(
    /^\/(?:procurement\/transactions\/purchase-requisition|pr|purchase-requisition|purchase-requisitions)\/details?\/(.+)$/
  );
  if (prDetailMatch) {
    return { type: "pr-detail", code: decodeURIComponent(prDetailMatch[1]) };
  }

  const poDetailMatch = cleanPath.match(
    /^\/(?:procurement\/transactions\/purchase-order|po|purchase-order|purchase-orders)\/details?\/(.+)$/
  );
  if (poDetailMatch) {
    return { type: "po-detail", code: decodeURIComponent(poDetailMatch[1]) };
  }

  const reportDetailMatch = cleanPath.match(
    /^\/(?:procurement\/reports\/report-pr-po|report|pr-po-report)\/details?\/(.+)$/
  );
  if (reportDetailMatch) {
    return { type: "report-detail", code: decodeURIComponent(reportDetailMatch[1]) };
  }

  const warehouseDetailMatch = cleanPath.match(
    /^\/(?:warehouse\/incoming\/receive-material-bpb|warehouse\/incoming\/receiving-material-bpb|warehouse\/incoming\/receiving material \(bpb\)|warehouse\/incoming\/receive material \(bpb\)|warehouse\/incoming\/receive-material|warehouse\/bpb|warehouse)\/details?\/(.+)$/
  );
  if (warehouseDetailMatch) {
    return { type: "warehouse-detail", code: decodeURIComponent(warehouseDetailMatch[1]) };
  }

  // Check navigationConfig items (matches all hierarchical paths configured)
  for (const section of navigationConfig) {
    if (section.path && cleanPath === section.path) {
      if (section.id === "dashboard") {
        return { type: "dashboard" };
      }
      return { type: "list", page: section.id as PageKey };
    }
    if (section.directItems) {
      for (const item of section.directItems) {
        if (cleanPath === item.path) {
          return { type: "list", page: item.id as PageKey };
        }
      }
    }
    if (section.groups) {
      for (const group of section.groups) {
        if (group.isDirectLeaf && group.path && cleanPath === group.path) {
          return { type: "list", page: group.id as PageKey };
        }
        for (const item of group.items) {
          if (cleanPath === item.path) {
            return { type: "list", page: item.id as PageKey };
          }
        }
      }
    }
  }

  // Existing Core List Routes & legacy aliases
  if (
    cleanPath === "/pr" ||
    cleanPath === "/purchase-requisitions" ||
    cleanPath === "/purchase-requests"
  ) {
    return { type: "list", page: "pr" };
  }
  if (cleanPath === "/po" || cleanPath === "/purchase-orders") {
    return { type: "list", page: "po" };
  }
  if (cleanPath === "/report" || cleanPath === "/pr-po-report") {
    return { type: "list", page: "report" };
  }
  if (
    cleanPath === "/warehouse" ||
    cleanPath === "/warehouse/bpb" ||
    cleanPath === "/warehouse/incoming/receiving-material-bpb" ||
    cleanPath === "/warehouse/incoming/receiving material (bpb)" ||
    cleanPath === "/warehouse/incoming/receive material (bpb)" ||
    cleanPath === "/warehouse/incoming/receive-material"
  ) {
    return { type: "list", page: "warehouse" };
  }

  // Master & other aliases
  if (cleanPath === "/procurement/supplier") return { type: "list", page: "supplier" };
  if (cleanPath === "/procurement/payment-term") return { type: "list", page: "payment-term" };
  if (cleanPath === "/procurement/purchase-category") return { type: "list", page: "purchase-category" };
  if (cleanPath === "/procurement/delivery-terms") return { type: "list", page: "delivery-terms" };
  if (cleanPath === "/procurement/additional-costs") return { type: "list", page: "additional-costs" };
  if (cleanPath === "/procurement/pph") return { type: "list", page: "pph" };
  if (cleanPath === "/procurement/pr-report") return { type: "list", page: "pr-report" };
  if (cleanPath === "/procurement/po-report") return { type: "list", page: "po-report" };

  if (cleanPath === "/exim/unit") return { type: "list", page: "unit" };
  if (cleanPath === "/exim/satuan") return { type: "list", page: "satuan" };
  if (cleanPath === "/exim/item") return { type: "list", page: "item" };
  if (cleanPath === "/exim/brand") return { type: "list", page: "brand" };
  if (cleanPath === "/exim/classification") return { type: "list", page: "classification" };
  if (cleanPath === "/exim/department") return { type: "list", page: "department" };
  if (cleanPath === "/exim/facility") return { type: "list", page: "facility" };
  if (cleanPath === "/exim/hs") return { type: "list", page: "hs" };
  if (cleanPath === "/exim/category") return { type: "list", page: "category" };
  if (cleanPath === "/exim/style") return { type: "list", page: "style" };
  if (cleanPath === "/exim/colour") return { type: "list", page: "colour" };
  if (cleanPath === "/exim/receive-note") return { type: "list", page: "receive-note" };
  if (cleanPath === "/exim/receive-note-return") return { type: "list", page: "receive-note-return" };
  if (cleanPath === "/exim/document-history") return { type: "list", page: "document-history" };

  if (cleanPath === "/warehouse/master") return { type: "list", page: "warehouse-master" };

  if (defaultPage === "dashboard") {
    return { type: "dashboard" };
  }
  return { type: "list", page: defaultPage };
}

export function App({ initialPage = "dashboard", initialCode = "" }: AppProps) {
  const [viewState, setViewState] = useState<ViewState>(() => {
    if (typeof window !== "undefined") {
      return resolveViewStateFromPath(window.location.pathname, (initialPage as PageKey) || "dashboard");
    }
    if (initialPage === "dashboard") return { type: "dashboard" };
    if (initialPage === "login") return { type: "login" };
    if (initialPage === "edit-profile" || initialPage === "profile.edit") return { type: "edit-profile" };
    if (initialPage === "warehouse-create") return { type: "warehouse-create" };
    if (initialPage === "pr-detail") return { type: "pr-detail", code: initialCode || "0026-PR-IMLI-X-2026" };
    if (initialPage === "po-detail") return { type: "po-detail", code: initialCode || "POL-1026-0040" };
    if (initialPage === "report-detail") return { type: "report-detail", code: initialCode || "POL-1026-0040" };
    if (initialPage === "warehouse-detail") return { type: "warehouse-detail", code: initialCode || "0138-WHIN-IMLI-G-X-2026" };
    if (initialPage in pageMeta) return { type: "list", page: initialPage as PageKey };
    return { type: "dashboard" };
  });

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Calculate corresponding active sidebar section
  const activeSidebarPage: PageKey | null =
    viewState.type === "dashboard"
      ? "dashboard"
      : viewState.type === "list"
      ? viewState.page
      : viewState.type === "pr-detail"
      ? "pr"
      : viewState.type === "po-detail"
      ? "po"
      : viewState.type === "report-detail"
      ? "report"
      : viewState.type === "warehouse-detail" || viewState.type === "warehouse-create"
      ? "warehouse"
      : null;

  const isDetailPage = viewState.type !== "list" && viewState.type !== "dashboard";
  const hideDefaultHeader = isDetailPage || viewState.type === "dashboard";

  // Reset scroll position on route transition
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainEl = document.querySelector("main");
      if (mainEl) mainEl.scrollTop = 0;
    }
  }, [viewState]);

  // Navigate to list or dashboard view
  const handleNavigateList = useCallback((targetPage: PageKey, targetPath?: string) => {
    let nextState: ViewState;
    let path = targetPath;

    if (targetPage === "dashboard") {
      nextState = { type: "dashboard" };
      path = path || "/dashboard";
    } else {
      nextState = { type: "list", page: targetPage };
      if (!path) {
        // Find path from navigation config if available
        for (const section of navigationConfig) {
          if (section.id === targetPage && section.path) {
            path = section.path;
            break;
          }
          if (section.directItems) {
            const found = section.directItems.find((item) => item.id === targetPage);
            if (found) {
              path = found.path;
              break;
            }
          }
          if (section.groups) {
            for (const group of section.groups) {
              const found = group.items.find((item) => item.id === targetPage);
              if (found) {
                path = found.path;
                break;
              }
            }
          }
        }
        path = path || `/${targetPage}`;
      }
    }

    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", path);
    }
  }, []);

  // Navigate to detail view using slugified document identifier
  const handleNavigateDetail = useCallback(
    (module: "pr" | "po" | "report" | "warehouse", identifier: string) => {
      const slug = docToSlug(identifier);
      let targetPath = `/${module}/detail/${slug}`;
      let nextState: ViewState;

      switch (module) {
        case "pr":
          nextState = { type: "pr-detail", code: slug };
          targetPath = `/procurement/transactions/purchase-requisition/detail/${slug}`;
          break;
        case "po":
          nextState = { type: "po-detail", code: slug };
          targetPath = `/procurement/transactions/purchase-order/detail/${slug}`;
          break;
        case "report":
          nextState = { type: "report-detail", code: slug };
          targetPath = `/procurement/reports/report-pr-po/detail/${slug}`;
          break;
        case "warehouse":
          nextState = { type: "warehouse-detail", code: slug };
          targetPath = `/warehouse/incoming/receive-material-bpb/detail/${slug}`;
          break;
      }

      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", targetPath);
      }
    },
    []
  );

  // Navigate to create new record view
  const handleNavigateCreate = useCallback((module: "warehouse") => {
    const nextState: ViewState = { type: "warehouse-create" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/incoming/receive-material-bpb/create");
    }
  }, []);

  // Navigate to edit profile view
  const handleNavigateProfile = useCallback(() => {
    setViewState({ type: "edit-profile" });

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState({ type: "edit-profile" }, "", "/profile/edit");
    }
  }, []);

  // Logout request from Header dropdown
  const handleRequestLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  // Confirm logout -> navigate to /login and reset session storage
  const handleConfirmLogout = useCallback(() => {
    setShowLogoutDialog(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("geniusone_sidebar_sections");
        sessionStorage.removeItem("geniusone_sidebar_groups");
      } catch {
        // ignore
      }
      window.scrollTo(0, 0);
      window.history.pushState({ type: "login" }, "", "/login");
    }
    setViewState({ type: "login" });
  }, []);

  // Login handler -> clears old session state and routes to dashboard with all menus collapsed
  const handleLoginSuccess = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("geniusone_sidebar_sections");
        sessionStorage.removeItem("geniusone_sidebar_groups");
      } catch {
        // ignore
      }
    }
    handleNavigateList("dashboard", "/dashboard");
  }, [handleNavigateList]);

  // Cancel logout -> dismiss dialog, stay on current page
  const handleCancelLogout = useCallback(() => {
    setShowLogoutDialog(false);
  }, []);

  // Confirm save profile -> navigate to dashboard
  const handleProfileSaveConfirmed = useCallback(() => {
    handleNavigateList("dashboard", "/dashboard");
  }, [handleNavigateList]);

  // Cancel profile -> return to previous page or dashboard
  const handleProfileCancel = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      handleNavigateList("dashboard", "/dashboard");
    }
  }, [handleNavigateList]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const detected = resolveViewStateFromPath(window.location.pathname, "dashboard");
        setViewState(detected);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Standalone Login page view
  if (viewState.type === "login") {
    return (
      <Login
        onNavigateHome={handleLoginSuccess}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const currentMeta =
    viewState.type === "list"
      ? pageMeta[viewState.page] || pageMeta.dashboard
      : pageMeta.dashboard;

  return (
    <>
      <AppLayout
        activePage={activeSidebarPage}
        onNavigate={handleNavigateList}
        onNavigateProfile={handleNavigateProfile}
        onRequestLogout={handleRequestLogout}
        hideDefaultHeader={hideDefaultHeader}
      >
        {/* Dashboard Landing Page */}
        {viewState.type === "dashboard" && <Dashboard />}

        {/* Existing Core List Page Views */}
        {viewState.type === "list" && viewState.page === "pr" && (
          <PurchaseRequisition
            onDetail={(row: TableRow) =>
              handleNavigateDetail("pr", row._rawNumber || row._rawPr || row._id || "")
            }
          />
        )}

        {viewState.type === "list" && viewState.page === "po" && (
          <PurchaseOrder
            onDetail={(row: TableRow) =>
              handleNavigateDetail("po", row._rawNumber || row._rawPo || row._id || "")
            }
          />
        )}

        {viewState.type === "list" && viewState.page === "report" && (
          <PurchaseOrderReport
            onDetail={(row: TableRow) =>
              handleNavigateDetail("report", row._rawPo || row._rawPr || row._rawNumber || row._id || "")
            }
          />
        )}

        {viewState.type === "list" && viewState.page === "warehouse" && (
          <Warehouse
            onDetail={(row: TableRow) =>
              handleNavigateDetail("warehouse", row._rawNumber || row._rawRn || row._id || "")
            }
            onCreate={() => handleNavigateCreate("warehouse")}
          />
        )}

        {/* New Lightweight Placeholder Pages */}
        {viewState.type === "list" &&
          viewState.page !== "pr" &&
          viewState.page !== "po" &&
          viewState.page !== "report" &&
          viewState.page !== "warehouse" &&
          viewState.page !== "dashboard" && (
            <PlaceholderPage
              eyebrow={currentMeta.eyebrow}
              title={currentMeta.title}
            />
          )}

        {/* Dedicated Full Page Detail Views */}
        {viewState.type === "pr-detail" && (
          <PurchaseRequisitionDetail
            code={viewState.code}
            onBack={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
            onNavigateDetail={handleNavigateDetail}
          />
        )}

        {viewState.type === "po-detail" && (
          <PurchaseOrderDetail
            code={viewState.code}
            onBack={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
            onNavigateDetail={handleNavigateDetail}
          />
        )}

        {viewState.type === "report-detail" && (
          <PurchaseOrderReportDetail
            code={viewState.code}
            onBack={() => handleNavigateList("report", "/procurement/reports/report-pr-po")}
            onNavigateDetail={handleNavigateDetail}
          />
        )}

        {viewState.type === "warehouse-detail" && (
          <WarehouseDetail
            code={viewState.code}
            onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
            onNavigateDetail={handleNavigateDetail}
          />
        )}

        {/* Dedicated Full Page Create View */}
        {viewState.type === "warehouse-create" && (
          <WarehouseCreate
            onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
            onSaved={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
          />
        )}

        {/* Dedicated Edit Profile View */}
        {viewState.type === "edit-profile" && (
          <EditProfile
            onBack={handleProfileCancel}
            onSaveConfirmed={handleProfileSaveConfirmed}
          />
        )}
      </AppLayout>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Confirm Logout"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="logOut"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default App;
