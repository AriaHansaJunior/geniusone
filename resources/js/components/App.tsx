import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "./layout/AppLayout";
import { Login } from "../pages";
import { AppViewRenderer } from "./AppViewRenderer";
import { Button } from "./ui/Button";
import { useAdditionalMasterHandlers } from "../hooks/useAdditionalMasterHandlers";
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
import { ALL_SIDEBAR_MENU_ITEMS } from "../config/navigation";
import { useAuthPermission } from "../context/AuthPermissionContext";
import { useNotification } from "../context/NotificationContext";

const SIDEBAR_GUARDED_PAGES = new Set(ALL_SIDEBAR_MENU_ITEMS.map((item) => item.id));
import type {
  ReferenceMasterPageKey,
  ReferenceMasterRecord,
} from "../pages/Common/ReferenceMaster/reference-master-types";
import { REFERENCE_MASTER_CONFIGS } from "../pages/Common/ReferenceMaster/reference-master-config";
import type { PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import type { SupplierRecord } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import type { PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import type { DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import type { AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import type {
  ClassificationRecord,
  ReportingTypeOption,
} from "../pages/Exim/Master/Classification/classification-types";
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
  WarehouseTypeOption,
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
  deleteSupplierApi,
  toggleSupplierStatusApi,
  fetchMasterPaymentTerms,
  savePaymentTermApi,
  deletePaymentTermApi,
  togglePaymentTermStatusApi,
  fetchMasterPurchaseCategories,
  savePurchaseCategoryApi,
  deletePurchaseCategoryApi,
  togglePurchaseCategoryStatusApi,
  fetchMasterDeliveryTerms,
  saveDeliveryTermApi,
  deleteDeliveryTermApi,
  toggleDeliveryTermStatusApi,
  fetchMasterAdditionalCosts,
  saveAdditionalCostApi,
  deleteAdditionalCostApi,
  toggleAdditionalCostStatusApi,
  fetchMasterPph,
  savePphApi,
  deletePphApi,
  togglePphStatusApi,
  fetchMasterUnits,
  saveUnitApi,
  toggleUnitStatusApi,
  deleteUnitApi,
  fetchMasterBrands,
  saveBrandApi,
  toggleBrandStatusApi,
  deleteBrandApi,
  fetchMasterClassifications,
  fetchMasterReportingTypes,
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
  deleteColorApi,
  toggleColorStatusApi,
  fetchMasterItems,
  saveItemApi,
  toggleItemStatusApi,
  deleteItemApi,
  fetchMasterWarehouses,
  fetchWarehouseTypesApi,
  saveWarehouseMasterApi,
  deleteWarehouseMasterApi,
  toggleWarehouseMasterStatusApi,
  saveWarehouseCoordinateApi,
  deleteWarehouseCoordinateApi,
  toggleWarehouseCoordinateStatusApi,
  fetchPphTypesMasterApi,
  fetchTypeRatesBmMasterApi,
  fetchTypeRatesCukaiMasterApi,
  fetchCustomsReportsMasterApi,
  fetchItemTypesMasterApi,
  fetchGroupScrapItemsMasterApi,
  fetchSpecificationsMasterApi,
  fetchWarehouseTypesListApi,
  fetchMasterCountries,
  fetchMasterRafaksiTypes,
  fetchMasterCurrencies,
  fetchMasterAccounts,
  fetchMasterJobNumbers,
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
  toggleStockNotificationStatusApi,
  fetchWarehouseTypesOfRequestApi,
  saveWarehouseTypeOfRequestApi,
  deleteWarehouseTypeOfRequestApi,
  toggleWarehouseTypeOfRequestStatusApi,
  fetchDestinationLocationsApi,
  saveDestinationLocationApi,
  deleteDestinationLocationApi,
  toggleDestinationLocationStatusApi,
} from "../data/masterApi";
import { clearApiCache, createReceiveNote } from "../data/api";

const REFERENCE_FETCHER_MAP: Record<
  ReferenceMasterPageKey,
  () => Promise<ReferenceMasterRecord[]>
> = {
  "pph-type": fetchPphTypesMasterApi,
  "type-rates-bm": fetchTypeRatesBmMasterApi,
  "type-rates-cukai": fetchTypeRatesCukaiMasterApi,
  "custom-report": fetchCustomsReportsMasterApi,
  "item-type": fetchItemTypesMasterApi,
  "group-scrap-item": fetchGroupScrapItemsMasterApi,
  specification: fetchSpecificationsMasterApi,
  "warehouse-type": fetchWarehouseTypesListApi,
};

function flipOptimisticStatusValue(current: unknown): boolean | "Active" | "Inactive" {
  if (current === "Active") return "Inactive";
  if (current === "Inactive") return "Active";
  return !Boolean(current);
}

async function runOptimisticStatusToggle<T extends { id: string }>(
  id: string,
  field: "hidden" | "status",
  label: string,
  setRecords: React.Dispatch<React.SetStateAction<T[]>>,
  apiToggle: (recordId: string, flag: boolean) => Promise<boolean>,
  notifySuccess: (title: string, message?: string) => void,
  notifyError: (title: string, err?: unknown) => void
) {
  setRecords((prev) =>
    prev.map((row) =>
      row.id === id
        ? { ...row, [field]: flipOptimisticStatusValue((row as Record<string, unknown>)[field]) }
        : row
    )
  );
  try {
    const ok = await apiToggle(id, true);
    if (!ok) {
      throw new Error(`Failed to update ${label} status.`);
    }
    notifySuccess("Status Updated", `${label} status updated.`);
  } catch (err) {
    setRecords((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: flipOptimisticStatusValue((row as Record<string, unknown>)[field]) }
          : row
      )
    );
    notifyError("Status Update Failed", err);
  }
}

interface AppProps {
  initialPage?: string;
  initialCode?: string;
}

export function App({ initialPage = "dashboard", initialCode = "" }: AppProps) {
  const { isAuthenticated, authReady, logoutUser, canAccessSidebarItem } = useAuthPermission();
  const { notifySuccess, notifyError } = useNotification();
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

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", path);
    }

    setViewState(nextState);
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
  const [editingPph, setEditingPph] = useState<PphRecord | null>(null);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [paymentTermRecords, setPaymentTermRecords] = useState<PaymentTermRecord[]>([]);
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<PaymentTermRecord | null>(null);
  const [purchaseCategoryRecords, setPurchaseCategoryRecords] = useState<PurchaseCategoryRecord[]>([]);
  const [editingPurchaseCategory, setEditingPurchaseCategory] = useState<PurchaseCategoryRecord | null>(null);
  const [deliveryTermRecords, setDeliveryTermRecords] = useState<DeliveryTermRecord[]>([]);
  const [editingDeliveryTerm, setEditingDeliveryTerm] = useState<DeliveryTermRecord | null>(null);
  const [additionalCostRecords, setAdditionalCostRecords] = useState<AdditionalCostRecord[]>([]);
  const [editingAdditionalCost, setEditingAdditionalCost] = useState<AdditionalCostRecord | null>(null);
  const [unitRecords, setUnitRecords] = useState<UnitRecord[]>([]);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [classificationRecords, setClassificationRecords] = useState<ClassificationRecord[]>([]);
  const [editingClassification, setEditingClassification] = useState<ClassificationRecord | null>(null);
  const [reportingTypeRecords, setReportingTypeRecords] = useState<ReportingTypeOption[]>([]);
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
  const [editingColor, setEditingColor] = useState<ColorRecord | null>(null);
  const [receiveNoteRecords, setReceiveNoteRecords] = useState<ReceiveNoteRecord[]>([]);
  const [receiveNoteReturnRecords, setReceiveNoteReturnRecords] = useState<ReceiveNoteReturnRecord[]>([]);
  const [documentHistoryRecords, setDocumentHistoryRecords] = useState<DocumentHistoryRecord[]>([]);
  const [warehouseMasterRecords, setWarehouseMasterRecords] = useState<WarehouseMasterRecord[]>([]);
  const [editingWarehouseMaster, setEditingWarehouseMaster] = useState<WarehouseMasterRecord | null>(null);
  const [warehouseTypeRecords, setWarehouseTypeRecords] = useState<WarehouseTypeOption[]>([]);
  const [referenceRecordsMap, setReferenceRecordsMap] = useState<
    Partial<Record<ReferenceMasterPageKey, ReferenceMasterRecord[]>>
  >({});
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
  const [masterFetchStates, setMasterFetchStates] = useState<Record<string, "loading" | "done">>({});

  // Redirect authenticated users away from the standalone login view on refresh
  useEffect(() => {
    if (authReady && isAuthenticated && viewState.type === "login") {
      handleNavigateList("dashboard", "/dashboard");
    }
  }, [authReady, isAuthenticated, viewState.type, handleNavigateList]);

  // On-demand route-based database synchronization
  useEffect(() => {
    if (!isAuthenticated) {
      loadedPagesRef.current.clear();
      return;
    }

    let isMounted = true;
    const page = viewState.type === "list" ? viewState.page : undefined;
    const type = viewState.type;

    const loadOnce = (
      key: string,
      fetcher: () => Promise<any[] | null>,
      setter: (data: any[]) => void,
      onError?: (error: unknown) => void
    ) => {
      if (loadedPagesRef.current.has(key)) return;
      loadedPagesRef.current.add(key);
      if (isMounted) {
        setMasterFetchStates((prev) => ({ ...prev, [key]: "loading" }));
      }
      fetcher()
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setter(data);
          }
        })
        .catch((error: unknown) => {
          if (onError) onError(error);
        })
        .finally(() => {
          if (isMounted) {
            setMasterFetchStates((prev) => ({ ...prev, [key]: "done" }));
          }
        });
    };

    if (page === "supplier" || type === "supplier-create" || type === "supplier-edit") {
      loadOnce("suppliers", fetchMasterSuppliers, setSupplierRecords);
    }
    if (page === "payment-term" || type === "payment-term-create" || type === "payment-term-edit") {
      loadOnce("payment-terms", fetchMasterPaymentTerms, setPaymentTermRecords);
    }
    if (
      page === "purchase-category" ||
      type === "purchase-category-create" ||
      type === "purchase-category-edit"
    ) {
      loadOnce("purchase-categories", fetchMasterPurchaseCategories, setPurchaseCategoryRecords);
    }
    if (page === "delivery-terms" || type === "delivery-terms-create" || type === "delivery-terms-edit") {
      loadOnce("delivery-terms", fetchMasterDeliveryTerms, setDeliveryTermRecords);
    }
    if (
      page === "additional-costs" ||
      type === "additional-costs-create" ||
      type === "additional-costs-edit" ||
      type === "po-create"
    ) {
      loadOnce("additional-costs", fetchMasterAdditionalCosts, setAdditionalCostRecords);
    }
    if (page === "pph" || type === "pph-create" || type === "pph-edit") {
      loadOnce("pph", fetchMasterPph, setPphRecords);
    }
    if (page === "unit" || type === "unit-create" || type === "unit-edit") {
      loadOnce("units", fetchMasterUnits, setUnitRecords);
    }
    if (
      page === "satuan" ||
      page === "unit-reference" ||
      type === "unit-reference-create" ||
      type === "unit-reference-edit"
    ) {
      loadOnce("unit-references", fetchMasterUnitReferences, setUnitReferenceRecords);
    }
    if (page === "classification" || type === "classification-create" || type === "classification-edit") {
      loadOnce("classifications", fetchMasterClassifications, setClassificationRecords);
      loadOnce("reporting-types", fetchMasterReportingTypes, setReportingTypeRecords, (error) => {
        console.error("Reporting Types could not be loaded:", error);
      });
    }
    if (page === "department" || type === "department-create" || type === "department-edit") {
      loadOnce("units", fetchMasterUnits, setUnitRecords);
    }
    if (
      page === "department" ||
      type === "department-create" ||
      type === "department-edit" ||
      page === "job-number" ||
      type === "job-number-create" ||
      type === "job-number-edit" ||
      page === "wh-type-of-request" ||
      type === "wh-type-of-request-create" ||
      type === "wh-type-of-request-edit"
    ) {
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
    if (page === "colour" || type === "colour-create" || type === "colour-edit") {
      loadOnce("colours", fetchMasterColours, setColorRecords);
    }
    if (page === "item" || type === "item-create" || type === "item-edit" || type === "item-qr" || type === "pr-create" || type === "po-create") {
      loadOnce("items", fetchMasterItems, setItemRecords);
    }
    if (
      page === "warehouse-master" ||
      type === "warehouse-coordinate" ||
      type === "warehouse-master-create" ||
      type === "warehouse-master-edit" ||
      type === "warehouse-coordinate-create"
    ) {
      loadOnce("warehouses", fetchMasterWarehouses, setWarehouseMasterRecords);
      loadOnce("warehouse-types", fetchWarehouseTypesApi, setWarehouseTypeRecords);
    }
    if (page === "country" || type === "country-create" || type === "country-edit") {
      loadOnce("countries", fetchMasterCountries, setCountryRecords);
    }
    if (page === "rafaksi-type" || type === "rafaksi-type-create" || type === "rafaksi-type-edit") {
      loadOnce("rafaksi-types", fetchMasterRafaksiTypes, setRafaksiTypeRecords);
    }
    if (page === "currency" || type === "currency-create" || type === "currency-edit") {
      loadOnce("currencies", fetchMasterCurrencies, setCurrencyRecords);
    }
    if (
      page === "account" ||
      type === "account-create" ||
      type === "account-edit" ||
      page === "classification" ||
      type === "classification-create" ||
      type === "classification-edit"
    ) {
      loadOnce("accounts", fetchMasterAccounts, setAccountRecords, (error) => {
        console.error("Accounts could not be loaded:", error);
      });
    }
    if (page === "job-number" || type === "job-number-create" || type === "job-number-edit" || type === "pr-create") {
      loadOnce("job-numbers", fetchMasterJobNumbers, setJobNumberRecords);
    }
    if (page === "receive-note" || type === "receive-note-detail" || type === "receive-note-create") {
      loadOnce("receive-notes", fetchMasterReceiveNotes, setReceiveNoteRecords);
    }
    if (page === "receive-note-return" || type === "receive-note-return-detail" || type === "receive-note-return-create") {
      loadOnce("receive-note-returns", fetchMasterReceiveNoteReturns, setReceiveNoteReturnRecords);
    }
    if (page === "document-history" || type === "document-history-detail") {
      loadOnce("document-histories", fetchMasterDocumentHistories, setDocumentHistoryRecords);
    }
    if (page === "wh-req-material" || type === "wh-req-material-detail" || type === "wh-req-material-create") {
      loadOnce("request-materials", fetchRequestMaterials, setRequestMaterialRecords);
    }
    if (page === "stock-notification-master" || type === "stock-notification-create" || type === "stock-notification-edit") {
      loadOnce("stock-notifications", fetchStockNotificationsApi, setStockNotificationRecords);
    }
    if (page === "wh-type-of-request" || type === "wh-type-of-request-create" || type === "wh-type-of-request-edit" || type === "wh-req-material-create") {
      loadOnce("wh-type-of-requests", fetchWarehouseTypesOfRequestApi, setTypeOfRequestRecords);
    }
    if (page === "wh-destination-location" || type === "wh-destination-location-create" || type === "wh-destination-location-edit" || type === "wh-req-material-create") {
      loadOnce("wh-destination-locations", fetchDestinationLocationsApi, setDestinationLocationRecords);
    }

    const activeRefPage: ReferenceMasterPageKey | null =
      page && page in REFERENCE_FETCHER_MAP
        ? (page as ReferenceMasterPageKey)
        : viewState.type === "reference-master-create" &&
            viewState.page in REFERENCE_FETCHER_MAP
          ? (viewState.page as ReferenceMasterPageKey)
          : null;
    if (activeRefPage) {
      const fetcher = REFERENCE_FETCHER_MAP[activeRefPage];
      loadOnce(
        `ref-${activeRefPage}`,
        fetcher,
        (data) => {
          setReferenceRecordsMap((prev) => ({ ...prev, [activeRefPage]: data }));
        },
        (err) => {
          notifyError(`Failed to load ${REFERENCE_MASTER_CONFIGS[activeRefPage].title}`, err);
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [viewState, isAuthenticated]);

  // Synchronize shared React state whenever any document approval changes (e.g. Dashboard Quick Approve)
  useEffect(() => {
    const handleApprovalChanged = () => {
      clearApiCache();
      loadedPagesRef.current.delete("receive-notes");
      loadedPagesRef.current.delete("request-materials");
      if (!isAuthenticated) return;
      fetchMasterReceiveNotes().then((data) => {
        if (Array.isArray(data)) setReceiveNoteRecords(data);
      }).catch(() => { });
      fetchRequestMaterials().then((data) => {
        if (Array.isArray(data)) setRequestMaterialRecords(data);
      }).catch(() => { });
    };
    window.addEventListener("geniusone_approval_changed", handleApprovalChanged);
    return () => window.removeEventListener("geniusone_approval_changed", handleApprovalChanged);
  }, [isAuthenticated]);

  const handleTogglePphHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "PPH",
        setPphRecords,
        togglePphStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleToggleSupplierHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "Supplier",
        setSupplierRecords,
        toggleSupplierStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleTogglePaymentTermHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "Payment Term",
        setPaymentTermRecords,
        togglePaymentTermStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleTogglePurchaseCategoryHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "Purchase Category",
        setPurchaseCategoryRecords,
        togglePurchaseCategoryStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleToggleDeliveryTermHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "Delivery Term",
        setDeliveryTermRecords,
        toggleDeliveryTermStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleToggleAdditionalCostHide = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "hidden",
        "Additional Cost",
        setAdditionalCostRecords,
        toggleAdditionalCostStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleNavigateSupplierEdit = useCallback((record: SupplierRecord) => {
    setEditingSupplier(record);
    const nextState: ViewState = { type: "supplier-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/supplier/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeleteSupplier = useCallback(
    async (id: string) => {
      try {
        await deleteSupplierApi(id);
        setSupplierRecords((prev) =>
          prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, no: idx + 1 }))
        );
        notifySuccess("Supplier Deleted", "Supplier deleted successfully.");
      } catch (err) {
        notifyError("Delete Supplier Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSaveSupplier = useCallback(
    async (formData: SupplierFormData, editId?: string) => {
      try {
        const saved = await saveSupplierApi(formData, editId);
        if (editId) {
          setSupplierRecords((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
        } else {
          setSupplierRecords((prev) => [saved, ...prev.map((s, idx) => ({ ...s, no: idx + 2 }))]);
        }
        setEditingSupplier(null);
        handleNavigateList("supplier", "/procurement/purchase-master/supplier");
        notifySuccess(editId ? "Supplier Updated" : "Supplier Added", `${saved.supplierName} saved successfully.`);
      } catch (err) {
        notifyError("Save Supplier Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleNavigatePaymentTermEdit = useCallback((record: PaymentTermRecord) => {
    setEditingPaymentTerm(record);
    const nextState: ViewState = { type: "payment-term-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/payment-term/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeletePaymentTerm = useCallback(
    async (id: string) => {
      try {
        await deletePaymentTermApi(id);
        setPaymentTermRecords((prev) =>
          prev.filter((p) => p.id !== id).map((p, idx) => ({ ...p, no: idx + 1 }))
        );
        notifySuccess("Payment Term Deleted", "Payment Term deleted successfully.");
      } catch (err) {
        notifyError("Delete Payment Term Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSavePaymentTerm = useCallback(
    async (data: { name: string }, editId?: string) => {
      try {
        const saved = await savePaymentTermApi(data.name, editId);
        if (editId) {
          setPaymentTermRecords((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        } else {
          setPaymentTermRecords((prev) => [saved, ...prev.map((p, idx) => ({ ...p, no: idx + 2 }))]);
        }
        setEditingPaymentTerm(null);
        handleNavigateList("payment-term", "/procurement/purchase-master/payment-term");
        notifySuccess(editId ? "Payment Term Updated" : "Payment Term Added", `${saved.name} saved successfully.`);
      } catch (err) {
        notifyError("Save Payment Term Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleNavigatePurchaseCategoryEdit = useCallback((record: PurchaseCategoryRecord) => {
    setEditingPurchaseCategory(record);
    const nextState: ViewState = { type: "purchase-category-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/purchase-category/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeletePurchaseCategory = useCallback(
    async (id: string) => {
      try {
        await deletePurchaseCategoryApi(id);
        setPurchaseCategoryRecords((prev) =>
          prev.filter((c) => c.id !== id).map((c, idx) => ({ ...c, no: idx + 1 }))
        );
        notifySuccess("Purchase Category Deleted", "Purchase Category deleted successfully.");
      } catch (err) {
        notifyError("Delete Purchase Category Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSavePurchaseCategory = useCallback(
    async (data: { code: string; name: string }, editId?: string) => {
      try {
        const saved = await savePurchaseCategoryApi(data.code, data.name, editId);
        if (!saved) {
          throw new Error("Failed to save Purchase Category.");
        }
        if (editId) {
          setPurchaseCategoryRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
        } else {
          setPurchaseCategoryRecords((prev) => [saved, ...prev.map((c, idx) => ({ ...c, no: idx + 2 }))]);
        }
        setEditingPurchaseCategory(null);
        handleNavigateList("purchase-category", "/procurement/purchase-master/purchase-category");
        notifySuccess(
          editId ? "Purchase Category Updated" : "Purchase Category Added",
          `${saved.categoryName} saved successfully.`
        );
      } catch (err) {
        notifyError("Save Purchase Category Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleNavigateDeliveryTermEdit = useCallback((record: DeliveryTermRecord) => {
    setEditingDeliveryTerm(record);
    const nextState: ViewState = { type: "delivery-terms-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/delivery-terms/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeleteDeliveryTerm = useCallback(
    async (id: string) => {
      try {
        await deleteDeliveryTermApi(id);
        setDeliveryTermRecords((prev) =>
          prev.filter((d) => d.id !== id).map((d, idx) => ({ ...d, no: idx + 1 }))
        );
        notifySuccess("Delivery Term Deleted", "Delivery Term deleted successfully.");
      } catch (err) {
        notifyError("Delete Delivery Term Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSaveDeliveryTerm = useCallback(
    async (data: { name: string }, editId?: string) => {
      try {
        const saved = await saveDeliveryTermApi(data.name, editId);
        if (editId) {
          setDeliveryTermRecords((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
        } else {
          setDeliveryTermRecords((prev) => [saved, ...prev.map((d, idx) => ({ ...d, no: idx + 2 }))]);
        }
        setEditingDeliveryTerm(null);
        handleNavigateList("delivery-terms", "/procurement/purchase-master/delivery-terms");
        notifySuccess(editId ? "Delivery Term Updated" : "Delivery Term Added", `${saved.name} saved successfully.`);
      } catch (err) {
        notifyError("Save Delivery Term Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleNavigateAdditionalCostEdit = useCallback((record: AdditionalCostRecord) => {
    setEditingAdditionalCost(record);
    const nextState: ViewState = { type: "additional-costs-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/additional-costs/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeleteAdditionalCost = useCallback(
    async (id: string) => {
      try {
        await deleteAdditionalCostApi(id);
        setAdditionalCostRecords((prev) =>
          prev.filter((a) => a.id !== id).map((a, idx) => ({ ...a, no: idx + 1 }))
        );
        notifySuccess("Additional Cost Deleted", "Additional Cost deleted successfully.");
      } catch (err) {
        notifyError("Delete Additional Cost Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSaveAdditionalCost = useCallback(
    async (data: { code: string; name: string }, editId?: string) => {
      try {
        const saved = await saveAdditionalCostApi(data.code, data.name, editId);
        if (editId) {
          setAdditionalCostRecords((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
        } else {
          setAdditionalCostRecords((prev) => [saved, ...prev.map((a, idx) => ({ ...a, no: idx + 2 }))]);
        }
        setEditingAdditionalCost(null);
        handleNavigateList("additional-costs", "/procurement/purchase-master/additional-costs");
        notifySuccess(editId ? "Additional Cost Updated" : "Additional Cost Added", `${saved.costName} saved successfully.`);
      } catch (err) {
        notifyError("Save Additional Cost Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleNavigatePphEdit = useCallback((record: PphRecord) => {
    setEditingPph(record);
    const nextState: ViewState = { type: "pph-edit", id: record.id, record };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/procurement/purchase-master/pph/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleDeletePph = useCallback(
    async (id: string) => {
      try {
        await deletePphApi(id);
        setPphRecords((prev) => prev.filter((p) => p.id !== id));
        notifySuccess("PPH Deleted", "PPH rate deleted successfully.");
      } catch (err) {
        notifyError("Delete PPH Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleSavePph = useCallback(
    async (newRec: PphRecord, isEdit?: boolean) => {
      try {
        const saved = await savePphApi(newRec, isEdit);
        if (isEdit) {
          setPphRecords((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        } else {
          setPphRecords((prev) => [saved, ...prev]);
        }
        setEditingPph(null);
        handleNavigateList("pph", "/procurement/purchase-master/pph");
        notifySuccess(isEdit ? "PPH Updated" : "PPH Added", `${saved.name} saved successfully.`);
      } catch (err) {
        notifyError("Save PPH Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
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
      notifySuccess("Request Material Saved", "Request material saved successfully.");
    } catch (err) {
      console.error("Failed to save Request Material:", err);
      notifyError("Save Request Material Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

  // Navigate to create new record view
  const handleNavigateCreate = useCallback((
    module: "warehouse" | "supplier" | "payment-term" | "purchase-category" | "delivery-terms" | "additional-costs" | "pph" | "unit" | "classification" | "department" | "brand" | "facility" | "hs" | "category" | "style" | "colour" | "color" | "item" | "receive-note" | "receive-note-return",
    poNumber?: string,
    rnNumber?: string
  ) => {
    const resetEditingMap: Partial<Record<typeof module, () => void>> = {
      item: () => setEditingItem(null),
      colour: () => setEditingColor(null),
      color: () => setEditingColor(null),
      style: () => setEditingStyle(null),
      category: () => setEditingCategory(null),
      hs: () => setEditingHs(null),
      facility: () => setEditingFacility(null),
      brand: () => setEditingBrand(null),
      department: () => setEditingDepartment(null),
      classification: () => setEditingClassification(null),
      unit: () => setEditingUnit(null),
      supplier: () => setEditingSupplier(null),
      "payment-term": () => setEditingPaymentTerm(null),
      "purchase-category": () => setEditingPurchaseCategory(null),
      "delivery-terms": () => setEditingDeliveryTerm(null),
      "additional-costs": () => setEditingAdditionalCost(null),
      pph: () => setEditingPph(null),
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

  const handleNavigateReferenceCreate = useCallback((refPage: ReferenceMasterPageKey) => {
    const cfg = REFERENCE_MASTER_CONFIGS[refPage];
    const nextState: ViewState = { type: "reference-master-create", page: refPage };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", cfg.createPath);
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
        notifySuccess(isEdit ? "Unit Updated" : "Unit Added", `${record.name} saved successfully.`);
      } catch (err) {
        console.error("Unit API sync failed:", err);
        notifyError("Save Unit Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteUnit = useCallback(
    async (id: string) => {
      try {
        await deleteUnitApi(id);
        setUnitRecords((prev) => prev.filter((u) => u.id !== id));
        notifySuccess("Unit Deleted", "Unit deleted successfully.");
      } catch (err) {
        console.error("Unit API delete failed:", err);
        notifyError("Delete Unit Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleUnitStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Unit",
        setUnitRecords,
        toggleUnitStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(
          isEdit ? "Classification Updated" : "Classification Added",
          `${record.name} saved successfully.`
        );
      } catch (err) {
        console.error("Classification API sync failed:", err);
        notifyError("Save Classification Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteClassification = useCallback(
    async (id: string) => {
      try {
        await deleteClassificationApi(id);
        setClassificationRecords((prev) => prev.filter((c) => c.id !== id));
        notifySuccess("Classification Deleted", "Classification deleted successfully.");
      } catch (err) {
        console.error("Classification delete failed:", err);
        notifyError("Delete Classification Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleClassificationStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Classification",
        setClassificationRecords,
        toggleClassificationStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(
          isEdit ? "Department Updated" : "Department Added",
          `${record.sectionName} saved successfully.`
        );
      } catch (err) {
        console.error("Department API sync failed:", err);
        notifyError("Save Department Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteDepartment = useCallback(
    async (id: string) => {
      try {
        await deleteDepartmentApi(id);
        setDepartmentRecords((prev) => prev.filter((d) => d.id !== id));
        notifySuccess("Department Deleted", "Department deleted successfully.");
      } catch (err) {
        console.error("Department delete failed:", err);
        notifyError("Delete Department Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleDepartmentStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Department",
        setDepartmentRecords,
        toggleDepartmentStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(isEdit ? "Brand Updated" : "Brand Added", `${record.name} saved successfully.`);
      } catch (err) {
        console.error("Brand API sync failed:", err);
        notifyError("Save Brand Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteBrand = useCallback(
    async (id: string) => {
      try {
        await deleteBrandApi(id);
        setBrandRecords((prev) => prev.filter((b) => b.id !== id));
        notifySuccess("Brand Deleted", "Brand deleted successfully.");
      } catch (err) {
        console.error("Brand delete failed:", err);
        notifyError("Delete Brand Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleBrandStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Brand",
        setBrandRecords,
        toggleBrandStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(
          isEdit ? "Facility Updated" : "Facility Added",
          `${record.name} saved successfully.`
        );
      } catch (err) {
        console.error("Facility API sync failed:", err);
        notifyError("Save Facility Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteFacility = useCallback(
    async (id: string) => {
      try {
        await deleteFacilityApi(id);
        setFacilityRecords((prev) => prev.filter((f) => f.id !== id));
        notifySuccess("Facility Deleted", "Facility deleted successfully.");
      } catch (err) {
        console.error("Facility delete failed:", err);
        notifyError("Delete Facility Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleFacilityStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Facility",
        setFacilityRecords,
        toggleFacilityStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(isEdit ? "HS Code Updated" : "HS Code Added", `${record.name} saved successfully.`);
      } catch (err) {
        console.error("HS API sync failed:", err);
        notifyError("Save HS Code Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteHs = useCallback(
    async (id: string) => {
      try {
        await deleteHsApi(id);
        setHsRecords((prev) => prev.filter((h) => h.id !== id));
        notifySuccess("HS Code Deleted", "HS Code deleted successfully.");
      } catch (err) {
        console.error("HS delete failed:", err);
        notifyError("Delete HS Code Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

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
        notifySuccess(
          isEdit ? "Category Updated" : "Category Added",
          `${record.name} saved successfully.`
        );
      } catch (err) {
        console.error("Category API sync failed:", err);
        notifyError("Save Category Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await deleteCategoryApi(id);
        setCategoryRecords((prev) => prev.filter((c) => c.id !== id));
        notifySuccess("Category Deleted", "Category deleted successfully.");
      } catch (err) {
        console.error("Category delete failed:", err);
        notifyError("Delete Category Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleCategoryStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Category",
        setCategoryRecords,
        toggleCategoryStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
        notifySuccess(isEdit ? "Style Updated" : "Style Added", `${record.name} saved successfully.`);
      } catch (err) {
        console.error("Style API sync failed:", err);
        notifyError("Save Style Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteStyle = useCallback(
    async (id: string) => {
      try {
        await deleteStyleApi(id);
        setStyleRecords((prev) => prev.filter((s) => s.id !== id));
        notifySuccess("Style Deleted", "Style deleted successfully.");
      } catch (err) {
        console.error("Style delete failed:", err);
        notifyError("Delete Style Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleStyleStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Style",
        setStyleRecords,
        toggleStyleStatusApi,
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

  const handleNavigateColorEdit = useCallback((record: ColorRecord) => {
    setEditingColor(record);
    const nextState: ViewState = { type: "colour-edit", id: record.id, record };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/exim/master/colour/edit/${encodeURIComponent(record.id)}`);
    }
  }, []);

  const handleSaveColor = useCallback(
    async (record: ColorRecord, isEdit = false) => {
      try {
        const saved = await saveColorApi(record, isEdit);
        if (saved) {
          if (isEdit) {
            setColorRecords((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
          } else {
            setColorRecords((prev) => [saved, ...prev]);
          }
        }
        setEditingColor(null);
        handleNavigateList("colour", "/exim/master/colour");
        notifySuccess(isEdit ? "Colour Updated" : "Colour Added", `${record.name} saved successfully.`);
      } catch (err) {
        console.error("Color API sync failed:", err);
        notifyError("Save Colour Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteColor = useCallback(
    async (id: string) => {
      try {
        await deleteColorApi(id);
        setColorRecords((prev) => prev.filter((c) => c.id !== id));
        notifySuccess("Colour Deleted", "Colour deleted successfully.");
      } catch (err) {
        console.error("Colour delete failed:", err);
        notifyError("Delete Colour Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleColorStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Colour",
        setColorRecords,
        (recordId) => toggleColorStatusApi(recordId),
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
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
      notifySuccess("Receive Note Saved", "Receive note saved successfully.");
    } catch (err) {
      console.error("Failed to persist Receive Note to backend:", err);
      notifyError("Save Receive Note Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

  const {
    handleNavigateCountryCreate,
    handleNavigateCountryEdit,
    handleSaveCountry,
    handleDeleteCountry,
    handleToggleCountryStatus,
    handleNavigateAccountCreate,
    handleNavigateAccountEdit,
    handleSaveAccount,
    handleDeleteAccount,
    handleToggleAccountStatus,
    handleNavigateJobNumberCreate,
    handleNavigateJobNumberEdit,
    handleSaveJobNumber,
    handleDeleteJobNumber,
    handleToggleJobNumberStatus,
    handleNavigateRafaksiTypeCreate,
    handleNavigateRafaksiTypeEdit,
    handleSaveRafaksiType,
    handleDeleteRafaksiType,
    handleToggleRafaksiTypeStatus,
    handleNavigateCurrencyCreate,
    handleNavigateCurrencyEdit,
    handleSaveCurrency,
    handleDeleteCurrency,
    handleToggleCurrencyStatus,
    handleNavigateUnitReferenceCreate,
    handleNavigateUnitReferenceEdit,
    handleSaveUnitReference,
    handleDeleteUnitReference,
    handleToggleUnitReferenceStatus,
    handleNavigateTransferStockReturnCreate,
    handleNavigateTransferStockReturnEdit,
    handleNavigateTransferStockReturnDetail,
  } = useAdditionalMasterHandlers({
    setViewState,
    handleNavigateList,
    setCountryRecords,
    setAccountRecords,
    setJobNumberRecords,
    setRafaksiTypeRecords,
    setCurrencyRecords,
    setUnitReferenceRecords,
  });

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

  const handleNavigateMasterWarehouseCreate = useCallback(() => {
    setEditingWarehouseMaster(null);
    const nextState: ViewState = { type: "warehouse-master-create" };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", "/warehouse/master/warehouse/create");
    }
  }, []);

  const handleNavigateWarehouseMasterEdit = useCallback((warehouse: WarehouseMasterRecord) => {
    setEditingWarehouseMaster(warehouse);
    const nextState: ViewState = { type: "warehouse-master-edit", id: warehouse.id, record: warehouse };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/master/warehouse/edit/${encodeURIComponent(warehouse.id)}`);
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
    async (newRecord: WarehouseMasterRecord, isEdit = false) => {
      try {
        const saved = await saveWarehouseMasterApi(newRecord, isEdit);
        if (isEdit) {
          setWarehouseMasterRecords((prev) => prev.map((w) => (w.id === saved.id ? saved : w)));
        } else {
          setWarehouseMasterRecords((prev) => [
            { ...saved, no: 1 },
            ...prev.map((w) => ({ ...w, no: w.no + 1 })),
          ]);
        }
        setEditingWarehouseMaster(null);
        const nextState: ViewState = { type: "list", page: "warehouse-master" };
        setViewState(nextState);

        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
          window.history.pushState(nextState, "", "/warehouse/master/warehouse");
        }
        notifySuccess(isEdit ? "Warehouse Updated" : "Warehouse Added", `${saved.name} saved successfully.`);
      } catch (err) {
        console.error("Warehouse Master API sync failed:", err);
        notifyError("Save Warehouse Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleDeleteWarehouseMaster = useCallback(
    async (id: string) => {
      try {
        await deleteWarehouseMasterApi(id);
        setWarehouseMasterRecords((prev) =>
          prev.filter((w) => w.id !== id).map((w, idx) => ({ ...w, no: idx + 1 }))
        );
        notifySuccess("Warehouse Deleted", "Warehouse deleted successfully.");
      } catch (err) {
        console.error("Warehouse Master delete failed:", err);
        notifyError("Delete Warehouse Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleWarehouseMasterStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Warehouse",
        setWarehouseMasterRecords,
        (recordId) => toggleWarehouseMasterStatusApi(recordId),
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
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
        notifySuccess("Coordinate Saved", "Warehouse coordinate saved successfully.");
      } catch (err) {
        console.error("Warehouse coordinate API sync failed:", err);
        notifyError("Save Coordinate Failed", err);
        throw err;
      }
    },
    [warehouseMasterRecords, notifySuccess, notifyError]
  );

  const handleToggleWarehouseCoordinateStatus = useCallback(
    async (warehouseId: string, coordinateId: string) => {
      const targetWh = warehouseMasterRecords.find((w) => w.id === warehouseId);
      const currentCoord = targetWh?.coordinates?.find((c) => c.id === coordinateId);
      const previousStatus = currentCoord?.status !== false;
      const nextStatus = !previousStatus;

      setWarehouseMasterRecords((prev) =>
        prev.map((w) =>
          w.id === warehouseId
            ? {
                ...w,
                coordinates: (w.coordinates || []).map((c) =>
                  c.id === coordinateId ? { ...c, status: nextStatus } : c
                ),
              }
            : w
        )
      );

      try {
        const ok = await toggleWarehouseCoordinateStatusApi(coordinateId, nextStatus);
        if (!ok) {
          throw new Error("Failed to update warehouse coordinate status.");
        }
        notifySuccess("Status Updated", "Warehouse coordinate status updated.");
      } catch (err) {
        setWarehouseMasterRecords((prev) =>
          prev.map((w) =>
            w.id === warehouseId
              ? {
                  ...w,
                  coordinates: (w.coordinates || []).map((c) =>
                    c.id === coordinateId ? { ...c, status: previousStatus } : c
                  ),
                }
              : w
          )
        );
        notifyError("Status Update Failed", err);
      }
    },
    [warehouseMasterRecords, notifySuccess, notifyError]
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
        notifySuccess("Coordinate Deleted", "Warehouse coordinate deleted successfully.");
      } catch (err) {
        console.error("Warehouse coordinate delete failed:", err);
        notifyError("Delete Coordinate Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
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
      notifySuccess("Receive Note Return Saved", "Receive note return saved successfully.");
    } catch (err) {
      console.error("Failed to persist Receive Note Return to backend:", err);
      notifyError("Save Receive Note Return Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

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
        if (isEdit) {
          setItemRecords((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
        } else {
          setItemRecords((prev) => [saved, ...prev]);
        }
        setEditingItem(null);
        handleNavigateList("item", "/exim/master/item");
        notifySuccess(isEdit ? "Item Updated" : "Item Added", `${saved.itemName} saved successfully.`);
      } catch (err) {
        console.error("Item API sync failed:", err);
        notifyError("Save Item Failed", err);
        throw err;
      }
    },
    [handleNavigateList, notifySuccess, notifyError]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      try {
        await deleteItemApi(id);
        setItemRecords((prev) => prev.filter((i) => i.id !== id));
        notifySuccess("Item Deleted", "Item deleted successfully.");
      } catch (err) {
        console.error("Item delete failed:", err);
        notifyError("Delete Item Failed", err);
        throw err;
      }
    },
    [notifySuccess, notifyError]
  );

  const handleToggleItemStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Item",
        setItemRecords,
        (recordId) => toggleItemStatusApi(recordId),
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
      notifySuccess(
        isEdit ? "Stock Notification Updated" : "Stock Notification Added",
        "Stock notification rule saved successfully."
      );
    } catch (err) {
      console.error("Stock Notification API sync failed:", err);
      notifyError("Save Stock Notification Failed", err);
      throw err;
    }
  }, [handleNavigateList, notifySuccess, notifyError]);

  const handleDeleteStockNotification = useCallback(async (id: string) => {
    try {
      await deleteStockNotificationApi(id);
      setStockNotificationRecords((prev) => prev.filter((r) => r.id !== id));
      notifySuccess("Stock Notification Deleted", "Stock notification deleted successfully.");
    } catch (err) {
      console.error("Stock Notification delete failed:", err);
      notifyError("Delete Stock Notification Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

  const handleToggleStockNotificationStatus = useCallback(
    async (id: string) => {
      const target = stockNotificationRecords.find((r) => r.id === id);
      const previousStatus = target?.status ?? "Active";
      const nextStatus: StockNotificationRecord["status"] =
        previousStatus === "Active" ? "Inactive" : "Active";

      setStockNotificationRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r))
      );

      try {
        const updated = await toggleStockNotificationStatusApi(id);
        if (!updated) {
          throw new Error("Failed to update Stock Notification status.");
        }
        setStockNotificationRecords((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, ...updated, no: r.no } : r
          )
        );
        notifySuccess("Status Updated", "Stock notification status updated.");
      } catch (err) {
        setStockNotificationRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: previousStatus } : r))
        );
        notifyError("Status Update Failed", err);
      }
    },
    [stockNotificationRecords, notifySuccess, notifyError]
  );

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
      if (isEdit) {
        setTypeOfRequestRecords((prev) =>
          prev.map((r) => (r.id === saved.id ? saved : r))
        );
      } else {
        setTypeOfRequestRecords((prev) => [saved, ...prev]);
      }
      setEditingTypeOfRequest(null);
      handleNavigateList("wh-type-of-request", "/warehouse/master/type-of-request");
      notifySuccess(
        isEdit ? "Type of Request Updated" : "Type of Request Added",
        `${record.name} saved successfully.`
      );
    } catch (err) {
      console.error("Type of Request API sync failed:", err);
      notifyError("Save Type of Request Failed", err);
      throw err;
    }
  }, [handleNavigateList, notifySuccess, notifyError]);

  const handleDeleteTypeOfRequest = useCallback(async (id: string) => {
    try {
      await deleteWarehouseTypeOfRequestApi(id);
      setTypeOfRequestRecords((prev) => prev.filter((r) => r.id !== id));
      notifySuccess("Type of Request Deleted", "Type of request deleted successfully.");
    } catch (err) {
      console.error("Type of Request delete failed:", err);
      notifyError("Delete Type of Request Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

  const handleToggleTypeOfRequestStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Type of Request",
        setTypeOfRequestRecords,
        (recordId) => toggleWarehouseTypeOfRequestStatusApi(recordId),
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
      if (isEdit) {
        setDestinationLocationRecords((prev) =>
          prev.map((r) => (r.id === saved.id ? saved : r))
        );
      } else {
        setDestinationLocationRecords((prev) => [saved, ...prev]);
      }
      setEditingDestinationLocation(null);
      handleNavigateList("wh-destination-location", "/warehouse/master/destination-location");
      notifySuccess(
        isEdit ? "Destination Location Updated" : "Destination Location Added",
        `${record.name} saved successfully.`
      );
    } catch (err) {
      console.error("Destination Location API sync failed:", err);
      notifyError("Save Destination Location Failed", err);
      throw err;
    }
  }, [handleNavigateList, notifySuccess, notifyError]);

  const handleDeleteDestinationLocation = useCallback(async (id: string) => {
    try {
      await deleteDestinationLocationApi(id);
      setDestinationLocationRecords((prev) => prev.filter((r) => r.id !== id));
      notifySuccess("Destination Location Deleted", "Destination location deleted successfully.");
    } catch (err) {
      console.error("Destination Location delete failed:", err);
      notifyError("Delete Destination Location Failed", err);
      throw err;
    }
  }, [notifySuccess, notifyError]);

  const handleToggleDestinationLocationStatus = useCallback(
    (id: string) =>
      runOptimisticStatusToggle(
        id,
        "status",
        "Destination Location",
        setDestinationLocationRecords,
        (recordId) => toggleDestinationLocationStatusApi(recordId),
        notifySuccess,
        notifyError
      ),
    [notifySuccess, notifyError]
  );

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
      : activeSidebarPage && pageMeta[activeSidebarPage]
        ? pageMeta[activeSidebarPage]
        : pageMeta.dashboard;

  const isRouteForbidden =
    authReady &&
    isAuthenticated &&
    Boolean(activeSidebarPage) &&
    activeSidebarPage !== "dashboard" &&
    SIDEBAR_GUARDED_PAGES.has(activeSidebarPage as string) &&
    viewState.type !== "edit-profile" &&
    viewState.type !== "not-found" &&
    !canAccessSidebarItem(activeSidebarPage as string);

  return (
    <>
      <AppLayout
        activePage={activeSidebarPage}
        onNavigate={handleNavigateList}
        onNavigateProfile={handleNavigateProfile}
        onRequestLogout={handleRequestLogout}
        hideDefaultHeader={hideDefaultHeader && !isRouteForbidden}
      >
        {isRouteForbidden ? (
          <div className="master-page-shell">
            <div className="route-guard-card">
              <h2 className="route-guard-card__title">Access Restricted</h2>
              <p className="route-guard-card__desc">
                You do not have permission to access this module or action. Contact your system administrator if you require access.
              </p>
              <div className="master-actions-group">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleNavigateList("dashboard", "/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <AppViewRenderer
            viewState={viewState}
            currentMeta={currentMeta}
            handleNavigateList={handleNavigateList}
            handleNavigateDetail={handleNavigateDetail}
            handleNavigateCreate={handleNavigateCreate}
            handleNavigateReferenceCreate={handleNavigateReferenceCreate}
            handleNavigatePrCreate={handleNavigatePrCreate}
            handleNavigatePoCreate={handleNavigatePoCreate}
            handleNavigateReceiveNoteDetail={handleNavigateReceiveNoteDetail}
            handleNavigateReceiveNoteReturnDetail={handleNavigateReceiveNoteReturnDetail}
            handleNavigateDocumentHistoryDetail={handleNavigateDocumentHistoryDetail}
            handleNavigateRequestMaterialCreate={handleNavigateRequestMaterialCreate}
            handleNavigateRequestMaterialDetail={handleNavigateRequestMaterialDetail}
            handleNavigateTransferStockReturnCreate={handleNavigateTransferStockReturnCreate}
            handleNavigateTransferStockReturnEdit={handleNavigateTransferStockReturnEdit}
            handleNavigateTransferStockReturnDetail={handleNavigateTransferStockReturnDetail}
            handleNavigateMasterWarehouseCreate={handleNavigateMasterWarehouseCreate}
            handleNavigateWarehouseMasterEdit={handleNavigateWarehouseMasterEdit}
            handleDeleteWarehouseMaster={handleDeleteWarehouseMaster}
            handleToggleWarehouseMasterStatus={handleToggleWarehouseMasterStatus}
            handleNavigateWarehouseCoordinates={handleNavigateWarehouseCoordinates}
            handleNavigateWarehouseCoordinateCreate={handleNavigateWarehouseCoordinateCreate}
            handleNavigateStockNotificationCreate={handleNavigateStockNotificationCreate}
            handleEditStockNotification={handleEditStockNotification}
            handleSaveStockNotification={handleSaveStockNotification}
            handleDeleteStockNotification={handleDeleteStockNotification}
            handleToggleStockNotificationStatus={handleToggleStockNotificationStatus}
            handleNavigateTypeOfRequestCreate={handleNavigateTypeOfRequestCreate}
            handleEditTypeOfRequest={handleEditTypeOfRequest}
            handleSaveTypeOfRequest={handleSaveTypeOfRequest}
            handleDeleteTypeOfRequest={handleDeleteTypeOfRequest}
            handleToggleTypeOfRequestStatus={handleToggleTypeOfRequestStatus}
            handleNavigateDestinationLocationCreate={handleNavigateDestinationLocationCreate}
            handleEditDestinationLocation={handleEditDestinationLocation}
            handleSaveDestinationLocation={handleSaveDestinationLocation}
            handleDeleteDestinationLocation={handleDeleteDestinationLocation}
            handleToggleDestinationLocationStatus={handleToggleDestinationLocationStatus}
            handleToggleSupplierHide={handleToggleSupplierHide}
            handleTogglePaymentTermHide={handleTogglePaymentTermHide}
            handleTogglePurchaseCategoryHide={handleTogglePurchaseCategoryHide}
            handleToggleDeliveryTermHide={handleToggleDeliveryTermHide}
            handleToggleAdditionalCostHide={handleToggleAdditionalCostHide}
            handleTogglePphHide={handleTogglePphHide}
            handleNavigateSupplierEdit={handleNavigateSupplierEdit}
            handleDeleteSupplier={handleDeleteSupplier}
            handleSaveSupplier={handleSaveSupplier}
            handleNavigatePaymentTermEdit={handleNavigatePaymentTermEdit}
            handleDeletePaymentTerm={handleDeletePaymentTerm}
            handleSavePaymentTerm={handleSavePaymentTerm}
            handleNavigatePurchaseCategoryEdit={handleNavigatePurchaseCategoryEdit}
            handleDeletePurchaseCategory={handleDeletePurchaseCategory}
            handleSavePurchaseCategory={handleSavePurchaseCategory}
            handleNavigateDeliveryTermEdit={handleNavigateDeliveryTermEdit}
            handleDeleteDeliveryTerm={handleDeleteDeliveryTerm}
            handleSaveDeliveryTerm={handleSaveDeliveryTerm}
            handleNavigateAdditionalCostEdit={handleNavigateAdditionalCostEdit}
            handleDeleteAdditionalCost={handleDeleteAdditionalCost}
            handleSaveAdditionalCost={handleSaveAdditionalCost}
            handleNavigatePphEdit={handleNavigatePphEdit}
            handleDeletePph={handleDeletePph}
            handleSavePph={handleSavePph}
            handleNavigateUnitEdit={handleNavigateUnitEdit}
            handleSaveUnit={handleSaveUnit}
            handleDeleteUnit={handleDeleteUnit}
            handleToggleUnitStatus={handleToggleUnitStatus}
            handleNavigateUnitReferenceCreate={handleNavigateUnitReferenceCreate}
            handleNavigateUnitReferenceEdit={handleNavigateUnitReferenceEdit}
            handleSaveUnitReference={handleSaveUnitReference}
            handleDeleteUnitReference={handleDeleteUnitReference}
            handleToggleUnitReferenceStatus={handleToggleUnitReferenceStatus}
            isUnitReferencesLoading={masterFetchStates["unit-references"] !== "done"}
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
            handleNavigateColorEdit={handleNavigateColorEdit}
            handleSaveColor={handleSaveColor}
            handleDeleteColor={handleDeleteColor}
            handleToggleColorStatus={handleToggleColorStatus}
            handleSaveReceiveNote={handleSaveReceiveNote}
            handleSaveReceiveNoteReturn={handleSaveReceiveNoteReturn}
            handleSaveWarehouseMaster={handleSaveWarehouseMaster}
            handleSaveWarehouseCoordinate={handleSaveWarehouseCoordinate}
            handleDeleteWarehouseCoordinate={handleDeleteWarehouseCoordinate}
            handleToggleWarehouseCoordinateStatus={handleToggleWarehouseCoordinateStatus}
            handleNavigateCountryCreate={handleNavigateCountryCreate}
            handleNavigateCountryEdit={handleNavigateCountryEdit}
            handleSaveCountry={handleSaveCountry}
            handleDeleteCountry={handleDeleteCountry}
            handleToggleCountryStatus={handleToggleCountryStatus}
            isCountriesLoading={masterFetchStates["countries"] !== "done"}
            handleNavigateAccountCreate={handleNavigateAccountCreate}
            handleNavigateAccountEdit={handleNavigateAccountEdit}
            handleSaveAccount={handleSaveAccount}
            handleDeleteAccount={handleDeleteAccount}
            handleToggleAccountStatus={handleToggleAccountStatus}
            isAccountsLoading={masterFetchStates["accounts"] !== "done"}
            isReportingTypesLoading={masterFetchStates["reporting-types"] !== "done"}
            handleNavigateJobNumberCreate={handleNavigateJobNumberCreate}
            handleNavigateJobNumberEdit={handleNavigateJobNumberEdit}
            handleSaveJobNumber={handleSaveJobNumber}
            handleDeleteJobNumber={handleDeleteJobNumber}
            handleToggleJobNumberStatus={handleToggleJobNumberStatus}
            isJobNumbersLoading={masterFetchStates["job-numbers"] !== "done"}
            handleNavigateRafaksiTypeCreate={handleNavigateRafaksiTypeCreate}
            handleNavigateRafaksiTypeEdit={handleNavigateRafaksiTypeEdit}
            handleSaveRafaksiType={handleSaveRafaksiType}
            handleDeleteRafaksiType={handleDeleteRafaksiType}
            handleToggleRafaksiTypeStatus={handleToggleRafaksiTypeStatus}
            isRafaksiTypesLoading={masterFetchStates["rafaksi-types"] !== "done"}
            handleNavigateCurrencyCreate={handleNavigateCurrencyCreate}
            handleNavigateCurrencyEdit={handleNavigateCurrencyEdit}
            handleSaveCurrency={handleSaveCurrency}
            handleDeleteCurrency={handleDeleteCurrency}
            handleToggleCurrencyStatus={handleToggleCurrencyStatus}
            isCurrenciesLoading={masterFetchStates["currencies"] !== "done"}
            handleNavigateGenerateQr={handleNavigateGenerateQr}
            handleNavigateItemEdit={handleNavigateItemEdit}
            handleSaveItem={handleSaveItem}
            handleDeleteItem={handleDeleteItem}
            handleToggleItemStatus={handleToggleItemStatus}
            handleSaveRequestMaterial={handleSaveRequestMaterial}
            handleProfileCancel={handleProfileCancel}
            handleProfileSaveConfirmed={handleProfileSaveConfirmed}
            supplierRecords={supplierRecords}
            editingSupplier={editingSupplier}
            setEditingSupplier={setEditingSupplier}
            paymentTermRecords={paymentTermRecords}
            editingPaymentTerm={editingPaymentTerm}
            setEditingPaymentTerm={setEditingPaymentTerm}
            purchaseCategoryRecords={purchaseCategoryRecords}
            editingPurchaseCategory={editingPurchaseCategory}
            setEditingPurchaseCategory={setEditingPurchaseCategory}
            deliveryTermRecords={deliveryTermRecords}
            editingDeliveryTerm={editingDeliveryTerm}
            setEditingDeliveryTerm={setEditingDeliveryTerm}
            additionalCostRecords={additionalCostRecords}
            editingAdditionalCost={editingAdditionalCost}
            setEditingAdditionalCost={setEditingAdditionalCost}
            pphRecords={pphRecords}
            editingPph={editingPph}
            setEditingPph={setEditingPph}
            unitRecords={unitRecords}
            editingUnit={editingUnit}
            setEditingUnit={setEditingUnit}
            unitReferenceRecords={unitReferenceRecords}
            classificationRecords={classificationRecords}
            reportingTypeRecords={reportingTypeRecords}
            editingClassification={editingClassification}
            setEditingClassification={setEditingClassification}
            departmentRecords={departmentRecords}
            isDepartmentsLoading={masterFetchStates.departments === "loading"}
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
            editingColor={editingColor}
            setEditingColor={setEditingColor}
            itemRecords={itemRecords}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            receiveNoteRecords={receiveNoteRecords}
            setReceiveNoteRecords={setReceiveNoteRecords}
            receiveNoteReturnRecords={receiveNoteReturnRecords}
            documentHistoryRecords={documentHistoryRecords}
            warehouseMasterRecords={warehouseMasterRecords}
            editingWarehouseMaster={editingWarehouseMaster}
            setEditingWarehouseMaster={setEditingWarehouseMaster}
            warehouseTypeRecords={warehouseTypeRecords}
            isWarehouseTypesLoading={masterFetchStates["warehouse-types"] !== "done"}
            referenceRecordsMap={referenceRecordsMap}
            masterFetchStates={masterFetchStates}
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
