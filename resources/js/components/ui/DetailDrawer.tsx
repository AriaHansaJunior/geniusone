import { Icon } from "./Icon";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Material } from "../common/CommonCells";
import type { TableRow } from "../../types";

interface DetailDrawerProps {
  row: TableRow;
  onClose: () => void;
}

export function DetailDrawer({ row, onClose }: { row: TableRow; onClose: () => void }) {
  const type = row._type || "po";
  const docNumber = row._rawNumber || "PO-2503-0039";
  const prNumber = row._rawPr || "PR-2503-0086";
  const poNumber = row._rawPo || (type === "po" ? docNumber : "PO-2503-0039");
  const rmNumber = row._rawRn || "RM-2503-0017";
  const supplierName = row._rawSupplier || "CV Mekar Jaya";
  const orderTotal = row._rawTotal || "IDR 7,260,000";
  const status = row._rawStatus || "Outstanding";
  const dateStr = row._rawDate || "21 Mar 2025, 15:10";

  const title =
    type === "pr"
      ? "Purchase Request Details"
      : type === "po"
      ? "Purchase Order Details"
      : type === "warehouse"
      ? "Receive Material Details"
      : "PR–PO Tracking Details";

  const badgeTone =
    status === "Approved" || status === "Complete"
      ? "green"
      : status === "Outstanding"
      ? "orange"
      : status === "Approve 2"
      ? "blue"
      : "gray";

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer__header">
          <div>
            <span className="eyebrow">DOCUMENT DETAILS</span>
            <div className="drawer__title">{title}</div>
            <span>{docNumber}</span>
          </div>
          <button
            type="button"
            className="icon-action"
            onClick={onClose}
            aria-label="Close details"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="drawer__status">
          <Badge tone={badgeTone}>{status}</Badge>
          <span>Last updated {dateStr}</span>
        </div>

        <div className="detail-hero">
          <div>
            <span>SUPPLIER / ENTITY</span>
            <strong>{supplierName}</strong>
            <small>Bandung, Indonesia</small>
          </div>
          <div>
            <span>{type === "warehouse" ? "TOTAL RECEIVED" : "ORDER TOTAL"}</span>
            <strong>{orderTotal}</strong>
            <small>Tax included</small>
          </div>
        </div>

        <div className="drawer__section">
          <strong>Document relationship</strong>
          <div className="relationship">
            <div className={type === "pr" ? "active" : ""}>
              <Icon name="file" />
              <span>Purchase Request</span>
              <strong>{prNumber}</strong>
            </div>
            <Icon name="arrowRight" />
            <div className={type === "po" || type === "report" ? "active" : ""}>
              <Icon name="archive" />
              <span>Purchase Order</span>
              <strong>{poNumber}</strong>
            </div>
            <Icon name="arrowRight" />
            <div className={type === "warehouse" ? "active" : ""}>
              <Icon name="box" />
              <span>Receive Material</span>
              <strong>{rmNumber}</strong>
            </div>
          </div>
        </div>

        <div className="drawer__section">
          <div className="section-row">
            <strong>Item information</strong>
            <span>2 materials</span>
          </div>
          <div className="item-card">
            <div>
              <Material name="Industrial V-Belt B72" code="BLT-B72" />
              <Badge tone="orange">4 outstanding</Badge>
            </div>
            <div className="item-quantities">
              <span>
                Requested <strong>12 pcs</strong>
              </span>
              <span>
                Purchased <strong>8 pcs</strong>
              </span>
              <span>
                Received <strong>8 pcs</strong>
              </span>
            </div>
          </div>
          <div className="item-card">
            <div>
              <Material name="Drive Pulley 160mm" code="PLY-160" />
              <Badge tone="green">Complete</Badge>
            </div>
            <div className="item-quantities">
              <span>
                Requested <strong>6 pcs</strong>
              </span>
              <span>
                Purchased <strong>6 pcs</strong>
              </span>
              <span>
                Received <strong>6 pcs</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="drawer__section">
          <strong>Approval information</strong>
          <div className="timeline">
            <div className="done">
              <span>
                <Icon name="check" size={13} />
              </span>
              <div>
                <strong>Approve 1 · Budi Santoso</strong>
                <small>18 Mar 2025, 15:04</small>
              </div>
            </div>
            <div className="done">
              <span>
                <Icon name="check" size={13} />
              </span>
              <div>
                <strong>Approve 2 · Maya Andini</strong>
                <small>18 Mar 2025, 16:28</small>
              </div>
            </div>
          </div>
        </div>

        <div className="drawer__footer">
          <Button variant="secondary" icon="print">
            Print
          </Button>
          <Button icon="download">Export document</Button>
        </div>
      </aside>
    </div>
  );
}
