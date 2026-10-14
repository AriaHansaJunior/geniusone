import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { ItemPickerModal } from "./ItemPickerModal";
import type { ItemRecord } from "./item-types";

interface GenerateQrCodePageProps {
  allItems: ItemRecord[];
  onCancel: () => void;
}

export function GenerateQrCodePage({
  allItems,
  onCancel,
}: GenerateQrCodePageProps) {
  // Pre-seed with first 2 items for immediate visual demonstration
  const [selectedItems, setSelectedItems] = useState<ItemRecord[]>(() =>
    allItems.slice(0, 2)
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const handleAddItems = (newItems: ItemRecord[]) => {
    setSelectedItems((prev) => {
      const existingCodes = new Set(prev.map((i) => i.itemCode));
      const filtered = newItems.filter((i) => !existingCodes.has(i.itemCode));
      return [...prev, ...filtered];
    });
  };

  const handleRemoveItem = (code: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.itemCode !== code));
  };

  const handlePrint = () => {
    if (selectedItems.length === 0) {
      setPrintNotice("Please select at least one item to generate QR codes.");
      return;
    }
    setPrintNotice(
      `Print command dispatched for ${selectedItems.length} QR item label(s).`
    );
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="generate-qr-page">
      {/* Page Header */}
      <div className="generate-qr-header">
        <div>
          <h1 className="generate-qr-title">Generate QR Code</h1>
          <p className="generate-qr-subtitle">
            Select inventory items to generate and print standardized customs QR labels.
          </p>
        </div>

        <div className="generate-qr-header-actions">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon="print"
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
          >
            Print ({selectedItems.length})
          </Button>
        </div>
      </div>

      {/* Print Notice Banner */}
      {printNotice && (
        <div className="qr-print-notice">
          <Icon name="check" size={16} />
          <span>{printNotice}</span>
          <button
            type="button"
            className="qr-print-notice-close"
            onClick={() => setPrintNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Container Card */}
      <div className="panel qr-table-panel">
        <div className="qr-table-toolbar">
          <div className="qr-table-counter">
            <strong>Selected Items</strong>
            <span>({selectedItems.length} items queued for printing)</span>
          </div>

          <Button
            variant="secondary"
            icon="plus"
            onClick={() => setIsPickerOpen(true)}
          >
            Add Item
          </Button>
        </div>

        {/* Selected Items Table */}
        <div className="table-frame">
          <table className="data-table qr-items-table">
            <thead>
              <tr>
                <th style={{ width: "60px", textAlign: "center" }}>No</th>
                <th style={{ width: "180px" }}>Kode Barang</th>
                <th>Nama Barang</th>
                <th style={{ width: "160px" }}>Classification</th>
                <th style={{ width: "100px", textAlign: "center" }}>Unit</th>
                <th style={{ width: "80px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.length > 0 ? (
                selectedItems.map((item, index) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: "center", color: "var(--muted)" }}>
                      {index + 1}
                    </td>
                    <td>
                      <span className="code-pill">{item.itemCode}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {item.itemName}
                    </td>
                    <td>
                      <span className="qr-classification-text">
                        {item.classification}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>
                      {item.smallestUnitCode}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="qr-remove-btn"
                        title="Remove from print queue"
                        onClick={() => handleRemoveItem(item.itemCode)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="box" />
                      </div>
                      <strong>No items selected for QR generation</strong>
                      <span>
                        Click "+ Add Item" above to choose items from your catalog.
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* QR Code Labels Preview Section */}
        {selectedItems.length > 0 && (
          <div className="qr-preview-section">
            <h4 className="qr-preview-heading">Print Preview Samples</h4>
            <div className="qr-labels-grid">
              {selectedItems.slice(0, 4).map((item) => (
                <div key={item.id} className="qr-label-card">
                  <div className="qr-label-header">
                    <span className="qr-label-brand">GENIUSONE EXIM</span>
                    <span className="qr-label-facility">{item.facility}</span>
                  </div>
                  <div className="qr-label-body">
                    <div className="qr-mock-code">
                      <Icon name="grid" size={48} />
                    </div>
                    <div className="qr-label-info">
                      <strong className="qr-label-code">{item.itemCode}</strong>
                      <span className="qr-label-name">{item.itemName}</span>
                      <small className="qr-label-meta">
                        {item.classification} · {item.smallestUnitCode}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Item Picker Modal */}
      <ItemPickerModal
        isOpen={isPickerOpen}
        items={allItems}
        alreadySelectedCodes={selectedItems.map((i) => i.itemCode)}
        onAddItems={handleAddItems}
        onClose={() => setIsPickerOpen(false)}
      />
    </div>
  );
}

export default GenerateQrCodePage;
