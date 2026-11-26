import React, { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";
import { useNotification } from "../../../context/NotificationContext";
import { closePurchaseOrderServiceApi, fetchDetail } from "../../../data/api";
import type { TableRow } from "../../../types";

interface PurchaseOrderServiceCloseFormProps {
  code: string;
  onCancel: () => void;
  onClosed: (poCode: string) => void;
}

export function PurchaseOrderServiceCloseForm({
  code,
  onCancel,
  onClosed,
}: PurchaseOrderServiceCloseFormProps) {
  const { notifySuccess, notifyError } = useNotification();
  const today = new Date().toISOString().slice(0, 10);

  const [poRow, setPoRow] = useState<TableRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [beritaAcaraNumber, setBeritaAcaraNumber] = useState("");
  const [beritaAcaraDate, setBeritaAcaraDate] = useState(today);
  const [completionPercentage, setCompletionPercentage] = useState("100");
  const [verifiedByName, setVerifiedByName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDetail("po", code)
      .then((item) => {
        if (!active) return;
        setPoRow(item);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!beritaAcaraDate) {
      setErrorMessage("Berita Acara Date is required.");
      return;
    }

    const pct = Number(completionPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setErrorMessage("Completion Percentage must be between 1 and 100.");
      return;
    }

    const formData = new FormData();
    if (beritaAcaraNumber.trim()) {
      formData.append("berita_acara_number", beritaAcaraNumber.trim());
    }
    formData.append("berita_acara_date", beritaAcaraDate);
    formData.append("completion_percentage", String(pct));
    if (verifiedByName.trim()) {
      formData.append("verified_by_name", verifiedByName.trim());
    }
    if (serviceDescription.trim()) {
      formData.append("service_description", serviceDescription.trim());
    }
    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }
    if (attachment) {
      formData.append("attachment", attachment);
    }

    const targetIdentifier = poRow?.id ? String(poRow.id) : code;

    try {
      setSubmitting(true);
      const res = await closePurchaseOrderServiceApi(targetIdentifier, formData);
      notifySuccess(
        "Service PO Closed",
        res.message || "Service Purchase Order closed with Berita Acara."
      );
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      onClosed(poRow?.poNumber ? String(poRow.poNumber) : code);
    } catch (err: any) {
      const msg = err?.message || "Failed to close Service Purchase Order.";
      setErrorMessage(msg);
      notifyError("Close Service PO Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="po-service-close-page">
        <div className="po-service-close-card">
          <LoadingBuffer variant="inline" label="Loading Service Purchase Order details..." />
        </div>
      </div>
    );
  }

  const poNumber = String(poRow?.poNumber || poRow?._rawNumber || code);
  const poStatus = String(poRow?.status || poRow?._rawStatus || "Unknown");
  const isServicePo =
    Boolean(poRow?.is_service) ||
    String(poRow?.order_category || "").toUpperCase() === "SERVICE" ||
    String(poRow?.poType || "").toLowerCase().includes("service") ||
    String(poRow?.poType || "").toLowerCase().includes("jasa");
  const canClose = isServicePo && poStatus === "Approved";

  return (
    <div className="po-service-close-page">
      <div className="po-service-close-card">
        <div>
          <span className="eyebrow">PROCUREMENT SERVICE CLOSURE</span>
          <h2 className="table-panel__title">Close Service PO via Berita Acara</h2>
        </div>

        <div className="po-service-close-summary">
          <div className="po-service-close-summary__item">
            <span className="po-service-close-summary__label">PO Number</span>
            <span className="po-service-close-summary__val">{poNumber}</span>
          </div>
          <div className="po-service-close-summary__item">
            <span className="po-service-close-summary__label">Supplier</span>
            <span className="po-service-close-summary__val">{String(poRow?.supplier || "—")}</span>
          </div>
          <div className="po-service-close-summary__item">
            <span className="po-service-close-summary__label">Category</span>
            <span className="po-service-close-summary__val">
              <Badge tone={isServicePo ? "purple" : "gray"}>
                {isServicePo ? "SERVICE (JASA)" : "GOODS"}
              </Badge>
            </span>
          </div>
          <div className="po-service-close-summary__item">
            <span className="po-service-close-summary__label">Current Status</span>
            <span className="po-service-close-summary__val">
              <Badge tone={poStatus === "Approved" ? "green" : "orange"}>{poStatus}</Badge>
            </span>
          </div>
        </div>

        {!isServicePo && (
          <div className="po-service-close-banner po-service-close-banner--error">
            Only Service Purchase Orders (PO Jasa) can be closed using Berita Acara.
          </div>
        )}

        {isServicePo && poStatus !== "Approved" && (
          <div className="po-service-close-banner po-service-close-banner--error">
            Purchase Order status is currently &quot;{poStatus}&quot;. Full Stage 2 approval is required before closing.
          </div>
        )}

        {errorMessage && (
          <div className="po-service-close-banner po-service-close-banner--error">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="po-service-close-grid">
            <div className="master-form-group">
              <label htmlFor="baNumber" className="master-form-label">
                Berita Acara Number (Optional — Auto-generated if blank)
              </label>
              <input
                id="baNumber"
                type="text"
                className="master-form-input"
                value={beritaAcaraNumber}
                onChange={(e) => setBeritaAcaraNumber(e.target.value)}
                placeholder="e.g. 0001/BA-IMLI/XI/2026"
                disabled={!canClose || submitting}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="baDate" className="master-form-label">
                Berita Acara Date <span className="required-asterisk">*</span>
              </label>
              <CustomDatePicker
                id="baDate"
                value={beritaAcaraDate}
                onChange={(val) => setBeritaAcaraDate(val)}
                required
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="baCompletionPct" className="master-form-label">
                Completion Percentage (%) <span className="required-asterisk">*</span>
              </label>
              <input
                id="baCompletionPct"
                type="number"
                min="1"
                max="100"
                step="0.01"
                className="master-form-input"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(e.target.value)}
                required
                disabled={!canClose || submitting}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="baVerifiedBy" className="master-form-label">
                Verified By (PIC / User)
              </label>
              <input
                id="baVerifiedBy"
                type="text"
                className="master-form-input"
                value={verifiedByName}
                onChange={(e) => setVerifiedByName(e.target.value)}
                placeholder="Verifier full name"
                disabled={!canClose || submitting}
              />
            </div>

            <div className="master-form-group po-service-close-full">
              <label htmlFor="baServiceDesc" className="master-form-label">
                Service Completion Description
              </label>
              <textarea
                id="baServiceDesc"
                rows={3}
                className="master-form-input"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Summarize completed service work, inspection outcome, or Berita Acara reference..."
                disabled={!canClose || submitting}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="baAttachment" className="master-form-label">
                Berita Acara Attachment (PDF / Image)
              </label>
              <input
                id="baAttachment"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="master-form-input"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                disabled={!canClose || submitting}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="baNotes" className="master-form-label">
                Additional Notes
              </label>
              <input
                id="baNotes"
                type="text"
                className="master-form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional closing remarks"
                disabled={!canClose || submitting}
              />
            </div>
          </div>

          <div className="po-service-close-actions">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canClose || submitting}>
              {submitting ? "Closing..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
