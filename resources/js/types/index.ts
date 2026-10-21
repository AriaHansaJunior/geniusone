import type { ReactNode } from "react";

export type IconName =
  | "alertTriangle"
  | "archive"
  | "arrowDown"
  | "arrowLeft"
  | "arrowRight"
  | "arrowUp"
  | "arrowUpDown"
  | "bell"
  | "box"
  | "calendar"
  | "cart"
  | "check"
  | "checkCircle"
  | "chevron"
  | "chevronDown"
  | "chevronLeft"
  | "close"
  | "download"
  | "edit"
  | "eye"
  | "eyeOff"
  | "file"
  | "filter"
  | "globe"
  | "grid"
  | "history"
  | "home"
  | "info"
  | "layers"
  | "list"
  | "lock"
  | "logOut"
  | "more"
  | "navigation"
  | "plus"
  | "print"
  | "refresh"
  | "search"
  | "settings"
  | "trash"
  | "upload"
  | "user";

export type PageKey =
  | "dashboard"
  | "pr"
  | "po"
  | "report"
  | "warehouse"
  // Purchase Master
  | "supplier"
  | "payment-term"
  | "purchase-category"
  | "delivery-terms"
  | "additional-costs"
  | "pph"
  | "rafaksi-type"
  | "job-number"
  // Procurement Reports
  | "pr-report"
  | "po-report"
  // Exim Master
  | "unit"
  | "satuan"
  | "unit-reference"
  | "item"
  | "brand"
  | "classification"
  | "department"
  | "facility"
  | "hs"
  | "category"
  | "style"
  | "colour"
  | "country"
  | "currency"
  | "account"
  // Transaction create keys
  | "pr-create"
  | "po-create"
  // Exim other
  | "receive-note"
  | "receive-note-return"
  | "document-history"
  // Warehouse Master
  | "warehouse-master"
  | "type-of-mutation"
  | "wh-type-of-request"
  | "wh-destination-location"
  // Dashboard Master
  | "stock-notification-master"
  // Warehouse Adjustment
  | "wh-adj-prod"
  | "wh-adj-bc"
  | "wh-opname-material"
  | "wh-adj-stock"
  // Warehouse Incoming
  | "transfer-stock-return"
  | "transfer-stock-result"
  | "receive-material-non-fasilitas"
  | "purchase-return"
  | "sales-return"
  // Warehouse Outcoming
  | "wh-out-do"
  | "wh-out-issue"
  | "wh-out-disposal"
  // Warehouse Request
  | "wh-req-weight-note"
  | "wh-req-material"
  | "wh-req-weight-note-fg"
  | "wh-req-shipping"
  | "warehouse-move-location"
  // Warehouse Report
  | "wh-rep-receive-material"
  | "wh-rep-stock-item"
  | "wh-rep-stock-card"
  | "wh-rep-stock-transfer"
  | "wh-rep-delivery-order"
  | "wh-rep-stock-mutation"
  | "wh-rep-outstanding-request";

export type ViewState =
  | { type: "dashboard" }
  | { type: "list"; page: PageKey }
  | { type: "pr-detail"; code: string }
  | { type: "po-detail"; code: string }
  | { type: "pr-create" }
  | { type: "po-create" }
  | { type: "report-detail"; code: string }
  | { type: "warehouse-detail"; code: string }
  | { type: "warehouse-create" }
  | { type: "supplier-create" }
  | { type: "payment-term-create" }
  | { type: "purchase-category-create" }
  | { type: "delivery-terms-create" }
  | { type: "additional-costs-create" }
  | { type: "pph-create" }
  | { type: "unit-create" }
  | { type: "unit-edit"; record?: any }
  | { type: "classification-create" }
  | { type: "classification-edit"; record?: any }
  | { type: "department-create" }
  | { type: "department-edit"; record?: any }
  | { type: "brand-create" }
  | { type: "brand-edit"; record?: any }
  | { type: "facility-create" }
  | { type: "facility-edit"; record?: any }
  | { type: "hs-create" }
  | { type: "hs-edit"; record?: any }
  | { type: "category-create" }
  | { type: "category-edit"; record?: any }
  | { type: "style-create" }
  | { type: "style-edit"; record?: any }
  | { type: "style-import" }
  | { type: "colour-create" }
  | { type: "receive-note-create" }
  | { type: "receive-note-detail"; code: string }
  | { type: "receive-note-return-create" }
  | { type: "receive-note-return-detail"; code: string }
  | { type: "document-history-detail"; code: string }
  | { type: "warehouse-master-create" }
  | { type: "warehouse-coordinate"; warehouseId: string }
  | { type: "warehouse-coordinate-create"; warehouseId: string }
  | { type: "item-create" }
  | { type: "item-edit"; record?: any }
  | { type: "item-qr" }
  | { type: "wh-req-material-create" }
  | { type: "wh-req-material-detail"; id: string }
  | { type: "stock-notification-create" }
  | { type: "stock-notification-edit"; record?: any }
  | { type: "wh-type-of-request-create" }
  | { type: "wh-type-of-request-edit"; record?: any }
  | { type: "wh-destination-location-create" }
  | { type: "wh-destination-location-edit"; record?: any }
  | { type: "edit-profile" }
  | { type: "login" }
  | { type: "not-found"; path?: string };

export type Column = {
  key: string;
  label: string;
  align?: "right";
  min?: string;
};

export type TableRow = Record<string, any> & {
  _search?: string;
  _id?: string;
  _type?: PageKey;
  _rawNumber?: string;
  _rawStatus?: string;
  _rawDate?: string;
  _rawDueDate?: string;
  _rawDept?: string;
  _rawSupplier?: string;
  _rawTotal?: string;
  _rawPr?: string;
  _rawPo?: string;
  _rawRn?: string;
  _rawCurrency?: string;
  _rawRate?: string;
  _rawPaymentMethod?: string;
  _rawPaymentTerm?: string;
  _rawFacility?: string;
  _rawCreatedBy?: string;
  _rawLastUpdated?: string;
  _rawReleasedBy?: string;
  _rawApprovedBy?: string;
  _rawRemark?: string;
  _rawRevision?: string;
  _rawSubkon?: string;
  _rawDeptCreated?: string;
  _totalQty?: string;
  _items?: any[];
  _otherCosts?: any[];
  _financials?: any;
  _history?: any[];
};

export interface PageMeta {
  eyebrow: string;
  title: string;
  description: string;
}
