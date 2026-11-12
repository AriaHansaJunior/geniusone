import React, { useState } from "react";
import { Field } from "../ui/Field";
import type { PageKey } from "../../types";

export interface FilterPanelProps {
  page: PageKey;
  filters?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
}

export function FilterPanel({ page, filters = {}, onFilterChange }: FilterPanelProps) {
  // Local fallback state if parent does not manage filters
  const [localFilters, setLocalFilters] = useState<Record<string, any>>({});

  const handleChange = (key: string, value: any) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    } else {
      setLocalFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const getVal = (key: string, fallback: string) => {
    if (filters[key] !== undefined) return filters[key];
    if (localFilters[key] !== undefined) return localFilters[key];
    return fallback;
  };

  if (page === "report") {
    return (
      <div className="filters filters--report">
        <Field
          label="PO creation date"
          value={getVal("poDateRange", "01-10-2026 – 08-10-2026")}
          icon="calendar"
          options={[
            { value: "01-10-2026 – 08-10-2026", label: "01-10-2026 – 08-10-2026" },
            { value: "all", label: "All Dates" },
            { value: "this_month", label: "This Month (Oct 2026)" },
            { value: "last_month", label: "Last Month (Sep 2026)" },
          ]}
          onChange={(v) => handleChange("poDateRange", v)}
        />
        <Field
          label="PR creation date"
          value={getVal("prDateRange", "01-10-2026 – 08-10-2026")}
          icon="calendar"
          options={[
            { value: "01-10-2026 – 08-10-2026", label: "01-10-2026 – 08-10-2026" },
            { value: "all", label: "All Dates" },
            { value: "this_month", label: "This Month (Oct 2026)" },
            { value: "last_month", label: "Last Month (Sep 2026)" },
          ]}
          onChange={(v) => handleChange("prDateRange", v)}
        />
        <Field
          label="Supplier"
          value={getVal("supplier", "all")}
          options={[
            { value: "all", label: "All suppliers" },
            { value: "PT. Mitra Logam Mandiri", label: "PT. Mitra Logam Mandiri" },
            { value: "PT Hasil Fastindo", label: "PT Hasil Fastindo" },
            { value: "CV Sumber Berkah", label: "CV Sumber Berkah" },
          ]}
          onChange={(v) => handleChange("supplier", v)}
        />
        <Field
          label="Item material"
          value={getVal("material", "")}
          isInput={true}
          inputPlaceholder="All materials"
          onInputChange={(v) => handleChange("material", v)}
        />
        <Field
          label="Overall status"
          value={getVal("overallStatus", "all")}
          options={[
            { value: "all", label: "All statuses" },
            { value: "Complete", label: "Complete" },
            { value: "Outstanding", label: "Outstanding" },
          ]}
          onChange={(v) => handleChange("overallStatus", v)}
        />
        <Field
          label="PO status"
          value={getVal("poStatus", "all")}
          options={[
            { value: "all", label: "All PO status" },
            { value: "Complete", label: "Complete" },
            { value: "Outstanding", label: "Outstanding" },
            { value: "Approved", label: "Approved" },
          ]}
          onChange={(v) => handleChange("poStatus", v)}
        />
        <Field
          label="PR status"
          value={getVal("prStatus", "all")}
          options={[
            { value: "all", label: "All PR status" },
            { value: "Complete", label: "Complete" },
            { value: "Outstanding", label: "Outstanding" },
            { value: "Approved", label: "Approved" },
          ]}
          onChange={(v) => handleChange("prStatus", v)}
        />
        <Field
          label="Facility"
          value={getVal("facility", "all")}
          options={[
            { value: "all", label: "All facilities" },
            { value: "FASILITAS", label: "Fasilitas" },
            { value: "NON FASILITAS", label: "Non Fasilitas" },
          ]}
          onChange={(v) => handleChange("facility", v)}
        />
        <Field
          label="Section"
          value={getVal("section", "all")}
          options={[
            { value: "all", label: "All sections" },
            { value: "PPIC", label: "PPIC" },
            { value: "HRD", label: "HRD" },
            { value: "PROCUREMENT", label: "PROCUREMENT" },
            { value: "TEKNIK", label: "TEKNIK" },
          ]}
          onChange={(v) => handleChange("section", v)}
        />
      </div>
    );
  }

  if (page === "po") {
    return (
      <div className="filters">
        <Field
          label="PO creation date"
          value={getVal("dateRange", "01-10-2026 – 08-10-2026")}
          icon="calendar"
          options={[
            { value: "01-10-2026 – 08-10-2026", label: "01-10-2026 – 08-10-2026" },
            { value: "all", label: "All Dates" },
            { value: "this_month", label: "This Month (Oct 2026)" },
            { value: "last_month", label: "Last Month (Sep 2026)" },
          ]}
          onChange={(v) => handleChange("dateRange", v)}
        />
        <Field
          label="Supplier"
          value={getVal("supplier", "all")}
          options={[
            { value: "all", label: "All suppliers" },
            { value: "PT. Mitra Logam Mandiri", label: "PT. Mitra Logam Mandiri" },
            { value: "PT Hasil Fastindo", label: "PT Hasil Fastindo" },
            { value: "CV Sumber Berkah", label: "CV Sumber Berkah" },
          ]}
          onChange={(v) => handleChange("supplier", v)}
        />
        <Field
          label="Status facility"
          value={getVal("facility", "all")}
          options={[
            { value: "all", label: "All facilities" },
            { value: "FASILITAS", label: "Fasilitas" },
            { value: "NON FASILITAS", label: "Non Fasilitas" },
          ]}
          onChange={(v) => handleChange("facility", v)}
        />
        <Field
          label="Status"
          value={getVal("status", "all")}
          options={[
            { value: "all", label: "All statuses" },
            { value: "Approved 1", label: "Approved 1" },
            { value: "Approved 2", label: "Approved 2" },
            { value: "Ready", label: "Ready" },
          ]}
          onChange={(v) => handleChange("status", v)}
        />
        <Field
          label="Dept created"
          value={getVal("dept", "all")}
          options={[
            { value: "all", label: "All departments" },
            { value: "PROCUREMENT", label: "PROCUREMENT" },
            { value: "PURCHASING", label: "PURCHASING" },
          ]}
          onChange={(v) => handleChange("dept", v)}
        />
      </div>
    );
  }

  if (page === "warehouse") {
    return (
      <div className="filters">
        <Field
          label="Receive date"
          value={getVal("dateRange", "01-10-2026 – 31-10-2026")}
          icon="calendar"
          options={[
            { value: "01-10-2026 – 31-10-2026", label: "01-10-2026 – 31-10-2026" },
            { value: "all", label: "All Dates" },
            { value: "this_month", label: "This Month (Oct 2026)" },
            { value: "last_month", label: "Last Month (Sep 2026)" },
          ]}
          onChange={(v) => handleChange("dateRange", v)}
        />
        <Field
          label="Document type"
          value={getVal("docType", "all")}
          options={[
            { value: "all", label: "All Type of Documents" },
            { value: "BC 2.3", label: "BC 2.3" },
            { value: "BC 4.0", label: "BC 4.0" },
            { value: "Lokal", label: "Lokal" },
          ]}
          onChange={(v) => handleChange("docType", v)}
        />
        <Field
          label="BPB type"
          value={getVal("bpbType", "all")}
          options={[
            { value: "all", label: "Select BPB Type" },
            { value: "BPB PO", label: "BPB PO" },
            { value: "BPB NON PO", label: "BPB NON PO" },
          ]}
          onChange={(v) => handleChange("bpbType", v)}
        />
        <Field
          label="Approval"
          value={getVal("approval", "all")}
          options={[
            { value: "all", label: "Choose Approval" },
            { value: "Approved", label: "Approved" },
            { value: "Waiting Approval", label: "Waiting Approval" },
          ]}
          onChange={(v) => handleChange("approval", v)}
        />
      </div>
    );
  }

  // PR Filter Panel (Default)
  return (
    <div className="filters">
      <Field
        label="PR creation date"
        value={getVal("dateRange", "01 Mar – 31 Mar 2025")}
        icon="calendar"
        options={[
          { value: "01 Mar – 31 Mar 2025", label: "01 Mar – 31 Mar 2025" },
          { value: "all", label: "All Dates" },
          { value: "this_month", label: "This Month (Oct 2026)" },
          { value: "last_month", label: "Last Month (Sep 2026)" },
          { value: "year_2026", label: "Year 2026" },
          { value: "custom", label: "Custom Date Range" },
        ]}
        onChange={(v) => handleChange("dateRange", v)}
      />
      <Field
        label="Status"
        value={getVal("status", "all")}
        options={[
          { value: "all", label: "All statuses" },
          { value: "ordered", label: "Ordered" },
          { value: "outstanding", label: "Outstanding" },
          { value: "waiting_1", label: "Waiting for Approve 1" },
          { value: "waiting_2", label: "Waiting for Approve 2" },
          { value: "approved_1", label: "Approved 1" },
          { value: "approved_2", label: "Approved 2" },
          { value: "approved", label: "Approved (Complete)" },
          { value: "outstanding", label: "Outstanding" },
          { value: "partial_closing", label: "Partial Closing" },
          { value: "closing", label: "Closing" },
          { value: "ready", label: "Ready" },
          { value: "rejected", label: "Rejected" },
        ]}
        onChange={(v) => handleChange("status", v)}
      />
      <Field
        label="Section"
        value={getVal("section", "all")}
        options={[
          { value: "all", label: "All sections" },
          { value: "Maintenance & Engineering", label: "Maintenance & Engineering" },
          { value: "Produksi & Smelting", label: "Produksi & Smelting" },
          { value: "PPIC & Logistik", label: "PPIC & Logistik" },
          { value: "HSE", label: "HSE" },
          { value: "TEKNIK", label: "TEKNIK" },
          { value: "HRD", label: "HRD" },
          { value: "PROCUREMENT", label: "PROCUREMENT" },
          { value: "Produksi & Operasional", label: "Produksi & Operasional" },
        ]}
        onChange={(v) => handleChange("section", v)}
      />
      <Field
        label="Supplier / item"
        value={getVal("supplierItem", "")}
        isInput={true}
        inputPlaceholder="All suppliers & items"
        onInputChange={(v) => handleChange("supplierItem", v)}
      />
    </div>
  );
}
