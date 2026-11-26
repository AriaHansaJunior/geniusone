import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { Pagination } from "../../../components/ui/Pagination";
import { SearchField } from "../../../components/ui/SearchField";
import { TableLoadingRow } from "../../../components/ui/LoadingBuffer";
import { useNotification } from "../../../context/NotificationContext";
import {
  fetchMasterLookupsApi,
  fetchWarehouseStockTransfersApi,
  postWarehouseStockTransferApi,
} from "../../../data/masterApi";
import type { WarehouseStockTransferRecord } from "./warehouse-stock-transfer-types";

interface WarehouseStockTransferIndexProps {
  onAddNew: () => void;
  onOpenDetail: (code: string) => void;
}

function statusBadgeTone(status: string): "green" | "orange" | "red" | "gray" {
  if (status === "Posted") return "green";
  if (status === "Draft") return "orange";
  if (status === "Cancelled") return "red";
  return "gray";
}

export function WarehouseStockTransferIndex({
  onAddNew,
  onOpenDetail,
}: WarehouseStockTransferIndexProps) {
  const { notifySuccess, notifyError } = useNotification();

  const [records, setRecords] = useState<WarehouseStockTransferRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceWhFilter, setSourceWhFilter] = useState("ALL");
  const [destWhFilter, setDestWhFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [rows, lookups] = await Promise.all([
        fetchWarehouseStockTransfersApi(),
        fetchMasterLookupsApi().catch(() => null),
      ]);
      setRecords(rows);
      const whList = Array.isArray(lookups?.warehouses) ? lookups.warehouses : [];
      setWarehouses(whList.map((w: any) => ({ id: Number(w.id), name: String(w.name) })));
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load warehouse stock transfers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const onChanged = () => loadData();
    window.addEventListener("geniusone_approval_changed", onChanged);
    return () => window.removeEventListener("geniusone_approval_changed", onChanged);
  }, [loadData]);

  const handleQuickPost = async (rec: WarehouseStockTransferRecord) => {
    try {
      setPostingId(rec.id);
      const res = await postWarehouseStockTransferApi(rec.id);
      notifySuccess("Stock Transfer Posted", res.message || `${rec.transferNumber} posted.`);
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      await loadData();
    } catch (err: any) {
      notifyError("Post Transfer Failed", err?.message || "Failed to post stock transfer.");
    } finally {
      setPostingId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((rec) => {
      if (q) {
        const hay = `${rec.transferNumber} ${rec.sourceWarehouseName} ${rec.destinationWarehouseName} ${rec.referenceCode || ""} ${rec.note || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "ALL" && rec.status !== statusFilter) return false;
      if (sourceWhFilter !== "ALL" && String(rec.sourceWarehouseId) !== sourceWhFilter) return false;
      if (destWhFilter !== "ALL" && String(rec.destinationWarehouseId) !== destWhFilter) return false;
      return true;
    });
  }, [records, search, statusFilter, sourceWhFilter, destWhFilter]);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safePage, pageSize]);

  return (
    <div className="wst-page">
      <div className="wst-card">
        <div className="wst-toolbar">
          <div className="wst-filter-grid">
            <div>
              <label className="master-form-label">Search</label>
              <SearchField
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder="Transfer no, reference, warehouse..."
              />
            </div>

            <div>
              <label className="master-form-label">Source Warehouse</label>
              <CustomSelect
                searchable
                value={sourceWhFilter}
                onChange={(val) => {
                  setSourceWhFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "ALL", label: "All Sources" },
                  ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
                ]}
              />
            </div>

            <div>
              <label className="master-form-label">Destination Warehouse</label>
              <CustomSelect
                searchable
                value={destWhFilter}
                onChange={(val) => {
                  setDestWhFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "ALL", label: "All Destinations" },
                  ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
                ]}
              />
            </div>

            <div>
              <label className="master-form-label">Status</label>
              <CustomSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "Posted", label: "Posted" },
                  { value: "Draft", label: "Draft" },
                  { value: "Cancelled", label: "Cancelled" },
                ]}
              />
            </div>
          </div>

          <Button type="button" variant="primary" onClick={onAddNew}>
            Add New
          </Button>
        </div>

        {errorMsg && <div className="wst-banner wst-banner--error">{errorMsg}</div>}
      </div>

      <div className="wst-table-card">
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="wst-col-no">No</th>
                  <th>Transfer Number</th>
                  <th>Date</th>
                  <th>Source Warehouse</th>
                  <th>Destination Warehouse</th>
                  <th className="wst-col-num">Items</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th className="wst-col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && paginatedRows.length === 0 ? (
                  <TableLoadingRow
                    colSpan={9}
                    label="Loading Warehouse Transfers..."
                    sublabel="Fetching inter-warehouse stock movements..."
                  />
                ) : paginatedRows.length > 0 ? (
                  paginatedRows.map((rec, idx) => {
                    const rowNo = (safePage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={rec.id}>
                        <td className="wst-col-no">{rowNo}</td>
                        <td>
                          <button
                            type="button"
                            className="wst-link-btn"
                            onClick={() => onOpenDetail(rec.transferNumber || String(rec.id))}
                          >
                            {rec.transferNumber}
                          </button>
                        </td>
                        <td>{rec.transferDate}</td>
                        <td>{rec.sourceWarehouseName}</td>
                        <td>{rec.destinationWarehouseName}</td>
                        <td className="wst-col-num">{rec.items.length}</td>
                        <td>
                          <Badge tone={statusBadgeTone(rec.status)}>{rec.status}</Badge>
                        </td>
                        <td>{rec.creatorName || "—"}</td>
                        <td className="wst-col-action">
                          <div className="wst-row-actions">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => onOpenDetail(rec.transferNumber || String(rec.id))}
                            >
                              View
                            </Button>
                            {rec.status === "Draft" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={postingId === rec.id}
                                onClick={() => handleQuickPost(rec)}
                              >
                                {postingId === rec.id ? "Posting..." : "Post"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="wst-empty">
                      No warehouse stock transfer records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            totalRecords={totalRecords}
            currentPage={safePage}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
