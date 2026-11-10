import React, { useMemo, useState, useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";

export interface PrItemToPick {
  id: string; // unique row id
  prId: number;
  prNumber: string;
  prDate: string;
  deptRequest: string;
  section: string;
  pr_has_items_id: number;
  items_id: number;
  itemCode: string;
  itemName: string;
  itemAlias?: string;
  requestedQty: number;
  orderedQty: number;
  remainingQty: number;
  unit: string;
  facility: string;
  remark: string;
  price?: number;
  dueDate?: string;
  hasPo: boolean;
  poCount: number;
  percentageLme?: number;
  lme?: number;
}

interface PickPrItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (selectedItems: PrItemToPick[]) => void;
  alreadySelectedPrItemIds?: number[];
  facilityFilter?: string | null;
}

export function PickPrItemModal({
  isOpen,
  onClose,
  onAddItems,
  alreadySelectedPrItemIds = [],
  facilityFilter = null,
}: PickPrItemModalProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsList, setItemsList] = useState<PrItemToPick[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch approved PR items from backend API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    fetch("/api/procurement/pr?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        setLoading(false);

        const prs = d?.data?.data || d?.rows || (Array.isArray(d?.data) ? d.data : []);
        if (Array.isArray(prs) && prs.length > 0) {
          const availableItems: PrItemToPick[] = [];

          prs.forEach((pr: any) => {
            // Must have approved 2x (Stage 2 Approved) and not rejected or draft
            const isApproved2 =
              pr.is_approved_2 === true ||
              pr.is_approved === true ||
              pr.status === "Approved" ||
              pr.status === "Outstanding" ||
              pr.status === "Partial Closing" ||
              pr.approval_status === "Approved" ||
              (Array.isArray(pr.approvals) &&
                pr.approvals.some(
                  (a: any) =>
                    (a.tier === 2 || a.approval_ke == 2) &&
                    (a.status === 1 || a.status === "Approved")
                ));

            // Skip PRs that are not approved 2x or are completely closed
            if (!isApproved2 || pr.status === "Closing") {
              return;
            }

            const prNum = pr.pr_number || pr.prNumber || pr._rawNumber || "";
            const prDt = pr.date || pr._rawDate || "-";
            const dept = pr.deptRequest || pr._rawDept || pr.department?.name || "-";
            const sec = pr.section || pr._rawSection || "Operations";
            const rawItems = pr.items || pr._items || [];

            rawItems.forEach((it: any, idx: number) => {
              // Skip closed items
              if (it.is_closed || it.isClosed) {
                return;
              }

              const prItemId = Number(it.pr_has_items_id || it.id || idx);
              const itemsId = Number(it.items_id || it.item_id || 0);
              const reqQty = Number(it.rawQty || it.qty || it.quantity || 1);
              const ordQty = Number(it.ordered_qty || 0);
              const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
              const fac = String(it.facility || it.facility_status || "FASILITAS");
              const hasPo = Boolean(it.has_po || it.hasPo || ordQty > 0);
              const poCount = Number(it.po_count || (hasPo ? 1 : 0));

              // Only show items that have NOT been fully ordered yet (remaining quantity > 0)
              // This includes items not yet entered into PO (ordQty === 0) as well as outstanding (remQty > 0)
              if (remQty <= 0) {
                return;
              }

              availableItems.push({
                id: `pr-${pr.id || prNum}-item-${prItemId}`,
                prId: Number(pr.id || 0),
                prNumber: prNum,
                prDate: prDt,
                deptRequest: dept,
                section: sec,
                pr_has_items_id: prItemId,
                items_id: itemsId,
                itemCode: it.itemCode || it.code || "-",
                itemName: it.itemName || it.item || "Material Item",
                itemAlias: it.itemAlias || it.itemCode || it.code || "—",
                requestedQty: reqQty,
                orderedQty: ordQty,
                remainingQty: remQty,
                unit: it.unit || "PCE",
                facility: fac,
                remark: it.remark || it.note || pr.remark || pr._rawRemark || "-",
                dueDate: it.dueDate || pr.dueDate || "-",
                hasPo,
                poCount,
                percentageLme: Number(it.percentage_lme || it.percentageLme || it.lmePercentage || 0),
                lme: Number(it.lme || 0),
              });
            });
          });

          setItemsList(availableItems);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter available items based on search, selection, facility, and remaining quantity
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      // Exclude items already selected in current PO form
      if (alreadySelectedPrItemIds.includes(item.pr_has_items_id)) {
        return false;
      }

      // Only show items that still need to be ordered/purchased (remainingQty > 0)
      if (item.remainingQty <= 0) {
        return false;
      }

      // Facility filter if specified
      if (facilityFilter) {
        const normFilter = facilityFilter.toUpperCase().includes("NON") ? "NON FASILITAS" : "FASILITAS";
        const itemFac = (item.facility || "FASILITAS").toUpperCase().includes("NON") ? "NON FASILITAS" : "FASILITAS";
        if (normFilter !== itemFac) {
          return false;
        }
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      return (
        item.prNumber.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.deptRequest.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.remark.toLowerCase().includes(q)
      );
    });
  }, [itemsList, alreadySelectedPrItemIds, facilityFilter, search]);

  // Pagination
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(startIdx, startIdx + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  if (!isOpen) return null;

  const isAllPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.has(item.id));

  const handleTogglePageSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.add(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.delete(item.id));
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmAdd = () => {
    const chosen = itemsList.filter((item) => selectedIds.has(item.id));
    if (chosen.length > 0) {
      onAddItems(chosen);
    }
    setSelectedIds(new Set());
    onClose();
  };

  const handleResetAndClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div
      className="item-picker-backdrop"
      onClick={handleResetAndClose}
      role="presentation"
    >
      <div
        className="item-picker-modal"
        style={{ maxWidth: "1180px" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-picker-title"
      >
        {/* Modal Header */}
        <div className="item-picker-header">
          <div className="item-picker-title-area">
            <h3 id="pr-picker-title">Pick Purchase Requisition Item</h3>
            <span className="item-picker-badge">
              {filteredItems.length} available
            </span>
          </div>
          <button
            type="button"
            className="item-picker-close-btn"
            onClick={handleResetAndClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="item-picker-toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div className="item-picker-search-group" style={{ flex: 1, minWidth: "260px" }}>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search PR number, item code, item name, dept..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="picker-btn picker-btn--select-all"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="picker-btn picker-btn--clear-all"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="item-picker-table-wrapper">
          <table className="data-table item-picker-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleTogglePageSelectAll}
                    disabled={paginatedItems.length === 0}
                    aria-label="Select all items on this page"
                  />
                </th>
                <th style={{ width: "45px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "155px" }}>PR Number</th>
                <th style={{ minWidth: "90px" }}>Date</th>
                <th style={{ minWidth: "95px" }}>Dept. Request</th>
                <th style={{ minWidth: "115px" }}>Item Code</th>
                <th style={{ minWidth: "200px" }}>Item Name</th>
                <th style={{ minWidth: "65px" }}>Unit</th>
                <th style={{ minWidth: "90px", textAlign: "right" }}>Req. Qty</th>
                <th style={{ minWidth: "90px", textAlign: "right" }}>Rem. Qty</th>
                <th style={{ minWidth: "105px", textAlign: "center" }}>Facility</th>
                <th style={{ minWidth: "140px" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="empty-table-cell" style={{ padding: "40px 20px" }}>
                    <div className="empty">
                      <strong>Loading approved requisition items...</strong>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="empty-table-cell" style={{ padding: "40px 20px" }}>
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No available requisition items found</strong>
                      <span>
                        Make sure the Purchase Requisition is approved twice and items are not closed or already fully ordered.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const isChecked = selectedIds.has(item.id);
                  const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                  const isNonFac = item.facility.toUpperCase().includes("NON");

                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "row--selected" : ""}
                      onClick={() => handleToggleRow(item.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select ${item.itemName}`}
                        />
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>
                        {rowNumber}
                      </td>
                      <td>
                        <strong className="cell-code">{item.prNumber}</strong>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ink-soft)" }}>
                        {item.prDate}
                      </td>
                      <td>
                        <span className="cell-dept">{item.deptRequest}</span>
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.itemName}
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.requestedQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: 700,
                          color: item.remainingQty > 0 ? "var(--blue-600, #2563eb)" : "var(--muted)",
                        }}
                      >
                        {item.remainingQty.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Badge tone={isNonFac ? "gray" : "purple"}>
                          {isNonFac ? "Non Facility" : "Facility"}
                        </Badge>
                      </td>
                      <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                        {item.remark || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="item-picker-footer">
          <div className="item-picker-footer-left">
            <Pagination
              totalRecords={totalRecords}
              currentPage={safeCurrentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="item-picker-footer-right">
            <span className="item-picker-selected-summary">
              {selectedIds.size} item(s) selected
            </span>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmAdd}
              disabled={selectedIds.size === 0}
            >
              Add Item(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PickPrItemModal;

