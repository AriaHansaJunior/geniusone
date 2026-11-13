import type { PageKey, PageMeta } from "../types";

export const pageMeta: Record<PageKey, PageMeta> = {
  dashboard: {
    eyebrow: "OVERVIEW",
    title: "Dashboard",
    description: "Enterprise operations summary and real-time exchange rates.",
  },
  pr: {
    eyebrow: "PROCUREMENT",
    title: "Purchase Requisition",
    description: "Review demand, approval progress, and purchasing fulfilment.",
  },
  po: {
    eyebrow: "PROCUREMENT",
    title: "Purchase Order",
    description: "Track supplier orders and warehouse receiving status.",
  },
  report: {
    eyebrow: "REPORTING",
    title: "Combined PR–PO Report",
    description: "Trace purchasing documents from requisition through receiving.",
  },
  warehouse: {
    eyebrow: "WAREHOUSE",
    title: "Receive Material (BPB)",
    description: "Manage BPB receiving documents and approval.",
  },
  // Purchase Master
  supplier: {
    eyebrow: "PURCHASE MASTER",
    title: "Supplier",
    description: "Manage registered vendor profiles, contacts, and performance ratings.",
  },
  "payment-term": {
    eyebrow: "PURCHASE MASTER",
    title: "Payment Term",
    description: "Configure commercial payment conditions and settlement cycles.",
  },
  "purchase-category": {
    eyebrow: "PURCHASE MASTER",
    title: "Purchase Category",
    description: "Classify procurement expenditures and requisition buckets.",
  },
  "delivery-terms": {
    eyebrow: "PURCHASE MASTER",
    title: "Delivery Terms",
    description: "Define Incoterms and supplier shipping obligations.",
  },
  "additional-costs": {
    eyebrow: "PURCHASE MASTER",
    title: "Additional Costs",
    description: "Manage freight, insurance, handling, and incidental fee categories.",
  },
  pph: {
    eyebrow: "PURCHASE MASTER",
    title: "PPH",
    description: "Configure withholding tax schedules and corporate deduction rates.",
  },
  "rafaksi-type": {
    eyebrow: "PURCHASE MASTER",
    title: "Master Rafaksi Type",
    description: "Manage reference types for supplier deduction and quality adjustments.",
  },
  "job-number": {
    eyebrow: "PURCHASE MASTER",
    title: "Master Job Number",
    description: "Reference job numbers for procurement requisitions and tracking.",
  },
  "pr-create": {
    eyebrow: "PROCUREMENT",
    title: "Add Purchase Requisition",
    description: "Create new purchase requisition with line items and specifications.",
  },
  "po-create": {
    eyebrow: "PROCUREMENT",
    title: "Add Purchase Order",
    description: "Create new purchase order with financial breakdown and delivery terms.",
  },
  // Procurement Reports
  "pr-report": {
    eyebrow: "PROCUREMENT REPORTS",
    title: "Report Purchase Requisition",
    description: "Track requisition volume, departmental request velocity, and approval lead times.",
  },
  "po-report": {
    eyebrow: "PROCUREMENT REPORTS",
    title: "Reporting Purchase Order",
    description: "Comprehensive reporting on issued purchase orders, suppliers, and fulfilment status.",
  },
  // Exim Master
  unit: {
    eyebrow: "EXIM MASTER",
    title: "Unit",
    description: "Manage operational and facility unit definitions for customs clearance.",
  },
  satuan: {
    eyebrow: "EXIM MASTER",
    title: "Unit Reference",
    description: "Standardized customs unit of measure reference definitions.",
  },
  "unit-reference": {
    eyebrow: "EXIM MASTER",
    title: "Unit Reference",
    description: "Standardized customs unit of measure reference definitions.",
  },
  item: {
    eyebrow: "EXIM MASTER",
    title: "Master Item",
    description: "Customs item master index and international trade material catalog.",
  },
  brand: {
    eyebrow: "EXIM MASTER",
    title: "Master Brand",
    description: "Registered trade names and product trademark identities.",
  },
  classification: {
    eyebrow: "EXIM MASTER",
    title: "Master Classification",
    description: "Commodity trade classification and customs regulatory tiers.",
  },
  department: {
    eyebrow: "EXIM MASTER",
    title: "Master Department",
    description: "Organizational departments associated with trade documentation.",
  },
  facility: {
    eyebrow: "EXIM MASTER",
    title: "Master Facility",
    description: "Bonded zone, KITE, and customs facility permit profiles.",
  },
  hs: {
    eyebrow: "EXIM MASTER",
    title: "Master HS",
    description: "Harmonized tariff schedule codes and duty assessment parameters.",
  },
  category: {
    eyebrow: "EXIM MASTER",
    title: "Master Category",
    description: "Material and product groupings for customs reporting.",
  },
  style: {
    eyebrow: "EXIM MASTER",
    title: "Master Specification/Model",
    description: "Product design specifications and manufacturing style numbers.",
  },
  colour: {
    eyebrow: "EXIM MASTER",
    title: "Master Color",
    description: "Standardized color references for material tracking.",
  },
  country: {
    eyebrow: "EXIM MASTER",
    title: "Master Country",
    description: "Origin and destination country reference definitions for international trade.",
  },
  currency: {
    eyebrow: "EXIM MASTER",
    title: "Master Currency",
    description: "Foreign exchange currencies and system exchange rate reference.",
  },
  account: {
    eyebrow: "EXIM MASTER",
    title: "Master Account",
    description: "Account classifications for procurement and customs transactions.",
  },
  // Exim Other
  "receive-note": {
    eyebrow: "EXIM TRANSACTIONS",
    title: "Receive Note",
    description: "Verify inward shipment documentation and customs gate clearances.",
  },
  "receive-note-return": {
    eyebrow: "EXIM TRANSACTIONS",
    title: "Receive Note Return",
    description: "Manage import shipment returns, re-exports, and discrepancy adjustments.",
  },
  "document-history": {
    eyebrow: "EXIM AUDIT",
    title: "Document History",
    description: "Trace customs declaration milestones, status logs, and inspection records.",
  },
  // Warehouse Master
  "warehouse-master": {
    eyebrow: "WAREHOUSE MASTER",
    title: "Master Warehouse",
    description: "Storage facility records, zones, bin allocations, and supervisor assignments.",
  },
  "type-of-mutation": {
    eyebrow: "WAREHOUSE MASTER",
    title: "Type of Mutation",
    description: "Classification of inventory stock movement and mutation categories.",
  },
  "wh-type-of-request": {
    eyebrow: "WAREHOUSE MASTER",
    title: "Type of Request",
    description: "Manage material requisition categories, authorization workflows, and job requirements.",
  },
  "wh-destination-location": {
    eyebrow: "WAREHOUSE MASTER",
    title: "Destination Location",
    description: "Manage plant delivery destinations, production areas, workshops, and intermediate buffers.",
  },
  "stock-notification-master": {
    eyebrow: "DASHBOARD",
    title: "Stock Notification Master",
    description: "Configure minimum safety stock buffer thresholds and automated notification rules per item.",
  },
  // Warehouse Adjustment
  "wh-adj-prod": {
    eyebrow: "WAREHOUSE ADJUSTMENT",
    title: "Adjustment Production",
    description: "Reconcile manufacturing material usage and production batch variations.",
  },
  "wh-adj-bc": {
    eyebrow: "WAREHOUSE ADJUSTMENT",
    title: "Adjustment Stock BC",
    description: "Customs declaration inventory adjustment and Bea Cukai balance alignment.",
  },
  "wh-opname-material": {
    eyebrow: "WAREHOUSE ADJUSTMENT",
    title: "Opname Material",
    description: "Periodic physical stock counting and inventory variance recording.",
  },
  "wh-adj-stock": {
    eyebrow: "WAREHOUSE ADJUSTMENT",
    title: "Adjustment Stock",
    description: "General warehouse stock corrections and quantity balance adjustments.",
  },
  // Warehouse Incoming
  "transfer-stock-return": {
    eyebrow: "WAREHOUSE INCOMING",
    title: "Transfer Stock Return",
    description: "Receiving returned material transfers from internal production sections.",
  },
  "transfer-stock-result": {
    eyebrow: "WAREHOUSE INCOMING",
    title: "Transfer Stock Result",
    description: "Recording output transfers and finished product receipts.",
  },
  "receive-material-non-fasilitas": {
    eyebrow: "WAREHOUSE INCOMING",
    title: "Receive Material (Non-Fasilitas)",
    description: "Non-facility domestic receiving documents and non-bonded warehouse intake.",
  },
  "purchase-return": {
    eyebrow: "WAREHOUSE INCOMING",
    title: "Purchase Return",
    description: "Inbound records for returned supplier purchase shipments.",
  },
  "sales-return": {
    eyebrow: "WAREHOUSE INCOMING",
    title: "Sales Return",
    description: "Customer goods return receipts and commercial inspection logs.",
  },
  // Warehouse Outcoming
  "wh-out-do": {
    eyebrow: "WAREHOUSE OUTCOMING",
    title: "Delivery Order (Surat Jalan)",
    description: "Outbound delivery dispatch notes and transport carrier manifests.",
  },
  "wh-out-issue": {
    eyebrow: "WAREHOUSE OUTCOMING",
    title: "Issue Material",
    description: "Material issuance to shop floor and manufacturing work orders.",
  },
  "wh-out-disposal": {
    eyebrow: "WAREHOUSE OUTCOMING",
    title: "Disposal",
    description: "Scrap, obsolete material write-offs, and authorized disposal logs.",
  },
  // Warehouse Request
  "wh-req-weight-note": {
    eyebrow: "WAREHOUSE REQUEST",
    title: "Weight Note",
    description: "Scale tickets and certified gross/tare weight documentation.",
  },
  "wh-req-material": {
    eyebrow: "WAREHOUSE REQUEST",
    title: "Request Material",
    description: "Internal departmental requisitions for stock issue.",
  },
  "wh-req-weight-note-fg": {
    eyebrow: "WAREHOUSE REQUEST",
    title: "Weight Note Multiple FG",
    description: "Combined scale tickets for multi-pallet finished goods.",
  },
  "wh-req-shipping": {
    eyebrow: "WAREHOUSE REQUEST",
    title: "Shipping Instruction",
    description: "Outbound freight forwarding directives and container loading orders.",
  },
  "warehouse-move-location": {
    eyebrow: "WAREHOUSE OPERATIONS",
    title: "Move Location",
    description: "Internal bin-to-bin and rack transfer movements within facilities.",
  },
  // Warehouse Report
  "wh-rep-receive-material": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Receive Material Report",
    description: "Summary and detailed analytics for inward receiving receipts.",
  },
  "wh-rep-stock-item": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Stock Item Report",
    description: "Itemized warehouse stock balances and valuation summary.",
  },
  "wh-rep-stock-card": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Stock Card",
    description: "Continuous ledger of receipts, issues, and running balances per item.",
  },
  "wh-rep-stock-transfer": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Stock Transfer Report",
    description: "Cross-departmental and inter-warehouse movement audit logs.",
  },
  "wh-rep-delivery-order": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Delivery Order Report",
    description: "Comprehensive reporting on issued delivery orders and shipping manifests.",
  },
  "wh-rep-stock-mutation": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Stock Mutation Report",
    description: "Period-over-period mutation summary of opening, in, out, and closing stock.",
  },
  "wh-rep-outstanding-request": {
    eyebrow: "WAREHOUSE REPORTS",
    title: "Outstanding Request Report",
    description: "Tracking unfulfilled and in-progress material issue requests.",
  },
  "user-permission-admin": {
    eyebrow: "SYSTEM ADMINISTRATION",
    title: "User & Permission Management",
    description: "Manage enterprise user accounts, security roles, and granular two-stage approval authorizations.",
  },
  "audit-log-admin": {
    eyebrow: "SUPERADMIN GOVERNANCE",
    title: "System Audit Trail & History",
    description: "Real-time chronological audit trail of all user authentications, data modifications, and system activities in Western Indonesia Time (WIB).",
  },
};
