import { useState, useEffect, useCallback, useRef } from "react";
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
  FacilityIndex,
  FacilityForm,
  HsIndex,
  HsForm,
  CategoryIndex,
  CategoryForm,
  StyleIndex,
  StyleForm,
  StyleImport,
  ColorIndex,
  ColorForm,
  ReceiveNoteIndex,
  ReceiveNoteDetail,
  ReceiveNoteForm,
  ReceiveNoteReturnIndex,
  ReceiveNoteReturnDetail,
  ReceiveNoteReturnForm,
  DocumentHistoryIndex,
  DocumentHistoryDetail,
  MasterWarehouseIndex,
  WarehouseCoordinateIndex,
  WarehouseMasterForm,
  WarehouseCoordinateForm,
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
  NotFoundPage,
  CountryIndex,
  AccountIndex,
  JobNumberIndex,
  RafaksiTypeIndex,
  CurrencyIndex,
  PurchaseRequisitionCreate,
  PurchaseOrderCreate,
  StockCardIndex,
  StockItemIndex,
  RequestMaterialIndex,
  RequestMaterialCreate,
  RequestMaterialDetail,
  StockNotificationIndex,
  StockNotificationForm,
  TypeOfRequestIndex,
  TypeOfRequestForm,
  DestinationLocationIndex,
  DestinationLocationForm,
  TransferStockReturnIndex,
  TransferStockReturnDetail,
  UserPermissionAdmin,
  AuditLogAdmin,
} from "../pages";
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

function resolveViewStateFromPath(pathname: string, defaultPage: PageKey = "dashboard"): ViewState {
  const cleanPath = decodeURIComponent(pathname).replace(/\/$/, "");

  // Authentication routes
  if (cleanPath === "/login") {
    return { type: "login" };
  }

  // Authentication gate: if unauthenticated, strictly direct to Login page!
  const isAuth =
    typeof window !== "undefined" &&
    Boolean(sessionStorage.getItem("geniusone_user") || localStorage.getItem("geniusone_user"));

  if (!isAuth) {
    return { type: "login" };
  }

  // Root entry path ("")
  if (cleanPath === "") {
    return { type: "dashboard" };
  }

  // Dashboard
  if (cleanPath === "/dashboard") {
    return { type: "dashboard" };
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
    const searchParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const poParam = searchParams?.get("po") || undefined;
    const rnParam = searchParams?.get("rn") || undefined;
    return { type: "warehouse-create", poNumber: poParam, rnNumber: rnParam };
  }

  if (
    cleanPath === "/warehouse/master/warehouse/create" ||
    cleanPath === "/warehouse/master/warehouse/add"
  ) {
    return { type: "warehouse-master-create" };
  }

  if (
    cleanPath === "/warehouse/request/request-material/create" ||
    cleanPath === "/warehouse/request/request-material/add"
  ) {
    return { type: "wh-req-material-create" };
  }

  if (
    cleanPath === "/dashboard/stock-notification-master/create" ||
    cleanPath === "/dashboard/stock-notification-master/add" ||
    cleanPath === "/stock-notification-master/create" ||
    cleanPath === "/stock-notification-master/add"
  ) {
    return { type: "stock-notification-create" };
  }

  if (
    cleanPath === "/warehouse/master/type-of-request/create" ||
    cleanPath === "/warehouse/master/type-of-request/add"
  ) {
    return { type: "wh-type-of-request-create" };
  }

  if (
    cleanPath === "/warehouse/master/destination-location/create" ||
    cleanPath === "/warehouse/master/destination-location/add"
  ) {
    return { type: "wh-destination-location-create" };
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

  // PR Create
  if (
    cleanPath === "/procurement/transactions/purchase-requisition/create" ||
    cleanPath === "/procurement/transactions/purchase-requisition/add" ||
    cleanPath === "/procurement/purchase-requisition/create" ||
    cleanPath === "/procurement/purchase-requisition/add" ||
    cleanPath === "/purchase-requisitions/create" ||
    cleanPath === "/purchase-requisition/create" ||
    cleanPath === "/purchase-requisition/add" ||
    cleanPath === "/pr/create" ||
    cleanPath === "/pr/add"
  ) {
    return { type: "pr-create" };
  }

  // PO Create
  if (
    cleanPath === "/procurement/transactions/purchase-order/create" ||
    cleanPath === "/procurement/transactions/purchase-order/add" ||
    cleanPath === "/procurement/purchase-order/create" ||
    cleanPath === "/procurement/purchase-order/add" ||
    cleanPath === "/purchase-orders/create" ||
    cleanPath === "/purchase-order/create" ||
    cleanPath === "/purchase-order/add" ||
    cleanPath === "/po/create" ||
    cleanPath === "/po/add"
  ) {
    const prParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("pr") || undefined : undefined;
    return { type: "po-create", prNumber: prParam };
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
    cleanPath === "/exim/master/facility/create" ||
    cleanPath === "/exim/master/facility/add" ||
    cleanPath === "/exim/facility/create" ||
    cleanPath === "/exim/facility/add"
  ) {
    return { type: "facility-create" };
  }

  if (
    cleanPath === "/exim/master/hs/create" ||
    cleanPath === "/exim/master/hs/add" ||
    cleanPath === "/exim/hs/create" ||
    cleanPath === "/exim/hs/add"
  ) {
    return { type: "hs-create" };
  }

  if (
    cleanPath === "/exim/master/category/create" ||
    cleanPath === "/exim/master/category/add" ||
    cleanPath === "/exim/category/create" ||
    cleanPath === "/exim/category/add"
  ) {
    return { type: "category-create" };
  }

  if (
    cleanPath === "/exim/master/style/create" ||
    cleanPath === "/exim/master/style/add" ||
    cleanPath === "/exim/style/create" ||
    cleanPath === "/exim/style/add"
  ) {
    return { type: "style-create" };
  }

  if (
    cleanPath === "/exim/master/style/import" ||
    cleanPath === "/exim/style/import"
  ) {
    return { type: "style-import" };
  }

  if (
    cleanPath === "/exim/master/colour/create" ||
    cleanPath === "/exim/master/colour/add" ||
    cleanPath === "/exim/colour/create" ||
    cleanPath === "/exim/colour/add" ||
    cleanPath === "/exim/master/color/create" ||
    cleanPath === "/exim/master/color/add" ||
    cleanPath === "/exim/color/create" ||
    cleanPath === "/exim/color/add"
  ) {
    return { type: "colour-create" };
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
    cleanPath === "/exim/receive-note/create" ||
    cleanPath === "/exim/receive-note/add" ||
    cleanPath === "/receive-note/create" ||
    cleanPath === "/receive-note/add"
  ) {
    return { type: "receive-note-create" };
  }

  if (
    cleanPath === "/exim/receive-note-return/create" ||
    cleanPath === "/exim/receive-note-return/add" ||
    cleanPath === "/receive-note-return/create" ||
    cleanPath === "/receive-note-return/add"
  ) {
    return { type: "receive-note-return-create" };
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
  const receiveNoteDetailMatch = cleanPath.match(
    /^\/(?:exim\/receive-note|receive-note)\/details?\/(.+)$/
  );
  if (receiveNoteDetailMatch) {
    return { type: "receive-note-detail", code: decodeURIComponent(receiveNoteDetailMatch[1]) };
  }

  const receiveNoteReturnDetailMatch = cleanPath.match(
    /^\/(?:exim\/receive-note-return|receive-note-return)\/details?\/(.+)$/
  );
  if (receiveNoteReturnDetailMatch) {
    return { type: "receive-note-return-detail", code: decodeURIComponent(receiveNoteReturnDetailMatch[1]) };
  }

  const documentHistoryDetailMatch = cleanPath.match(
    /^\/(?:exim\/document-history|document-history)\/details?\/(.+)$/
  );
  if (documentHistoryDetailMatch) {
    return { type: "document-history-detail", code: decodeURIComponent(documentHistoryDetailMatch[1]) };
  }

  const warehouseCoordCreateMatch = cleanPath.match(
    /^\/warehouse\/master\/warehouse\/(?:([^/]+)\/coordinate\/create|coordinate\/([^/]+)\/create)$/
  );
  if (warehouseCoordCreateMatch) {
    return {
      type: "warehouse-coordinate-create",
      warehouseId: decodeURIComponent(warehouseCoordCreateMatch[1] || warehouseCoordCreateMatch[2]),
    };
  }

  const warehouseCoordMatch = cleanPath.match(
    /^\/warehouse\/master\/warehouse\/(?:([^/]+)\/coordinate|coordinate\/([^/]+))$/
  );
  if (warehouseCoordMatch) {
    return {
      type: "warehouse-coordinate",
      warehouseId: decodeURIComponent(warehouseCoordMatch[1] || warehouseCoordMatch[2]),
    };
  }
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

  const reqMaterialDetailMatch = cleanPath.match(
    /^\/warehouse\/request\/request-material\/(?!create$|add$)(.+)$/
  );
  if (reqMaterialDetailMatch) {
    return { type: "wh-req-material-detail", id: decodeURIComponent(reqMaterialDetailMatch[1]) };
  }

  const transferStockReturnDetailMatch = cleanPath.match(
    /^\/(?:warehouse\/incoming\/transfer-stock-return|warehouse\/incoming\/transfer-stock-retur|warehouse\/transfer-stock-return|warehouse\/transfer_stok_retur)\/(?:details?\/)?(?!create$|add$)(.+)$/
  );
  if (transferStockReturnDetailMatch) {
    return {
      type: "transfer-stock-return-detail",
      code: decodeURIComponent(transferStockReturnDetailMatch[1]),
    };
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
    cleanPath === "/admin/user-permissions" ||
    cleanPath === "/admin/users" ||
    cleanPath === "/admin/permissions" ||
    cleanPath === "/user-permission-admin"
  ) {
    return { type: "list", page: "user-permission-admin" };
  }

  if (
    cleanPath === "/admin/audit-logs" ||
    cleanPath === "/admin/audit" ||
    cleanPath === "/audit-log-admin"
  ) {
    return { type: "list", page: "audit-log-admin" };
  }

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
  if (cleanPath === "/procurement/supplier" || cleanPath === "/procurement/purchase-master/supplier") return { type: "list", page: "supplier" };
  if (cleanPath === "/procurement/payment-term" || cleanPath === "/procurement/purchase-master/payment-term") return { type: "list", page: "payment-term" };
  if (cleanPath === "/procurement/purchase-category" || cleanPath === "/procurement/purchase-master/purchase-category") return { type: "list", page: "purchase-category" };
  if (cleanPath === "/procurement/delivery-terms" || cleanPath === "/procurement/purchase-master/delivery-terms") return { type: "list", page: "delivery-terms" };
  if (cleanPath === "/procurement/additional-costs" || cleanPath === "/procurement/purchase-master/additional-costs") return { type: "list", page: "additional-costs" };
  if (cleanPath === "/procurement/pph" || cleanPath === "/procurement/purchase-master/pph") return { type: "list", page: "pph" };
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
  if (
    cleanPath === "/exim/item" ||
    cleanPath === "/exim/master/item" ||
    cleanPath === "/procurement/purchase-master/item" ||
    cleanPath === "/procurement/master-item" ||
    cleanPath === "/procurement/item" ||
    cleanPath === "/master-item" ||
    cleanPath === "/master/item" ||
    cleanPath === "/item"
  ) {
    return { type: "list", page: "item" };
  }
  if (cleanPath === "/exim/brand" || cleanPath === "/exim/master/brand") return { type: "list", page: "brand" };
  if (cleanPath === "/exim/classification" || cleanPath === "/exim/master/classification") return { type: "list", page: "classification" };
  if (cleanPath === "/exim/department" || cleanPath === "/exim/master/department") return { type: "list", page: "department" };
  if (cleanPath === "/exim/facility" || cleanPath === "/exim/master/facility") return { type: "list", page: "facility" };
  if (cleanPath === "/exim/hs" || cleanPath === "/exim/master/hs") return { type: "list", page: "hs" };
  if (cleanPath === "/exim/category" || cleanPath === "/exim/master/category") return { type: "list", page: "category" };
  if (cleanPath === "/exim/style" || cleanPath === "/exim/master/style") return { type: "list", page: "style" };
  if (
    cleanPath === "/exim/colour" ||
    cleanPath === "/exim/master/colour" ||
    cleanPath === "/exim/color" ||
    cleanPath === "/exim/master/color"
  ) {
    return { type: "list", page: "colour" };
  }
  if (cleanPath === "/exim/receive-note") return { type: "list", page: "receive-note" };
  if (cleanPath === "/exim/receive-note-return") return { type: "list", page: "receive-note-return" };
  if (cleanPath === "/exim/document-history") return { type: "list", page: "document-history" };

  if (cleanPath === "/exim/country" || cleanPath === "/exim/master/country") return { type: "list", page: "country" };
  if (cleanPath === "/exim/account" || cleanPath === "/exim/master/account" || cleanPath === "/procurement/purchase-master/account") return { type: "list", page: "account" };
  if (cleanPath === "/procurement/job-number" || cleanPath === "/procurement/purchase-master/job-number" || cleanPath === "/exim/master/job-number") return { type: "list", page: "job-number" };
  if (cleanPath === "/procurement/rafaksi-type" || cleanPath === "/procurement/purchase-master/rafaksi-type") return { type: "list", page: "rafaksi-type" };
  if (cleanPath === "/exim/currency" || cleanPath === "/exim/master/currency" || cleanPath === "/procurement/purchase-master/currency") return { type: "list", page: "currency" };

  if (cleanPath === "/warehouse/master" || cleanPath === "/warehouse/master/warehouse") return { type: "list", page: "warehouse-master" };
  if (cleanPath === "/warehouse/master/type-of-request" || cleanPath === "/warehouse/type-of-request") return { type: "list", page: "wh-type-of-request" };
  if (cleanPath === "/warehouse/master/destination-location" || cleanPath === "/warehouse/destination-location") return { type: "list", page: "wh-destination-location" };
  if (
    cleanPath === "/dashboard/stock-notification-master" ||
    cleanPath === "/dashboard/notification-master" ||
    cleanPath === "/stock-notification-master" ||
    cleanPath === "/stock-notification"
  ) return { type: "list", page: "stock-notification-master" };
  if (cleanPath === "/warehouse/report/stock-card") return { type: "list", page: "wh-rep-stock-card" };
  if (cleanPath === "/warehouse/report/stock-item") return { type: "list", page: "wh-rep-stock-item" };
  if (cleanPath === "/warehouse/request/request-material") return { type: "list", page: "wh-req-material" };
  if (
    cleanPath === "/warehouse/incoming/transfer-stock-return" ||
    cleanPath === "/warehouse/incoming/transfer-stock-retur" ||
    cleanPath === "/warehouse/transfer-stock-return" ||
    cleanPath === "/warehouse/transfer_stok_retur"
  ) {
    return { type: "list", page: "transfer-stock-return" };
  }

  if (defaultPage === ("not-found" as any) || (cleanPath !== "" && cleanPath !== "/dashboard")) {
    return { type: "not-found", path: cleanPath };
  }
  return { type: "dashboard" };
}

export function App({ initialPage = "dashboard", initialCode = "" }: AppProps) {
  const { isAuthenticated, authReady, logoutUser } = useAuthPermission();
  const [viewState, setViewState] = useState<ViewState>(() => {
    if (typeof window !== "undefined") {
      return resolveViewStateFromPath(window.location.pathname, (initialPage as PageKey) || "dashboard");
    }
    if (initialPage === "not-found") return { type: "not-found" };
    if (initialPage === "dashboard") return { type: "dashboard" };
    if (initialPage === "transfer-stock-return") return { type: "list", page: "transfer-stock-return" };
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
    if (initialPage === "facility-create") return { type: "facility-create" };
    if (initialPage === "hs-create") return { type: "hs-create" };
    if (initialPage === "category-create") return { type: "category-create" };
    if (initialPage === "style-create") return { type: "style-create" };
    if (initialPage === "style-import") return { type: "style-import" };
    if (initialPage === "colour-create" || initialPage === "color-create") return { type: "colour-create" };
    if (initialPage === "receive-note-create") return { type: "receive-note-create" };
    if (initialPage === "receive-note-detail") return { type: "receive-note-detail", code: initialCode || "" };
    if (initialPage === "receive-note-return-create") return { type: "receive-note-return-create" };
    if (initialPage === "receive-note-return-detail") return { type: "receive-note-return-detail", code: initialCode || "" };
    if (initialPage === "document-history-detail") return { type: "document-history-detail", code: initialCode || "" };
    if (initialPage === "warehouse-master-create") return { type: "warehouse-master-create" };
    if (initialPage === "warehouse-coordinate") return { type: "warehouse-coordinate", warehouseId: initialCode || "" };
    if (initialPage === "warehouse-coordinate-create") return { type: "warehouse-coordinate-create", warehouseId: initialCode || "" };
    if (initialPage === "item-create") return { type: "item-create" };
    if (initialPage === "item-qr") return { type: "item-qr" };
    if (initialPage === "pr-detail") return { type: "pr-detail", code: initialCode || "" };
    if (initialPage === "pr-create") return { type: "pr-create" };
    if (initialPage === "po-detail") return { type: "po-detail", code: initialCode || "" };
    if (initialPage === "po-create") return { type: "po-create" };
    if (initialPage === "report-detail") return { type: "report-detail", code: initialCode || "" };
    if (initialPage === "warehouse-detail") return { type: "warehouse-detail", code: initialCode || "" };
    if (initialPage === "wh-req-material-create") return { type: "wh-req-material-create" };
    if (initialPage === "wh-req-material-detail") return { type: "wh-req-material-detail", id: initialCode || "" };
    if (initialPage === "transfer-stock-return-detail") return { type: "transfer-stock-return-detail", code: initialCode || "" };
    if (initialPage === "stock-notification-create") return { type: "stock-notification-create" };
    if (initialPage === "wh-type-of-request-create") return { type: "wh-type-of-request-create" };
    if (initialPage === "wh-destination-location-create") return { type: "wh-destination-location-create" };
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
        : viewState.type === "pr-detail" || viewState.type === "pr-create"
          ? "pr"
          : viewState.type === "po-detail" || viewState.type === "po-create"
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
                                    : viewState.type === "facility-create" || viewState.type === "facility-edit"
                                      ? "facility"
                                      : viewState.type === "hs-create" || viewState.type === "hs-edit"
                                        ? "hs"
                                        : viewState.type === "category-create" || viewState.type === "category-edit"
                                          ? "category"
                                          : viewState.type === "style-create" || viewState.type === "style-edit" || viewState.type === "style-import"
                                            ? "style"
                                            : viewState.type === "colour-create"
                                              ? "colour"
                                              : viewState.type === "receive-note-create" || viewState.type === "receive-note-detail"
                                                ? "receive-note"
                                                : viewState.type === "receive-note-return-create" || viewState.type === "receive-note-return-detail"
                                                  ? "receive-note-return"
                                                  : viewState.type === "document-history-detail"
                                                    ? "document-history"
                                                    : viewState.type === "warehouse-master-create" || viewState.type === "warehouse-coordinate" || viewState.type === "warehouse-coordinate-create"
                                                      ? "warehouse-master"
                                                      : viewState.type === "item-create" || viewState.type === "item-edit" || viewState.type === "item-qr"
                                                        ? "item"
                                                        : viewState.type === "wh-req-material-create" || viewState.type === "wh-req-material-detail"
                                                          ? "wh-req-material"
                                                          : viewState.type === "transfer-stock-return-detail"
                                                            ? "transfer-stock-return"
                                                            : viewState.type === "stock-notification-create" || viewState.type === "stock-notification-edit"
                                                            ? "stock-notification-master"
                                                            : viewState.type === "wh-type-of-request-create" || viewState.type === "wh-type-of-request-edit"
                                                              ? "wh-type-of-request"
                                                              : viewState.type === "wh-destination-location-create" || viewState.type === "wh-destination-location-edit"
                                                                ? "wh-destination-location"
                                                                : null;

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
      }).catch(() => {});
      fetchRequestMaterials().then((data) => {
        if (Array.isArray(data)) setRequestMaterialRecords(data);
      }).catch(() => {});
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
    const nextState: ViewState = { type: "wh-req-material-detail", id };
    setViewState(nextState);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/request/request-material/${encodeURIComponent(id)}`);
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
    if (module === "receive-note-return") {
      const nextState: ViewState = { type: "receive-note-return-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/receive-note-return/create");
      }
      return;
    }

    if (module === "receive-note") {
      const nextState: ViewState = { type: "receive-note-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/receive-note/create");
      }
      return;
    }

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

    if (module === "colour" || module === "color") {
      const nextState: ViewState = { type: "colour-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/colour/create");
      }
      return;
    }

    if (module === "style") {
      setEditingStyle(null);
      const nextState: ViewState = { type: "style-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/style/create");
      }
      return;
    }

    if (module === "category") {
      setEditingCategory(null);
      const nextState: ViewState = { type: "category-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/category/create");
      }
      return;
    }

    if (module === "hs") {
      setEditingHs(null);
      const nextState: ViewState = { type: "hs-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/hs/create");
      }
      return;
    }

    if (module === "facility") {
      setEditingFacility(null);
      const nextState: ViewState = { type: "facility-create" };
      setViewState(nextState);

      if (typeof window !== "undefined") {
        window.scrollTo(0, 0);
        window.history.pushState(nextState, "", "/exim/master/facility/create");
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
    const nextState: ViewState = { type: "warehouse-coordinate", warehouseId: warehouse.id };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/master/warehouse/${warehouse.id}/coordinate`);
    }
  }, []);

  const handleNavigateWarehouseCoordinateCreate = useCallback((warehouseId: string) => {
    const nextState: ViewState = { type: "warehouse-coordinate-create", warehouseId };
    setViewState(nextState);

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      window.history.pushState(nextState, "", `/warehouse/master/warehouse/${warehouseId}/coordinate/create`);
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

        const nextState: ViewState = {
          type: "warehouse-coordinate",
          warehouseId: newCoordinate.warehouseId,
        };
        setViewState(nextState);

        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
          window.history.pushState(
            nextState,
            "",
            `/warehouse/master/warehouse/${newCoordinate.warehouseId}/coordinate`
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
        {/* Dashboard Landing Page */}
        {viewState.type === "dashboard" && (
          <Dashboard
            onAddNewBufferRule={handleNavigateStockNotificationCreate}
            onManageBufferRules={() =>
              handleNavigateList("stock-notification-master", "/dashboard/stock-notification-master")
            }
            onNavigatePrCreate={handleNavigatePrCreate}
            onNavigateDetail={handleNavigateDetail}
            onNavigateReceiveNoteDetail={handleNavigateReceiveNoteDetail}
            onNavigateRequestMaterialDetail={handleNavigateRequestMaterialDetail}
            receiveNoteRecords={receiveNoteRecords}
            requestMaterialRecords={requestMaterialRecords}
            onReceiveNotesUpdate={setReceiveNoteRecords}
          />
        )}

        {/* SuperAdmin User & Permission Administration */}
        {viewState.type === "list" && viewState.page === "user-permission-admin" && (
          <UserPermissionAdmin
            onNavigateAudit={() => handleNavigateList("audit-log-admin", "/admin/audit-logs")}
          />
        )}

        {/* SuperAdmin System Audit Trail & History */}
        {viewState.type === "list" && viewState.page === "audit-log-admin" && (
          <AuditLogAdmin
            onNavigateUsers={() => handleNavigateList("user-permission-admin", "/admin/user-permissions")}
          />
        )}

        {/* Existing Core List Page Views */}
        {viewState.type === "list" && viewState.page === "pr" && (
          <PurchaseRequisition
            onCreate={handleNavigatePrCreate}
            onDetail={(row: TableRow) =>
              handleNavigateDetail("pr", row._rawNumber || row._rawPr || row._id || "")
            }
          />
        )}

        {viewState.type === "list" && viewState.page === "po" && (
          <PurchaseOrder
            onCreate={handleNavigatePoCreate}
            onDetail={(row: TableRow) =>
              handleNavigateDetail("po", row._rawNumber || row._rawPo || row._id || "")
            }
            onSelectPr={(prNumber: string) =>
              handleNavigateDetail("pr", prNumber)
            }
          />
        )}

        {viewState.type === "list" && viewState.page === "report" && (
          <PurchaseOrderReport
            onDetail={(row: TableRow) =>
              handleNavigateDetail("report", row._rawPo || row._rawPr || row._rawNumber || row._id || "")
            }
            onSelectPo={(poNumber: string) =>
              handleNavigateDetail("po", poNumber)
            }
            onSelectPr={(prNumber: string) =>
              handleNavigateDetail("pr", prNumber)
            }
          />
        )}

        {/* Purchase Requisition Report */}
        {viewState.type === "list" && viewState.page === "pr-report" && (
          <PurchaseRequisitionReport
            onDetail={(prNumber: string) =>
              handleNavigateDetail("pr", prNumber)
            }
            onNavigatePo={(poNumber: string) =>
              handleNavigateDetail("po", poNumber)
            }
          />
        )}

        {/* Reporting Purchase Order */}
        {viewState.type === "list" && viewState.page === "po-report" && (
          <ReportingPurchaseOrder
            onDetail={(poNumber: string) =>
              handleNavigateDetail("po", poNumber)
            }
            onNavigatePr={(prNumber: string) =>
              handleNavigateDetail("pr", prNumber)
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
          <UnitReferenceIndex records={unitReferenceRecords} />
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

        {/* Exim Master Facility Listing */}
        {viewState.type === "list" && viewState.page === "facility" && (
          <FacilityIndex
            records={facilityRecords}
            onAddNew={() => handleNavigateCreate("facility")}
            onEdit={handleNavigateFacilityEdit}
            onDelete={handleDeleteFacility}
            onToggleStatus={handleToggleFacilityStatus}
          />
        )}

        {/* Exim Master HS Listing */}
        {viewState.type === "list" && viewState.page === "hs" && (
          <HsIndex
            records={hsRecords}
            onAddNew={() => handleNavigateCreate("hs")}
            onEdit={handleNavigateHsEdit}
            onDelete={handleDeleteHs}
          />
        )}

        {/* Exim Master Category Listing */}
        {viewState.type === "list" && viewState.page === "category" && (
          <CategoryIndex
            records={categoryRecords}
            onAddNew={() => handleNavigateCreate("category")}
            onEdit={handleNavigateCategoryEdit}
            onDelete={handleDeleteCategory}
            onToggleStatus={handleToggleCategoryStatus}
          />
        )}

        {/* Exim Master Specification/Model (Style) Listing */}
        {viewState.type === "list" && viewState.page === "style" && (
          <StyleIndex
            records={styleRecords}
            onAddNew={() => handleNavigateCreate("style")}
            onImportExcel={handleNavigateStyleImport}
            onEdit={handleNavigateStyleEdit}
            onDelete={handleDeleteStyle}
            onToggleStatus={handleToggleStyleStatus}
          />
        )}

        {/* Exim Master Warna (Color) Listing */}
        {viewState.type === "list" && viewState.page === "colour" && (
          <ColorIndex
            records={colorRecords}
            onAddNew={() => handleNavigateCreate("colour")}
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

        {/* Exim Receive Note Listing */}
        {viewState.type === "list" && viewState.page === "receive-note" && (
          <ReceiveNoteIndex
            records={receiveNoteRecords}
            onAddNew={() => handleNavigateCreate("receive-note")}
            onViewDetail={handleNavigateReceiveNoteDetail}
          />
        )}

        {/* Exim Receive Note Return Listing */}
        {viewState.type === "list" && viewState.page === "receive-note-return" && (
          <ReceiveNoteReturnIndex
            records={receiveNoteReturnRecords}
            onAddNew={() => handleNavigateCreate("receive-note-return")}
            onViewDetail={handleNavigateReceiveNoteReturnDetail}
          />
        )}

        {/* Exim Document History Listing */}
        {viewState.type === "list" && viewState.page === "document-history" && (
          <DocumentHistoryIndex
            records={documentHistoryRecords}
            onViewDetail={handleNavigateDocumentHistoryDetail}
          />
        )}

        {/* Warehouse Master Listing */}
        {viewState.type === "list" && viewState.page === "warehouse-master" && (
          <MasterWarehouseIndex
            records={warehouseMasterRecords}
            onAddNew={handleNavigateMasterWarehouseCreate}
            onViewCoordinates={handleNavigateWarehouseCoordinates}
          />
        )}

        {/* Country Master Listing */}
        {viewState.type === "list" && viewState.page === "country" && (
          <CountryIndex
            records={countryRecords}
            onSave={handleSaveCountry}
            onDelete={handleDeleteCountry}
          />
        )}

        {/* Account Master Listing */}
        {viewState.type === "list" && viewState.page === "account" && (
          <AccountIndex
            records={accountRecords}
            onSave={handleSaveAccount}
            onDelete={handleDeleteAccount}
          />
        )}

        {/* Job Number Master Listing */}
        {viewState.type === "list" && viewState.page === "job-number" && (
          <JobNumberIndex
            records={jobNumberRecords}
            onSave={handleSaveJobNumber}
            onDelete={handleDeleteJobNumber}
          />
        )}

        {/* Rafaksi Type Master Listing */}
        {viewState.type === "list" && viewState.page === "rafaksi-type" && (
          <RafaksiTypeIndex
            records={rafaksiTypeRecords}
            onSave={handleSaveRafaksiType}
            onDelete={handleDeleteRafaksiType}
          />
        )}

        {/* Currency Master Listing */}
        {viewState.type === "list" && viewState.page === "currency" && (
          <CurrencyIndex
            records={currencyRecords}
            onSave={handleSaveCurrency}
            onDelete={handleDeleteCurrency}
          />
        )}

        {/* Warehouse Stock Card Report */}
        {viewState.type === "list" && viewState.page === "wh-rep-stock-card" && (
          <StockCardIndex />
        )}

        {/* Warehouse Stock (Stock Item) Report */}
        {viewState.type === "list" && viewState.page === "wh-rep-stock-item" && (
          <StockItemIndex />
        )}

        {/* Warehouse Request Material Listing */}
        {viewState.type === "list" && viewState.page === "wh-req-material" && (
          <RequestMaterialIndex
            records={requestMaterialRecords}
            onAddNew={handleNavigateRequestMaterialCreate}
            onOpenDetail={handleNavigateRequestMaterialDetail}
          />
        )}

        {/* Stock Notification Master Listing */}
        {viewState.type === "list" && viewState.page === "stock-notification-master" && (
          <StockNotificationIndex
            records={stockNotificationRecords}
            onAddNew={handleNavigateStockNotificationCreate}
            onEdit={handleEditStockNotification}
            onDelete={handleDeleteStockNotification}
          />
        )}

        {/* Warehouse Type of Request Master Listing */}
        {viewState.type === "list" && viewState.page === "wh-type-of-request" && (
          <TypeOfRequestIndex
            records={typeOfRequestRecords}
            onAddNew={handleNavigateTypeOfRequestCreate}
            onEdit={handleEditTypeOfRequest}
            onDelete={handleDeleteTypeOfRequest}
          />
        )}

        {/* Warehouse Destination Location Master Listing */}
        {viewState.type === "list" && viewState.page === "wh-destination-location" && (
          <DestinationLocationIndex
            records={destinationLocationRecords}
            onAddNew={handleNavigateDestinationLocationCreate}
            onEdit={handleEditDestinationLocation}
            onDelete={handleDeleteDestinationLocation}
          />
        )}

        {/* Warehouse Incoming: Transfer Stock Return */}
        {viewState.type === "list" && viewState.page === "transfer-stock-return" && (
          <TransferStockReturnIndex
            onOpenDetail={handleNavigateTransferStockReturnDetail}
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
          viewState.page !== "transfer-stock-return" &&
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
          viewState.page !== "facility" &&
          viewState.page !== "hs" &&
          viewState.page !== "category" &&
          viewState.page !== "style" &&
          viewState.page !== "colour" &&
          viewState.page !== "item" &&
          viewState.page !== "receive-note" &&
          viewState.page !== "receive-note-return" &&
          viewState.page !== "document-history" &&
          viewState.page !== "warehouse-master" &&
          viewState.page !== "wh-rep-stock-card" &&
          viewState.page !== "wh-rep-stock-item" &&
          viewState.page !== "wh-req-material" &&
          viewState.page !== "stock-notification-master" &&
          viewState.page !== "wh-type-of-request" &&
          viewState.page !== "wh-destination-location" &&
          viewState.page !== "country" &&
          viewState.page !== "account" &&
          viewState.page !== "job-number" &&
          viewState.page !== "rafaksi-type" &&
          viewState.page !== "currency" &&
          viewState.page !== "user-permission-admin" &&
          viewState.page !== "audit-log-admin" &&
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

        {/* Dedicated Request Material Detail View */}
        {viewState.type === "wh-req-material-detail" && (
          <RequestMaterialDetail
            id={viewState.id}
            records={requestMaterialRecords}
            onBack={() => handleNavigateList("wh-req-material", "/warehouse/request/request-material")}
          />
        )}

        {/* Dedicated Transfer Stock Return Detail View */}
        {viewState.type === "transfer-stock-return-detail" && (
          <TransferStockReturnDetail
            code={viewState.code}
            onBack={() =>
              handleNavigateList(
                "transfer-stock-return",
                "/warehouse/incoming/transfer-stock-return"
              )
            }
          />
        )}

        {/* Dedicated Exim Receive Note Detail */}
        {viewState.type === "receive-note-detail" && (
          <ReceiveNoteDetail
            code={viewState.code}
            record={
              receiveNoteRecords.find(
                (r) =>
                  r.id === viewState.code ||
                  r.rnNumber === viewState.code ||
                  (typeof r.rnNumber === "string" && r.rnNumber.replace(/[\/\\]/g, "-") === viewState.code)
              )
            }
            onApprovalChange={(rnNum, nextState) => {
              const mappedStatus =
                nextState.status === "APPROVED"
                  ? "Approved"
                  : nextState.status === "WAITING_APPROVE_2"
                    ? "Waiting for Approve 2"
                    : nextState.status === "REJECTED"
                      ? "Rejected"
                      : "Waiting for Approve 1";
              setReceiveNoteRecords((prev) =>
                prev.map((r) =>
                  r.rnNumber === rnNum
                    ? {
                      ...r,
                      status: mappedStatus as any,
                      approval1At: nextState.approved1At
                        ? `${nextState.approved1At}${nextState.approved1By ? ` by ${nextState.approved1By}` : ""}`
                        : r.approval1At,
                      approval2At: nextState.approved2At
                        ? `${nextState.approved2At}${nextState.approved2By ? ` by ${nextState.approved2By}` : ""}`
                        : r.approval2At,
                    }
                    : r
                )
              );
            }}
            onBack={() => handleNavigateList("receive-note", "/exim/receive-note")}
            onCreateBpb={(rnNum) => handleNavigateCreate("warehouse", undefined, rnNum)}
          />
        )}

        {/* Dedicated Exim Receive Note Return Detail */}
        {viewState.type === "receive-note-return-detail" && (
          <ReceiveNoteReturnDetail
            code={viewState.code}
            record={
              receiveNoteReturnRecords.find(
                (r) =>
                  r.id === viewState.code ||
                  r.rnNumber === viewState.code ||
                  (typeof r.rnNumber === "string" && r.rnNumber.replace(/[\/\\]/g, "-") === viewState.code)
              )
            }
            onBack={() => handleNavigateList("receive-note-return", "/exim/receive-note-return")}
          />
        )}

        {/* Dedicated Exim Document History Detail */}
        {viewState.type === "document-history-detail" && (
          <DocumentHistoryDetail
            code={viewState.code}
            record={
              documentHistoryRecords.find(
                (r) =>
                  r.id === viewState.code ||
                  r.invoiceNumber === viewState.code ||
                  (typeof r.invoiceNumber === "string" && r.invoiceNumber.replace(/[\/\\]/g, "-") === viewState.code)
              )
            }
            onBack={() => handleNavigateList("document-history", "/exim/document-history")}
          />
        )}

        {/* Master Warehouse - Warehouse Coordinate Listing */}
        {viewState.type === "warehouse-coordinate" && (
          <WarehouseCoordinateIndex
            warehouse={
              warehouseMasterRecords.find((w) => w.id === viewState.warehouseId) ||
              warehouseMasterRecords[0]
            }
            onAddNew={() => handleNavigateWarehouseCoordinateCreate(viewState.warehouseId)}
            onBack={() => handleNavigateList("warehouse-master", "/warehouse/master/warehouse")}
            onDeleteCoordinate={(coordId) => handleDeleteWarehouseCoordinate(viewState.warehouseId, coordId)}
          />
        )}

        {/* Master Warehouse - Add New Warehouse Form */}
        {viewState.type === "warehouse-master-create" && (
          <WarehouseMasterForm
            onBack={() => handleNavigateList("warehouse-master", "/warehouse/master/warehouse")}
            onSave={handleSaveWarehouseMaster}
          />
        )}

        {/* Master Warehouse - Add New Coordinate Form */}
        {viewState.type === "warehouse-coordinate-create" && (
          <WarehouseCoordinateForm
            warehouse={
              warehouseMasterRecords.find((w) => w.id === viewState.warehouseId) ||
              warehouseMasterRecords[0]
            }
            onBack={() => {
              const wh =
                warehouseMasterRecords.find((w) => w.id === viewState.warehouseId) ||
                warehouseMasterRecords[0];
              handleNavigateWarehouseCoordinates(wh);
            }}
            onSave={handleSaveWarehouseCoordinate}
          />
        )}

        {/* Dedicated Full Page Create Views */}
        {viewState.type === "pr-create" && (
          <PurchaseRequisitionCreate
            availableJobNumbers={jobNumberRecords.map((j) => j.jobNumber)}
            availableItems={itemRecords}
            onBack={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
            onSaveSuccess={() => handleNavigateList("pr", "/procurement/transactions/purchase-requisition")}
          />
        )}

        {viewState.type === "po-create" && (
          <PurchaseOrderCreate
            initialPrNumber={viewState.prNumber}
            availableAdditionalCosts={additionalCostRecords}
            availableItems={itemRecords}
            onBack={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
            onSaveSuccess={() => handleNavigateList("po", "/procurement/transactions/purchase-order")}
          />
        )}

        {viewState.type === "warehouse-create" && (
          <WarehouseCreate
            initialPoNumber={viewState.poNumber}
            initialRnNumber={viewState.rnNumber}
            onBack={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
            onSaved={() => handleNavigateList("warehouse", "/warehouse/incoming/receive-material-bpb")}
          />
        )}

        {/* Dedicated Full Page Request Material Create View */}
        {viewState.type === "wh-req-material-create" && (
          <RequestMaterialCreate
            onSave={handleSaveRequestMaterial}
            onCancel={() => handleNavigateList("wh-req-material", "/warehouse/request/request-material")}
            availableTypesOfRequest={typeOfRequestRecords.filter((t) => t.status === "Active").map((t) => t.name)}
            availableDestinations={destinationLocationRecords.filter((d) => d.status === "Active").map((d) => d.name)}
          />
        )}

        {viewState.type === "supplier-create" && (
          <SupplierForm
            onBack={() => handleNavigateList("supplier", "/procurement/purchase-master/supplier")}
            onSave={handleSaveSupplier}
          />
        )}

        {viewState.type === "payment-term-create" && (
          <PaymentTermForm
            onBack={() => handleNavigateList("payment-term", "/procurement/purchase-master/payment-term")}
            onSave={handleSavePaymentTerm}
          />
        )}

        {viewState.type === "purchase-category-create" && (
          <PurchaseCategoryForm
            onBack={() => handleNavigateList("purchase-category", "/procurement/purchase-master/purchase-category")}
            onSave={handleSavePurchaseCategory}
          />
        )}

        {viewState.type === "delivery-terms-create" && (
          <DeliveryTermsForm
            onBack={() => handleNavigateList("delivery-terms", "/procurement/purchase-master/delivery-terms")}
            onSave={handleSaveDeliveryTerm}
          />
        )}

        {viewState.type === "additional-costs-create" && (
          <AdditionalCostsForm
            onBack={() => handleNavigateList("additional-costs", "/procurement/purchase-master/additional-costs")}
            onSave={handleSaveAdditionalCost}
          />
        )}

        {viewState.type === "pph-create" && (
          <PphForm
            onBack={() => handleNavigateList("pph", "/procurement/purchase-master/pph")}
            onSave={handleSavePph}
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

        {/* Dedicated Exim Facility Form (Add / Edit) */}
        {(viewState.type === "facility-create" || viewState.type === "facility-edit") && (
          <FacilityForm
            initialRecord={
              viewState.type === "facility-edit" && viewState.record
                ? viewState.record
                : editingFacility
            }
            onBack={() => {
              setEditingFacility(null);
              handleNavigateList("facility", "/exim/master/facility");
            }}
            onSave={handleSaveFacility}
          />
        )}

        {/* Dedicated Exim HS Form (Add / Edit) */}
        {(viewState.type === "hs-create" || viewState.type === "hs-edit") && (
          <HsForm
            initialRecord={
              viewState.type === "hs-edit" && viewState.record
                ? viewState.record
                : editingHs
            }
            onBack={() => {
              setEditingHs(null);
              handleNavigateList("hs", "/exim/master/hs");
            }}
            onSave={handleSaveHs}
          />
        )}

        {/* Dedicated Exim Category Form (Add / Edit) */}
        {(viewState.type === "category-create" || viewState.type === "category-edit") && (
          <CategoryForm
            initialRecord={
              viewState.type === "category-edit" && viewState.record
                ? viewState.record
                : editingCategory
            }
            onBack={() => {
              setEditingCategory(null);
              handleNavigateList("category", "/exim/master/category");
            }}
            onSave={handleSaveCategory}
          />
        )}

        {/* Dedicated Exim Style Form (Add / Edit) */}
        {(viewState.type === "style-create" || viewState.type === "style-edit") && (
          <StyleForm
            initialRecord={
              viewState.type === "style-edit" && viewState.record
                ? viewState.record
                : editingStyle
            }
            onBack={() => {
              setEditingStyle(null);
              handleNavigateList("style", "/exim/master/style");
            }}
            onSave={handleSaveStyle}
          />
        )}

        {/* Dedicated Exim Style Import Excel Page */}
        {viewState.type === "style-import" && (
          <StyleImport
            onBack={() => {
              handleNavigateList("style", "/exim/master/style");
            }}
          />
        )}

        {/* Dedicated Exim Color Form (Add Color) */}
        {viewState.type === "colour-create" && (
          <ColorForm
            onBack={() => {
              handleNavigateList("colour", "/exim/master/colour");
            }}
            onSave={handleSaveColor}
          />
        )}

        {/* Dedicated Exim Receive Note Create Form */}
        {viewState.type === "receive-note-create" && (
          <ReceiveNoteForm
            onBack={() => handleNavigateList("receive-note", "/exim/receive-note")}
            onSave={handleSaveReceiveNote}
            existingReceiveNotes={receiveNoteRecords}
          />
        )}

        {/* Dedicated Exim Receive Note Return Create Form */}
        {viewState.type === "receive-note-return-create" && (
          <ReceiveNoteReturnForm
            onBack={() => handleNavigateList("receive-note-return", "/exim/receive-note-return")}
            onSave={handleSaveReceiveNoteReturn}
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

        {/* Dedicated Stock Notification Master Form (Add / Edit) */}
        {(viewState.type === "stock-notification-create" || viewState.type === "stock-notification-edit") && (
          <StockNotificationForm
            initialRecord={
              viewState.type === "stock-notification-edit" && viewState.record
                ? viewState.record
                : editingStockNotification
            }
            onBack={() => {
              setEditingStockNotification(null);
              handleNavigateList("stock-notification-master", "/dashboard/stock-notification-master");
            }}
            onSave={handleSaveStockNotification}
          />
        )}

        {/* Dedicated Warehouse Type of Request Form (Add / Edit) */}
        {(viewState.type === "wh-type-of-request-create" || viewState.type === "wh-type-of-request-edit") && (
          <TypeOfRequestForm
            initialRecord={
              viewState.type === "wh-type-of-request-edit" && viewState.record
                ? viewState.record
                : editingTypeOfRequest
            }
            onBack={() => {
              setEditingTypeOfRequest(null);
              handleNavigateList("wh-type-of-request", "/warehouse/master/type-of-request");
            }}
            onSave={handleSaveTypeOfRequest}
          />
        )}

        {/* Dedicated Warehouse Destination Location Form (Add / Edit) */}
        {(viewState.type === "wh-destination-location-create" || viewState.type === "wh-destination-location-edit") && (
          <DestinationLocationForm
            initialRecord={
              viewState.type === "wh-destination-location-edit" && viewState.record
                ? viewState.record
                : editingDestinationLocation
            }
            onBack={() => {
              setEditingDestinationLocation(null);
              handleNavigateList("wh-destination-location", "/warehouse/master/destination-location");
            }}
            onSave={handleSaveDestinationLocation}
          />
        )}

        {/* Dedicated Edit Profile View */}
        {viewState.type === "edit-profile" && (
          <EditProfile
            onBack={handleProfileCancel}
            onSaveConfirmed={handleProfileSaveConfirmed}
          />
        )}

        {/* 404 Not Found Page */}
        {viewState.type === "not-found" && (
          <NotFoundPage
            path={viewState.path}
            onGoHome={() => handleNavigateList("dashboard", "/dashboard")}
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
