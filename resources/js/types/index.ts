import type { ReactNode } from "react";

export type IconName =
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
  | "eye"
  | "file"
  | "filter"
  | "grid"
  | "history"
  | "home"
  | "layers"
  | "list"
  | "more"
  | "plus"
  | "print"
  | "search"
  | "settings";

export type PageKey = "pr" | "po" | "report" | "warehouse";

export type ViewState =
  | { type: "list"; page: PageKey }
  | { type: "pr-detail"; code: string }
  | { type: "po-detail"; code: string }
  | { type: "report-detail"; code: string }
  | { type: "warehouse-detail"; code: string }
  | { type: "warehouse-create" };

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
