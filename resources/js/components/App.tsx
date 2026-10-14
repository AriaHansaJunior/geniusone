import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "./layout/AppLayout";
import {
  Dashboard,
  PurchaseRequisition,
  PurchaseOrder,
  PurchaseOrderReport,
  PurchaseRequisitionReport,
  ReportingPurchaseOrder,
  SupplierIndex,
  SupplierForm,
  PaymentTermIndex,
  PaymentTermForm,
  PurchaseCategoryIndex,
  PurchaseCategoryForm,
  DeliveryTermsIndex,
  DeliveryTermsForm,
  AdditionalCostsIndex,
  AdditionalCostsForm,
  PphIndex,
  PphForm,
  UnitIndex,
  UnitForm,
  UnitReferenceIndex,
  ClassificationIndex,
  ClassificationForm,
  DepartmentIndex,
  DepartmentForm,
  BrandIndex,
  BrandForm,
  ItemIndex,
  ItemForm,
  GenerateQrCodePage,
  Warehouse,
  PurchaseRequisitionDetail,
  PurchaseOrderDetail,
  PurchaseOrderReportDetail,
  WarehouseDetail,
  WarehouseCreate,
  EditProfile,
  Login,
  PlaceholderPage,
} from "../pages";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { pageMeta, docToSlug } from "../data/mockData";
import { navigationConfig } from "../config/navigation";
import { initialPphRecords, type PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import { initialSupplierRecords, type SupplierRecord } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import { initialPaymentTermRecords, type PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import { initialPurchaseCategoryRecords, type PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import { initialDeliveryTermRecords, type DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import { initialAdditionalCostRecords, type AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import { initialUnitRecords } from "../pages/Exim/Master/Unit/unit-data";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import { initialClassificationRecords } from "../pages/Exim/Master/Classification/classification-data";
import type { ClassificationRecord } from "../pages/Exim/Master/Classification/classification-types";
import { initialDepartmentRecords } from "../pages/Exim/Master/Department/department-data";
import type { DepartmentRecord } from "../pages/Exim/Master/Department/department-types";
import { initialBrandRecords } from "../pages/Exim/Master/Brand/brand-data";
import type { BrandRecord } from "../pages/Exim/Master/Brand/brand-types";
import { initialItemRecords } from "../pages/Exim/Master/Item/item-data";
import type { ItemRecord } from "../pages/Exim/Master/Item/item-types";
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

  if (
    cleanPath === "/procurement/purchase-master/supplier/create" ||
    cleanPath === "/procurement/purchase-master/supplier/add" ||
    cleanPath === "/procurement/supplier/create" ||
    cleanPath === "/procurement/supplier/add"
  ) {
    return { type: "supplier-create" };
  }

  if (
    cleanPath === "/procurement/purchase-master/payment-term/create" ||
    cleanPath === "/procurement/purchase-master/payment-term/add" ||
    cleanPath === "/procurement/payment-term/create" ||
    cleanPath === "/procurement/payment-term/add"
  ) {
    return { type: "payment-term-create" };
  }

  if (
    cleanPath === "/procurement/purchase-master/purchase-category/create" ||
    cleanPath === "/procurement/purchase-master/purchase-category/add" ||
    cleanPath === "/procurement/purchase-category/create" ||
    cleanPath === "/procurement/purchase-category/add"
  ) {
    return { type: "purchase-category-create" };
  }

  if (
    cleanPath === "/procurement/purchase-master/delivery-terms/create" ||
    cleanPath === "/procurement/purchase-master/delivery-terms/add" ||
    cleanPath === "/procurement/delivery-terms/create" ||
    cleanPath === "/procurement/delivery-terms/add"
  ) {
    return { type: "delivery-terms-create" };
  }

  if (
    cleanPath === "/procurement/purchase-master/additional-costs/create" ||
    cleanPath === "/procurement/purchase-master/additional-costs/add" ||
    cleanPath === "/procurement/additional-costs/create" ||
    cleanPath === "/procurement/additional-costs/add"
  ) {
    return { type: "additional-costs-create" };
  }

  if (
    cleanPath === "/procurement/purchase-master/pph/create" ||
    cleanPath === "/procurement/purchase-master/pph/add" ||
    cleanPath === "/procurement/pph/create" ||
    cleanPath === "/procurement/pph/add"
  ) {
    return { type: "pph-create" };
  }

  if (
    cleanPath === "/exim/master/unit/create" ||
    cleanPath === "/exim/master/unit/add" ||
    cleanPath === "/exim/unit/create" ||
    cleanPath === "/exim/unit/add"
  ) {
    return { type: "unit-create" };
  }

  if (
    cleanPath === "/exim/master/classification/create" ||
    cleanPath === "/exim/master/classification/add" ||
    cleanPath === "/exim/classification/create" ||
    cleanPath === "/exim/classification/add"
  ) {
    return { type: "classification-create" };
  }

  if (
    cleanPath === "/exim/master/department/create" ||
    cleanPath === "/exim/master/department/add" ||
    cleanPath === "/exim/department/create" ||
    cleanPath === "/exim/department/add"
  ) {
    return { type: "department-create" };
  }

  if (
    cleanPath === "/exim/master/brand/create" ||
    cleanPath === "/exim/master/brand/add" ||
    cleanPath === "/exim/brand/create" ||
    cleanPath === "/exim/brand/add"
  ) {
    return { type: "brand-create" };
  }

  if (
    cleanPath === "/exim/master/item/create" ||
    cleanPath === "/exim/master/item/add" ||
    cleanPath === "/exim/item/create" ||
    cleanPath === "/exim/item/add"
  ) {
    return { type: "item-create" };
  }

  if (
    cleanPath === "/exim/master/item/qr" ||
    cleanPath === "/exim/item/qr" ||
    cleanPath === "/exim/master/item/generate-qr" ||
    cleanPath === "/exim/item/generate-qr"
  ) {
    return { type: "item-qr" };
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
  if (
    cleanPath === "/procurement/pr-report" ||
    cleanPath === "/procurement/reports/purchase-requisition-report"
  ) {
    return { type: "list", page: "pr-report" };
  }
  if (
    cleanPath === "/procurement/po-report" ||
    cleanPath === "/procurement/reports/purchase-order-report"
  ) {
    return { type: "list", page: "po-report" };
  }

  if (cleanPath === "/exim/unit") return { type: "list", page: "unit" };
  if (
    cleanPath === "/exim/satuan" ||
    cleanPath === "/exim/master/satuan" ||
    cleanPath === "/exim/unit-reference" ||
    cleanPath === "/exim/master/unit-reference"
  ) {
    return { type: "list", page: "satuan" };
  }
  if (cleanPath === "/exim/item" || cleanPath === "/exim/master/item") return { type: "list", page: "item" };
  if (cleanPath === "/exim/brand" || cleanPath === "/exim/master/brand") return { type: "list", page: "brand" };
  if (cleanPath === "/exim/classification" || cleanPath === "/exim/master/classification") return { type: "list", page: "classification" };
  if (cleanPath === "/exim/department" || cleanPath === "/exim/master/department") return { type: "list", page: "department" };
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
    if (initialPage === "supplier-create") return { type: "supplier-create" };
    if (initialPage === "payment-term-create") return { type: "payment-term-create" };
    if (initialPage === "purchase-category-create") return { type: "purchase-category-create" };
    if (initialPage === "delivery-terms-create") return { type: "delivery-terms-create" };
    if (initialPage === "additional-costs-create") return { type: "additional-costs-create" };
    if (initialPage === "pph-create") return { type: "pph-create" };
    if (initialPage === "unit-create") return { type: "unit-create" };
    if (initialPage === "classification-create") return { type: "classification-create" };
    if (initialPage === "department-create") return { type: "department-create" };
    if (initialPage === "brand-create") return { type: "brand-create" };
    if (initialPage === "item-create") return { type: "item-create" };
    if (initialPage === "item-qr") return { type: "item-qr" };
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
      : viewState.type === "supplier-create"
      ? "supplier"
      : viewState.type === "payment-term-create"
      ? "payment-term"
      : viewState.type === "purchase-category-create"
      ? "purchase-category"
      : viewState.type === "delivery-terms-create"
      ? "delivery-terms"
      : viewState.type === "additional-costs-create"
      ? "additional-costs"
      : viewState.type === "pph-create"
      ? "pph"
      : viewState.type === "unit-create" || viewState.type === "unit-edit"
      ? "unit"
      : viewState.type === "classification-create" || viewState.type === "classification-edit"
      ? "classification"
      : viewState.type === "department-create" || viewState.type === "department-edit"
      ? "department"
      : viewState.type === "brand-create" || viewState.type === "brand-edit"
      ? "brand"
      : viewState.type === "item-create" || viewState.type === "item-edit" || viewState.type === "item-qr"
      ? "item"
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

  // In-memory Master datasets state to support runtime additions and hide toggles
  const [pphRecords, setPphRecords] = useState<PphRecord[]>(initialPphRecords);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>(initialSupplierRecords);
  const [paymentTermRecords, setPaymentTermRecords] = useState<PaymentTermRecord[]>(initialPaymentTermRecords);
  const [purchaseCategoryRecords, setPurchaseCategoryRecords] = useState<PurchaseCategoryRecord[]>(initialPurchaseCategoryRecords);
  const [deliveryTermRecords, setDeliveryTermRecords] = useState<DeliveryTermRecord[]>(initialDeliveryTermRecords);
  const [additionalCostRecords, setAdditionalCostRecords] = useState<AdditionalCostRecord[]>(initialAdditionalCostRecords);
  const [unitRecords, setUnitRecords] = useState<UnitRecord[]>(initialUnitRecords);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [classificationRecords, setClassificationRecords] = useState<ClassificationRecord[]>(initialClassificationRecords);
  const [editingClassification, setEditingClassification] = useState<ClassificationRecord | null>(null);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>(initialDepartmentRecords);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [brandRecords, setBrandRecords] = useState<BrandRecord[]>(initialBrandRecords);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [itemRecords, setItemRecords] = useState<ItemRecord[]>(initialItemRecords);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);

  const handleTogglePphHide = useCallback((id: string) => {
    setPphRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  const handleToggleSupplierHide = useCallback((id: string) => {
    setSupplierRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  const handleTogglePaymentTermHide = useCallback((id: string) => {
    setPaymentTermRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  const handleTogglePurchaseCategoryHide = useCallback((id: string) => {
    setPurchaseCategoryRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  const handleToggleDeliveryTermHide = useCallback((id: string) => {
    setDeliveryTermRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  const handleToggleAdditionalCostHide = useCallback((id: string) => {
    setAdditionalCostRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
  }, []);

  // Navigate to create new record view
  const handleNavigateCreate = useCallback((module: "warehouse" | "supplier" | "payment-term" | "purchase-category" | "delivery-terms" | "additional-costs" | "pph" | "unit" | "classification" | "department" | "brand" | "item") => {
    if (module === "item") {
      setEditingItem(null);
      const nextState: ViewState = { type: "item-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/item/create");
      }
      return;
    }

    if (module === "brand") {
      setEditingBrand(null);
      const nextState: ViewState = { type: "brand-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/brand/create");
      }
      return;
    }

    if (module === "department") {
      setEditingDepartment(null);
      const nextState: ViewState = { type: "department-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/department/create");
      }
      return;
    }

    if (module === "classification") {
      setEditingClassification(null);
      const nextState: ViewState = { type: "classification-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/classification/create");
      }
      return;
    }

    if (module === "unit") {
      setEditingUnit(null);
      const nextState: ViewState = { type: "unit-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/unit/create");
      }
      return;
    }

    if (module === "pph") {
      const nextState: ViewState = { type: "pph-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/pph/create");
      }
      return;
    }

    if (module === "additional-costs") {
      const nextState: ViewState = { type: "additional-costs-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/additional-costs/create");
      }
      return;
    }

    if (module === "delivery-terms") {
      const nextState: ViewState = { type: "delivery-terms-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/delivery-terms/create");
      }
      return;
    }

    if (module === "purchase-category") {
      const nextState: ViewState = { type: "purchase-category-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/purchase-category/create");
      }
      return;
    }

    if (module === "payment-term") {
      const nextState: ViewState = { type: "payment-term-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/payment-term/create");
      }
      return;
    }

    if (module === "supplier") {
      const nextState: ViewState = { type: "supplier-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/procurement/purchase-master/supplier/create");
      }
      return;
    }

    const nextState: ViewState = { type: "warehouse-create" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/incoming/receive-material-bpb/create");
    }
  }, []);

  const handleNavigateUnitEdit = useCallback((unit: UnitRecord) => {
    setEditingUnit(unit);
    const nextState: ViewState = { type: "unit-edit", record: unit };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/unit/create");
    }
  }, []);

  const handleSaveUnit = useCallback((record: UnitRecord, isEdit: boolean) => {
    if (isEdit) {
      setUnitRecords((prev) =>
        prev.map((u) => (u.id === record.id ? record : u))
      );
    } else {
      setUnitRecords((prev) => [record, ...prev]);
    }
    setEditingUnit(null);
    handleNavigateList("unit", "/exim/master/unit");
  }, [handleNavigateList]);

  const handleDeleteUnit = useCallback((id: string) => {
    setUnitRecords((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const handleNavigateClassificationEdit = useCallback((cls: ClassificationRecord) => {
    setEditingClassification(cls);
    const nextState: ViewState = { type: "classification-edit", record: cls };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/classification/create");
    }
  }, []);

  const handleSaveClassification = useCallback((record: ClassificationRecord, isEdit: boolean) => {
    if (isEdit) {
      setClassificationRecords((prev) =>
        prev.map((c) => (c.id === record.id ? record : c))
      );
    } else {
      setClassificationRecords((prev) => [record, ...prev]);
    }
    setEditingClassification(null);
    handleNavigateList("classification", "/exim/master/classification");
  }, [handleNavigateList]);

  const handleDeleteClassification = useCallback((id: string) => {
    setClassificationRecords((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleToggleClassificationStatus = useCallback((id: string) => {
    setClassificationRecords((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: !c.status } : c))
    );
  }, []);

  const handleNavigateDepartmentEdit = useCallback((dept: DepartmentRecord) => {
    setEditingDepartment(dept);
    const nextState: ViewState = { type: "department-edit", record: dept };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/department/create");
    }
  }, []);

  const handleSaveDepartment = useCallback((record: DepartmentRecord, isEdit: boolean) => {
    if (isEdit) {
      setDepartmentRecords((prev) =>
        prev.map((d) => (d.id === record.id ? record : d))
      );
    } else {
      setDepartmentRecords((prev) => [record, ...prev]);
    }
    setEditingDepartment(null);
    handleNavigateList("department", "/exim/master/department");
  }, [handleNavigateList]);

  const handleDeleteDepartment = useCallback((id: string) => {
    setDepartmentRecords((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const handleToggleDepartmentStatus = useCallback((id: string) => {
    setDepartmentRecords((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: !d.status } : d))
    );
  }, []);

  const handleNavigateBrandEdit = useCallback((brand: BrandRecord) => {
    setEditingBrand(brand);
    const nextState: ViewState = { type: "brand-edit", record: brand };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/brand/create");
    }
  }, []);

  const handleSaveBrand = useCallback((record: BrandRecord, isEdit: boolean) => {
    if (isEdit) {
      setBrandRecords((prev) =>
        prev.map((b) => (b.id === record.id ? record : b))
      );
    } else {
      setBrandRecords((prev) => [record, ...prev]);
    }
    setEditingBrand(null);
    handleNavigateList("brand", "/exim/master/brand");
  }, [handleNavigateList]);

  const handleDeleteBrand = useCallback((id: string) => {
    setBrandRecords((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleToggleBrandStatus = useCallback((id: string) => {
    setBrandRecords((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: !b.status } : b))
    );
  }, []);

  const handleNavigateGenerateQr = useCallback(() => {
    const nextState: ViewState = { type: "item-qr" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/item/qr");
    }
  }, []);

  const handleNavigateItemEdit = useCallback((item: ItemRecord) => {
    setEditingItem(item);
    const nextState: ViewState = { type: "item-edit", record: item };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/item/create");
    }
  }, []);

  const handleSaveItem = useCallback((record: ItemRecord, isEdit: boolean) => {
    if (isEdit) {
      setItemRecords((prev) =>
        prev.map((i) => (i.id === record.id ? record : i))
      );
    } else {
      setItemRecords((prev) => [record, ...prev]);
    }
    setEditingItem(null);
    handleNavigateList("item", "/exim/master/item");
  }, [handleNavigateList]);

  const handleDeleteItem = useCallback((id: string) => {
    setItemRecords((prev) => prev.filter((i) => i.id !== id));
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

        {/* Purchase Requisition Report */}
        {viewState.type === "list" && viewState.page === "pr-report" && (
          <PurchaseRequisitionReport
            onDetail={(prNumber: string) =>
              handleNavigateDetail("pr", prNumber)
            }
          />
        )}

        {/* Reporting Purchase Order */}
        {viewState.type === "list" && viewState.page === "po-report" && (
          <ReportingPurchaseOrder
            onDetail={(poNumber: string) =>
              handleNavigateDetail("po", poNumber)
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

        {/* Supplier Master Listing */}
        {viewState.type === "list" && viewState.page === "supplier" && (
          <SupplierIndex
            records={supplierRecords}
            onToggleHide={handleToggleSupplierHide}
            onAddNew={() => handleNavigateCreate("supplier")}
          />
        )}

        {/* Payment Term Listing */}
        {viewState.type === "list" && viewState.page === "payment-term" && (
          <PaymentTermIndex
            records={paymentTermRecords}
            onToggleHide={handleTogglePaymentTermHide}
            onAddNew={() => handleNavigateCreate("payment-term")}
          />
        )}

        {/* Purchase Category Listing */}
        {viewState.type === "list" && viewState.page === "purchase-category" && (
          <PurchaseCategoryIndex
            records={purchaseCategoryRecords}
            onToggleHide={handleTogglePurchaseCategoryHide}
            onAddNew={() => handleNavigateCreate("purchase-category")}
          />
        )}

        {/* Delivery Terms Listing */}
        {viewState.type === "list" && viewState.page === "delivery-terms" && (
          <DeliveryTermsIndex
            records={deliveryTermRecords}
            onToggleHide={handleToggleDeliveryTermHide}
            onAddNew={() => handleNavigateCreate("delivery-terms")}
          />
        )}

        {/* Additional Costs Listing */}
        {viewState.type === "list" && viewState.page === "additional-costs" && (
          <AdditionalCostsIndex
            records={additionalCostRecords}
            onToggleHide={handleToggleAdditionalCostHide}
            onAddNew={() => handleNavigateCreate("additional-costs")}
          />
        )}

        {/* PPH Listing */}
        {viewState.type === "list" && viewState.page === "pph" && (
          <PphIndex
            records={pphRecords}
            onToggleHide={handleTogglePphHide}
            onAddNew={() => handleNavigateCreate("pph")}
          />
        )}

        {/* Exim Unit Master Listing */}
        {viewState.type === "list" && viewState.page === "unit" && (
          <UnitIndex
            records={unitRecords}
            onAddNew={() => handleNavigateCreate("unit")}
            onEdit={handleNavigateUnitEdit}
            onDelete={handleDeleteUnit}
          />
        )}

        {/* Exim Unit Reference (Satuan) Listing */}
        {viewState.type === "list" && (viewState.page === "satuan" || (viewState.page as string) === "unit-reference") && (
          <UnitReferenceIndex />
        )}

        {/* Exim Master Classification Listing */}
        {viewState.type === "list" && viewState.page === "classification" && (
          <ClassificationIndex
            records={classificationRecords}
            onAddNew={() => handleNavigateCreate("classification")}
            onEdit={handleNavigateClassificationEdit}
            onDelete={handleDeleteClassification}
            onToggleStatus={handleToggleClassificationStatus}
          />
        )}

        {/* Exim Master Department Listing */}
        {viewState.type === "list" && viewState.page === "department" && (
          <DepartmentIndex
            records={departmentRecords}
            onAddNew={() => handleNavigateCreate("department")}
            onEdit={handleNavigateDepartmentEdit}
            onDelete={handleDeleteDepartment}
            onToggleStatus={handleToggleDepartmentStatus}
          />
        )}

        {/* Exim Master Brand Listing */}
        {viewState.type === "list" && viewState.page === "brand" && (
          <BrandIndex
            records={brandRecords}
            onAddNew={() => handleNavigateCreate("brand")}
            onEdit={handleNavigateBrandEdit}
            onDelete={handleDeleteBrand}
            onToggleStatus={handleToggleBrandStatus}
          />
        )}

        {/* Exim Master Item Listing */}
        {viewState.type === "list" && viewState.page === "item" && (
          <ItemIndex
            records={itemRecords}
            onAddNew={() => handleNavigateCreate("item")}
            onGenerateQr={handleNavigateGenerateQr}
            onEdit={handleNavigateItemEdit}
            onDelete={handleDeleteItem}
          />
        )}

        {/* New Lightweight Placeholder Pages */}
        {viewState.type === "list" &&
          viewState.page !== "pr" &&
          viewState.page !== "po" &&
          viewState.page !== "report" &&
          viewState.page !== "pr-report" &&
          viewState.page !== "po-report" &&
          viewState.page !== "warehouse" &&
          viewState.page !== "supplier" &&
          viewState.page !== "payment-term" &&
          viewState.page !== "purchase-category" &&
          viewState.page !== "delivery-terms" &&
          viewState.page !== "additional-costs" &&
          viewState.page !== "pph" &&
          viewState.page !== "unit" &&
          viewState.page !== "satuan" &&
          viewState.page !== "unit-reference" &&
          viewState.page !== "classification" &&
          viewState.page !== "department" &&
          viewState.page !== "brand" &&
          viewState.page !== "item" &&
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

        {/* Dedicated Full Page Create Views */}
        {viewState.type === "warehouse-create" && (
          <WarehouseCreate
            onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
            onSaved={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
          />
        )}

        {viewState.type === "supplier-create" && (
          <SupplierForm
            onBack={() => handleNavigateList("supplier", "/procurement/purchase-master/supplier")}
          />
        )}

        {viewState.type === "payment-term-create" && (
          <PaymentTermForm
            onBack={() => handleNavigateList("payment-term", "/procurement/purchase-master/payment-term")}
          />
        )}

        {viewState.type === "purchase-category-create" && (
          <PurchaseCategoryForm
            onBack={() => handleNavigateList("purchase-category", "/procurement/purchase-master/purchase-category")}
          />
        )}

        {viewState.type === "delivery-terms-create" && (
          <DeliveryTermsForm
            onBack={() => handleNavigateList("delivery-terms", "/procurement/purchase-master/delivery-terms")}
          />
        )}

        {viewState.type === "additional-costs-create" && (
          <AdditionalCostsForm
            onBack={() => handleNavigateList("additional-costs", "/procurement/purchase-master/additional-costs")}
          />
        )}

        {viewState.type === "pph-create" && (
          <PphForm
            onBack={() => handleNavigateList("pph", "/procurement/purchase-master/pph")}
            onSave={(newRec) => {
              setPphRecords((prev) => [newRec, ...prev]);
              handleNavigateList("pph", "/procurement/purchase-master/pph");
            }}
          />
        )}

        {/* Dedicated Exim Unit Form (Add / Edit) */}
        {(viewState.type === "unit-create" || viewState.type === "unit-edit") && (
          <UnitForm
            initialRecord={
              viewState.type === "unit-edit" && viewState.record
                ? viewState.record
                : editingUnit
            }
            onBack={() => {
              setEditingUnit(null);
              handleNavigateList("unit", "/exim/master/unit");
            }}
            onSave={handleSaveUnit}
          />
        )}

        {/* Dedicated Exim Classification Form (Add / Edit) */}
        {(viewState.type === "classification-create" || viewState.type === "classification-edit") && (
          <ClassificationForm
            initialRecord={
              viewState.type === "classification-edit" && viewState.record
                ? viewState.record
                : editingClassification
            }
            onBack={() => {
              setEditingClassification(null);
              handleNavigateList("classification", "/exim/master/classification");
            }}
            onSave={handleSaveClassification}
          />
        )}

        {/* Dedicated Exim Department Form (Add / Edit) */}
        {(viewState.type === "department-create" || viewState.type === "department-edit") && (
          <DepartmentForm
            initialRecord={
              viewState.type === "department-edit" && viewState.record
                ? viewState.record
                : editingDepartment
            }
            onBack={() => {
              setEditingDepartment(null);
              handleNavigateList("department", "/exim/master/department");
            }}
            onSave={handleSaveDepartment}
          />
        )}

        {/* Dedicated Exim Brand Form (Add / Edit) */}
        {(viewState.type === "brand-create" || viewState.type === "brand-edit") && (
          <BrandForm
            initialRecord={
              viewState.type === "brand-edit" && viewState.record
                ? viewState.record
                : editingBrand
            }
            onBack={() => {
              setEditingBrand(null);
              handleNavigateList("brand", "/exim/master/brand");
            }}
            onSave={handleSaveBrand}
          />
        )}

        {/* Dedicated Exim Item Form (Add / Edit) */}
        {(viewState.type === "item-create" || viewState.type === "item-edit") && (
          <ItemForm
            initialRecord={
              viewState.type === "item-edit" && viewState.record
                ? viewState.record
                : editingItem
            }
            onBack={() => {
              setEditingItem(null);
              handleNavigateList("item", "/exim/master/item");
            }}
            onSave={handleSaveItem}
          />
        )}

        {/* Dedicated Generate QR Code Page */}
        {viewState.type === "item-qr" && (
          <GenerateQrCodePage
            allItems={itemRecords}
            onCancel={() => handleNavigateList("item", "/exim/master/item")}
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
