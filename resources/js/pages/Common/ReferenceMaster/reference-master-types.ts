export interface ReferenceMasterRecord {
  id: string;
  no: number;
  code?: string;
  name: string;
  status?: boolean;
}

export type ReferenceMasterPageKey =
  | "pph-type"
  | "type-rates-bm"
  | "type-rates-cukai"
  | "custom-report"
  | "item-type"
  | "group-scrap-item"
  | "specification"
  | "warehouse-type";

export interface ReferenceMasterConfig {
  pageKey: ReferenceMasterPageKey;
  listPath: string;
  createPath: string;
  eyebrow: string;
  title: string;
  formTitle: string;
  singularLabel: string;
  dbTable: string;
  readEndpoint: string;
  expectedWriteEndpoint: string;
  hasCode: boolean;
  hasStatus: boolean;
  codeLabel?: string;
  codePlaceholder?: string;
  nameLabel: string;
  namePlaceholder: string;
  emptyTitle: string;
  exportFilePrefix: string;
}
