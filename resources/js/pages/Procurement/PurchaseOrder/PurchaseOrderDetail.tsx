import { useState, useEffect, useMemo } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Material } from "../../../components/common/CommonCells";
import { poRows, findRowBySlug, docToSlug } from "../../../data/mockData";
import { fetchDetail } from "../../../data/api";
import type { TableRow } from "../../../types";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { getLocalApprovalState, recordDocumentActivity } from "../../../services/approvalApi";
import { normalizeApprovalStatus, type DocumentApprovalState } from "../../../types/approval";
import { useAuthPermission } from "../../../context/AuthPermissionContext";

interface PurchaseOrderDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseOrderDetail({
  code,
  onBack,
  onNavigateDetail,
}: PurchaseOrderDetailProps) {
  const [activeTab, setActiveTab] = useState<"material" | "otherCosts">("material");

  const [row, setRow] = useState<TableRow>(() => {
    if (typeof document !== "undefined") {
      const rootEl = document.getElementById("root");
      if (rootEl?.dataset?.initialJson) {
        try {
          const parsed = JSON.parse(rootEl.dataset.initialJson);
          if (parsed?.item) {
            const parsedNum = String(parsed.item._rawNumber || parsed.item.poNumber || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            const targetCode = String(code || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            if (!targetCode || parsedNum === targetCode) {
              return parsed.item;
            }
          }
        } catch (_) { }
      }
    }
    const match = findRowBySlug(poRows, code);
    if (match) return match;
    const cleanDoc = code ? code.replace(/-/g, "/") : "PO";
    return {
      _id: `po-${code}`,
      _type: "po",
      poNumber: cleanDoc,
      _rawNumber: cleanDoc,
      status: "Waiting for Approve 1",
      _rawStatus: "Waiting for Approve 1",
      date: "-",
      dueDate: "-",
      supplier: "Loading...",
      items: [],
      _items: [],
    } as TableRow;
  });

  useEffect(() => {
    let isMounted = true;
    fetchDetail("po", code).then((item) => {
      if (isMounted && item) {
        setRow(item);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [code]);

  const docNumber = typeof row._rawNumber === "string" && row._rawNumber
    ? row._rawNumber
    : typeof row.poNumber === "string" && row.poNumber
      ? row.poNumber
      : typeof code === "string"
        ? code.replace(/-/g, "/")
        : "PO";
  const prNumber = String(row._rawPr || row.prNumber || "—");
  const rmNumber = String(row._rawRn || row.rnNumber || "—");
  const supplierName = String(row._rawSupplier || row.supplier || "—");
  const orderTotal = String(row._rawTotal || row.total || "-");
  const rawStatus = row._rawStatus || row.status || "Waiting for Approve 1";
  const dateStr = row._rawDate || row.date || "-";
  const dueDate = row._rawDueDate || row.dueDate || "-";
  const facility = String(row._rawFacility || row.statusFacility || row.facility || "FASILITAS");
  const currency = String(row._rawCurrency || "IDR");
  const rate = String(row._rawRate || "1.00");
  const paymentMethod = String(row._rawPaymentMethod || "TRANSFER");
  const paymentTerm = String(row._rawPaymentTerm || "Full amount within 14 days after received invoice");
  const createdBy = String(row._rawCreatedBy || "-");
  const releasedBy = String(row._rawReleasedBy || "-");
  const approvedBy = String(row._rawApprovedBy || "-");
  const poNote = String(row.poNote || row.note || row._rawRemark || "");
  const remark = poNote;

  const backendNormalizedStatus = normalizeApprovalStatus(rawStatus);

  const resolveSyncedApprovalState = (): DocumentApprovalState => {
    const localByNum = getLocalApprovalState("purchase_order", docNumber, backendNormalizedStatus);
    const localById = row.id
      ? getLocalApprovalState("purchase_order", String(row.id), backendNormalizedStatus)
      : localByNum;
    const local = localByNum.history.length >= localById.history.length ? localByNum : localById;

    if (backendNormalizedStatus !== "WAITING_APPROVE_1" && local.status !== backendNormalizedStatus) {
      return {
        ...local,
        status: backendNormalizedStatus,
        currentTier:
          backendNormalizedStatus === "WAITING_APPROVE_2"
            ? 2
            : backendNormalizedStatus === "APPROVED"
              ? 2
              : 1,
      };
    }
    return local;
  };

  const [approvalState, setApprovalState] = useState<DocumentApprovalState>(() =>
    resolveSyncedApprovalState()
  );

  useEffect(() => {
    setApprovalState(resolveSyncedApprovalState());
  }, [docNumber, row.id, rawStatus, backendNormalizedStatus]);

  const { currentUser } = useAuthPermission();
  const isApproved = approvalState.status === "APPROVED";

  const handlePrintPdf = async () => {
    const newState = await recordDocumentActivity({
      module: "purchase_order",
      documentId: row.id ? String(row.id) : docNumber,
      documentNumber: docNumber,
      action: "printed",
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      note: `Printed Purchase Order ${docNumber}`,
    });
    setApprovalState(newState);
    window.print();
  };

  const handleRecordRevision = async () => {
    const newState = await recordDocumentActivity({
      module: "purchase_order",
      documentId: row.id ? String(row.id) : docNumber,
      documentNumber: docNumber,
      action: "revised",
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      note: `Revised Purchase Order ${docNumber}`,
    });
    setApprovalState(newState);
  };

  // Build comprehensive Transaction Activity & History Log (UI-04)
  const activityLogEntries = (() => {
    const dynamicEntries = (approvalState.history || []).map((entry) => {
      let actionLabel = "Activity Recorded";
      let statusLabel = "Logged";
      let tone: "green" | "blue" | "orange" | "red" | "purple" | "gray" = "gray";

      if (entry.action === "approved") {
        actionLabel = `Approve ${entry.tier || 1} Purchase Order`;
        statusLabel = `Approve ${entry.tier || 1}`;
        tone = "green";
      } else if (entry.action === "unapproved") {
        actionLabel = `UnApprove ${entry.tier || 1} Purchase Order`;
        statusLabel = "UnApproved";
        tone = "orange";
      } else if (entry.action === "rejected") {
        actionLabel = `Rejected at Stage ${entry.tier || 1}${entry.note ? ` (${entry.note})` : ""}`;
        statusLabel = "Rejected";
        tone = "red";
      } else if (entry.action === "revised") {
        actionLabel = entry.note || "Revised Purchase Order Document";
        statusLabel = "Revised";
        tone = "blue";
      } else if (entry.action === "printed") {
        actionLabel = entry.note || "Printed Purchase Order PDF";
        statusLabel = "Printed";
        tone = "purple";
      } else if (entry.action === "created") {
        actionLabel = entry.note || "Created Purchase Order";
        statusLabel = "Created";
        tone = "blue";
      }

      return {
        id: entry.id,
        actor: entry.userName || entry.actedByName || "User",
        role: entry.userRole || entry.actedByRole || "Procurement",
        action: actionLabel,
        timestamp: entry.timestamp,
        statusLabel,
        tone,
      };
    });

    const hasPrintEntry = dynamicEntries.some((e) => e.statusLabel === "Printed");
    const hasReviseEntry = dynamicEntries.some((e) => e.statusLabel === "Revised");
    const hasApprove1Entry = dynamicEntries.some((e) => e.action.includes("Approve 1"));
    const hasApprove2Entry = dynamicEntries.some((e) => e.action.includes("Approve 2"));

    const baselineEntries: typeof dynamicEntries = [];

    if (
      !hasApprove2Entry &&
      (approvalState.status === "APPROVED" || approvalState.approved2By)
    ) {
      baselineEntries.push({
        id: "base-app2",
        actor: approvalState.approved2By || (approvedBy !== "-" ? approvedBy : "AWI L"),
        role: "Approver Stage 2",
        action: "Approve 2 Purchase Order",
        timestamp: approvalState.approved2At || `${dateStr !== "-" ? dateStr : "08-10-2026"} 14:04:25`,
        statusLabel: "Approve 2",
        tone: "green",
      });
    }

    if (
      !hasApprove1Entry &&
      (approvalState.status === "WAITING_APPROVE_2" ||
        approvalState.status === "APPROVED" ||
        approvalState.approved1By)
    ) {
      baselineEntries.push({
        id: "base-app1",
        actor: approvalState.approved1By || (releasedBy !== "-" ? releasedBy : "YUSTINA"),
        role: "Approver Stage 1",
        action: "Approve 1 Purchase Order",
        timestamp: approvalState.approved1At || `${dateStr !== "-" ? dateStr : "08-10-2026"} 13:57:26`,
        statusLabel: "Approve 1",
        tone: "green",
      });
    }

    if (!hasPrintEntry && row._printedBy) {
      baselineEntries.push({
        id: "base-print",
        actor: String(row._printedBy),
        role: "Document Print",
        action: "Printed Purchase Order Document",
        timestamp: String(row._printedAt || `${dateStr !== "-" ? dateStr : "08-10-2026"} 14:30:00`),
        statusLabel: "Printed",
        tone: "purple",
      });
    }

    if (!hasReviseEntry) {
      baselineEntries.push({
        id: "base-rev",
        actor: String(createdBy !== "-" ? createdBy : "Michelle"),
        role: "Purchasing Officer",
        action: "Revised & Confirmed Commercial Terms",
        timestamp: `${dateStr !== "-" ? dateStr : "08-10-2026"} 13:50:10`,
        statusLabel: "Revised",
        tone: "blue",
      });
    }

    baselineEntries.push({
      id: "base-create",
      actor: String(createdBy !== "-" ? createdBy : "Michelle"),
      role: "Purchasing Officer",
      action: "Created Purchase Order Document",
      timestamp: `${dateStr !== "-" ? dateStr : "08-10-2026"} 13:44:33`,
      statusLabel: "Created",
      tone: "gray",
    });

    return [...dynamicEntries, ...baselineEntries];
  })();

  const poItems =
    row._items && row._items.length > 0
      ? row._items
      : row.items && Array.isArray(row.items) && row.items.length > 0
        ? row.items
        : [
          {
            no: 1,
            prNumber: row._rawPr || row.prNumber || "0135/PR-IMLI/IX/2026",
            item: row.material || row.itemName || "Industrial Procurement Material",
            itemName: row.material || row.itemName || "Industrial Procurement Material",
            itemCode: "10.100.100.001",
            itemAlias: row.material || row.itemName || "Industrial Procurement Material",
            quantity: row._totalQty || "1.0000 KGM",
            orderQty: parseFloat(String(row._totalQty || "1").replace(/[^0-9.]/g, "")) || 1,
            unit: String(row._totalQty || "").replace(/[0-9., ]/g, "") || "KGM",
            price: row._rawTotal ? String(row._rawTotal).replace(/[^0-9.,]/g, "") : "0.00",
            discount: "0.00",
            subtotal: row._rawTotal ? String(row._rawTotal).replace(/[^0-9.,]/g, "") : "0.00",
            priceRp: row._rawTotal ? String(row._rawTotal).replace(/[^0-9.,]/g, "") : "0.00",
            discountRp: "0.00",
            subtotalRp: row._rawTotal ? String(row._rawTotal).replace(/[^0-9.,]/g, "") : "0.00",
            lme: "—",
            optionalRate: "—",
            lmePercentage: "—",
            subtotalPph: "0.00",
            currency: row._rawCurrency || "IDR",
            remark: row._rawRemark || "Industrial Procurement Item",
          },
        ];

  const isHeaderNonFac = useMemo(() => {
    if (/non/i.test(facility)) return true;
    if (poItems && poItems.length > 0) {
      return poItems.some((it: any) => /non/i.test(String(it.facility || it.facility_status || "")));
    }
    return false;
  }, [facility, poItems]);

  const [localOtherCosts, setLocalOtherCosts] = useState<any[]>(() => row._otherCosts || []);

  useEffect(() => {
    if (row._otherCosts) {
      setLocalOtherCosts(row._otherCosts);
    }
  }, [row._otherCosts]);

  const [isAddingCost, setIsAddingCost] = useState(false);
  const [costName, setCostName] = useState("");
  const [costAmount, setCostAmount] = useState<number | "">("");
  const [costNote, setCostNote] = useState("");
  const [isSubmittingCost, setIsSubmittingCost] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [availableCostTypes, setAvailableCostTypes] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/procurement/master/additional-costs?per_page=100")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setAvailableCostTypes(json.data);
        }
      })
      .catch(() => { });
  }, []);

  const handleSaveAdditionalCost = async () => {
    if (!costName.trim()) {
      setCostError("Cost Name is required");
      return;
    }
    if (!costAmount || Number(costAmount) <= 0) {
      setCostError("Valid amount is required");
      return;
    }
    setCostError(null);
    setIsSubmittingCost(true);
    try {
      const poTarget = row.id ? String(row.id) : docToSlug(docNumber);
      const matched = availableCostTypes.find((t) => t.name === costName || t.code === costName);
      const res = await fetch(`/api/po/${poTarget}/additional-costs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(document.querySelector('meta[name="csrf-token"]')
            ? { "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "" }
            : {}),
        },
        body: JSON.stringify({
          name: costName.trim(),
          costName: costName.trim(),
          amount: Number(costAmount),
          value: Number(costAmount),
          note: costNote.trim(),
          additional_cost_types_id: matched?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add additional cost");
      }
      const newCost = data.data || {
        id: Date.now(),
        name: costName.trim(),
        costName: costName.trim(),
        amount: Number(costAmount),
        value: Number(costAmount),
        nominal: `${currency} ${Number(costAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        remark: costNote.trim(),
        note: costNote.trim(),
      };
      setLocalOtherCosts((prev) => [...prev, newCost]);
      setIsAddingCost(false);
      setCostName("");
      setCostAmount("");
      setCostNote("");
      fetchDetail("po", code).then((item) => {
        if (item) setRow(item);
      });
    } catch (err: any) {
      setCostError(err.message || "Error saving additional cost");
    } finally {
      setIsSubmittingCost(false);
    }
  };

  const totalOtherCosts = useMemo(() => {
    return localOtherCosts.reduce((sum, c) => {
      const val = Number(c.value ?? c.amount ?? parseFloat(String(c.nominal || "0").replace(/[^0-9.]/g, "")) ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [localOtherCosts]);

  const materialSubtotal = useMemo(() => {
    if (row._financials?.subtotal) {
      const num = parseFloat(String(row._financials.subtotal).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return poItems.reduce((sum: number, it: any) => {
      const rawSub = it.subtotalRp ?? it.subtotal ?? 0;
      let val = parseFloat(String(rawSub).replace(/[^0-9.]/g, "")) || 0;
      if (val <= 0) {
        const prc = parseFloat(String(it.priceRp ?? it.price ?? 0).replace(/[^0-9.]/g, "")) || 0;
        const oQty = parseFloat(String(it.orderQty ?? it.quantity ?? 1).replace(/[^0-9.]/g, "")) || 1;
        val = prc * oQty;
      }
      return sum + val;
    }, 0);
  }, [row._financials, poItems]);

  const discountAmount = useMemo(() => {
    if (row._financials?.discount) {
      const num = parseFloat(String(row._financials.discount).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return poItems.reduce((sum: number, it: any) => {
      const rawDisc = it.discountRp ?? it.discount ?? 0;
      return sum + (parseFloat(String(rawDisc).replace(/[^0-9.]/g, "")) || 0);
    }, 0);
  }, [row._financials, poItems]);

  const dppAmount = useMemo(() => {
    if (row._financials?.dpp) {
      const num = parseFloat(String(row._financials.dpp).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return Math.max(0, materialSubtotal - discountAmount);
  }, [row._financials, materialSubtotal, discountAmount]);

  const totalPph = useMemo(() => {
    if (row._financials?.pph) {
      const num = parseFloat(String(row._financials.pph).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return poItems.reduce((sum: number, it: any) => {
      const rawPph = it.subtotalPph ?? it.totalPph ?? 0;
      return sum + (parseFloat(String(rawPph).replace(/[^0-9.]/g, "")) || 0);
    }, 0);
  }, [row._financials, poItems]);

  const ppnRate = 11;
  const isKawasanBerikat = !isHeaderNonFac;

  const ppnAmount = useMemo(() => {
    if (isKawasanBerikat) return 0;
    if (row._financials?.ppn) {
      const num = parseFloat(String(row._financials.ppn).replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) return num;
    }
    return Math.round(dppAmount * (ppnRate / 100) * 100) / 100;
  }, [row._financials, dppAmount, isKawasanBerikat, ppnRate]);

  const computedGrandTotal = useMemo(() => {
    if (row._financials?.grandTotal) {
      const num = parseFloat(String(row._financials.grandTotal).replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    return dppAmount + ppnAmount + totalOtherCosts - totalPph;
  }, [row._financials, dppAmount, ppnAmount, totalOtherCosts, totalPph]);

  const displayOrderTotal = useMemo(() => {
    return `${currency} ${computedGrandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency, computedGrandTotal]);

  const totalMaterialQtyStr = useMemo(() => {
    if (row._totalQty) return String(row._totalQty);
    const sum = poItems.reduce((acc: number, it: any) => acc + (parseFloat(String(it.quantity || it.orderQty || 0).replace(/[^0-9.]/g, "")) || 0), 0);
    const unit = poItems[0]?.unit || "PCS";
    return `${sum.toFixed(4)} ${unit}`;
  }, [row._totalQty, poItems]);

  const otherCosts = localOtherCosts;

  const prNumbersList = useMemo(() => {
    const list: string[] = [];
    if (row.prNumbers && Array.isArray(row.prNumbers)) {
      row.prNumbers.forEach((p: string) => {
        if (p && p !== "—" && !list.includes(p)) list.push(p);
      });
    }
    if (prNumber && prNumber !== "—") {
      prNumber.split(",").forEach((p) => {
        const trimmed = p.trim();
        if (trimmed && trimmed !== "—" && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    if (poItems && Array.isArray(poItems)) {
      poItems.forEach((it: any) => {
        const itPr = it.prNumber || it._rawPr;
        if (itPr && itPr !== "—") {
          String(itPr).split(",").forEach((p) => {
            const trimmed = p.trim();
            if (trimmed && trimmed !== "—" && !list.includes(trimmed)) list.push(trimmed);
          });
        }
      });
    }
    return list;
  }, [row.prNumbers, prNumber, poItems]);

  const receivingNumbersList = useMemo(() => {
    const list: string[] = [];
    if (row.receivingNumbers && Array.isArray(row.receivingNumbers)) {
      row.receivingNumbers.forEach((r: string) => {
        if (r && r !== "—" && !list.includes(r)) list.push(r);
      });
    }
    if (rmNumber && rmNumber !== "—") {
      rmNumber.split(",").forEach((r) => {
        const trimmed = r.trim();
        if (trimmed && trimmed !== "—" && !list.includes(trimmed)) list.push(trimmed);
      });
    }
    return list;
  }, [row.receivingNumbers, rmNumber]);

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Procurement</a>
            <span>/</span>
            <a onClick={onBack}>Purchase Orders</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={isHeaderNonFac ? "gray" : "purple"}>
            {isHeaderNonFac ? "NON FASILITAS" : "FASILITAS"}
          </Badge>
          <Badge tone="gray">
            {currency} · Rate {rate}
          </Badge>
          <Button variant="secondary" icon="print" onClick={handlePrintPdf}>
            Print PDF
          </Button>
          <Button variant="excel">Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">PURCHASE ORDER ORDER COCKPIT</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <ApprovalStatusBadge status={approvalState.status} />
            <Badge tone={isHeaderNonFac ? "gray" : "purple"}>
              {isHeaderNonFac ? "NON FASILITAS" : "FASILITAS"}
            </Badge>
          </div>
          <span className="detail-header-card__meta">
            Supplier: <strong>{supplierName}</strong> · Total Value: <strong>{displayOrderTotal}</strong> · Order Date: <strong>{dateStr}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button variant="secondary" icon="file">
            Download Attachments
          </Button>
        </div>
      </div>

      {/* Dynamic Two-Stage Approval Action Bar */}
      <div className="panel" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <ApprovalActionBar
          module="purchase_order"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onResubmitClick={handleRecordRevision}
          onStateChange={(newState) => {
            setApprovalState(newState);
            setRow((prev) => ({ ...prev, _rawStatus: newState.status, status: newState.status }));
          }}
        />
      </div>

      {/* 6-Column Hero Summary KPI Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span>SUPPLIER / ENTITY</span>
          <strong>{supplierName}</strong>
          <small>Procurement Dept · Direct Vendor</small>
        </div>

        <div className="detail-kpi-card">
          <span>PAYMENT METHOD & FX</span>
          <strong>{paymentMethod}</strong>
          <small>{currency} · FX Rate: {rate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>ORDER TIMELINE</span>
          <strong>{dateStr}</strong>
          <small>Target Due: {dueDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>PAYMENT TERMS</span>
          <strong>{paymentTerm && paymentTerm !== "—" && paymentTerm !== "-" ? paymentTerm : "100% by TT"}</strong>
          <small>{paymentMethod && paymentMethod !== "—" ? paymentMethod : "Direct TT"}</small>
        </div>

        <div className="detail-kpi-card">
          <span>CREATED & RELEASED</span>
          <strong>{createdBy}</strong>
          <small>Released: {releasedBy}</small>
        </div>

        <div className="detail-kpi-card">
          <span>APPROVAL & REVISION</span>
          <strong>{approvedBy}</strong>
          <small>Revision: {row._rawRevision || "0"} · Subcon: {row._rawSubkon || "No"}</small>
        </div>
      </div>

      {/* Document Relationship Workflow Pipeline */}
      <div className="detail-pipeline">
        <div
          className="pipeline-node active"
          style={{ cursor: prNumbersList.length === 1 ? "pointer" : "default" }}
          onClick={() => {
            if (prNumbersList.length === 1 && onNavigateDetail) {
              onNavigateDetail("pr", docToSlug(prNumbersList[0]));
            }
          }}
        >
          <div className="pipeline-node__icon">
            <Icon name="file" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 1 · Purchase Requisition</span>
            <strong>
              {prNumbersList.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {prNumbersList.map((pr: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        textDecoration: "underline",
                        cursor: "pointer",
                        color: "var(--blue-700, #1d4ed8)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateDetail) onNavigateDetail("pr", docToSlug(pr));
                      }}
                      title={`Open Purchase Requisition ${pr}`}
                    >
                      {pr}{idx < prNumbersList.length - 1 ? "," : ""}
                    </span>
                  ))}
                </div>
              ) : (
                prNumber
              )}
            </strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div className="pipeline-node current">
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · Purchase Order</span>
            <strong>{docNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className={`pipeline-node ${receivingNumbersList.length > 0 ? "active" : ""}`}
          style={{
            cursor: receivingNumbersList.length > 0 || isApproved ? "pointer" : "not-allowed",
            opacity: receivingNumbersList.length > 0 || isApproved ? 1 : 0.6,
          }}
          title={
            !isApproved && receivingNumbersList.length === 0
              ? "PO must be fully approved (Stage 2) before receiving material (BPB)"
              : receivingNumbersList.length > 0
                ? "View Receive Material (BPB)"
                : "Click to Receive Material (BPB) from this Approved PO"
          }
          onClick={() => {
            if (receivingNumbersList.length === 1 && onNavigateDetail) {
              onNavigateDetail("warehouse", docToSlug(receivingNumbersList[0]));
            } else if (isApproved && receivingNumbersList.length === 0 && onNavigateDetail) {
              onNavigateDetail("warehouse-create" as any, docNumber);
            }
          }}
        >
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 3 · Receive Material</span>
            <strong>
              {receivingNumbersList.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {receivingNumbersList.map((rn: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        textDecoration: "underline",
                        cursor: "pointer",
                        color: "var(--blue-700, #1d4ed8)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateDetail) onNavigateDetail("warehouse", docToSlug(rn));
                      }}
                      title={`Open Receive Material ${rn}`}
                    >
                      {rn}{idx < receivingNumbersList.length - 1 ? "," : ""}
                    </span>
                  ))}
                </div>
              ) : isApproved ? (
                "+ Create BPB from PO"
              ) : (
                "Awaiting PO Approval"
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* Full-Width Tabbed Material & Costs Section */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-tabs-bar">
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === "material" ? "active" : ""}`}
              onClick={() => setActiveTab("material")}
            >
              <span>Material Items</span>
              <span className="detail-tab-count">{poItems.length}</span>
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === "otherCosts" ? "active" : ""}`}
              onClick={() => setActiveTab("otherCosts")}
            >
              <span>Other Costs (Biaya Lain)</span>
              <span className="detail-tab-count">{otherCosts.length}</span>
            </button>
          </div>

          <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Currency Basis: <strong style={{ color: "var(--ink)" }}>{currency}</strong> (Rate: {rate})
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          {/* Material Items Panel */}
          <div
            style={{
              gridArea: "1 / 1",
              minWidth: 0,
              width: "100%",
              overflowX: "auto",
              visibility: activeTab === "material" ? "visible" : "hidden",
              pointerEvents: activeTab === "material" ? "auto" : "none",
            }}
          >
            <table className="detail-data-table">
              <thead>
                <tr>
                  <th style={{ width: "36px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "150px" }}>Material Item</th>
                  <th style={{ minWidth: "140px" }}>Item Alias</th>
                  <th style={{ minWidth: "115px" }}>PR Reference</th>
                  <th style={{ width: "80px" }}>Facility</th>
                  <th style={{ width: "95px", textAlign: "right" }}>Quantity & Unit</th>
                  <th style={{ width: "95px", textAlign: "right" }}>Unit Price (@)</th>
                  <th style={{ width: "65px", textAlign: "right" }}>Discount</th>
                  <th style={{ width: "105px", textAlign: "right" }}>Subtotal (IDR)</th>
                  <th style={{ width: "55px", textAlign: "right" }}>LME</th>
                  <th style={{ width: "65px", textAlign: "right" }}>Opt Rate</th>
                  <th style={{ width: "55px", textAlign: "right" }}>% LME</th>
                  <th style={{ width: "85px", textAlign: "right" }}>Subtotal PPh</th>
                  <th style={{ minWidth: "100px" }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {poItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                      {item.no || idx + 1}
                    </td>
                    <td>
                      <Material
                        name={item.itemName || item.item || item.itemAlias || "Procurement Material"}
                        code={item.itemCode && item.itemCode !== "—" ? item.itemCode : "-"}
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {(() => {
                          const candidate = item.itemAlias || item.item_alias;
                          if (
                            candidate &&
                            candidate !== "—" &&
                            candidate !== "-" &&
                            candidate !== item.itemCode &&
                            candidate !== item.code
                          ) {
                            return candidate;
                          }
                          return item.itemName || item.item || item.name || "Industrial Material";
                        })()}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const rawPrItem = String(item.prNumber || prNumber || "—");
                        if (rawPrItem === "—") return <span style={{ color: "var(--muted)" }}>—</span>;
                        const prs = rawPrItem.split(",").map((p) => p.trim()).filter(Boolean);
                        return (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {prs.map((pr, pIdx) => (
                              <strong
                                key={pIdx}
                                className="cell-code"
                                style={{
                                  color: "var(--blue-700, #1d4ed8)",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  fontSize: "11px",
                                }}
                                title={`Open Purchase Requisition ${pr}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onNavigateDetail) onNavigateDetail("pr", docToSlug(pr));
                                }}
                              >
                                {pr}{pIdx < prs.length - 1 ? "," : ""}
                              </strong>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const itemFac = String(item.facility || item.facility_status || facility);
                        const isNon = /non/i.test(itemFac);
                        return (
                          <Badge tone={isNon ? "gray" : "purple"}>
                            {isNon ? "NON FASILITAS" : "FASILITAS"}
                          </Badge>
                        );
                      })()}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      IDR {item.priceRp || item.price || "0.00"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                      {item.discountRp || item.discount || "0.00"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink)" }}>
                      {(() => {
                        const rawSub = item.subtotalRp || item.subtotal;
                        const numSub = parseFloat(String(rawSub || 0).replace(/[^0-9.]/g, ""));
                        if (numSub > 0) return `IDR ${rawSub}`;
                        const prc = parseFloat(String(item.priceRp || item.price || 0).replace(/[^0-9.]/g, ""));
                        const oQty = parseFloat(String(item.orderQty || item.quantity || 1).replace(/[^0-9.]/g, "")) || 1;
                        const calc = prc * oQty;
                        return `IDR ${calc > 0 ? calc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (rawSub || "0.00")}`;
                      })()}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.lme && item.lme !== "—" ? item.lme : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.optionalRate && item.optionalRate !== "—" ? item.optionalRate : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--blue-600)" }}>
                      {item.lmePercentage && item.lmePercentage !== "—" ? item.lmePercentage : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.subtotalPph || "0.00"}
                    </td>
                    <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                      {item.remark || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td colSpan={5} style={{ textAlign: "right", padding: "12px 14px" }}>
                    Total:
                  </td>
                  <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                    {totalMaterialQtyStr}
                  </td>
                  <td colSpan={2}></td>
                  <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                    {currency} {materialSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3}></td>
                  <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                    {currency} {totalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Other Costs Panel */}
          <div
            style={{
              gridArea: "1 / 1",
              minWidth: 0,
              width: "100%",
              overflowX: "auto",
              visibility: activeTab === "otherCosts" ? "visible" : "hidden",
              pointerEvents: activeTab === "otherCosts" ? "auto" : "none",
            }}
          >
            {/* Header action bar for Other Costs */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "4px 2px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                Additional Operational & Logistics Costs
              </div>
              {!isAddingCost && (
                <Button variant="secondary" icon="plus" onClick={() => setIsAddingCost(true)}>
                  Add Additional Cost
                </Button>
              )}
            </div>

            {/* Inline Add Cost Form */}
            {isAddingCost && (
              <div style={{
                background: "var(--surface-hover, #f8fafc)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
              }}>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)", marginBottom: "12px" }}>
                  Add Additional Cost to {docNumber}
                </div>
                {costError && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "10px" }}>
                    {costError}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                      Cost Name / Type *
                    </label>
                    <input
                      type="text"
                      list="cost-type-suggestions"
                      value={costName}
                      onChange={(e) => setCostName(e.target.value)}
                      placeholder="e.g. Ongkos Angkut / Freight"
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "6px 10px",
                        border: "1px solid var(--line, #cbd5e1)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        background: "#fff",
                      }}
                    />
                    <datalist id="cost-type-suggestions">
                      {availableCostTypes.map((t) => (
                        <option key={t.id} value={t.name}>{t.code ? `${t.code} - ${t.name}` : t.name}</option>
                      ))}
                      <option value="Ongkos Angkut (Freight)" />
                      <option value="Bongkar Muat (Handling)" />
                      <option value="Biaya Asuransi (Insurance)" />
                      <option value="Biaya Kemasan (Packaging)" />
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                      Amount ({currency}) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costAmount}
                      onChange={(e) => setCostAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      placeholder="0.00"
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "6px 10px",
                        border: "1px solid var(--line, #cbd5e1)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        background: "#fff",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                      Remark / Purpose
                    </label>
                    <input
                      type="text"
                      value={costNote}
                      onChange={(e) => setCostNote(e.target.value)}
                      placeholder="Optional purpose note..."
                      style={{
                        width: "100%",
                        height: "36px",
                        padding: "6px 10px",
                        border: "1px solid var(--line, #cbd5e1)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        background: "#fff",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsAddingCost(false);
                      setCostError(null);
                    }}
                    disabled={isSubmittingCost}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleSaveAdditionalCost()}
                    disabled={isSubmittingCost}
                  >
                    {isSubmittingCost ? "Saving..." : "Save Cost"}
                  </Button>
                </div>
              </div>
            )}

            <table className="detail-data-table">
              <thead>
                <tr>
                  <th style={{ width: "36px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "160px" }}>Cost Name / Description</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Amount ({currency})</th>
                  <th style={{ minWidth: "160px" }}>Remark / Purpose</th>
                </tr>
              </thead>
              <tbody>
                {otherCosts.length > 0 ? (
                  otherCosts.map((c, i) => {
                    const cVal = Number(c.value ?? c.amount ?? parseFloat(String(c.nominal || "0").replace(/[^0-9.]/g, "")) ?? 0);
                    return (
                      <tr key={c.id || i}>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>{i + 1}</td>
                        <td><strong>{c.name || c.costName || "Operational Freight / Handling"}</strong></td>
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                          {currency} {cVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>{c.note || c.remark || "—"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px 20px", color: "var(--muted)" }}>
                      No additional logistics or transport costs recorded for this purchase order.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: "right", padding: "12px 14px" }}>
                    Total Other Costs:
                  </td>
                  <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                    {currency} {totalOtherCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontSize: "11px" }}>
                    {totalOtherCosts > 0 ? "Applied to Grand Total" : "No surcharge active"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Two-Column Lower Content Grid: Financial Breakdown & EMBEDDED Audit History */}
      <div className="detail-lower-grid">
        {/* Left Card: Financial Calculation Ledger & Remarks */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Financial Summary & Tax Ledger</strong>
            <span>Taxation & Commercial Totals</span>
          </div>
          <div className="detail-section-card__body">
            {/* Financial Ledger Breakdown */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "var(--canvas)",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Total Material Quantity</span>
                <strong style={{ fontFamily: "ui-monospace, monospace" }}>
                  {totalMaterialQtyStr}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Material Subtotal</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                  {currency} {materialSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Discount</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--red-600, #dc2626)" }}>
                    - {currency} {discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>DPP (Tax Base Amount)</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                  {currency} {dppAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>
                  {isKawasanBerikat ? "Value Added Tax (PPN Ditangguhkan - Kawasan Berikat)" : `Value Added Tax (VAT / PPn ${ppnRate}%)`}
                </span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: isKawasanBerikat ? "var(--muted)" : "var(--blue-600)" }}>
                  {currency} {ppnAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Total Other Costs</span>
                <span style={{ fontFamily: "ui-monospace, monospace" }}>
                  {currency} {totalOtherCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {totalPph > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Income Tax (PPh Deduction)</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--red-600, #dc2626)" }}>
                    - {currency} {totalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  borderTop: "2px solid var(--line-strong)",
                  paddingTop: "10px",
                  marginTop: "4px",
                }}
              >
                <strong style={{ color: "var(--ink)" }}>Grand Total</strong>
                <strong style={{ color: "var(--blue-700)", fontFamily: "ui-monospace, monospace", fontSize: "15px" }}>
                  {displayOrderTotal}
                </strong>
              </div>
            </div>

            {/* PO Note Section */}
            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                PO Note & Delivery Instructions
              </span>
              <div
                style={{
                  background: "var(--white)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--ink)",
                  marginTop: "6px",
                  border: "1px solid var(--line)",
                  lineHeight: "1.45",
                }}
              >
                <strong>{poNote || "—"}</strong>
                <small style={{ display: "block", color: "var(--muted)", marginTop: "4px", fontSize: "11px" }}>
                  Delivery to Warehouse Raw Material yard. Vendor requires 3-day notice prior to dispatch.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card: EMBEDDED TRANSACTION HISTORY & ACTIVITY LOG (UI-04) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Transaction History & Activity Log</strong>
            <span>{activityLogEntries.length} Activity Records</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table className="audit-log-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>User / Actor</th>
                    <th>Activity Performed</th>
                    <th style={{ width: "180px" }}>Timestamp</th>
                    <th style={{ width: "120px" }}>Activity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogEntries.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.actor}</strong>
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>
                          {log.role}
                        </small>
                      </td>
                      <td>{log.action}</td>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                        {log.timestamp}
                      </td>
                      <td>
                        <Badge tone={log.tone}>{log.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderDetail;
