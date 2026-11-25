import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/Button";

export interface KwtPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentCode: string;
  orientation?: "landscape" | "portrait";
  // Optional variant switcher for PR (Internal vs Eksternal)
  hasVariantSwitcher?: boolean;
  activeVariant?: "internal" | "eksternal";
  onVariantChange?: (variant: "internal" | "eksternal") => void;
  onPrint?: () => void | Promise<void>;
  children: React.ReactNode;
}

export const KwtPrintModal: React.FC<KwtPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  documentCode,
  orientation = "landscape",
  hasVariantSwitcher = false,
  activeVariant = "internal",
  onVariantChange,
  onPrint,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add("kwt-print-modal-open");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("kwt-print-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const modalContent = (
    <div
      className="kwt-print-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`kwt-print-modal ${
          orientation === "landscape" ? "kwt-print-modal--landscape" : ""
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="kwt-print-modal__header">
          <div className="kwt-print-modal__title-box">
            <h3 className="kwt-print-modal__title">{title}</h3>
            <span className="kwt-print-modal__code-badge">{documentCode}</span>
          </div>

          <div className="kwt-print-modal__actions">
            {hasVariantSwitcher && onVariantChange && (
              <div className="kwt-print-modal__type-switcher">
                <button
                  type="button"
                  className={`kwt-print-modal__type-btn ${
                    activeVariant === "internal" ? "active" : ""
                  }`}
                  onClick={() => onVariantChange("internal")}
                >
                  Internal (KWT-PPIC-001)
                </button>
                <button
                  type="button"
                  className={`kwt-print-modal__type-btn ${
                    activeVariant === "eksternal" ? "active" : ""
                  }`}
                  onClick={() => onVariantChange("eksternal")}
                >
                  Eksternal (KWT-PPIC-002)
                </button>
              </div>
            )}

            <Button variant="primary" onClick={handlePrint}>
              Print Now
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Modal Body: Printable Document Sheet */}
        <div className="kwt-print-modal__body">{children}</div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};
