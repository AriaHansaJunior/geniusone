import { useState, useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { PickPoItemModal } from "./PickPoItemModal";
import { apiFetch } from "../../../data/api";
import { suppliersList, docTypesList } from "./receive-note-data";
import type {
  ReceiveNoteRecord,
  ReceiveNoteItem,
  PoItemToPick,
} from "./receive-note-types";

interface ReceiveNoteFormProps {
  onBack: () => void;
  onSave?: (newRecord: ReceiveNoteRecord) => void;
  existingReceiveNotes?: ReceiveNoteRecord[];
}

export function ReceiveNoteForm({ onBack, onSave, existingReceiveNotes = [] }: ReceiveNoteFormProps) {
  // Supplier & Currency Information
  const [supplier, setSupplier] = useState("");
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>(() =>
    suppliersList.filter((s) => s !== "All Suppliers")
  );
  const [currency, setCurrency] = useState("IDR - RUPIAH");
  const [rate, setRate] = useState("1.0000");

  // Load real suppliers on mount
  useEffect(() => {
    let isMounted = true;
    apiFetch("/api/procurement/master/suppliers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!isMounted) return;
        if (d?.data && Array.isArray(d.data) && d.data.length > 0) {
          const names = d.data.map((s: any) => s.name).filter(Boolean);
          if (names.length > 0) {
            setAvailableSuppliers((prev) => Array.from(new Set([...names, ...prev])));
          }
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  // Arrival & Invoice Information
  const [arrivalDate, setArrivalDate] = useState("2026-10-14");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [taxInvoice, setTaxInvoice] = useState("");
  const [taxInvoiceDate, setTaxInvoiceDate] = useState("");

  // Transport Information
  const [vehicleType, setVehicleType] = useState("MOBIL BARANG");
  const [licensePlate, setLicensePlate] = useState("B 9182 UXZ");
  const [notes, setNotes] = useState("");

  // Customs & Registration Information
  const [ajuNumber, setAjuNumber] = useState("00004001456220261014004999");
  const [noDaftar, setNoDaftar] = useState("090400");
  const [tanggalDaftar, setTanggalDaftar] = useState("2026-10-14");

  const parseCleanNumber = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Shipping Document Information
  const [sjNumber, setSjNumber] = useState("");
  const [sjDate, setSjDate] = useState("");
  const [plNumber, setPlNumber] = useState("");
  const [plDate, setPlDate] = useState("");

  // Additional Options & Facility Status
  const [facilityStatus, setFacilityStatus] = useState<"FASILITAS" | "NON FASILITAS">("FASILITAS");
  const [statusDn, setStatusDn] = useState(true);
  const [serviceSubkon, setServiceSubkon] = useState(false);
  const [typeOfDocument, setTypeOfDocument] = useState("BC 4.0");

  const handleDocTypeChange = (val: string) => {
    setTypeOfDocument(val);
    if (val.toUpperCase().includes("NON")) {
      setFacilityStatus("NON FASILITAS");
      setStatusDn(false);
    } else if (val) {
      setFacilityStatus("FASILITAS");
      setStatusDn(true);
    }
    if (formErrors.typeOfDocument) {
      setFormErrors((prev) => ({ ...prev, typeOfDocument: "" }));
    }
  };

  const handleFacilityChange = (val: "FASILITAS" | "NON FASILITAS") => {
    setFacilityStatus(val);
    setStatusDn(val === "FASILITAS");
    if (val === "NON FASILITAS" && (!typeOfDocument || typeOfDocument.startsWith("BC"))) {
      setTypeOfDocument("Non-Fasilitas");
    } else if (val === "FASILITAS" && (!typeOfDocument || typeOfDocument === "Non-Fasilitas")) {
      setTypeOfDocument("BC 4.0");
    }
  };

  // Items table
  const [items, setItems] = useState<ReceiveNoteItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Validation & alerts
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  // Calculate totals
  const totalSuratJalanQty = items.reduce(
    (sum, it) => sum + parseCleanNumber(it.suratJalanQty ?? it.qty ?? 0),
    0
  );
  const totalSubTotal = items.reduce((sum, it) => sum + parseCleanNumber(it.priceSubtotal), 0);

  // Transfer picked PO items into Add RN table
  const handleAddPickedItems = (pickedItems: PoItemToPick[]) => {
    const newItems: ReceiveNoteItem[] = pickedItems.map((p, idx) => {
      const nextNo = items.length + idx + 1;
      const initialSjQty = parseCleanNumber(p.remainQty > 0 ? p.remainQty : p.poQty) || 1;
      const unitPrice = parseCleanNumber(p.unitPrice);
      const subtotal = initialSjQty * unitPrice;

      return {
        id: `rn-item-${Date.now()}-${p.id}`,
        no: nextNo,
        poNumber: p.poNumber,
        poDate: "14-10-2026",
        dnNumber: "-",
        dnDate: "-",
        jobNumber: p.jobNumber,
        jobDate: "-",
        itemCode: p.itemCode,
        itemName: p.itemName,
        qty: initialSjQty,
        unit: p.unit,
        rafaksi: 0,
        rafaksiPercent: 0,
        pricePerUnit: unitPrice,
        priceSubtotal: subtotal,
        price2PerUnit: unitPrice,
        price2Subtotal: subtotal,
        remark: p.remark && p.remark !== "-" ? p.remark : "",
        sjNumber: sjNumber || "-",
        sjDate: sjDate || "14-10-2026",
        poQty: parseCleanNumber(p.poQty),
        dlvrQty: 0,
        suratJalanQty: initialSjQty,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleAddBlankItem = () => {
    const nextNo = items.length + 1;
    const initialSjQty = 1;
    const newItem: ReceiveNoteItem = {
      id: `rn-item-${Date.now()}-${nextNo}`,
      no: nextNo,
      poNumber: "—",
      poDate: arrivalDate || "14-10-2026",
      dnNumber: "-",
      dnDate: "-",
      jobNumber: "—",
      jobDate: "-",
      itemCode: "—",
      itemName: "",
      qty: initialSjQty,
      unit: "PCE",
      rafaksi: 0,
      rafaksiPercent: 0,
      pricePerUnit: 0,
      priceSubtotal: 0,
      price2PerUnit: 0,
      price2Subtotal: 0,
      remark: "-",
      sjNumber: sjNumber || "-",
      sjDate: sjDate || arrivalDate || "14-10-2026",
      poQty: initialSjQty,
      dlvrQty: 0,
      suratJalanQty: initialSjQty,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({ ...it, no: idx + 1 }))
    );
  };

  const handleUpdateItemField = (id: string, field: keyof ReceiveNoteItem, val: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: val };
        if (field === "suratJalanQty" || field === "pricePerUnit" || field === "qty") {
          const validQty = parseCleanNumber(updated.suratJalanQty ?? updated.qty);
          const validPrice = parseCleanNumber(updated.pricePerUnit);
          updated.priceSubtotal = validQty * validPrice;
          updated.price2Subtotal = validQty * validPrice;
        }
        return updated;
      })
    );
  };

  const handleUpdateItemQty = (id: string, newQtyVal: number) => {
    handleUpdateItemField(id, "suratJalanQty", newQtyVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};
    if (!supplier) errors.supplier = "Supplier is required.";
    if (!currency) errors.currency = "Currency is required.";
    if (!rate || isNaN(Number(rate)) || Number(rate) <= 0) {
      errors.rate = "A valid rate is required.";
    }
    if (!arrivalDate) errors.arrivalDate = "Arrival Date is required.";
    if (!typeOfDocument) errors.typeOfDocument = "Type of Document is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setNotice({
        type: "warning",
        message: "Please fill in all required fields indicated with *.",
      });
      return;
    }

    if (items.length === 0) {
      setNotice({
        type: "warning",
        message: "Please add at least one item before saving the Receive Note.",
      });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    // Construct new mock Receive Note record
    const rnNumber = `0281/RN-IMLI/X/${new Date().getFullYear()}`;
    const formattedArrivalDate = arrivalDate.includes("-")
      ? arrivalDate.split("-").reverse().join("-")
      : arrivalDate;

    const ppnRate = 12.0;
    const ppnAmt = (totalSubTotal * ppnRate) / 100;
    const gTotal = totalSubTotal + ppnAmt;

    const newRecord: ReceiveNoteRecord = {
      id: `rn-${Date.now()}`,
      no: 1, // Will be set upon appending
      rnNumber,
      arrivalDate: formattedArrivalDate,
      poNumber: items.length > 0 ? items[0].poNumber : "POL-1026-NEW",
      date: formattedArrivalDate,
      supplier,
      facility: statusDn ? "FASILITAS" : "NON-FASILITAS",
      bcCode: typeOfDocument,
      ajuNumber: ajuNumber || "00004001456220261014004999",
      noDaftar: noDaftar || "090400",
      amount: totalSubTotal,
      amountFormatted: `IDR ${totalSubTotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description: notes || "-",
      note: notes || "-",
      notes: notes || "-",
      remark: notes || "-",
      warehouseTransaction: "-",
      currency: currency.split(" - ")[0] || "IDR",
      rate: parseFloat(rate) || 1.0,
      invoiceNumber: invoiceNumber || "-",
      invoiceDate: invoiceDate || "-",
      taxInvoiceNumber: taxInvoice || "-",
      taxInvoiceDate: taxInvoiceDate || (taxInvoice && taxInvoice !== "-" ? (invoiceDate || formattedArrivalDate) : "-"),
      vehicleType: vehicleType || "MOBIL BARANG",
      licensePlate: licensePlate || "B 9182 UXZ",
      tanggalDaftar: tanggalDaftar || formattedArrivalDate,
      nomorPackingList: plNumber || sjNumber || "-",
      tanggalPackingList: plDate || sjDate || "-",
      status: "Waiting for Approve 1" as any,
      createdAt: `${formattedArrivalDate} 10:00 by USER`,
      lastUpdatedAt: `${formattedArrivalDate} 10:00 by USER`,
      approval1At: "-",
      approval2At: "-",
      items: items,
      totalQty: totalSuratJalanQty,
      biayaLain: 0,
      discountPercent: 0,
      discountAmount: 0,
      ppnPercent: ppnRate,
      ppnAmount: ppnAmt,
      grandTotal: gTotal,
    };

    if (onSave) {
      onSave(newRecord);
    }
  };

  const alreadySelectedKeys = items.map(
    (it) => `${it.poNumber}-${it.itemCode}`
  );

  return (
    <div className="transaction-create-page">
      {/* Page Title */}
      <div className="tx-page-header">
        <h1 className="tx-page-title">Add Receive Note</h1>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          style={{
            padding: "10px 16px",
            background:
              notice.type === "warning"
                ? "#fffbeb"
                : notice.type === "success"
                  ? "#f0fdf4"
                  : "#eff6ff",
            border: `1px solid ${notice.type === "warning"
              ? "#fde68a"
              : notice.type === "success"
                ? "#bbf7d0"
                : "#bfdbfe"
              }`,
            borderRadius: "var(--radius-sm)",
            color:
              notice.type === "warning"
                ? "#92400e"
                : notice.type === "success"
                  ? "#166534"
                  : "#1e40af",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={
                notice.type === "warning"
                  ? "alertTriangle"
                  : notice.type === "success"
                    ? "check"
                    : "info"
              }
              size={16}
            />
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              color: "inherit",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSubmit}>
          {/* Header Grid: Row 1 */}
          <div className="tx-header-grid" style={{ marginBottom: "14px" }}>
            {/* Supplier */}
            <div className="master-form-group">
              <label className="master-form-label">
                Supplier <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={supplier}
                onChange={(val) => {
                  setSupplier(val);
                  if (formErrors.supplier) {
                    setFormErrors((prev) => ({ ...prev, supplier: "" }));
                  }
                }}
                placeholder="Select Supplier"
                options={[
                  { value: "", label: "Select Supplier" },
                  ...availableSuppliers.map((sup) => ({ value: sup, label: sup })),
                ]}
              />
              {formErrors.supplier && (
                <span className="master-form-error">{formErrors.supplier}</span>
              )}
            </div>

            {/* Currency */}
            <div className="master-form-group">
              <label className="master-form-label">
                Currency <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={currency}
                onChange={(val) => setCurrency(val)}
                options={[
                  { value: "IDR - RUPIAH", label: "IDR - RUPIAH" },
                  { value: "USD - US DOLLAR", label: "USD - US DOLLAR" },
                  { value: "EUR - EURO", label: "EUR - EURO" },
                  { value: "SGD - SINGAPORE DOLLAR", label: "SGD - SINGAPORE DOLLAR" },
                ]}
              />
            </div>

            {/* Rate */}
            <div className="master-form-group">
              <label className="master-form-label">
                Rate <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                className={`master-form-input ${formErrors.rate ? "has-error" : ""}`}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="1.0000"
              />
              {formErrors.rate && (
                <span className="master-form-error">{formErrors.rate}</span>
              )}
            </div>

            {/* Type of Document */}
            <div className="master-form-group">
              <label className="master-form-label">
                Type of Document <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={typeOfDocument}
                onChange={(val) => {
                  setTypeOfDocument(val);
                  if (formErrors.typeOfDocument) {
                    setFormErrors((prev) => ({ ...prev, typeOfDocument: "" }));
                  }
                }}
                placeholder="Select Data ..."
                options={[
                  { value: "", label: "Select Data ..." },
                  ...docTypesList
                    .filter((d) => d !== "All Type of Documents")
                    .map((dt) => ({ value: dt, label: dt })),
                ]}
              />
              {formErrors.typeOfDocument && (
                <span className="master-form-error">{formErrors.typeOfDocument}</span>
              )}
            </div>
          </div>

          {/* Header Grid: Row 2 */}
          <div className="tx-header-grid" style={{ marginBottom: "14px" }}>
            {/* Arrival Date */}
            <div className="master-form-group">
              <label className="master-form-label">
                Arrival Date <span className="required-asterisk">*</span>
              </label>
              <CustomDatePicker
                value={arrivalDate}
                onChange={(val) => setArrivalDate(val)}
                className={formErrors.arrivalDate ? "has-error" : ""}
              />
            </div>

            {/* Invoice Number */}
            <div className="master-form-group">
              <label className="master-form-label">Invoice Number</label>
              <input
                type="text"
                className="master-form-input"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice Number"
              />
            </div>

            {/* Invoice Date */}
            <div className="master-form-group">
              <label className="master-form-label">Invoice Date</label>
              <CustomDatePicker
                value={invoiceDate}
                onChange={(val) => setInvoiceDate(val)}
              />
            </div>

            {/* Tax Invoice */}
            <div className="master-form-group">
              <label className="master-form-label">Tax Invoice</label>
              <input
                type="text"
                className="master-form-input"
                value={taxInvoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setTaxInvoice(val);
                  if (val.trim() && !taxInvoiceDate) {
                    setTaxInvoiceDate(invoiceDate || arrivalDate || "2026-10-14");
                  }
                }}
                placeholder="Tax Invoice Number"
              />
            </div>

            {/* Tax Invoice Date */}
            <div className="master-form-group">
              <label className="master-form-label">Tax Invoice Date</label>
              <CustomDatePicker
                value={taxInvoiceDate}
                onChange={(val) => setTaxInvoiceDate(val)}
              />
            </div>
          </div>

          {/* Header Grid: Row 3 */}
          <div className="tx-header-grid" style={{ marginBottom: "14px" }}>
            {/* S.J Number */}
            <div className="master-form-group">
              <label className="master-form-label">S.J Number</label>
              <input
                type="text"
                className="master-form-input"
                value={sjNumber}
                onChange={(e) => setSjNumber(e.target.value)}
                placeholder="Surat Jalan Number"
              />
            </div>

            {/* S.J Date */}
            <div className="master-form-group">
              <label className="master-form-label">S.J Date</label>
              <CustomDatePicker
                value={sjDate}
                onChange={(val) => setSjDate(val)}
              />
            </div>

            {/* PL Number */}
            <div className="master-form-group">
              <label className="master-form-label">PL Number</label>
              <input
                type="text"
                className="master-form-input"
                value={plNumber}
                onChange={(e) => setPlNumber(e.target.value)}
                placeholder="Packing List Number"
              />
            </div>

            {/* PL Date */}
            <div className="master-form-group">
              <label className="master-form-label">PL Date</label>
              <CustomDatePicker
                value={plDate}
                onChange={(val) => setPlDate(val)}
              />
            </div>

            {/* Vehicle Type */}
            <div className="master-form-group">
              <label className="master-form-label">Vehicle Type</label>
              <CustomSelect
                value={vehicleType}
                onChange={(val) => setVehicleType(val)}
                placeholder="Choose Vehicle Type..."
                options={[
                  { value: "", label: "Choose Vehicle Type..." },
                  { value: "MOBIL BARANG", label: "MOBIL BARANG" },
                  { value: "TRUK BOX", label: "TRUK BOX" },
                  { value: "CONTAINER 20FT", label: "CONTAINER 20FT" },
                  { value: "CONTAINER 40FT", label: "CONTAINER 40FT" },
                  { value: "PICKUP", label: "PICKUP" },
                ]}
              />
            </div>

            {/* License Plate */}
            <div className="master-form-group">
              <label className="master-form-label">License Plate</label>
              <input
                type="text"
                className="master-form-input"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. AG 8605 EG"
              />
            </div>
          </div>

          {/* Header Grid: Row 4 (Customs & Registration) */}
          <div className="tx-header-grid" style={{ marginBottom: "14px" }}>
            {/* Nomor Aju */}
            <div className="master-form-group">
              <label className="master-form-label">Nomor Aju</label>
              <input
                type="text"
                className="master-form-input font-mono"
                value={ajuNumber}
                onChange={(e) => setAjuNumber(e.target.value)}
                placeholder="e.g. 00004001456220261014004999"
              />
            </div>

            {/* Nomor Daftar */}
            <div className="master-form-group">
              <label className="master-form-label">Nomor Daftar</label>
              <input
                type="text"
                className="master-form-input font-mono"
                value={noDaftar}
                onChange={(e) => setNoDaftar(e.target.value)}
                placeholder="e.g. 090400"
              />
            </div>

            {/* Tanggal Daftar */}
            <div className="master-form-group">
              <label className="master-form-label">Tanggal Daftar</label>
              <CustomDatePicker
                value={tanggalDaftar}
                onChange={(val) => setTanggalDaftar(val)}
              />
            </div>
          </div>

          {/* Options checkboxes and notes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "10px 14px",
              background: "rgba(248, 250, 252, 0.7)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={statusDn}
                onChange={(e) => setStatusDn(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span>Status DN: Facility User</span>
            </label>

            <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={serviceSubkon}
                onChange={(e) => setServiceSubkon(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <span>Service / Subkon</span>
            </label>

            <div style={{ flex: 1, minWidth: "220px" }}>
              <input
                type="text"
                className="master-form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or remarks..."
                style={{ height: "32px", fontSize: "12px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "1px solid #15803d",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="plus" size={14} />
                <span>Add Items from PO</span>
              </button>

              <button
                type="button"
                onClick={handleAddBlankItem}
                style={{
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="plus" size={14} />
                <span>Add Blank Item</span>
              </button>
            </div>
          </div>

          {/* Receive Note Item Table */}
          <div className="tx-table-container">
            <table className="tx-grid-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: "45px", textAlign: "center" }}>
                    No
                  </th>
                  <th rowSpan={2} style={{ width: "140px" }}>PO Number</th>
                  <th rowSpan={2} style={{ minWidth: "200px" }}>Item Name</th>
                  <th rowSpan={2} style={{ width: "120px" }}>SJ Number</th>
                  <th rowSpan={2} style={{ width: "100px" }}>SJ Date</th>
                  <th rowSpan={2} className="th-right" style={{ width: "110px" }}>
                    Price
                  </th>
                  <th colSpan={4} className="th-center" style={{ borderBottom: "1px solid var(--line)" }}>
                    Quantity
                  </th>
                  <th rowSpan={2} className="th-right" style={{ width: "120px" }}>
                    Sub Total
                  </th>
                  <th rowSpan={2} style={{ minWidth: "140px" }}>Remark</th>
                  <th rowSpan={2} className="th-center" style={{ width: "50px" }}>
                    Action
                  </th>
                </tr>
                <tr>
                  <th className="th-right" style={{ width: "75px" }}>PO</th>
                  <th className="th-right" style={{ width: "75px" }}>DLVR</th>
                  <th className="th-right" style={{ width: "95px" }} title="Jumlah yang dimasukkan / diterima">
                    Received
                  </th>
                  <th className="th-right" style={{ width: "75px" }}>Rafaksi</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      No items selected yet. Click <strong>Add Items from PO</strong> or <strong>Add Blank Item</strong> above to add received items.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="td-center">{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{it.poNumber}</td>
                      <td>
                        {it.poNumber === "—" ? (
                          <input
                            type="text"
                            className="tx-input-cell"
                            placeholder="Enter item name..."
                            value={it.itemName}
                            onChange={(e) => handleUpdateItemField(it.id, "itemName", e.target.value)}
                            style={{ height: "28px" }}
                          />
                        ) : (
                          <>
                            <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "monospace" }}>{it.itemCode}</div>
                          </>
                        )}
                      </td>
                      <td>{it.sjNumber || sjNumber || "-"}</td>
                      <td>{it.sjDate || sjDate || "-"}</td>
                      <td className="td-right">
                        <input
                          type="number"
                          className="tx-input-cell tx-input-cell--num"
                          value={parseCleanNumber(it.pricePerUnit)}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "pricePerUnit", parseFloat(e.target.value) || 0)
                          }
                          min="0"
                          step="any"
                          style={{ width: "95px", height: "28px", textAlign: "right", fontFamily: "monospace" }}
                        />
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", color: "var(--muted)" }}>
                        {(it.poQty ?? it.qty).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", color: "var(--muted)" }}>
                        {(it.dlvrQty ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-right">
                        <input
                          type="number"
                          className="tx-input-cell tx-input-cell--num"
                          value={it.suratJalanQty ?? it.qty}
                          onChange={(e) =>
                            handleUpdateItemQty(it.id, parseFloat(e.target.value))
                          }
                          min="0"
                          step="any"
                          placeholder="0.00"
                          title="Jumlah yang dimasukkan / diterima"
                          style={{ width: "85px", height: "28px", textAlign: "right", fontFamily: "monospace" }}
                        />
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace" }}>
                        {it.rafaksi.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {parseCleanNumber(it.priceSubtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          value={it.remark === "-" ? "" : it.remark}
                          onChange={(e) => handleUpdateItemField(it.id, "remark", e.target.value)}
                          placeholder="Item remark..."
                          style={{ height: "28px" }}
                        />
                      </td>
                      <td className="td-center">
                        <button
                          type="button"
                          className="tx-row-delete-btn"
                          onClick={() => handleRemoveItem(it.id)}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--slate-50)", borderTop: "2px solid var(--line)" }}>
                  <td colSpan={8} className="td-right" style={{ fontWeight: 800 }}>
                    Total
                  </td>
                  <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 800 }}>
                    {totalSuratJalanQty.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td></td>
                  <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--blue-700)" }}>
                    {totalSubTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions: Save & Cancel */}
          <div className="tx-actions-bar">
            <button type="submit" className="btn-tx-save" disabled={isSubmitting}>
              <span>{isSubmitting ? "Saving..." : "Save"}</span>
            </button>
            <button
              type="button"
              className="btn-tx-cancel"
              onClick={onBack}
            >
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>

      {/* PO Item Picker Modal */}
      <PickPoItemModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddItems={handleAddPickedItems}
        alreadySelectedKeys={alreadySelectedKeys}
        facilityFilter={statusDn ? "FASILITAS" : "NON-FASILITAS"}
        existingReceiveNotes={existingReceiveNotes}
      />
    </div>
  );
}

export default ReceiveNoteForm;
