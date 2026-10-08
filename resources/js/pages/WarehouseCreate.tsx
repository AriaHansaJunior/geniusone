import { useState } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Material } from "../components/common/CommonCells";

interface WarehouseCreateProps {
  onBack: () => void;
  onSaved: () => void;
}

export function WarehouseCreate({ onBack, onSaved }: WarehouseCreateProps) {
  const [rnNumber, setRnNumber] = useState("0131/RN-IMLI/X/2026");
  const [bpbType, setBpbType] = useState("Gudang");
  const [supplier, setSupplier] = useState("PT. Hasil Fastindo");
  const [receiveDate, setReceiveDate] = useState("08-10-2026");

  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-10-092");
  const [invoiceDate, setInvoiceDate] = useState("08-10-2026");
  const [taxInvoice, setTaxInvoice] = useState("010.002-26.88371920");
  const [plateNo, setPlateNo] = useState("L 8372 VQ");
  const [ajuNumber, setAjuNumber] = useState("00004001456220261008004282");
  const [ajuDate, setAjuDate] = useState("08-10-2026");
  const [noPen, setNoPen] = useState("088370");
  const [regDate, setRegDate] = useState("08-10-2026");
  const [remark, setRemark] = useState("");

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    onSaved();
  };

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Receive Material</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Receive Material</a>
            <span>/</span>
            <span className="current">Create Receive Material</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Button variant="ghost" onClick={onBack}>
            Discard Draft
          </Button>
          <Button icon="check" onClick={handleSubmit}>
            Save Receive Material
          </Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">NEW WAREHOUSE MUTATION ENTRY</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">Create Receive Material (BPB)</h2>
          </div>
          <span className="detail-header-card__meta">
            Record incoming physical stock receipt, customs clearance data, delivery notes, and inventory placement.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="create-page-grid">
        {/* Card 1: Document & Supplier Header */}
        <div className="create-form-card">
          <div className="create-form-card__header">
            <h3>
              <Icon name="file" size={16} />
              <span>Document & Supplier Information</span>
            </h3>
            <span>Requisition and Vendor Identifiers</span>
          </div>

          <div className="form-grid-4">
            <div className="form-group">
              <label>RN Number</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={rnNumber}
                  onChange={(e) => setRnNumber(e.target.value)}
                  placeholder="Select RN Number..."
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon="search"
                  style={{ padding: "8px 12px" }}
                  aria-label="Search RN Number"
                />
              </div>
            </div>

            <div className="form-group">
              <label>BPB Type</label>
              <select
                className="form-select"
                value={bpbType}
                onChange={(e) => setBpbType(e.target.value)}
              >
                <option value="Gudang">Warehouse (Gudang)</option>
                <option value="Timbangan">Scale (Timbangan)</option>
                <option value="Pembelian Langsung">Direct Purchase</option>
              </select>
            </div>

            <div className="form-group">
              <label>Supplier Name</label>
              <input
                type="text"
                className="form-input"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Enter supplier name..."
                required
              />
            </div>

            <div className="form-group">
              <label>Receive Date</label>
              <input
                type="text"
                className="form-input"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                required
              />
            </div>
          </div>
        </div>

        {/* Card 2: Customs, Taxes & Logistics */}
        <div className="create-form-card">
          <div className="create-form-card__header">
            <h3>
              <Icon name="archive" size={16} />
              <span>Customs, Invoicing & Logistics Information</span>
            </h3>
            <span>Filing Declarations & Delivery Compliance</span>
          </div>

          <div className="form-grid-4">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                className="form-input"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-XXXX-XX-XXX"
              />
            </div>

            <div className="form-group">
              <label>Invoice Date</label>
              <input
                type="text"
                className="form-input"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>

            <div className="form-group">
              <label>Tax Invoice (Faktur Pajak)</label>
              <input
                type="text"
                className="form-input"
                value={taxInvoice}
                onChange={(e) => setTaxInvoice(e.target.value)}
                placeholder="010.002-XX.XXXXXXXX"
              />
            </div>

            <div className="form-group">
              <label>Vehicle License Plate (No. Pol)</label>
              <input
                type="text"
                className="form-input"
                value={plateNo}
                onChange={(e) => setPlateNo(e.target.value)}
                placeholder="e.g. L 8372 VQ"
              />
            </div>

            <div className="form-group">
              <label>Aju Number (Customs Barcode)</label>
              <input
                type="text"
                className="form-input"
                value={ajuNumber}
                onChange={(e) => setAjuNumber(e.target.value)}
                placeholder="000040014562..."
              />
            </div>

            <div className="form-group">
              <label>Aju Date</label>
              <input
                type="text"
                className="form-input"
                value={ajuDate}
                onChange={(e) => setAjuDate(e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>

            <div className="form-group">
              <label>Registration Number (No. Pen)</label>
              <input
                type="text"
                className="form-input"
                value={noPen}
                onChange={(e) => setNoPen(e.target.value)}
                placeholder="e.g. 088370"
              />
            </div>

            <div className="form-group">
              <label>Registration Date</label>
              <input
                type="text"
                className="form-input"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Material Items to Receive (Full-Width Table) */}
        <div className="create-form-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="create-form-card__header" style={{ margin: 0, padding: "16px 20px" }}>
            <h3>
              <Icon name="box" size={16} />
              <span>Material Items to Receive</span>
            </h3>
            <Button
              type="button"
              variant="secondary"
              icon="plus"
              style={{ fontSize: "11px", padding: "6px 12px" }}
              onClick={() => alert("Add line item modal or inline editor")}
            >
              Add Item Line
            </Button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="detail-data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "220px" }}>Material Item</th>
                  <th style={{ width: "100px" }}>Job Number</th>
                  <th style={{ width: "150px" }}>PO Number</th>
                  <th style={{ minWidth: "160px" }}>Delivery Note (SJ)</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Receive Quantity</th>
                  <th style={{ width: "150px" }}>Warehouse Location</th>
                  <th style={{ minWidth: "240px" }}>Description / Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>1</td>
                  <td>
                    <Material
                      name="Mur Baut M 10 x 40 + ring pir"
                      code="60.149.301.404"
                    />
                  </td>
                  <td>—</td>
                  <td>
                    <strong style={{ color: "var(--ink)", fontSize: "11px" }}>POL-0926-0332</strong>
                  </td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    SRA/H2/2610/00262
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                    25.00 PCE
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="Gudang Sparepart"
                      style={{ padding: "4px 8px", fontSize: "11px" }}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue="U/ Periodic Maintenance : Tutup motor 11 kw; 18,5 kw"
                      style={{ padding: "4px 8px", fontSize: "11px", width: "100%" }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 4: Receiving Notes & Remarks */}
        <div className="create-form-card">
          <div className="create-form-card__header">
            <h3>
              <Icon name="file" size={16} />
              <span>Receiving Note & Inspection Remark</span>
            </h3>
            <span>Special Handling & QA Instructions</span>
          </div>

          <div className="form-group">
            <label>Internal Note / Remark</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter additional receiving notes, seal inspection results, physical condition of goods..."
            />
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="create-actions-footer">
          <Button type="button" variant="secondary" onClick={onBack}>
            Cancel & Return
          </Button>
          <Button type="submit" icon="check">
            Save Receive Material
          </Button>
        </div>
      </form>
    </div>
  );
}

export default WarehouseCreate;
