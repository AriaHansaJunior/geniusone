import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { initialSupplierRecords } from "../PurchaseMaster/Supplier/supplier-types";
import { initialPaymentTermRecords } from "../PurchaseMaster/PaymentTerm/payment-term-types";
import { initialDeliveryTermRecords } from "../PurchaseMaster/DeliveryTerms/delivery-terms-types";
import { initialCurrencyRecords } from "../../Exim/Master/Currency/currency-types";
import { prRows } from "../../../data/mockData";
import { fetchList, fetchDetail, createPurchaseOrder } from "../../../data/api";
import { getLocalApprovalState } from "../../../services/approvalApi";

export interface POItemRow {
  id: string;
  prNumber: string;
  pr_has_items_id?: number;
  itemName: string;
  itemAlias: string;
  itemCode?: string;
  price: number;
  unit: string;
  requestedQty: number;
  purchasedQty: number;
  orderQty: number;
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
  onBack: () => void;
  onSaveSuccess?: (newPO: any) => void;
}

export function PurchaseOrderCreate({
  initialPrNumber,
  onBack,
  onSaveSuccess,
}: PurchaseOrderCreateProps) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Tab State
  const [activeTab, setActiveTab] = useState<"items" | "costs">("items");

  // Dynamic Master Records
  const [approvedPrs, setApprovedPrs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [deliveryTerms, setDeliveryTerms] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

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
  const [statusFacility, setStatusFacility] = useState<"Non Facility" | "Facility">("Non Facility");
  const [deliveryTerm, setDeliveryTerm] = useState("Loco Surabaya");
  const [latestDelivery, setLatestDelivery] = useState(defaultDue);
  const [remarkPo, setRemarkPo] = useState("");

  // Items State
  const [items, setItems] = useState<POItemRow[]>([
    {
      id: `po-item-${Date.now()}`,
      prNumber: "",
      itemName: "",
      itemAlias: "",
      price: 0,
      unit: "PCE",
      requestedQty: 0,
      purchasedQty: 0,
      orderQty: 0,
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

  // Dialog States
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Helper to extract items from a PR row object
  const getPrItemsList = (prObj: any): any[] => {
    if (prObj.items && Array.isArray(prObj.items) && prObj.items.length > 0) {
      return prObj.items;
    }
    if (prObj._items && Array.isArray(prObj._items) && prObj._items.length > 0) {
      return prObj._items;
    }
    return [];
  };

  // Populate items from a given PR
  const populateFromPr = (prObj: any) => {
    const prNum = prObj._rawNumber || prObj.prNumber || "";
    const prItems = getPrItemsList(prObj);

    if (prItems.length === 0) {
      // Fallback single line item if PR items array was empty
      const totalQuantity = parseFloat(String(prObj.totalQuantity || prObj._totalQty || "1").replace(/[^0-9.]/g, "") || "1") || 1;
      setItems([
        {
          id: `po-item-${Date.now()}`,
          prNumber: prNum,
          itemName: prObj.remark || "Material Item",
          itemAlias: "—",
          price: 0,
          unit: "PCE",
          requestedQty: totalQuantity,
          purchasedQty: 0,
          orderQty: totalQuantity,
          discountPercent: 0,
          subtotal: 0,
          lme: 0,
          optionalRate: 1.0,
          percentageLme: 0,
          pphRate: 0,
          subtotalPph: 0,
          remark: prObj.remark || "",
        },
      ]);

      if (prNum) {
        fetchDetail("pr", prNum).then((detail) => {
          const detailItems = getPrItemsList(detail);
          if (detail && detailItems.length > 0) {
            const mappedRows: POItemRow[] = detailItems.map((it: any, idx: number) => {
              const reqQty = Number(it.rawQty || it.qty || parseFloat(String(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
              return {
                id: `po-item-${Date.now()}-${idx}`,
                prNumber: prNum,
                pr_has_items_id: it.pr_has_items_id || it.id,
                itemName: it.item || it.itemName || "Material Item",
                itemAlias: it.itemCode || it.itemAlias || "—",
                price: 0,
                unit: it.unit || "PCE",
                requestedQty: reqQty,
                purchasedQty: 0,
                orderQty: reqQty,
                discountPercent: 0,
                subtotal: 0,
                lme: 0,
                optionalRate: 1.0,
                percentageLme: 0,
                pphRate: 0,
                subtotalPph: 0,
                remark: it.remark || detail.remark || "",
              };
            });
            setItems(mappedRows);
          }
        });
      }
      return;
    }

    const newRows: POItemRow[] = prItems.map((it: any, idx: number) => {
      const reqQty = Number(it.rawQty || it.qty || parseFloat(String(it.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
      return {
        id: `po-item-${Date.now()}-${idx}`,
        prNumber: prNum,
        pr_has_items_id: it.pr_has_items_id || it.id,
        itemName: it.item || it.itemName || "Material Item",
        itemAlias: it.itemCode || it.itemAlias || "—",
        price: 0,
        unit: it.unit || "PCE",
        requestedQty: reqQty,
        purchasedQty: 0,
        orderQty: reqQty,
        discountPercent: 0,
        subtotal: 0,
        lme: 0,
        optionalRate: 1.0,
        percentageLme: 0,
        pphRate: 0,
        subtotalPph: 0,
        remark: it.remark || prObj.remark || "",
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
            const st = (r.status || r._rawStatus || "").toLowerCase();
            const prNum = r._rawNumber || r.prNumber || "";
            const localByNum = prNum ? getLocalApprovalState("purchase_requisition", prNum) : null;
            const localById = r.id ? getLocalApprovalState("purchase_requisition", String(r.id)) : null;
            const isLocalApproved =
              localByNum?.status === "APPROVED" || localById?.status === "APPROVED";
            return (
              isLocalApproved ||
              st.includes("approved") ||
              st === "approved 1" ||
              st === "approved 2" ||
              st === "approved"
            );
          });
          setApprovedPrs(approved.length > 0 ? approved : res.rows);

          // Pre-fill if initialPrNumber is provided
          if (initialPrNumber) {
            const cleanTarget = initialPrNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const match = (approved.length > 0 ? approved : res.rows).find((p: any) => {
              const cleanP = (p._rawNumber || p.prNumber || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
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

      return () => {
        isMounted = false;
      };
    }, [initialPrNumber]);

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

      const foundMock = initialSupplierRecords.find((s) => s.id === supplierId);
      if (foundMock) {
        setSupplierAddress(foundMock.address);
      }
    };

    // Recalculate Item Subtotal and PPH
    const calculateLineSubtotal = (price: number, qty: number, discPercent: number) => {
      const gross = price * qty;
      const discount = (gross * (discPercent || 0)) / 100;
      return Math.max(0, gross - discount);
    };

    // Add Item Row
    const handleAddItemRow = () => {
      const newRow: POItemRow = {
        id: `po-item-${Date.now()}`,
        prNumber: "",
        itemName: "",
        itemAlias: "",
        price: 0,
        unit: "PCE",
        requestedQty: 0,
        purchasedQty: 0,
        orderQty: 0,
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

    // Delete Item Row
    const handleDeleteItemRow = (id: string) => {
      setItems((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((r) => r.id !== id);
      });
    };

    // Update Item Field
    const handleUpdateItemField = (id: string, field: keyof POItemRow, val: any) => {
      setItems((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, [field]: val };

          // Auto recalculate subtotal if price, orderQty, or discountPercent changed
          if (field === "price" || field === "orderQty" || field === "discountPercent" || field === "pphRate") {
            const sub = calculateLineSubtotal(
              Number(updated.price) || 0,
              Number(updated.orderQty) || 0,
              Number(updated.discountPercent) || 0
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

      const matchedPr = approvedPrs.find(
        (p) => (p._rawNumber || p.prNumber) === selectedPrNumber
      );

      if (matchedPr) {
        const prItems = getPrItemsList(matchedPr);
        if (prItems.length > 0) {
          const first = prItems[0];
          const reqQty = Number(first.rawQty || first.qty || parseFloat(String(first.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
          const itemName = first.item || first.itemName || "Material Item";
          const itemAlias = first.itemCode || first.itemAlias || "—";
          const unit = first.unit || "PCE";
          const remark = first.remark || matchedPr.remark || "";
          const prItemId = first.pr_has_items_id || first.id;

          setItems((prev) => {
            const updated = prev.map((r) => {
              if (r.id !== rowId) return r;
              const sub = calculateLineSubtotal(r.price, reqQty, r.discountPercent);
              return {
                ...r,
                prNumber: selectedPrNumber,
                pr_has_items_id: prItemId,
                itemName,
                itemAlias,
                unit,
                requestedQty: reqQty,
                purchasedQty: 0,
                orderQty: reqQty,
                remark,
                subtotal: sub,
                subtotalPph: sub * (Number(r.pphRate) || 0),
              };
            });

            // If the PR has multiple items, append remaining items
            if (prItems.length > 1) {
              const extraRows: POItemRow[] = prItems.slice(1).map((extra: any, extraIdx: number) => {
                const extraReqQty = Number(extra.rawQty || extra.qty || parseFloat(String(extra.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
                return {
                  id: `po-item-${Date.now()}-${extraIdx}`,
                  prNumber: selectedPrNumber,
                  pr_has_items_id: extra.pr_has_items_id || extra.id,
                  itemName: extra.item || extra.itemName || "Material Item",
                  itemAlias: extra.itemCode || extra.itemAlias || "—",
                  price: 0,
                  unit: extra.unit || "PCE",
                  requestedQty: extraReqQty,
                  purchasedQty: 0,
                  orderQty: extraReqQty,
                  discountPercent: 0,
                  subtotal: 0,
                  lme: 0,
                  optionalRate: 1.0,
                  percentageLme: 0,
                  pphRate: 0,
                  subtotalPph: 0,
                  remark: extra.remark || matchedPr.remark || "",
                };
              });
              return [...updated, ...extraRows];
            }

            return updated;
          });
          return;
        } else {
          // Fallback if PR summary row has empty _items: populate with basic info and fetchDetail
          const totalQty = parseFloat(String(matchedPr.totalQuantity || matchedPr._totalQty || "1").replace(/[^0-9.]/g, "") || "1") || 1;
          const reqRemark = matchedPr.remark || matchedPr._rawRemark || "Material Item";
          setItems((prev) =>
            prev.map((r) => {
              if (r.id !== rowId) return r;
              const sub = calculateLineSubtotal(r.price, totalQty, r.discountPercent);
              return {
                ...r,
                prNumber: selectedPrNumber,
                itemName: reqRemark,
                requestedQty: totalQty,
                purchasedQty: 0,
                orderQty: totalQty,
                remark: reqRemark,
                subtotal: sub,
                subtotalPph: sub * (Number(r.pphRate) || 0),
              };
            })
          );

          fetchDetail("pr", selectedPrNumber).then((detail) => {
            const detailItems = getPrItemsList(detail);
            if (detail && detailItems.length > 0) {
              const first = detailItems[0];
              const reqQty = Number(first.rawQty || first.qty || parseFloat(String(first.quantity).replace(/[^0-9.]/g, "") || "1")) || 1;
              setItems((prev) =>
                prev.map((r) => {
                  if (r.id !== rowId) return r;
                  const sub = calculateLineSubtotal(r.price, reqQty, r.discountPercent);
                  return {
                    ...r,
                    pr_has_items_id: first.pr_has_items_id || first.id,
                    itemName: first.item || first.itemName || "Material Item",
                    itemAlias: first.itemCode || first.itemAlias || "—",
                    unit: first.unit || "PCE",
                    requestedQty: reqQty,
                    purchasedQty: 0,
                    orderQty: reqQty,
                    remark: first.remark || detail.remark || "",
                    subtotal: sub,
                    subtotalPph: sub * (Number(r.pphRate) || 0),
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
      return dpp + ppnAmount + totalAdditionalCosts - totalPph;
    }, [dpp, ppnAmount, totalAdditionalCosts, totalPph]);

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
          facility_status: statusFacility === "Facility" ? "FASILITAS" : "NON FASILITAS",
          remark: remarkPo,
          items: items.map((it) => ({
            pr_has_items_id: it.pr_has_items_id,
            prNumber: it.prNumber,
            itemName: it.itemName,
            item_alias: it.itemAlias,
            price: it.price,
            order: it.orderQty,
            purchased: it.purchasedQty,
            discountPercent: it.discountPercent,
            unit: it.unit,
            remark: it.remark,
          })),
          additional_costs: additionalCosts.map((c) => ({
            name: c.costName,
            value: c.amount,
            note: c.remark,
          })),
        };

        const res = await createPurchaseOrder(payload);
        if (res && res.data) {
          if (onSaveSuccess) onSaveSuccess(res.data);
        } else {
          const poNumber = `POL-1026-${String(Math.floor(Math.random() * 900) + 100)}`;
          const supplierObj = suppliers.find((s) => String(s.id) === String(selectedSupplierId)) || initialSupplierRecords.find((s) => s.id === selectedSupplierId);

          const newPO = {
            _id: `po-${Date.now()}`,
            _type: "po",
            _rawNumber: poNumber,
            _rawStatus: "Waiting for Approve 1",
            _rawDate: date,
            _rawDueDate: dueDate,
            _rawSupplier: supplierObj ? `[${supplierObj.code || supplierObj.supplierCode || "SUPP"}] ${supplierObj.name || supplierObj.supplierName}` : "Selected Supplier",
            _rawTotal: `${currency.split(" ")[0]} ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            _rawCurrency: currency.split(" ")[0],
            _rawRate: exchangeRate.toString(),
            _rawPaymentMethod: paymentMethod,
            _rawPaymentTerm: paymentTerm,
            _rawFacility: statusFacility === "Facility" ? "FASILITAS" : "NON FASILITAS",
            _rawDeptCreated: "PROCUREMENT",
            _rawCreatedBy: "ADMINISTRATOR " + today,
            _rawRemark: remarkPo || "New PO",
            _items: items,
            _otherCosts: additionalCosts,
            _financials: {
              total: totalSubtotal,
              discount: discountAmount,
              dpp,
              ppn: ppnAmount,
              otherCosts: totalAdditionalCosts,
              totalPph,
              grandTotal,
            },
            totalItem: items.length,
            totalQuantity: items.reduce((acc, it) => acc + (Number(it.orderQty) || 0), 0),
          };

          if (onSaveSuccess) {
            onSaveSuccess(newPO);
          }
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
        const num = p._rawNumber || p.prNumber;
        if (num && !seen.has(num)) {
          seen.add(num);
          const dept = p._rawDept || p.deptRequest || "";
          const itemsCount = getPrItemsList(p).length || 1;
          list.push({
            prNumber: num,
            label: `${num} ${dept ? `(${dept} · ${itemsCount} item${itemsCount > 1 ? "s" : ""})` : ""}`,
          });
        }
      });

      // Also include initial mock prRows if approvedPrs was empty
      if (list.length === 0) {
        prRows.forEach((p) => {
          const raw = p._rawNumber || "";
          if (raw && !seen.has(raw)) {
            seen.add(raw);
            list.push({ prNumber: raw, label: raw });
          }
        });
      }

      return list;
    }, [approvedPrs]);

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
                <select
                  id="poType"
                  className={`master-form-select ${formErrors.poType ? "has-error" : ""}`}
                  value={poType}
                  onChange={(e) => setPoType(e.target.value)}
                >
                  <option value="PO Standard">PO Standard</option>
                  <option value="PO Service">PO Service</option>
                  <option value="PO Import">PO Import</option>
                  <option value="PO Raw Material">PO Raw Material</option>
                </select>
                {formErrors.poType && <span className="master-form-error">{formErrors.poType}</span>}
              </div>

              <div className="master-form-group">
                <label htmlFor="poDate" className="master-form-label">
                  Date <span className="required-asterisk">*</span>
                </label>
                <input
                  id="poDate"
                  type="date"
                  className={`master-form-input ${formErrors.date ? "has-error" : ""}`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {formErrors.date && <span className="master-form-error">{formErrors.date}</span>}
              </div>

              <div className="master-form-group">
                <label htmlFor="poDueDate" className="master-form-label">
                  Due Date <span className="required-asterisk">*</span>
                </label>
                <input
                  id="poDueDate"
                  type="date"
                  className={`master-form-input ${formErrors.dueDate ? "has-error" : ""}`}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {formErrors.dueDate && <span className="master-form-error">{formErrors.dueDate}</span>}
              </div>

              <div className="master-form-group">
                <label htmlFor="poLatestDelivery" className="master-form-label">
                  Latest Delivery Date <span className="required-asterisk">*</span>
                </label>
                <input
                  id="poLatestDelivery"
                  type="date"
                  className={`master-form-input ${formErrors.latestDelivery ? "has-error" : ""}`}
                  value={latestDelivery}
                  onChange={(e) => setLatestDelivery(e.target.value)}
                />
                {formErrors.latestDelivery && <span className="master-form-error">{formErrors.latestDelivery}</span>}
              </div>

              {/* Row 2: Supplier (span 2) | Currency | Exchange Rate */}
              <div className="master-form-group" style={{ gridColumn: "span 2" }}>
                <label htmlFor="poSupplier" className="master-form-label">
                  Supplier <span className="required-asterisk">*</span>
                </label>
                <select
                  id="poSupplier"
                  className={`master-form-select ${formErrors.supplier ? "has-error" : ""}`}
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                >
                  <option value="">Find Supplier</option>
                  {suppliers.length > 0
                    ? suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.code ? `[${sup.code}] ` : ""}{sup.name}
                      </option>
                    ))
                    : initialSupplierRecords.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.supplierCode ? `[${sup.supplierCode}] ` : ""}{sup.supplierName}
                      </option>
                    ))}
                </select>
                {formErrors.supplier && <span className="master-form-error">{formErrors.supplier}</span>}
              </div>

              <div className="master-form-group">
                <label htmlFor="poValuta" className="master-form-label">
                  Currency <span className="required-asterisk">*</span>
                </label>
                <select
                  id="poValuta"
                  className={`master-form-select ${formErrors.currency ? "has-error" : ""}`}
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    if (e.target.value.includes("USD")) setExchangeRate(15850);
                    else if (e.target.value.includes("EUR")) setExchangeRate(17200);
                    else if (e.target.value.includes("SGD")) setExchangeRate(12100);
                    else setExchangeRate(1.0);
                  }}
                >
                  {currencies.length > 0
                    ? currencies.map((c) => (
                      <option key={c.id} value={`${c.code} - ${c.name.toUpperCase()}`}>
                        {c.code} - {c.name.toUpperCase()}
                      </option>
                    ))
                    : initialCurrencyRecords.map((c) => (
                      <option key={c.id} value={`${c.currencyCode} - ${c.currencyName.toUpperCase()}`}>
                        {c.currencyCode} - {c.currencyName.toUpperCase()}
                      </option>
                    ))}
                </select>
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
                <select
                  id="poPaymentTerm"
                  className="master-form-select"
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                >
                  <option value="">Choose Payment Term</option>
                  {paymentTerms.length > 0
                    ? paymentTerms.map((pt) => (
                      <option key={pt.id} value={pt.name}>
                        {pt.name}
                      </option>
                    ))
                    : [
                      "Net 30 Days",
                      "Net 14 Days",
                      "100% by TT within 14 days",
                      "COD (Cash on Delivery)",
                      "CBD (Cash Before Delivery)",
                      "LC at Sight",
                    ].map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                </select>
              </div>

              <div className="master-form-group">
                <label htmlFor="poPaymentMethod" className="master-form-label">
                  Payment Method
                </label>
                <select
                  id="poPaymentMethod"
                  className="master-form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Choose Payment Method</option>
                  <option value="Bank Transfer">Bank Transfer (TT)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque / Giro</option>
                  <option value="Letter of Credit">Letter of Credit (LC)</option>
                </select>
              </div>

              {/* Row 4: Delivery Term | Facility Status | Auto Calculate | Service / Subcontractor */}
              <div className="master-form-group">
                <label htmlFor="poDeliveryTerm" className="master-form-label">
                  Delivery Term
                </label>
                <select
                  id="poDeliveryTerm"
                  className="master-form-select"
                  value={deliveryTerm}
                  onChange={(e) => setDeliveryTerm(e.target.value)}
                >
                  <option value="">Choose Delivery Term</option>
                  {deliveryTerms.length > 0
                    ? deliveryTerms.map((dt) => (
                      <option key={dt.id} value={dt.name}>
                        {dt.name}
                      </option>
                    ))
                    : [
                      "Franco Gudang Surabaya",
                      "Loco Pabrik",
                      "Loco Surabaya",
                      "FOB Port",
                      "CIF Port",
                    ].map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                </select>
              </div>

              <div className="master-form-group">
                <label className="master-form-label">
                  Facility Status <span className="required-asterisk">*</span>
                </label>
                <div style={{ display: "flex", gap: "14px", height: "38px", alignItems: "center" }}>
                  <label className="master-checkbox-label" style={{ fontSize: "12px" }}>
                    <input
                      type="radio"
                      name="statusFacility"
                      value="Non Facility"
                      checked={statusFacility === "Non Facility"}
                      onChange={() => setStatusFacility("Non Facility")}
                    />
                    <span>Non Facility</span>
                  </label>
                  <label className="master-checkbox-label" style={{ fontSize: "12px" }}>
                    <input
                      type="radio"
                      name="statusFacility"
                      value="Facility"
                      checked={statusFacility === "Facility"}
                      onChange={() => setStatusFacility("Facility")}
                    />
                    <span>Facility</span>
                  </label>
                </div>
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
                      icon="plus"
                      onClick={handleAddItemRow}
                      type="button"
                    >
                      Add Blank Item
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
                        <th rowSpan={2} style={{ minWidth: "240px" }}>PR Number</th>
                        <th rowSpan={2} style={{ minWidth: "220px" }}>Item Name *</th>
                        <th rowSpan={2} style={{ minWidth: "150px" }}>Item Alias / Code</th>
                        <th rowSpan={2} style={{ minWidth: "130px", textAlign: "right" }}>Price</th>
                        <th rowSpan={2} style={{ minWidth: "96px" }}>Unit</th>
                        {/* Grouped Header for Quantity */}
                        <th colSpan={3} style={{ textAlign: "center", background: "var(--surface-muted, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>Quantity</th>
                        <th rowSpan={2} style={{ minWidth: "96px", textAlign: "right" }}>Discount (%)</th>
                        <th rowSpan={2} style={{ minWidth: "130px", textAlign: "right" }}>Subtotal</th>
                        <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME</th>
                        <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>Optional Rate</th>
                        <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME (%)</th>
                        <th rowSpan={2} style={{ minWidth: "125px" }}>PPH</th>
                        <th rowSpan={2} style={{ minWidth: "120px", textAlign: "right" }}>Subtotal PPH</th>
                        <th rowSpan={2} style={{ minWidth: "170px" }}>Remark</th>
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
                              <select
                                className="tx-input-cell"
                                style={{ minWidth: "225px" }}
                                value={row.prNumber}
                                onChange={(e) => handleSelectPr(row.id, e.target.value)}
                              >
                                <option value="">Select PR Number...</option>
                                <option value="—">— None (Direct PO Item) —</option>
                                {allPrOptions.map((p) => (
                                  <option key={p.prNumber} value={p.prNumber}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 3. Item Name */}
                            <td>
                              <input
                                type="text"
                                className={`tx-input-cell ${formErrors[`item_${index}_name`] ? "has-error" : ""}`}
                                placeholder="Item name..."
                                value={row.itemName}
                                onChange={(e) => handleUpdateItemField(row.id, "itemName", e.target.value)}
                              />
                            </td>

                            {/* 4. Item Alias */}
                            <td>
                              <input
                                type="text"
                                className="tx-input-cell"
                                placeholder="Alias / Code..."
                                value={row.itemAlias}
                                onChange={(e) => handleUpdateItemField(row.id, "itemAlias", e.target.value)}
                              />
                            </td>

                            {/* 5. Price */}
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

                            {/* 6. Unit */}
                            <td>
                              <select
                                className="tx-input-cell"
                                value={row.unit}
                                onChange={(e) => handleUpdateItemField(row.id, "unit", e.target.value)}
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
                                {row.unit &&
                                  !["PCE", "PCS", "KGM", "KG", "SET", "ROLL", "MTR", "BOX", "LTR"].includes(row.unit) && (
                                    <option value={row.unit}>{row.unit}</option>
                                  )}
                              </select>
                            </td>

                            {/* 7. Quantity: Requested */}
                            <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)", fontWeight: 600 }}>
                              {row.requestedQty.toFixed(4)}
                            </td>

                            {/* 7. Quantity: Purchased */}
                            <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                              {row.purchasedQty.toFixed(4)}
                            </td>

                            {/* 7. Quantity: Order */}
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

                            {/* 8. Discount (%) */}
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                className="tx-input-cell tx-input-cell--num"
                                value={row.discountPercent}
                                onChange={(e) => handleUpdateItemField(row.id, "discountPercent", parseFloat(e.target.value) || 0)}
                              />
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

                            {/* 12. Percentage LME */}
                            <td>
                              <input
                                type="number"
                                step="any"
                                className="tx-input-cell tx-input-cell--num"
                                value={row.percentageLme}
                                onChange={(e) => handleUpdateItemField(row.id, "percentageLme", parseFloat(e.target.value) || 0)}
                              />
                            </td>

                            {/* 13. PPH */}
                            <td>
                              <select
                                className="tx-input-cell"
                                value={row.pphRate}
                                onChange={(e) => handleUpdateItemField(row.id, "pphRate", parseFloat(e.target.value) || 0)}
                              >
                                <option value={0}>0% (None)</option>
                                <option value={0.02}>2% (PPH 23)</option>
                                <option value={0.005}>0.5% (Final)</option>
                                <option value={0.025}>2.5% (PPH 22)</option>
                              </select>
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
                            No items added yet. Click "+ Add Blank Item" above or select an approved PR.
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
                  <Button variant="secondary" icon="plus" onClick={handleAddCostRow} type="button">
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
                            <input
                              type="text"
                              className="tx-input-cell"
                              placeholder="e.g. Inbound Shipping, Handling, Insurance..."
                              value={cost.costName}
                              onChange={(e) => handleUpdateCostField(cost.id, "costName", e.target.value)}
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
                    {currency.split(" ")[0]} {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Remark PO */}
            <div className="master-form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor="remarkPo" className="master-form-label">
                Remark PO
              </label>
              <textarea
                id="remarkPo"
                className="master-form-textarea"
                placeholder="Enter overall Purchase Order remarks..."
                rows={3}
                value={remarkPo}
                onChange={(e) => setRemarkPo(e.target.value)}
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
          title="Submit Purchase Order?"
          message={`Are you sure you want to submit this Purchase Order for ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} with ${items.length} item(s)?`}
          confirmLabel="Confirm & Save"
          cancelLabel="Review PO"
          confirmVariant="primary"
          icon="check"
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSaveConfirm(false)}
        />
      </div>
    );
  }

export default PurchaseOrderCreate;
