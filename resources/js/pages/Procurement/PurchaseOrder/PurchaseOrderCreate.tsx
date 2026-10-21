import React, { useState, useMemo } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { initialSupplierRecords } from "../PurchaseMaster/Supplier/supplier-types";
import { initialPaymentTermRecords } from "../PurchaseMaster/PaymentTerm/payment-term-types";
import { initialDeliveryTermRecords } from "../PurchaseMaster/DeliveryTerms/delivery-terms-types";
import { initialCurrencyRecords } from "../../Exim/Master/Currency/currency-types";
import { prRows } from "../../../data/mockData";
import { createPurchaseOrder } from "../../../data/api";

export interface POItemRow {
  id: string;
  prNumber: string;
  itemName: string;
  itemAlias: string;
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
  onBack: () => void;
  onSaveSuccess?: (newPO: any) => void;
}

export function PurchaseOrderCreate({ onBack, onSaveSuccess }: PurchaseOrderCreateProps) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Tab State
  const [activeTab, setActiveTab] = useState<"items" | "costs">("items");

  // Header State
  const [poType, setPoType] = useState("");
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [currency, setCurrency] = useState("IDR - RUPIAH");
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubkon, setIsSubkon] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState<"subTotal" | "unitPrice">("subTotal");
  const [statusFacility, setStatusFacility] = useState<"Non Facility" | "Facility">("Non Facility");
  const [deliveryTerm, setDeliveryTerm] = useState("");
  const [latestDelivery, setLatestDelivery] = useState(defaultDue);
  const [remarkPo, setRemarkPo] = useState("");

  // Items State
  const [items, setItems] = useState<POItemRow[]>([]);

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

  // When supplier changes, update address
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    if (!supplierId) {
      setSupplierAddress("");
      return;
    }
    const found = initialSupplierRecords.find((s) => s.id === supplierId);
    if (found) {
      setSupplierAddress(found.address);
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
    setItems((prev) => prev.filter((r) => r.id !== id));
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
    // 11% standard VAT when checked
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
          itemName: it.itemName,
          item_alias: it.itemAlias,
          price: it.price,
          order: it.orderQty,
          purchased: it.purchasedQty,
          discountPercent: it.discountPercent,
        })),
      };

      const res = await createPurchaseOrder(payload);
      if (res && res.data) {
        if (onSaveSuccess) onSaveSuccess(res.data);
      } else {
        const poNumber = `POL-1026-${String(Math.floor(Math.random() * 900) + 100)}`;
        const supplierObj = initialSupplierRecords.find((s) => s.id === selectedSupplierId);

        const newPO = {
          _id: `po-${Date.now()}`,
          _type: "po",
          _rawNumber: poNumber,
          _rawStatus: "Ready",
          _rawDate: date,
          _rawDueDate: dueDate,
          _rawSupplier: supplierObj ? `[${supplierObj.supplierCode || "SUPP"}] ${supplierObj.supplierName}` : "Selected Supplier",
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
          }}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSaveClick}>
          {/* Header Field Grid (Dense 5-column layout matching SmartOne Screenshot 2) */}
          <div className="tx-header-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {/* 1. Tipe PO */}
            <div className="master-form-group">
              <label htmlFor="poType" className="master-form-label">
                Tipe PO <span className="required-asterisk">*</span>
              </label>
              <select
                id="poType"
                className={`master-form-select ${formErrors.poType ? "has-error" : ""}`}
                value={poType}
                onChange={(e) => setPoType(e.target.value)}
              >
                <option value="">Choose PO Type</option>
                <option value="PO Standard">PO Standard</option>
                <option value="PO Service">PO Service</option>
                <option value="PO Import">PO Import</option>
                <option value="PO Raw Material">PO Raw Material</option>
              </select>
              {formErrors.poType && <span className="master-form-error">{formErrors.poType}</span>}
            </div>

            {/* 2. Date */}
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

            {/* 3. Due Date */}
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

            {/* 4. Valuta (Currency) */}
            <div className="master-form-group">
              <label htmlFor="poValuta" className="master-form-label">
                Valuta <span className="required-asterisk">*</span>
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
                {initialCurrencyRecords.map((c) => (
                  <option key={c.id} value={`${c.currencyCode} - ${c.currencyName.toUpperCase()}`}>
                    {c.currencyCode} - {c.currencyName.toUpperCase()}
                  </option>
                ))}
              </select>
              {formErrors.currency && <span className="master-form-error">{formErrors.currency}</span>}
            </div>

            {/* 5. Rate */}
            <div className="master-form-group">
              <label htmlFor="poRate" className="master-form-label">
                Rate <span className="required-asterisk">*</span>
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

            {/* 6. Supplier */}
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
                {initialSupplierRecords.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.supplierCode ? `[${sup.supplierCode}] ` : ""}{sup.supplierName}
                  </option>
                ))}
              </select>
              {formErrors.supplier && <span className="master-form-error">{formErrors.supplier}</span>}
            </div>

            {/* 7. Alamat (Address) */}
            <div className="master-form-group" style={{ gridColumn: "span 3" }}>
              <label htmlFor="poAddress" className="master-form-label">
                Alamat
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

            {/* 8. Payment Term */}
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
                <option value="100% by TT within 14 days">100% by TT within 14 days</option>
                <option value="NET 30">NET 30</option>
                <option value="NET 14">NET 14</option>
                <option value="COD (Cash on Delivery)">COD (Cash on Delivery)</option>
                <option value="CBD (Cash Before Delivery)">CBD (Cash Before Delivery)</option>
                <option value="LC at Sight">LC at Sight</option>
              </select>
            </div>

            {/* 9. Payment Method */}
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
                <option value="TRANSFER">Bank Transfer (TT)</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque / Giro</option>
                <option value="LC">Letter of Credit</option>
              </select>
            </div>

            {/* 10. Service / Subkon Indicator */}
            <div className="master-form-group" style={{ justifyContent: "center" }}>
              <label className="master-form-label">Service / Subkon</label>
              <label className="master-checkbox-label" style={{ marginTop: "6px" }}>
                <input
                  type="checkbox"
                  checked={isSubkon}
                  onChange={(e) => setIsSubkon(e.target.checked)}
                />
                <span>Service / Subkon</span>
              </label>
            </div>

            {/* 11. Auto Calculate Selector */}
            <div className="master-form-group">
              <label className="master-form-label">Auto Calculate</label>
              <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                <label className="master-checkbox-label" style={{ fontSize: "11.5px" }}>
                  <input
                    type="radio"
                    name="autoCalculate"
                    value="subTotal"
                    checked={autoCalculate === "subTotal"}
                    onChange={() => setAutoCalculate("subTotal")}
                  />
                  <span>Sub Total</span>
                </label>
                <label className="master-checkbox-label" style={{ fontSize: "11.5px" }}>
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

            {/* 12. Status Facility */}
            <div className="master-form-group">
              <label className="master-form-label">
                Status Facility <span className="required-asterisk">*</span>
              </label>
              <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                <label className="master-checkbox-label" style={{ fontSize: "11.5px" }}>
                  <input
                    type="radio"
                    name="statusFacility"
                    value="Non Facility"
                    checked={statusFacility === "Non Facility"}
                    onChange={() => setStatusFacility("Non Facility")}
                  />
                  <span>Non Facility</span>
                </label>
                <label className="master-checkbox-label" style={{ fontSize: "11.5px" }}>
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

            {/* 13. Delivery Term */}
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
                <option value="Franco Gudang">Franco Gudang</option>
                <option value="Loco Gudang">Loco Gudang</option>
                <option value="FOB Port">FOB Port</option>
                <option value="CIF Port">CIF Port</option>
              </select>
            </div>

            {/* 14. Latest Delivery */}
            <div className="master-form-group">
              <label htmlFor="poLatestDelivery" className="master-form-label">
                Latest Delivery <span className="required-asterisk">*</span>
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
              Additional costs ({additionalCosts.length})
            </button>
          </div>

          {/* Tab 1: Item Detail */}
          {activeTab === "items" && (
            <div>
              {formErrors.items && (
                <div style={{ color: "var(--red-600)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                  {formErrors.items}
                </div>
              )}

              <div className="tx-table-container">
                <table className="tx-grid-table" style={{ minWidth: "1500px" }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: "45px", textAlign: "center" }}>No</th>
                      <th rowSpan={2} style={{ width: "170px" }}>PR Number</th>
                      <th rowSpan={2} style={{ minWidth: "220px" }}>Item Name</th>
                      <th rowSpan={2} style={{ minWidth: "160px" }}>Item Alias</th>
                      <th rowSpan={2} style={{ width: "120px", textAlign: "right" }}>Price</th>
                      <th rowSpan={2} style={{ width: "80px" }}>Unit</th>
                      {/* Grouped Header for Quantity */}
                      <th colSpan={3} style={{ textAlign: "center", borderBottom: "1px solid #64748b" }}>Quantity</th>
                      <th rowSpan={2} style={{ width: "90px", textAlign: "right" }}>Diskon (%)</th>
                      <th rowSpan={2} style={{ width: "130px", textAlign: "right" }}>Subtotal</th>
                      <th rowSpan={2} style={{ width: "90px", textAlign: "right" }}>LME</th>
                      <th rowSpan={2} style={{ width: "90px", textAlign: "right" }}>Optional Rate</th>
                      <th rowSpan={2} style={{ width: "100px", textAlign: "right" }}>Precentage LME (%)</th>
                      <th rowSpan={2} style={{ width: "110px" }}>PPH</th>
                      <th rowSpan={2} style={{ width: "120px", textAlign: "right" }}>Subtotal PPH</th>
                      <th rowSpan={2} style={{ minWidth: "160px" }}>Remark</th>
                      <th rowSpan={2} style={{ width: "50px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={handleAddItemRow}
                          style={{
                            width: "24px",
                            height: "24px",
                            background: "#16a34a",
                            color: "#fff",
                            border: 0,
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            display: "grid",
                            placeItems: "center",
                          }}
                          title="Add PO Item Row"
                        >
                          <Icon name="plus" size={12} />
                        </button>
                      </th>
                    </tr>
                    <tr>
                      {/* Sub-headers for Quantity */}
                      <th style={{ width: "90px", textAlign: "right", fontSize: "10px", background: "#334155" }}>Requested</th>
                      <th style={{ width: "90px", textAlign: "right", fontSize: "10px", background: "#334155" }}>Purchased</th>
                      <th style={{ width: "90px", textAlign: "right", fontSize: "10px", background: "#334155" }}>Order *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((row, index) => (
                      <tr key={row.id}>
                        {/* 1. No */}
                        <td style={{ textAlign: "center", fontWeight: 600, color: "var(--muted)" }}>
                          {index + 1}
                        </td>

                        {/* 2. PR Number */}
                        <td>
                          <select
                            className="tx-input-cell"
                            value={row.prNumber}
                            onChange={(e) => handleUpdateItemField(row.id, "prNumber", e.target.value)}
                          >
                            <option value="">Select PR Number...</option>
                            <option value="—">— None —</option>
                            {prRows.map((p) => (
                              <option key={p._id} value={p._rawNumber}>
                                {p._rawNumber}
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
                            placeholder="Alias name..."
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
                            <option value="KG">KG</option>
                            <option value="SET">SET</option>
                            <option value="ROLL">ROLL</option>
                            <option value="MTR">MTR</option>
                            <option value="BOX">BOX</option>
                            <option value="LTR">LTR</option>
                          </select>
                        </td>

                        {/* 7. Quantity: Requested */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                          {row.requestedQty.toFixed(2)}
                        </td>

                        {/* 7. Quantity: Purchased */}
                        <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                          {row.purchasedQty.toFixed(2)}
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

                        {/* 8. Diskon (%) */}
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
                        No items added yet. Click the "+" button in the table header to add an item.
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
                <Button variant="secondary" icon="plus" onClick={handleAddCostRow}>
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
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
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

          {/* Financial Summary Card (matches Screenshot 2 layout) */}
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
                <span>Total Biaya Lain</span>
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
