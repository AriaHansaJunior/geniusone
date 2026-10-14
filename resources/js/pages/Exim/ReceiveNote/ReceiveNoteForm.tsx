import React, { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
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
    <div className="rn-form-page">
      {/* Page Title */}
      <div className="rn-form-header">
        <h1 className="rn-form-title">Add Receive Note</h1>
      </div>

      {/* Notice Message */}
      {notice && (
        <div className={`rn-alert rn-alert--${notice.type}`}>
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
          <div className="rn-alert__content">
            <p>{notice.message}</p>
          </div>
          <button
            type="button"
            className="rn-alert-close"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="rn-form-card">
        {/* Row 1: Supplier, Currency, Rate */}
        <div className="rn-form-row">
          <div className="rn-form-col-4">
            <label className="rn-label">
              Supplier <span className="rn-required">*</span>
            </label>
            <select
              className={`rn-select ${formErrors.supplier ? "has-error" : ""}`}
              value={supplier}
              onChange={(e) => {
                setSupplier(e.target.value);
                if (formErrors.supplier) {
                  setFormErrors((prev) => ({ ...prev, supplier: "" }));
                }
              }}
            >
              <option value="">Select Supplier</option>
              {suppliersList
                .filter((s) => s !== "All Suppliers")
                .map((sup) => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
            </select>
            {formErrors.supplier && (
              <span className="rn-error-msg">{formErrors.supplier}</span>
            )}
          </div>

          <div className="rn-form-col-4">
            <label className="rn-label">
              Currency <span className="rn-required">*</span>
            </label>
            <select
              className={`rn-select ${formErrors.currency ? "has-error" : ""}`}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="IDR - RUPIAH">IDR - RUPIAH</option>
              <option value="USD - US DOLLAR">USD - US DOLLAR</option>
              <option value="EUR - EURO">EUR - EURO</option>
              <option value="SGD - SINGAPORE DOLLAR">SGD - SINGAPORE DOLLAR</option>
            </select>
          </div>

          <div className="rn-form-col-4">
            <label className="rn-label">
              Rate <span className="rn-required">*</span>
            </label>
            <input
              type="text"
              className={`rn-input ${formErrors.rate ? "has-error" : ""}`}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="1.0000"
            />
            {formErrors.rate && (
              <span className="rn-error-msg">{formErrors.rate}</span>
            )}
          </div>
        </div>

        {/* Row 2: Arrival Date, Invoice Number, Invoice Date, Tax Invoice, Tax Invoice Date */}
        <div className="rn-form-row">
          <div className="rn-form-col">
            <label className="rn-label">
              Arrival Date <span className="rn-required">*</span>
            </label>
            <input
              type="date"
              className={`rn-input ${formErrors.arrivalDate ? "has-error" : ""}`}
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">Invoice Number</label>
            <input
              type="text"
              className="rn-input"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Invoice Number"
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">Invoice Date</label>
            <input
              type="date"
              className="rn-input"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">Tax Invoice</label>
            <input
              type="text"
              className="rn-input"
              value={taxInvoice}
              onChange={(e) => setTaxInvoice(e.target.value)}
              placeholder="Tax Invoice Number"
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">Tax Invoice Date</label>
            <input
              type="date"
              className="rn-input"
              value={taxInvoiceDate}
              onChange={(e) => setTaxInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        {/* Row 3: Vehicle Type, License Plate, Notes */}
        <div className="rn-form-row">
          <div className="rn-form-col-4">
            <label className="rn-label">Vehicle Type</label>
            <select
              className="rn-select"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="">Choose Vehicle Type...</option>
              <option value="MOBIL BARANG">MOBIL BARANG</option>
              <option value="TRUK BOX">TRUK BOX</option>
              <option value="CONTAINER 20FT">CONTAINER 20FT</option>
              <option value="CONTAINER 40FT">CONTAINER 40FT</option>
              <option value="PICKUP">PICKUP</option>
            </select>
          </div>

          <div className="rn-form-col-4">
            <label className="rn-label">License Plate</label>
            <input
              type="text"
              className="rn-input"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. AG 8605 EG"
            />
          </div>

          <div className="rn-form-col-4">
            <label className="rn-label">Notes</label>
            <input
              type="text"
              className="rn-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes or remarks"
            />
          </div>
        </div>

        {/* Row 4: S.J Number, S.J Date, PL Number, PL Date, Status DN, Service / Subkon */}
        <div className="rn-form-row align-items-end">
          <div className="rn-form-col">
            <label className="rn-label">S.J Number</label>
            <input
              type="text"
              className="rn-input"
              value={sjNumber}
              onChange={(e) => setSjNumber(e.target.value)}
              placeholder="Surat Jalan Number"
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">S.J Date</label>
            <input
              type="date"
              className="rn-input"
              value={sjDate}
              onChange={(e) => setSjDate(e.target.value)}
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">PL Number</label>
            <input
              type="text"
              className="rn-input"
              value={plNumber}
              onChange={(e) => setPlNumber(e.target.value)}
              placeholder="Packing List Number"
            />
          </div>

          <div className="rn-form-col">
            <label className="rn-label">PL Date</label>
            <input
              type="date"
              className="rn-input"
              value={plDate}
              onChange={(e) => setPlDate(e.target.value)}
            />
          </div>

          <div className="rn-form-col-check">
            <span className="rn-label">Status DN</span>
            <label className="rn-checkbox-label">
              <input
                type="checkbox"
                className="rn-checkbox"
                checked={statusDn}
                onChange={(e) => setStatusDn(e.target.checked)}
              />
              <span>Facility User</span>
            </label>
          </div>

          <div className="rn-form-col-check">
            <span className="rn-label">Service / Subkon</span>
            <label className="rn-checkbox-label">
              <input
                type="checkbox"
                className="rn-checkbox"
                checked={serviceSubkon}
                onChange={(e) => setServiceSubkon(e.target.checked)}
              />
              <span>Service / Subkon</span>
            </label>
          </div>
        </div>

        {/* Row 5: Type of Document */}
        <div className="rn-form-row">
          <div className="rn-form-col-4">
            <label className="rn-label">
              Type of Document <span className="rn-required">*</span>
            </label>
            <select
              className={`rn-select ${formErrors.typeOfDocument ? "has-error" : ""}`}
              value={typeOfDocument}
              onChange={(e) => {
                setTypeOfDocument(e.target.value);
                if (formErrors.typeOfDocument) {
                  setFormErrors((prev) => ({ ...prev, typeOfDocument: "" }));
                }
              }}
            >
              <option value="">Select Data ...</option>
              {docTypesList
                .filter((d) => d !== "All Type of Documents")
                .map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
            </select>
            {formErrors.typeOfDocument && (
              <span className="rn-error-msg">{formErrors.typeOfDocument}</span>
            )}
          </div>
        </div>

        <div className="rn-form-divider" />

        {/* Receive Note Item Table */}
        <div className="rn-item-table-container">
          <table className="rn-form-table">
            <thead>
              <tr>
                <th rowSpan={2} className="rn-th-no">
                  No
                </th>
                <th rowSpan={2}>PO Number</th>
                <th rowSpan={2}>Item Name</th>
                <th rowSpan={2}>SJ Number</th>
                <th rowSpan={2}>SJ Date</th>
                <th rowSpan={2} className="text-right">
                  Price
                </th>
                <th colSpan={4} className="text-center rn-th-grouped">
                  Quantity
                </th>
                <th rowSpan={2} className="text-right">
                  Sub Total
                </th>
                <th rowSpan={2}>Remark</th>
                <th rowSpan={2} className="rn-th-action text-center">
                  <button
                    type="button"
                    className="rn-btn-add-item-header"
                    onClick={() => setIsPickerOpen(true)}
                    title="Add Item from Purchase Order"
                    aria-label="Add Item"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </th>
              </tr>
              <tr>
                <th className="rn-th-sub text-right">PO</th>
                <th className="rn-th-sub text-right">DLVR</th>
                <th className="rn-th-sub text-right">Surat Jalan</th>
                <th className="rn-th-sub text-right">Rafaksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="rn-table-empty">
                    No items selected yet. Click the green <strong>+</strong> button above to pick purchase order items.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="font-medium text-ink">{it.poNumber}</td>
                    <td>
                      <div className="font-medium text-ink">{it.itemName}</div>
                      <div className="text-xs text-muted font-mono">{it.itemCode}</div>
                    </td>
                    <td>{it.sjNumber || sjNumber || "-"}</td>
                    <td>{it.sjDate || sjDate || "-"}</td>
                    <td className="text-right font-mono">
                      {it.pricePerUnit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono text-muted">
                      {(it.poQty ?? it.qty).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono text-muted">
                      {(it.dlvrQty ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono">
                      <input
                        type="number"
                        className="rn-table-input text-right"
                        value={it.suratJalanQty ?? it.qty}
                        onChange={(e) =>
                          handleUpdateItemQty(it.id, parseFloat(e.target.value))
                        }
                        min="0"
                        step="any"
                      />
                    </td>
                    <td className="text-right font-mono">
                      {it.rafaksi.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right font-mono font-medium text-ink">
                      {it.priceSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td>{it.remark || "-"}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="rn-btn-remove-row"
                        onClick={() => handleRemoveItem(it.id)}
                        title="Remove Item"
                        aria-label="Remove item"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="rn-table-total-row">
                <td colSpan={8} className="text-right font-bold">
                  Total
                </td>
                <td className="text-right font-mono font-bold">
                  {totalSuratJalanQty.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td></td>
                <td className="text-right font-mono font-bold">
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
        <div className="rn-form-footer">
          <div className="rn-footer-actions">
            <button type="submit" className="rn-btn-save">
              <Icon name="check" size={16} />
              <span>Save</span>
            </button>
            <button
              type="button"
              className="rn-btn-cancel"
              onClick={onBack}
            >
              <Icon name="close" size={16} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </form>

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
