import { Field } from "../ui/Field";
import type { PageKey } from "../../types";

export function FilterPanel({ page }: { page: PageKey }) {
  if (page === "report") {
    return (
      <div className="filters filters--report">
        <Field label="PO creation date" value="01-10-2026 – 08-10-2026" icon="calendar" />
        <Field label="PR creation date" value="01-10-2026 – 08-10-2026" icon="calendar" />
        <Field label="Supplier" value="All suppliers" />
        <Field label="Item material" value="All materials" />
        <Field label="Overall status" value="All statuses" />
        <Field label="PO status" value="All PO status" />
        <Field label="PR status" value="All PR status" />
        <Field label="Facility" value="All facilities" />
        <Field label="Section" value="All sections" />
      </div>
    );
  }

  if (page === "po") {
    return (
      <div className="filters">
        <Field label="PO creation date" value="01-10-2026 – 08-10-2026" icon="calendar" />
        <Field label="Supplier" value="All suppliers" />
        <Field label="Status facility" value="All facilities" />
        <Field label="Status" value="All statuses" />
        <Field label="Dept created" value="All departments" />
      </div>
    );
  }

  if (page === "warehouse") {
    return (
      <div className="filters">
        <Field label="Receive date" value="01-10-2026 – 31-10-2026" icon="calendar" />
        <Field label="Document type" value="All Type of Documents" />
        <Field label="BPB type" value="Select BPB Type" />
        <Field label="Approval" value="Choose Approval" />
      </div>
    );
  }

  return (
    <div className="filters">
      <Field label="PR creation date" value="01 Mar – 31 Mar 2025" icon="calendar" />
      <Field label="Status" value="All statuses" />
      <Field label="Section" value="All sections" />
      <Field label="Supplier / item" value="All suppliers & items" />
    </div>
  );
}
