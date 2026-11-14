/**
 * Operations, Warehouse, Dashboard, Reporting & Admin API Service — GENIUSONE UI 2.0
 * Split from masterApi.ts for modular maintainability (< 1,000 lines per module).
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api";
import type { ReceiveNoteRecord } from "../pages/Exim/ReceiveNote/receive-note-types";
import type { ReceiveNoteReturnRecord } from "../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import type { DocumentHistoryRecord } from "../pages/Exim/DocumentHistory/document-history-types";
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";
import type { RequestMaterialRecord, ApprovalStatus } from "../pages/Warehouse/Request/RequestMaterial/request-material-types";
import type { StockNotificationRecord } from "../pages/Dashboard/StockNotificationMaster/stock-notification-types";
import type { ExchangeRateRecord, RateType, RateAvailability } from "../pages/Dashboard/dashboard-rate-types";
import type { TransferStockReturnRecord, TransferStockReturnStatus } from "../pages/Warehouse/TransferStockReturn/transfer-stock-return-types";
import type { WarehouseStockRecord } from "../pages/Warehouse/Report/StockItem/stock-item-types";
import type { StockCardRecord } from "../pages/Warehouse/Report/StockCard/stock-card-types";
import type { PoReportRecord } from "../pages/Procurement/Reports/po-report-types";
import type { PrReportRecord } from "../pages/Procurement/Reports/pr-report-types";

function formatDisplayDate(val?: string | null): string {
  if (!val) return "-";
  const str = String(val).trim();
  if (!str) return "-";
  return str.replace("T", " ").slice(0, 19);
}

function isTruthyStatus(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    return lower === "1" || lower === "true" || lower === "active" || lower === "yes";
  }
  return Boolean(val);
}

function toNumericOrCleanId(id: string | number): string {
  const raw = String(id).trim();
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : raw;
}

// =========================================================================
// 5. EXIM OPERATIONS (RECEIVE NOTE, RECEIVE NOTE RETURN, DOCUMENT HISTORY)
// =========================================================================

export async function fetchMasterReceiveNotes(): Promise<ReceiveNoteRecord[] | null> {
  const res = await apiGet<{ rows?: any[]; data?: any[] }>("/api/warehouse/rn", { per_page: 200 });
  const rows = res?.rows || res?.data;
  if (!Array.isArray(rows)) return null;

  return rows.map((r: any, idx: number) => {
    const rawFac = String(r.facility || "");
    const supplierName =
      typeof r.supplier === "object" && r.supplier !== null
        ? String(r.supplier.name || r.supplier.code || "-")
        : String(r.supplier || r._rawSupplier || "-");
    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => ({
          id: String(it.id || iIdx + 1),
          no: iIdx + 1,
          poNumber: it.poNumber || it.po_number || "-",
          poDate: it.poDate || it.po_date || "-",
          dnNumber: it.dnNumber || it.dn_number || "-",
          dnDate: it.dnDate || it.dn_date || "-",
          jobNumber: it.jobNumber || it.job_number || "-",
          jobDate: it.jobDate || it.job_date || "-",
          itemCode: it.itemCode || it.item_code || it.code || "-",
          itemName: it.itemName || it.item_name || it.item || "-",
          qty: Number(it.quantity ?? it.qty ?? 0),
          unit: it.unit || "-",
          rafaksi: Number(it.rafaksi ?? 0),
          rafaksiPercent: Number(it.rafaksi_percent ?? 0),
          pricePerUnit: Number(it.price ?? it.pricePerUnit ?? 0),
          priceSubtotal: Number(it.priceSubtotal ?? it.subtotal ?? it.grand_total ?? (Number(it.quantity || 0) * Number(it.price || 0))),
          price2PerUnit: Number(it.price2 ?? it.price ?? 0),
          price2Subtotal: Number(it.subtotal2 ?? it.subtotal ?? 0),
          remark: it.remark || "-",
          sjNumber: it.sj_number || r.sj_number || "-",
          sjDate: it.sj_date || r.sj_date || "-",
          poQty: Number(it.po_qty ?? it.quantity ?? 0),
          dlvrQty: Number(it.dlvr_qty ?? it.quantity ?? 0),
          suratJalanQty: Number(it.surat_jalan_qty ?? it.suratJalanQty ?? it.quantity ?? 0),
        }))
      : [];

    const totalSubtotal = items.reduce((s: number, it: any) => s + Number(it.priceSubtotal || 0), 0);
    const totalQty = items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0);
    const bpbNumbers = Array.isArray(r.bpb_numbers) ? r.bpb_numbers : [];

    return {
      id: String(r.id || r._id || idx + 1),
      no: idx + 1,
      rnNumber: r.rn_number || r.rnNumber || r._rawRn || "",
      arrivalDate: r.arrival_date || r.date || "-",
      poNumber: r.po_number || items[0]?.poNumber || "-",
      date: r.date || r.arrival_date || "-",
      supplier: supplierName,
      facility: /non/i.test(rawFac) ? "NON FASILITAS" : "FASILITAS",
      bcCode: r.bc_code || r.bcCode || r.bc_type || "-",
      ajuNumber: r.aju_number || "-",
      noDaftar: r.no_daftar || "-",
      amount: Number(r.grand_total ?? r.amount ?? totalSubtotal),
      amountFormatted: r.amountFormatted || r.formatted_grand_total || `${r.currency || "IDR"} ${Number(r.grand_total ?? totalSubtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: r.note || r.description || "-",
      warehouseTransaction: bpbNumbers[0] || r.bpb_number || "-",
      bpb_number: bpbNumbers[0] || r.bpb_number || undefined,
      is_received_in_bpb: Boolean(r.is_received || r.is_received_in_bpb || bpbNumbers.length > 0),
      notes: r.note || r.description || "-",
      note: r.note || r.description || "-",
      remark: r.note || r.description || "-",
      currency: typeof r.currency === "object" && r.currency !== null ? String(r.currency.code || r.currency.name || "IDR") : String(r.currency || "IDR"),
      rate: Number(r.rate || 1),
      invoiceNumber: r.invoice_number || "-",
      invoiceDate: r.invoice_date || "-",
      taxInvoiceNumber: r.tax_invoice || "-",
      taxInvoiceDate: r.tax_invoice_date || "-",
      vehicleType: r.vehicle_type || "-",
      licensePlate: r.license_plate || "-",
      tanggalDaftar: r.tanggal_daftar || "-",
      nomorPackingList: r.pl_number || r.sj_number || "-",
      tanggalPackingList: r.pl_date || r.sj_date || "-",
      status: String(r.status || "Waiting for Approve 1"),
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      approval1At: r.approval_1_at || r.approval1_at || "-",
      approval2At: r.approval_2_at || r.approval2_at || "-",
      items,
      totalQty: Number(r.total_qty ?? totalQty),
      biayaLain: Number(r.biaya_lain ?? 0),
      discountPercent: Number(r.discount_percent ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      ppnPercent: Number(r.ppn_percent ?? 0),
      ppnAmount: Number(r.ppn_amount ?? 0),
      grandTotal: Number(r.grand_total ?? totalSubtotal),
    };
  });
}

export const fetchReceiveNotes = fetchMasterReceiveNotes;

export async function fetchReceiveNoteAvailablePosApi(params?: { supplierId?: string | number; facility?: string }): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/rn/available-pos", params as any);
  return res?.data ?? [];
}

export async function deleteReceiveNoteApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/warehouse/rn/${toNumericOrCleanId(id)}`);
}

export async function approveReceiveNoteApi(id: string | number, tier?: number, note?: string): Promise<any> {
  return apiPost(`/api/warehouse/rn/${toNumericOrCleanId(id)}/approve`, { tier, note });
}

export async function rejectReceiveNoteApi(id: string | number, reason: string): Promise<any> {
  return apiPost(`/api/warehouse/rn/${toNumericOrCleanId(id)}/reject`, { reason });
}

export async function fetchMasterReceiveNoteReturns(): Promise<ReceiveNoteReturnRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/returns", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => {
    const rawFac = String(r.facility || "");
    const rawStatus = String(r.status || "Waiting for Approve 1");
    let approvalStatus = "Waiting for Approve 1";
    if (/reject/i.test(rawStatus)) approvalStatus = "Rejected";
    else if (/approve\s*2|^approved$/i.test(rawStatus)) approvalStatus = "Approved";
    else if (/waiting.*2|approve\s*1/i.test(rawStatus)) approvalStatus = "Waiting for Approve 2";

    const rate = Number(r.exchange_rate || 1);
    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => {
          const qty = Number(it.return_qty ?? it.returnQty ?? it.quantity ?? 0);
          const price = Number(it.unit_price ?? it.price ?? 0);
          const sub = Number(it.total_amount ?? it.subtotal ?? qty * price);
          return {
            id: String(it.id || iIdx + 1),
            no: iIdx + 1,
            doNumber: it.po_number || it.doNumber || r.rn_reference || "-",
            doDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
            sjNumber: r.sj_number || "-",
            itemCode: it.item_code || it.itemCode || "-",
            itemName: it.item_name || it.itemName || "-",
            quantity: qty,
            unit: it.unit || "-",
            qtyPackage: Number(it.qty_package ?? 1),
            packageType: it.package_type || "BOX",
            price,
            subtotal: sub,
            subtotalIdr: sub * rate,
            deliveryQty: qty,
            returQty: qty,
          };
        })
      : [];

    const totalSubtotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
    return {
      id: String(r.id),
      no: idx + 1,
      rnNumber: r.return_number || r.rn_reference || "",
      rnDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
      deliveryOrder: r.rn_reference || r.sj_number || null,
      doDate: r.sj_date ? String(r.sj_date).slice(0, 10) : null,
      customer: r.supplier_name || "-",
      facility: /non/i.test(rawFac) ? "NON FASILITAS" : "FASILITAS",
      bcCode: r.bc_type || "-",
      ajuNumber: r.aju_number || "-",
      noDaftar: r.registration_number || null,
      amount: totalSubtotal,
      amountFormatted: `${r.currency || "IDR"} ${totalSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: r.reason || "-",
      warehouseTransaction: null,
      warehouseReceiveDate: null,
      approvalStatus,
      userCreated: r.created_by_name || "-",
      createdAtTimestamp: formatDisplayDate(r.created_at),
      arrivalDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
      typeOfReturn: r.reason || "Purchase Return",
      salesDeliveryNumber: r.rn_reference || "-",
      vehicleType: r.vehicle_type || "-",
      licensePlate: r.license_plate || "-",
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      releasedAt: formatDisplayDate(r.created_at),
      approvedAt: r.approved2_at ? formatDisplayDate(r.approved2_at) : "-",
      items,
      totalSubtotal,
      totalAdditionalCost: 0,
      grandTotal: totalSubtotal,
      notes: r.reason || "-",
    };
  });
}

export const fetchReceiveNoteReturns = fetchMasterReceiveNoteReturns;

export async function fetchReceiveNoteReturnAvailableSourcesApi(supplierId?: string | number): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/returns/available-sources", supplierId ? { supplier_id: supplierId } : undefined);
  return res?.data ?? [];
}

export async function saveReceiveNoteReturnApi(newRecord: ReceiveNoteReturnRecord): Promise<ReceiveNoteReturnRecord | null> {
  const payload = {
    return_number: newRecord.rnNumber,
    rn_reference: newRecord.deliveryOrder || newRecord.salesDeliveryNumber || newRecord.items?.[0]?.doNumber,
    return_date: newRecord.rnDate || newRecord.arrivalDate,
    supplier_name: newRecord.customer,
    facility: /non/i.test(newRecord.facility) ? "Non Fasilitas" : "Fasilitas",
    sj_number: newRecord.items?.[0]?.sjNumber || newRecord.deliveryOrder,
    sj_date: newRecord.doDate || newRecord.rnDate,
    bc_type: newRecord.bcCode,
    aju_number: newRecord.ajuNumber,
    registration_number: newRecord.noDaftar,
    license_plate: newRecord.licensePlate,
    vehicle_type: newRecord.vehicleType,
    reason: newRecord.description || newRecord.notes,
    status: newRecord.approvalStatus || "Waiting for Approve 1",
    items: (newRecord.items || []).map((it) => ({
      po_number: it.doNumber,
      rn_reference: newRecord.deliveryOrder,
      item_code: it.itemCode,
      item_name: it.itemName,
      return_qty: it.returQty ?? it.quantity,
      unit: it.unit,
      unit_price: it.price,
      total_amount: it.subtotal,
      reason: newRecord.description || "-",
    })),
  };
  const res = await apiPost<{ data: any }>("/api/exim/operations/returns", payload);
  if (!res?.data) return null;
  return {
    ...newRecord,
    id: String(res.data.id),
    rnNumber: res.data.return_number || newRecord.rnNumber,
    userCreated: res.data.created_by_name || newRecord.userCreated || "-",
    lastUpdatedAt: formatDisplayDate(res.data.updated_at || res.data.created_at),
  };
}

export async function approveReceiveNoteReturnApi(id: string | number): Promise<any> {
  return apiPost(`/api/exim/operations/returns/${toNumericOrCleanId(id)}/approve`, {});
}

export async function rejectReceiveNoteReturnApi(id: string | number, reason?: string): Promise<any> {
  return apiPost(`/api/exim/operations/returns/${toNumericOrCleanId(id)}/reject`, { reason });
}

export async function deleteReceiveNoteReturnApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/operations/returns/${toNumericOrCleanId(id)}`);
}

export async function fetchMasterDocumentHistories(): Promise<DocumentHistoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/document-histories", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => {
    const cif = Number(r.cif_value || 0);
    const curr = r.currency || "IDR";
    return {
      id: String(r.id),
      no: idx + 1,
      invoiceNumber: r.reference_doc_number || r.aju_number || "-",
      mutationType: r.reference_doc_type || "INCOMING",
      invoiceDate: r.registration_date ? String(r.registration_date).slice(0, 10) : "-",
      customerSupplier: r.partner_name || "-",
      customsDocument: `${r.bc_type || "-"} / ${r.aju_number || "-"}`,
      amount: cif,
      amountFormatted: `${curr} ${cif.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      lastUpdatedUser: r.created_by_name || "-",
      lastUpdatedTimestamp: formatDisplayDate(r.updated_at || r.created_at),
      transactionNumber: r.aju_number || "-",
      invoiceAlias: r.registration_number || "-",
      customer: r.partner_name || "-",
      destination: r.customs_office || "-",
      blNumber: r.sppb_number || "-",
      currency: curr,
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      items: [],
      totalUnitPrice: cif,
      totalSubtotal: cif,
    };
  });
}

export const fetchDocumentHistories = fetchMasterDocumentHistories;

export async function synchronizeDocumentHistoriesApi(): Promise<any> {
  return apiPost("/api/exim/operations/document-histories/synchronize", {});
}

export async function generateDocumentHistoryApi(payload: Record<string, any>): Promise<any> {
  return apiPost("/api/exim/operations/document-histories/generate", payload);
}

export async function deleteDocumentHistoryApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/operations/document-histories/${toNumericOrCleanId(id)}`);
}

export async function fetchMasterUnitReferences(): Promise<UnitReferenceRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/unit-references", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    code: r.code || r.unit?.nama || "",
    description: r.name || r.description || r.unit?.nama || "",
  }));
}

export async function saveUnitReferenceApi(record: Partial<UnitReferenceRecord>, isEdit?: boolean): Promise<UnitReferenceRecord | null> {
  const payload = {
    code: record.code,
    name: record.description,
    status: 1,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/exim/master/unit-references/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/unit-references", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    code: r.code || record.code || "",
    description: r.name || r.description || record.description || "",
  };
}

export async function deleteUnitReferenceApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/master/unit-references/${toNumericOrCleanId(id)}`);
}

export async function toggleUnitReferenceStatusApi(id: string | number): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/unit-references/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 6. WAREHOUSE MATERIAL REQUEST & TRANSFER STOCK RETURN
// =========================================================================

export async function fetchRequestMaterials(): Promise<RequestMaterialRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/request-materials", { per_page: 200 });
  if (!res?.data) return null;

  return res.data.map((r: any, index: number) => {
    const rawStatus = String(r.approval || r.approval_status || r.status || "Draft");
    let approval: ApprovalStatus = "Draft";
    if (/reject/i.test(rawStatus)) approval = "Rejected";
    else if (/approved\s*2|^approved$/i.test(rawStatus)) approval = "Approved 2";
    else if (/approved\s*1|waiting.*2/i.test(rawStatus)) approval = "Approved 1";
    else if (/waiting.*1/i.test(rawStatus)) approval = "Waiting Approve 1" as ApprovalStatus;

    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => ({
          id: String(it.id || `item-${iIdx + 1}`),
          items_id: it.items_id ? Number(it.items_id) : undefined,
          itemCode: it.itemCode || it.item_code || it.item?.code || "-",
          externalCode: it.externalCode || it.external_code || it.item?.external_code || "-",
          itemName: it.itemName || it.item_name || it.item?.name || "-",
          unit: it.unit || it.item?.unit?.name || "-",
          jobNumber: it.jobNumber || it.job_number || r.jobNumber || r.job_number || "-",
          size: it.size || "-",
          stockQty: Number(it.stockQty ?? it.stock_qty ?? 0),
          pendingQty: Number(it.pendingQty ?? it.pending_qty ?? 0),
          requestQty: Number(it.requestQty ?? it.request_qty ?? it.qty ?? 0),
          remark: it.remark || "-",
        }))
      : [];

    return {
      id: String(r.rawId ?? r.id ?? r.requestCode ?? r.code),
      no: index + 1,
      requestCode: r.requestCode || r.code || `REQ-${r.id}`,
      requestDate: r.requestDate || r.date || "-",
      destinationLocation: r.destinationLocation || r.destination_location || r.warehouse_destination || "-",
      department: r.department || "-",
      typeOfRequest: r.typeOfRequest || r.type_of_request || "-",
      jobNumber: r.jobNumber || r.job_number || "-",
      customer: r.customer || "-",
      requestNote: r.requestNote || r.note || "-",
      totalItems: Number(r.totalItems ?? r.total_items ?? items.length),
      approval,
      projectType: r.projectType || r.project_type || "-",
      createdDate: formatDisplayDate(r.createdDate || r.created_at),
      lastUpdatedDate: formatDisplayDate(r.lastUpdatedDate || r.updated_at || r.created_at),
      createdBy: r.createdBy || r.created_by || "-",
      soNumber: r.so_number || "-",
      poBuyer: r.po_buyer || "-",
      warehouseDestination: r.warehouseName || r.warehouse_destination || r.destinationLocation || r.destination_location || "-",
      approved1At: r.approved1At || r.approved_1_at || "-",
      approved2At: r.approved2At || r.approved_2_at || "-",
      revisionCount: Number(r.revision_count ?? 0),
      items,
    };
  });
}

export async function saveRequestMaterialApi(record: RequestMaterialRecord & Record<string, any>): Promise<any> {
  return apiPost("/api/warehouse/request-materials", {
    requestDate: record.requestDate,
    departments_id: record.departments_id || undefined,
    department: record.department,
    warehouses_id: record.warehouses_id || undefined,
    warehouse: record.warehouseDestination || record.warehouse || undefined,
    type_of_request_id: record.type_of_request_id || undefined,
    typeOfRequest: record.typeOfRequest,
    destination_location_id: record.destination_location_id || undefined,
    destinationLocation: record.destinationLocation,
    job_number_id: record.job_number_id || undefined,
    jobNumber: record.jobNumber && record.jobNumber !== "-" ? record.jobNumber : undefined,
    customer: record.customer,
    projectType: record.projectType,
    is_internal_warehouse: Boolean(record.isInternalWarehouse),
    is_specific_station: Boolean(record.isSpecificStation),
    requestNote: record.requestNote,
    note: record.requestNote,
    items: (record.items || []).map((it: any) => ({
      items_id: it.items_id || undefined,
      itemCode: it.itemCode,
      itemName: it.itemName,
      unit: it.unit,
      jobNumber: it.jobNumber,
      size: it.size,
      requestQty: Number(it.requestQty ?? it.qty ?? 1),
      remark: it.remark || "",
    })),
  });
}

function mapTransferStockReturnRecord(r: any): TransferStockReturnRecord {
  const rawStatus = String(r.status || "Waiting Approve 1");
  let status: TransferStockReturnStatus = "Waiting Approve 1";
  if (/reject/i.test(rawStatus)) status = "Rejected";
  else if (/approved\s*1|waiting.*2/i.test(rawStatus)) status = "Waiting Approve 2";
  else if (/^approved$|approved\s*2/i.test(rawStatus)) status = "Approved";
  else if (/draft/i.test(rawStatus)) status = "Draft";
  else if (/waiting.*1/i.test(rawStatus)) status = "Waiting Approve 1";

  const items = Array.isArray(r.items)
    ? r.items.map((it: any, idx: number) => ({
        id: String(it.id || idx + 1),
        items_id: it.items_id ? Number(it.items_id) : undefined,
        itemCode: it.itemCode || it.item_code || "-",
        itemName: it.itemName || it.item_name || "-",
        quantity: Number(it.quantity ?? it.return_qty ?? 0),
        unit: it.unit || "-",
        sourceLocation: it.sourceLocation || it.source_location || "-",
        destinationLocation: it.destinationLocation || it.destination_location || "-",
        reason: it.remark || it.reason || "-",
      }))
    : [];

  return {
    id: String(r.rawId ?? r.id),
    warehouses_id: r.warehouses_id ?? r.warehouseId ? Number(r.warehouses_id ?? r.warehouseId) : undefined,
    warehouseName: r.warehouse || r.warehouseName || "",
    request_material_id: r.request_material_id ?? r.requestMaterialId ? Number(r.request_material_id ?? r.requestMaterialId) : undefined,
    job_number_id: r.job_number_id ?? r.jobNumberId ? Number(r.job_number_id ?? r.jobNumberId) : undefined,
    mutationCode: r.returnNumber || r.mutationCode || r.mutation_code || "",
    productionCode: r.productionCode || r.production_code || "",
    jobNumber: r.jobNumber || r.job_number || "-",
    transferDate: r.returnDateFormatted || r.returnDate || r.transferDate || r.transfer_date || "-",
    transferNote: r.note || r.transferNote || r.transfer_note || "-",
    totalItems: Number(r.itemCount ?? r.totalItems ?? items.length),
    status,
    userCreated: r.createdBy || r.userCreated || r.created_by || "-",
    userLastUpdated: formatDisplayDate(r.updatedAt || r.createdAt || r.userLastUpdated),
    items,
  };
}

export async function fetchTransferStockReturnsApi(): Promise<TransferStockReturnRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/transfer-stock-returns", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map(mapTransferStockReturnRecord);
}

export async function fetchTransferStockReturnDetailApi(code: string): Promise<TransferStockReturnRecord | null> {
  const cleanCode = encodeURIComponent(code.trim());
  const res = await apiGet<{ data: any }>(`/api/warehouse/transfer-stock-returns/${cleanCode}`);
  if (res?.data) {
    return mapTransferStockReturnRecord(res.data);
  }
  const all = await fetchTransferStockReturnsApi();
  if (!all) return null;
  const normTarget = code.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  return (
    all.find(
      (r) =>
        r.id === code ||
        r.mutationCode.toLowerCase() === code.toLowerCase() ||
        r.mutationCode.replace(/[^A-Za-z0-9]/g, "").toLowerCase() === normTarget
    ) || null
  );
}

export async function fetchTransferStockReturnAvailableSourcesApi(): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/transfer-stock-returns/available-sources");
  return res?.data ?? [];
}

export async function saveTransferStockReturnApi(payload: Record<string, any>, editId?: string | number): Promise<any> {
  if (editId !== undefined && editId !== null && String(editId).trim() !== "" && /^\d+$/.test(toNumericOrCleanId(editId))) {
    return apiPut(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(editId)}`, payload);
  }
  return apiPost("/api/warehouse/transfer-stock-returns", payload);
}

export async function approveTransferStockReturnApi(id: string | number, tier?: number, note?: string): Promise<any> {
  return apiPost(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}/approve`, { tier, note });
}

export async function rejectTransferStockReturnApi(id: string | number, reason: string): Promise<any> {
  return apiPost(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}/reject`, { note: reason, reason });
}

export async function deleteTransferStockReturnApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}`);
}

// =========================================================================
// 7. DASHBOARD EXCHANGE RATES & STOCK NOTIFICATIONS / ALERTS
// =========================================================================

export async function fetchExchangeRatesApi(params?: {
  currency_code?: string;
  rate_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ExchangeRateRecord[]> {
  const queryParams = params
    ? {
        currency: params.currency_code,
        rateType: params.rate_type,
        startDate: params.start_date,
        endDate: params.end_date,
      }
    : undefined;
  const res = await apiGet<{ data: any[] }>("/api/dashboard/exchange-rates", { per_page: 200, ...queryParams });
  if (!res?.data) return [];
  return res.data.map((r: any, idx: number) => {
    const rawRateType = String(r.rate_type || "");
    let rateType: RateType = "Bank Indonesia (BI)";
    if (/pajak|kmk/i.test(rawRateType)) rateType = "Pajak (KMK)";
    else if (/commercial|counter|komersial/i.test(rawRateType)) rateType = "Commercial Bank (Counter)";
    else if (/bi|tengah|indonesia/i.test(rawRateType)) rateType = "Bank Indonesia (BI)";

    const buyingRaw = r.buy_rate ?? r.buying_rate;
    const sellingRaw = r.sell_rate ?? r.selling_rate;
    const middleRaw = r.middle_rate ?? r.rate;

    return {
      id: String(r.id),
      no: idx + 1,
      rateDate: r.rate_date ? String(r.rate_date).slice(0, 10) : "-",
      currencyCode: r.currency_code || "USD",
      currencyName: r.currency?.name || r.currency_name || r.currency_code || "-",
      rateType,
      buyingRate: buyingRaw !== null && buyingRaw !== undefined ? Number(buyingRaw) : null,
      sellingRate: sellingRaw !== null && sellingRaw !== undefined ? Number(sellingRaw) : null,
      rate: middleRaw !== null && middleRaw !== undefined ? Number(middleRaw) : null,
      flag: r.flag || r.reference_document || "-",
      availability: (["Available", "Unavailable", "Pending"].includes(r.availability)
        ? r.availability
        : "Available") as RateAvailability,
      note: r.notes || r.note || undefined,
    };
  });
}

export async function fetchLatestExchangeRatesApi(): Promise<Record<string, number>> {
  const res = await apiGet<{ data: any }>("/api/dashboard/exchange-rates/latest");
  const out: Record<string, number> = { IDR: 1 };
  if (Array.isArray(res?.data)) {
    res.data.forEach((r: any) => {
      if (r.currency_code && (r.middle_rate || r.rate)) {
        out[String(r.currency_code).toUpperCase()] = Number(r.middle_rate || r.rate);
      }
    });
  } else if (res?.data && typeof res.data === "object") {
    Object.entries(res.data).forEach(([k, v]: [string, any]) => {
      if (typeof v === "number") out[k.toUpperCase()] = v;
      else if (v && typeof v === "object" && (v.middle_rate || v.rate)) {
        out[k.toUpperCase()] = Number(v.middle_rate || v.rate);
      }
    });
  }
  return out;
}

export async function saveExchangeRateApi(record: Partial<ExchangeRateRecord>, editId?: string): Promise<any> {
  const payload = {
    rate_date: record.rateDate,
    currency_code: record.currencyCode,
    rate_type: record.rateType,
    buying_rate: record.buyingRate,
    selling_rate: record.sellingRate,
    middle_rate: record.rate,
    reference_document: record.flag,
    availability: record.availability || "Available",
    notes: record.note,
  };
  if (editId) {
    return apiPut(`/api/dashboard/exchange-rates/${toNumericOrCleanId(editId)}`, payload);
  }
  return apiPost("/api/dashboard/exchange-rates", payload);
}

export async function deleteExchangeRateApi(id: string): Promise<boolean> {
  return apiDelete(`/api/dashboard/exchange-rates/${toNumericOrCleanId(id)}`);
}

function mapStockNotificationRecord(
  r: any,
  idx: number,
  defaultLevel: StockNotificationRecord["notificationLevel"] = "Warning"
): StockNotificationRecord {
  const triggerRaw = r.triggerCondition ?? r.trigger_condition;
  const levelRaw = r.notificationLevel ?? r.notification_level ?? r.severity;
  const lastTriggeredRaw = r.lastTriggered ?? r.lastTriggeredAt ?? r.last_triggered_at;
  const createdAtRaw = r.createdAt ?? r.created_at;
  const updatedAtRaw = r.updatedAt ?? r.updated_at;

  return {
    id: String(r.id),
    no: idx + 1,
    itemCode: r.itemCode || r.item_code || r.item?.code || "-",
    itemName: r.itemName || r.item_name || r.item?.name || "-",
    category: r.category || r.item?.category?.name || r.item?.classification?.name || "-",
    unit: r.unit || r.item?.unit?.unit?.nama || r.item?.unit?.nama || "-",
    currentStock: Number(r.currentStock ?? r.current_stock ?? 0),
    bufferQuantity: Number(r.bufferQuantity ?? r.buffer_quantity ?? r.minBuffer ?? 0),
    triggerCondition: (triggerRaw === "Stock < Buffer"
      ? "Stock < Buffer"
      : "Stock <= Buffer") as StockNotificationRecord["triggerCondition"],
    notificationLevel: (["Critical", "Warning", "Standard"].includes(levelRaw)
      ? levelRaw
      : defaultLevel) as StockNotificationRecord["notificationLevel"],
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    lastTriggered: lastTriggeredRaw ? formatDisplayDate(lastTriggeredRaw) : undefined,
    notes: r.notes || undefined,
    createdAt: formatDisplayDate(createdAtRaw),
    createdBy: r.createdBy || r.created_by || r.creator?.name || "-",
    updatedAt: updatedAtRaw ? formatDisplayDate(updatedAtRaw) : undefined,
    updatedBy: r.updatedBy || r.updated_by || undefined,
  };
}

export async function fetchStockNotificationsApi(): Promise<StockNotificationRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/dashboard/stock-notifications", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => mapStockNotificationRecord(r, idx, "Warning"));
}

export async function fetchStockAlertsApi(): Promise<StockNotificationRecord[]> {
  const res = await apiGet<{ data: any[] }>("/api/dashboard/stock-alerts");
  if (!res?.data) return [];
  return res.data.map((r: any, idx: number) => mapStockNotificationRecord(r, idx, "Critical"));
}

export async function saveStockNotificationApi(record: StockNotificationRecord, isEdit?: boolean): Promise<StockNotificationRecord | null> {
  const payload = {
    item_code: record.itemCode,
    item_name: record.itemName,
    category: record.category,
    unit: record.unit,
    current_stock: record.currentStock,
    buffer_quantity: record.bufferQuantity,
    trigger_condition: record.triggerCondition,
    notification_level: record.notificationLevel,
    status: record.status === "Active" ? 1 : 0,
    notes: record.notes,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/dashboard/stock-notifications/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/dashboard/stock-notifications", payload);
  if (!res?.data) return null;
  const mapped = mapStockNotificationRecord(res.data, Math.max(0, (record.no || 1) - 1), record.notificationLevel);
  return {
    ...record,
    ...mapped,
    itemCode: mapped.itemCode !== "-" ? mapped.itemCode : record.itemCode,
    itemName: mapped.itemName !== "-" ? mapped.itemName : record.itemName,
    category: mapped.category !== "-" ? mapped.category : record.category,
    unit: mapped.unit !== "-" ? mapped.unit : record.unit,
    createdBy: mapped.createdBy !== "-" ? mapped.createdBy : (record.createdBy || "-"),
  };
}

export async function deleteStockNotificationApi(id: string): Promise<boolean> {
  return apiDelete(`/api/dashboard/stock-notifications/${toNumericOrCleanId(id)}`);
}

export async function toggleStockNotificationStatusApi(id: string): Promise<StockNotificationRecord | null> {
  const res = await apiPatch<{ data: any }>(`/api/dashboard/stock-notifications/${toNumericOrCleanId(id)}/toggle-status`);
  if (!res?.data) return null;
  return mapStockNotificationRecord(res.data, 0, "Warning");
}

// =========================================================================
// 8. WAREHOUSE & PROCUREMENT REPORTS (STOCK ITEM, STOCK CARD, PR, PO)
// =========================================================================

export async function fetchStockItemsReportApi(params?: Record<string, any>): Promise<WarehouseStockRecord[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/reports/stock-item", params);
  if (!Array.isArray(res?.data)) return [];
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    number: Number(r.number || idx + 1),
    materialCode: r.materialCode || r.item_code || "-",
    externalCode: r.externalCode || r.external_code || "-",
    materialItem: r.materialItem || r.item_name || "-",
    classification: r.classification || "-",
    facility: r.facility || "FASILITAS",
    coordinate: r.coordinate || "-",
    locationType: (r.locationType === "Production Area" ? "Production Area" : "Warehouse") as WarehouseStockRecord["locationType"],
    warehouseName: r.warehouseName || r.warehouse || "-",
    quantity: Number(r.quantity ?? 0),
    unit: r.unit || "-",
    stockStatus: (Number(r.quantity ?? 0) > 0 ? "Available" : "Not Available") as WarehouseStockRecord["stockStatus"],
    date: r.date || "-",
    lotNumber: r.lotNumber || r.lot_number || "-",
    zone: r.zone || "-",
    rack: r.rack || "-",
    bin: r.bin || "-",
    allocatedQty: Number(r.allocatedQty ?? 0),
    availableQty: Number(r.availableQty ?? r.quantity ?? 0),
    lastMovementDate: r.lastMovementDate || r.date || "-",
    remark: r.remark || "-",
  }));
}

export async function fetchStockCardReportApi(params?: Record<string, any>): Promise<{
  data: StockCardRecord[];
  items?: any[];
  warehouses?: string[];
  units?: string[];
}> {
  const res = await apiGet<{ data: any[]; items?: any[]; warehouses?: string[]; units?: string[] }>("/api/warehouse/reports/stock-card", params);
  const rows: StockCardRecord[] = Array.isArray(res?.data)
    ? res.data.map((r: any, idx: number) => ({
        id: String(r.id || idx + 1),
        no: Number(r.no || idx + 1),
        itemCode: r.itemCode || r.item_code || "-",
        itemName: r.itemName || r.item_name || "-",
        unitCode: r.unitCode || r.unit || "-",
        warehouse: r.warehouse || "-",
        date: r.date || "-",
        ref: r.ref || "-",
        description: r.description || "-",
        in: r.in !== null && r.in !== undefined ? Number(r.in) : null,
        out: r.out !== null && r.out !== undefined ? Number(r.out) : null,
        stock: Number(r.stock ?? 0),
        historyDocIn: r.historyDocIn || "-",
        docOutRef: r.docOutRef || "-",
        noLot: r.noLot || "-",
        jobNumber: r.jobNumber || "-",
        lastUpdate: r.lastUpdate || "-",
      }))
    : [];
  return {
    data: rows,
    items: res?.items,
    warehouses: res?.warehouses,
    units: res?.units,
  };
}

export async function fetchPrReportApi(params?: Record<string, any>): Promise<PrReportRecord[]> {
  const res = await apiGet<{ data?: any[]; rows?: any[] }>("/api/reporting/pr-report", params);
  const list = res?.data || res?.rows || [];
  if (!Array.isArray(list)) return [];
  return list.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    prNumber: r.prNumber || r.pr_number || r.code || "-",
    prDate: r.prDate || r.pr_date || r.date || "-",
    prDateRaw: r.prDateRaw || r.pr_date_raw || r.date || "",
    dateRequired: r.dateRequired || r.date_required || r.dueDate || "-",
    dateRequiredRaw: r.dateRequiredRaw || r.date_required_raw || r.dueDate || "",
    facilityType: r.facilityType || r.facility || "FASILITAS",
    itemCode: r.itemCode || r.item_code || r.items?.[0]?.itemCode || "-",
    itemName: r.itemName || r.item_name || r.items?.[0]?.itemName || "-",
    unitCode: r.unitCode || r.unit || r.items?.[0]?.unit || "-",
    qtyRequest: Number(r.qtyRequest ?? r.qty_request ?? r.totalQuantity ?? r.qty ?? 0),
    qtyPurchase: Number(r.qtyPurchase ?? r.qty_purchase ?? 0),
    qtyRemain: Number(r.qtyRemain ?? r.qty_remain ?? 0),
    status: (r.status === "Completed" || r.status === "Ordered" ? "Completed" : "Outstanding") as PrReportRecord["status"],
    approvalDate1: r.approvalDate1 || r.approval1_at || "-",
    approvalDate2: r.approvalDate2 || r.approval2_at || "-",
    approvalStatus: (["Ready", "Approve 1", "Approve 2", "Closed"].includes(r.approvalStatus)
      ? r.approvalStatus
      : "Approve 2") as PrReportRecord["approvalStatus"],
    lastUpdatedBy: r.lastUpdatedBy || r.createdBy || r.created_by || "-",
    lastUpdatedAt: r.lastUpdatedAt || r.updated_at || r.date || "-",
    deptRequest: r.deptRequest || r.department || "-",
    section: r.section || "-",
    poDetails: Array.isArray(r.poDetails) ? r.poDetails : [],
  }));
}

export async function fetchPoReportApi(params?: Record<string, any>): Promise<PoReportRecord[]> {
  const res = await apiGet<{ data?: any[]; rows?: any[] }>("/api/reporting/po-report", params);
  const list = res?.data || res?.rows || [];
  if (!Array.isArray(list)) return [];
  return list.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    poNumber: r.poNumber || r.po_number || r.code || "-",
    purchaseDate: r.purchaseDate || r.purchase_date || r.date || "-",
    purchaseDateRaw: r.purchaseDateRaw || r.purchase_date_raw || r.date || "",
    supplier: r.supplier || r.supplier_name || "-",
    discount: Number(r.discount ?? 0),
    vat: Number(r.vat ?? r.ppn ?? r.ppn_amount ?? 0),
    subtotal: Number(r.subtotal ?? r.grandTotal ?? r.grand_total ?? 0),
    description: r.description || r.note || "-",
    poStatus: (["Approved", "Ready", "Draft", "Closed"].includes(r.poStatus || r.status)
      ? (r.poStatus || r.status)
      : "Approved") as PoReportRecord["poStatus"],
    receivingStatus: (r.receivingStatus === "Complete" ? "Complete" : "Outstanding") as PoReportRecord["receivingStatus"],
    facilityType: (/non/i.test(String(r.facilityType || r.facility || "")) ? "NON FASILITAS" : "FASILITAS") as PoReportRecord["facilityType"],
    createdBy: r.createdBy || r.created_by || "-",
    createdAt: r.createdAt || r.created_at || r.date || "-",
    items: Array.isArray(r.items) ? r.items : [],
  }));
}

// =========================================================================
// 9. ADMIN AUDIT LOGS & USER PROFILE
// =========================================================================

export async function fetchAuditLogsApi(params?: Record<string, any>): Promise<{ data: any[]; meta?: any }> {
  const res = await apiGet<{ data: any[]; meta?: any }>("/api/admin/audit-logs", params);
  return { data: res?.data ?? [], meta: res?.meta };
}

export async function fetchApprovalHistoriesApi(params?: Record<string, any>): Promise<{ data: any[]; meta?: any }> {
  const res = await apiGet<{ data: any[]; meta?: any }>("/api/admin/approval-histories", params);
  return { data: res?.data ?? [], meta: res?.meta };
}

export async function fetchUserProfileApi(): Promise<any> {
  const res = await apiGet<{ data: any }>("/api/user/profile");
  return res?.data ?? null;
}

export async function updateUserProfileApi(payload: Record<string, any>): Promise<any> {
  const res = await apiPut<{ data: any }>("/api/user/profile", payload);
  return res?.data ?? null;
}
