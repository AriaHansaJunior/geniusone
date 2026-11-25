import React from "react";
import { KWT_LOGO_BASE64 } from "./kwtLogoData";

export interface KwtPoPrintItem {
  no?: number;
  description: string;
  quantity: number | string;
  uom: string;
  unitPrice: number | string;
  totalPrice: number | string;
  remarks?: string;
}

export interface KwtPrintPoProps {
  poNumber: string;
  orderDate: string;
  revisedNumber?: string;
  revisedDate?: string;
  supplierName: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  currency?: string;
  items: KwtPoPrintItem[];
  deliveryTerm?: string;
  latestDelivery?: string;
  paymentTerm?: string;
  poNote?: string;
  subtotal: number;
  vatAmount: number;
  discountAmount?: number;
  otherCostsAmount?: number;
  pphAmount?: number;
  grandTotal: number;
  approvedBy?: string;
}

const formatPoMoney = (val: number | string, decimals = 2): string => {
  if (typeof val === "string") {
    const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(cleaned)) return val;
    val = cleaned;
  }
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatPoQty = (val: number | string): string => {
  if (typeof val === "string") {
    const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(cleaned)) return val;
    val = cleaned;
  }
  return Number.isInteger(val)
    ? val.toLocaleString("en-US")
    : val.toLocaleString("en-US", { maximumFractionDigits: 4 });
};

export const KwtPrintTemplatePo: React.FC<KwtPrintPoProps> = ({
  poNumber,
  orderDate,
  revisedNumber = "",
  revisedDate = "",
  supplierName,
  contactPerson = "",
  phoneNumber = "",
  email = "",
  currency = "IDR",
  items = [],
  deliveryTerm = "",
  latestDelivery = "",
  paymentTerm = "",
  poNote = "",
  subtotal,
  vatAmount,
  discountAmount = 0,
  otherCostsAmount = 0,
  pphAmount = 0,
  grandTotal,
  approvedBy = "",
}) => {
  const cleanSupplier = supplierName.replace(/^\[[^\]]+\]\s*/, "").trim() || supplierName;
  const cleanRevised =
    revisedNumber && revisedNumber !== "0" && revisedNumber !== "-" ? revisedNumber : "";
  const cleanApproved =
    approvedBy && approvedBy !== "-" && approvedBy !== "—"
      ? approvedBy.replace(/^.*?\sby\s+/i, "").trim()
      : "";

  return (
    <div className="kwt-print-sheet kwt-po-sheet kwt-print-target">
      <div className="kwt-po-box">
        {/* Top Company Header Band */}
        <div className="kwt-po-top-header">
          <img
            src={KWT_LOGO_BASE64}
            alt="PT. KARABHA WIRATAMA"
            className="kwt-po-logo"
          />
          <div className="kwt-po-company-block">
            <h1 className="kwt-po-company-name">PT. KARABHA WIRATAMA</h1>
            <p className="kwt-po-company-addr">
              JL RAYA TEGAL-PEMALANG KM.10, MARIBAYA, KRAMAT, KAB. TEGAL, JAWA TENGAH, 52481
            </p>
          </div>
        </div>

        {/* Title & Document Number / Revision Grid */}
        <div className="kwt-po-title-band">
          <div className="kwt-po-title-text">PURCHASE ORDER</div>
          <div className="kwt-po-number-grid">
            <table className="kwt-po-meta-table">
              <tbody>
                <tr>
                  <td className="kwt-po-meta-lbl">Number</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{poNumber || "-"}</td>
                  <td className="kwt-po-meta-lbl-sm">Date</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{orderDate || "-"}</td>
                </tr>
                <tr>
                  <td className="kwt-po-meta-lbl">Revised Number</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{cleanRevised}</td>
                  <td className="kwt-po-meta-lbl-sm">Revised Date</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{cleanRevised ? revisedDate : ""}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Information Band */}
        <div className="kwt-po-supplier-band">
          <div className="kwt-po-supplier-left">
            <div className="kwt-po-supplier-heading">Supplier Information</div>
            <div className="kwt-po-supplier-name">{cleanSupplier || "-"}</div>
          </div>
          <div className="kwt-po-supplier-right">
            <table className="kwt-po-meta-table">
              <tbody>
                <tr>
                  <td className="kwt-po-meta-lbl">Contact Person</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{contactPerson}</td>
                </tr>
                <tr>
                  <td className="kwt-po-meta-lbl">Phone Number</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{phoneNumber}</td>
                </tr>
                <tr>
                  <td className="kwt-po-meta-lbl">Email</td>
                  <td className="kwt-po-meta-col">:</td>
                  <td className="kwt-po-meta-val">{email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table with Continuous Vertical Dividers */}
        <table className="kwt-po-items-table">
          <colgroup>
            <col className="kwt-w-4" />
            <col className="kwt-w-33" />
            <col className="kwt-w-10" />
            <col className="kwt-w-7" />
            <col className="kwt-w-13" />
            <col className="kwt-w-16" />
            <col className="kwt-w-17" />
          </colgroup>
          <thead>
            <tr>
              <th>No</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>UOM</th>
              <th>Unit Price</th>
              <th>Total Price ({currency})</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={`po-print-item-${idx}`}>
                <td className="kwt-col-center">{it.no || idx + 1}</td>
                <td className="kwt-col-left">{it.description}</td>
                <td className="kwt-col-right">{formatPoQty(it.quantity)}</td>
                <td className="kwt-col-center">{it.uom || "PCS"}</td>
                <td className="kwt-col-right">{formatPoMoney(it.unitPrice, 2)}</td>
                <td className="kwt-col-right">{formatPoMoney(it.totalPrice, 2)}</td>
                <td className="kwt-col-left">{it.remarks || ""}</td>
              </tr>
            ))}

            {/* Continuous blank filler keeping vertical lines extending down to Term & Conditions */}
            <tr className="kwt-po-items-filler">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Section: Terms Left | Totals & Signatures Right */}
        <table className="kwt-po-bottom-table">
          <tbody>
            <tr>
              <td className="kwt-po-terms-cell">
                <div className="kwt-po-terms-title">Term &amp; Conditions</div>
                <table className="kwt-po-terms-table">
                  <tbody>
                    <tr>
                      <td className="kwt-po-term-num">1.</td>
                      <td className="kwt-po-term-lbl">Delivery Term</td>
                      <td className="kwt-po-term-col">:</td>
                      <td>{deliveryTerm && deliveryTerm !== "—" ? deliveryTerm : ""}</td>
                    </tr>
                    <tr>
                      <td className="kwt-po-term-num">2.</td>
                      <td className="kwt-po-term-lbl">Latest Deliver</td>
                      <td className="kwt-po-term-col">:</td>
                      <td>{latestDelivery && latestDelivery !== "-" ? latestDelivery : ""}</td>
                    </tr>
                    <tr>
                      <td className="kwt-po-term-num">3.</td>
                      <td className="kwt-po-term-lbl">Payment Term</td>
                      <td className="kwt-po-term-col">:</td>
                      <td>{paymentTerm && paymentTerm !== "—" ? paymentTerm : ""}</td>
                    </tr>
                    {poNote && poNote !== "-" && poNote !== "—" ? (
                      <tr>
                        <td className="kwt-po-term-num">4.</td>
                        <td className="kwt-po-term-lbl">Note</td>
                        <td className="kwt-po-term-col">:</td>
                        <td>{poNote}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </td>

              <td className="kwt-po-right-cell">
                <table className="kwt-po-totals-table">
                  <tbody>
                    <tr>
                      <td className="kwt-po-totals-lbl">SUB TOTAL</td>
                      <td className="kwt-po-totals-val">{formatPoMoney(subtotal, 0)}</td>
                    </tr>
                    {discountAmount > 0 ? (
                      <tr>
                        <td className="kwt-po-totals-lbl">DISCOUNT</td>
                        <td className="kwt-po-totals-val">- {formatPoMoney(discountAmount, 0)}</td>
                      </tr>
                    ) : null}
                    <tr>
                      <td className="kwt-po-totals-lbl">TOTAL VAT</td>
                      <td className="kwt-po-totals-val">{formatPoMoney(vatAmount, 0)}</td>
                    </tr>
                    {otherCostsAmount > 0 ? (
                      <tr>
                        <td className="kwt-po-totals-lbl">OTHER COSTS</td>
                        <td className="kwt-po-totals-val">{formatPoMoney(otherCostsAmount, 0)}</td>
                      </tr>
                    ) : null}
                    {pphAmount > 0 ? (
                      <tr>
                        <td className="kwt-po-totals-lbl">PPH DEDUCTION</td>
                        <td className="kwt-po-totals-val">- {formatPoMoney(pphAmount, 0)}</td>
                      </tr>
                    ) : null}
                    <tr className="kwt-po-totals-grand">
                      <td className="kwt-po-totals-lbl">TOTAL AMOUNT</td>
                      <td className="kwt-po-totals-val">{formatPoMoney(grandTotal, 0)}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="kwt-po-sign-table">
                  <tbody>
                    <tr>
                      <td className="kwt-po-sign-cell">
                        <div className="kwt-po-sign-title">Confirm by</div>
                        <div className="kwt-po-sign-name">{cleanSupplier}</div>
                      </td>
                      <td className="kwt-po-sign-spacer">&nbsp;</td>
                      <td className="kwt-po-sign-cell">
                        <div className="kwt-po-sign-title">Approved by</div>
                        <div className="kwt-po-sign-name">{cleanApproved}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Distribution Legend Strip */}
        <div className="kwt-po-distribution">
          <span>1. White - Finance</span>
          <span>2. Yellow - Purchasing</span>
          <span>3. Green - Accounting</span>
        </div>
      </div>

      {/* Bottom Outer Form Meta */}
      <div className="kwt-po-form-footer">
        <div className="kwt-po-form-meta-left">
          <span>Form : KWT-PURC-001</span>
          <span>Rev : 0</span>
          <span>Date : 25.05.2026</span>
        </div>
        <span>Page 1 / 1</span>
      </div>
    </div>
  );
};
