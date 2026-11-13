import type { RequestMaterialRecord } from "./request-material-types";

export const requestMaterialTypesList = [
  "All Types",
  "Production",
  "Maintenance",
  "Sample",
  "General Requisition",
  "Subcontractor",
];

export const requestMaterialCreatedByList = [
  "All Users",
];

export const requestMaterialDestinationsList = [
  "All Destinations",
];

export const requestMaterialApprovalsList = [
  "All Approvals",
  "Draft",
  "Approved 1",
  "Approved 2",
  "Rejected",
];

export const requestMaterialDepartmentsList = [
  "All Departments",
  "PRODUKSI",
  "MAINTENANCE",
  "EXIM",
  "PPIC",
  "LOGISTIK",
  "QUALITY CONTROL",
];

export const requestMaterialProjectTypesList = [
  "All Projects",
  "Regular Production",
  "Overhaul Maintenance",
  "Urgent Replacement",
  "Sample Testing",
  "Export Batch",
];

export const initialRequestMaterialRecords: RequestMaterialRecord[] = [];
