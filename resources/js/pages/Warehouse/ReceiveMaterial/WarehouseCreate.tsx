import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { initialSupplierRecords } from "../../Procurement/PurchaseMaster/Supplier/supplier-types";
import { initialWarehouseMasterRecords } from "../MasterWarehouse/warehouse-master-data";
import { initialItemRecords } from "../../Exim/Master/Item/item-data";
import { poRows } from "../../../data/mockData";
import { fetchList, fetchDetail, createWarehouseBpb } from "../../../data/api";
import { getLocalApprovalState } from "../../../services/approvalApi";

export interface BPBItemRow {
  id: string;
  po_has_items_id?: number;
  poNumber: string;
  prNumber?: string;
  name: string;
  code: string;
  jobNumber: string;
  deliveryNote: string;
  orderedQty: number;
  receiveQty: number;
  unit: string;
  location: string;
  purpose: string;
}

interface WarehouseCreateProps {
  initialPoNumber?: string;
  onBack: () => void;
  onSaved: (newBpb?: any) => void;
}

export function WarehouseCreate({
  initialPoNumber,
  onBack,
  onSaved,
}: WarehouseCreateProps) {
  const today = new Date().toISOString().slice(0, 10);

  // Dynamic Master & Reference Datasets
  const [approvedPos, setApprovedPos] = useState<any[]>([]);
  const [existingRns, setExistingRns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [jobNumbers, setJobNumbers] = useState<string[]>([]);

  // Header State
  const [selectedRefKey, setSelectedRefKey] = useState("");
  const [rnNumber, setRnNumber] = useState(() => {
    const rand = String(Math.floor(Math.random() * 900) + 100).padStart(4, "0");
    return `${rand}/RN-IMLI/X/2026`;
  });
  const [poNumberHeader, setPoNumberHeader] = useState(initialPoNumber || "");
  const [bpbType, setBpbType] = useState("Gudang");
  const [bcType, setBcType] = useState("BC 4.0");
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

  // Items State — start with a clean row ready for PO selection or direct entry
  const [items, setItems] = useState<BPBItemRow[]>([
    {
      id: `bpb-item-${Date.now()}`,
      poNumber: initialPoNumber || "",
      prNumber: "—",
      name: "",
      code: "",
      jobNumber: "—",
      deliveryNote: `SJ-${new Date().getFullYear()}-001`,
      orderedQty: 0,
      receiveQty: 1.0,
      unit: "PCE",
      location: "Gudang Sparepart",
      purpose: "",
    },
  ]);

  // Dialog & Feedback State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
          name: poObj._rawRemark && poObj._rawRemark !== "-" ? poObj._rawRemark : "Material Item",
          code: "10.100.100.001",
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
    const rnNum = rnObj.rn_number || rnObj.rnNumber || "";
    const supName = rnObj.supplier?.name || rnObj.supplierName || rnObj.supplier || "";
    setRnNumber(rnNum);
    if (supName && typeof supName === "string") {
      setSupplier(supName);
    }
    if (rnObj.invoice_number) setInvoiceNumber(rnObj.invoice_number);
    if (rnObj.tax_invoice) setTaxInvoice(rnObj.tax_invoice);
    if (rnObj.license_plate) setPlateNo(rnObj.license_plate);
    if (rnObj.aju_number) setAjuNumber(rnObj.aju_number);
    if (rnObj.no_pen) setNoPen(rnObj.no_pen);
    if (rnObj.note) setRemark(rnObj.note);

    const poRnItems = rnObj.purchase_order_receive_notes || rnObj.purchaseOrderReceiveNotes || [];
    if (Array.isArray(poRnItems) && poRnItems.length > 0) {
      const mapped: BPBItemRow[] = poRnItems.map((por: any, idx: number) => {
        const poItem = por.purchase_order_item || por.purchaseOrderItem;
        const poDoc = poItem?.purchase_order || poItem?.purchaseOrder;
        const prItem = poItem?.purchase_request_item || poItem?.purchaseRequestItem;
        const prDoc = prItem?.purchase_request || prItem?.purchaseRequest;
        const itemMaster = poItem?.item || prItem?.item;
        const qty = Number(por.Diagnostic || por.quantity || poItem?.order || 1);

        return {
          id: `bpb-item-${Date.now()}-${idx}`,
          po_has_items_id: poItem?.id,
          poNumber: poDoc?.po_number || poNumberHeader || "POL-1026-0040",
          prNumber: prDoc?.pr_number || "—",
          name: itemMaster?.name || por.note || "Material Item",
          code: itemMaster?.code || "10.100.100.001",
          jobNumber: "—",
          deliveryNote: por.sj_number || rnObj.sj_number || "SJ-2026-001",
          orderedQty: qty,
          receiveQty: qty,
          unit: itemMaster?.unit?.code || "PCE",
          location: warehouses[0]?.name || "Gudang Sparepart",
          purpose: por.note || rnObj.note || "Inbound Receipt",
        };
      });
      setItems(mapped);
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
          const poNum = found._rawNumber || found._rawPo || found.poNumber;
          setSelectedRefKey(`PO:${poNum}`);
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
    fetch("/api/warehouse/rn?per_page=50", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data)) {
          setExistingRns(d.data);
        }
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

  // Handle Reference PO / RN Selection
  const handleSelectReference = (val: string) => {
    setSelectedRefKey(val);
    if (!val) return;

    if (val.startsWith("PO:")) {
      const poNum = val.slice(3);
      const foundPo = approvedPos.find(
        (p) => (p._rawNumber || p._rawPo || p.poNumber) === poNum
      );
      if (foundPo) {
        populateFromPo(foundPo);
      } else {
        fetchDetail("po", poNum).then((detail) => {
          if (detail) {
            populateFromPo(detail);
          }
        });
      }
    } else if (val.startsWith("RN:")) {
      const rnNum = val.slice(3);
      const foundRn = existingRns.find(
        (r) => (r.rn_number || r.rnNumber) === rnNum
      );
      if (foundRn) {
        populateFromRn(foundRn);
      }
    }
  };

  // Handle PO selection directly inside an Item Row (matching PR selection in PO Create)
  const handleSelectRowPo = (rowId: string, selectedPoNumber: string) => {
    if (!selectedPoNumber || selectedPoNumber === "—") {
      handleUpdateItemField(rowId, "poNumber", "");
      return;
    }

    const foundPo = approvedPos.find(
      (p) => (p._rawNumber || p._rawPo || p.poNumber) === selectedPoNumber
    );

    if (!foundPo) {
      handleUpdateItemField(rowId, "poNumber", selectedPoNumber);
      fetchDetail("po", selectedPoNumber).then((detail) => {
        if (detail) {
          setApprovedPos((prev) => [...prev, detail]);
          populateFromPo(detail);
        }
      });
      return;
    }

    if (foundPo) {
      const poNum = foundPo._rawNumber || foundPo._rawPo || foundPo.poNumber || selectedPoNumber;
      const prNum = foundPo._rawPr || foundPo.prNumber || "—";
      const rawSup = String(foundPo._rawSupplier || foundPo.supplier || "")
        .replace(/^\[[^\]]+\]\s*/, "")
        .trim();

      setSelectedRefKey(`PO:${poNum}`);
      setPoNumberHeader(poNum);
      if (rawSup) setSupplier(rawSup);
      if (foundPo._rawRn && foundPo._rawRn !== "—") {
        setRnNumber(foundPo._rawRn);
      }
      if (foundPo._rawRemark && foundPo._rawRemark !== "-") {
        setRemark(foundPo._rawRemark);
      }

      const poItems = getPoItemsList(foundPo);
      const defaultWh =
        warehouses[0]?.name ||
        (initialWarehouseMasterRecords[0] as any)?.name ||
        "Gudang Sparepart";
      const defaultSj = `SJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

      if (poItems.length > 0) {
        const first = poItems[0];
        const rawQtyStr = String(first.orderQty || first.rawQty || first.quantity || "1").replace(/[^0-9.]/g, "");
        const qtyNum = parseFloat(rawQtyStr) || 1;
        const unitMatch = String(first.quantity || "").match(/[A-Za-z]+$/);
        const unitStr = first.unit || (unitMatch ? unitMatch[0] : "PCE");

        setItems((prev) => {
          const updated = prev.map((r) => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              po_has_items_id: first.po_has_items_id || first.id,
              poNumber: poNum,
              prNumber: first.prNumber || prNum,
              name: first.item || first.itemName || "Material Item",
              code: first.itemCode || first.itemAlias || "10.100.100.001",
              jobNumber: first.jobNumber || r.jobNumber || "—",
              deliveryNote: r.deliveryNote || defaultSj,
              orderedQty: qtyNum,
              receiveQty: qtyNum,
              unit: unitStr,
              location: r.location || defaultWh,
              purpose: first.remark || foundPo._rawRemark || "Warehouse Inbound Receipt",
            };
          });

          if (poItems.length > 1) {
            const extraRows: BPBItemRow[] = poItems.slice(1).map((extra: any, extraIdx: number) => {
              const extraQtyStr = String(extra.orderQty || extra.rawQty || extra.quantity || "1").replace(/[^0-9.]/g, "");
              const extraQtyNum = parseFloat(extraQtyStr) || 1;
              const extraUnitMatch = String(extra.quantity || "").match(/[A-Za-z]+$/);
              const extraUnitStr = extra.unit || (extraUnitMatch ? extraUnitMatch[0] : "PCE");
              return {
                id: `bpb-item-${Date.now()}-${extraIdx + 1}`,
                po_has_items_id: extra.po_has_items_id || extra.id,
                poNumber: poNum,
                prNumber: extra.prNumber || prNum,
                name: extra.item || extra.itemName || "Material Item",
                code: extra.itemCode || extra.itemAlias || "10.100.100.001",
                jobNumber: extra.jobNumber || "—",
                deliveryNote: defaultSj,
                orderedQty: extraQtyNum,
                receiveQty: extraQtyNum,
                unit: extraUnitStr,
                location: defaultWh,
                purpose: extra.remark || foundPo._rawRemark || "Warehouse Inbound Receipt",
              };
            });
            return [...updated, ...extraRows];
          }

          return updated;
        });
        return;
      } else {
        // Fallback when summary PO row has empty _items: populate from summary & fetch detail
        const totalQtyNum = parseFloat(String(foundPo._totalQty || "1").replace(/[^0-9.]/g, "")) || 1;
        setItems((prev) =>
          prev.map((r) => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              poNumber: poNum,
              prNumber: prNum,
              name: foundPo._rawRemark && foundPo._rawRemark !== "-" ? foundPo._rawRemark : r.name || "Material Item",
              code: r.code || "10.100.100.001",
              deliveryNote: r.deliveryNote || defaultSj,
              orderedQty: totalQtyNum,
              receiveQty: totalQtyNum,
              location: r.location || defaultWh,
              purpose: foundPo._rawRemark || r.purpose || "Warehouse Inbound Receipt",
            };
          })
        );

        fetchDetail("po", poNum).then((detail) => {
          const detailItems = getPoItemsList(detail);
          if (detail && detailItems.length > 0) {
            const first = detailItems[0];
            const rawQtyStr = String(first.orderQty || first.rawQty || first.quantity || "1").replace(/[^0-9.]/g, "");
            const qtyNum = parseFloat(rawQtyStr) || 1;
            const unitMatch = String(first.quantity || "").match(/[A-Za-z]+$/);
            const unitStr = first.unit || (unitMatch ? unitMatch[0] : "PCE");

            setItems((prev) =>
              prev.map((r) => {
                if (r.id !== rowId) return r;
                return {
                  ...r,
                  po_has_items_id: first.po_has_items_id || first.id,
                  poNumber: poNum,
                  prNumber: first.prNumber || prNum,
                  name: first.item || first.itemName || "Material Item",
                  code: first.itemCode || first.itemAlias || "10.100.100.001",
                  jobNumber: first.jobNumber || r.jobNumber || "—",
                  deliveryNote: r.deliveryNote || defaultSj,
                  orderedQty: qtyNum,
                  receiveQty: qtyNum,
                  unit: unitStr,
                  location: r.location || defaultWh,
                  purpose: first.remark || detail._rawRemark || "Warehouse Inbound Receipt",
                };
              })
            );
          }
        });
        return;
      }
    }

    handleUpdateItemField(rowId, "poNumber", selectedPoNumber);
  };

  // Generate a fresh RN Number
  const handleGenerateNewRn = () => {
    const seq = String(Math.floor(Math.random() * 900) + 100).padStart(4, "0");
    setRnNumber(`${seq}/RN-IMLI/X/2026`);
  };

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
    return items.reduce((sum, it) => sum + (Number(it.receiveQty) || 0), 0);
  }, [items]);

  // Validation
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!rnNumber.trim()) errors.rnNumber = "RN Number is required.";
    if (!supplier.trim()) errors.supplier = "Supplier Name is required.";
    if (!receiveDate.trim()) errors.receiveDate = "Receive Date is required.";

    if (items.length === 0) {
      errors.items = "At least one material item is required.";
    } else {
      items.forEach((it, idx) => {
        if (!it.name.trim()) {
          errors[`item_${idx}_name`] = `Row ${idx + 1}: Material item name is required.`;
        }
        if (!it.receiveQty || Number(it.receiveQty) <= 0) {
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
        message: "Please complete all required fields and item lines before saving.",
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setNotification(null);

    try {
      const payload = {
        rn_number: rnNumber.trim(),
        po_number: poNumberHeader || items[0]?.poNumber || "POL-1026-0040",
        bpb_type: bpbType,
        bc_type: bcType,
        supplier: supplier.trim(),
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
          poNumber: it.poNumber || poNumberHeader || "POL-1026-0040",
          prNumber: it.prNumber || "—",
          code: it.code || "10.100.100.001",
          name: it.name,
          jobNumber: it.jobNumber || "—",
          deliveryNote: it.deliveryNote || "SJ-2026-001",
          receiveQty: Number(it.receiveQty) || 1,
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

  // Available Supplier Options
  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    if (supplier) names.add(supplier);
    suppliers.forEach((s) => {
      if (s.name) names.add(s.name);
    });
    initialSupplierRecords.forEach((s) => {
      if (s.supplierName) names.add(s.supplierName);
    });
    return Array.from(names);
  }, [suppliers, supplier]);

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

  // Available Material Items for datalist/dropdown
  const itemOptions = useMemo(() => {
    const list: Array<{ code: string; name: string }> = [];
    const seen = new Set<string>();
    masterItems.forEach((m) => {
      const name = m.name || m.itemName;
      const code = m.code || m.itemCode || "";
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push({ code, name });
      }
    });
    initialItemRecords.forEach((m) => {
      if (m.itemName && !seen.has(m.itemName)) {
        seen.add(m.itemName);
        list.push({ code: m.itemCode, name: m.itemName });
      }
    });
    return list;
  }, [masterItems]);

  // Compile Approved PO options for both Header and Row-level dropdowns
  const allPoOptions = useMemo(() => {
    const list: Array<{ poNumber: string; label: string; supplier: string }> = [];
    const seen = new Set<string>();

    approvedPos.forEach((p) => {
      const poNum = p._rawNumber || p._rawPo || p.poNumber;
      if (poNum && !seen.has(poNum)) {
        seen.add(poNum);
        const sup = String(p._rawSupplier || p.supplier || "")
          .replace(/^\[[^\]]+\]\s*/, "")
          .trim();
        const itemsCount = getPoItemsList(p).length || 1;
        list.push({
          poNumber: poNum,
          supplier: sup,
          label: `${poNum}${sup ? ` (${sup} · ${itemsCount} item${itemsCount > 1 ? "s" : ""})` : ""}`,
        });
      }
    });

    return list;
  }, [approvedPos]);

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
            background: notification.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${notification.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: "var(--radius-sm)",
            color: notification.type === "error" ? "#b91c1c" : "#15803d",
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
              name={notification.type === "error" ? "alertTriangle" : "check"}
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
            {/* Row 1: Reference Approved PO / RN (span 2) | RN Number | Receive Date */}
            <div className="master-form-group" style={{ gridColumn: "span 2" }}>
              <label htmlFor="bpbRefSelect" className="master-form-label">
                Reference Approved PO / Receive Note (Auto-Fill)
              </label>
              <select
                id="bpbRefSelect"
                className="master-form-select"
                value={selectedRefKey}
                onChange={(e) => handleSelectReference(e.target.value)}
              >
                <option value="">-- Select Approved PO or Receive Note to Auto-Populate --</option>
                <optgroup label="Approved Purchase Orders (Stage 2 Approved)">
                  {allPoOptions.map((po) => (
                    <option key={`po-${po.poNumber}`} value={`PO:${po.poNumber}`}>
                      {po.label} — Approved
                    </option>
                  ))}
                </optgroup>
                {existingRns.length > 0 && (
                  <optgroup label="Gate Receive Notes (RN)">
                    {existingRns.map((rn) => {
                      const rnNum = rn.rn_number || rn.rnNumber;
                      const sup = rn.supplier?.name || rn.supplierName || "";
                      return (
                        <option key={`rn-${rn.id}`} value={`RN:${rnNum}`}>
                          {rnNum} {sup ? `— ${sup}` : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbRnNumber" className="master-form-label">
                RN Number <span className="required-asterisk">*</span>
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  id="bpbRnNumber"
                  type="text"
                  className={`master-form-input ${formErrors.rnNumber ? "has-error" : ""}`}
                  style={{ flex: 1 }}
                  value={rnNumber}
                  onChange={(e) => setRnNumber(e.target.value)}
                  placeholder="e.g. 0131/RN-IMLI/X/2026"
                />
                <Button
                  type="button"
                  variant="secondary"
                  icon="refresh"
                  onClick={handleGenerateNewRn}
                  title="Generate New RN Number"
                />
              </div>
              {formErrors.rnNumber && (
                <span className="master-form-error">{formErrors.rnNumber}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbReceiveDate" className="master-form-label">
                Receive Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="bpbReceiveDate"
                type="date"
                className={`master-form-input ${formErrors.receiveDate ? "has-error" : ""}`}
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
              {formErrors.receiveDate && (
                <span className="master-form-error">{formErrors.receiveDate}</span>
              )}
            </div>

            {/* Row 2: Supplier Name (span 2) | BPB Type | Customs Doc Type */}
            <div className="master-form-group" style={{ gridColumn: "span 2" }}>
              <label htmlFor="bpbSupplier" className="master-form-label">
                Supplier Name <span className="required-asterisk">*</span>
              </label>
              <select
                id="bpbSupplier"
                className={`master-form-select ${formErrors.supplier ? "has-error" : ""}`}
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              >
                <option value="">Select Supplier...</option>
                {supplierOptions.map((supName) => (
                  <option key={supName} value={supName}>
                    {supName}
                  </option>
                ))}
              </select>
              {formErrors.supplier && (
                <span className="master-form-error">{formErrors.supplier}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbType" className="master-form-label">
                BPB Type <span className="required-asterisk">*</span>
              </label>
              <select
                id="bpbType"
                className="master-form-select"
                value={bpbType}
                onChange={(e) => setBpbType(e.target.value)}
              >
                <option value="Gudang">Warehouse (Gudang)</option>
                <option value="Timbangan">Scale (Timbangan)</option>
                <option value="Pembelian Langsung">Direct Purchase</option>
              </select>
            </div>

            <div className="master-form-group">
              <label htmlFor="bcType" className="master-form-label">
                Customs Doc Type
              </label>
              <select
                id="bcType"
                className="master-form-select"
                value={bcType}
                onChange={(e) => setBcType(e.target.value)}
              >
                <option value="BC 4.0">BC 4.0</option>
                <option value="BC 2.3">BC 2.3</option>
                <option value="BC 2.6.2">BC 2.6.2</option>
                <option value="BC 2.7">BC 2.7</option>
                <option value="Non-BC">Non-BC (Local)</option>
              </select>
            </div>

            {/* Row 3: Invoice Number | Invoice Date | Tax Invoice | Vehicle License Plate */}
            <div className="master-form-group">
              <label htmlFor="bpbInvoiceNo" className="master-form-label">
                Invoice Number
              </label>
              <input
                id="bpbInvoiceNo"
                type="text"
                className="master-form-input"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-XXXX-XX-XXX"
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbInvoiceDate" className="master-form-label">
                Invoice Date
              </label>
              <input
                id="bpbInvoiceDate"
                type="date"
                className="master-form-input"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbTaxInvoice" className="master-form-label">
                Tax Invoice (Faktur Pajak)
              </label>
              <input
                id="bpbTaxInvoice"
                type="text"
                className="master-form-input"
                value={taxInvoice}
                onChange={(e) => setTaxInvoice(e.target.value)}
                placeholder="010.002-XX.XXXXXXXX"
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbPlateNo" className="master-form-label">
                Vehicle License Plate (No. Pol)
              </label>
              <input
                id="bpbPlateNo"
                type="text"
                className="master-form-input"
                value={plateNo}
                onChange={(e) => setPlateNo(e.target.value)}
                placeholder="e.g. L 8372 VQ"
              />
            </div>

            {/* Row 4: Aju Number | Aju Date | Registration Number | Registration Date */}
            <div className="master-form-group">
              <label htmlFor="bpbAjuNumber" className="master-form-label">
                Aju Number (Customs Barcode)
              </label>
              <input
                id="bpbAjuNumber"
                type="text"
                className="master-form-input"
                value={ajuNumber}
                onChange={(e) => setAjuNumber(e.target.value)}
                placeholder="000040014562..."
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbAjuDate" className="master-form-label">
                Aju Date
              </label>
              <input
                id="bpbAjuDate"
                type="date"
                className="master-form-input"
                value={ajuDate}
                onChange={(e) => setAjuDate(e.target.value)}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbNoPen" className="master-form-label">
                Registration Number (No. Pen)
              </label>
              <input
                id="bpbNoPen"
                type="text"
                className="master-form-input"
                value={noPen}
                onChange={(e) => setNoPen(e.target.value)}
                placeholder="e.g. 088370"
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="bpbRegDate" className="master-form-label">
                Registration Date
              </label>
              <input
                id="bpbRegDate"
                type="date"
                className="master-form-input"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
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
                Select an Approved PO Number below or from the Reference field above to auto-populate received items.
              </span>
              <Button
                type="button"
                variant="secondary"
                icon="plus"
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

            {/* Datalist for Master Items */}
            <datalist id="bpb-master-items-list">
              {itemOptions.map((it) => (
                <option key={`${it.code}-${it.name}`} value={it.name}>
                  {it.code}
                </option>
              ))}
            </datalist>

            <div className="tx-table-container">
              <table className="tx-grid-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "46px", width: "46px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "235px" }}>PO Reference</th>
                    <th style={{ minWidth: "220px" }}>Material Item *</th>
                    <th style={{ minWidth: "150px" }}>Item Code</th>
                    <th style={{ minWidth: "125px" }}>Job Number</th>
                    <th style={{ minWidth: "165px" }}>Delivery Note (SJ)</th>
                    <th style={{ minWidth: "95px", textAlign: "right" }}>PO Ordered</th>
                    <th style={{ minWidth: "115px", textAlign: "right" }}>Receive Qty *</th>
                    <th style={{ minWidth: "96px" }}>Unit</th>
                    <th style={{ minWidth: "175px" }}>Warehouse Location</th>
                    <th style={{ minWidth: "210px" }}>Description / Purpose</th>
                    <th style={{ minWidth: "52px", width: "52px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
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

                      {/* PO Reference Dropdown (Matches PR Number dropdown in PO Create) */}
                      <td>
                        <select
                          className="tx-input-cell"
                          style={{ minWidth: "220px" }}
                          value={it.poNumber}
                          onChange={(e) => handleSelectRowPo(it.id, e.target.value)}
                        >
                          <option value="">Select Approved PO...</option>
                          <option value="—">— Direct Receipt (No PO) —</option>
                          {allPoOptions.map((p) => (
                            <option key={p.poNumber} value={p.poNumber}>
                              {p.label}
                            </option>
                          ))}
                          {it.poNumber &&
                            it.poNumber !== "—" &&
                            !allPoOptions.some((p) => p.poNumber === it.poNumber) && (
                              <option value={it.poNumber}>{it.poNumber}</option>
                            )}
                        </select>
                      </td>

                      {/* Material Item Name */}
                      <td>
                        <input
                          type="text"
                          list="bpb-master-items-list"
                          className={`tx-input-cell ${formErrors[`item_${idx}_name`] ? "has-error" : ""
                            }`}
                          style={{ minWidth: "205px" }}
                          value={it.name}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "name", e.target.value)
                          }
                          placeholder="Search or enter material name..."
                        />
                      </td>

                      {/* Item Code */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          style={{ minWidth: "135px" }}
                          value={it.code}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "code", e.target.value)
                          }
                          placeholder="60.100.xxx"
                        />
                      </td>

                      {/* Job Number */}
                      <td>
                        <select
                          className="tx-input-cell"
                          style={{ minWidth: "110px" }}
                          value={it.jobNumber}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "jobNumber", e.target.value)
                          }
                        >
                          <option value="—">—</option>
                          {jobNumbers.map((jn) => (
                            <option key={jn} value={jn}>
                              {jn}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Delivery Note (SJ) */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          style={{ minWidth: "150px" }}
                          value={it.deliveryNote}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "deliveryNote", e.target.value)
                          }
                          placeholder="SJ / DN Number..."
                        />
                      </td>

                      {/* Ordered Quantity (Read-only reference from PO) */}
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "ui-monospace, monospace",
                          color: "var(--muted)",
                          fontWeight: 600,
                        }}
                      >
                        {(Number(it.orderedQty) || 0).toFixed(2)}
                      </td>

                      {/* Receive Quantity */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          className={`tx-input-cell tx-input-cell--num ${formErrors[`item_${idx}_qty`] ? "has-error" : ""
                            }`}
                          style={{ minWidth: "100px" }}
                          value={it.receiveQty}
                          onChange={(e) =>
                            handleUpdateItemField(
                              it.id,
                              "receiveQty",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </td>

                      {/* Unit */}
                      <td>
                        <select
                          className="tx-input-cell"
                          style={{ minWidth: "90px" }}
                          value={it.unit}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "unit", e.target.value)
                          }
                        >
                          <option value="PCE">PCE</option>
                          <option value="PCS">PCS</option>
                          <option value="KGM">KGM</option>
                          <option value="KG">KG</option>
                          <option value="SET">SET</option>
                          <option value="ROLL">ROLL</option>
                          <option value="MTR">MTR</option>
                          <option value="BOX">BOX</option>
                          <option value="LTR">LTR</option>
                          {it.unit &&
                            !["PCE", "PCS", "KGM", "KG", "SET", "ROLL", "MTR", "BOX", "LTR"].includes(it.unit) && (
                              <option value={it.unit}>{it.unit}</option>
                            )}
                        </select>
                      </td>

                      {/* Warehouse Location */}
                      <td>
                        <select
                          className="tx-input-cell"
                          style={{ minWidth: "160px" }}
                          value={it.location}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "location", e.target.value)
                          }
                        >
                          {warehouseOptions.map((loc) => (
                            <option key={loc} value={loc}>
                              {loc}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Description / Purpose */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          style={{ minWidth: "195px" }}
                          value={it.purpose}
                          onChange={(e) =>
                            handleUpdateItemField(it.id, "purpose", e.target.value)
                          }
                          placeholder="Item purpose / inspection note..."
                        />
                      </td>

                      {/* Action Delete */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="tx-row-delete-btn"
                          onClick={() => handleDeleteItemLine(it.id)}
                          title="Remove item"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={7} style={{ textAlign: "right", padding: "10px 12px" }}>
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
                    <td colSpan={4} style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "11px" }}>
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
        title="Submit Receive Material (BPB)?"
        message={`Are you sure you want to record this Receive Material (BPB) for RN ${rnNumber} (${supplier}) with ${items.length} item line(s)?`}
        confirmLabel="Confirm & Save"
        cancelLabel="Review BPB"
        confirmVariant="primary"
        icon="check"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

export default WarehouseCreate;
