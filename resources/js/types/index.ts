import type { ReactNode } from "react";

export type IconName =
  | "alertTriangle"
  | "archive"
  | "arrowDown"
  | "arrowLeft"
  | "arrowRight"
  | "box"
  | "calendar"
  | "cart"
  | "check"
  | "chevron"
  | "chevronDown"
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
  | "layers"
  | "list"
  | "lock"
  | "logOut"
  | "more"
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
  // Exim other
  | "receive-note"
  | "receive-note-return"
  | "document-history"
  // Warehouse Master
  | "warehouse-master"
  | "type-of-mutation"
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
  | { type: "item-create" }
  | { type: "item-edit"; record?: any }
  | { type: "item-qr" }
  | { type: "edit-profile" }
  | { type: "login" };

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
