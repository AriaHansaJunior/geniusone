import React from "react";
import { KWT_LOGO_BASE64 } from "./kwtLogoData";

export interface KwtPrPrintItem {
  no?: number;
  itemName: string;
  quantity: string | number;
  unit: string;
  requiredDate?: string;
  facility?: string;
  remark?: string;
}

export interface KwtPrintPrProps {
  variant?: "internal" | "eksternal";
  docNumber: string;
  date: string;
  department: string;
  section?: string;
  items: KwtPrPrintItem[];
  approved1By?: string;
  approved2By?: string;
  createdBy?: string;
}

export const KwtPrintTemplatePr: React.FC<KwtPrintPrProps> = ({
  variant = "internal",
  docNumber,
  date,
  department,
  section = "Operations",
  items = [],
  approved1By,
  approved2By,
  createdBy,
}) => {
  const isInternal = variant === "internal";
  const formCode = isInternal ? "KWT-PPIC-001" : "KWT-PPIC-002";
  const docTitle = isInternal ? "PERMINTAAN PEMBELIAN INTERNAL" : "PERMINTAAN PEMBELIAN";

  // Standard minimum 11 rows to preserve standard paper layout
  const minRows = 11;
  const totalRows = Math.max(items.length, minRows);
  const emptyRowCount = totalRows - items.length;

  return (
    <div className="kwt-print-sheet kwt-print-target">
      {/* Document Top Header Identifier */}
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

      {/* Main Document Box with Double Border */}
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
                      <td className="kwt-meta-val">{date || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Department</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{department || "-"}</td>
                    </tr>
                    <tr>
                      <td className="kwt-meta-label">Section</td>
                      <td className="kwt-meta-colon">:</td>
                      <td className="kwt-meta-val">{section || "Operations"}</td>
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
            <col style={{ width: "5%" }} />
            <col style={{ width: "32%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "22%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: "5%" }}>No.</th>
              <th style={{ width: "32%" }}>Nama Barang</th>
              <th style={{ width: "10%" }}>Jumlah</th>
              <th style={{ width: "9%" }}>Satuan</th>
              <th style={{ width: "15%" }}>Tanggal Diperlukan</th>
              <th style={{ width: "7%" }}>F / NF</th>
              <th style={{ width: "22%" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const facUpper = String(item.facility || "").toUpperCase();
              const isNonFac = facUpper.includes("NON") || facUpper.includes("NF");
              const fnfLabel = facUpper ? (isNonFac ? "NF" : "F") : "NF";

              return (
                <tr key={`item-${idx}`}>
                  <td className="kwt-col-center">{item.no || idx + 1}</td>
                  <td className="kwt-col-left">{item.itemName}</td>
                  <td className="kwt-col-center">
                    {typeof item.quantity === "number"
                      ? item.quantity.toLocaleString("id-ID")
                      : item.quantity}
                  </td>
                  <td className="kwt-col-center">{item.unit || "PCE"}</td>
                  <td className="kwt-col-center">{item.requiredDate || date || "-"}</td>
                  <td className="kwt-col-center">{fnfLabel}</td>
                  <td className="kwt-col-left">{item.remark || "-"}</td>
                </tr>
              );
            })}

            {/* Empty padding rows to maintain standard document structure */}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="kwt-row-empty">
                <td>&nbsp;</td>
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

        {/* Legend Box */}
        <div className="kwt-legend-box">
          <div>F &nbsp;: Fasilitas</div>
          <div>NF : Non Fasilitas</div>
        </div>

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
                  {isInternal ? (
                    // KWT-PPIC-001 (Internal): Disetujui (Manager) & Diminta (User)
                    <>
                      <div className="kwt-sign-col">
                        <span className="kwt-sign-title">Disetujui oleh:</span>
                        <div className="kwt-sign-space">
                          {approved1By && (
                            <span className="kwt-sign-actor">Approved by {approved1By}</span>
                          )}
                        </div>
                        <span className="kwt-sign-role">(Manager)</span>
                      </div>
                      <div className="kwt-sign-col">
                        <span className="kwt-sign-title">Diminta oleh:</span>
                        <div className="kwt-sign-space">
                          {createdBy && (
                            <span className="kwt-sign-actor">{createdBy.split(" ")[0]}</span>
                          )}
                        </div>
                        <span className="kwt-sign-role">(User)</span>
                      </div>
                    </>
                  ) : (
                    // KWT-PPIC-002 (Eksternal): Disetujui (Direktur), Disetujui (Manager) & Diminta (User)
                    <>
                      <div className="kwt-sign-col">
                        <span className="kwt-sign-title">Disetujui oleh:</span>
                        <div className="kwt-sign-space">
                          {approved2By && (
                            <span className="kwt-sign-actor">Approved by {approved2By}</span>
                          )}
                        </div>
                        <span className="kwt-sign-role">(Direktur)</span>
                      </div>
                      <div className="kwt-sign-col">
                        <span className="kwt-sign-title">Disetujui oleh:</span>
                        <div className="kwt-sign-space">
                          {approved1By && (
                            <span className="kwt-sign-actor">Approved by {approved1By}</span>
                          )}
                        </div>
                        <span className="kwt-sign-role">(Manager)</span>
                      </div>
                      <div className="kwt-sign-col">
                        <span className="kwt-sign-title">Diminta oleh:</span>
                        <div className="kwt-sign-space">
                          {createdBy && (
                            <span className="kwt-sign-actor">{createdBy.split(" ")[0]}</span>
                          )}
                        </div>
                        <span className="kwt-sign-role">(User)</span>
                      </div>
                    </>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

