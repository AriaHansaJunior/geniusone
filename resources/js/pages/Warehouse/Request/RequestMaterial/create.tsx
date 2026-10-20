import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  requestMaterialTypesList,
  requestMaterialDestinationsList,
  requestMaterialDepartmentsList,
  requestMaterialProjectTypesList,
} from "./request-material-data";
import { ItemPickerModal } from "./ItemPickerModal";
import type {
  RequestMaterialItemRow,
  RequestMaterialRecord,
} from "./request-material-types";
import type { ItemRecord } from "../../../Exim/Master/Item/item-types";

interface RequestMaterialCreateProps {
  onSave: (record: RequestMaterialRecord) => void;
  onCancel: () => void;
}

export function RequestMaterialCreate({
  onSave,
  onCancel,
}: RequestMaterialCreateProps) {
  // Header form states - All empty by default as requested
  const [typeOfRequest, setTypeOfRequest] = useState("");
  const [requestDate, setRequestDate] = useState("");
  const [warehouseDestination, setWarehouseDestination] = useState("");
  const [isInternalWarehouse, setIsInternalWarehouse] = useState(false);
  const [destinationLocation, setDestinationLocation] = useState("");
  const [isSpecificStation, setIsSpecificStation] = useState(false);
  const [department, setDepartment] = useState("");
  const [jobNumberHeader, setJobNumberHeader] = useState("");
  const [customer, setCustomer] = useState("");
  const [projectType, setProjectType] = useState("");
  const [requestNote, setRequestNote] = useState("");

  // GeniusOne Custom Notification & Validation State
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Item picker modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Unsaved changes confirmation dialog
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Items grid state - Empty by default
  const [items, setItems] = useState<RequestMaterialItemRow[]>([]);

  // Track if form has been touched/dirtied
  const isDirty = Boolean(
    typeOfRequest.trim() !== "" ||
      requestDate.trim() !== "" ||
      warehouseDestination.trim() !== "" ||
      destinationLocation.trim() !== "" ||
      department.trim() !== "" ||
      jobNumberHeader.trim() !== "" ||
      customer.trim() !== "" ||
      projectType.trim() !== "" ||
      requestNote.trim() !== "" ||
      items.length > 0
  );

  // Clear specific field error when modified
  const clearFieldError = (fieldName: string) => {
    if (formErrors[fieldName]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // Add empty item row
  const handleAddEmptyRow = () => {
    try {
      const newRow: RequestMaterialItemRow = {
        id: `row-${Date.now()}`,
        itemCode: "",
        externalCode: "—",
        itemName: "",
        unit: "PCE",
        jobNumber: jobNumberHeader.trim() || "",
        size: "",
        stockQty: 0,
        pendingQty: 0,
        requestQty: 1,
        remark: "",
      };
      setItems((prev) => [...prev, newRow]);
      clearFieldError("items");
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to add new item row.",
      });
    }
  };

  // Add items from ItemPickerModal
  const handleSelectItemsFromCatalog = (selected: ItemRecord[]) => {
    try {
      if (!selected || selected.length === 0) {
        return;
      }

      const newRows: RequestMaterialItemRow[] = selected.map((s, idx) => ({
        id: `row-${Date.now()}-${idx}`,
        itemCode: s.itemCode || "",
        externalCode: s.kodeEksternal || "—",
        itemName: s.itemName || "",
        unit: s.smallestUnitCode || s.smallestUnitName || "PCE",
        jobNumber: jobNumberHeader.trim() || "",
        size: s.specification && s.specification !== "-" ? s.specification : "Standard",
        stockQty: typeof s.stock === "number" ? s.stock : 0.0,
        pendingQty: 0.0,
        requestQty: 1.0,
        remark: "",
      }));

      setItems((prev) => {
        // Filter out completely blank rows if any
        const filtered = prev.filter(
          (p) => p.itemCode.trim() !== "" || p.itemName.trim() !== ""
        );
        return [...filtered, ...newRows];
      });

      clearFieldError("items");
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to import selected items.",
      });
    }
  };

  // Update a single item row
  const handleUpdateRow = (
    id: string,
    field: keyof RequestMaterialItemRow,
    value: any
  ) => {
    try {
      setItems((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            return { ...r, [field]: value };
          }
          return r;
        })
      );
      // Clear row error if any
      setFormErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`item_`) && k.includes(field)) {
            delete next[k];
          }
        });
        return next;
      });
    } catch (err: any) {
      console.warn("Error updating row:", err);
    }
  };

  // Remove an item row
  const handleRemoveRow = (id: string) => {
    try {
      if (!id) return;
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to remove item row.",
      });
    }
  };

  // Validate form fields with custom GeniusOne error messages
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!typeOfRequest.trim()) {
      errors.typeOfRequest = "Type of Request is required.";
    }

    if (!requestDate.trim()) {
      errors.requestDate = "Request Date is required.";
    }

    if (!department.trim()) {
      errors.department = "Department is required.";
    }

    if (!warehouseDestination.trim()) {
      errors.warehouseDestination = "Warehouse Destination is required.";
    }

    if (!destinationLocation.trim()) {
      errors.destinationLocation = "Destination Location is required.";
    }

    if (!jobNumberHeader.trim()) {
      errors.jobNumber = "Job Number is required.";
    }

    if (!customer.trim()) {
      errors.customer = "Customer name is required.";
    }

    if (!projectType.trim()) {
      errors.projectType = "Project Type is required.";
    }

    if (items.length === 0) {
      errors.items = "Please add at least one material item to this requisition.";
    } else {
      items.forEach((item, index) => {
        if (!item.itemName.trim() && !item.itemCode.trim()) {
          errors[`item_${index}_name`] = `Row ${index + 1}: Item name or code is required.`;
        }
        if (!item.requestQty || item.requestQty <= 0 || isNaN(Number(item.requestQty))) {
          errors[`item_${index}_qty`] = `Row ${index + 1}: Request quantity must be greater than 0.`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save
  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    setNotification(null);

    try {
      if (!validateForm()) {
        setNotification({
          type: "error",
          message: "Please complete all required fields highlighted below before saving.",
        });
        return;
      }

      // Generate formatted Request Code
      const randomNum = Math.floor(100 + Math.random() * 900);
      const requestCode = `REQ-WH-2026-${randomNum}`;
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2, "0")}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${now.getFullYear()} ${String(now.getHours()).padStart(
        2,
        "0"
      )}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newRecord: RequestMaterialRecord = {
        id: requestCode,
        no: 1,
        requestCode,
        requestDate,
        destinationLocation,
        department,
        typeOfRequest,
        jobNumber: jobNumberHeader.trim(),
        customer: customer.trim(),
        requestNote: requestNote.trim() || "Material request created via GeniusOne portal.",
        totalItems: items.length,
        approval: "Draft",
        projectType,
        createdDate: formattedDate,
        lastUpdatedDate: formattedDate,
        createdBy: "SYSTEM USER",
        warehouseDestination,
        approved1At: "—",
        approved2At: "—",
        revisionCount: 0,
        items,
      };

      onSave(newRecord);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An unexpected error occurred while saving the request.",
      });
    }
  };

  // Handle Cancel click with dirty check
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="request-material-create-page transaction-create-page">
      {/* Top Header - Pure title without duplicate buttons */}
      <div
        className="table-panel__header"
        style={{
          padding: "0 0 16px 0",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span className="eyebrow">WAREHOUSE REQUEST</span>
          <h2
            className="table-panel__title"
            style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 800 }}
          >
            Create Request Material
          </h2>
        </div>
      </div>

      {/* GeniusOne Custom Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "12px 16px",
            background: notification.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${
              notification.type === "error" ? "#fecaca" : "#bbf7d0"
            }`,
            borderRadius: "var(--radius-sm)",
            color: notification.type === "error" ? "#b91c1c" : "#15803d",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
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
              fontSize: "16px",
              color: "inherit",
              lineHeight: 1,
            }}
            title="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Header Fields Form Panel */}
      <form onSubmit={handleSave} className="tx-panel" style={{ padding: "20px 24px" }}>
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--ink)",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "8px",
          }}
        >
          Transaction Information
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Type of Request (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Type of Request <span className="required-asterisk">*</span>
            </label>
            <select
              className="master-form-select"
              value={typeOfRequest}
              style={{
                borderColor: formErrors.typeOfRequest ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.typeOfRequest
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setTypeOfRequest(e.target.value);
                clearFieldError("typeOfRequest");
              }}
            >
              <option value="">-- Select Type of Request --</option>
              {requestMaterialTypesList
                .filter((t) => t !== "All Types")
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
            {formErrors.typeOfRequest && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.typeOfRequest}
              </span>
            )}
          </div>

          {/* Request Date (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Request Date <span className="required-asterisk">*</span>
            </label>
            <input
              type="date"
              className="master-form-input"
              value={requestDate}
              style={{
                borderColor: formErrors.requestDate ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.requestDate
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setRequestDate(e.target.value);
                clearFieldError("requestDate");
              }}
            />
            {formErrors.requestDate && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.requestDate}
              </span>
            )}
          </div>

          {/* Department (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Department <span className="required-asterisk">*</span>
            </label>
            <select
              className="master-form-select"
              value={department}
              style={{
                borderColor: formErrors.department ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.department
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setDepartment(e.target.value);
                clearFieldError("department");
              }}
            >
              <option value="">-- Select Department --</option>
              {requestMaterialDepartmentsList
                .filter((d) => d !== "All Departments")
                .map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
            {formErrors.department && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.department}
              </span>
            )}
          </div>

          {/* Job Number (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Job Number <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              value={jobNumberHeader}
              placeholder="e.g. JOB-2026-8812"
              style={{
                borderColor: formErrors.jobNumber ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.jobNumber
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setJobNumberHeader(e.target.value);
                clearFieldError("jobNumber");
              }}
            />
            {formErrors.jobNumber && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.jobNumber}
              </span>
            )}
          </div>

          {/* Customer (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Customer <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              value={customer}
              placeholder="e.g. PT. Astra Honda Motor"
              style={{
                borderColor: formErrors.customer ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.customer
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setCustomer(e.target.value);
                clearFieldError("customer");
              }}
            />
            {formErrors.customer && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.customer}
              </span>
            )}
          </div>

          {/* Project Type (Required) */}
          <div className="master-form-group">
            <label className="master-form-label">
              Project Type <span className="required-asterisk">*</span>
            </label>
            <select
              className="master-form-select"
              value={projectType}
              style={{
                borderColor: formErrors.projectType ? "var(--danger, #ef4444)" : undefined,
                boxShadow: formErrors.projectType
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setProjectType(e.target.value);
                clearFieldError("projectType");
              }}
            >
              <option value="">-- Select Project Type --</option>
              {requestMaterialProjectTypesList
                .filter((p) => p !== "All Projects")
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
            {formErrors.projectType && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.projectType}
              </span>
            )}
          </div>

          {/* Warehouse Destination with Checkbox */}
          <div className="master-form-group">
            <label className="master-form-label">
              Warehouse Destination <span className="required-asterisk">*</span>
            </label>
            <select
              className="master-form-select"
              value={warehouseDestination}
              style={{
                borderColor: formErrors.warehouseDestination
                  ? "var(--danger, #ef4444)"
                  : undefined,
                boxShadow: formErrors.warehouseDestination
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setWarehouseDestination(e.target.value);
                clearFieldError("warehouseDestination");
              }}
            >
              <option value="">-- Select Warehouse Destination --</option>
              <option value="Gudang Raw Material">Gudang Raw Material</option>
              <option value="Gudang Sparepart">Gudang Sparepart</option>
              <option value="Gudang Finish Good">Gudang Finish Good</option>
              <option value="Gudang Bahan Bakar">Gudang Bahan Bakar</option>
              <option value="Gudang Buffer">Gudang Buffer</option>
            </select>
            {formErrors.warehouseDestination && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.warehouseDestination}
              </span>
            )}
            <label
              className="master-checkbox-label"
              style={{ marginTop: "6px" }}
            >
              <input
                type="checkbox"
                checked={isInternalWarehouse}
                onChange={(e) => setIsInternalWarehouse(e.target.checked)}
              />
              <span>Internal Warehouse Facility</span>
            </label>
          </div>

          {/* Destination Location with Checkbox */}
          <div className="master-form-group">
            <label className="master-form-label">
              Destination Location <span className="required-asterisk">*</span>
            </label>
            <select
              className="master-form-select"
              value={destinationLocation}
              style={{
                borderColor: formErrors.destinationLocation
                  ? "var(--danger, #ef4444)"
                  : undefined,
                boxShadow: formErrors.destinationLocation
                  ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
                  : undefined,
              }}
              onChange={(e) => {
                setDestinationLocation(e.target.value);
                clearFieldError("destinationLocation");
              }}
            >
              <option value="">-- Select Destination Location --</option>
              {requestMaterialDestinationsList
                .filter((d) => d !== "All Destinations")
                .map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
            </select>
            {formErrors.destinationLocation && (
              <span
                style={{
                  color: "#dc2626",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Icon name="alertTriangle" size={12} />
                {formErrors.destinationLocation}
              </span>
            )}
            <label
              className="master-checkbox-label"
              style={{ marginTop: "6px" }}
            >
              <input
                type="checkbox"
                checked={isSpecificStation}
                onChange={(e) => setIsSpecificStation(e.target.checked)}
              />
              <span>Dedicated Work Station</span>
            </label>
          </div>
        </div>
      </form>

      {/* Item Table Grid Panel */}
      <div className="panel" style={{ padding: "0" }}>
        {/* Table Toolbar with Add Item & Upload Item */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ink)" }}>
              Requested Items
            </span>
            <span className="code-pill">{items.length} items</span>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              type="button"
              variant="secondary"
              icon="upload"
              onClick={() => setIsPickerOpen(true)}
            >
              Upload item base on Item Material
            </Button>
            <Button
              type="button"
              variant="primary"
              icon="plus"
              onClick={handleAddEmptyRow}
            >
              Add Item
            </Button>
          </div>
        </div>

        {/* Validation Warning for Items */}
        {formErrors.items && (
          <div
            style={{
              padding: "10px 16px",
              background: "#fff1f2",
              borderBottom: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="alertTriangle" size={14} />
            <span>{formErrors.items}</span>
          </div>
        )}

        {/* Responsive Grid Table */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }} rowSpan={2}>
                    No.
                  </th>
                  <th style={{ minWidth: "220px" }} rowSpan={2}>
                    Item <span className="required-asterisk">*</span>
                  </th>
                  <th style={{ minWidth: "130px" }} rowSpan={2}>
                    Job Number
                  </th>
                  <th style={{ minWidth: "120px" }} rowSpan={2}>
                    Size
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid var(--line)",
                      background: "#f1f5f9",
                    }}
                    colSpan={3}
                  >
                    Quantity
                  </th>
                  <th style={{ minWidth: "160px" }} rowSpan={2}>
                    Remark
                  </th>
                  <th style={{ width: "60px", textAlign: "center" }} rowSpan={2}>
                    Action
                  </th>
                </tr>
                <tr>
                  <th style={{ width: "80px", textAlign: "right" }}>Stock</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Pending</th>
                  <th style={{ width: "100px", textAlign: "right" }}>
                    Request <span className="required-asterisk">*</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "36px 16px",
                        color: "var(--muted)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Icon name="archive" size={26} />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                          No Requisition Items Added Yet
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Click &quot;Add Item&quot; to insert a row or &quot;Upload item base on Item Material&quot; to choose from master materials.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((row, index) => {
                    const rowNameError = formErrors[`item_${index}_name`];
                    const rowQtyError = formErrors[`item_${index}_qty`];

                    return (
                      <tr key={row.id}>
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
                        </td>

                        {/* Item */}
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <input
                              type="text"
                              className="master-form-input"
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                borderColor: rowNameError ? "#ef4444" : undefined,
                              }}
                              value={row.itemName}
                              placeholder="Item name / description *"
                              onChange={(e) =>
                                handleUpdateRow(row.id, "itemName", e.target.value)
                              }
                            />
                            {rowNameError && (
                              <span
                                style={{
                                  color: "#dc2626",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                }}
                              >
                                {rowNameError}
                              </span>
                            )}
                            {row.itemCode && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <span
                                  className="code-pill"
                                  style={{ fontSize: "10px" }}
                                >
                                  {row.itemCode}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Unit: {row.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Job Number */}
                        <td>
                          <input
                            type="text"
                            className="master-form-input"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            value={row.jobNumber}
                            placeholder="Job No"
                            onChange={(e) =>
                              handleUpdateRow(row.id, "jobNumber", e.target.value)
                            }
                          />
                        </td>

                        {/* Size */}
                        <td>
                          <input
                            type="text"
                            className="master-form-input"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            value={row.size}
                            placeholder="Size / Spec"
                            onChange={(e) =>
                              handleUpdateRow(row.id, "size", e.target.value)
                            }
                          />
                        </td>

                        {/* Stock Qty (Read-Only) */}
                        <td
                          style={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--muted)",
                          }}
                        >
                          {row.stockQty.toFixed(2)}
                        </td>

                        {/* Pending Qty (Read-Only) */}
                        <td
                          style={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--muted)",
                          }}
                        >
                          {row.pendingQty.toFixed(2)}
                        </td>

                        {/* Request Qty (Editable) */}
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            className="master-form-input"
                            style={{
                              width: "90px",
                              textAlign: "right",
                              padding: "4px 8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--blue-700)",
                              borderColor: rowQtyError ? "#ef4444" : undefined,
                            }}
                            value={row.requestQty === 0 ? "" : row.requestQty}
                            placeholder="Qty *"
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                "requestQty",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          {rowQtyError && (
                            <span
                              style={{
                                color: "#dc2626",
                                fontSize: "10px",
                                fontWeight: 600,
                                display: "block",
                                marginTop: "2px",
                              }}
                            >
                              Required
                            </span>
                          )}
                        </td>

                        {/* Remark */}
                        <td>
                          <input
                            type="text"
                            className="master-form-input"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                            value={row.remark}
                            placeholder="Remark for this item"
                            onChange={(e) =>
                              handleUpdateRow(row.id, "remark", e.target.value)
                            }
                          />
                        </td>

                        {/* Action */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="icon-action"
                            style={{ margin: "0 auto", color: "var(--red-600)" }}
                            title="Remove item"
                            aria-label="Remove item"
                            onClick={() => handleRemoveRow(row.id)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Note Panel */}
      <div className="tx-panel" style={{ padding: "16px 20px" }}>
        <div className="master-form-group">
          <label className="master-form-label">
            Request Note{" "}
            <span style={{ color: "var(--muted)", textTransform: "none" }}>
              (Optional instruction or justification)
            </span>
          </label>
          <textarea
            className="master-form-textarea"
            rows={3}
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder="Enter request note or purpose for this material issuance..."
          />
        </div>
      </div>

      {/* Bottom Action Buttons - Single standard action bar without duplicates */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          padding: "16px 0",
        }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancelClick}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          icon="check"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>

      {/* Item Picker Modal */}
      <ItemPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectItems={handleSelectItemsFromCatalog}
      />

      {/* Confirmation Dialog for Leaving with Unsaved Changes */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="You have unsaved entries in this Request Material form. Are you sure you want to cancel and return to the list?"
        confirmLabel="Discard & Leave"
        cancelLabel="Stay on Form"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={onCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

export default RequestMaterialCreate;
