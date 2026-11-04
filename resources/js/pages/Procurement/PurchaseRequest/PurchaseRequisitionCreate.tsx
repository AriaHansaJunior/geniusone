import React, { useState, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ItemPickerModal } from "../../Exim/Master/Item/ItemPickerModal";
import { initialItemRecords } from "../../Exim/Master/Item/item-data";
import { initialJobNumberRecords } from "../PurchaseMaster/JobNumber/job-number-types";
import type { ItemRecord } from "../../Exim/Master/Item/item-types";
import { createPurchaseRequisition } from "../../../data/api";

export interface PRItemRow {
  id: string;
  jobNumber: string;
  itemCode?: string;
  itemName: string;
  unit: string;
  currentStock: number;
  quantity: number;
  dueDate: string;
  facility: "Fasilitas" | "Non Fasilitas";
  remark: string;
}

interface PurchaseRequisitionCreateProps {
  onBack: () => void;
  onSaveSuccess?: (newPR: any) => void;
  availableJobNumbers?: string[];
  availableItems?: ItemRecord[];
}

interface SearchableItemComboboxProps {
  value: string;
  hasError?: boolean;
  availableItems: ItemRecord[];
  onSelect: (item: ItemRecord) => void;
  onTextChange: (text: string) => void;
}

function SearchableItemCombobox({
  value,
  hasError,
  availableItems,
  onSelect,
  onTextChange,
}: SearchableItemComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableItems.slice(0, 35);
    return availableItems
      .filter((it) => {
        return (
          it.itemName.toLowerCase().includes(query) ||
          it.itemCode.toLowerCase().includes(query) ||
          (it.kodeEksternal && it.kodeEksternal.toLowerCase().includes(query)) ||
          (it.classification && it.classification.toLowerCase().includes(query)) ||
          (it.category && it.category.toLowerCase().includes(query))
        );
      })
      .slice(0, 35);
  }, [availableItems, searchQuery]);

  return (
    <div className="searchable-item-cell" ref={containerRef}>
      <div className="searchable-item-input-wrapper">
        <input
          type="text"
          className={`searchable-item-input ${hasError ? "has-error" : ""}`}
          placeholder="Select or search item..."
          value={isOpen ? searchQuery : value}
          onFocus={() => {
            setSearchQuery(value);
            setIsOpen(true);
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            onTextChange(val);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="searchable-item-toggle"
          onClick={() => {
            if (!isOpen) setSearchQuery(value);
            setIsOpen((prev) => !prev);
          }}
          tabIndex={-1}
          aria-label="Toggle items dropdown"
        >
          <Icon name="chevronDown" size={13} />
        </button>
      </div>

      {isOpen && (
        <div className="searchable-item-dropdown">
          <div className="searchable-item-dropdown-header">
            Master Items ({filteredItems.length} matching)
          </div>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div
                key={item.id || item.itemCode}
                className={`searchable-item-option ${item.itemName === value ? "is-selected" : ""}`}
                onClick={() => {
                  onSelect(item);
                  setIsOpen(false);
                }}
              >
                <div className="searchable-item-option-name">
                  <span>{item.itemName}</span>
                  <span className="searchable-item-badge">{item.smallestUnitCode}</span>
                </div>
                <div className="searchable-item-option-meta">
                  <span className="code-pill">{item.itemCode}</span>
                  <span>{item.classification}</span>
                  <span className="searchable-item-badge--stock">
                    Stock: {(item.stock || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="searchable-item-empty">
              No matching master items found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PurchaseRequisitionCreate({
  onBack,
  onSaveSuccess,
  availableJobNumbers,
  availableItems,
}: PurchaseRequisitionCreateProps) {
  const masterItems = availableItems && availableItems.length > 0 ? availableItems : initialItemRecords;
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Header State
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [deptRequest, setDeptRequest] = useState("");
  const [section, setSection] = useState("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [note, setNote] = useState("");

  // Items Grid State
  const [items, setItems] = useState<PRItemRow[]>([]);

  // UI Dialog States
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Close upload dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(e.target as Node)) {
        setIsUploadDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Available job numbers list
  const jobOptions = availableJobNumbers && availableJobNumbers.length > 0
    ? availableJobNumbers
    : initialJobNumberRecords.map((j) => j.jobNumber);

  // Download Excel Template for PR Items
  const handleDownloadExcelTemplate = () => {
    setIsUploadDropdownOpen(false);
    const headers = [
      "No",
      "Job Number",
      "Item Code",
      "Item Name",
      "Unit",
      "Quantity",
      "Due Date",
      "Fasilitas / Non Fasilitas",
      "Remark",
    ];

    const sampleRows = [
      [
        1,
        jobOptions[0] || "0112/JOB-IMLI/2026",
        masterItems[0]?.itemCode || "60.154.300.101",
        masterItems[0]?.itemName || 'Nozzle Jet Spray Spiral SUS 316 size ½" (Male thread)',
        masterItems[0]?.smallestUnitName || masterItems[0]?.smallestUnitCode || "PCE",
        10,
        dueDate || today,
        "Fasilitas",
        "Urgent line maintenance",
      ],
      [
        2,
        jobOptions[0] || "0112/JOB-IMLI/2026",
        masterItems[1]?.itemCode || "MAT-ST-001",
        masterItems[1]?.itemName || "Steel Plate Grade SS400 10mm",
        masterItems[1]?.smallestUnitName || masterItems[1]?.smallestUnitCode || "KG",
        500,
        dueDate || today,
        "Non Fasilitas",
        "Smelting furnace buffer stock",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 45 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 25 },
      { wch: 35 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PR Items Template");
    XLSX.writeFile(wb, "PR_Item_Upload_Template.xlsx");

    setNotification({
      type: "success",
      message: "Template Excel PR berhasil diunduh. Silakan lengkapi data dan unggah kembali.",
    });
  };

  // Upload and Automatically Parse Excel File for PR Items
  const handleUploadExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIsUploadDropdownOpen(false);
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          setNotification({
            type: "error",
            message: "File Excel yang diunggah tidak memiliki baris data.",
          });
          return;
        }

        const importedRows: PRItemRow[] = [];
        rawRows.forEach((row, idx) => {
          const getVal = (keys: string[]): string => {
            for (const k of keys) {
              const found = Object.keys(row).find(
                (rk) => rk.trim().toLowerCase() === k.toLowerCase()
              );
              if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim()) {
                return String(row[found]).trim();
              }
            }
            return "";
          };

          const code = getVal(["Item Code", "Kode Barang", "Code", "itemCode", "item_code"]);
          let name = getVal(["Item Name", "Nama Barang", "Name", "itemName", "item_name"]);
          const job = getVal(["Job Number", "Job No", "No Job", "jobNumber"]);
          let unit = getVal(["Unit", "Satuan", "UoM"]);
          const qtyStr = getVal(["Quantity", "Qty", "Jumlah", "quantity"]);
          let due = getVal(["Due Date", "Tanggal Dibutuhkan", "DueDate", "due_date"]) || dueDate || today;
          if (due && !isNaN(Number(due)) && Number(due) > 20000 && Number(due) < 70000) {
            try {
              const d = new Date(Math.round((Number(due) - 25569) * 86400 * 1000));
              if (!isNaN(d.getTime())) {
                due = d.toISOString().slice(0, 10);
              }
            } catch {
              // fallback
            }
          }
          const facStr = getVal(["Fasilitas / Non Fasilitas", "Fasilitas", "Facility", "facility"]);
          const rem = getVal(["Remark", "Keterangan", "Note", "Catatan", "remark"]);

          // Match against master items by code or name
          const matchedMaster = masterItems.find(
            (m) =>
              (code && m.itemCode.toLowerCase() === code.toLowerCase()) ||
              (name && m.itemName.toLowerCase() === name.toLowerCase())
          );

          if (!name && matchedMaster) {
            name = matchedMaster.itemName;
          }
          if (!unit && matchedMaster) {
            unit = matchedMaster.smallestUnitName || matchedMaster.smallestUnitCode || "PCE";
          }
          const currentStock = matchedMaster && typeof matchedMaster.stock === "number" ? matchedMaster.stock : 0;
          const facility: "Fasilitas" | "Non Fasilitas" = facStr.toLowerCase().includes("non")
            ? "Non Fasilitas"
            : facStr.toLowerCase().includes("fasilitas")
              ? "Fasilitas"
              : (matchedMaster?.facility === "FASILITAS" ? "Fasilitas" : "Non Fasilitas");

          if (name || code) {
            importedRows.push({
              id: `pr-item-import-${Date.now()}-${idx}`,
              jobNumber: job || jobOptions[0] || "",
              itemCode: code || matchedMaster?.itemCode || "",
              itemName: name || matchedMaster?.itemName || `Item ${idx + 1}`,
              unit: unit || "PCE",
              currentStock: currentStock,
              quantity: Number(qtyStr) > 0 ? Number(qtyStr) : 1,
              dueDate: due,
              facility: facility,
              remark: rem,
            });
          }
        });

        if (importedRows.length === 0) {
          setNotification({
            type: "error",
            message: "Tidak ada baris barang yang valid terbaca dari file Excel. Pastikan menggunakan format template.",
          });
          return;
        }

        setItems((prev) => [...prev, ...importedRows]);
        setNotification({
          type: "success",
          message: `Berhasil mengimpor ${importedRows.length} item dari file Excel secara otomatis!`,
        });
      } catch (err: any) {
        setNotification({
          type: "error",
          message: "Gagal membaca file Excel: " + (err?.message || "Format file tidak didukung"),
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // Add Empty Row
  const handleAddBlankRow = () => {
    const newRow: PRItemRow = {
      id: `pr-item-${Date.now()}`,
      jobNumber: "",
      itemName: "",
      unit: "PCE",
      currentStock: 0,
      quantity: 1,
      dueDate: dueDate || today,
      facility: "Non Fasilitas",
      remark: "",
    };
    setItems((prev) => [...prev, newRow]);
  };

  // Add Items from Master Item Picker
  const handleAddFromMasterPicker = (selectedMasterItems: ItemRecord[]) => {
    const newRows: PRItemRow[] = selectedMasterItems.map((masterItem) => ({
      id: `pr-item-${Date.now()}-${masterItem.id}`,
      jobNumber: "",
      itemCode: masterItem.itemCode,
      itemName: masterItem.itemName,
      unit: masterItem.smallestUnitName || masterItem.smallestUnitCode || "PCE",
      currentStock: typeof masterItem.stock === "number" ? masterItem.stock : 0,
      quantity: 1,
      dueDate: dueDate || today,
      facility: masterItem.facility === "FASILITAS" ? "Fasilitas" : "Non Fasilitas",
      remark: "",
    }));
    setItems((prev) => [...prev, ...newRows]);
    setIsItemPickerOpen(false);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  // Update Row Field
  const handleUpdateRow = (id: string, field: keyof PRItemRow, value: any) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Handle Attachment Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setNotification({
          type: "error",
          message: "Attachment exceeds maximum allowed size of 2MB.",
        });
        e.target.value = "";
        return;
      }
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const validExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"];
      if (!validExtensions.includes(ext)) {
        setNotification({
          type: "error",
          message: "Invalid file format. Allowed formats: PDF, DOC, XLS, JPG, PNG.",
        });
        e.target.value = "";
        return;
      }
      setAttachmentName(file.name);
    }
  };

  // Validation
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = "Date is required.";
    if (!dueDate) errors.dueDate = "Due Date is required.";
    if (!deptRequest) errors.deptRequest = "Department Request is required.";
    if (!section) errors.section = "Section is required.";

    if (items.length === 0) {
      errors.items = "At least one requisition item is required.";
    } else {
      items.forEach((item, index) => {
        if (!item.itemName.trim()) {
          errors[`item_${index}_name`] = `Row ${index + 1}: Item Name is required.`;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          errors[`item_${index}_qty`] = `Row ${index + 1}: Quantity must be greater than 0.`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save Click
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setNotification({
        type: "error",
        message: "Please correct the highlighted errors before submitting the requisition.",
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  // Confirm Submit
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        deptRequest,
        section,
        date,
        due_date: dueDate,
        items: items.map((it) => ({
          itemCode: it.itemCode,
          itemName: it.itemName,
          quantity: it.quantity,
          dueDate: it.dueDate,
          remark: it.remark || note || "Purchase Requisition Item",
        })),
      };

      const res = await createPurchaseRequisition(payload);
      setShowSaveConfirm(false);
      setIsSubmitting(false);

      if (onSaveSuccess) {
        onSaveSuccess(res?.data);
      } else {
        onBack();
      }
    } catch (err: any) {
      console.error("Failed to submit PR to backend:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to create Purchase Requisition. Please try again.",
      });
      setIsSubmitting(false);
      setShowSaveConfirm(false);
      return;
    }
  };

  return (
    <div className="transaction-create-page">
      {/* Top Header */}
      <div className="tx-page-header">
        <h1 className="tx-page-title">Add Purchase Requisition</h1>
      </div>

      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background: notification.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${notification.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: "var(--radius-sm)",
            color: notification.type === "error" ? "#b91c1c" : "#15803d",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={notification.type === "error" ? "alertTriangle" : "check"}
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              color: "inherit",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSaveClick}>
          {/* Header 5-column layout */}
            <div className="tx-header-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {/* 1. Date */}
              <div className="master-form-group">
                <label htmlFor="prDate" className="master-form-label">
                  Date <span className="required-asterisk">*</span>
                </label>
                <input
                  id="prDate"
                  type="date"
                  className={`master-form-input ${formErrors.date ? "has-error" : ""}`}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: "" }));
                  }}
                />
                {formErrors.date && <span className="master-form-error">{formErrors.date}</span>}
              </div>

              {/* 2. Due Date */}
              <div className="master-form-group">
                <label htmlFor="prDueDate" className="master-form-label">
                  Due Date <span className="required-asterisk">*</span>
                </label>
                <input
                  id="prDueDate"
                  type="date"
                  className={`master-form-input ${formErrors.dueDate ? "has-error" : ""}`}
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (formErrors.dueDate) setFormErrors((prev) => ({ ...prev, dueDate: "" }));
                  }}
                />
                {formErrors.dueDate && <span className="master-form-error">{formErrors.dueDate}</span>}
              </div>

              {/* 3. Dept. Request */}
              <div className="master-form-group">
                <label htmlFor="prDept" className="master-form-label">
                  Dept. Request <span className="required-asterisk">*</span>
                </label>
                <select
                  id="prDept"
                  className={`master-form-select ${formErrors.deptRequest ? "has-error" : ""}`}
                  value={deptRequest}
                  onChange={(e) => {
                    setDeptRequest(e.target.value);
                    if (formErrors.deptRequest) setFormErrors((prev) => ({ ...prev, deptRequest: "" }));
                  }}
                >
                  <option value="">Select Data . . .</option>
                  <option value="REVERB">REVERB</option>
                  <option value="SMELTING">SMELTING</option>
                  <option value="REFINING">REFINING</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="LOGISTICS">LOGISTICS</option>
                  <option value="LABORATORY">LABORATORY</option>
                  <option value="PROCUREMENT">PROCUREMENT</option>
                  <option value="HSE">HSE</option>
                  <option value="TEKNIK">TEKNIK</option>
                  <option value="PPIC">PPIC</option>
                  <option value="HRD">HRD</option>
                </select>
                {formErrors.deptRequest && <span className="master-form-error">{formErrors.deptRequest}</span>}
              </div>

              {/* 4. Section */}
              <div className="master-form-group">
                <label htmlFor="prSection" className="master-form-label">
                  Section <span className="required-asterisk">*</span>
                </label>
                <select
                  id="prSection"
                  className={`master-form-select ${formErrors.section ? "has-error" : ""}`}
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value);
                    if (formErrors.section) setFormErrors((prev) => ({ ...prev, section: "" }));
                  }}
                >
                  <option value="">Select Data . . .</option>
                  <option value="Section 01">Section 01</option>
                  <option value="Section 02">Section 02</option>
                  <option value="Furnace A">Furnace A</option>
                  <option value="Furnace B">Furnace B</option>
                  <option value="General Maintenance">General Maintenance</option>
                  <option value="Utility">Utility</option>
                </select>
                {formErrors.section && <span className="master-form-error">{formErrors.section}</span>}
              </div>

              {/* 5. Attachment File */}
              <div className="master-form-group">
                <label htmlFor="prAttachment" className="master-form-label">
                  Attachment file <span style={{ textTransform: "none", fontSize: "10.5px", color: "var(--muted)", fontWeight: 400 }}>(Max: 2MB, Format: PDF, DOC, XLS, JPG, PNG)</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label
                    style={{
                      padding: "6px 12px",
                      background: "#f1f5f9",
                      border: "1px solid var(--line-strong)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Choose File
                    <input
                      id="prAttachment"
                      type="file"
                      style={{ display: "none" }}
                      accept=".doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <span style={{ fontSize: "11px", color: "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {attachmentName || "No file chosen"}
                  </span>
                </div>
              </div>
            </div>

            {/* Context bar with Dept. Create and Action Buttons */}
            <div className="tx-context-bar">
              <div className="tx-context-text">
                Dept. Create: <strong>{deptRequest || "—"}</strong>
              </div>

              <div className="tx-context-actions">
                {/* Dropdown: Upload From Master Item */}
                <div ref={uploadDropdownRef} style={{ position: "relative", display: "inline-block" }}>
                  <button
                    type="button"
                    onClick={() => setIsUploadDropdownOpen((prev) => !prev)}
                    style={{
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "1px solid #15803d",
                      padding: "7px 14px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    title="Upload items via Excel template"
                  >
                    <span>Upload From Master Item</span>
                    <Icon name={isUploadDropdownOpen ? "chevronUp" : "chevronDown"} size={12} />
                  </button>

                  {isUploadDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        background: "#ffffff",
                        border: "1px solid var(--line-strong, #cbd5e1)",
                        borderRadius: "var(--radius-sm, 6px)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        zIndex: 100,
                        minWidth: "175px",
                        overflow: "hidden",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleDownloadExcelTemplate}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "9px 14px",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--line, #e2e8f0)",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--ink, #1e293b)",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Icon name="download" size={13} style={{ color: "#16a34a" }} />
                        <span>Download Template</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "9px 14px",
                          background: "transparent",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--ink, #1e293b)",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Icon name="file" size={13} style={{ color: "#2563eb" }} />
                        <span>Upload File</span>
                      </button>
                    </div>
                  )}

                  {/* Hidden File Input for Excel Import */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={handleUploadExcelFile}
                  />
                </div>

                {/* Add Item Button: Directly Opens Pick Item Modal */}
                <button
                  type="button"
                  onClick={() => setIsItemPickerOpen(true)}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "1px solid #15803d",
                    padding: "7px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                  title="Add items directly from Master Item catalog"
                >
                  <span>Add item</span>
                </button>

                {/* Manual Blank Row Addition */}
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  style={{
                    background: "#f8fafc",
                    color: "var(--ink-soft, #475569)",
                    border: "1px solid var(--line-strong, #cbd5e1)",
                    padding: "7px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                  title="Add a manual blank row"
                >
                  <Icon name="plus" size={12} />
                  <span>Blank Row</span>
                </button>
              </div>
            </div>

            {formErrors.items && (
              <div style={{ color: "var(--red-600)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                {formErrors.items}
              </div>
            )}

            {/* Item Table Grid */}
            <div className="tx-table-container">
              <table className="tx-grid-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "48px", width: "48px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "170px" }}>Job Number</th>
                    <th style={{ minWidth: "260px" }}>Item Name *</th>
                    <th style={{ minWidth: "100px" }}>Unit</th>
                    <th style={{ minWidth: "110px", textAlign: "right" }}>Current Stock</th>
                    <th style={{ minWidth: "115px", textAlign: "right" }}>Quantity *</th>
                    <th style={{ minWidth: "145px" }}>Due Date</th>
                    <th style={{ minWidth: "160px" }}>Facility Status</th>
                    <th style={{ minWidth: "200px" }}>Remark</th>
                    <th style={{ minWidth: "52px", width: "52px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((row, index) => (
                      <tr key={row.id}>
                        {/* 1. Sequential No */}
                        <td style={{ textAlign: "center", fontWeight: 600, color: "var(--muted)" }}>
                          {index + 1}
                        </td>

                        {/* 2. Job Number (Non-selectable) */}
                        <td>
                          <select
                            className="tx-input-cell tx-input-cell--disabled"
                            disabled
                            value={row.jobNumber || ""}
                            tabIndex={-1}
                            aria-disabled="true"
                            title="Job Number selection is disabled"
                          >
                            <option value="">Select Data . . .</option>
                            <option value="—">— None —</option>
                            {jobOptions.map((job) => (
                              <option key={job} value={job}>
                                {job}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. Item Name (Searchable Combobox / Dropdown) */}
                        <td>
                          <SearchableItemCombobox
                            value={row.itemName}
                            hasError={Boolean(formErrors[`item_${index}_name`])}
                            availableItems={masterItems}
                            onSelect={(selectedItem) => {
                              handleUpdateRow(row.id, "itemCode", selectedItem.itemCode);
                              handleUpdateRow(row.id, "itemName", selectedItem.itemName);
                              handleUpdateRow(
                                row.id,
                                "unit",
                                selectedItem.smallestUnitCode || selectedItem.smallestUnitName || "PCE"
                              );
                              handleUpdateRow(
                                row.id,
                                "currentStock",
                                typeof selectedItem.stock === "number" ? selectedItem.stock : 0
                              );
                              handleUpdateRow(
                                row.id,
                                "facility",
                                selectedItem.facility === "FASILITAS" ? "Fasilitas" : "Non Fasilitas"
                              );
                              if (formErrors[`item_${index}_name`]) {
                                setFormErrors((prev) => ({ ...prev, [`item_${index}_name`]: "" }));
                              }
                            }}
                            onTextChange={(text) => {
                              handleUpdateRow(row.id, "itemName", text);
                              const matched = masterItems.find(
                                (m) => m.itemName.toLowerCase() === text.trim().toLowerCase()
                              );
                              if (matched) {
                                handleUpdateRow(
                                  row.id,
                                  "facility",
                                  matched.facility === "FASILITAS" ? "Fasilitas" : "Non Fasilitas"
                                );
                              }
                              if (formErrors[`item_${index}_name`]) {
                                setFormErrors((prev) => ({ ...prev, [`item_${index}_name`]: "" }));
                              }
                            }}
                          />
                          {formErrors[`item_${index}_name`] && (
                            <span style={{ color: "var(--red-600)", fontSize: "10.5px", display: "block" }}>
                              {formErrors[`item_${index}_name`]}
                            </span>
                          )}
                        </td>

                        {/* 4. Unit */}
                        <td>
                          <select
                            className="tx-input-cell"
                            value={row.unit}
                            onChange={(e) => handleUpdateRow(row.id, "unit", e.target.value)}
                          >
                            <option value="PCE">PCE</option>
                            <option value="KG">KG</option>
                            <option value="SET">SET</option>
                            <option value="ROLL">ROLL</option>
                            <option value="MTR">MTR</option>
                            <option value="BOX">BOX</option>
                            <option value="LTR">LTR</option>
                          </select>
                        </td>

                        {/* 5. Current Stock (Read-only Reference) */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink-soft)" }}>
                          {row.currentStock.toFixed(2)}
                        </td>

                        {/* 6. Quantity */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            className={`tx-input-cell tx-input-cell--num ${formErrors[`item_${index}_qty`] ? "has-error" : ""}`}
                            value={row.quantity}
                            onChange={(e) => handleUpdateRow(row.id, "quantity", parseFloat(e.target.value) || 0)}
                          />
                          {formErrors[`item_${index}_qty`] && (
                            <span style={{ color: "var(--red-600)", fontSize: "10.5px", display: "block" }}>
                              {formErrors[`item_${index}_qty`]}
                            </span>
                          )}
                        </td>

                        {/* 7. Due Date */}
                        <td>
                          <input
                            type="date"
                            className="tx-input-cell"
                            value={row.dueDate}
                            onChange={(e) => handleUpdateRow(row.id, "dueDate", e.target.value)}
                          />
                        </td>

                        {/* 8. Fasilitas / Non Fasilitas (Derived from Master Item — Read-only) */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell tx-input-cell--disabled"
                            value={row.facility}
                            readOnly
                            disabled
                            title="Facility status is configured via Master Item"
                          />
                        </td>

                        {/* 9. Remark */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell"
                            placeholder="Item remark..."
                            value={row.remark}
                            onChange={(e) => handleUpdateRow(row.id, "remark", e.target.value)}
                          />
                        </td>

                        {/* 10. Action */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="tx-row-delete-btn"
                            title="Remove item row"
                            onClick={() => handleDeleteRow(row.id)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                        No items added yet. Click "Add Item" or "Upload From Master Item" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Form-level Note */}
            <div className="master-form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor="prNote" className="master-form-label">
                Note
              </label>
              <textarea
                id="prNote"
                className="master-form-textarea"
                placeholder="Enter purchase requisition general notes..."
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Bottom Action Bar */}
            <div className="tx-actions-bar">
              <button
                type="submit"
                className="btn-tx-save"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? "Saving..." : "Save"}</span>
              </button>

              <button
                type="button"
                className="btn-tx-cancel"
                onClick={() => setShowCancelConfirm(true)}
              >
                <span>Cancel</span>
              </button>
            </div>
        </form>
      </div>

      {/* Item Picker Modal from Master Items */}
      <ItemPickerModal
        isOpen={isItemPickerOpen}
        items={masterItems}
        alreadySelectedCodes={items.map((i) => i.itemCode || "").filter(Boolean)}
        onAddItems={handleAddFromMasterPicker}
        onClose={() => setIsItemPickerOpen(false)}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="Are you sure you want to cancel? Any unsaved requisition details will be lost."
        confirmLabel="Discard & Exit"
        cancelLabel="Continue Editing"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={onBack}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Submit Purchase Requisition?"
        message={`Are you sure you want to submit this requisition with ${items.length} item(s) for ${deptRequest}?`}
        confirmLabel="Confirm & Save"
        cancelLabel="Review Form"
        confirmVariant="primary"
        icon="check"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

export default PurchaseRequisitionCreate;
