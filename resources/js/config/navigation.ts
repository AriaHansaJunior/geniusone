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
  sectionHeader?: string;
  items: NavLeafItem[];
  isExpandablePlaceholder?: boolean;
  isDirectLeaf?: boolean;
  path?: string;
  isPlaceholder?: boolean;
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
          { id: "supplier", label: "Supplier", path: "/procurement/purchase-master/supplier" },
          { id: "payment-term", label: "Payment Term", path: "/procurement/purchase-master/payment-term" },
          { id: "purchase-category", label: "Purchase Category", path: "/procurement/purchase-master/purchase-category" },
          { id: "delivery-terms", label: "Delivery Terms", path: "/procurement/purchase-master/delivery-terms" },
          { id: "additional-costs", label: "Additional Costs", path: "/procurement/purchase-master/additional-costs" },
          { id: "pph", label: "PPH", path: "/procurement/purchase-master/pph" },
        ],
      },
      {
        id: "transactions",
        label: "Transactions",
        items: [
          { id: "pr", label: "Purchase Requisition", path: "/procurement/transactions/purchase-requisition" },
          { id: "po", label: "Purchase Order", path: "/procurement/transactions/purchase-order" },
        ],
      },
      {
        id: "procurement-reports",
        label: "Reports",
        items: [
          { id: "report", label: "Report PR-PO", path: "/procurement/reports/report-pr-po", badge: "1,284" },
          { id: "pr-report", label: "Purchase Requisition Report", path: "/procurement/reports/purchase-requisition-report" },
          { id: "po-report", label: "Purchase Order Report", path: "/procurement/reports/purchase-order-report" },
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
          { id: "unit", label: "Unit", path: "/exim/master/unit" },
          { id: "satuan", label: "Satuan", path: "/exim/master/satuan" },
          { id: "item", label: "Item", path: "/exim/master/item" },
          { id: "brand", label: "Brand", path: "/exim/master/brand" },
          { id: "classification", label: "Classification", path: "/exim/master/classification" },
          { id: "department", label: "Department", path: "/exim/master/department" },
          { id: "facility", label: "Facility", path: "/exim/master/facility" },
          { id: "hs", label: "HS", path: "/exim/master/hs" },
          { id: "category", label: "Category", path: "/exim/master/category" },
          { id: "style", label: "Style", path: "/exim/master/style" },
          { id: "colour", label: "Colour", path: "/exim/master/colour" },
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
          { id: "warehouse-master", label: "Warehouse", path: "/warehouse/master/warehouse" },
          { id: "type-of-mutation", label: "Type of Mutation", path: "/warehouse/master/type-of-mutation", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-adjustment",
        label: "Adjustment",
        items: [
          { id: "wh-adj-prod", label: "Adjustment Production", path: "/warehouse/adjustment/adjustment-production", isPlaceholder: true },
          { id: "wh-adj-bc", label: "Adjustment Stock BC", path: "/warehouse/adjustment/adjustment-stock-bc", isPlaceholder: true },
          { id: "wh-opname-material", label: "Opname Material", path: "/warehouse/adjustment/opname-material", isPlaceholder: true },
          { id: "wh-adj-stock", label: "Adjustment Stock", path: "/warehouse/adjustment/adjustment-stock", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-incoming",
        label: "Incoming",
        items: [
          { id: "transfer-stock-return", label: "Transfer Stock Return", path: "/warehouse/incoming/transfer-stock-return", isPlaceholder: true },
          { id: "transfer-stock-result", label: "Transfer Stock Result", path: "/warehouse/incoming/transfer-stock-result", isPlaceholder: true },
          { id: "receive-material-non-fasilitas", label: "Receive Material (Non-Fasilitas)", path: "/warehouse/incoming/receive-material-non-fasilitas", isPlaceholder: true },
          { id: "warehouse", label: "Receive Material (BPB)", path: "/warehouse/incoming/receive-material-bpb" },
          { id: "purchase-return", label: "Purchase Return", path: "/warehouse/incoming/purchase-return", isPlaceholder: true },
          { id: "sales-return", label: "Sales Return", path: "/warehouse/incoming/sales-return", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-outcoming",
        label: "Outcoming",
        items: [
          { id: "wh-out-do", label: "Delivery Order (Surat Jalan)", path: "/warehouse/outcoming/delivery-order", isPlaceholder: true },
          { id: "wh-out-issue", label: "Issue Material", path: "/warehouse/outcoming/issue-material", isPlaceholder: true },
          { id: "wh-out-disposal", label: "Disposal", path: "/warehouse/outcoming/disposal", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-request",
        label: "Request",
        items: [
          { id: "wh-req-weight-note", label: "Weight Note", path: "/warehouse/request/weight-note", isPlaceholder: true },
          { id: "wh-req-material", label: "Request Material", path: "/warehouse/request/request-material", isPlaceholder: true },
          { id: "wh-req-weight-note-fg", label: "Weight Note Multiple FG", path: "/warehouse/request/weight-note-multiple-fg", isPlaceholder: true },
          { id: "wh-req-shipping", label: "Shipping Instruction", path: "/warehouse/request/shipping-instruction", isPlaceholder: true },
        ],
      },
      {
        id: "warehouse-move-location",
        label: "Move Location",
        isDirectLeaf: true,
        isPlaceholder: true,
        path: "/warehouse/move-location",
        items: [],
      },
      {
        id: "warehouse-report",
        label: "Report",
        items: [
          { id: "wh-rep-receive-material", label: "Receive Material", path: "/warehouse/report/receive-material", isPlaceholder: true },
          { id: "wh-rep-stock-item", label: "Stock Item", path: "/warehouse/report/stock-item", isPlaceholder: true },
          { id: "wh-rep-stock-card", label: "Stock Card", path: "/warehouse/report/stock-card", isPlaceholder: true },
          { id: "wh-rep-stock-transfer", label: "Stock Transfer Report", path: "/warehouse/report/stock-transfer-report", isPlaceholder: true },
          { id: "wh-rep-delivery-order", label: "Delivery Order Report", path: "/warehouse/report/delivery-order-report", isPlaceholder: true },
          { id: "wh-rep-stock-mutation", label: "Stock Mutation Report", path: "/warehouse/report/stock-mutation-report", isPlaceholder: true },
          { id: "wh-rep-outstanding-request", label: "Outstanding Request", path: "/warehouse/report/outstanding-request", isPlaceholder: true },
        ],
      },
    ],
  },
  {
    id: "production",
    label: "Production",
    icon: "layers",
    isUnpopulated: true,
  },
];
