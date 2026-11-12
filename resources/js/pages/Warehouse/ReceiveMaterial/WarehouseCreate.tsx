import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { initialSupplierRecords } from "../../Procurement/PurchaseMaster/Supplier/supplier-types";
import { initialWarehouseMasterRecords } from "../MasterWarehouse/warehouse-master-data";
import { initialItemRecords } from "../../Exim/Master/Item/item-data";
import { poRows, warehouseRows } from "../../../data/mockData";
import { fetchList, fetchDetail, createWarehouseBpb } from "../../../data/api";
import { getLocalApprovalState } from "../../../services/approvalApi";

export interface BPBItemRow {
  id: string;
  po_has_items_id?: number;
  po_has_rn_id?: number;
  poNumber: string;
  prNumber?: string;
  name: string;
  code: string;
  jobNumber: string;
  deliveryNote: string;
  orderedQty: number;
  receiveQty: number | string;
  unit: string;
  location: string;
  purpose: string;
}

interface WarehouseCreateProps {
  initialPoNumber?: string;
  initialRnNumber?: string;
  onBack: () => void;
  onSaved: (newBpb?: any) => void;
}

export function WarehouseCreate({
  initialPoNumber,
  initialRnNumber,
  onBack,
  onSaved,
}: WarehouseCreateProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Dynamic Master & Reference Datasets
  const [approvedPos, setApprovedPos] = useState<any[]>([]);
  const [existingRns, setExistingRns] = useState<any[]>([]);
  const [existingBpbs, setExistingBpbs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [jobNumbers, setJobNumbers] = useState<string[]>([]);

  // Header State
  const [rnNumber, setRnNumber] = useState("");
  const [poNumberHeader, setPoNumberHeader] = useState(initialPoNumber || "");
  const [bpbType, setBpbType] = useState("Gudang");
  const [supplier, setSupplier] = useState("");
  const [receiveDate, setReceiveDate] = useState(today);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [taxInvoice, setTaxInvoice] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [ajuNumber, setAjuNumber] = useState("");
  const [ajuDate, setAjuDate] = useState(today);
  const [noPen, setNoPen] = useState("");
  const [regDate, setRegDate] = useState(today);
  const [remark, setRemark] = useState("");

  // Items State — auto populated from selected RN
  const [items, setItems] = useState<BPBItemRow[]>([]);

  // Dialog & Feedback State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Extract items list from PO object
  const getPoItemsList = (poObj: any): any[] => {
    if (poObj?._items && Array.isArray(poObj._items) && poObj._items.length > 0) {
      return poObj._items;
    }
    if (poObj?.items && Array.isArray(poObj.items) && poObj.items.length > 0) {
      return poObj.items;
    }
    return [];
  };

  const getSafeDocString = (val: any): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object") {
      if (val.props) {
        if (typeof val.props.children === "string") return val.props.children;
        if (typeof val.props.children === "number") return String(val.props.children);
        if (Array.isArray(val.props.children)) {
          for (const child of val.props.children) {
            const res = getSafeDocString(child);
            if (res) return res;
          }
        } else if (val.props.children) {
          return getSafeDocString(val.props.children);
        }
      }
      try {
        const str = String(val);
        if (str && str !== "[object Object]") return str;
      } catch (_) { }
    }
    return "";
  };

  // Helper to detect if an RN has already been received into an existing BPB (Double BPB Prevention)
  const findExistingBpbForRn = (rnNum: string): { bpbNumber: string; date?: string; status?: string } | null => {
    const targetStr = getSafeDocString(rnNum);
    if (!targetStr) return null;
    const cleanTarget = String(targetStr).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!cleanTarget) return null;

    // 1. Check existingRns for bpb_number
    const matchedRn = existingRns.find((r) => {
      const rawRn = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
      const num = rawRn ? String(rawRn).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
      return num && num === cleanTarget;
    });
    if (matchedRn?.bpb_number && matchedRn?.bpb_status !== "Rejected") {
      return { bpbNumber: matchedRn.bpb_number, status: matchedRn.bpb_status };
    }
    if (Array.isArray(matchedRn?.bpb_numbers) && matchedRn.bpb_numbers.length > 0) {
      return { bpbNumber: matchedRn.bpb_numbers[0] };
    }

    // 2. Check existingBpbs list (excluding Rejected BPBs)
    const pool = existingBpbs.length > 0 ? existingBpbs : (warehouseRows || []);
    for (const bpb of pool) {
      const bpbStatus = String(bpb.status || bpb._rawStatus || bpb._rawApproval || "").toLowerCase();
      if (bpbStatus === "rejected") continue;
      const bpbNum = getSafeDocString(bpb._rawNumber) || getSafeDocString(bpb.bpbNumber) || getSafeDocString(bpb.bpb_number);
      const rawRn = getSafeDocString(bpb._rawRn) || getSafeDocString(bpb.rn_number) || getSafeDocString(bpb.rnNumber);
      const cleanRawRn = rawRn ? String(rawRn).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
      if (cleanRawRn && cleanRawRn === cleanTarget) {
        return { bpbNumber: bpbNum, date: bpb.date || bpb.receiveDate, status: bpbStatus };
      }
    }
    return null;
  };

  // Helper to check if an RN is fully Approved (not pending, not rejected)
  const isRnApproved = (r: any): boolean => {
    const rawSt = String(r.status || r._rawStatus || "").toLowerCase().trim();
    if (rawSt === "approved" || rawSt === "approved 2") return true;
    if (rawSt === "rejected") return false;

    const num = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
    if (num) {
      const local = getLocalApprovalState("receive_note", num);
      if (local?.status === "APPROVED") return true;
      if (local?.status === "REJECTED") return false;
    }

    if (Array.isArray(r.approvals)) {
      const tier2 = r.approvals.find((a: any) => String(a.tier || a.approval_ke) === "2");
      if (tier2 && (String(tier2.status).toLowerCase() === "approved" || Number(tier2.status) === 1)) {
        return true;
      }
    }
    return false;
  };

  // Populate form from selected PO
  const populateFromPo = (poObj: any) => {
    if (!poObj) return;
    const poNum = poObj._rawNumber || poObj._rawPo || poObj.poNumber || "";
    const prNum = poObj._rawPr || poObj.prNumber || "—";
    const rawSup = String(poObj._rawSupplier || poObj.supplier || "").replace(/^\[[^\]]+\]\s*/, "").trim();

    setPoNumberHeader(poNum);
    if (rawSup) {
      setSupplier(rawSup);
    }

    if (poObj._rawRn && poObj._rawRn !== "—") {
      setRnNumber(poObj._rawRn);
    } else if (!rnNumber.trim()) {
      const rand = String(Math.floor(Math.random() * 900) + 100).padStart(4, "0");
      setRnNumber(`${rand}/RN-IMLI/X/2026`);
    }

    if (poObj._rawRemark && poObj._rawRemark !== "-") {
      setRemark(poObj._rawRemark);
    }

    const poItems = getPoItemsList(poObj);
    const defaultSj = `SJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

    if (poItems.length > 0) {
      const mapped: BPBItemRow[] = poItems.map((it: any, idx: number) => {
        const rawQtyStr = String(it.orderQty || it.rawQty || it.quantity || "1").replace(/[^0-9.]/g, "");
        const qtyNum = parseFloat(rawQtyStr) || 1;
        const unitMatch = String(it.quantity || "").match(/[A-Za-z]+$/);
        const unitStr = it.unit || (unitMatch ? unitMatch[0] : "PCE");

        return {
          id: `bpb-item-${Date.now()}-${idx}`,
          po_has_items_id: it.po_has_items_id || it.id,
          poNumber: poNum,
          prNumber: it.prNumber || prNum,
          name: it.item || it.itemName || "Material Item",
          code: it.itemCode || it.itemAlias || "10.100.100.001",
          jobNumber: it.jobNumber || "—",
          deliveryNote: defaultSj,
          orderedQty: qtyNum,
          receiveQty: qtyNum,
          unit: unitStr,
          location: warehouses[0]?.name || "Gudang Sparepart",
          purpose: it.remark || poObj._rawRemark || "Warehouse Inbound Receipt",
        };
      });
      setItems(mapped);
    } else {
      const totalQtyNum = parseFloat(String(poObj._totalQty || "1").replace(/[^0-9.]/g, "")) || 1;
      setItems([
        {
          id: `bpb-item-${Date.now()}`,
          poNumber: poNum,
          prNumber: prNum,
          name: poObj.material || poObj._rawMaterialName || poObj.itemName || poObj.item || (poObj.items && poObj.items[0]?.itemName) || "Material Item",
          code: poObj.itemCode || poObj._rawMaterialCode || "10.100.100.001",
          jobNumber: "—",
          deliveryNote: defaultSj,
          orderedQty: totalQtyNum,
          receiveQty: totalQtyNum,
          unit: "PCE",
          location: warehouses[0]?.name || "Gudang Sparepart",
          purpose: poObj._rawRemark || "Warehouse Inbound Receipt",
        },
      ]);

      // Fetch full PO detail as fallback if _items were not embedded in list row
      if (poNum) {
        fetchDetail("po", poNum).then((detail) => {
          const detailItems = getPoItemsList(detail);
          if (detail && detailItems.length > 0) {
            const detailMapped: BPBItemRow[] = detailItems.map((it: any, idx: number) => {
              const rawQtyStr = String(it.orderQty || it.rawQty || it.quantity || "1").replace(/[^0-9.]/g, "");
              const qtyNum = parseFloat(rawQtyStr) || 1;
              const unitMatch = String(it.quantity || "").match(/[A-Za-z]+$/);
              const unitStr = it.unit || (unitMatch ? unitMatch[0] : "PCE");

              return {
                id: `bpb-item-${Date.now()}-${idx}`,
                po_has_items_id: it.po_has_items_id || it.id,
                poNumber: poNum,
                prNumber: it.prNumber || prNum,
                name: it.item || it.itemName || "Material Item",
                code: it.itemCode || it.itemAlias || "10.100.100.001",
                jobNumber: it.jobNumber || "—",
                deliveryNote: defaultSj,
                orderedQty: qtyNum,
                receiveQty: qtyNum,
                unit: unitStr,
                location: warehouses[0]?.name || "Gudang Sparepart",
                purpose: it.remark || detail._rawRemark || "Warehouse Inbound Receipt",
              };
            });
            setItems(detailMapped);
          }
        });
      }
    }
  };

  // Populate form from selected existing Receive Note (RN)
  const populateFromRn = (rnObj: any) => {
    if (!rnObj) return;
    const rnNum = getSafeDocString(rnObj.rn_number) || getSafeDocString(rnObj._rawRn) || getSafeDocString(rnObj.rnNumber);
    const supName = rnObj.supplier?.name || rnObj.supplierName || (typeof rnObj.supplier === "string" ? rnObj.supplier : "");
    setRnNumber(rnNum);
    if (supName) {
      setSupplier(supName);
    }
    setInvoiceNumber(rnObj.invoice_number && rnObj.invoice_number !== "-" ? rnObj.invoice_number : "-");
    setInvoiceDate(rnObj.invoice_date || rnObj.arrival_date?.slice(0, 10) || today);
    setTaxInvoice(rnObj.tax_invoice && rnObj.tax_invoice !== "-" ? rnObj.tax_invoice : "-");
    setPlateNo(rnObj.license_plate && rnObj.license_plate !== "-" ? rnObj.license_plate : "-");
    setAjuNumber(rnObj.aju_number && rnObj.aju_number !== "-" ? rnObj.aju_number : "-");
    setAjuDate(rnObj.aju_date || rnObj.arrival_date?.slice(0, 10) || today);
    setNoPen(rnObj.no_pen && rnObj.no_pen !== "-" ? rnObj.no_pen : "-");
    setRegDate(rnObj.reg_date || rnObj.arrival_date?.slice(0, 10) || today);
    if (rnObj.note && rnObj.note !== "-") {
      setRemark(rnObj.note);
    }

    const rnItems = (Array.isArray(rnObj.items) && rnObj.items.length > 0)
      ? rnObj.items
      : (Array.isArray(rnObj.purchase_order_receive_notes) ? rnObj.purchase_order_receive_notes : []);

    const defaultWh = warehouses[0]?.name || "Gudang Sparepart";

    if (rnItems.length > 0) {
      const mapped: BPBItemRow[] = rnItems.map((it: any, idx: number) => {
        const poItem = it.purchase_order_item || it.purchaseOrderItem;
        const poDoc = poItem?.purchase_order || poItem?.purchaseOrder;
        const prItem = poItem?.purchase_request_item || poItem?.purchaseRequestItem;
        const prDoc = prItem?.purchase_request || prItem?.purchaseRequest;
        const itemMaster = poItem?.item || prItem?.item;

        const itemName = it.item_name || it.itemName || it.item || itemMaster?.name || "Material Item";
        const itemCode = it.item_code || it.itemCode || it.code || itemMaster?.code || "10.100.100.001";
        const poNum = it.po_number || it.poNumber || poDoc?.po_number || "POL-1026-0040";
        const sjNum = it.dn_number || it.deliveryNote || it.sj_number || rnObj.sj_number || "SJ-2026-001";
        const qty = Number(it.net_quantity ?? it.gross_quantity ?? it.quantity ?? it.receiveQty ?? it.suratJalanQty ?? 1);
        const unitStr = it.unit || itemMaster?.unit?.code || itemMaster?.unitOfMeasurement?.name || "PCE";
        const desc = it.note || it.remark || rnObj.note || "Warehouse Inbound Receipt";

        return {
          id: `bpb-item-${Date.now()}-${idx}`,
          po_has_items_id: poItem?.id || it.id,
          po_has_rn_id: typeof it.id === "number" ? it.id : undefined,
          poNumber: poNum,
          prNumber: prDoc?.pr_number || "—",
          name: itemName,
          code: itemCode,
          jobNumber: it.job_number || it.jobNumber || "—",
          deliveryNote: sjNum,
          orderedQty: qty,
          receiveQty: qty,
          unit: unitStr,
          location: defaultWh,
          purpose: desc,
        };
      });
      setItems(mapped);
    } else {
      setItems([]);
    }
  };

  const handleSelectRn = (selectedRnNumber: string) => {
    if (!selectedRnNumber) {
      setRnNumber("");
      setSupplier("");
      setInvoiceNumber("");
      setInvoiceDate(today);
      setTaxInvoice("");
      setPlateNo("");
      setAjuNumber("");
      setAjuDate(today);
      setNoPen("");
      setRegDate(today);
      setRemark("");
      setItems([]);
      setNotification(null);
      return;
    }

    // Check for duplicate BPB prevention
    const existingBpb = findExistingBpbForRn(selectedRnNumber);
    if (existingBpb) {
      setNotification({
        type: "error",
        message: `RN ${selectedRnNumber} has already been received in BPB ${existingBpb.bpbNumber}. You cannot select this RN again to prevent duplicate material receipt.`,
      });
      setRnNumber("");
      setItems([]);
      return;
    }

    const matchedRn = existingRns.find((r) => {
      const num = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
      return num === selectedRnNumber;
    });

    if (matchedRn && !isRnApproved(matchedRn)) {
      setNotification({
        type: "error",
        message: `RN ${selectedRnNumber} has not been approved yet. Only approved Receive Notes can be accepted into the warehouse.`,
      });
      setRnNumber("");
      setItems([]);
      return;
    }

    setRnNumber(selectedRnNumber);
    setNotification(null);

    if (matchedRn) {
      populateFromRn(matchedRn);
    } else {
      fetchDetail("rn", selectedRnNumber).then((detail) => {
        if (detail) {
          if (findExistingBpbForRn(selectedRnNumber)) {
            setNotification({
              type: "error",
              message: `RN ${selectedRnNumber} has already been received into warehouse.`,
            });
            setRnNumber("");
            setItems([]);
            return;
          }
          populateFromRn(detail);
        }
      });
    }
  };

  // Helper to check if a PO is fully Approved (Stage 2) via Backend or LocalStorage
  const isPoFullyApproved = (p: any): boolean => {
    const poNum = String(p._rawNumber || p._rawPo || p.poNumber || "");
    const localByNum = poNum ? getLocalApprovalState("purchase_order", poNum) : null;
    const localById = p.id ? getLocalApprovalState("purchase_order", String(p.id)) : null;
    if (localByNum?.status === "APPROVED" || localById?.status === "APPROVED") {
      return true;
    }

    const st = String(p.status || p._rawStatus || "").toLowerCase().trim();
    if (st === "approved" || st === "approved 2" || st === "complete") {
      return true;
    }

    if (Array.isArray(p.approvals)) {
      const tier2 = p.approvals.find(
        (a: any) => String(a.tier || a.approval_ke) === "2"
      );
      if (
        tier2 &&
        (String(tier2.status).toLowerCase() === "approved" || Number(tier2.status) === 1)
      ) {
        return true;
      }
    }

    return false;
  };

  // Load reference POs, RNs, and Master data on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch PO list (request up to 100 POs so all approved POs are included)
    fetchList("po", { perPage: 100 }).then((res) => {
      if (!isMounted) return;
      const rawList = res.rows && res.rows.length > 0 ? res.rows : poRows;

      // Filter to POs that have passed 2-stage approval (or match initialPoNumber)
      const cleanTarget = (initialPoNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const filteredApproved = rawList.filter((p: any) => {
        if (cleanTarget) {
          const num = String(p._rawNumber || p._rawPo || p.poNumber || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
          if (num === cleanTarget) return true;
        }
        return isPoFullyApproved(p);
      });

      const list = filteredApproved.length > 0 ? filteredApproved : rawList;
      setApprovedPos(list);

      if (initialPoNumber) {
        const found = rawList.find((p: any) => {
          const num = String(p._rawNumber || p._rawPo || p.poNumber || "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
          return num === cleanTarget;
        });
        if (found) {
          populateFromPo(found);
        }
      } else if (list.length > 0 && !supplier) {
        const firstPo = list[0];
        const rawSup = String(firstPo._rawSupplier || firstPo.supplier || "PT. Hasil Fastindo")
          .replace(/^\[[^\]]+\]\s*/, "")
          .trim();
        setSupplier(rawSup);
      }
    });

    // 2. Fetch existing Receive Notes
    fetch("/api/warehouse/rn?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        const rns = d?.rows || (Array.isArray(d?.data) ? d.data : d?.data?.data) || [];
        if (Array.isArray(rns) && rns.length > 0) {
          setExistingRns(rns);
          // Only auto-populate if an initial RN was explicitly requested
          if (initialRnNumber) {
            const cleanTarget = String(initialRnNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const matched = rns.find((r: any) => {
              const num = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
              return num && String(num).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanTarget;
            });
            if (matched) {
              const existingBpb = findExistingBpbForRn(initialRnNumber);
              if (existingBpb) {
                setNotification({
                  type: "error",
                  message: `RN ${initialRnNumber} has already been received in BPB ${existingBpb.bpbNumber}. Duplicate receipt is prohibited.`,
                });
              } else if (!isRnApproved(matched)) {
                setNotification({
                  type: "error",
                  message: `RN ${initialRnNumber} has not been approved yet. Only approved Receive Notes can be received into warehouse.`,
                });
              } else {
                populateFromRn(matched);
              }
            }
          }
        }
      })
      .catch(() => { });

    // 2b. Fetch existing BPBs to detect duplicate material receipts (Double BPB)
    fetchList("warehouse", { perPage: 100 })
      .then((res) => {
        if (!isMounted) return;
        const bpbs = res.rows && res.rows.length > 0 ? res.rows : warehouseRows;
        setExistingBpbs(bpbs);
      })
      .catch(() => { });

    // 3. Fetch Master Suppliers
    fetch("/api/procurement/master/suppliers?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setSuppliers(d.data);
          setSupplier((prev) => prev || d.data[0].name || "PT. Hasil Fastindo");
        }
      })
      .catch(() => { });

    // 4. Fetch Master Warehouses
    fetch("/api/warehouse/master/warehouses?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setWarehouses(d.data);
        }
      })
      .catch(() => { });

    // 5. Fetch Master Items
    fetch("/api/exim/master/items?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setMasterItems(d.data);
        }
      })
      .catch(() => { });

    // 6. Fetch Master Job Numbers
    fetch("/api/exim/master/job-numbers?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setJobNumbers(d.data.map((j: any) => j.code || j.name || j.job_number).filter(Boolean));
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [initialPoNumber]);

  // Add Item Line
  const handleAddItemLine = () => {
    const defaultWh =
      warehouses[0]?.name ||
      (initialWarehouseMasterRecords[0] as any)?.name ||
      "Gudang Sparepart";
    const newItem: BPBItemRow = {
      id: `bpb-item-${Date.now()}-${items.length + 1}`,
      poNumber: poNumberHeader || "POL-1026-0040",
      prNumber: "—",
      name: "",
      code: "",
      jobNumber: "—",
      deliveryNote: items[0]?.deliveryNote || `SJ-${new Date().getFullYear()}-001`,
      orderedQty: 1,
      receiveQty: 1,
      unit: "PCE",
      location: defaultWh,
      purpose: remark || "Operational Warehouse Receipt",
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Delete Item Line
  const handleDeleteItemLine = (id: string) => {
    if (items.length <= 1) {
      setNotification({
        type: "error",
        message: "At least one material item line is required for a BPB document.",
      });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Update Item Field
  const handleUpdateItemField = (id: string, field: keyof BPBItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };

        // If user selects a Master Item by name, auto-fill item code and unit
        if (field === "name") {
          const foundApiItem = masterItems.find(
            (m) => (m.name || m.itemName) === value
          );
          if (foundApiItem) {
            updated.code = foundApiItem.code || foundApiItem.itemCode || updated.code;
            if (foundApiItem.unit?.code) updated.unit = foundApiItem.unit.code;
          } else {
            const foundMockItem = initialItemRecords.find(
              (m) => m.itemName === value
            );
            if (foundMockItem) {
              updated.code = foundMockItem.itemCode || updated.code;
              updated.unit = foundMockItem.smallestUnitCode || updated.unit;
            }
          }
        }

        return updated;
      })
    );
  };

  // Total Received Quantity
  const totalReceivedQty = useMemo(() => {
    return items.reduce((sum, it) => {
      const parsed = parseFloat(String(it.receiveQty ?? "").replace(",", "."));
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  }, [items]);

  // Validation
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!rnNumber.trim()) {
      errors.rnNumber = "RN Number is required.";
    } else {
      const existingBpb = findExistingBpbForRn(rnNumber.trim());
      if (existingBpb) {
        errors.rnNumber = `RN ${rnNumber} has already been received in BPB ${existingBpb.bpbNumber}. Duplicate receipt is prohibited.`;
      }
      const matchedRn = existingRns.find((r) => {
        const num = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
        return num === rnNumber.trim();
      });
      if (matchedRn && !isRnApproved(matchedRn)) {
        errors.rnNumber = `RN ${rnNumber} has not been approved yet. Only approved Receive Notes can be accepted into the warehouse.`;
      }
    }
    if (!receiveDate.trim()) errors.receiveDate = "Receive Date is required.";

    if (items.length === 0) {
      errors.items = "At least one material item is required.";
    } else {
      items.forEach((it, idx) => {
        if (!it.name.trim()) {
          errors[`item_${idx}_name`] = `Row ${idx + 1}: Material item name is required.`;
        }
        const qtyNum = parseFloat(String(it.receiveQty ?? "").replace(",", "."));
        if (it.receiveQty === "" || isNaN(qtyNum) || qtyNum <= 0) {
          errors[`item_${idx}_qty`] = `Row ${idx + 1}: Receive Qty must be greater than 0.`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setNotification({
        type: "error",
        message: "Please complete all required fields and ensure the selected RN is valid and approved before saving.",
      });
      return;
    }
    const existingBpb = findExistingBpbForRn(rnNumber.trim());
    if (existingBpb) {
      setNotification({
        type: "error",
        message: `RN ${rnNumber} has already been received in BPB ${existingBpb.bpbNumber}. Duplicate BPB receipt is not allowed.`,
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setNotification(null);

    const existingBpb = findExistingBpbForRn(rnNumber.trim());
    if (existingBpb) {
      setNotification({
        type: "error",
        message: `RN ${rnNumber} has already been received in BPB ${existingBpb.bpbNumber}. Duplicate BPB receipt is not allowed.`,
      });
      setIsSubmitting(false);
      setShowSaveConfirm(false);
      return;
    }

    try {
      const payload = {
        rn_number: rnNumber.trim(),
        po_number: poNumberHeader || items[0]?.poNumber || "POL-1026-0040",
        bpb_type: bpbType,
        supplier: supplier.trim() || "Supplier",
        receive_date: receiveDate,
        invoice_number: invoiceNumber.trim() || undefined,
        invoice_date: invoiceDate || undefined,
        tax_invoice: taxInvoice.trim() || undefined,
        plate_no: plateNo.trim() || undefined,
        aju_number: ajuNumber.trim() || undefined,
        aju_date: ajuDate || undefined,
        no_pen: noPen.trim() || undefined,
        reg_date: regDate || undefined,
        note: remark.trim() || "Inbound physical receipt verified at warehouse",
        items: items.map((it) => ({
          po_has_items_id: it.po_has_items_id,
          po_has_rn_id: it.po_has_rn_id,
          poNumber: it.poNumber || poNumberHeader || "POL-1026-0040",
          prNumber: it.prNumber || "—",
          code: it.code || "10.100.100.001",
          name: it.name,
          jobNumber: it.jobNumber || "—",
          deliveryNote: it.deliveryNote || "SJ-2026-001",
          receiveQty: parseFloat(String(it.receiveQty ?? "").replace(",", ".")) || 1,
          unit: it.unit || "PCE",
          location: it.location || "Gudang Sparepart",
          purpose: it.purpose || remark || "Warehouse Receipt",
        })),
      };

      const res = await createWarehouseBpb(payload);
      setShowSaveConfirm(false);
      setIsSubmitting(false);
      onSaved(res?.data);
    } catch (err: any) {
      console.error("Failed to create BPB:", err);
      setNotification({
        type: "error",
        message: err?.message || "Failed to save Receive Material (BPB). Please try again.",
      });
      setShowSaveConfirm(false);
      setIsSubmitting(false);
    }
  };

  // Available Warehouse Locations
  const warehouseOptions = useMemo(() => {
    const locs = new Set<string>(["Gudang Sparepart", "Gudang Utama", "Gudang Bahan Baku", "Gudang B3"]);
    warehouses.forEach((w) => {
      if (w.name) locs.add(w.name);
    });
    initialWarehouseMasterRecords.forEach((w: any) => {
      if (w.warehouseName || w.name) locs.add(w.warehouseName || w.name);
    });
    return Array.from(locs);
  }, [warehouses]);

  // Compile RN options list for single RN selection:
  // Must be Approved AND NOT yet received in any active BPB (Double BPB Prevention)
  const rnOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    existingRns.forEach((r) => {
      const num = getSafeDocString(r.rn_number) || getSafeDocString(r._rawRn) || getSafeDocString(r.rnNumber);
      if (!num || seen.has(num)) return;

      // Filter out unapproved RNs
      if (!isRnApproved(r)) return;

      // Filter out RNs that have already been received in an existing non-rejected BPB
      const existingBpb = findExistingBpbForRn(num);
      if (existingBpb) return;
      if (r.is_received_in_bpb && r.bpb_number && r.bpb_status !== "Rejected") return;

      seen.add(num);
      const sup = r.supplier?.name || r.supplierName || (typeof r.supplier === "string" ? r.supplier : "");
      const itemsCount = (r.items?.length || r.purchase_order_receive_notes?.length || 1);
      list.push({
        value: num,
        label: `${num} ${sup ? `(${sup} · ${itemsCount} item${itemsCount > 1 ? "s" : ""})` : ""}`,
      });
    });

    return list;
  }, [existingRns, existingBpbs]);

  return (
    <div className="transaction-create-page">
      {/* Page Header */}
      <div className="tx-page-header">
        <h1 className="tx-page-title">Add Receive Material (BPB)</h1>
      </div>

      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background:
              notification.type === "error"
                ? "#fef2f2"
                : notification.type === "warning"
                  ? "#fffbeb"
                  : "#f0fdf4",
            border: `1px solid ${notification.type === "error"
              ? "#fecaca"
              : notification.type === "warning"
                ? "#fde68a"
                : "#bbf7d0"
              }`,
            borderRadius: "var(--radius-sm)",
            color:
              notification.type === "error"
                ? "#b91c1c"
                : notification.type === "warning"
                  ? "#b45309"
                  : "#15803d",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={
                notification.type === "error" || notification.type === "warning"
                  ? "alertTriangle"
                  : "check"
              }
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              color: "inherit",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Transaction Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSaveClick}>
          {/* Header Field Grid (Structured 4-column layout with balanced rows) */}
          <div className="tx-header-grid">
            {/* Row 1: RN Number | BPB Type | Receive Date | Supplier Name (Takes from RN, Read-Only) */}
            <div className="master-form-group">
              <label htmlFor="bpbRnNumber" className="master-form-label">
                RN Number <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                id="bpbRnNumber"
                value={rnNumber}
                onChange={(val) => handleSelectRn(val)}
                placeholder="Select RN Number..."
                options={[
                  { value: "", label: "Select RN Number..." },
                  ...rnOptions,
                ]}
              />
              {(() => {
                const existingBpb = findExistingBpbForRn(rnNumber);
                if (existingBpb) {
                  return (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#b91c1c",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        marginTop: "5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        lineHeight: 1.3,
                      }}
                    >
                      <Icon name="alertTriangle" size={13} />
                      <span>
                        Blocked: RN was already received in <strong>{existingBpb.bpbNumber}</strong>. Duplicate BPB is strictly prohibited.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {formErrors.rnNumber && (
                <span className="master-form-error">{formErrors.rnNumber}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbType" className="master-form-label">
                BPB Type <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                id="bpbType"
                value={bpbType}
                onChange={(val) => setBpbType(val)}
                options={[
                  { value: "Gudang", label: "Warehouse (Gudang)" },
                  { value: "Timbangan", label: "Scale (Timbangan)" },
                  { value: "Pembelian Langsung", label: "Direct Purchase" },
                ]}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbReceiveDate" className="master-form-label">
                Receive Date <span className="required-asterisk">*</span>
              </label>
              <CustomDatePicker
                id="bpbReceiveDate"
                value={receiveDate}
                onChange={(val) => setReceiveDate(val)}
                className={formErrors.receiveDate ? "has-error" : ""}
              />
              {formErrors.receiveDate && (
                <span className="master-form-error">{formErrors.receiveDate}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbSupplier" className="master-form-label">
                Supplier Name
              </label>
              <input
                id="bpbSupplier"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={supplier || "—"}
                readOnly
                disabled
              />
            </div>

            {/* Row 2: Invoice Number | Invoice Date | Tax Invoice | Vehicle License Plate (All from RN, Read-Only) */}
            <div className="master-form-group">
              <label htmlFor="bpbInvoiceNo" className="master-form-label">
                Invoice Number
              </label>
              <input
                id="bpbInvoiceNo"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={invoiceNumber || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbInvoiceDate" className="master-form-label">
                Invoice Date
              </label>
              <input
                id="bpbInvoiceDate"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={invoiceDate || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbTaxInvoice" className="master-form-label">
                Tax Invoice (Faktur Pajak)
              </label>
              <input
                id="bpbTaxInvoice"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={taxInvoice || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbPlateNo" className="master-form-label">
                Vehicle License Plate (No. Pol)
              </label>
              <input
                id="bpbPlateNo"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={plateNo || "—"}
                readOnly
                disabled
              />
            </div>

            {/* Row 3: Aju Number | Aju Date | Registration Number | Registration Date (All from RN, Read-Only) */}
            <div className="master-form-group">
              <label htmlFor="bpbAjuNumber" className="master-form-label">
                Aju Number (Customs Barcode)
              </label>
              <input
                id="bpbAjuNumber"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={ajuNumber || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbAjuDate" className="master-form-label">
                Aju Date
              </label>
              <input
                id="bpbAjuDate"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={ajuDate || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbNoPen" className="master-form-label">
                Registration Number (No. Pen)
              </label>
              <input
                id="bpbNoPen"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={noPen || "—"}
                readOnly
                disabled
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbRegDate" className="master-form-label">
                Registration Date
              </label>
              <input
                id="bpbRegDate"
                type="text"
                className="master-form-input tx-input-cell--disabled"
                value={regDate || "—"}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* Material Items Section */}
          <div className="tx-tabs-header">
            <button type="button" className="tx-tab-btn active">
              Material Items to Receive ({items.length})
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Material items from selected RN ({rnNumber || "None selected"}).
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItemLine}
              >
                Add Item Line
              </Button>
            </div>

            {formErrors.items && (
              <div
                style={{
                  color: "var(--red-600)",
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                {formErrors.items}
              </div>
            )}

            <div className="tx-table-container">
              <table className="tx-grid-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px", minWidth: "45px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "220px" }}>Item & Code</th>
                    <th style={{ width: "120px", minWidth: "120px" }}>Job Number</th>
                    <th style={{ width: "140px", minWidth: "140px" }}>PO Number</th>
                    <th style={{ width: "150px", minWidth: "150px" }}>Delivery Note (SJ)</th>
                    <th style={{ width: "140px", minWidth: "140px", textAlign: "right" }}>Receive Quantity *</th>
                    <th style={{ minWidth: "180px" }}>Warehouse Location</th>
                    <th style={{ minWidth: "180px" }}>Description</th>
                    <th style={{ width: "50px", minWidth: "50px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                        No items loaded yet. Please select an RN Number above to load items.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => (
                      <tr key={it.id}>
                        <td
                          style={{
                            textAlign: "center",
                            fontWeight: 700,
                            color: "var(--muted)",
                          }}
                        >
                          {idx + 1}
                        </td>

                        {/* Item & Code */}
                        <td>
                          {it.name && it.po_has_items_id ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{it.name}</div>
                              <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>{it.code || "10.100.100.001"}</div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <input
                                type="text"
                                className="tx-input-cell"
                                placeholder="Material Item name..."
                                value={it.name}
                                onChange={(e) => handleUpdateItemField(it.id, "name", e.target.value)}
                              />
                              <input
                                type="text"
                                className="tx-input-cell font-mono"
                                style={{ fontSize: "11px", color: "var(--muted)" }}
                                placeholder="Item code (optional)..."
                                value={it.code}
                                onChange={(e) => handleUpdateItemField(it.id, "code", e.target.value)}
                              />
                            </div>
                          )}
                        </td>

                        {/* Job Number */}
                        <td>
                          <span style={{ fontFamily: "monospace", color: "var(--ink-muted, #64748b)" }}>{it.jobNumber || "—"}</span>
                        </td>

                        {/* PO Number */}
                        <td>
                          <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{it.poNumber || "—"}</span>
                        </td>

                        {/* Delivery Note */}
                        <td>
                          <span style={{ fontFamily: "monospace", color: "var(--ink)" }}>{it.deliveryNote || "—"}</span>
                        </td>

                        {/* Receive Quantity with Unit */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                            <input
                              type="number"
                              step="any"
                              min="0.0001"
                              className={`tx-input-cell tx-input-cell--num ${formErrors[`item_${idx}_qty`] ? "has-error" : ""}`}
                              style={{ width: "95px" }}
                              value={it.receiveQty ?? ""}
                              onChange={(e) =>
                                handleUpdateItemField(
                                  it.id,
                                  "receiveQty",
                                  e.target.value
                                )
                              }
                              onBlur={() => {
                                const rawVal = String(it.receiveQty ?? "").trim().replace(",", ".");
                                const parsed = parseFloat(rawVal);
                                if (!rawVal || isNaN(parsed) || parsed <= 0) {
                                  handleUpdateItemField(it.id, "receiveQty", 1);
                                } else {
                                  handleUpdateItemField(it.id, "receiveQty", parsed);
                                }
                              }}
                            />
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", minWidth: "26px" }}>
                              {it.unit || "PCE"}
                            </span>
                          </div>
                        </td>

                        {/* Warehouse Location (Menentukan Gudang) */}
                        <td>
                          <CustomSelect
                            className="tx-custom-select-cell"
                            value={it.location}
                            onChange={(val) => handleUpdateItemField(it.id, "location", val)}
                            options={warehouseOptions.map((loc) => ({ value: loc, label: loc }))}
                          />
                        </td>

                        {/* Description (Remark dari sebelum-sebelumnya) */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell"
                            placeholder="Description / remark..."
                            value={it.purpose}
                            onChange={(e) => handleUpdateItemField(it.id, "purpose", e.target.value)}
                          />
                        </td>

                        {/* Action Delete */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="tx-row-delete-btn"
                            title="Remove item"
                            onClick={() => handleDeleteItemLine(it.id)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={5} style={{ textAlign: "right", padding: "10px 12px" }}>
                      Total Receive Quantity ({items.length} item{items.length > 1 ? "s" : ""}):
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px 12px",
                        fontFamily: "ui-monospace, monospace",
                        color: "var(--blue-700)",
                      }}
                    >
                      {totalReceivedQty.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td colSpan={3} style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "11px" }}>
                      {items[0]?.unit || "PCE"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Internal Note / Remark */}
          <div className="master-form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="bpbRemark" className="master-form-label">
              Receiving Note & Inspection Remark
            </label>
            <textarea
              id="bpbRemark"
              className="master-form-textarea"
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter receiving notes, seal inspection results, physical condition of goods..."
            />
          </div>

          {/* Action Buttons */}
          <div className="tx-actions-bar">
            <button
              type="submit"
              className="btn-tx-save"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? "Saving..." : "Save"}</span>
            </button>

            <button
              type="button"
              className="btn-tx-cancel"
              onClick={() => setShowCancelConfirm(true)}
            >
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="Are you sure you want to cancel? Any unsaved Receive Material (BPB) data will be lost."
        confirmLabel="Discard & Exit"
        cancelLabel="Continue Editing"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={onBack}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title={
          findExistingBpbForRn(rnNumber)
            ? "Submit Material Receipt with Duplicate Warning?"
            : "Submit Receive Material (BPB)?"
        }
        message={(() => {
          const dupBpb = findExistingBpbForRn(rnNumber);
          if (dupBpb) {
            return `Warning: RN ${rnNumber} has already been received in BPB ${dupBpb.bpbNumber}. Proceeding may result in duplicate material receipt (Double BPB). Are you sure you want to proceed and save this BPB?`;
          }
          return `Are you sure you want to record this Receive Material (BPB) for RN ${rnNumber} (${supplier}) with ${items.length} item line(s)?`;
        })()}
        confirmLabel={findExistingBpbForRn(rnNumber) ? "Proceed Anyway" : "Confirm & Save"}
        cancelLabel="Review BPB"
        confirmVariant={findExistingBpbForRn(rnNumber) ? "warning" : "primary"}
        icon={findExistingBpbForRn(rnNumber) ? "alertTriangle" : "check"}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

export default WarehouseCreate;
