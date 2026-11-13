import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { type AdditionalCostRecord } from "../PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { ItemRecord } from "../../Exim/Master/Item/item-types";
import { fetchList, fetchDetail, createPurchaseOrder } from "../../../data/api";
import { isPrItemClosed } from "../../../services/approvalApi";
import { PickPrItemModal, type PrItemToPick } from "./PickPrItemModal";

export interface POItemRow {
  id: string;
  prNumber: string;
  pr_has_items_id?: number;
  itemName: string;
  itemAlias: string;
  itemCode?: string;
  facility?: "Facility" | "Non Facility";
  price: number;
  unit: string;
  requestedQty: number;
  purchasedQty: number;
  orderQty: number;
  discountType?: "none" | "percent" | "amount";
  discountVal?: number;
  discountPercent: number;
  subtotal: number;
  lme: number;
  optionalRate: number;
  percentageLme: number;
  pphRate: number; // e.g. 0, 0.02, 0.005
  subtotalPph: number;
  remark: string;
}

export interface POAdditionalCostRow {
  id: string;
  costName: string;
  amount: number;
  remark: string;
}

interface PurchaseOrderCreateProps {
  initialPrNumber?: string;
  availableAdditionalCosts?: AdditionalCostRecord[];
  availableItems?: ItemRecord[];
  onBack: () => void;
  onSaveSuccess?: (newPO: any) => void;
}

export function PurchaseOrderCreate({
  initialPrNumber,
  availableAdditionalCosts,
  availableItems,
  onBack,
  onSaveSuccess,
}: PurchaseOrderCreateProps) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Tab State
  const [activeTab, setActiveTab] = useState<"items" | "costs">("items");

  // Dynamic Master Records
  const [approvedPrs, setApprovedPrs] = useState<any[]>([]);
  const [existingPos, setExistingPos] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [masterAdditionalCosts, setMasterAdditionalCosts] = useState<AdditionalCostRecord[]>(
    () => (availableAdditionalCosts && availableAdditionalCosts.length > 0 ? availableAdditionalCosts : [])
  );
  const [loadedMasterItems, setLoadedMasterItems] = useState<any[]>([]);
  const masterItems = useMemo(
    () => (loadedMasterItems.length > 0 ? loadedMasterItems : availableItems && availableItems.length > 0 ? availableItems : []),
    [loadedMasterItems, availableItems]
  );

  // Header State
  const [poType, setPoType] = useState("PO Standard");
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [currency, setCurrency] = useState("IDR - RUPIAH");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("Net 30 Days");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [isSubkon, setIsSubkon] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState<"subTotal" | "unitPrice">("subTotal");
  const [statusFacility, setStatusFacility] = useState<"Non Facility" | "Facility">("Facility");
  const [deliveryTerm, setDeliveryTerm] = useState("Loco Surabaya");
  const [latestDelivery, setLatestDelivery] = useState(defaultDue);
  const [remarkPo, setRemarkPo] = useState("");

  const handleRemarkPoChange = (newVal: string) => {
    setRemarkPo(newVal);
  };

  // Items State
  const [items, setItems] = useState<POItemRow[]>([
    {
      id: `po-item-${Date.now()}`,
      prNumber: "",
      itemName: "",
      itemAlias: "",
      itemCode: "",
      price: 0,
      unit: "PCE",
      requestedQty: 0,
      purchasedQty: 0,
      orderQty: 0,
      discountType: "none",
      discountVal: 0,
      discountPercent: 0,
      subtotal: 0,
      lme: 0,
      optionalRate: 1.0,
      percentageLme: 0,
      pphRate: 0,
      subtotalPph: 0,
      remark: "",
    },
  ]);

  // Additional Costs State
  const [additionalCosts, setAdditionalCosts] = useState<POAdditionalCostRow[]>([]);

  // Tax and Financial Summary Options
  const [discountOverallPercent, setDiscountOverallPercent] = useState<number>(0);
  const [isPpnActive, setIsPpnActive] = useState<boolean>(true);
  const [isKawasanBerikat, setIsKawasanBerikat] = useState<boolean>(true);

  // Dialog States
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isPrPickerOpen, setIsPrPickerOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Helper to safely extract string from string or React JSX element
  const safeExtractString = (val: any): string => {
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (React.isValidElement(val)) {
      const props: any = (val as any).props;
      if (props && props.children) {
        if (typeof props.children === "string" || typeof props.children === "number") {
          return String(props.children);
        }
        if (Array.isArray(props.children)) {
          return props.children.map(safeExtractString).join("");
        }
        return safeExtractString(props.children);
      }
    }
    return String(val || "");
  };

  // Helper to resolve Facility status from Master Item or PR item
  const resolveFacilityFromItem = (itemObjOrName: any): "Facility" | "Non Facility" | null => {
    if (!itemObjOrName) return null;
    if (typeof itemObjOrName === "object") {
      if (itemObjOrName.facility === "Facility" || itemObjOrName.facility === "Non Facility") {
        return itemObjOrName.facility;
      }
      const facField =
        itemObjOrName.facility ??
        itemObjOrName.facility_status ??
        itemObjOrName._rawFacility ??
        itemObjOrName.facilityStatus ??
        itemObjOrName.item?.facility ??
        itemObjOrName.item?.facility_status ??
        itemObjOrName.requisitionItem?.item?.facility;

      const rawFac =
        typeof facField === "object" && facField !== null
          ? safeExtractString(facField.name || facField.facility_name || "")
          : safeExtractString(facField || "");

      const upper = rawFac.toUpperCase().trim();
      if (upper.includes("NON")) return "Non Facility";
      if (itemObjOrName.facilities_id === 3 || itemObjOrName.item?.facilities_id === 3 || itemObjOrName.requisitionItem?.item?.facilities_id === 3) return "Non Facility";
      if (upper.includes("FASILITAS") || upper.includes("FACILITY") || upper.includes("BERIKAT")) return "Facility";
    }

    const code = typeof itemObjOrName === "object" ? safeExtractString(itemObjOrName.itemCode || itemObjOrName.itemAlias || itemObjOrName.code || "") : "";
    const name = typeof itemObjOrName === "object" ? safeExtractString(itemObjOrName.item || itemObjOrName.itemName || itemObjOrName.name || "") : String(itemObjOrName);

    const cleanCode = code && code !== "—" && code !== "-" ? code.trim().toLowerCase() : "";
    const cleanName = name ? name.trim().toLowerCase() : "";

    const match = masterItems.find(
      (m: any) =>
        (cleanCode && ((m.itemCode && m.itemCode.toLowerCase() === cleanCode) || (m.code && m.code.toLowerCase() === cleanCode))) ||
        (cleanName && ((m.itemName && m.itemName.toLowerCase() === cleanName) || (m.name && m.name.toLowerCase() === cleanName)))
    );
    if (match) {
      if (match.facilities_id === 3) return "Non Facility";
      const mFacField = match.facility ?? match.facility_status;
      const mFac = typeof mFacField === "object" && mFacField !== null ? (mFacField as any).name : mFacField;
      const mUpper = String(mFac || "").toUpperCase();
      if (mUpper.includes("NON")) return "Non Facility";
      if (mUpper.includes("FASILITAS") || mUpper.includes("FACILITY") || mUpper.includes("BERIKAT")) return "Facility";
    }
    return "Facility";
  };

  // Helper to extract open (non-Closed) items from a PR row object (UI-05)
  const getPrItemsList = (prObj: any): any[] => {
    if (!prObj) return [];
    const prNum = safeExtractString(prObj._rawNumber || prObj.prNumber || "");
    const rawList =
      prObj.items && Array.isArray(prObj.items) && prObj.items.length > 0
        ? prObj.items
        : prObj._items && Array.isArray(prObj._items) && prObj._items.length > 0
          ? prObj._items
          : [];
    return rawList.filter((it: any, idx: number) => !isPrItemClosed(prNum, it, idx));
  };

  // Helper to detect if a PR has already been converted into an existing PO
  const findExistingPoForPr = (prNum: any): { poNumber: string; status?: string } | null => {
    const prStr = safeExtractString(prNum);
    if (!prStr || prStr === "—" || prStr === "None") return null;
    const cleanTarget = prStr.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const pool = existingPos;
    for (const po of pool) {
      const poNum = safeExtractString(po._rawNumber || po._rawPo || po.poNumber);
      const rawPr = safeExtractString(po._rawPr || po.prNumber);
      const cleanRawPr = rawPr.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (cleanRawPr && cleanRawPr === cleanTarget) {
        return { poNumber: poNum || "PO", status: safeExtractString(po._rawStatus || po.status) };
      }
      const poItems = po.items || po._items || [];
      if (Array.isArray(poItems)) {
        for (const it of poItems) {
          const itemPr = safeExtractString(it.prNumber || it.pr_number || it._rawPr);
          const cleanItemPr = itemPr.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (cleanItemPr && cleanItemPr === cleanTarget) {
            return { poNumber: poNum || "PO", status: safeExtractString(po._rawStatus || po.status) };
          }
        }
      }
    }
    return null;
  };


  // Populate items from a given PR
  const populateFromPr = (prObj: any) => {
    if (!prObj) return;
    const prNum = safeExtractString(prObj._rawNumber || prObj.prNumber || "");
    const rawList =
      prObj.items && Array.isArray(prObj.items) && prObj.items.length > 0
        ? prObj.items
        : prObj._items && Array.isArray(prObj._items) && prObj._items.length > 0
          ? prObj._items
          : [];
    const prItems = rawList.filter((it: any, idx: number) => !isPrItemClosed(prNum, it, idx));

    if (rawList.length > 0 && prItems.length === 0) {
      setNotification({
        type: "error",
        message: `PR ${prNum} berstatus Closing (seluruh barang telah di-close) dan tidak dapat diproses ke Purchase Order.`,
      });
      return;
    }

    if (prItems.length === 0) {
      setNotification({
        type: "error",
        message: `Tidak ada barang yang aktif (belum di-closing) pada PR ${prNum}.`,
      });
      return;
    }

    const firstFac = resolveFacilityFromItem(prItems[0]);
    const isFormEmpty = items.length === 0 || items.every((r) => (!r.prNumber || r.prNumber === "—") && (!r.itemName || r.itemName === ""));
    const targetFacility = isFormEmpty && firstFac ? firstFac : (statusFacility || firstFac || "Facility");
    if (firstFac && (isFormEmpty || !statusFacility)) {
      setStatusFacility(firstFac);
      if (firstFac === "Facility") {
        setIsKawasanBerikat(true);
      } else {
        setIsKawasanBerikat(false);
      }
    }

    // Filter items matching targetFacility and having remaining quantity > 0 (belum dibeli atau outstanding)
    const matchingPrItems = prItems.filter((it: any) => {
      const fac = resolveFacilityFromItem(it);
      const reqQty = Number(it.rawQty || it.qty || parseFloat(safeExtractString(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
      const ordQty = Number(it.ordered_qty || 0);
      const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
      return fac === targetFacility && remQty > 0;
    });

    if (matchingPrItems.length === 0) {
      setNotification({
        type: "error",
        message: `PR ${prNum} does not contain any available items with ${targetFacility === "Facility" ? "Facility" : "Non Facility"} status (items may be fully ordered).`,
      });
      return;
    }

    if (matchingPrItems.length < prItems.length) {
      const excludedCount = prItems.length - matchingPrItems.length;
      setNotification({
        type: "warning",
        message: `PR ${prNum}: ${matchingPrItems.length} item(s) populated matching ${targetFacility === "Facility" ? "Facility" : "Non Facility"} status (${excludedCount} item(s) excluded or fully ordered).`,
      });
    }

    const newRows: POItemRow[] = matchingPrItems.map((it: any, idx: number) => {
      const reqQty = Number(it.rawQty || it.qty || parseFloat(safeExtractString(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
      const ordQty = Number(it.ordered_qty || 0);
      const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
      const orderQty = remQty > 0 ? remQty : reqQty;
      return {
        id: `po-item-${Date.now()}-${idx}`,
        prNumber: prNum,
        pr_has_items_id: it.pr_has_items_id || it.id,
        itemName: safeExtractString(it.item || it.itemName || "Material Item"),
        itemAlias: safeExtractString(
          it.itemAlias && it.itemAlias !== "—" && it.itemAlias !== it.itemCode
            ? it.itemAlias
            : it.alias && it.alias !== "—" && it.alias !== it.itemCode
              ? it.alias
              : it.itemName || it.item || "Industrial Material"
        ),
        itemCode: safeExtractString(it.itemCode || it.code || "—"),
        facility: targetFacility,
        price: 0,
        unit: safeExtractString(it.unit || "PCE"),
        requestedQty: reqQty,
        purchasedQty: ordQty,
        orderQty: orderQty,
        discountType: "none",
        discountVal: 0,
        discountPercent: 0,
        subtotal: 0,
        lme: Number(it.lme || 0),
        optionalRate: 1.0,
        percentageLme: Number(it.percentage_lme || it.percentageLme || it.lmePercentage || 0),
        pphRate: 0,
        subtotalPph: 0,
        remark: safeExtractString(it.remark || prObj._rawRemark || prObj.remark || ""),
      };
    });

    setItems(newRows);
  };

  // Fetch approved PRs and master datasets on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Fetch approved PRs from real API
    fetchList("pr", { perPage: 100 }).then((res) => {
      if (isMounted && res.rows && res.rows.length > 0) {
        // Collect PRs that have passed approval stages (Backend or LocalStorage)
        const approved = res.rows.filter((r: any) => {
          const st = safeExtractString(r._rawStatus || r.status).toLowerCase();
          const prNum = safeExtractString(r._rawNumber || r.prNumber);
          const isBackendApproved =
            r.is_approved === true ||
            r.is_approved === 1 ||
            Boolean(r.approved2_by) ||
            Boolean(r.approvals?.some((a: any) => (a.tier === 2 || a.approval_ke == 2) && (a.status === 1 || a.status === "Approved")));

          const isPassedApproval =
            isBackendApproved ||
            st.includes("approved") ||
            st === "approved 1" ||
            st === "approved 2" ||
            st === "approved";

          const rawItems =
            r.items && Array.isArray(r.items) && r.items.length > 0
              ? r.items
              : r._items && Array.isArray(r._items) && r._items.length > 0
                ? r._items
                : [];
          const openItems = rawItems.filter((it: any, idx: number) => !isPrItemClosed(prNum, it, idx));
          const hasOpenItems = rawItems.length === 0 || openItems.length > 0;

          // If completely closing or all items closed -> cannot be converted to PO
          if (st === "closing" || (rawItems.length > 0 && openItems.length === 0)) {
            return false;
          }

          return isPassedApproval && hasOpenItems;
        });
        setApprovedPrs(approved.length > 0 ? approved : res.rows);

        // Pre-fill if initialPrNumber is provided
        if (initialPrNumber) {
          const cleanTarget = safeExtractString(initialPrNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          const match = (approved.length > 0 ? approved : res.rows).find((p: any) => {
            const cleanP = safeExtractString(p._rawNumber || p.prNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            return cleanP === cleanTarget;
          });
          if (match) {
            populateFromPr(match);
          }
        }
      }
    });

    // 2. Fetch master suppliers
    fetch("/api/procurement/master/suppliers", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setSuppliers(d.data);
          if (!selectedSupplierId) {
            setSelectedSupplierId(String(d.data[0].id));
            setSupplierAddress(d.data[0].address || "");
            if (d.data[0].payment_term?.name) setPaymentTerm(d.data[0].payment_term.name);
          }
        }
      })
      .catch(() => { });

    // 3. Fetch master payment terms
    fetch("/api/procurement/master/payment-terms", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setPaymentTerms(d.data);
        }
      })
      .catch(() => { });

    // 4. Fetch master delivery terms
    fetch("/api/procurement/master/delivery-terms", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setDeliveryTerms(d.data);
        }
      })
      .catch(() => { });

    // 5. Fetch master currencies
    fetch("/api/procurement/master/currencies", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setCurrencies(d.data);
        }
      })
      .catch(() => { });

    // 6. Fetch master additional costs for dropdown (UI-01)
    fetch("/api/procurement/master/additional-costs?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          const mapped: AdditionalCostRecord[] = d.data.map((c: any) => ({
            id: String(c.id || `ac-${c.code}`),
            costCode: String(c.code || c.costCode || ""),
            costName: String(c.name || c.costName || ""),
            hidden: Boolean(c.hidden || c.status === 0),
          })).filter((c: AdditionalCostRecord) => c.costName && !c.hidden);
          if (mapped.length > 0) {
            setMasterAdditionalCosts(mapped);
          }
        }
      })
      .catch(() => { });

    // 7. Fetch existing POs to check duplicate PR processing
    fetchList("po", { perPage: 100 })
      .then((res) => {
        if (isMounted && res.rows && res.rows.length > 0) {
          setExistingPos(res.rows);
        }
      })
      .catch(() => { });

    // 8. Fetch master items for facility resolution
    fetch("/api/exim/master/items?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d?.data && Array.isArray(d.data) && d.data.length > 0) {
          setLoadedMasterItems(d.data);
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, [initialPrNumber]);

  useEffect(() => {
    if (availableAdditionalCosts && availableAdditionalCosts.length > 0) {
      setMasterAdditionalCosts(availableAdditionalCosts);
    }
  }, [availableAdditionalCosts]);

  // Handle supplier change: auto-fill address and default payment term
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setSupplierAddress("");
      return;
    }

    const foundApi = suppliers.find((s) => String(s.id) === String(supplierId));
    if (foundApi) {
      setSupplierAddress(foundApi.address || "");
      if (foundApi.payment_term?.name) {
        setPaymentTerm(foundApi.payment_term.name);
      }
      if (foundApi.payment_method?.name) {
        setPaymentMethod(foundApi.payment_method.name);
      }
      return;
    }
  };

  // Recalculate Item Subtotal and PPH
  const calculateLineSubtotal = (
    price: number,
    qty: number,
    discVal: number,
    discType: "none" | "percent" | "amount" = "none"
  ) => {
    const gross = (Number(price) || 0) * (Number(qty) || 0);
    if (!discType || discType === "none") {
      return Math.max(0, gross);
    }
    const discount =
      discType === "amount"
        ? Number(discVal || 0)
        : (gross * (Number(discVal) || 0)) / 100;
    return Math.max(0, gross - discount);
  };

  // Add Item Row (Blank)
  const handleAddItemRow = () => {
    const newRow: POItemRow = {
      id: `po-item-${Date.now()}`,
      prNumber: "",
      itemName: "",
      itemAlias: "",
      itemCode: "",
      price: 0,
      unit: "PCE",
      requestedQty: 0,
      purchasedQty: 0,
      orderQty: 0,
      discountType: "none",
      discountVal: 0,
      discountPercent: 0,
      subtotal: 0,
      lme: 0,
      optionalRate: 1.0,
      percentageLme: 0,
      pphRate: 0,
      subtotalPph: 0,
      remark: "",
    };
    setItems((prev) => [...prev, newRow]);
  };

  // Add Items from PR Picker Modal
  const handleAddPrItems = (selectedItems: PrItemToPick[]) => {
    if (!selectedItems || selectedItems.length === 0) return;

    if (selectedItems.length > 0) {
      const firstFac: "Facility" | "Non Facility" = selectedItems[0].facility.toUpperCase().includes("NON")
        ? "Non Facility"
        : "Facility";
      if (!statusFacility) {
        setStatusFacility(firstFac);
        if (firstFac === "Facility") {
          setIsKawasanBerikat(true);
        } else {
          setIsKawasanBerikat(false);
        }
      }
    }

    setItems((prev) => {
      // If the current table only has 1 blank untouched row, replace it
      const isFirstRowEmpty =
        prev.length === 1 &&
        !prev[0].prNumber &&
        !prev[0].itemName &&
        Number(prev[0].orderQty) === 0;

      const newRows: POItemRow[] = selectedItems.map((it, idx) => {
        const fac: "Facility" | "Non Facility" = it.facility.toUpperCase().includes("NON")
          ? "Non Facility"
          : "Facility";
        const orderQty = it.remainingQty > 0 ? it.remainingQty : it.requestedQty;
        const sub = calculateLineSubtotal(0, orderQty, 0, "none");

        return {
          id: `po-item-${Date.now()}-${idx}`,
          prNumber: it.prNumber,
          pr_has_items_id: it.pr_has_items_id,
          itemName: it.itemName,
          itemCode: it.itemCode,
          itemAlias: (it.itemAlias && it.itemAlias !== "—" && it.itemAlias !== it.itemCode)
            ? it.itemAlias
            : (it.itemName || (it as any).item || (it as any).material || it.itemCode),
          facility: fac,
          price: 0,
          unit: it.unit || "PCE",
          requestedQty: it.requestedQty,
          purchasedQty: it.orderedQty,
          orderQty: orderQty,
          discountType: "none",
          discountVal: 0,
          discountPercent: 0,
          subtotal: sub,
          lme: it.lme ?? 0,
          optionalRate: 1.0,
          percentageLme: it.percentageLme ?? 0,
          pphRate: 0,
          subtotalPph: 0,
          remark: it.remark || "",
        };
      });

      return isFirstRowEmpty ? newRows : [...prev, ...newRows];
    });
  };

// Delete Item Row
const handleDeleteItemRow = (id: string) => {
  setItems((prev) => {
    if (prev.length <= 1) return prev;
    return prev.filter((r) => r.id !== id);
  });
};

// Update Item Field
const handleUpdateItemField = (id: string, field: keyof POItemRow, val: any) => {
  if (field === "itemName" || field === "itemAlias") {
    const derivedFac = resolveFacilityFromItem(val);
    if (derivedFac) {
      setStatusFacility(derivedFac);
      if (derivedFac === "Facility") setIsKawasanBerikat(true);
    }
  }
  setItems((prev) =>
    prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: val };

      if (field === "discountType") {
        updated.discountVal = 0;
        updated.discountPercent = 0;
      }

      if (field === "discountVal") {
        updated.discountPercent = Number(val) || 0;
      } else if (field === "discountPercent") {
        updated.discountVal = Number(val) || 0;
      }

      // Auto recalculate subtotal if price, orderQty, discountVal, discountPercent, discountType or pphRate changed
      if (
        field === "price" ||
        field === "orderQty" ||
        field === "discountVal" ||
        field === "discountPercent" ||
        field === "discountType" ||
        field === "pphRate"
      ) {
        const sub = calculateLineSubtotal(
          Number(updated.price) || 0,
          Number(updated.orderQty) || 0,
          Number(updated.discountVal ?? updated.discountPercent) || 0,
          updated.discountType || "none"
        );
        updated.subtotal = sub;
        updated.subtotalPph = sub * (Number(updated.pphRate) || 0);
      }

      return updated;
    })
  );
};

// Handle PR Number selection in an item row
const handleSelectPr = (rowId: string, selectedPrNumber: string) => {
  if (!selectedPrNumber || selectedPrNumber === "—") {
    handleUpdateItemField(rowId, "prNumber", "");
    return;
  }

  // Check for duplicate PR in existing POs
  const existingPo = findExistingPoForPr(selectedPrNumber);
  if (existingPo) {
    setNotification({
      type: "warning",
      message: `Warning: PR ${selectedPrNumber} has already been converted into Purchase Order ${existingPo.poNumber}. Please verify to avoid duplicate PO creation (Double PO).`,
    });
  }

  const matchedPr = approvedPrs.find(
    (p) => safeExtractString(p._rawNumber || p.prNumber) === selectedPrNumber
  );

  if (matchedPr) {
    const rawList =
      (matchedPr.items && Array.isArray(matchedPr.items) ? matchedPr.items : []) ||
      (matchedPr._items && Array.isArray(matchedPr._items) ? matchedPr._items : []);
    const prItems = getPrItemsList(matchedPr);

    if (rawList.length > 0 && prItems.length === 0) {
      setNotification({
        type: "error",
        message: `PR ${selectedPrNumber} berstatus Closing (seluruh barang telah di-close) dan tidak dapat diproses ke Purchase Order.`,
      });
      setItems((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
              ...r,
              prNumber: "",
              pr_has_items_id: undefined,
              itemName: "",
              itemCode: "",
              itemAlias: "",
              orderQty: 0,
              requestedQty: 0,
              subtotal: 0,
            }
            : r
        )
      );
      return;
    }

    if (prItems.length > 0) {
      const targetFacility = statusFacility;
      const matchingPrItems = prItems.filter((it: any) => {
        const fac = resolveFacilityFromItem(it);
        const reqQty = Number(it.rawQty || it.qty || parseFloat(safeExtractString(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
        const ordQty = Number(it.ordered_qty || 0);
        const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
        return fac === targetFacility && remQty > 0;
      });

      if (matchingPrItems.length === 0) {
        setNotification({
          type: "error",
          message: `PR ${selectedPrNumber} does not contain any available items with ${targetFacility === "Facility" ? "Facility" : "Non Facility"} status (items may be fully ordered).`,
        });
        setItems((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                ...r,
                prNumber: "",
                pr_has_items_id: undefined,
                itemName: "",
                itemCode: "",
                itemAlias: "",
                orderQty: 0,
                requestedQty: 0,
                subtotal: 0,
              }
              : r
          )
        );
        return;
      }

      if (matchingPrItems.length < prItems.length) {
        const excludedCount = prItems.length - matchingPrItems.length;
        setNotification({
          type: "warning",
          message: `PR ${selectedPrNumber}: ${matchingPrItems.length} item(s) populated matching ${targetFacility === "Facility" ? "Facility" : "Non Facility"} status (${excludedCount} item(s) excluded or fully ordered).`,
        });
      }

      const first = matchingPrItems[0];
      const reqQty = Number(first.rawQty || first.qty || parseFloat(safeExtractString(first.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
      const ordQty = Number(first.ordered_qty || 0);
      const remQty = first.remaining_qty !== undefined ? Number(first.remaining_qty) : Math.max(0, reqQty - ordQty);
      const orderQty = remQty > 0 ? remQty : reqQty;
      const itemName = safeExtractString(first.item || first.itemName || "Material Item");
      const itemCode = safeExtractString(first.itemCode || first.code || "—");
      const rawAlias = safeExtractString(first.itemAlias || first.alias || "");
      const itemAlias = rawAlias && rawAlias !== "—" && rawAlias !== itemCode ? rawAlias : itemName;
      const unit = safeExtractString(first.unit || "PCE");
      const remark = safeExtractString(first.remark || matchedPr._rawRemark || matchedPr.remark || "");
      const prItemId = first.pr_has_items_id || first.id;

      setItems((prev) => {
        const updated = prev.map((r) => {
          if (r.id !== rowId) return r;
          const sub = calculateLineSubtotal(r.price, orderQty, r.discountVal ?? r.discountPercent ?? 0, r.discountType || "none");
          return {
            ...r,
            prNumber: selectedPrNumber,
            pr_has_items_id: prItemId,
            itemName,
            itemCode,
            itemAlias,
            facility: targetFacility,
            unit,
            requestedQty: reqQty,
            purchasedQty: ordQty,
            orderQty: orderQty,
            remark,
            subtotal: sub,
            subtotalPph: sub * (Number(r.pphRate) || 0),
            lme: Number(first.lme || 0),
            percentageLme: Number(first.percentage_lme || first.percentageLme || first.lmePercentage || 0),
          };
        });

        // If the PR has multiple matching items, append remaining items
        if (matchingPrItems.length > 1) {
          const extraRows: POItemRow[] = matchingPrItems.slice(1).map((extra: any, extraIdx: number) => {
            const extraReqQty = Number(extra.rawQty || extra.qty || parseFloat(safeExtractString(extra.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
            const extraOrdQty = Number(extra.ordered_qty || 0);
            const extraRemQty = extra.remaining_qty !== undefined ? Number(extra.remaining_qty) : Math.max(0, extraReqQty - extraOrdQty);
            const extraOrderQty = extraRemQty > 0 ? extraRemQty : extraReqQty;
            return {
              id: `po-item-${Date.now()}-${extraIdx}`,
              prNumber: selectedPrNumber,
              pr_has_items_id: extra.pr_has_items_id || extra.id,
              itemName: safeExtractString(extra.item || extra.itemName || "Material Item"),
              itemCode: safeExtractString(extra.itemCode || extra.code || "—"),
              itemAlias: (() => {
                const extraRawAlias = safeExtractString(extra.itemAlias || extra.alias || "");
                const extraCode = safeExtractString(extra.itemCode || extra.code || "—");
                const extraName = safeExtractString(extra.item || extra.itemName || "Material Item");
                return extraRawAlias && extraRawAlias !== "—" && extraRawAlias !== extraCode ? extraRawAlias : extraName;
              })(),
              facility: targetFacility,
              price: 0,
              unit: safeExtractString(extra.unit || "PCE"),
              requestedQty: extraReqQty,
              purchasedQty: extraOrdQty,
              orderQty: extraOrderQty,
              discountType: "none",
              discountVal: 0,
              discountPercent: 0,
              subtotal: 0,
              lme: Number(extra.lme || 0),
              optionalRate: 1.0,
              percentageLme: Number(extra.percentage_lme || extra.percentageLme || extra.lmePercentage || 0),
              pphRate: 0,
              subtotalPph: 0,
              remark: safeExtractString(extra.remark || matchedPr._rawRemark || matchedPr.remark || ""),
            };
          });
          return [...updated, ...extraRows];
        }

        return updated;
      });
      return;
    } else {
      // Fallback if PR summary row has empty _items: populate with basic info and fetchDetail
      const totalQty = parseFloat(safeExtractString(matchedPr.totalQuantity || matchedPr._totalQty || "1").replace(/[^0-9.]/g, "") || "1") || 1;
      const reqItemName = safeExtractString(matchedPr.item || matchedPr.itemName || matchedPr.material || "Industrial Material");
      const prRemark = safeExtractString(matchedPr._rawRemark || matchedPr.remark || "");
      setItems((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const sub = calculateLineSubtotal(r.price, totalQty, r.discountVal ?? r.discountPercent ?? 0, r.discountType || "none");
          return {
            ...r,
            prNumber: selectedPrNumber,
            itemName: reqItemName,
            requestedQty: totalQty,
            purchasedQty: 0,
            orderQty: totalQty,
            remark: prRemark || "",
            subtotal: sub,
            subtotalPph: sub * (Number(r.pphRate) || 0),
          };
        })
      );

      fetchDetail("pr", selectedPrNumber).then((detail) => {
        const detailItems = getPrItemsList(detail);
        const targetFacility = statusFacility;
        const matching = detailItems.filter((it: any) => {
          const fac = resolveFacilityFromItem(it);
          const reqQty = Number(it.rawQty || it.qty || parseFloat(safeExtractString(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
          const ordQty = Number(it.ordered_qty || 0);
          const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
          return fac === targetFacility && remQty > 0;
        });
        if (detail && matching.length > 0) {
          const first = matching[0];
          const reqQty = Number(first.rawQty || first.qty || parseFloat(safeExtractString(first.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
          const ordQty = Number(first.ordered_qty || 0);
          const remQty = first.remaining_qty !== undefined ? Number(first.remaining_qty) : Math.max(0, reqQty - ordQty);
          const orderQty = remQty > 0 ? remQty : reqQty;
          setItems((prev) =>
            prev.map((r) => {
              if (r.id !== rowId) return r;
              const sub = calculateLineSubtotal(r.price, orderQty, r.discountVal ?? r.discountPercent ?? 0, r.discountType || "none");
              return {
                ...r,
                pr_has_items_id: first.pr_has_items_id || first.id,
                itemName: safeExtractString(first.item || first.itemName || "Material Item"),
                itemAlias: (() => {
                  const rAlias = safeExtractString(first.itemAlias || first.alias || "");
                  const fCode = safeExtractString(first.itemCode || first.code || "—");
                  const fName = safeExtractString(first.item || first.itemName || "Material Item");
                  return rAlias && rAlias !== "—" && rAlias !== fCode ? rAlias : fName;
                })(),
                facility: targetFacility,
                unit: safeExtractString(first.unit || "PCE"),
                requestedQty: reqQty,
                purchasedQty: ordQty,
                orderQty: orderQty,
                remark: safeExtractString(first.remark || detail._rawRemark || detail.remark || ""),
                subtotal: sub,
                subtotalPph: sub * (Number(r.pphRate) || 0),
                lme: Number(first.lme || 0),
                percentageLme: Number(first.percentage_lme || first.percentageLme || first.lmePercentage || 0),
              };
            })
          );
        }
      });
      return;
    }
  }

  handleUpdateItemField(rowId, "prNumber", selectedPrNumber);
};

// Handle changing facility status in the form header
const handleFacilityStatusChange = (newFac: "Facility" | "Non Facility") => {
  setStatusFacility(newFac);
  if (newFac === "Facility") {
    setIsKawasanBerikat(true);
  } else {
    setIsKawasanBerikat(false);
  }

  setItems((prev) => {
    const activeRows = prev.filter((r) => (r.prNumber && r.prNumber !== "—") || (r.itemName && r.itemName.trim()));
    if (activeRows.length === 0) return prev;

    const matchingRows = activeRows.filter((r) => {
      const fac = resolveFacilityFromItem(r);
      return fac === newFac;
    });

    if (matchingRows.length === 0) {
      setNotification({
        type: "warning",
        message: `Facility status changed to ${newFac === "Facility" ? "Facility" : "Non Facility"}. Previously selected items do not match the new status and have been reset. Please select a matching PR.`,
      });
      return [
        {
          id: `po-item-${Date.now()}`,
          prNumber: "",
          itemName: "",
          itemAlias: "",
          itemCode: "",
          facility: newFac,
          price: 0,
          unit: "PCE",
          requestedQty: 0,
          purchasedQty: 0,
          orderQty: 0,
          discountType: "none",
          discountVal: 0,
          discountPercent: 0,
          subtotal: 0,
          lme: 0,
          optionalRate: 1.0,
          percentageLme: 0,
          pphRate: 0,
          subtotalPph: 0,
          remark: "",
        },
      ];
    }

    if (matchingRows.length < activeRows.length) {
      const removed = activeRows.length - matchingRows.length;
      setNotification({
        type: "warning",
        message: `Facility status changed to ${newFac === "Facility" ? "Facility" : "Non Facility"}. ${removed} mismatched item(s) have been excluded from the table.`,
      });
      return matchingRows;
    }

    return prev;
  });
};

// Add Additional Cost Row
const handleAddCostRow = () => {
  const newCost: POAdditionalCostRow = {
    id: `cost-${Date.now()}`,
    costName: "",
    amount: 0,
    remark: "",
  };
  setAdditionalCosts((prev) => [...prev, newCost]);
};

// Delete Additional Cost Row
const handleDeleteCostRow = (id: string) => {
  setAdditionalCosts((prev) => prev.filter((c) => c.id !== id));
};

// Update Cost Row Field
const handleUpdateCostField = (id: string, field: keyof POAdditionalCostRow, val: any) => {
  setAdditionalCosts((prev) =>
    prev.map((c) => (c.id === id ? { ...c, [field]: val } : c))
  );
};

// Financial Calculations
const totalSubtotal = useMemo(() => {
  return items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
}, [items]);

const discountAmount = useMemo(() => {
  return (totalSubtotal * (Number(discountOverallPercent) || 0)) / 100;
}, [totalSubtotal, discountOverallPercent]);

const dpp = useMemo(() => {
  return Math.max(0, totalSubtotal - discountAmount);
}, [totalSubtotal, discountAmount]);

const ppnAmount = useMemo(() => {
  return isPpnActive ? dpp * 0.11 : 0;
}, [isPpnActive, dpp]);

const totalAdditionalCosts = useMemo(() => {
  return additionalCosts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
}, [additionalCosts]);

const totalPph = useMemo(() => {
  return items.reduce((acc, it) => acc + (Number(it.subtotalPph) || 0), 0);
}, [items]);

const grandTotal = useMemo(() => {
  const effectivePpn = isPpnActive && !isKawasanBerikat ? ppnAmount : 0;
  return dpp + effectivePpn + totalAdditionalCosts - totalPph;
}, [dpp, ppnAmount, isPpnActive, isKawasanBerikat, totalAdditionalCosts, totalPph]);

// Validation
const validate = () => {
  const errors: Record<string, string> = {};
  if (!poType) errors.poType = "PO Type is required.";
  if (!date) errors.date = "Date is required.";
  if (!dueDate) errors.dueDate = "Due Date is required.";
  if (!currency) errors.currency = "Currency is required.";
  if (!exchangeRate || exchangeRate <= 0) errors.exchangeRate = "Rate must be > 0.";
  if (!selectedSupplierId) errors.supplier = "Supplier is required.";
  if (!latestDelivery) errors.latestDelivery = "Latest Delivery date is required.";

  if (items.length === 0) {
    errors.items = "At least one purchase order item is required.";
  } else {
    items.forEach((item, index) => {
      if (!item.itemName.trim()) {
        errors[`item_${index}_name`] = `Row ${index + 1}: Item Name is required.`;
      }
      if (!item.orderQty || item.orderQty <= 0) {
        errors[`item_${index}_qty`] = `Row ${index + 1}: Order Qty must be > 0.`;
      }
      if (item.price === undefined || item.price < 0) {
        errors[`item_${index}_price`] = `Row ${index + 1}: Price cannot be negative.`;
      }
      const itemFac = resolveFacilityFromItem(item);
      if (itemFac && itemFac !== statusFacility) {
        errors[`item_${index}_facility`] = `Row ${index + 1}: Item "${item.itemName}" facility status (${itemFac === "Facility" ? "Facility" : "Non Facility"}) does not match PO Facility Status (${statusFacility === "Facility" ? "Facility" : "Non Facility"}).`;
      }
    });
  }

  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

// Submit Handler
const handleSaveClick = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validate()) {
    setNotification({
      type: "error",
      message: "Please correct the required fields before saving the Purchase Order.",
    });
    return;
  }
  setShowSaveConfirm(true);
};

const handleConfirmSubmit = async () => {
  setIsSubmitting(true);
  try {
    const payload = {
      poType,
      supliers_id: selectedSupplierId,
      date,
      due_date: dueDate,
      currency,
      rate: exchangeRate,
      address: supplierAddress,
      paymentTerm,
      paymentMethod,
      deliveryTerm,
      latest_delivery: latestDelivery,
      service_subkon: isSubkon,
      facility_status: statusFacility === "Non Facility" ? "NON FASILITAS" : "FASILITAS",
      is_kawasan_berikat: statusFacility === "Facility" ? true : isKawasanBerikat,
      remark: remarkPo,
      items: items.map((it) => {
        const hasDiscount = it.discountType && it.discountType !== "none";
        const discVal = hasDiscount ? Number(it.discountVal ?? it.discountPercent ?? 0) : 0;
        return {
          pr_has_items_id: it.pr_has_items_id,
          prNumber: it.prNumber,
          itemName: it.itemName,
          item_code: it.itemCode,
          item_alias: it.itemAlias && it.itemAlias !== "—" && it.itemAlias !== it.itemCode
            ? it.itemAlias
            : (it.itemName || it.itemCode || ""),
          price: it.price,
          order: it.orderQty,
          purchased: it.purchasedQty,
          discount_type: !hasDiscount ? "none" : it.discountType === "amount" ? "nominal" : "percentage",
          discount_types_id: !hasDiscount ? null : it.discountType === "amount" ? 2 : 1,
          discount_val: discVal,
          discountPercent: it.discountType === "percent" ? discVal : 0,
          unit: it.unit,
          remark: it.remark?.trim() ? it.remark.trim() : "",
        };
      }),
      additional_costs: additionalCosts.map((c) => {
        const matchedMaster = masterAdditionalCosts.find((m) => m.costName === c.costName || Boolean((c as any).costCode && m.costCode === (c as any).costCode));
        const rawId = matchedMaster?.id;
        const numericId = rawId && !String(rawId).startsWith("ac-") && !isNaN(Number(rawId)) ? Number(rawId) : undefined;
        return {
          additional_cost_types_id: numericId,
          name: c.costName,
          costName: c.costName,
          amount: c.amount,
          value: c.amount,
          note: c.remark || "",
          remark: c.remark || "",
        };
      }),
    };

    const res = await createPurchaseOrder(payload);
    if (res && res.data) {
      if (onSaveSuccess) onSaveSuccess(res.data);
    } else {
      throw new Error("Failed to create Purchase Order.");
    }
  } catch (err: any) {
    console.error("Failed to submit PO to backend:", err);
    setNotification({
      type: "error",
      message: err.message || "Failed to create Purchase Order. Please try again.",
    });
    setIsSubmitting(false);
    setShowSaveConfirm(false);
    return;
  }

  setShowSaveConfirm(false);
  setIsSubmitting(false);
  onBack();
};

// Compile full approved PR options list for dropdown
const allPrOptions = useMemo(() => {
  const list: Array<{ prNumber: string; label: string }> = [];
  const seen = new Set<string>();

  approvedPrs.forEach((p) => {
    const num = safeExtractString(p._rawNumber || p.prNumber);
    if (!num || seen.has(num)) return;

    const st = safeExtractString(p._rawStatus || p.status).toLowerCase();
    const rawItems =
      p.items && Array.isArray(p.items) && p.items.length > 0
        ? p.items
        : p._items && Array.isArray(p._items) && p._items.length > 0
          ? p._items
          : [];
    const openItems = getPrItemsList(p);

    // Exclude PR if all items are closed
    if (st === "closing" || (rawItems.length > 0 && openItems.length === 0)) {
      return;
    }

    // Check if PR has any items with remaining quantity > 0 (belum dibeli / outstanding)
    const openRemainingItems = openItems.filter((it: any) => {
      const reqQty = Number(it.rawQty || it.qty || it.quantity || 1);
      const ordQty = Number(it.ordered_qty || 0);
      const remQty = it.remaining_qty !== undefined ? Number(it.remaining_qty) : Math.max(0, reqQty - ordQty);
      return remQty > 0;
    });

    // Exclude PR if all items are already fully ordered
    if (openItems.length > 0 && openRemainingItems.length === 0) {
      return;
    }

    seen.add(num);
    const dept = safeExtractString(p._rawDept || p.deptRequest || "");
    const targetFac = statusFacility;
    const matchingCount = openRemainingItems.filter((it: any) => resolveFacilityFromItem(it) === targetFac).length;
    const existingPo = findExistingPoForPr(num);
    const poWarning = existingPo ? ` ⚠️ [In PO: ${existingPo.poNumber}]` : "";
    const facLabel = targetFac === "Facility" ? "Facility" : "Non Facility";
    const countBadge = matchingCount > 0 ? `${matchingCount} ${facLabel}` : `0 ${facLabel}`;

    list.push({
      prNumber: num,
      label: `${num} ${dept ? `(${dept} · ${countBadge})` : `(${countBadge})`}${poWarning}`,
    });
  });


  return list;
}, [approvedPrs, existingPos, masterItems, statusFacility]);

return (
  <div className="transaction-create-page">
    {/* Page Header */}
    <div className="tx-page-header">
      <h1 className="tx-page-title">Add Purchase Order</h1>
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

    {/* Main Panel */}
    <div className="tx-panel">
      <form onSubmit={handleSaveClick}>
        {/* Header Field Grid (Structured 4-column layout with balanced rows) */}
        <div className="tx-header-grid">
          {/* Row 1: PO Type | Date | Due Date | Latest Delivery Date */}
          <div className="master-form-group">
            <label htmlFor="poType" className="master-form-label">
              PO Type <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="poType"
              value={poType}
              onChange={(val) => setPoType(val)}
              options={[
                { value: "PO Standard", label: "PO Standard" },
                { value: "PO Service", label: "PO Service" },
                { value: "PO Import", label: "PO Import" },
                { value: "PO Raw Material", label: "PO Raw Material" },
              ]}
            />
            {formErrors.poType && <span className="master-form-error">{formErrors.poType}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="poDate" className="master-form-label">
              Date <span className="required-asterisk">*</span>
            </label>
            <CustomDatePicker
              id="poDate"
              value={date}
              onChange={(val) => setDate(val)}
              className={formErrors.date ? "has-error" : ""}
            />
            {formErrors.date && <span className="master-form-error">{formErrors.date}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="poDueDate" className="master-form-label">
              Due Date <span className="required-asterisk">*</span>
            </label>
            <CustomDatePicker
              id="poDueDate"
              value={dueDate}
              onChange={(val) => setDueDate(val)}
              className={formErrors.dueDate ? "has-error" : ""}
            />
            {formErrors.dueDate && <span className="master-form-error">{formErrors.dueDate}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="poLatestDelivery" className="master-form-label">
              Latest Delivery Date <span className="required-asterisk">*</span>
            </label>
            <CustomDatePicker
              id="poLatestDelivery"
              value={latestDelivery}
              onChange={(val) => setLatestDelivery(val)}
              className={formErrors.latestDelivery ? "has-error" : ""}
            />
            {formErrors.latestDelivery && <span className="master-form-error">{formErrors.latestDelivery}</span>}
          </div>

          {/* Row 2: Supplier (span 2) | Currency | Exchange Rate */}
          <div className="master-form-group" style={{ gridColumn: "span 2" }}>
            <label htmlFor="poSupplier" className="master-form-label">
              Supplier <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="poSupplier"
              value={selectedSupplierId}
              onChange={(val) => handleSupplierChange(val)}
              placeholder="Find Supplier"
              options={[
                { value: "", label: "Find Supplier" },
                ...suppliers.map((sup) => ({
                  value: String(sup.id),
                  label: `${sup.code ? `[${sup.code}] ` : ""}${sup.name}`,
                })),
              ]}
            />
            {formErrors.supplier && <span className="master-form-error">{formErrors.supplier}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="poValuta" className="master-form-label">
              Currency <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="poValuta"
              value={currency}
              onChange={(val) => {
                setCurrency(val);
                const selectedCurr = currencies.find((c: any) => `${c.code || c.name} - ${c.name}` === val);
                const rateVal = Number(selectedCurr?.exchange_rate || selectedCurr?.rate || 1.0);
                setExchangeRate(rateVal > 0 ? rateVal : 1.0);
              }}
              options={currencies.map((c: any) => ({
                value: `${c.code || c.name} - ${c.name}`,
                label: `${c.code || c.name} - ${c.name}`,
              }))}
            />
            {formErrors.currency && <span className="master-form-error">{formErrors.currency}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="poRate" className="master-form-label">
              Exchange Rate <span className="required-asterisk">*</span>
            </label>
            <input
              id="poRate"
              type="number"
              step="any"
              min="0.0001"
              className={`master-form-input ${formErrors.exchangeRate ? "has-error" : ""}`}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
            />
            {formErrors.exchangeRate && <span className="master-form-error">{formErrors.exchangeRate}</span>}
          </div>

          {/* Row 3: Supplier Address (span 2) | Payment Term | Payment Method */}
          <div className="master-form-group" style={{ gridColumn: "span 2" }}>
            <label htmlFor="poAddress" className="master-form-label">
              Supplier Address
            </label>
            <input
              id="poAddress"
              type="text"
              className="master-form-input"
              placeholder="Supplier address..."
              value={supplierAddress}
              onChange={(e) => setSupplierAddress(e.target.value)}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="poPaymentTerm" className="master-form-label">
              Payment Term
            </label>
            <CustomSelect
              id="poPaymentTerm"
              value={paymentTerm}
              onChange={(val) => setPaymentTerm(val)}
              placeholder="Choose Payment Term"
              options={[
                { value: "", label: "Choose Payment Term" },
                ...paymentTerms.map((pt) => ({ value: pt.name, label: pt.name })),
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="poPaymentMethod" className="master-form-label">
              Payment Method
            </label>
            <CustomSelect
              id="poPaymentMethod"
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val)}
              placeholder="Choose Payment Method"
              options={[
                { value: "", label: "Choose Payment Method" },
                { value: "Bank Transfer", label: "Bank Transfer (TT)" },
                { value: "Cash", label: "Cash" },
                { value: "Cheque", label: "Cheque / Giro" },
                { value: "Letter of Credit", label: "Letter of Credit (LC)" },
              ]}
            />
          </div>

          {/* Row 4: Delivery Term | Facility Status | Auto Calculate | Service / Subcontractor */}
          <div className="master-form-group">
            <label htmlFor="poDeliveryTerm" className="master-form-label">
              Delivery Term
            </label>
            <CustomSelect
              id="poDeliveryTerm"
              value={deliveryTerm}
              onChange={(val) => setDeliveryTerm(val)}
              placeholder="Choose Delivery Term"
              options={[
                { value: "", label: "Choose Delivery Term" },
                ...deliveryTerms.map((dt) => ({ value: dt.name, label: dt.name })),
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="poFacilityStatus" className="master-form-label">
              Facility Status
            </label>
            <CustomSelect
              id="poFacilityStatus"
              value={statusFacility}
              onChange={(val) => handleFacilityStatusChange(val as "Facility" | "Non Facility")}
              options={[
                { value: "Facility", label: "Fasilitas" },
                { value: "Non Facility", label: "Non Fasilitas" },
              ]}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Auto Calculate</label>
            <div style={{ display: "flex", gap: "14px", height: "38px", alignItems: "center" }}>
              <label className="master-checkbox-label" style={{ fontSize: "12px" }}>
                <input
                  type="radio"
                  name="autoCalculate"
                  value="subTotal"
                  checked={autoCalculate === "subTotal"}
                  onChange={() => setAutoCalculate("subTotal")}
                />
                <span>Sub Total</span>
              </label>
              <label className="master-checkbox-label" style={{ fontSize: "12px" }}>
                <input
                  type="radio"
                  name="autoCalculate"
                  value="unitPrice"
                  checked={autoCalculate === "unitPrice"}
                  onChange={() => setAutoCalculate("unitPrice")}
                />
                <span>Unit Price</span>
              </label>
            </div>
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Service / Subcontractor</label>
            <div style={{ display: "flex", height: "38px", alignItems: "center" }}>
              <label className="master-checkbox-label" style={{ fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={isSubkon}
                  onChange={(e) => setIsSubkon(e.target.checked)}
                />
                <span>Service / Subcontractor</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Item Detail & Additional costs */}
        <div className="tx-tabs-header">
          <button
            type="button"
            className={`tx-tab-btn ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            Item Detail ({items.length})
          </button>
          <button
            type="button"
            className={`tx-tab-btn ${activeTab === "costs" ? "active" : ""}`}
            onClick={() => setActiveTab("costs")}
          >
            Additional Costs ({additionalCosts.length})
          </button>
        </div>

        {/* Tab 1: Item Detail */}
        {activeTab === "items" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Select an approved PR Number below to auto-populate requisition items and quantities.
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="secondary"
                  onClick={() => setIsPrPickerOpen(true)}
                  type="button"
                >
                  Add Item
                </Button>
              </div>
            </div>

            {formErrors.items && (
              <div style={{ color: "var(--red-600)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                {formErrors.items}
              </div>
            )}

            <div className="tx-table-container">
              <table className="tx-grid-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ minWidth: "46px", width: "46px", textAlign: "center" }}>No</th>
                    <th rowSpan={2} style={{ minWidth: "230px" }}>PR Number</th>
                    <th rowSpan={2} style={{ minWidth: "210px" }}>Item Name</th>
                    <th rowSpan={2} style={{ minWidth: "140px" }}>Item Code</th>
                    <th rowSpan={2} style={{ minWidth: "160px" }}>Item Alias *</th>
                    <th rowSpan={2} style={{ minWidth: "125px", textAlign: "right" }}>Price</th>
                    <th rowSpan={2} style={{ minWidth: "90px" }}>Unit</th>
                    {/* Grouped Header for Quantity */}
                    <th colSpan={3} style={{ textAlign: "center", background: "var(--surface-muted, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>Quantity</th>
                    <th rowSpan={2} style={{ minWidth: "220px", textAlign: "center" }}>Discount</th>
                    <th rowSpan={2} style={{ minWidth: "125px", textAlign: "right" }}>Subtotal</th>
                    <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME</th>
                    <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>Optional Rate</th>
                    <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME (%)</th>
                    <th rowSpan={2} style={{ minWidth: "125px" }}>PPH</th>
                    <th rowSpan={2} style={{ minWidth: "120px", textAlign: "right" }}>Subtotal PPH</th>
                    <th rowSpan={2} style={{ minWidth: "160px" }}>Remark</th>
                    <th rowSpan={2} style={{ minWidth: "52px", width: "52px", textAlign: "center" }}>Action</th>
                  </tr>
                  <tr>
                    {/* Sub-headers for Quantity with consistent GeniusOne design tokens */}
                    <th style={{ minWidth: "95px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Requested</th>
                    <th style={{ minWidth: "95px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Purchased</th>
                    <th style={{ minWidth: "105px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Order *</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((row, index) => (
                      <tr key={row.id}>
                        {/* 1. No */}
                        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                          {index + 1}
                        </td>

                        {/* 2. PR Number */}
                        <td>
                          {row.prNumber && row.prNumber !== "—" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "12px" }}>
                                {row.prNumber}
                              </span>
                              {row.pr_has_items_id && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                  }}
                                >
                                  PR Item
                                </span>
                              )}
                            </div>
                          ) : (
                            <CustomSelect
                              className="tx-custom-select-cell"
                              value={row.prNumber}
                              onChange={(val) => handleSelectPr(row.id, val)}
                              placeholder="Select PR Number..."
                              options={[
                                { value: "", label: "Select PR Number..." },
                                { value: "—", label: "— None (Direct PO Item) —" },
                                ...allPrOptions.map((p) => ({
                                  value: p.prNumber,
                                  label: p.label,
                                })),
                              ]}
                            />
                          )}
                          {(() => {
                            const dupPo = findExistingPoForPr(row.prNumber);
                            if (dupPo) {
                              return (
                                <div
                                  style={{
                                    fontSize: "10.5px",
                                    color: "#b45309",
                                    background: "#fef3c7",
                                    border: "1px solid #fde68a",
                                    borderRadius: "3px",
                                    padding: "2px 5px",
                                    marginTop: "3px",
                                    lineHeight: 1.2,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <span>⚠️ In PO: <strong>{dupPo.poNumber}</strong></span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>

                        {/* 3. Item Name (Read-Only) */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell tx-input-cell--disabled"
                            placeholder="Item name..."
                            value={row.itemName}
                            readOnly
                            disabled
                          />
                        </td>

                        {/* 4. Item Code (Read-Only) */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell tx-input-cell--disabled"
                            placeholder="Code..."
                            value={row.itemCode || "—"}
                            readOnly
                            disabled
                          />
                        </td>

                        {/* 5. Item Alias (Editable) */}
                        <td>
                          <input
                            type="text"
                            className={`tx-input-cell ${formErrors[`item_${index}_name`] ? "has-error" : ""}`}
                            placeholder="Alias..."
                            value={row.itemAlias}
                            onChange={(e) => handleUpdateItemField(row.id, "itemAlias", e.target.value)}
                          />
                        </td>

                        {/* 6. Price */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="tx-input-cell tx-input-cell--num"
                            value={row.price}
                            onChange={(e) => handleUpdateItemField(row.id, "price", parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        {/* 7. Unit (Read-only) */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell tx-input-cell--disabled"
                            value={row.unit || "PCE"}
                            readOnly
                            disabled
                            style={{ textAlign: "center" }}
                            title="Unit cannot be changed"
                          />
                        </td>

                        {/* 8. Quantity: Requested */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)", fontWeight: 600 }}>
                          {(Number(row.requestedQty) || 0).toFixed(4)}
                        </td>

                        {/* 8. Quantity: Purchased */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                          {(Number(row.purchasedQty) || 0).toFixed(4)}
                        </td>

                        {/* 8. Quantity: Order */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            min="0.0001"
                            className="tx-input-cell tx-input-cell--num"
                            value={row.orderQty}
                            onChange={(e) => handleUpdateItemField(row.id, "orderQty", parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        {/* 9. Discount: Dropdown Selector + Value Input */}
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <div style={{ width: "125px", flexShrink: 0 }}>
                              <CustomSelect
                                className="tx-custom-select-cell"
                                value={row.discountType || "none"}
                                onChange={(val) => handleUpdateItemField(row.id, "discountType", val)}
                                options={[
                                  { value: "none", label: "None" },
                                  { value: "percent", label: "Percentage (%)" },
                                  { value: "amount", label: "Amount" },
                                ]}
                              />
                            </div>
                            <div style={{ position: "relative", flex: 1, minWidth: "75px" }}>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={row.discountType === "percent" ? 100 : undefined}
                                disabled={!row.discountType || row.discountType === "none"}
                                className={`tx-input-cell tx-input-cell--num ${!row.discountType || row.discountType === "none" ? "tx-input-cell--disabled" : ""
                                  }`}
                                style={{
                                  paddingRight: row.discountType === "percent" ? "20px" : undefined,
                                }}
                                placeholder={
                                  !row.discountType || row.discountType === "none"
                                    ? "—"
                                    : row.discountType === "percent"
                                      ? "0"
                                      : "0.00"
                                }
                                value={
                                  !row.discountType || row.discountType === "none"
                                    ? ""
                                    : row.discountVal !== undefined && row.discountVal !== null && row.discountVal !== 0
                                      ? row.discountVal
                                      : row.discountVal === 0
                                        ? 0
                                        : ""
                                }
                                onChange={(e) =>
                                  handleUpdateItemField(
                                    row.id,
                                    "discountVal",
                                    e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                  )
                                }
                                title={
                                  !row.discountType || row.discountType === "none"
                                    ? "Select discount type from dropdown first"
                                    : `Enter discount ${row.discountType === "percent" ? "percentage (0-100%)" : "amount"}`
                                }
                              />
                              {row.discountType === "percent" && (
                                <span
                                  style={{
                                    position: "absolute",
                                    right: "8px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "var(--ink-soft)",
                                    pointerEvents: "none",
                                  }}
                                >
                                  %
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 9. Subtotal */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink)" }}>
                          {row.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 10. LME */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="tx-input-cell tx-input-cell--num"
                            value={row.lme}
                            onChange={(e) => handleUpdateItemField(row.id, "lme", parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        {/* 11. Optional Rate */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="tx-input-cell tx-input-cell--num"
                            value={row.optionalRate}
                            onChange={(e) => handleUpdateItemField(row.id, "optionalRate", parseFloat(e.target.value) || 1)}
                          />
                        </td>

                        {/* 12. Percentage LME (Read-only) */}
                        <td>
                          <input
                            type="number"
                            step="any"
                            className="tx-input-cell tx-input-cell--num tx-input-cell--disabled"
                            value={row.percentageLme}
                            readOnly
                            disabled
                            title="LME (%) cannot be changed"
                          />
                        </td>

                        {/* 13. PPH */}
                        <td>
                          <CustomSelect
                            className="tx-custom-select-cell"
                            value={String(row.pphRate)}
                            onChange={(val) => handleUpdateItemField(row.id, "pphRate", parseFloat(val) || 0)}
                            options={[
                              { value: "0", label: "0% (None)" },
                              { value: "0.02", label: "2% (PPH 23)" },
                              { value: "0.005", label: "0.5% (Final)" },
                              { value: "0.025", label: "2.5% (PPH 22)" },
                            ]}
                          />
                        </td>

                        {/* 14. Subtotal PPH */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--ink-soft)" }}>
                          {row.subtotalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 15. Remark */}
                        <td>
                          <input
                            type="text"
                            className="tx-input-cell"
                            placeholder="Line remark..."
                            value={row.remark}
                            onChange={(e) => handleUpdateItemField(row.id, "remark", e.target.value)}
                          />
                        </td>

                        {/* 16. Action Delete */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="tx-row-delete-btn"
                            title="Remove item"
                            onClick={() => handleDeleteItemRow(row.id)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={18}
                        style={{
                          padding: "24px",
                          textAlign: "center",
                          color: "var(--muted)",
                          fontSize: "13px",
                        }}
                      >
                        No items added yet. Click "Add Item" above to choose requisition items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Additional costs */}
        {activeTab === "costs" && (
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              <Button variant="secondary" onClick={handleAddCostRow} type="button">
                Add Cost Row
              </Button>
            </div>

            <div className="tx-table-container">
              <table className="tx-grid-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "240px" }}>Cost Description</th>
                    <th style={{ width: "180px", textAlign: "right" }}>Amount</th>
                    <th style={{ minWidth: "260px" }}>Remark</th>
                    <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {additionalCosts.map((cost, idx) => (
                    <tr key={cost.id}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <CustomSelect
                          className="tx-custom-select-cell"
                          value={cost.costName}
                          onChange={(val) => handleUpdateCostField(cost.id, "costName", val)}
                          placeholder="Select Additional Cost..."
                          options={[
                            { value: "", label: "Select Additional Cost..." },
                            ...masterAdditionalCosts
                              .filter((ac) => !ac.hidden)
                              .map((ac) => ({
                                value: ac.costName,
                                label: ac.costCode ? `${ac.costCode} — ${ac.costName}` : ac.costName,
                              })),
                            ...(cost.costName && !masterAdditionalCosts.some((ac) => ac.costName === cost.costName)
                              ? [{ value: cost.costName, label: cost.costName }]
                              : []),
                          ]}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="tx-input-cell tx-input-cell--num"
                          value={cost.amount}
                          onChange={(e) => handleUpdateCostField(cost.id, "amount", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          placeholder="Cost remark..."
                          value={cost.remark}
                          onChange={(e) => handleUpdateCostField(cost.id, "remark", e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="tx-row-delete-btn"
                          title="Remove cost"
                          onClick={() => handleDeleteCostRow(cost.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {additionalCosts.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                        No additional costs registered. Click "Add Cost Row" above if incidental fees apply.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary Card */}
        <div className="po-summary-container">
          <div className="po-summary-card">
            <div className="po-summary-row">
              <span>TOTAL</span>
              <span>{totalSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="po-summary-row">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                Discount (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={{ width: "55px", padding: "2px 4px", fontSize: "11px", border: "1px solid var(--line)" }}
                  value={discountOverallPercent}
                  onChange={(e) => setDiscountOverallPercent(parseFloat(e.target.value) || 0)}
                />
              </span>
              <span>{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="po-summary-row">
              <span>DPP</span>
              <span>{dpp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="po-summary-row">
              <label className="master-checkbox-label" style={{ fontSize: "12px", gap: "6px" }}>
                <input
                  type="checkbox"
                  checked={isPpnActive}
                  onChange={(e) => setIsPpnActive(e.target.checked)}
                />
                <span>PPN (11%)</span>
              </label>
              <span>{ppnAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Kawasan Berikat Routing & Tax Rule: Facility = mandatory Kawasan Berikat; Non Facility = optional */}
            <div
              className="po-summary-row"
              style={{
                padding: "4px 8px",
                background: "rgba(241, 245, 249, 0.7)",
                borderRadius: "var(--radius-xs)",
                fontSize: "11.5px",
              }}
            >
              <label
                className="master-checkbox-label"
                style={{
                  fontSize: "11.5px",
                  gap: "6px",
                  opacity: statusFacility === "Facility" ? 0.85 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={statusFacility === "Facility" ? true : isKawasanBerikat}
                  disabled={statusFacility === "Facility"}
                  onChange={(e) => setIsKawasanBerikat(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>
                  Kawasan Berikat {statusFacility === "Facility" ? "(Mandatory)" : "(Optional)"}
                </span>
              </label>
              <span
                style={{
                  fontSize: "11px",
                  color: (statusFacility === "Facility" || isKawasanBerikat) ? "var(--blue-700)" : "var(--muted)",
                  fontWeight: 700,
                }}
              >
                {statusFacility === "Facility" || isKawasanBerikat ? "Via Receive Note (RN)" : "Direct to BPB"}
              </span>
            </div>

            <div className="po-summary-row">
              <span>Total Additional Costs</span>
              <span>{totalAdditionalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="po-summary-row">
              <span>Total PPH</span>
              <span>{totalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="po-summary-row grand-total">
              <span>GRAND TOTAL</span>
              <span>
                {safeExtractString(currency).split(" ")[0]} {(Number(grandTotal) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* PO Note */}
        <div className="master-form-group" style={{ marginBottom: "20px" }}>
          <label htmlFor="remarkPo" className="master-form-label">
            PO Note
          </label>
          <textarea
            id="remarkPo"
            className="master-form-textarea"
            placeholder="Enter overall Purchase Order notes / delivery instructions..."
            rows={3}
            value={remarkPo}
            onChange={(e) => handleRemarkPoChange(e.target.value)}
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
      message="Are you sure you want to cancel? Any entered Purchase Order details will be lost."
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
        items.some((it) => it.prNumber && findExistingPoForPr(it.prNumber))
          ? "Submit PO with Duplicate PR Warning?"
          : "Submit Purchase Order?"
      }
      message={(() => {
        const warnings = items
          .filter((it) => it.prNumber && findExistingPoForPr(it.prNumber))
          .map((it) => `${it.prNumber} (in PO: ${findExistingPoForPr(it.prNumber)?.poNumber})`);
        const uniqueWarnings = Array.from(new Set(warnings));
        if (uniqueWarnings.length > 0) {
          return `Warning: The following PRs were already processed into existing Purchase Orders: ${uniqueWarnings.join(
            ", "
          )}. Proceeding may result in a duplicate Purchase Order (Double PO). Are you sure you want to proceed?`;
        }
        return `Are you sure you want to submit this Purchase Order for ${grandTotal.toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })} with ${items.length} item(s)?`;
      })()}
      confirmLabel={
        items.some((it) => it.prNumber && findExistingPoForPr(it.prNumber))
          ? "Proceed Anyway"
          : "Confirm & Save"
      }
      cancelLabel="Review PO"
      confirmVariant={
        items.some((it) => it.prNumber && findExistingPoForPr(it.prNumber))
          ? "warning"
          : "primary"
      }
      icon={
        items.some((it) => it.prNumber && findExistingPoForPr(it.prNumber))
          ? "alertTriangle"
          : "check"
      }
      onConfirm={handleConfirmSubmit}
      onCancel={() => setShowSaveConfirm(false)}
    />

    {/* Pick PR Item Modal */}
    <PickPrItemModal
      isOpen={isPrPickerOpen}
      onClose={() => setIsPrPickerOpen(false)}
      onAddItems={handleAddPrItems}
      alreadySelectedPrItemIds={items
        .map((r) => r.pr_has_items_id)
        .filter((id): id is number => typeof id === "number" && id > 0)}
      facilityFilter={statusFacility}
    />
  </div>
);
}

export default PurchaseOrderCreate;
