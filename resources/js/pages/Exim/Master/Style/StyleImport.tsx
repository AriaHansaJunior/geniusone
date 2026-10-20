import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface StyleImportProps {
  onBack: () => void;
}

export function StyleImport({ onBack }: StyleImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Download genuine Excel .xlsx template containing Kode, Name, Description
  const handleExportTemplateExcel = () => {
    try {
      const templateData = [
        ["Kode", "Name", "Description"],
        ["01", "No Style", "-"],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Set explicit column widths for clarity
      worksheet["!cols"] = [
        { wch: 15 }, // Kode
        { wch: 30 }, // Name
        { wch: 40 }, // Description
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

      XLSX.writeFile(workbook, "Template_Master_Style.xlsx");

      setInfoNotice("Template downloaded: Template_Master_Style.xlsx");
      setTimeout(() => setInfoNotice(null), 4000);
    } catch {
      setErrorMsg("Failed to generate Excel template. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setInfoNotice(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const hasValidExt = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!hasValidExt) {
        setErrorMsg("Please select a valid Excel file (.xlsx, .xls) or CSV file.");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMsg(null);
    setInfoNotice(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const hasValidExt = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!hasValidExt) {
        setErrorMsg("Please select a valid Excel file (.xlsx, .xls) or CSV file.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMsg("Please select an Excel file before submitting.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    setInfoNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/exim/master/styles/import", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const data = await response.json();

      if (response.ok && data?.status === "success") {
        setInfoNotice(
          `Success! ${data.message || `Imported ${data.data?.imported_count ?? 0} styles into database.`}`
        );
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setErrorMsg(data?.message || "Failed to process Excel import file.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error while uploading style import file.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="style-import-page">
      {/* Header */}
      <div className="style-import-header">
        <div>
          <h1 className="style-import-title">Import Excel</h1>
          <p className="style-import-subtitle">
            Master Specification/Model (Style) Bulk Import
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          icon="download"
          onClick={handleExportTemplateExcel}
          title="Download the official Excel template for Master Specification/Model"
        >
          Export Template Excel
        </Button>
      </div>

      {/* Info notice banner */}
      {infoNotice && (
        <div className="style-alert style-alert--info">
          <Icon name="check" size={16} />
          <div className="style-alert__content">
            <strong>Status Notice</strong>
            <p>{infoNotice}</p>
          </div>
          <button
            type="button"
            className="style-alert-close"
            onClick={() => setInfoNotice(null)}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Error notice banner */}
      {errorMsg && (
        <div className="style-alert style-alert--warning">
          <Icon name="alertTriangle" size={16} />
          <div className="style-alert__content">
            <strong>Validation Notice</strong>
            <p>{errorMsg}</p>
          </div>
          <button
            type="button"
            className="style-alert-close"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Import Card */}
      <form onSubmit={handleSubmit} className="style-import-card">
        {/* Step Guide / Instructions */}
        <div className="style-import-instructions">
          <div className="style-instruction-step">
            <span className="step-num">1</span>
            <span>
              Download the template by clicking <strong>Export Template Excel</strong> above.
            </span>
          </div>
          <div className="style-instruction-step">
            <span className="step-num">2</span>
            <span>
              Fill in your specifications with mandatory columns: <code>Kode</code>, <code>Name</code>, and <code>Description</code>.
            </span>
          </div>
          <div className="style-instruction-step">
            <span className="step-num">3</span>
            <span>
              Select or drag-and-drop the prepared Excel file below, then click <strong>Save</strong>.
            </span>
          </div>
        </div>

        {/* File Input Form Group */}
        <div className="style-form-group">
          <label className="style-form-label" htmlFor="fileExcelInput">
            File Excel <span className="required-mark">*</span>
          </label>

          <input
            id="fileExcelInput"
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <div
            className={`style-file-dropzone ${isDragOver ? "drag-over" : ""} ${
              selectedFile ? "has-file" : ""
            } ${errorMsg ? "has-error" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {selectedFile ? (
              <div className="style-selected-file">
                <div className="file-icon-box">
                  <Icon name="file" size={24} />
                </div>
                <div className="file-details">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
                <button
                  type="button"
                  className="file-remove-btn"
                  title="Remove selected file"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <Icon name="trash" size={14} />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="style-dropzone-prompt">
                <div className="dropzone-icon">
                  <Icon name="upload" size={28} />
                </div>
                <div className="dropzone-text">
                  <strong>Click to browse</strong> or drag and drop your Excel file here
                </div>
                <div className="dropzone-hint">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV files
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Cancel and Save */}
        <div className="style-form-actions">
          <Button type="button" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default StyleImport;
