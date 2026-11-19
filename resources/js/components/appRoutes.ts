import { pageMeta } from "../config/pageMeta";
import { navigationConfig } from "../config/navigation";
import { withThemePrefix, type SystemTheme } from "../context/ThemeContext";
import type { PageKey, SettingsTab, ViewState } from "../types";

export function resolveViewStateFromPath(pathname: string, defaultPage: PageKey = "dashboard"): ViewState {
  const rawPath = decodeURIComponent(pathname).replace(/\/$/, "");
  const cleanPath =
    rawPath === "/default"
      ? "/dashboard"
      : rawPath.startsWith("/default/")
        ? rawPath.slice("/default".length)
        : rawPath;

  // Authentication & standalone visual studio routes
  if (cleanPath === "/login/particle-studio") {
    return { type: "login-particle-studio" };
  }
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

  // Full-Screen Settings Workspace Routes
  if (cleanPath === "/settings" || cleanPath === "/settings/edit-profile") {
    return { type: "settings", tab: "edit-profile" };
  }
  if (cleanPath === "/settings/system-theme") {
    return { type: "settings", tab: "system-theme" };
  }
  if (cleanPath === "/settings/user-permissions" || cleanPath === "/settings/user-permission") {
    return { type: "settings", tab: "user-permissions" };
  }
  if (cleanPath === "/settings/audit-logs" || cleanPath === "/settings/audit-log") {
    return { type: "settings", tab: "audit-logs" };
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
  const warehouseMasterEditMatch = cleanPath.match(
    /^\/warehouse\/master\/warehouse\/edit\/([^/]+)$/
  );
  if (warehouseMasterEditMatch) {
    return {
      type: "warehouse-master-edit",
      id: decodeURIComponent(warehouseMasterEditMatch[1]),
    };
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
  const supplierEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/supplier|procurement\/supplier)\/edit\/([^/]+)$/
  );
  if (supplierEditMatch) {
    return { type: "supplier-edit", id: decodeURIComponent(supplierEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/payment-term/create" ||
    cleanPath === "/procurement/purchase-master/payment-term/add" ||
    cleanPath === "/procurement/payment-term/create" ||
    cleanPath === "/procurement/payment-term/add"
  ) {
    return { type: "payment-term-create" };
  }
  const paymentTermEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/payment-term|procurement\/payment-term)\/edit\/([^/]+)$/
  );
  if (paymentTermEditMatch) {
    return { type: "payment-term-edit", id: decodeURIComponent(paymentTermEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/purchase-category/create" ||
    cleanPath === "/procurement/purchase-master/purchase-category/add" ||
    cleanPath === "/procurement/purchase-category/create" ||
    cleanPath === "/procurement/purchase-category/add"
  ) {
    return { type: "purchase-category-create" };
  }
  const purchaseCategoryEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/purchase-category|procurement\/purchase-category)\/edit\/([^/]+)$/
  );
  if (purchaseCategoryEditMatch) {
    return { type: "purchase-category-edit", id: decodeURIComponent(purchaseCategoryEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/delivery-terms/create" ||
    cleanPath === "/procurement/purchase-master/delivery-terms/add" ||
    cleanPath === "/procurement/delivery-terms/create" ||
    cleanPath === "/procurement/delivery-terms/add"
  ) {
    return { type: "delivery-terms-create" };
  }
  const deliveryTermsEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/delivery-terms|procurement\/delivery-terms)\/edit\/([^/]+)$/
  );
  if (deliveryTermsEditMatch) {
    return { type: "delivery-terms-edit", id: decodeURIComponent(deliveryTermsEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/additional-costs/create" ||
    cleanPath === "/procurement/purchase-master/additional-costs/add" ||
    cleanPath === "/procurement/additional-costs/create" ||
    cleanPath === "/procurement/additional-costs/add"
  ) {
    return { type: "additional-costs-create" };
  }
  const additionalCostsEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/additional-costs|procurement\/additional-costs)\/edit\/([^/]+)$/
  );
  if (additionalCostsEditMatch) {
    return { type: "additional-costs-edit", id: decodeURIComponent(additionalCostsEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/pph/create" ||
    cleanPath === "/procurement/purchase-master/pph/add" ||
    cleanPath === "/procurement/pph/create" ||
    cleanPath === "/procurement/pph/add"
  ) {
    return { type: "pph-create" };
  }
  const pphEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/pph|procurement\/pph)\/edit\/([^/]+)$/
  );
  if (pphEditMatch) {
    return { type: "pph-edit", id: decodeURIComponent(pphEditMatch[1]) };
  }

  if (
    cleanPath === "/procurement/purchase-master/pph-type/create" ||
    cleanPath === "/procurement/purchase-master/pph-type/add"
  ) {
    return { type: "reference-master-create", page: "pph-type" };
  }
  if (cleanPath === "/exim/master/type-rates-bm/create" || cleanPath === "/exim/master/type-rates-bm/add") {
    return { type: "reference-master-create", page: "type-rates-bm" };
  }
  if (cleanPath === "/exim/master/type-rates-cukai/create" || cleanPath === "/exim/master/type-rates-cukai/add") {
    return { type: "reference-master-create", page: "type-rates-cukai" };
  }
  if (cleanPath === "/exim/master/custom-report/create" || cleanPath === "/exim/master/custom-report/add") {
    return { type: "reference-master-create", page: "custom-report" };
  }
  if (cleanPath === "/exim/master/item-type/create" || cleanPath === "/exim/master/item-type/add") {
    return { type: "reference-master-create", page: "item-type" };
  }
  if (cleanPath === "/exim/master/group-scrap-item/create" || cleanPath === "/exim/master/group-scrap-item/add") {
    return { type: "reference-master-create", page: "group-scrap-item" };
  }
  if (cleanPath === "/exim/master/specification/create" || cleanPath === "/exim/master/specification/add") {
    return { type: "reference-master-create", page: "specification" };
  }
  if (cleanPath === "/warehouse/master/warehouse-type/create" || cleanPath === "/warehouse/master/warehouse-type/add") {
    return { type: "reference-master-create", page: "warehouse-type" };
  }

  // Rafaksi Type Create & Edit
  if (
    cleanPath === "/procurement/purchase-master/rafaksi-type/create" ||
    cleanPath === "/procurement/purchase-master/rafaksi-type/add" ||
    cleanPath === "/procurement/rafaksi-type/create" ||
    cleanPath === "/procurement/rafaksi-type/add"
  ) {
    return { type: "rafaksi-type-create" };
  }
  const rafaksiEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/rafaksi-type|procurement\/rafaksi-type)\/edit\/([^/]+)$/
  );
  if (rafaksiEditMatch) {
    return { type: "rafaksi-type-edit", id: decodeURIComponent(rafaksiEditMatch[1]) };
  }

  // Job Number Create & Edit
  if (
    cleanPath === "/procurement/purchase-master/job-number/create" ||
    cleanPath === "/procurement/purchase-master/job-number/add" ||
    cleanPath === "/procurement/job-number/create" ||
    cleanPath === "/procurement/job-number/add" ||
    cleanPath === "/exim/master/job-number/create" ||
    cleanPath === "/exim/master/job-number/add"
  ) {
    return { type: "job-number-create" };
  }
  const jobNumberEditMatch = cleanPath.match(
    /^\/(?:procurement\/purchase-master\/job-number|procurement\/job-number|exim\/master\/job-number)\/edit\/([^/]+)$/
  );
  if (jobNumberEditMatch) {
    return { type: "job-number-edit", id: decodeURIComponent(jobNumberEditMatch[1]) };
  }

  // Country Create & Edit
  if (
    cleanPath === "/exim/master/country/create" ||
    cleanPath === "/exim/master/country/add" ||
    cleanPath === "/exim/country/create" ||
    cleanPath === "/exim/country/add"
  ) {
    return { type: "country-create" };
  }
  const countryEditMatch = cleanPath.match(
    /^\/(?:exim\/master\/country|exim\/country)\/edit\/([^/]+)$/
  );
  if (countryEditMatch) {
    return { type: "country-edit", id: decodeURIComponent(countryEditMatch[1]) };
  }

  // Currency Create & Edit
  if (
    cleanPath === "/exim/master/currency/create" ||
    cleanPath === "/exim/master/currency/add" ||
    cleanPath === "/exim/currency/create" ||
    cleanPath === "/exim/currency/add" ||
    cleanPath === "/procurement/purchase-master/currency/create" ||
    cleanPath === "/procurement/purchase-master/currency/add"
  ) {
    return { type: "currency-create" };
  }
  const currencyEditMatch = cleanPath.match(
    /^\/(?:exim\/master\/currency|exim\/currency|procurement\/purchase-master\/currency)\/edit\/([^/]+)$/
  );
  if (currencyEditMatch) {
    return { type: "currency-edit", id: decodeURIComponent(currencyEditMatch[1]) };
  }

  // Account Create & Edit
  if (
    cleanPath === "/exim/master/account/create" ||
    cleanPath === "/exim/master/account/add" ||
    cleanPath === "/exim/account/create" ||
    cleanPath === "/exim/account/add" ||
    cleanPath === "/procurement/purchase-master/account/create" ||
    cleanPath === "/procurement/purchase-master/account/add"
  ) {
    return { type: "account-create" };
  }
  const accountEditMatch = cleanPath.match(
    /^\/(?:exim\/master\/account|exim\/account|procurement\/purchase-master\/account)\/edit\/([^/]+)$/
  );
  if (accountEditMatch) {
    return { type: "account-edit", id: decodeURIComponent(accountEditMatch[1]) };
  }

  // Transfer Stock Return Create & Edit (declared before TSR detail wildcard match)
  if (
    cleanPath === "/warehouse/incoming/transfer-stock-return/create" ||
    cleanPath === "/warehouse/incoming/transfer-stock-return/add" ||
    cleanPath === "/warehouse/transfer-stock-return/create" ||
    cleanPath === "/warehouse/transfer-stock-return/add"
  ) {
    return { type: "transfer-stock-return-create" };
  }
  const transferStockReturnEditMatch = cleanPath.match(
    /^\/(?:warehouse\/incoming\/transfer-stock-return|warehouse\/transfer-stock-return)\/edit\/(.+)$/
  );
  if (transferStockReturnEditMatch) {
    return {
      type: "transfer-stock-return-edit",
      code: decodeURIComponent(transferStockReturnEditMatch[1]),
    };
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
    cleanPath === "/exim/master/satuan/create" ||
    cleanPath === "/exim/master/satuan/add" ||
    cleanPath === "/exim/master/unit-reference/create" ||
    cleanPath === "/exim/master/unit-reference/add" ||
    cleanPath === "/exim/satuan/create" ||
    cleanPath === "/exim/unit-reference/create"
  ) {
    return { type: "unit-reference-create" };
  }
  const unitReferenceEditMatch = cleanPath.match(
    /^\/(?:exim\/master\/satuan|exim\/master\/unit-reference|exim\/satuan|exim\/unit-reference)\/edit\/([^/]+)$/
  );
  if (unitReferenceEditMatch) {
    return { type: "unit-reference-edit", id: decodeURIComponent(unitReferenceEditMatch[1]) };
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
  const colourEditMatch = cleanPath.match(
    /^\/(?:exim\/master\/colour|exim\/master\/color|exim\/colour|exim\/color)\/edit\/([^/]+)$/
  );
  if (colourEditMatch) {
    return { type: "colour-edit", id: decodeURIComponent(colourEditMatch[1]) };
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
    /^\/(?:warehouse\/incoming\/transfer-stock-return|warehouse\/incoming\/transfer-stock-retur|warehouse\/transfer-stock-return|warehouse\/transfer_stok_retur)\/(?:details?\/)?(?!create$|add$|edit\/)(.+)$/
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
  if (
    cleanPath === "/warehouse/adjustment/adjustment-stock/create" ||
    cleanPath === "/warehouse/adjustment/adjustment-stock/add"
  ) {
    return { type: "wh-adj-stock-create" };
  }
  if (cleanPath === "/warehouse/adjustment/adjustment-stock/import") {
    return { type: "wh-adj-stock-import" };
  }
  const adjStockDetailMatch = cleanPath.match(
    /^\/warehouse\/adjustment\/adjustment-stock\/details?\/(.+)$/
  );
  if (adjStockDetailMatch) {
    return { type: "wh-adj-stock-detail", code: decodeURIComponent(adjStockDetailMatch[1]) };
  }
  if (cleanPath === "/warehouse/adjustment/adjustment-stock") {
    return { type: "list", page: "wh-adj-stock" };
  }
  if (cleanPath === "/warehouse/adjustment/adjustment-production") {
    return { type: "list", page: "wh-adj-prod" };
  }
  if (cleanPath === "/warehouse/adjustment/adjustment-stock-bc") {
    return { type: "list", page: "wh-adj-bc" };
  }
  if (cleanPath === "/warehouse/adjustment/opname-material") {
    return { type: "list", page: "wh-opname-material" };
  }

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

export function resolveInitialViewState(initialPage = "dashboard", initialCode = ""): ViewState {
  if (typeof window !== "undefined") {
    return resolveViewStateFromPath(window.location.pathname, (initialPage as PageKey) || "dashboard");
  }
  if (initialPage === "not-found") return { type: "not-found" };
  if (initialPage === "dashboard") return { type: "dashboard" };
  if (initialPage === "settings" || initialPage === "settings-edit-profile") {
    return { type: "settings", tab: "edit-profile" };
  }
  if (initialPage === "settings-system-theme") return { type: "settings", tab: "system-theme" };
  if (initialPage === "settings-user-permissions") return { type: "settings", tab: "user-permissions" };
  if (initialPage === "settings-audit-logs") return { type: "settings", tab: "audit-logs" };
  if (initialPage === "transfer-stock-return") return { type: "list", page: "transfer-stock-return" };
  if (initialPage === "login-particle-studio") return { type: "login-particle-studio" };
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
  if (initialPage === "rafaksi-type-create") return { type: "rafaksi-type-create" };
  if (initialPage === "rafaksi-type-edit") return { type: "rafaksi-type-edit", id: initialCode || "" };
  if (initialPage === "job-number-create") return { type: "job-number-create" };
  if (initialPage === "job-number-edit") return { type: "job-number-edit", id: initialCode || "" };
  if (initialPage === "country-create") return { type: "country-create" };
  if (initialPage === "country-edit") return { type: "country-edit", id: initialCode || "" };
  if (initialPage === "currency-create") return { type: "currency-create" };
  if (initialPage === "currency-edit") return { type: "currency-edit", id: initialCode || "" };
  if (initialPage === "account-create") return { type: "account-create" };
  if (initialPage === "account-edit") return { type: "account-edit", id: initialCode || "" };
  if (initialPage === "transfer-stock-return-create") return { type: "transfer-stock-return-create" };
  if (initialPage === "transfer-stock-return-edit") return { type: "transfer-stock-return-edit", code: initialCode || "" };
  if (initialPage === "transfer-stock-return-detail") return { type: "transfer-stock-return-detail", code: initialCode || "" };
  if (initialPage === "stock-notification-create") return { type: "stock-notification-create" };
  if (initialPage === "wh-type-of-request-create") return { type: "wh-type-of-request-create" };
  if (initialPage === "wh-destination-location-create") return { type: "wh-destination-location-create" };
  if (initialPage === "wh-adj-stock-create") return { type: "wh-adj-stock-create" };
  if (initialPage === "wh-adj-stock-import") return { type: "wh-adj-stock-import" };
  if (initialPage === "wh-adj-stock-detail") return { type: "wh-adj-stock-detail", code: initialCode || "" };
  if (initialPage in pageMeta) return { type: "list", page: initialPage as PageKey };
  return { type: "dashboard" };
}

export function resolveActiveSidebarPage(viewState: ViewState): PageKey | null {
  if (viewState.type === "dashboard") return "dashboard";
  if (viewState.type === "settings") return "settings";
  if (viewState.type === "list") return viewState.page;
  if (viewState.type === "pr-detail" || viewState.type === "pr-create") return "pr";
  if (viewState.type === "po-detail" || viewState.type === "po-create") return "po";
  if (viewState.type === "report-detail") return "report";
  if (viewState.type === "warehouse-detail" || viewState.type === "warehouse-create") return "warehouse";
  if (viewState.type === "supplier-create" || viewState.type === "supplier-edit") return "supplier";
  if (viewState.type === "payment-term-create" || viewState.type === "payment-term-edit") return "payment-term";
  if (viewState.type === "purchase-category-create" || viewState.type === "purchase-category-edit") return "purchase-category";
  if (viewState.type === "delivery-terms-create" || viewState.type === "delivery-terms-edit") return "delivery-terms";
  if (viewState.type === "additional-costs-create" || viewState.type === "additional-costs-edit") return "additional-costs";
  if (viewState.type === "pph-create" || viewState.type === "pph-edit") return "pph";
  if (viewState.type === "unit-create" || viewState.type === "unit-edit") return "unit";
  if (viewState.type === "unit-reference-create" || viewState.type === "unit-reference-edit") return "satuan";
  if (viewState.type === "classification-create" || viewState.type === "classification-edit") return "classification";
  if (viewState.type === "department-create" || viewState.type === "department-edit") return "department";
  if (viewState.type === "brand-create" || viewState.type === "brand-edit") return "brand";
  if (viewState.type === "facility-create" || viewState.type === "facility-edit") return "facility";
  if (viewState.type === "hs-create" || viewState.type === "hs-edit") return "hs";
  if (viewState.type === "category-create" || viewState.type === "category-edit") return "category";
  if (viewState.type === "style-create" || viewState.type === "style-edit" || viewState.type === "style-import") return "style";
  if (viewState.type === "colour-create" || viewState.type === "colour-edit") return "colour";
  if (viewState.type === "receive-note-create" || viewState.type === "receive-note-detail") return "receive-note";
  if (viewState.type === "receive-note-return-create" || viewState.type === "receive-note-return-detail") return "receive-note-return";
  if (viewState.type === "document-history-detail") return "document-history";
  if (viewState.type === "warehouse-master-create" || viewState.type === "warehouse-master-edit" || viewState.type === "warehouse-coordinate" || viewState.type === "warehouse-coordinate-create") return "warehouse-master";
  if (viewState.type === "reference-master-create") return viewState.page;
  if (viewState.type === "item-create" || viewState.type === "item-edit" || viewState.type === "item-qr") return "item";
  if (viewState.type === "wh-req-material-create" || viewState.type === "wh-req-material-detail") return "wh-req-material";
  if (viewState.type === "rafaksi-type-create" || viewState.type === "rafaksi-type-edit") return "rafaksi-type";
  if (viewState.type === "job-number-create" || viewState.type === "job-number-edit") return "job-number";
  if (viewState.type === "country-create" || viewState.type === "country-edit") return "country";
  if (viewState.type === "currency-create" || viewState.type === "currency-edit") return "currency";
  if (viewState.type === "account-create" || viewState.type === "account-edit") return "account";
  if (
    viewState.type === "transfer-stock-return-create" ||
    viewState.type === "transfer-stock-return-edit" ||
    viewState.type === "transfer-stock-return-detail"
  ) {
    return "transfer-stock-return";
  }
  if (viewState.type === "stock-notification-create" || viewState.type === "stock-notification-edit") return "stock-notification-master";
  if (viewState.type === "wh-type-of-request-create" || viewState.type === "wh-type-of-request-edit") return "wh-type-of-request";
  if (viewState.type === "wh-destination-location-create" || viewState.type === "wh-destination-location-edit") return "wh-destination-location";
  if (
    viewState.type === "wh-adj-stock-create" ||
    viewState.type === "wh-adj-stock-import" ||
    viewState.type === "wh-adj-stock-detail"
  ) {
    return "wh-adj-stock";
  }
  return null;
}

export function resolveSettingsPath(tab: SettingsTab, theme: SystemTheme = "modern"): string {
  const basePath =
    tab === "system-theme"
      ? "/settings/system-theme"
      : tab === "user-permissions"
        ? "/settings/user-permissions"
        : tab === "audit-logs"
          ? "/settings/audit-logs"
          : "/settings/edit-profile";
  return withThemePrefix(basePath, theme);
}

export function resolveTargetPathForPage(
  targetPage: PageKey,
  targetPath?: string,
  theme: SystemTheme = "modern"
): { nextState: ViewState; path: string } {
  if (targetPage === "dashboard") {
    return {
      nextState: { type: "dashboard" },
      path: withThemePrefix(targetPath || "/dashboard", theme),
    };
  }

  if (targetPage === "settings") {
    return {
      nextState: { type: "settings", tab: "edit-profile" },
      path: withThemePrefix(targetPath || "/settings/edit-profile", theme),
    };
  }

  let path = targetPath;
  if (!path) {
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

  return {
    nextState: { type: "list", page: targetPage },
    path: withThemePrefix(path, theme),
  };
}
