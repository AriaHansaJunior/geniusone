import React from "react";
import { KWT_LOGO_BASE64 } from "./kwtLogoData";

export interface KwtDoPrintItem {
  no?: number;
  quantity: string | number;
  unit: string;
  itemName: string;
}

export interface KwtPrintDoProps {
  docNumber: string;
  deliveryDate: string;
  vehicle?: string;
  plateNo?: string;
  customerName?: string;
  customerAddress?: string;
  items: KwtDoPrintItem[];
  receivedBy?: string;
  approvedBy?: string;
  knownBy?: string;
  preparedBy?: string;
}

export const KwtPrintTemplateDo: React.FC<KwtPrintDoProps> = ({
  docNumber,
  deliveryDate,
  vehicle = "",
  plateNo = "",
  customerName = "",
  customerAddress = "",
  items = [],
  receivedBy,
  approvedBy,
  knownBy,
  preparedBy,
}) => {
  const minRows = 10;
  const totalRows = Math.max(items.length, minRows);
  const emptyRowCount = totalRows - items.length;

  const recipientDisplay = [customerName, customerAddress].filter(Boolean).join("\n");

  return (
    <div className="kwt-print-sheet kwt-print-target">
      {/* Top Form Identification */}
      <div className="kwt-doc-header-meta">
        <table className="kwt-doc-header-meta-table">
          <tbody>
            <tr>
              <td className="kwt-doc-header-meta-label">Form</td>
              <td className="kwt-doc-header-meta-colon">:</td>
              <td>KWT-PPIC-006</td>
            </tr>
            <tr>
              <td>Rev</td>
              <td className="kwt-doc-header-meta-colon">:</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Date</td>
              <td className="kwt-doc-header-meta-colon">:</td>
              <td>10.11.2026</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Main Outer Box with Double Border */}
      <div className="kwt-doc-box">
        {/* Full-Width Company & Title Header */}
        <div className="kwt-do-header-band">
          <img
            src={KWT_LOGO_BASE64}
            alt="PT. KARABHA WIRATAMA"
            className="kwt-header-logo"
          />
          <div className="kwt-do-header-titles">
            <h1 className="kwt-header-company-name">PT. KARABHA WIRATAMA</h1>
            <p className="kwt-header-company-addr">
              Jl. Raya Tegal - Pemalang No. KM 10, Kab. Tegal, Jawa Tengah 52181
            </p>
            <h2 className="kwt-header-doc-title">DELIVERY ORDER</h2>
          </div>
        </div>

        {/* Sub-Header Metadata Band */}
        <table className="kwt-do-subheader-table">
          <tbody>
            <tr>
              <td className="kwt-do-subheader-left">
                <table className="kwt-meta-table">
                  <tbody>
                    <tr>
                      <td className="kwt-meta-label">No. DO</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{docNumber || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Tanggal</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{deliveryDate || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Kendaraan</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{vehicle || ""}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">No. Polisi</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{plateNo || ""}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
              <td className="kwt-do-subheader-right">
                <div className="kwt-do-kepada-box">
                  <span>Kepada :</span>
                  <span className="kwt-do-kepada-val">{recipientDisplay}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table: No. | Jumlah | Satuan | Nama Barang */}
        <table className="kwt-items-table">
          <colgroup>
            <col className="kwt-w-6" />
            <col className="kwt-w-11" />
            <col className="kwt-w-11" />
            <col className="kwt-w-72" />
          </colgroup>
          <thead>
            <tr>
              <th className="kwt-w-6">No.</th>
              <th className="kwt-w-11">Jumlah</th>
              <th className="kwt-w-11">Satuan</th>
              <th className="kwt-w-72">Nama Barang</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`do-item-${idx}`}>
                <td className="kwt-col-center">{item.no || idx + 1}</td>
                <td className="kwt-col-center">
                  {typeof item.quantity === "number"
                    ? item.quantity.toLocaleString("id-ID")
                    : item.quantity}
                </td>
                <td className="kwt-col-center">{item.unit || ""}</td>
                <td className="kwt-col-left">{item.itemName}</td>
              </tr>
            ))}

            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`do-empty-${i}`} className="kwt-row-empty">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Open Footer & 4 Signature Columns (no internal vertical lines per PDF) */}
        <table className="kwt-footer-table kwt-footer-table--open">
          <tbody>
            <tr>
              <td className="kwt-distribution-cell">
                <div className="kwt-distribution-list">
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">1.</span>
                    <span className="kwt-dist-color">Putih</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Customer</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">2.</span>
                    <span className="kwt-dist-color">Merah</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Commercial</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">3.</span>
                    <span className="kwt-dist-color">Biru</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Accounting</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">4.</span>
                    <span className="kwt-dist-color">Kuning</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">PPIC</span>
                  </div>
                  <div className="kwt-distribution-item">
                    <span className="kwt-dist-num">5.</span>
                    <span className="kwt-dist-color">Hijau</span>
                    <span className="kwt-dist-colon">:</span>
                    <span className="kwt-dist-target">Customer</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="kwt-signatures-container kwt-signatures-container--open">
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Diterima oleh:</span>
                    <div className="kwt-sign-space">
                      {receivedBy && <span className="kwt-sign-actor">{receivedBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Disetujui oleh:</span>
                    <div className="kwt-sign-space">
                      {approvedBy && <span className="kwt-sign-actor">{approvedBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Diketahui oleh:</span>
                    <div className="kwt-sign-space">
                      {knownBy && <span className="kwt-sign-actor">{knownBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
                  </div>
                  <div className="kwt-sign-col">
                    <span className="kwt-sign-title">Dibuat oleh:</span>
                    <div className="kwt-sign-space">
                      {preparedBy && <span className="kwt-sign-actor">{preparedBy}</span>}
                    </div>
                    <span className="kwt-sign-role">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
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
