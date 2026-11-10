import React from "react";
import { KWT_LOGO_BASE64 } from "./kwtLogoData";

export interface KwtBpbPrintItem {
  no?: number;
  itemName: string;
  quantity: string | number;
  unit: string;
  noPp?: string; // Purchase Requisition / PO Number
  remark?: string;
}

export interface KwtPrintBpbProps {
  docNumber: string;
  receiveDate: string;
  sjNumber: string;
  supplierName: string;
  plateNo?: string;
  items: KwtBpbPrintItem[];
  knownBy?: string;
  controlledBy?: string;
  receivedBy?: string;
}

export const KwtPrintTemplateBpb: React.FC<KwtPrintBpbProps> = ({
  docNumber,
  receiveDate,
  sjNumber,
  supplierName,
  plateNo = "-",
  items = [],
  knownBy,
  controlledBy,
  receivedBy,
}) => {
  const formCode = "KWT-PPIC-003";
  const docTitle = "BUKTI PENERIMAAN BARANG";

  // Standard minimum 11 rows to preserve standard paper layout
  const minRows = 11;
  const totalRows = Math.max(items.length, minRows);
  const emptyRowCount = totalRows - items.length;

  return (
    <div className="kwt-print-sheet kwt-print-target">
      {/* Top Form Identification */}
      <div className="kwt-doc-header-meta">
        <table>
          <tbody>
            <tr>
              <td>Form</td>
              <td>:</td>
              <td>{formCode}</td>
            </tr>
            <tr>
              <td>Rev</td>
              <td>:</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Date</td>
              <td>:</td>
              <td>10.11.2026</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Main Outer Box with Double Border */}
      <div className="kwt-doc-box">
        {/* Header Table */}
        <table className="kwt-header-table">
          <tbody>
            <tr>
              <td className="kwt-header-left">
                <div className="kwt-header-left-inner">
                  <img
                    src={KWT_LOGO_BASE64}
                    alt="PT. KARABHA WIRATAMA"
                    className="kwt-header-logo"
                  />
                  <div className="kwt-header-titles">
                    <h1 className="kwt-header-company-name">PT. KARABHA WIRATAMA</h1>
                    <h2 className="kwt-header-doc-title">{docTitle}</h2>
                  </div>
                </div>
              </td>
              <td className="kwt-header-right">
                <table className="kwt-meta-table">
                  <tbody>
                    <tr>
                      <td className="kwt-meta-label">No.</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{docNumber || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Tgl. Terima</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{receiveDate || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">No. SJ/Nota</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{sjNumber || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Terima Dari</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{supplierName || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">No. Polisi/Cont.</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{plateNo || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="kwt-items-table">
          <thead>
            <tr>
              <th style={{ width: "35px" }}>No.</th>
              <th style={{ width: "270px" }}>Nama Barang</th>
              <th style={{ width: "70px" }}>Jumlah</th>
              <th style={{ width: "60px" }}>Satuan</th>
              <th style={{ width: "130px" }}>No. PP</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`bpb-item-${idx}`}>
                <td className="kwt-col-center">{item.no || idx + 1}</td>
                <td className="kwt-col-left">{item.itemName}</td>
                <td className="kwt-col-center">
                  {typeof item.quantity === "number"
                    ? item.quantity.toLocaleString("id-ID")
                    : item.quantity}
                </td>
                <td className="kwt-col-center">{item.unit || "PCE"}</td>
                <td className="kwt-col-center">{item.noPp || "-"}</td>
                <td className="kwt-col-left">{item.remark || "-"}</td>
              </tr>
            ))}

            {/* Empty padding rows */}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`bpb-empty-${i}`} className="kwt-row-empty">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer & Signatures */}
        <table className="kwt-footer-table">
          <tbody>
            <tr>
              <td className="kwt-distribution-cell">
                <div className="kwt-distribution-list">
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">1</span>
                    <span className="kwt-dist-color">Putih</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Commercial</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">2</span>
                    <span className="kwt-dist-color">Kuning</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Finance</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">3</span>
                    <span className="kwt-dist-color">Hijau</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Accounting</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">4</span>
                    <span className="kwt-dist-color">Merah</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">PPIC</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="kwt-signatures-container">
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Diketahui oleh:</span>
                    <div className="kwt-sign-space">
                      {knownBy && <span className="kwt-sign-actor">{knownBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Dikontrol oleh:</span>
                    <div className="kwt-sign-space">
                      {controlledBy && <span className="kwt-sign-actor">{controlledBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Diterima oleh:</span>
                    <div className="kwt-sign-space">
                      {receivedBy && <span className="kwt-sign-actor">{receivedBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

