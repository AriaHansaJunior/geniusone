import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import {
  fetchMasterItems,
  fetchMasterLookupsApi,
  importStockAdjustmentsApi,
} from "../../../../data/masterApi";

interface AdjustmentStockImportProps {
  onBack: () => void;
  onImported: (adjustmentNumber?: string) => void;
}

interface ParsedPreviewRow {
  rowNum: number;
  item_code: string;
  warehouse: string;
  adjustment_type: string;
  quantity: number | string;
  lot_number: string;
  coordinate: string;
  remark: string;
  resolvedItemName: string;
  resolvedWarehouseName: string;
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

  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>("");
  const [adjustmentDate, setAdjustmentDate] = useState(getTodayIso());
  const [referenceCode, setReferenceCode] = useState("");
  const [note, setNote] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawExcelRows, setRawExcelRows] = useState<Record<string, any>[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
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
        const whList = Array.isArray(lookups?.warehouses)
          ? lookups.warehouses.map((w: any) => ({
              id: Number(w.id),
              code: w.code || "",
              name: String(w.name),
            }))
          : [];
        setWarehouses(whList);

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

      let rowErr: string | null = null;
      if (!itemCode) {
        rowErr = "Missing Item Code";
      } else if (masterItems.length > 0 && !matchedItem) {
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
        warehouse: whInput || defaultWhObj?.name || "",
        adjustment_type: resolvedType,
        quantity: Number.isNaN(qtyNum) ? qtyStr : qtyNum,
        lot_number: lotNumber,
        coordinate,
        remark,
        resolvedItemName: matchedItem?.name || "",
        resolvedWarehouseName: matchedWh?.name || "",
        validationError: rowErr,
      };
    });
  }, [rawExcelRows, masterItems, warehouses, defaultWarehouseId]);

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

  const handleExportTemplateExcel = () => {
    try {
      const sampleItems = masterItems.slice(0, 2);
      const sampleWh = warehouses[0]?.name || "Gudang Utama";
      const templateData = [
        ["Item Code", "Warehouse", "Type", "Quantity", "Lot Number", "Coordinate", "Remark"],
        [
          sampleItems[0]?.code || "50.112.100.001",
          sampleWh,
          "IN",
          100,
          "LOT-2026-001",
          "A-01",
          "Initial stock injection",
        ],
        [
          sampleItems[1]?.code || "50.112.100.002",
          sampleWh,
          "SET",
          50,
          "LOT-2026-002",
          "B-02",
          "Set exact warehouse balance",
        ],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Adjustment_Stock");
      XLSX.writeFile(workbook, "Template_Adjustment_Stock.xlsx");
      setInfoMsg("Downloaded Excel template: Template_Adjustment_Stock.xlsx");
      setErrorMsg(null);
    } catch {
      setErrorMsg("Failed to generate Excel template.");
    }
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
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          setErrorMsg("The uploaded Excel workbook contains no sheets.");
          return;
        }
        const sheet = workbook.Sheets[firstSheet];
        const parsed = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
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
        rows: previewRows.map((r) => ({
          item_code: r.item_code,
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
          <Button type="button" variant="excel" onClick={handleExportTemplateExcel}>
            Export Template Excel
          </Button>
        </div>

        <div className="adj-steps">
          <div className="adj-step-item">
            <span className="adj-step-num">1</span>
            <span>
              Download <strong>Export Template Excel</strong> containing Item Code, Warehouse, Type (IN, OUT, or SET), Quantity, Lot Number, Coordinate, and Remark.
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
