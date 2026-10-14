import React from "react";
import type { ExpandedHistoryRecord } from "./document-history-types";

interface ExpandedHistoryTableProps {
  history: ExpandedHistoryRecord[];
}

export function ExpandedHistoryTable({ history }: ExpandedHistoryTableProps) {
  if (!history || history.length === 0) {
    return (
      <div className="dh-expanded-empty">
        No document history records available for this item.
      </div>
    );
  }

  return (
    <div className="dh-expanded-table-container">
      <div className="dh-expanded-accent-bar" />
      <div className="dh-expanded-scroll-wrapper">
        <table className="dh-expanded-table">
          <thead>
            <tr>
              <th className="dh-expanded-th-lead"></th>
              <th>Nama Barang</th>
              <th>Production Number</th>
              <th>SPK Number</th>
              <th>Nomor Aju</th>
              <th>Nomor Daftar</th>
              <th className="text-center">Jenis Dokumen</th>
              <th className="text-center">Seri Barang</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Netto</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td className="dh-expanded-td-lead"></td>
                <td>
                  <div className="font-medium text-ink">{row.namaBarang}</div>
                  <div className="text-xs text-muted font-mono">{row.itemCode}</div>
                </td>
                <td>
                  <div>{row.productionNumber || "-"}</div>
                  <div className="text-xs text-muted">
                    Date: {row.productionDate || "-"}
                  </div>
                </td>
                <td>{row.spkNumber || "-"}</td>
                <td>
                  <div className="font-mono text-xs">{row.nomorAju || "-"}</div>
                  {row.nomorAjuDate && row.nomorAjuDate !== "-" && (
                    <div className="text-xs text-muted">
                      Date: {row.nomorAjuDate}
                    </div>
                  )}
                </td>
                <td>
                  <div className="font-mono text-xs">{row.nomorDaftar || "-"}</div>
                  {row.nomorDaftarDate && row.nomorDaftarDate !== "-" && (
                    <div className="text-xs text-muted">
                      Date: {row.nomorDaftarDate}
                    </div>
                  )}
                </td>
                <td className="text-center font-mono">{row.jenisDokumen || "-"}</td>
                <td className="text-center">{row.seriBarang || "-"}</td>
                <td className="text-right font-mono font-medium">{row.qtyFormatted}</td>
                <td className="text-right font-mono font-medium">{row.nettoFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExpandedHistoryTable;
