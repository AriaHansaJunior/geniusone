import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadXlsxModule } from "../../../../utils/xlsxExport";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import { apiFetch, apiPost, clearApiCache } from "../../../../data/api";
import {
  fetchMasterItems,
  fetchMasterLookupsApi,
  importStockAdjustmentsApi,
} from "../../../../data/masterApi";

interface AdjustmentStockImportProps {
  onBack: () => void;
  onImported: (adjustmentNumber?: string) => void;
}

interface LookupOption {
  value: string;
  label: string;
}

interface ParsedPreviewRow {
  rowNum: number;
  item_code: string;
  item_name: string;
  warehouse: string;
  adjustment_type: string;
  quantity: number | string;
  lot_number: string;
  coordinate: string;
  remark: string;
  resolvedItemName: string;
  resolvedWarehouseName: string;
  isNewMasterItem: boolean;
  validationError: string | null;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCellKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readNormalizedField(obj: Record<string, any>, aliases: string[]): string {
  for (const key of Object.keys(obj)) {
    const norm = normalizeCellKey(key);
    if (aliases.includes(norm)) {
      return String(obj[key] ?? "").trim();
    }
  }
  return "";
}

export function AdjustmentStockImport({ onBack, onImported }: AdjustmentStockImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [warehouses, setWarehouses] = useState<{ id: number; code?: string; name: string }[]>([]);
  const [masterItems, setMasterItems] = useState<{ id: number; code: string; externalCode: string; name: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<LookupOption[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<LookupOption[]>([]);
  const [facilityOptions, setFacilityOptions] = useState<LookupOption[]>([]);
  const [warehouseTypeOptions, setWarehouseTypeOptions] = useState<LookupOption[]>([]);

  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>("");
  const [adjustmentDate, setAdjustmentDate] = useState(getTodayIso());
  const [referenceCode, setReferenceCode] = useState("");
  const [note, setNote] = useState("");
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);

  const [showQuickMaster, setShowQuickMaster] = useState(false);
  const [quickTab, setQuickTab] = useState<"item" | "warehouse">("item");
  const [quickItemCode, setQuickItemCode] = useState("");
  const [quickItemName, setQuickItemName] = useState("");
  const [quickItemUnitId, setQuickItemUnitId] = useState("");
  const [quickItemClassId, setQuickItemClassId] = useState("");
  const [quickItemFacilityId, setQuickItemFacilityId] = useState("");
  const [quickWhCode, setQuickWhCode] = useState("");
  const [quickWhName, setQuickWhName] = useState("");
  const [quickWhTypeId, setQuickWhTypeId] = useState("");
  const [isSavingQuickMaster, setIsSavingQuickMaster] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, any>[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchMasterLookupsApi(), fetchMasterItems().catch(() => [])]).then(
      ([lookups, itemsData]) => {
        if (cancelled) return;
        const mapOptions = (rows: any[]): LookupOption[] =>
          Array.isArray(rows)
            ? rows.map((row: any) => ({
                value: String(row.id),
                label: row.code ? `${row.code} - ${row.name}` : String(row.name),
              }))
            : [];

        const whList = Array.isArray(lookups?.warehouses)
          ? lookups.warehouses.map((w: any) => ({
              id: Number(w.id),
              code: w.code || "",
              name: String(w.name),
            }))
          : [];
        setWarehouses(whList);

        const uOpts = mapOptions(lookups?.units_of_measurements);
        const cOpts = mapOptions(lookups?.classifications);
        const fOpts = mapOptions(lookups?.facilities);
        const wtOpts = mapOptions(lookups?.warehouse_types);
        setUnitOptions(uOpts);
        setClassificationOptions(cOpts);
        setFacilityOptions(fOpts);
        setWarehouseTypeOptions(wtOpts);
        if (uOpts[0]) setQuickItemUnitId((prev) => prev || uOpts[0].value);
        if (cOpts[0]) setQuickItemClassId((prev) => prev || cOpts[0].value);
        if (fOpts[0]) setQuickItemFacilityId((prev) => prev || fOpts[0].value);
        if (wtOpts[0]) setQuickWhTypeId((prev) => prev || wtOpts[0].value);

        const mItems = Array.isArray(itemsData)
          ? itemsData.map((m) => ({
              id: Number(m.id),
              code: m.itemCode || "",
              externalCode: m.kodeEksternal || "",
              name: m.itemName || "",
            }))
          : [];
        setMasterItems(mItems);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const previewRows = useMemo<ParsedPreviewRow[]>(() => {
    const defaultWhObj = defaultWarehouseId
      ? warehouses.find((w) => String(w.id) === defaultWarehouseId)
      : undefined;

    return rawExcelRows.map((raw, idx) => {
      const itemCode = readNormalizedField(raw, ["item_code", "kode_item", "kode_barang", "code", "item"]);
      const itemName = readNormalizedField(raw, ["item_name", "nama_item", "nama_barang", "name"]);
      const whInput = readNormalizedField(raw, ["warehouse", "warehouse_code", "warehouse_name", "gudang"]);
      const rawType = readNormalizedField(raw, ["adjustment_type", "type", "direction", "jenis"]).toUpperCase();
      const qtyStr = readNormalizedField(raw, ["quantity", "qty", "jumlah", "stock"]);
      const lotNumber = readNormalizedField(raw, ["lot_number", "no_lot", "lot"]);
      const coordinate = readNormalizedField(raw, ["coordinate", "coordinate_name", "lokasi"]);
      const remark = readNormalizedField(raw, ["remark", "notes", "note", "keterangan"]);

      const matchedItem = masterItems.find(
        (m) =>
          (itemCode && m.code.toLowerCase() === itemCode.toLowerCase()) ||
          (itemCode && m.externalCode && m.externalCode.toLowerCase() === itemCode.toLowerCase()) ||
          (itemCode && m.name.toLowerCase() === itemCode.toLowerCase())
      );

      const matchedWh = whInput
        ? warehouses.find(
            (w) =>
              (w.code && w.code.toLowerCase() === whInput.toLowerCase()) ||
              w.name.toLowerCase() === whInput.toLowerCase()
          )
        : defaultWhObj;

      const qtyNum = qtyStr === "" ? NaN : Number(qtyStr);
      let resolvedType = rawType || "IN";
      if (!rawType && !Number.isNaN(qtyNum) && qtyNum < 0) {
        resolvedType = "OUT";
      }

      const isNewMasterItem = Boolean(itemCode && !matchedItem && autoCreateMissing);

      let rowErr: string | null = null;
      if (!itemCode) {
        rowErr = "Missing Item Code";
      } else if (masterItems.length > 0 && !matchedItem && !autoCreateMissing) {
        rowErr = `Unknown Item '${itemCode}'`;
      } else if (!matchedWh) {
        rowErr = whInput ? `Unknown Warehouse '${whInput}'` : "Warehouse required";
      } else if (!["IN", "OUT", "SET", "ADD", "SUB", "MASUK", "KELUAR", "EXACT", "OPNAME"].includes(resolvedType)) {
        rowErr = `Invalid Type '${resolvedType}'`;
      } else if (Number.isNaN(qtyNum) || (resolvedType === "SET" ? qtyNum < 0 : qtyNum <= 0)) {
        rowErr = "Invalid Quantity";
      }

      return {
        rowNum: idx + 1,
        item_code: itemCode,
        item_name: itemName,
        warehouse: whInput || defaultWhObj?.name || "",
        adjustment_type: resolvedType,
        quantity: Number.isNaN(qtyNum) ? qtyStr : qtyNum,
        lot_number: lotNumber,
        coordinate,
        remark,
        resolvedItemName: matchedItem?.name || itemName || (isNewMasterItem ? itemCode : ""),
        resolvedWarehouseName: matchedWh?.name || "",
        isNewMasterItem,
        validationError: rowErr,
      };
    });
  }, [rawExcelRows, masterItems, warehouses, defaultWarehouseId, autoCreateMissing]);

  const invalidCount = useMemo(
    () => previewRows.filter((r) => Boolean(r.validationError)).length,
    [previewRows]
  );

  const totalPages = Math.max(1, Math.ceil(previewRows.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedPreview = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return previewRows.slice(start, start + pageSize);
  }, [previewRows, safeCurrentPage, pageSize]);

  const handleExportTemplateExcel = async () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch("/api/warehouse/adjustment-stock/template", {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to download template from server.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Template_Adjustment_Stock.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setInfoMsg("Downloaded Excel template with Master_Data dropdowns: Template_Adjustment_Stock.xlsx");
    } catch {
      setErrorMsg("Failed to download Excel template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const isPopulatedSpreadsheetRow = (obj: Record<string, any>): boolean => {
    const candidateValues = [
      readNormalizedField(obj, ["item_code", "kode_item", "kode_barang", "code", "item"]),
      readNormalizedField(obj, ["warehouse", "warehouse_code", "warehouse_name", "gudang"]),
      readNormalizedField(obj, ["adjustment_type", "type", "direction", "jenis"]),
      readNormalizedField(obj, ["quantity", "qty", "jumlah", "stock"]),
      readNormalizedField(obj, ["lot_number", "no_lot", "lot"]),
      readNormalizedField(obj, ["coordinate", "coordinate_name", "lokasi"]),
      readNormalizedField(obj, ["remark", "notes", "note", "keterangan"]),
    ];
    return candidateValues.some((val) => val !== "");
  };

  const parseSpreadsheetFile = (file: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    if (!validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setErrorMsg("Please select a valid Excel file (.xlsx, .xls) or CSV file.");
      setSelectedFile(null);
      setRawExcelRows([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await loadXlsxModule();
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const targetSheetName =
          workbook.SheetNames.find((n) => n === "Adjustment_Stock") || workbook.SheetNames[0];
        if (!targetSheetName) {
          setErrorMsg("The uploaded Excel workbook contains no sheets.");
          return;
        }
        const sheet = workbook.Sheets[targetSheetName];
        const rawParsed = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
        const parsed = rawParsed.filter(isPopulatedSpreadsheetRow);
        if (parsed.length === 0) {
          setErrorMsg("No data rows found in the uploaded file.");
          setRawExcelRows([]);
          return;
        }
        setSelectedFile(file);
        setRawExcelRows(parsed);
        setCurrentPage(1);
        setErrorMsg(null);
        setInfoMsg(`Loaded ${parsed.length} row(s) from ${file.name}. Review preview below and click Save.`);
      } catch {
        setErrorMsg("Unable to parse the selected Excel/CSV file.");
        setSelectedFile(null);
        setRawExcelRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveQuickItem = async () => {
    const trimmedName = quickItemName.trim();
    if (!trimmedName) {
      setErrorMsg("Item Name is required for Quick Add Master Item.");
      return;
    }
    if (!quickItemUnitId || !quickItemClassId || !quickItemFacilityId) {
      setErrorMsg("Unit, Classification, and Facility must be selected.");
      return;
    }
    setIsSavingQuickMaster(true);
    setErrorMsg(null);
    try {
      const res = await apiPost<{ data?: any }>("/api/exim/master/items", {
        code: quickItemCode.trim() || undefined,
        name: trimmedName,
        units_of_measurements_id: Number(quickItemUnitId),
        classifications_id: Number(quickItemClassId),
        facilities_id: Number(quickItemFacilityId),
        status: 1,
        stock: 0,
      });
      clearApiCache();
      const created = res?.data;
      if (created?.id) {
        setMasterItems((prev) => [
          ...prev,
          {
            id: Number(created.id),
            code: String(created.code || quickItemCode.trim()),
            externalCode: String(created.external_code || ""),
            name: String(created.name || trimmedName),
          },
        ]);
      }
      setInfoMsg(
        `Added Master Item '${created?.code || quickItemCode.trim()} - ${created?.name || trimmedName}'. Export Template Excel again if you want it in the dropdown.`
      );
      setQuickItemCode("");
      setQuickItemName("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create Master Item.");
    } finally {
      setIsSavingQuickMaster(false);
    }
  };

  const handleSaveQuickWarehouse = async () => {
    const trimmedName = quickWhName.trim();
    if (!trimmedName) {
      setErrorMsg("Warehouse Name is required for Quick Add Warehouse.");
      return;
    }
    if (!quickWhTypeId) {
      setErrorMsg("Warehouse Type must be selected.");
      return;
    }
    setIsSavingQuickMaster(true);
    setErrorMsg(null);
    try {
      const res = await apiPost<{ data?: any }>("/api/warehouse/master/warehouses", {
        code: quickWhCode.trim() || undefined,
        name: trimmedName,
        warehouse_types_id: Number(quickWhTypeId),
        status: 1,
      });
      clearApiCache();
      const created = res?.data;
      if (created?.id) {
        setWarehouses((prev) => [
          ...prev,
          {
            id: Number(created.id),
            code: created.code ? String(created.code) : "",
            name: String(created.name || trimmedName),
          },
        ]);
      }
      setInfoMsg(
        `Added Master Warehouse '${created?.name || trimmedName}'. Export Template Excel again if you want it in the dropdown.`
      );
      setQuickWhCode("");
      setQuickWhName("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create Master Warehouse.");
    } finally {
      setIsSavingQuickMaster(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedFile || previewRows.length === 0) {
      setErrorMsg("Please upload a valid Excel or CSV file first.");
      return;
    }
    if (invalidCount > 0) {
      setErrorMsg(`Please fix ${invalidCount} invalid row(s) highlighted in red before importing.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await importStockAdjustmentsApi({
        default_warehouse_id: defaultWarehouseId ? Number(defaultWarehouseId) : null,
        adjustment_date: adjustmentDate,
        reference_code: referenceCode.trim() || null,
        note: note.trim() || null,
        auto_create_missing_items: autoCreateMissing,
        rows: previewRows.map((r) => ({
          item_code: r.item_code,
          item_name: r.item_name || r.resolvedItemName || undefined,
          warehouse: r.warehouse || r.resolvedWarehouseName,
          adjustment_type: r.adjustment_type,
          quantity: Number(r.quantity),
          lot_number: r.lot_number,
          coordinate: r.coordinate,
          remark: r.remark,
        })),
      });
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      onImported(res.data?.adjustmentNumber);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to import stock adjustment rows.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="adj-import-page">
      {infoMsg && (
        <div className="adj-notice adj-notice--info">
          <span>{infoMsg}</span>
          <button
            type="button"
            className="adj-notice__close"
            onClick={() => setInfoMsg(null)}
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="adj-notice adj-notice--error">
          <span>{errorMsg}</span>
          <button
            type="button"
            className="adj-notice__close"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <div className="adj-card">
        <div className="adj-card-header">
          <h3 className="adj-card-title">Inject Stock via Excel Import</h3>
          <div className="adj-card-header__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowQuickMaster((prev) => !prev)}
            >
              {showQuickMaster ? "Close Quick Master" : "Quick Add Master"}
            </Button>
            <Button
              type="button"
              variant="excel"
              onClick={handleExportTemplateExcel}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? "Generating Template..." : "Export Template Excel"}
            </Button>
          </div>
        </div>

        {showQuickMaster && (
          <div className="adj-quick-master">
            <div className="adj-quick-master__head">
              <h4 className="adj-quick-master__title">Quick Add Master Data</h4>
              <div className="adj-quick-tabs" role="tablist" aria-label="Quick master entity selector">
                <button
                  type="button"
                  role="tab"
                  aria-selected={quickTab === "item"}
                  className={`adj-quick-tab ${quickTab === "item" ? "is-active" : ""}`}
                  onClick={() => setQuickTab("item")}
                >
                  Master Item
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={quickTab === "warehouse"}
                  className={`adj-quick-tab ${quickTab === "warehouse" ? "is-active" : ""}`}
                  onClick={() => setQuickTab("warehouse")}
                >
                  Warehouse
                </button>
              </div>
            </div>

            {quickTab === "item" ? (
              <>
                <div className="adj-form-grid-4">
                  <div className="master-form-group">
                    <label htmlFor="quickItemCode" className="master-form-label">
                      Item Code (Auto if blank)
                    </label>
                    <input
                      id="quickItemCode"
                      type="text"
                      className="master-form-input"
                      value={quickItemCode}
                      onChange={(e) => setQuickItemCode(e.target.value)}
                      placeholder="e.g. ITM-NEW-001"
                    />
                  </div>
                  <div className="master-form-group">
                    <label htmlFor="quickItemName" className="master-form-label">
                      Item Name <span className="master-required-star">*</span>
                    </label>
                    <input
                      id="quickItemName"
                      type="text"
                      className="master-form-input"
                      value={quickItemName}
                      onChange={(e) => setQuickItemName(e.target.value)}
                      placeholder="e.g. Carton Box 40x30"
                    />
                  </div>
                  <div className="master-form-group">
                    <label className="master-form-label">
                      Unit <span className="master-required-star">*</span>
                    </label>
                    <CustomSelect
                      searchable
                      value={quickItemUnitId}
                      onChange={setQuickItemUnitId}
                      options={unitOptions}
                    />
                  </div>
                  <div className="master-form-group">
                    <label className="master-form-label">
                      Classification <span className="master-required-star">*</span>
                    </label>
                    <CustomSelect
                      searchable
                      value={quickItemClassId}
                      onChange={setQuickItemClassId}
                      options={classificationOptions}
                    />
                  </div>
                </div>
                <div className="adj-form-grid-3">
                  <div className="master-form-group">
                    <label className="master-form-label">
                      Facility <span className="master-required-star">*</span>
                    </label>
                    <CustomSelect
                      searchable
                      value={quickItemFacilityId}
                      onChange={setQuickItemFacilityId}
                      options={facilityOptions}
                    />
                  </div>
                </div>
                <div className="adj-quick-master__actions">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveQuickItem}
                    disabled={isSavingQuickMaster}
                  >
                    {isSavingQuickMaster ? "Saving Item..." : "Add Master Item"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="adj-form-grid-3">
                  <div className="master-form-group">
                    <label htmlFor="quickWhCode" className="master-form-label">
                      Warehouse Code
                    </label>
                    <input
                      id="quickWhCode"
                      type="text"
                      className="master-form-input"
                      value={quickWhCode}
                      onChange={(e) => setQuickWhCode(e.target.value)}
                      placeholder="e.g. WH-NEW"
                    />
                  </div>
                  <div className="master-form-group">
                    <label htmlFor="quickWhName" className="master-form-label">
                      Warehouse Name <span className="master-required-star">*</span>
                    </label>
                    <input
                      id="quickWhName"
                      type="text"
                      className="master-form-input"
                      value={quickWhName}
                      onChange={(e) => setQuickWhName(e.target.value)}
                      placeholder="e.g. Gudang Produksi 2"
                    />
                  </div>
                  <div className="master-form-group">
                    <label className="master-form-label">
                      Warehouse Type <span className="master-required-star">*</span>
                    </label>
                    <CustomSelect
                      searchable
                      value={quickWhTypeId}
                      onChange={setQuickWhTypeId}
                      options={warehouseTypeOptions}
                    />
                  </div>
                </div>
                <div className="adj-quick-master__actions">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSaveQuickWarehouse}
                    disabled={isSavingQuickMaster}
                  >
                    {isSavingQuickMaster ? "Saving Warehouse..." : "Add Master Warehouse"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="adj-steps">
          <div className="adj-step-item">
            <span className="adj-step-num">1</span>
            <span>
              Download <strong>Export Template Excel</strong> with dropdowns in <strong>Adjustment_Stock</strong> — or type a brand-new <strong>Item Code</strong> &amp; <strong>Item Name</strong> directly on Sheet 1 without touching <strong>Master_Data</strong>, or click <strong>Quick Add Master</strong>.
            </span>
          </div>
          <div className="adj-step-item">
            <span className="adj-step-num">2</span>
            <span>
              Upload your <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file and verify the live row validation preview below.
            </span>
          </div>
          <div className="adj-step-item">
            <span className="adj-step-num">3</span>
            <span>
              Click <strong>Save</strong> to inject quantities directly into warehouse stock balances and record IN/OUT movements in Stock Card.
            </span>
          </div>
        </div>

        <div className="adj-form-grid-3">
          <div className="master-form-group">
            <label className="master-form-label">
              Adjustment Date <span className="master-required-star">*</span>
            </label>
            <CustomDatePicker
              required
              value={adjustmentDate}
              onChange={(val) => setAdjustmentDate(val)}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Default Warehouse (Optional Fallback)</label>
            <CustomSelect
              searchable
              value={defaultWarehouseId}
              onChange={(val) => setDefaultWarehouseId(val)}
              options={[
                { value: "", label: "-- Use Warehouse column in Excel --" },
                ...warehouses.map((w) => ({
                  value: String(w.id),
                  label: w.code ? `${w.code} - ${w.name}` : w.name,
                })),
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="adjImportRef" className="master-form-label">
              Batch Reference Code
            </label>
            <input
              id="adjImportRef"
              type="text"
              className="master-form-input"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. INJECT-NOV-2026"
            />
          </div>
        </div>

        <div className="master-form-group">
          <label htmlFor="adjImportNote" className="master-form-label">
            Batch Note
          </label>
          <input
            id="adjImportNote"
            type="text"
            className="master-form-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional description for this Excel stock injection..."
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="master-hidden-input"
          onChange={(e) => {
            if (e.target.files?.[0]) parseSpreadsheetFile(e.target.files[0]);
          }}
        />

        <label className="adj-auto-create-row">
          <input
            type="checkbox"
            checked={autoCreateMissing}
            onChange={(e) => setAutoCreateMissing(e.target.checked)}
          />
          <span>
            Auto-create missing Master Items typed directly in <strong>Adjustment_Stock</strong> (Item Code + Item Name) on import
          </span>
        </label>

        <div
          className={`adj-dropzone ${isDragOver ? "drag-over" : ""} ${selectedFile ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files?.[0]) parseSpreadsheetFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {selectedFile ? (
            <div className="adj-selected-file">
              <div className="adj-selected-file__info">
                <Icon name="file" size={22} />
                <div>
                  <span className="adj-selected-file__name">{selectedFile.name}</span>
                  <span className="adj-selected-file__meta">
                    {(selectedFile.size / 1024).toFixed(1)} KB &middot; {previewRows.length} row(s) parsed
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setRawExcelRows([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="adj-dropzone-prompt">
              <span className="adj-dropzone-icon">
                <Icon name="upload" size={28} />
              </span>
              <strong>Click to browse or drag and drop Excel file here</strong>
              <span className="adj-dropzone-hint">
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Table */}
      {previewRows.length > 0 && (
        <div className="adj-table-panel">
          <div className="adj-table-panel__header">
            <h4 className="adj-table-panel__title">Import Preview ({previewRows.length} Rows)</h4>
            <div className="adj-preview-summary">
              <Badge tone="green">
                Valid: {previewRows.length - invalidCount}
              </Badge>
              {invalidCount > 0 && (
                <Badge tone="red">Invalid: {invalidCount}</Badge>
              )}
            </div>
          </div>

          <div className="adj-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="adj-th--center adj-col-no">No</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th className="adj-th--right">Quantity</th>
                  <th>Lot No</th>
                  <th>Coordinate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPreview.map((row) => (
                  <tr
                    key={row.rowNum}
                    className={row.validationError ? "adj-row-invalid" : undefined}
                  >
                    <td className="adj-td--center">{row.rowNum}</td>
                    <td>{row.item_code || "—"}</td>
                    <td>{row.resolvedItemName || "—"}</td>
                    <td>{row.resolvedWarehouseName || row.warehouse || "—"}</td>
                    <td>
                      <Badge
                        tone={
                          row.adjustment_type === "OUT"
                            ? "red"
                            : row.adjustment_type === "SET"
                              ? "purple"
                              : "green"
                        }
                      >
                        {row.adjustment_type}
                      </Badge>
                    </td>
                    <td className="adj-td--right">{String(row.quantity)}</td>
                    <td>{row.lot_number || "—"}</td>
                    <td>{row.coordinate || "—"}</td>
                    <td>
                      {row.validationError ? (
                        <Badge tone="red">{row.validationError}</Badge>
                      ) : row.isNewMasterItem ? (
                        <Badge tone="blue">New Master + Ready</Badge>
                      ) : (
                        <Badge tone="green">Ready</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="adj-footer-bar">
            <Pagination
              totalRecords={previewRows.length}
              currentPage={safeCurrentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      <div className="adj-form-footer">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || previewRows.length === 0 || invalidCount > 0}
        >
          {isSubmitting ? "Importing..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default AdjustmentStockImport;
