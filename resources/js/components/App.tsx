import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "./layout/AppLayout";
import { Login } from "../pages";
import { AppViewRenderer } from "./AppViewRenderer";
import {
  resolveViewStateFromPath,
  resolveInitialViewState,
  resolveActiveSidebarPage,
  resolveTargetPathForPage,
} from "./appRoutes";
import type { RequestMaterialRecord } from "../pages/Warehouse/Request/RequestMaterial/request-material-types";
import type { StockNotificationRecord } from "../pages/Dashboard/StockNotificationMaster/stock-notification-types";
import type { TypeOfRequestRecord } from "../pages/Warehouse/Master/TypeOfRequest/type-of-request-types";
import type { DestinationLocationRecord } from "../pages/Warehouse/Master/DestinationLocation/destination-location-types";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { pageMeta } from "../config/pageMeta";
import { docToSlug } from "../utils/docSlug";
import { navigationConfig } from "../config/navigation";
import { useAuthPermission } from "../context/AuthPermissionContext";
import type { PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import type { SupplierRecord } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import type { PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import type { DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import type { AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import type { ClassificationRecord } from "../pages/Exim/Master/Classification/classification-types";
import type { DepartmentRecord } from "../pages/Exim/Master/Department/department-types";
import type { BrandRecord } from "../pages/Exim/Master/Brand/brand-types";
import type { FacilityRecord } from "../pages/Exim/Master/Facility/facility-types";
import type { HsRecord } from "../pages/Exim/Master/Hs/hs-types";
import type { CategoryRecord } from "../pages/Exim/Master/Category/category-types";
import type { StyleRecord } from "../pages/Exim/Master/Style/style-types";
import type { ColorRecord } from "../pages/Exim/Master/Color/color-types";
import type { ReceiveNoteRecord } from "../pages/Exim/ReceiveNote/receive-note-types";
import type { ReceiveNoteReturnRecord } from "../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import type { DocumentHistoryRecord } from "../pages/Exim/DocumentHistory/document-history-types";
import type {
  WarehouseMasterRecord,
  WarehouseCoordinateRecord,
} from "../pages/Warehouse/MasterWarehouse/warehouse-master-types";
import type { ItemRecord } from "../pages/Exim/Master/Item/item-types";
import type { SupplierFormData } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { CountryRecord } from "../pages/Exim/Master/Country/country-types";
import type { AccountRecord } from "../pages/Exim/Master/Account/account-types";
import type { JobNumberRecord } from "../pages/Procurement/PurchaseMaster/JobNumber/job-number-types";
import type { RafaksiTypeRecord } from "../pages/Procurement/PurchaseMaster/RafaksiType/rafaksi-type-types";
import type { CurrencyRecord } from "../pages/Exim/Master/Currency/currency-types";
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";
import type { PageKey, ViewState, TableRow } from "../types";
import {
  fetchMasterSuppliers,
  saveSupplierApi,
  toggleSupplierStatusApi,
  fetchMasterPaymentTerms,
  savePaymentTermApi,
  togglePaymentTermStatusApi,
  fetchMasterPurchaseCategories,
  savePurchaseCategoryApi,
  togglePurchaseCategoryStatusApi,
  fetchMasterDeliveryTerms,
  saveDeliveryTermApi,
  toggleDeliveryTermStatusApi,
  fetchMasterAdditionalCosts,
  saveAdditionalCostApi,
  toggleAdditionalCostStatusApi,
  fetchMasterPph,
  savePphApi,
  togglePphStatusApi,
  fetchMasterUnits,
  saveUnitApi,
  deleteUnitApi,
  fetchMasterBrands,
  saveBrandApi,
  toggleBrandStatusApi,
  deleteBrandApi,
  fetchMasterClassifications,
  saveClassificationApi,
  toggleClassificationStatusApi,
  deleteClassificationApi,
  fetchMasterDepartments,
  saveDepartmentApi,
  toggleDepartmentStatusApi,
  deleteDepartmentApi,
  fetchMasterFacilities,
  saveFacilityApi,
  toggleFacilityStatusApi,
  deleteFacilityApi,
  fetchMasterHsCodes,
  saveHsApi,
  deleteHsApi,
  fetchMasterCategories,
  saveCategoryApi,
  toggleCategoryStatusApi,
  deleteCategoryApi,
  fetchMasterStyles,
  saveStyleApi,
  toggleStyleStatusApi,
  deleteStyleApi,
  fetchMasterColours,
  saveColorApi,
  fetchMasterItems,
  saveItemApi,
  deleteItemApi,
  fetchMasterWarehouses,
  saveWarehouseMasterApi,
  saveWarehouseCoordinateApi,
  deleteWarehouseCoordinateApi,
  fetchMasterCountries,
  saveCountryApi,
  deleteCountryApi,
  fetchMasterRafaksiTypes,
  saveRafaksiTypeApi,
  deleteRafaksiTypeApi,
  fetchMasterCurrencies,
  saveCurrencyApi,
  deleteCurrencyApi,
  fetchMasterAccounts,
  saveAccountApi,
  deleteAccountApi,
  fetchMasterJobNumbers,
  saveJobNumberApi,
  deleteJobNumberApi,
  fetchMasterReceiveNotes,
  fetchMasterReceiveNoteReturns,
  saveReceiveNoteReturnApi,
  fetchMasterDocumentHistories,
  fetchMasterUnitReferences,
  fetchRequestMaterials,
  saveRequestMaterialApi,
  fetchStockNotificationsApi,
  saveStockNotificationApi,
  deleteStockNotificationApi,
  fetchWarehouseTypesOfRequestApi,
  saveWarehouseTypeOfRequestApi,
  deleteWarehouseTypeOfRequestApi,
  fetchDestinationLocationsApi,
  saveDestinationLocationApi,
  deleteDestinationLocationApi,
} from "../data/masterApi";
import { createReceiveNote } from "../data/api";

interface AppProps {
  initialPage?: string;
  initialCode?: string;
}

export function App({ initialPage = "dashboard", initialCode = "" }: AppProps) {
  const { isAuthenticated, authReady, logoutUser } = useAuthPermission();
  const [viewState, setViewState] = useState<ViewState>(() =>
    resolveInitialViewState(initialPage, initialCode)
  );

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Calculate corresponding active sidebar section
  const activeSidebarPage: PageKey | null = resolveActiveSidebarPage(viewState);

  const isDetailPage = viewState.type !== "list" && viewState.type !== "dashboard";
  const hideDefaultHeader = isDetailPage;

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
    const { nextState, path } = resolveTargetPathForPage(targetPage, targetPath);
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
      let nextState: ViewState = { type: "dashboard" };

      switch (module) {
        case "pr":
          nextState = { type: "pr-detail", code: slug };
          targetPath = `/procurement/transactions/purchase-requisition/detail/${slug}`;
          break;
        case "po":
          nextState = { type: "po-detail", code: slug };
          targetPath = `/procurement/transactions/purchase-order/detail/${slug}`;
          break;
        case "po-create" as any:
          nextState = { type: "po-create", prNumber: identifier };
          targetPath = `/procurement/transactions/purchase-order/create?pr=${encodeURIComponent(identifier)}`;
          break;
        case "report":
          nextState = { type: "report-detail", code: slug };
          targetPath = `/procurement/reports/report-pr-po/detail/${slug}`;
          break;
        case "warehouse":
          nextState = { type: "warehouse-detail", code: slug };
          targetPath = `/warehouse/incoming/receive-material-bpb/detail/${slug}`;
          break;
        case "warehouse-create" as any:
          nextState = { type: "warehouse-create", poNumber: identifier };
          targetPath = `/warehouse/incoming/receive-material-bpb/create?po=${encodeURIComponent(identifier)}`;
          break;
        case "receive-note-create" as any:
          nextState = { type: "receive-note-create" };
          targetPath = "/exim/receive-note/create";
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

  // Master & transaction datasets state synchronized from backend database
  const [pphRecords, setPphRecords] = useState<PphRecord[]>([]);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>([]);
  const [paymentTermRecords, setPaymentTermRecords] = useState<PaymentTermRecord[]>([]);
  const [purchaseCategoryRecords, setPurchaseCategoryRecords] = useState<PurchaseCategoryRecord[]>([]);
  const [deliveryTermRecords, setDeliveryTermRecords] = useState<DeliveryTermRecord[]>([]);
  const [additionalCostRecords, setAdditionalCostRecords] = useState<AdditionalCostRecord[]>([]);
  const [unitRecords, setUnitRecords] = useState<UnitRecord[]>([]);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [classificationRecords, setClassificationRecords] = useState<ClassificationRecord[]>([]);
  const [editingClassification, setEditingClassification] = useState<ClassificationRecord | null>(null);
  const [departmentRecords, setDepartmentRecords] = useState<DepartmentRecord[]>([]);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [brandRecords, setBrandRecords] = useState<BrandRecord[]>([]);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);
  const [facilityRecords, setFacilityRecords] = useState<FacilityRecord[]>([]);
  const [editingFacility, setEditingFacility] = useState<FacilityRecord | null>(null);
  const [hsRecords, setHsRecords] = useState<HsRecord[]>([]);
  const [editingHs, setEditingHs] = useState<HsRecord | null>(null);
  const [categoryRecords, setCategoryRecords] = useState<CategoryRecord[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [styleRecords, setStyleRecords] = useState<StyleRecord[]>([]);
  const [editingStyle, setEditingStyle] = useState<StyleRecord | null>(null);
  const [colorRecords, setColorRecords] = useState<ColorRecord[]>([]);
  const [receiveNoteRecords, setReceiveNoteRecords] = useState<ReceiveNoteRecord[]>([]);
  const [receiveNoteReturnRecords, setReceiveNoteReturnRecords] = useState<ReceiveNoteReturnRecord[]>([]);
  const [documentHistoryRecords, setDocumentHistoryRecords] = useState<DocumentHistoryRecord[]>([]);
  const [warehouseMasterRecords, setWarehouseMasterRecords] = useState<WarehouseMasterRecord[]>([]);
  const [itemRecords, setItemRecords] = useState<ItemRecord[]>([]);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const [countryRecords, setCountryRecords] = useState<CountryRecord[]>([]);
  const [accountRecords, setAccountRecords] = useState<AccountRecord[]>([]);
  const [jobNumberRecords, setJobNumberRecords] = useState<JobNumberRecord[]>([]);
  const [rafaksiTypeRecords, setRafaksiTypeRecords] = useState<RafaksiTypeRecord[]>([]);
  const [currencyRecords, setCurrencyRecords] = useState<CurrencyRecord[]>([]);
  const [unitReferenceRecords, setUnitReferenceRecords] = useState<UnitReferenceRecord[]>([]);
  const [requestMaterialRecords, setRequestMaterialRecords] = useState<RequestMaterialRecord[]>([]);
  const [stockNotificationRecords, setStockNotificationRecords] = useState<StockNotificationRecord[]>([]);
  const [editingStockNotification, setEditingStockNotification] = useState<StockNotificationRecord | null>(null);
  const [typeOfRequestRecords, setTypeOfRequestRecords] = useState<TypeOfRequestRecord[]>([]);
  const [editingTypeOfRequest, setEditingTypeOfRequest] = useState<TypeOfRequestRecord | null>(null);
  const [destinationLocationRecords, setDestinationLocationRecords] = useState<DestinationLocationRecord[]>([]);
  const [editingDestinationLocation, setEditingDestinationLocation] = useState<DestinationLocationRecord | null>(null);

  const loadedPagesRef = useRef<Set<string>>(new Set());

  // On-demand route-based database synchronization
  useEffect(() => {
    let isMounted = true;
    const page = viewState.type === "list" ? viewState.page : undefined;
    const type = viewState.type;

    const loadOnce = (key: string, fetcher: () => Promise<any[] | null>, setter: (data: any[]) => void) => {
      if (loadedPagesRef.current.has(key)) return;
      loadedPagesRef.current.add(key);
      fetcher().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setter(data);
        }
      });
    };

    if (page === "supplier" || type === "supplier-create") {
      loadOnce("suppliers", fetchMasterSuppliers, setSupplierRecords);
    }
    if (page === "payment-term" || type === "payment-term-create") {
      loadOnce("payment-terms", fetchMasterPaymentTerms, setPaymentTermRecords);
    }
    if (page === "purchase-category" || type === "purchase-category-create") {
      loadOnce("purchase-categories", fetchMasterPurchaseCategories, setPurchaseCategoryRecords);
    }
    if (page === "delivery-terms" || type === "delivery-terms-create") {
      loadOnce("delivery-terms", fetchMasterDeliveryTerms, setDeliveryTermRecords);
    }
    if (page === "additional-costs" || type === "additional-costs-create" || type === "po-create") {
      loadOnce("additional-costs", fetchMasterAdditionalCosts, setAdditionalCostRecords);
    }
    if (page === "pph" || type === "pph-create") {
      loadOnce("pph", fetchMasterPph, setPphRecords);
    }
    if (page === "unit" || type === "unit-create" || type === "unit-edit") {
      loadOnce("units", fetchMasterUnits, setUnitRecords);
    }
    if (page === "satuan" || page === "unit-reference") {
      loadOnce("unit-references", fetchMasterUnitReferences, setUnitReferenceRecords);
    }
    if (page === "classification" || type === "classification-create" || type === "classification-edit") {
      loadOnce("classifications", fetchMasterClassifications, setClassificationRecords);
    }
    if (page === "department" || type === "department-create" || type === "department-edit") {
      loadOnce("departments", fetchMasterDepartments, setDepartmentRecords);
    }
    if (page === "brand" || type === "brand-create" || type === "brand-edit") {
      loadOnce("brands", fetchMasterBrands, setBrandRecords);
    }
    if (page === "facility" || type === "facility-create" || type === "facility-edit") {
      loadOnce("facilities", fetchMasterFacilities, setFacilityRecords);
    }
    if (page === "hs" || type === "hs-create" || type === "hs-edit") {
      loadOnce("hs-codes", fetchMasterHsCodes, setHsRecords);
    }
    if (page === "category" || type === "category-create" || type === "category-edit") {
      loadOnce("categories", fetchMasterCategories, setCategoryRecords);
    }
    if (page === "style" || type === "style-create" || type === "style-edit") {
      loadOnce("styles", fetchMasterStyles, setStyleRecords);
    }
    if (page === "colour" || type === "colour-create") {
      loadOnce("colours", fetchMasterColours, setColorRecords);
    }
    if (page === "item" || type === "item-create" || type === "item-edit" || type === "item-qr" || type === "pr-create" || type === "po-create") {
      loadOnce("items", fetchMasterItems, setItemRecords);
    }
    if (
      page === "warehouse-master" ||
      type === "warehouse-coordinate" ||
      type === "warehouse-master-create" ||
      type === "warehouse-coordinate-create"
    ) {
      loadOnce("warehouses", fetchMasterWarehouses, setWarehouseMasterRecords);
    }
    if (page === "country") {
      loadOnce("countries", fetchMasterCountries, setCountryRecords);
    }
    if (page === "rafaksi-type") {
      loadOnce("rafaksi-types", fetchMasterRafaksiTypes, setRafaksiTypeRecords);
    }
    if (page === "currency") {
      loadOnce("currencies", fetchMasterCurrencies, setCurrencyRecords);
    }
    if (page === "account") {
      loadOnce("accounts", fetchMasterAccounts, setAccountRecords);
    }
    if (page === "job-number" || type === "pr-create") {
      loadOnce("job-numbers", fetchMasterJobNumbers, setJobNumberRecords);
    }
    if (page === "receive-note" || type === "receive-note-detail" || type === "receive-note-create" || type === "dashboard") {
      fetchMasterReceiveNotes().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setReceiveNoteRecords(data);
        }
      });
    }
    if (page === "receive-note-return" || type === "receive-note-return-detail" || type === "receive-note-return-create") {
      fetchMasterReceiveNoteReturns().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setReceiveNoteReturnRecords(data);
        }
      });
    }
    if (page === "document-history" || type === "document-history-detail") {
      fetchMasterDocumentHistories().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDocumentHistoryRecords(data);
        }
      });
    }
    if (page === "wh-req-material" || type === "wh-req-material-detail" || type === "wh-req-material-create" || type === "dashboard") {
      fetchRequestMaterials().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setRequestMaterialRecords(data);
        }
      });
    }
    if (page === "stock-notification-master" || type === "stock-notification-create" || type === "stock-notification-edit") {
      fetchStockNotificationsApi().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setStockNotificationRecords(data);
        }
      });
    }
    if (page === "wh-type-of-request" || type === "wh-type-of-request-create" || type === "wh-type-of-request-edit" || type === "wh-req-material-create") {
      fetchWarehouseTypesOfRequestApi().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setTypeOfRequestRecords(data);
        }
      });
    }
    if (page === "wh-destination-location" || type === "wh-destination-location-create" || type === "wh-destination-location-edit" || type === "wh-req-material-create") {
      fetchDestinationLocationsApi().then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDestinationLocationRecords(data);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [viewState]);

  // Synchronize shared React state whenever any document approval changes (e.g. Dashboard Quick Approve)
  useEffect(() => {
    const handleApprovalChanged = () => {
      fetchMasterReceiveNotes().then((data) => {
        if (Array.isArray(data)) setReceiveNoteRecords(data);
      }).catch(() => { });
      fetchRequestMaterials().then((data) => {
        if (Array.isArray(data)) setRequestMaterialRecords(data);
      }).catch(() => { });
    };
    window.addEventListener("geniusone_approval_changed", handleApprovalChanged);
    return () => window.removeEventListener("geniusone_approval_changed", handleApprovalChanged);
  }, []);

  const handleTogglePphHide = useCallback((id: string) => {
    setPphRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        togglePphStatusApi(id, Boolean(target.hidden)).catch(console.warn);
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleToggleSupplierHide = useCallback((id: string) => {
    setSupplierRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        toggleSupplierStatusApi(id, Boolean(target.hidden)).catch((err) => {
          console.error("Failed to toggle supplier status:", err);
        });
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleTogglePaymentTermHide = useCallback((id: string) => {
    setPaymentTermRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        togglePaymentTermStatusApi(id, Boolean(target.hidden)).catch(console.warn);
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleTogglePurchaseCategoryHide = useCallback((id: string) => {
    setPurchaseCategoryRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        togglePurchaseCategoryStatusApi(id, Boolean(target.hidden)).catch(console.warn);
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleToggleDeliveryTermHide = useCallback((id: string) => {
    setDeliveryTermRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        toggleDeliveryTermStatusApi(id, Boolean(target.hidden)).catch(console.warn);
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleToggleAdditionalCostHide = useCallback((id: string) => {
    setAdditionalCostRecords((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        toggleAdditionalCostStatusApi(id, Boolean(target.hidden)).catch(console.warn);
      }
      return prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r));
    });
  }, []);

  const handleSaveSupplier = useCallback(
    async (formData: SupplierFormData) => {
      try {
        const saved = await saveSupplierApi(formData);
        if (saved) {
          setSupplierRecords((prev) => [saved, ...prev.map((s, idx) => ({ ...s, no: idx + 2 }))]);
        }
        handleNavigateList("supplier", "/procurement/purchase-master/supplier");
      } catch (err) {
        console.error("Failed to persist supplier to backend:", err);
        throw err;
      }
    },
    [handleNavigateList]
  );

  const handleSavePaymentTerm = useCallback(
    async (data: { name: string }) => {
      try {
        const saved = await savePaymentTermApi(data.name);
        if (saved) {
          setPaymentTermRecords((prev) => [saved, ...prev.map((p, idx) => ({ ...p, no: idx + 2 }))]);
        }
        handleNavigateList("payment-term", "/procurement/purchase-master/payment-term");
      } catch (err) {
        console.error("Failed to persist payment term to backend:", err);
        alert(err instanceof Error ? err.message : "Failed to save Payment Term.");
      }
    },
    [handleNavigateList]
  );

  const handleSavePurchaseCategory = useCallback(
    async (data: { code: string; name: string }) => {
      try {
        const saved = await savePurchaseCategoryApi(data.code, data.name);
        if (saved) {
          setPurchaseCategoryRecords((prev) => [saved, ...prev.map((c, idx) => ({ ...c, no: idx + 2 }))]);
        }
        handleNavigateList("purchase-category", "/procurement/purchase-master/purchase-category");
      } catch (err) {
        console.error("Failed to persist purchase category to backend:", err);
        alert(err instanceof Error ? err.message : "Failed to save Purchase Category.");
      }
    },
    [handleNavigateList]
  );

  const handleSaveDeliveryTerm = useCallback(
    async (data: { name: string }) => {
      try {
        const saved = await saveDeliveryTermApi(data.name);
        if (saved) {
          setDeliveryTermRecords((prev) => [saved, ...prev.map((d, idx) => ({ ...d, no: idx + 2 }))]);
        }
        handleNavigateList("delivery-terms", "/procurement/purchase-master/delivery-terms");
      } catch (err) {
        console.error("Failed to persist delivery term to backend:", err);
        alert(err instanceof Error ? err.message : "Failed to save Delivery Term.");
      }
    },
    [handleNavigateList]
  );

  const handleSaveAdditionalCost = useCallback(
    async (data: { code: string; name: string }) => {
      try {
        const saved = await saveAdditionalCostApi(data.code, data.name);
        if (saved) {
          setAdditionalCostRecords((prev) => [saved, ...prev.map((a, idx) => ({ ...a, no: idx + 2 }))]);
        }
        handleNavigateList("additional-costs", "/procurement/purchase-master/additional-costs");
      } catch (err) {
        console.error("Failed to persist additional cost to backend:", err);
        alert(err instanceof Error ? err.message : "Failed to save Additional Cost.");
      }
    },
    [handleNavigateList]
  );

  const handleSavePph = useCallback(
    async (newRec: PphRecord) => {
      try {
        const saved = await savePphApi(newRec);
        if (saved) {
          setPphRecords((prev) => [saved, ...prev]);
        }
        handleNavigateList("pph", "/procurement/purchase-master/pph");
      } catch (err) {
        console.error("Failed to persist PPH to backend:", err);
        alert(err instanceof Error ? err.message : "Failed to save PPH record.");
      }
    },
    [handleNavigateList]
  );

  const handleNavigatePrCreate = useCallback(() => {
    const nextState: ViewState = { type: "pr-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/procurement/transactions/purchase-requisition/create");
    }
  }, []);

  const handleNavigatePoCreate = useCallback(() => {
    const nextState: ViewState = { type: "po-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/procurement/transactions/purchase-order/create");
    }
  }, []);

  const handleNavigateRequestMaterialCreate = useCallback(() => {
    const nextState: ViewState = { type: "wh-req-material-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/request/request-material/create");
    }
  }, []);

  const handleNavigateRequestMaterialDetail = useCallback((id: string) => {
    const cleanId = id.replace(/^details?\//i, "").trim();
    const slug = docToSlug(cleanId);
    const nextState: ViewState = { type: "wh-req-material-detail", id: cleanId };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/request/request-material/detail/${slug}`);
    }
  }, []);

  const handleSaveRequestMaterial = useCallback(async (newRecord: RequestMaterialRecord) => {
    try {
      await saveRequestMaterialApi(newRecord);
      const updated = await fetchRequestMaterials();
      if (Array.isArray(updated)) {
        setRequestMaterialRecords(updated);
      }
      const nextState: ViewState = { type: "list", page: "wh-req-material" };
      setViewState(nextState);
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/warehouse/request/request-material");
      }
    } catch (err) {
      console.error("Failed to save Request Material:", err);
      throw err;
    }
  }, []);

  // Navigate to create new record view
  const handleNavigateCreate = useCallback((
    module: "warehouse" | "supplier" | "payment-term" | "purchase-category" | "delivery-terms" | "additional-costs" | "pph" | "unit" | "classification" | "department" | "brand" | "facility" | "hs" | "category" | "style" | "colour" | "color" | "item" | "receive-note" | "receive-note-return",
    poNumber?: string,
    rnNumber?: string
  ) => {
    const resetEditingMap: Partial<Record<typeof module, () => void>> = {
      item: () => setEditingItem(null),
      style: () => setEditingStyle(null),
      category: () => setEditingCategory(null),
      hs: () => setEditingHs(null),
      facility: () => setEditingFacility(null),
      brand: () => setEditingBrand(null),
      department: () => setEditingDepartment(null),
      classification: () => setEditingClassification(null),
      unit: () => setEditingUnit(null),
    };
    resetEditingMap[module]?.();

    const routeMap: Partial<Record<typeof module, { state: ViewState; path: string }>> = {
      "receive-note-return": { state: { type: "receive-note-return-create" }, path: "/exim/receive-note-return/create" },
      "receive-note": { state: { type: "receive-note-create" }, path: "/exim/receive-note/create" },
      item: { state: { type: "item-create" }, path: "/exim/master/item/create" },
      colour: { state: { type: "colour-create" }, path: "/exim/master/colour/create" },
      color: { state: { type: "colour-create" }, path: "/exim/master/colour/create" },
      style: { state: { type: "style-create" }, path: "/exim/master/style/create" },
      category: { state: { type: "category-create" }, path: "/exim/master/category/create" },
      hs: { state: { type: "hs-create" }, path: "/exim/master/hs/create" },
      facility: { state: { type: "facility-create" }, path: "/exim/master/facility/create" },
      brand: { state: { type: "brand-create" }, path: "/exim/master/brand/create" },
      department: { state: { type: "department-create" }, path: "/exim/master/department/create" },
      classification: { state: { type: "classification-create" }, path: "/exim/master/classification/create" },
      unit: { state: { type: "unit-create" }, path: "/exim/master/unit/create" },
      pph: { state: { type: "pph-create" }, path: "/procurement/purchase-master/pph/create" },
      "additional-costs": { state: { type: "additional-costs-create" }, path: "/procurement/purchase-master/additional-costs/create" },
      "delivery-terms": { state: { type: "delivery-terms-create" }, path: "/procurement/purchase-master/delivery-terms/create" },
      "purchase-category": { state: { type: "purchase-category-create" }, path: "/procurement/purchase-master/purchase-category/create" },
      "payment-term": { state: { type: "payment-term-create" }, path: "/procurement/purchase-master/payment-term/create" },
      supplier: { state: { type: "supplier-create" }, path: "/procurement/purchase-master/supplier/create" },
    };

    const mapped = routeMap[module];
    if (mapped) {
      setViewState(mapped.state);
      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(mapped.state, "", mapped.path);
      }
      return;
    }

    const nextState: ViewState = { type: "warehouse-create", poNumber, rnNumber };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      const queryParams: string[] = [];
      if (poNumber) queryParams.push(`po=${encodeURIComponent(poNumber)}`);
      if (rnNumber) queryParams.push(`rn=${encodeURIComponent(rnNumber)}`);
      const q = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      window.history.pushState(nextState, "", `/warehouse/incoming/receive-material-bpb/create${q}`);
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

  const handleSaveUnit = useCallback(
    async (record: UnitRecord, isEdit: boolean) => {
      try {
        const saved = await saveUnitApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setUnitRecords((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
          } else {
            setUnitRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingUnit(null);
        handleNavigateList("unit", "/exim/master/unit");
      } catch (err) {
        console.error("Unit API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Unit.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteUnit = useCallback(async (id: string) => {
    try {
      await deleteUnitApi(id);
      setUnitRecords((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Unit API delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Unit.");
    }
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

  const handleSaveClassification = useCallback(
    async (record: ClassificationRecord, isEdit: boolean) => {
      try {
        const saved = await saveClassificationApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setClassificationRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setClassificationRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingClassification(null);
        handleNavigateList("classification", "/exim/master/classification");
      } catch (err) {
        console.error("Classification API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Classification.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteClassification = useCallback(async (id: string) => {
    try {
      await deleteClassificationApi(id);
      setClassificationRecords((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Classification delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Classification.");
    }
  }, []);

  const handleToggleClassificationStatus = useCallback((id: string) => {
    setClassificationRecords((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) {
        toggleClassificationStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((c) => (c.id === id ? { ...c, status: !c.status } : c));
    });
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

  const handleSaveDepartment = useCallback(
    async (record: DepartmentRecord, isEdit: boolean) => {
      try {
        const saved = await saveDepartmentApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setDepartmentRecords((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
          } else {
            setDepartmentRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingDepartment(null);
        handleNavigateList("department", "/exim/master/department");
      } catch (err) {
        console.error("Department API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Department.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteDepartment = useCallback(async (id: string) => {
    try {
      await deleteDepartmentApi(id);
      setDepartmentRecords((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Department delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Department.");
    }
  }, []);

  const handleToggleDepartmentStatus = useCallback((id: string) => {
    setDepartmentRecords((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) {
        toggleDepartmentStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((d) => (d.id === id ? { ...d, status: !d.status } : d));
    });
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

  const handleSaveBrand = useCallback(
    async (record: BrandRecord, isEdit: boolean) => {
      try {
        const saved = await saveBrandApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setBrandRecords((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
          } else {
            setBrandRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingBrand(null);
        handleNavigateList("brand", "/exim/master/brand");
      } catch (err) {
        console.error("Brand API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Brand.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteBrand = useCallback(async (id: string) => {
    try {
      await deleteBrandApi(id);
      setBrandRecords((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Brand delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Brand.");
    }
  }, []);

  const handleToggleBrandStatus = useCallback((id: string) => {
    setBrandRecords((prev) => {
      const target = prev.find((b) => b.id === id);
      if (target) {
        toggleBrandStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((b) => (b.id === id ? { ...b, status: !b.status } : b));
    });
  }, []);

  const handleNavigateFacilityEdit = useCallback((facility: FacilityRecord) => {
    setEditingFacility(facility);
    const nextState: ViewState = { type: "facility-edit", record: facility };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/facility/create");
    }
  }, []);

  const handleSaveFacility = useCallback(
    async (record: FacilityRecord, isEdit: boolean) => {
      try {
        const saved = await saveFacilityApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setFacilityRecords((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
          } else {
            setFacilityRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingFacility(null);
        handleNavigateList("facility", "/exim/master/facility");
      } catch (err) {
        console.error("Facility API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Facility.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteFacility = useCallback(async (id: string) => {
    try {
      await deleteFacilityApi(id);
      setFacilityRecords((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Facility delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Facility.");
    }
  }, []);

  const handleToggleFacilityStatus = useCallback((id: string) => {
    setFacilityRecords((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        toggleFacilityStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((f) => (f.id === id ? { ...f, status: !f.status } : f));
    });
  }, []);

  const handleNavigateHsEdit = useCallback((hs: HsRecord) => {
    setEditingHs(hs);
    const nextState: ViewState = { type: "hs-edit", record: hs };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/hs/create");
    }
  }, []);

  const handleSaveHs = useCallback(
    async (record: HsRecord, isEdit: boolean) => {
      try {
        const saved = await saveHsApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setHsRecords((prev) => prev.map((h) => (h.id === saved.id ? saved : h)));
          } else {
            setHsRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingHs(null);
        handleNavigateList("hs", "/exim/master/hs");
      } catch (err) {
        console.error("HS API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save HS Code.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteHs = useCallback(async (id: string) => {
    try {
      await deleteHsApi(id);
      setHsRecords((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("HS delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete HS Code.");
    }
  }, []);

  const handleNavigateCategoryEdit = useCallback((category: CategoryRecord) => {
    setEditingCategory(category);
    const nextState: ViewState = { type: "category-edit", record: category };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/category/create");
    }
  }, []);

  const handleSaveCategory = useCallback(
    async (record: CategoryRecord, isEdit: boolean) => {
      try {
        const saved = await saveCategoryApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setCategoryRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setCategoryRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingCategory(null);
        handleNavigateList("category", "/exim/master/category");
      } catch (err) {
        console.error("Category API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Category.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteCategory = useCallback(async (id: string) => {
    try {
      await deleteCategoryApi(id);
      setCategoryRecords((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Category delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Category.");
    }
  }, []);

  const handleToggleCategoryStatus = useCallback((id: string) => {
    setCategoryRecords((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) {
        toggleCategoryStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((c) => (c.id === id ? { ...c, status: !c.status } : c));
    });
  }, []);

  const handleNavigateStyleEdit = useCallback((style: StyleRecord) => {
    setEditingStyle(style);
    const nextState: ViewState = { type: "style-edit", record: style };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/style/create");
    }
  }, []);

  const handleNavigateStyleImport = useCallback(() => {
    const nextState: ViewState = { type: "style-import" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/exim/master/style/import");
    }
  }, []);

  const handleSaveStyle = useCallback(
    async (record: StyleRecord, isEdit: boolean) => {
      try {
        const saved = await saveStyleApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setStyleRecords((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
          } else {
            setStyleRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingStyle(null);
        handleNavigateList("style", "/exim/master/style");
      } catch (err) {
        console.error("Style API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Style.");
      }
    },
    [handleNavigateList]
  );

  const handleDeleteStyle = useCallback(async (id: string) => {
    try {
      await deleteStyleApi(id);
      setStyleRecords((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Style delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Style.");
    }
  }, []);

  const handleToggleStyleStatus = useCallback((id: string) => {
    setStyleRecords((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) {
        toggleStyleStatusApi(id, !target.status).catch(console.error);
      }
      return prev.map((s) => (s.id === id ? { ...s, status: !s.status } : s));
    });
  }, []);

  const handleSaveColor = useCallback(
    async (record: ColorRecord) => {
      try {
        const saved = await saveColorApi(record);
        if (saved) {
          setColorRecords((prev) => [saved, ...prev]);
        }
        handleNavigateList("colour", "/exim/master/colour");
      } catch (err) {
        console.error("Color API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Colour.");
      }
    },
    [handleNavigateList]
  );

  const handleNavigateReceiveNoteDetail = useCallback((rnNumber: string) => {
    const slug = String(rnNumber || "").replace(/[\/\\]/g, "-");
    const nextState: ViewState = { type: "receive-note-detail", code: slug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/exim/receive-note/detail/${slug}`);
    }
  }, []);

  const handleSaveReceiveNote = useCallback(async (newRecord: ReceiveNoteRecord) => {
    try {
      const rawRemark = newRecord.remark && newRecord.remark !== "-"
        ? newRecord.remark
        : (newRecord.description && newRecord.description !== "-"
          ? newRecord.description
          : ((newRecord as any).notes && (newRecord as any).notes !== "-"
            ? (newRecord as any).notes
            : ((newRecord as any).note && (newRecord as any).note !== "-" ? (newRecord as any).note : undefined)));

      await createReceiveNote({
        rnNumber: newRecord.rnNumber,
        supplier: newRecord.supplier,
        currency: newRecord.currency,
        rate: newRecord.rate,
        arrival_date: newRecord.arrivalDate,
        facility: newRecord.facility,
        invoice_number: newRecord.invoiceNumber && newRecord.invoiceNumber !== "-" ? newRecord.invoiceNumber : undefined,
        invoice_date: newRecord.invoiceDate && newRecord.invoiceDate !== "-" ? newRecord.invoiceDate : undefined,
        tax_invoice: newRecord.taxInvoiceNumber && newRecord.taxInvoiceNumber !== "-" ? newRecord.taxInvoiceNumber : undefined,
        tax_invoice_date: newRecord.taxInvoiceDate && newRecord.taxInvoiceDate !== "-" ? newRecord.taxInvoiceDate : undefined,
        vehicle_type: newRecord.vehicleType && newRecord.vehicleType !== "-" ? newRecord.vehicleType : undefined,
        license_plate: newRecord.licensePlate && newRecord.licensePlate !== "-" ? newRecord.licensePlate : undefined,
        aju_number: newRecord.ajuNumber && newRecord.ajuNumber !== "-" ? newRecord.ajuNumber : undefined,
        no_daftar: newRecord.noDaftar && newRecord.noDaftar !== "-" ? newRecord.noDaftar : undefined,
        tanggal_daftar: newRecord.tanggalDaftar && newRecord.tanggalDaftar !== "-" ? newRecord.tanggalDaftar : undefined,
        note: rawRemark,
        notes: rawRemark,
        description: rawRemark,
        remark: rawRemark,
        sj_number: (newRecord as any).sjNumber && (newRecord as any).sjNumber !== "-"
          ? (newRecord as any).sjNumber
          : ((newRecord as any).nomorSuratJalan && (newRecord as any).nomorSuratJalan !== "-"
            ? (newRecord as any).nomorSuratJalan
            : newRecord.nomorPackingList),
        sj_date: (newRecord as any).sjDate && (newRecord as any).sjDate !== "-"
          ? (newRecord as any).sjDate
          : ((newRecord as any).tanggalSuratJalan && (newRecord as any).tanggalSuratJalan !== "-"
            ? (newRecord as any).tanggalSuratJalan
            : newRecord.tanggalPackingList),
        pl_number: newRecord.nomorPackingList && newRecord.nomorPackingList !== "-" ? newRecord.nomorPackingList : undefined,
        pl_date: newRecord.tanggalPackingList && newRecord.tanggalPackingList !== "-" ? newRecord.tanggalPackingList : undefined,
        items: newRecord.items?.map((it) => ({
          purchase_order_id: (it as any).purchase_order_id || (it as any).po_id,
          poNumber: it.poNumber,
          itemName: it.itemName,
          suratJalanQty: it.suratJalanQty,
          price: (it as any).price ?? it.pricePerUnit ?? 0,
          remark: it.remark || "-",
          note: it.remark || "-",
        })),
      });

      const refreshed = await fetchMasterReceiveNotes();
      if (Array.isArray(refreshed)) {
        setReceiveNoteRecords(refreshed);
      }
      const nextState: ViewState = { type: "list", page: "receive-note" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/receive-note");
      }
    } catch (err) {
      console.error("Failed to persist Receive Note to backend:", err);
      alert(err instanceof Error ? err.message : "Failed to save Receive Note.");
    }
  }, []);

  const handleSaveCountry = useCallback(
    async (data: { code?: string; name: string; status: boolean }, id?: string) => {
      try {
        const saved = await saveCountryApi(data, id);
        if (saved) {
          if (id) {
            setCountryRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setCountryRecords((prev) => [saved, ...prev.map((c, i) => ({ ...c, no: i + 2 }))]);
          }
          return saved;
        }
      } catch (err) {
        console.warn("Country API save failed:", err);
      }
      return null;
    },
    []
  );

  const handleDeleteCountry = useCallback(async (id: string) => {
    try {
      await deleteCountryApi(id);
    } catch (err) {
      console.warn("Country API delete failed:", err);
    }
    setCountryRecords((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSaveAccount = useCallback(
    async (data: { accountCode: string; accountName: string; category?: string; status: boolean }, id?: string) => {
      try {
        const saved = await saveAccountApi(data, id);
        if (saved) {
          if (id) {
            setAccountRecords((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
          } else {
            setAccountRecords((prev) => [saved, ...prev.map((a, i) => ({ ...a, no: i + 2 }))]);
          }
          return saved;
        }
      } catch (err) {
        console.warn("Account API save failed:", err);
      }
      return null;
    },
    []
  );

  const handleDeleteAccount = useCallback(async (id: string) => {
    try {
      await deleteAccountApi(id);
    } catch (err) {
      console.warn("Account API delete failed:", err);
    }
    setAccountRecords((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSaveJobNumber = useCallback(
    async (data: { jobNumber: string; jobName?: string; department?: string; status: boolean }, id?: string) => {
      try {
        const saved = await saveJobNumberApi(data, id);
        if (saved) {
          if (id) {
            setJobNumberRecords((prev) => prev.map((j) => (j.id === saved.id ? saved : j)));
          } else {
            setJobNumberRecords((prev) => [saved, ...prev.map((j, i) => ({ ...j, no: i + 2 }))]);
          }
          return saved;
        }
      } catch (err) {
        console.warn("Job Number API save failed:", err);
      }
      return null;
    },
    []
  );

  const handleDeleteJobNumber = useCallback(async (id: string) => {
    try {
      await deleteJobNumberApi(id);
    } catch (err) {
      console.warn("Job Number API delete failed:", err);
    }
    setJobNumberRecords((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const handleSaveRafaksiType = useCallback(
    async (data: { code?: string; name: string; description?: string; status: boolean }, id?: string) => {
      try {
        const saved = await saveRafaksiTypeApi(data, id);
        if (saved) {
          if (id) {
            setRafaksiTypeRecords((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
          } else {
            setRafaksiTypeRecords((prev) => [saved, ...prev.map((r, i) => ({ ...r, no: i + 2 }))]);
          }
          return saved;
        }
      } catch (err) {
        console.warn("Rafaksi Type API save failed:", err);
      }
      return null;
    },
    []
  );

  const handleDeleteRafaksiType = useCallback(async (id: string) => {
    try {
      await deleteRafaksiTypeApi(id);
    } catch (err) {
      console.warn("Rafaksi Type API delete failed:", err);
    }
    setRafaksiTypeRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSaveCurrency = useCallback(
    async (data: { currencyCode: string; currencyName: string; symbol?: string; status?: boolean }, id?: string) => {
      try {
        const saved = await saveCurrencyApi(data, id);
        if (saved) {
          if (id) {
            setCurrencyRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setCurrencyRecords((prev) => [saved, ...prev.map((c, i) => ({ ...c, no: i + 2 }))]);
          }
          return saved;
        }
      } catch (err) {
        console.warn("Currency API save failed:", err);
      }
      return null;
    },
    []
  );

  const handleDeleteCurrency = useCallback(async (id: string) => {
    try {
      await deleteCurrencyApi(id);
    } catch (err) {
      console.warn("Currency API delete failed:", err);
    }
    setCurrencyRecords((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleNavigateReceiveNoteReturnDetail = useCallback((rnNumber: string) => {
    const slug = String(rnNumber || "").replace(/[\/\\]/g, "-");
    const nextState: ViewState = { type: "receive-note-return-detail", code: slug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/exim/receive-note-return/detail/${slug}`);
    }
  }, []);

  const handleNavigateDocumentHistoryDetail = useCallback((invoiceNumber: string) => {
    const slug = String(invoiceNumber || "").replace(/[\/\\]/g, "-");
    const nextState: ViewState = { type: "document-history-detail", code: slug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/exim/document-history/detail/${slug}`);
    }
  }, []);

  const handleNavigateTransferStockReturnDetail = useCallback((mutationCode: string) => {
    const slug = docToSlug(String(mutationCode || ""));
    const nextState: ViewState = { type: "transfer-stock-return-detail", code: slug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(
        nextState,
        "",
        `/warehouse/incoming/transfer-stock-return/detail/${slug}`
      );
    }
  }, []);

  const handleNavigateMasterWarehouseCreate = useCallback(() => {
    const nextState: ViewState = { type: "warehouse-master-create" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/warehouse/create");
    }
  }, []);

  const handleNavigateWarehouseCoordinates = useCallback((warehouse: WarehouseMasterRecord) => {
    const whSlug = docToSlug(warehouse.code || warehouse.name || warehouse.id);
    const nextState: ViewState = { type: "warehouse-coordinate", warehouseId: whSlug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/master/warehouse/${whSlug}/coordinate`);
    }
  }, []);

  const handleNavigateWarehouseCoordinateCreate = useCallback((warehouseId: string) => {
    const whSlug = docToSlug(warehouseId);
    const nextState: ViewState = { type: "warehouse-coordinate-create", warehouseId: whSlug };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/master/warehouse/${whSlug}/coordinate/create`);
    }
  }, []);

  const handleSaveWarehouseMaster = useCallback(
    async (newRecord: WarehouseMasterRecord) => {
      try {
        const saved = await saveWarehouseMasterApi(newRecord);
        if (saved) {
          setWarehouseMasterRecords((prev) => [
            { ...saved, no: 1 },
            ...prev.map((w) => ({ ...w, no: w.no + 1 })),
          ]);
        }
        const nextState: ViewState = { type: "list", page: "warehouse-master" };
        setViewState(nextState);

        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
          window.history.pushState(nextState, "", "/warehouse/master/warehouse");
        }
      } catch (err) {
        console.error("Warehouse Master API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Warehouse.");
      }
    },
    []
  );

  const handleSaveWarehouseCoordinate = useCallback(
    async (newCoordinate: WarehouseCoordinateRecord) => {
      try {
        const saved = await saveWarehouseCoordinateApi(newCoordinate);
        const createdCoord = saved || newCoordinate;
        setWarehouseMasterRecords((prev) =>
          prev.map((w) => {
            if (w.id === newCoordinate.warehouseId) {
              const currentCoords = w.coordinates || [];
              return {
                ...w,
                coordinates: [...currentCoords, createdCoord],
              };
            }
            return w;
          })
        );

        const matchedWh = warehouseMasterRecords.find(
          (w) =>
            w.id === newCoordinate.warehouseId ||
            w.code === newCoordinate.warehouseId ||
            docToSlug(w.code || w.name) === docToSlug(newCoordinate.warehouseId)
        );
        const whSlug = docToSlug(matchedWh?.code || matchedWh?.name || newCoordinate.warehouseId);

        const nextState: ViewState = {
          type: "warehouse-coordinate",
          warehouseId: whSlug,
        };
        setViewState(nextState);

        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
          window.history.pushState(
            nextState,
            "",
            `/warehouse/master/warehouse/${whSlug}/coordinate`
          );
        }
      } catch (err) {
        console.error("Warehouse coordinate API sync failed:", err);
        alert(err instanceof Error ? err.message : "Failed to save Warehouse Coordinate.");
      }
    },
    []
  );

  const handleDeleteWarehouseCoordinate = useCallback(
    async (warehouseId: string, coordinateId: string) => {
      try {
        await deleteWarehouseCoordinateApi(coordinateId);
        setWarehouseMasterRecords((prev) =>
          prev.map((w) => {
            if (w.id === warehouseId) {
              return {
                ...w,
                coordinates: (w.coordinates || []).filter((c) => c.id !== coordinateId),
              };
            }
            return w;
          })
        );
      } catch (err) {
        console.error("Warehouse coordinate delete failed:", err);
        alert(err instanceof Error ? err.message : "Failed to delete Warehouse Coordinate.");
      }
    },
    []
  );

  const handleSaveReceiveNoteReturn = useCallback(async (newRecord: ReceiveNoteReturnRecord) => {
    try {
      const saved = await saveReceiveNoteReturnApi(newRecord);
      const refreshed = await fetchMasterReceiveNoteReturns();
      if (Array.isArray(refreshed)) {
        setReceiveNoteReturnRecords(refreshed);
      } else if (saved) {
        setReceiveNoteReturnRecords((prev) => [
          { ...saved, no: 1 },
          ...prev.map((r) => ({ ...r, no: r.no + 1 })),
        ]);
      }
      const nextState: ViewState = { type: "list", page: "receive-note-return" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/receive-note-return");
      }
    } catch (err) {
      console.error("Failed to persist Receive Note Return to backend:", err);
      alert(err instanceof Error ? err.message : "Failed to save Receive Note Return.");
    }
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

  const handleSaveItem = useCallback(
    async (record: ItemRecord, isEdit: boolean) => {
      try {
        const saved = await saveItemApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setItemRecords((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
          } else {
            setItemRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingItem(null);
        handleNavigateList("item", "/exim/master/item");
      } catch (err) {
        console.error("Item API sync failed:", err);
        throw err;
      }
    },
    [handleNavigateList]
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteItemApi(id);
      setItemRecords((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Item delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Item.");
    }
  }, []);

  // Stock Notification Master Handlers
  const handleNavigateStockNotificationCreate = useCallback(() => {
    setEditingStockNotification(null);
    const nextState: ViewState = { type: "stock-notification-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/dashboard/stock-notification-master/create");
    }
  }, []);

  const handleEditStockNotification = useCallback((record: StockNotificationRecord) => {
    setEditingStockNotification(record);
    const nextState: ViewState = { type: "stock-notification-edit", record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/dashboard/stock-notification-master/create");
    }
  }, []);

  const handleSaveStockNotification = useCallback(async (record: StockNotificationRecord, isEdit: boolean) => {
    try {
      const saved = await saveStockNotificationApi(record, isEdit);
      if (saved) {
        if (isEdit) {
          setStockNotificationRecords((prev) =>
            prev.map((r) => (r.id === saved.id ? saved : r))
          );
        } else {
          setStockNotificationRecords((prev) => [saved, ...prev]);
        }
      }
      setEditingStockNotification(null);
      handleNavigateList("stock-notification-master", "/dashboard/stock-notification-master");
    } catch (err) {
      console.error("Stock Notification API sync failed:", err);
      alert(err instanceof Error ? err.message : "Failed to save Stock Notification.");
    }
  }, [handleNavigateList]);

  const handleDeleteStockNotification = useCallback(async (id: string) => {
    try {
      await deleteStockNotificationApi(id);
      setStockNotificationRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Stock Notification delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Stock Notification.");
    }
  }, []);

  // Type of Request Master Handlers
  const handleNavigateTypeOfRequestCreate = useCallback(() => {
    setEditingTypeOfRequest(null);
    const nextState: ViewState = { type: "wh-type-of-request-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/type-of-request/create");
    }
  }, []);

  const handleEditTypeOfRequest = useCallback((record: TypeOfRequestRecord) => {
    setEditingTypeOfRequest(record);
    const nextState: ViewState = { type: "wh-type-of-request-edit", record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/type-of-request/create");
    }
  }, []);

  const handleSaveTypeOfRequest = useCallback(async (record: TypeOfRequestRecord, isEdit: boolean) => {
    try {
      const saved = await saveWarehouseTypeOfRequestApi(record, isEdit);
      if (saved) {
        if (isEdit) {
          setTypeOfRequestRecords((prev) =>
            prev.map((r) => (r.id === saved.id ? saved : r))
          );
        } else {
          setTypeOfRequestRecords((prev) => [saved, ...prev]);
        }
      }
      setEditingTypeOfRequest(null);
      handleNavigateList("wh-type-of-request", "/warehouse/master/type-of-request");
    } catch (err) {
      console.error("Type of Request API sync failed:", err);
      alert(err instanceof Error ? err.message : "Failed to save Type of Request.");
    }
  }, [handleNavigateList]);

  const handleDeleteTypeOfRequest = useCallback(async (id: string) => {
    try {
      await deleteWarehouseTypeOfRequestApi(id);
      setTypeOfRequestRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Type of Request delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Type of Request.");
    }
  }, []);

  // Destination Location Master Handlers
  const handleNavigateDestinationLocationCreate = useCallback(() => {
    setEditingDestinationLocation(null);
    const nextState: ViewState = { type: "wh-destination-location-create" };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/destination-location/create");
    }
  }, []);

  const handleEditDestinationLocation = useCallback((record: DestinationLocationRecord) => {
    setEditingDestinationLocation(record);
    const nextState: ViewState = { type: "wh-destination-location-edit", record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/destination-location/create");
    }
  }, []);

  const handleSaveDestinationLocation = useCallback(async (record: DestinationLocationRecord, isEdit: boolean) => {
    try {
      const saved = await saveDestinationLocationApi(record, isEdit);
      if (saved) {
        if (isEdit) {
          setDestinationLocationRecords((prev) =>
            prev.map((r) => (r.id === saved.id ? saved : r))
          );
        } else {
          setDestinationLocationRecords((prev) => [saved, ...prev]);
        }
      }
      setEditingDestinationLocation(null);
      handleNavigateList("wh-destination-location", "/warehouse/master/destination-location");
    } catch (err) {
      console.error("Destination Location API sync failed:", err);
      alert(err instanceof Error ? err.message : "Failed to save Destination Location.");
    }
  }, [handleNavigateList]);

  const handleDeleteDestinationLocation = useCallback(async (id: string) => {
    try {
      await deleteDestinationLocationApi(id);
      setDestinationLocationRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Destination Location delete failed:", err);
      alert(err instanceof Error ? err.message : "Failed to delete Destination Location.");
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
  const handleConfirmLogout = useCallback(async () => {
    setShowLogoutDialog(false);
    await logoutUser();
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState({ type: "login" }, "", "/login");
    }
    setViewState({ type: "login" });
  }, [logoutUser]);

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
  if (viewState.type === "login" || (authReady && !isAuthenticated)) {
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
        <AppViewRenderer
          viewState={viewState}
          currentMeta={currentMeta}
          handleNavigateList={handleNavigateList}
          handleNavigateDetail={handleNavigateDetail}
          handleNavigateCreate={handleNavigateCreate}
          handleNavigatePrCreate={handleNavigatePrCreate}
          handleNavigatePoCreate={handleNavigatePoCreate}
          handleNavigateReceiveNoteDetail={handleNavigateReceiveNoteDetail}
          handleNavigateReceiveNoteReturnDetail={handleNavigateReceiveNoteReturnDetail}
          handleNavigateDocumentHistoryDetail={handleNavigateDocumentHistoryDetail}
          handleNavigateRequestMaterialCreate={handleNavigateRequestMaterialCreate}
          handleNavigateRequestMaterialDetail={handleNavigateRequestMaterialDetail}
          handleNavigateTransferStockReturnDetail={handleNavigateTransferStockReturnDetail}
          handleNavigateMasterWarehouseCreate={handleNavigateMasterWarehouseCreate}
          handleNavigateWarehouseCoordinates={handleNavigateWarehouseCoordinates}
          handleNavigateWarehouseCoordinateCreate={handleNavigateWarehouseCoordinateCreate}
          handleNavigateStockNotificationCreate={handleNavigateStockNotificationCreate}
          handleEditStockNotification={handleEditStockNotification}
          handleSaveStockNotification={handleSaveStockNotification}
          handleDeleteStockNotification={handleDeleteStockNotification}
          handleNavigateTypeOfRequestCreate={handleNavigateTypeOfRequestCreate}
          handleEditTypeOfRequest={handleEditTypeOfRequest}
          handleSaveTypeOfRequest={handleSaveTypeOfRequest}
          handleDeleteTypeOfRequest={handleDeleteTypeOfRequest}
          handleNavigateDestinationLocationCreate={handleNavigateDestinationLocationCreate}
          handleEditDestinationLocation={handleEditDestinationLocation}
          handleSaveDestinationLocation={handleSaveDestinationLocation}
          handleDeleteDestinationLocation={handleDeleteDestinationLocation}
          handleToggleSupplierHide={handleToggleSupplierHide}
          handleTogglePaymentTermHide={handleTogglePaymentTermHide}
          handleTogglePurchaseCategoryHide={handleTogglePurchaseCategoryHide}
          handleToggleDeliveryTermHide={handleToggleDeliveryTermHide}
          handleToggleAdditionalCostHide={handleToggleAdditionalCostHide}
          handleTogglePphHide={handleTogglePphHide}
          handleSaveSupplier={handleSaveSupplier}
          handleSavePaymentTerm={handleSavePaymentTerm}
          handleSavePurchaseCategory={handleSavePurchaseCategory}
          handleSaveDeliveryTerm={handleSaveDeliveryTerm}
          handleSaveAdditionalCost={handleSaveAdditionalCost}
          handleSavePph={handleSavePph}
          handleNavigateUnitEdit={handleNavigateUnitEdit}
          handleSaveUnit={handleSaveUnit}
          handleDeleteUnit={handleDeleteUnit}
          handleNavigateClassificationEdit={handleNavigateClassificationEdit}
          handleSaveClassification={handleSaveClassification}
          handleDeleteClassification={handleDeleteClassification}
          handleToggleClassificationStatus={handleToggleClassificationStatus}
          handleNavigateDepartmentEdit={handleNavigateDepartmentEdit}
          handleSaveDepartment={handleSaveDepartment}
          handleDeleteDepartment={handleDeleteDepartment}
          handleToggleDepartmentStatus={handleToggleDepartmentStatus}
          handleNavigateBrandEdit={handleNavigateBrandEdit}
          handleSaveBrand={handleSaveBrand}
          handleDeleteBrand={handleDeleteBrand}
          handleToggleBrandStatus={handleToggleBrandStatus}
          handleNavigateFacilityEdit={handleNavigateFacilityEdit}
          handleSaveFacility={handleSaveFacility}
          handleDeleteFacility={handleDeleteFacility}
          handleToggleFacilityStatus={handleToggleFacilityStatus}
          handleNavigateHsEdit={handleNavigateHsEdit}
          handleSaveHs={handleSaveHs}
          handleDeleteHs={handleDeleteHs}
          handleNavigateCategoryEdit={handleNavigateCategoryEdit}
          handleSaveCategory={handleSaveCategory}
          handleDeleteCategory={handleDeleteCategory}
          handleToggleCategoryStatus={handleToggleCategoryStatus}
          handleNavigateStyleEdit={handleNavigateStyleEdit}
          handleNavigateStyleImport={handleNavigateStyleImport}
          handleSaveStyle={handleSaveStyle}
          handleDeleteStyle={handleDeleteStyle}
          handleToggleStyleStatus={handleToggleStyleStatus}
          handleSaveColor={handleSaveColor}
          handleSaveReceiveNote={handleSaveReceiveNote}
          handleSaveReceiveNoteReturn={handleSaveReceiveNoteReturn}
          handleSaveWarehouseMaster={handleSaveWarehouseMaster}
          handleSaveWarehouseCoordinate={handleSaveWarehouseCoordinate}
          handleDeleteWarehouseCoordinate={handleDeleteWarehouseCoordinate}
          handleSaveCountry={handleSaveCountry}
          handleDeleteCountry={handleDeleteCountry}
          handleSaveAccount={handleSaveAccount}
          handleDeleteAccount={handleDeleteAccount}
          handleSaveJobNumber={handleSaveJobNumber}
          handleDeleteJobNumber={handleDeleteJobNumber}
          handleSaveRafaksiType={handleSaveRafaksiType}
          handleDeleteRafaksiType={handleDeleteRafaksiType}
          handleSaveCurrency={handleSaveCurrency}
          handleDeleteCurrency={handleDeleteCurrency}
          handleNavigateGenerateQr={handleNavigateGenerateQr}
          handleNavigateItemEdit={handleNavigateItemEdit}
          handleSaveItem={handleSaveItem}
          handleDeleteItem={handleDeleteItem}
          handleSaveRequestMaterial={handleSaveRequestMaterial}
          handleProfileCancel={handleProfileCancel}
          handleProfileSaveConfirmed={handleProfileSaveConfirmed}
          supplierRecords={supplierRecords}
          paymentTermRecords={paymentTermRecords}
          purchaseCategoryRecords={purchaseCategoryRecords}
          deliveryTermRecords={deliveryTermRecords}
          additionalCostRecords={additionalCostRecords}
          pphRecords={pphRecords}
          unitRecords={unitRecords}
          editingUnit={editingUnit}
          setEditingUnit={setEditingUnit}
          unitReferenceRecords={unitReferenceRecords}
          classificationRecords={classificationRecords}
          editingClassification={editingClassification}
          setEditingClassification={setEditingClassification}
          departmentRecords={departmentRecords}
          editingDepartment={editingDepartment}
          setEditingDepartment={setEditingDepartment}
          brandRecords={brandRecords}
          editingBrand={editingBrand}
          setEditingBrand={setEditingBrand}
          facilityRecords={facilityRecords}
          editingFacility={editingFacility}
          setEditingFacility={setEditingFacility}
          hsRecords={hsRecords}
          editingHs={editingHs}
          setEditingHs={setEditingHs}
          categoryRecords={categoryRecords}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          styleRecords={styleRecords}
          editingStyle={editingStyle}
          setEditingStyle={setEditingStyle}
          colorRecords={colorRecords}
          itemRecords={itemRecords}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          receiveNoteRecords={receiveNoteRecords}
          setReceiveNoteRecords={setReceiveNoteRecords}
          receiveNoteReturnRecords={receiveNoteReturnRecords}
          documentHistoryRecords={documentHistoryRecords}
          warehouseMasterRecords={warehouseMasterRecords}
          countryRecords={countryRecords}
          accountRecords={accountRecords}
          jobNumberRecords={jobNumberRecords}
          rafaksiTypeRecords={rafaksiTypeRecords}
          currencyRecords={currencyRecords}
          requestMaterialRecords={requestMaterialRecords}
          stockNotificationRecords={stockNotificationRecords}
          editingStockNotification={editingStockNotification}
          setEditingStockNotification={setEditingStockNotification}
          typeOfRequestRecords={typeOfRequestRecords}
          editingTypeOfRequest={editingTypeOfRequest}
          setEditingTypeOfRequest={setEditingTypeOfRequest}
          destinationLocationRecords={destinationLocationRecords}
          editingDestinationLocation={editingDestinationLocation}
          setEditingDestinationLocation={setEditingDestinationLocation}
        />
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
