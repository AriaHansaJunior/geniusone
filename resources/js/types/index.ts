import type { ReactNode } from "react";

export type IconName =
  | "archive"
  | "arrowDown"
  | "arrowLeft"
  | "arrowRight"
  | "box"
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "download"
  | "eye"
  | "file"
  | "filter"
  | "grid"
  | "layers"
  | "more"
  | "plus"
  | "print"
  | "search"
  | "settings";

export type PageKey = "pr" | "po" | "report" | "warehouse";

export type Column = {
  key: string;
  label: string;
  align?: "right";
  min?: string;
};

export type TableRow = Record<string, ReactNode> & {
  _search?: string;
  _id?: string;
  _type?: PageKey;
  _rawNumber?: string;
  _rawStatus?: string;
  _rawDate?: string;
  _rawSupplier?: string;
  _rawTotal?: string;
  _rawPr?: string;
  _rawPo?: string;
  _rawRn?: string;
};

export interface PageMeta {
  eyebrow: string;
  title: string;
  description: string;
}
