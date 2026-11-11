import React from "react";
import { KWT_LOGO_BASE64 } from "./kwtLogoData";

export interface KwtNpbPrintItem {
  no?: number;
  itemName: string;
  quantity: string | number;
  unit: string;
  remark?: string;
}

export interface KwtPrintNpbProps {
  docNumber: string;
  requestDate: string;
  destinationWarehouse: string;
  departmentFrom: string;
  items: KwtNpbPrintItem[];
  notes?: string;
  knownBy?: string;
  receivedBy?: string;
  handedOverBy?: string;
  requestedBy?: string;
}

export const KwtPrintTemplateNpb: React.FC<KwtPrintNpbProps> = ({
  docNumber,
  requestDate,
  destinationWarehouse,
  departmentFrom,
  items = [],
  notes = "",
  knownBy,
  receivedBy,
  handedOverBy,
  requestedBy,
}) => {
  const formCode = "KWT-PPIC-004";
  const docTitle = "NOTA PERMINTAAN BARANG";

  // Standard minimum 11 rows to preserve standard paper layout
  const minRows = 11;
  const totalRows = Math.max(items.length, minRows);
  const emptyRowCount = totalRows - items.length;

  return (
    <div className="kwt-print-sheet kwt-print-target">
      {/* Top Form Identification */}
      <div className="kwt-doc-header-meta">
        <table className="kwt-doc-header-meta-table">
          <tbody>
            <tr>
              <td style={{ width: "42px" }}>Form</td>
              <td style={{ width: "10px", textAlign: "center" }}>:</td>
              <td>{formCode}</td>
            </tr>
            <tr>
              <td>Rev</td>
              <td style={{ textAlign: "center" }}>:</td>
              <td>1</td>
            </tr>
            <tr>
              <td>Date</td>
              <td style={{ textAlign: "center" }}>:</td>
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
                      <td className="kwt-meta-label">Tanggal</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{requestDate || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Ke Gudang</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{destinationWarehouse || "Gudang Bahan Baku"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Dari</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{departmentFrom || "PPIC / Produksi"}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table className="kwt-items-table">
          <colgroup>
            <col style={{ width: "6%" }} />
            <col style={{ width: "42%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: "6%" }}>No.</th>
              <th style={{ width: "42%" }}>Nama Barang</th>
              <th style={{ width: "12%" }}>Jumlah</th>
              <th style={{ width: "10%" }}>Satuan</th>
              <th style={{ width: "30%" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`npb-item-${idx}`}>
                <td className="kwt-col-center">{item.no || idx + 1}</td>
                <td className="kwt-col-left">{item.itemName}</td>
                <td className="kwt-col-center">
                  {typeof item.quantity === "number"
                    ? item.quantity.toLocaleString("id-ID")
                    : item.quantity}
                </td>
                <td className="kwt-col-center">{item.unit || "PCE"}</td>
                <td className="kwt-col-left">{item.remark || "-"}</td>
              </tr>
            ))}

            {/* Empty padding rows */}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`npb-empty-${i}`} className="kwt-row-empty">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer: Catatan + 4-Column Signatures */}
        <table className="kwt-npb-footer">
          <tbody>
            <tr>
              <td className="kwt-npb-notes-cell">
                <div className="kwt-npb-notes-title">Catatan:</div>
                <div className="kwt-npb-notes-content">
                  {notes ? (
                    notes
                  ) : (
                    <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                      Tidak ada catatan khusus
                    </span>
                  )}
                </div>
              </td>
              <td className="kwt-npb-signs-cell">
                <table className="kwt-npb-signs-table">
                  <thead>
                    <tr>
                      <th>Diketahui</th>
                      <th>Diterima</th>
                      <th>Diserahkan</th>
                      <th>Diminta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{knownBy && <span>{knownBy}</span>}</td>
                      <td>{receivedBy && <span>{receivedBy}</span>}</td>
                      <td>{handedOverBy && <span>{handedOverBy}</span>}</td>
                      <td>{requestedBy && <span>{requestedBy}</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

