import React, { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { PickPoItemModal } from "./PickPoItemModal";
import { suppliersList, docTypesList } from "./receive-note-data";
import type {
  ReceiveNoteRecord,
  ReceiveNoteItem,
  PoItemToPick,
} from "./receive-note-types";

interface ReceiveNoteFormProps {
  onBack: () => void;
  onSave?: (newRecord: ReceiveNoteRecord) => void;
}

export function ReceiveNoteForm({ onBack, onSave }: ReceiveNoteFormProps) {
  // Supplier & Currency Information
  const [supplier, setSupplier] = useState("");
  const [currency, setCurrency] = useState("IDR - RUPIAH");
  const [rate, setRate] = useState("1.0000");

  // Arrival & Invoice Information
  const [arrivalDate, setArrivalDate] = useState("2026-10-14");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [taxInvoice, setTaxInvoice] = useState("");
  const [taxInvoiceDate, setTaxInvoiceDate] = useState("");

  // Transport Information
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [notes, setNotes] = useState("");

  // Shipping Document Information
  const [sjNumber, setSjNumber] = useState("");
  const [sjDate, setSjDate] = useState("");
  const [plNumber, setPlNumber] = useState("");
  const [plDate, setPlDate] = useState("");

  // Additional Options
  const [statusDn, setStatusDn] = useState(false);
  const [serviceSubkon, setServiceSubkon] = useState(false);
  const [typeOfDocument, setTypeOfDocument] = useState("");

  // Items table
  const [items, setItems] = useState<ReceiveNoteItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Validation & alerts
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [notice, setNotice] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  // Calculate totals
  const totalSuratJalanQty = items.reduce(
    (sum, it) => sum + (it.suratJalanQty ?? it.qty ?? 0),
    0
  );
  const totalSubTotal = items.reduce((sum, it) => sum + it.priceSubtotal, 0);

  // Transfer picked PO items into Add RN table
  const handleAddPickedItems = (pickedItems: PoItemToPick[]) => {
    const newItems: ReceiveNoteItem[] = pickedItems.map((p, idx) => {
      const nextNo = items.length + idx + 1;
      const initialSjQty = p.remainQty > 0 ? p.remainQty : p.poQty;
      const subtotal = initialSjQty * p.unitPrice;

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
        pricePerUnit: p.unitPrice,
        priceSubtotal: subtotal,
        price2PerUnit: p.unitPrice,
        price2Subtotal: subtotal,
        remark: p.remark || "-",
        sjNumber: sjNumber || "-",
        sjDate: sjDate || "14-10-2026",
        poQty: p.poQty,
        dlvrQty: 0,
        suratJalanQty: initialSjQty,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({ ...it, no: idx + 1 }))
    );
  };

  const handleUpdateItemQty = (id: string, newQtyVal: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const validQty = isNaN(newQtyVal) || newQtyVal < 0 ? 0 : newQtyVal;
        const newSubtotal = validQty * it.pricePerUnit;
        return {
          ...it,
          qty: validQty,
          suratJalanQty: validQty,
          priceSubtotal: newSubtotal,
          price2Subtotal: newSubtotal,
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    setFormErrors({});

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
      ajuNumber: "00004001456220261014004999",
      noDaftar: "090400",
      amount: totalSubTotal,
      amountFormatted: `IDR ${totalSubTotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description: notes || "-",
      warehouseTransaction: "-",
      currency: currency.split(" - ")[0] || "IDR",
      rate: parseFloat(rate) || 1.0,
      invoiceNumber: invoiceNumber || "-",
      invoiceDate: invoiceDate || "-",
      taxInvoiceNumber: taxInvoice || "-",
      taxInvoiceDate: taxInvoiceDate || "-",
      vehicleType: vehicleType || "-",
      licensePlate: licensePlate || "-",
      tanggalDaftar: formattedArrivalDate,
      nomorPackingList: plNumber || "-",
      tanggalPackingList: plDate || "-",
      status: "Draft",
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
            border: `1px solid ${
              notice.type === "warning"
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
                  ...suppliersList
                    .filter((s) => s !== "All Suppliers")
                    .map((sup) => ({ value: sup, label: sup })),
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
                onChange={(e) => setTaxInvoice(e.target.value)}
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
                  <th className="th-right" style={{ width: "85px" }}>Surat Jalan</th>
                  <th className="th-right" style={{ width: "75px" }}>Rafaksi</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      No items selected yet. Click the green <strong>Add Items from PO</strong> button above to pick purchase order items.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="td-center">{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{it.poNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                        <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "monospace" }}>{it.itemCode}</div>
                      </td>
                      <td>{it.sjNumber || sjNumber || "-"}</td>
                      <td>{it.sjDate || sjDate || "-"}</td>
                      <td className="td-right" style={{ fontFamily: "monospace" }}>
                        {it.pricePerUnit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                          style={{ width: "80px", height: "28px" }}
                        />
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace" }}>
                        {it.rafaksi.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {it.priceSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td>{it.remark || "-"}</td>
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
            <button type="submit" className="btn-tx-save">
              <span>Save</span>
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
      />
    </div>
  );
}

export default ReceiveNoteForm;
