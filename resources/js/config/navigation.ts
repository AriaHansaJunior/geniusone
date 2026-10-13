import type { IconName } from "../types";

export interface NavLeafItem {
  id: string;
  label: string;
  path: string;
  badge?: string | number;
  isPlaceholder?: boolean;
}

export interface NavGroupItem {
  id: string;
  label: string;
  items: NavLeafItem[];
  isExpandablePlaceholder?: boolean; // For placeholders like Adjustment, Outgoing, Request, Report
}

export interface NavSection {
  id: string;
  label: string;
  icon: IconName;
  path?: string; // If it's a direct leaf link like Dashboard
  groups?: NavGroupItem[];
  directItems?: NavLeafItem[];
  isUnpopulated?: boolean; // For Production
}

export const navigationConfig: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "home",
    path: "/dashboard",
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: "cart",
    groups: [
      {
        id: "purchase-master",
        label: "Purchase Master",
        items: [
          { id: "supplier", label: "Supplier", path: "/procurement/supplier" },
          { id: "payment-term", label: "Payment Term", path: "/procurement/payment-term" },
          { id: "purchase-category", label: "Purchase Category", path: "/procurement/purchase-category" },
          { id: "delivery-terms", label: "Delivery Terms", path: "/procurement/delivery-terms" },
          { id: "additional-costs", label: "Additional Costs", path: "/procurement/additional-costs" },
          { id: "pph", label: "PPH", path: "/procurement/pph" },
        ],
      },
      {
        id: "transactions",
        label: "Transactions",
        items: [
          { id: "pr", label: "Purchase Requisition", path: "/pr" },
          { id: "po", label: "Purchase Order", path: "/po" },
        ],
      },
      {
        id: "procurement-reports",
        label: "Reports",
        items: [
          { id: "report", label: "Report PR-PO", path: "/report", badge: "1,284" },
          { id: "pr-report", label: "Purchase Requisition Report", path: "/procurement/pr-report" },
          { id: "po-report", label: "Purchase Order Report", path: "/procurement/po-report" },
        ],
      },
    ],
  },
  {
    id: "exim",
    label: "Exim",
    icon: "file",
    groups: [
      {
        id: "exim-master",
        label: "Exim Master",
        items: [
          { id: "unit", label: "Unit", path: "/exim/unit" },
          { id: "satuan", label: "Satuan", path: "/exim/satuan" },
          { id: "item", label: "Item", path: "/exim/item" },
          { id: "brand", label: "Brand", path: "/exim/brand" },
          { id: "classification", label: "Classification", path: "/exim/classification" },
          { id: "department", label: "Department", path: "/exim/department" },
          { id: "facility", label: "Facility", path: "/exim/facility" },
          { id: "hs", label: "HS", path: "/exim/hs" },
          { id: "category", label: "Category", path: "/exim/category" },
          { id: "style", label: "Style", path: "/exim/style" },
          { id: "colour", label: "Colour", path: "/exim/colour" },
        ],
      },
    ],
    directItems: [
      { id: "receive-note", label: "Receive Note", path: "/exim/receive-note" },
      { id: "receive-note-return", label: "Receive Note Return", path: "/exim/receive-note-return" },
      { id: "document-history", label: "Document History", path: "/exim/document-history" },
    ],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: "box",
    groups: [
      {
        id: "warehouse-master",
        label: "Warehouse Master",
        items: [
          { id: "warehouse-master-item", label: "Warehouse", path: "/warehouse/master" },
        ],
      },
      {
        id: "warehouse-adjustment",
        label: "Adjustment",
        items: [],
        isExpandablePlaceholder: true,
      },
      {
        id: "warehouse-incoming",
        label: "Incoming",
        items: [
          { id: "transfer-stock-return", label: "Transfer Stock Return", path: "#", isPlaceholder: true },
          { id: "transfer-stock-result", label: "Transfer Stock Result", path: "#", isPlaceholder: true },
          { id: "receive-material-non-fasilitas", label: "Receive Material (Non-Fasilitas)", path: "#", isPlaceholder: true },
          { id: "receive-material-bpb", label: "Receive Material (BPB)", path: "/warehouse" },
          { id: "purchase-return", label: "Purchase Return", path: "#", isPlaceholder: true },
          { id: "sales-return", label: "Sales Return", path: "#", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-outgoing",
        label: "Outgoing",
        items: [],
        isExpandablePlaceholder: true,
      },
      {
        id: "warehouse-request",
        label: "Request",
        items: [],
        isExpandablePlaceholder: true,
      },
      {
        id: "warehouse-report",
        label: "Report",
        items: [],
        isExpandablePlaceholder: true,
      },
    ],
    directItems: [
      { id: "move-location", label: "Move Location", path: "#", isPlaceholder: true },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: "layers",
    isUnpopulated: true,
  },
];
