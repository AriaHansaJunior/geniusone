import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Field } from "../components/ui/Field";
import { SearchField } from "../components/ui/SearchField";
import { Icon } from "../components/ui/Icon";

function SectionHeading({
  number,
  title,
  note,
}: {
  number: string;
  title: string;
  note: string;
}) {
  return (
    <div className="section-heading">
      <span>{number}</span>
      <strong>{title}</strong>
      <small>{note}</small>
    </div>
  );
}

function Swatch({
  name,
  hex,
  className,
}: {
  name: string;
  hex: string;
  className: string;
}) {
  return (
    <div className={`swatch ${className}`}>
      <div />
      <strong>{name}</strong>
      <span>{hex}</span>
    </div>
  );
}

export function FoundationPage() {
  return (
    <div className="foundation">
      <section className="foundation__intro">
        <div>
          <span className="eyebrow">01 — DESIGN TOKENS</span>
          <div className="display-title">Built for clarity at scale.</div>
          <p>
            A deliberate visual language for high-density procurement and
            warehouse workflows. Blue communicates action; neutrals create
            hierarchy; accents remain semantic.
          </p>
        </div>
        <div className="foundation__meta">
          <span>Desktop canvas</span>
          <strong>2560 × 1600</strong>
          <span>Base spacing</span>
          <strong>4 px grid</strong>
        </div>
      </section>

      <section className="foundation__section">
        <SectionHeading
          number="01"
          title="Color system"
          note="Semantic roles, not decoration"
        />
        <div className="swatch-grid">
          <Swatch
            name="Primary 600"
            hex="#0071E3"
            className="swatch--primary"
          />
          <Swatch
            name="Primary 700"
            hex="#0066CC"
            className="swatch--primary-dark"
          />
          <Swatch
            name="Primary 500"
            hex="#2997FF"
            className="swatch--primary-light"
          />
          <Swatch name="Ink" hex="#1D1D1F" className="swatch--ink" />
          <Swatch name="Canvas" hex="#F5F5F7" className="swatch--canvas" />
          <Swatch name="Border" hex="#E8E8ED" className="swatch--border" />
          <Swatch name="Warning" hex="#FF791B" className="swatch--warning" />
          <Swatch name="Danger" hex="#E30000" className="swatch--danger" />
        </div>
      </section>

      <section className="foundation__section">
        <SectionHeading
          number="02"
          title="Typography"
          note="Lato primary · Noto Sans support"
        />
        <div className="type-grid">
          <div>
            <span>Page title / 24 · 700</span>
            <div className="type-page">Combined PR–PO Report</div>
          </div>
          <div>
            <span>Section title / 16 · 700</span>
            <div className="type-section">Purchase order details</div>
          </div>
          <div>
            <span>Body / 14 · 400</span>
            <div className="type-body">
              Supporting information remains readable in dense layouts.
            </div>
          </div>
          <div>
            <span>Metadata / 12 · 700</span>
            <div className="type-meta">UPDATED 24 MAR 2025, 09:42</div>
          </div>
        </div>
      </section>

      <section className="foundation__section">
        <SectionHeading
          number="03"
          title="Core components"
          note="Reusable states and variants"
        />
        <div className="component-showcase">
          <div className="showcase-group">
            <span className="showcase-label">BUTTONS</span>
            <div className="button-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>

          <div className="showcase-group">
            <span className="showcase-label">STATUS BADGES</span>
            <div className="button-row">
              <Badge tone="gray">Ready</Badge>
              <Badge tone="blue">Approve 1</Badge>
              <Badge tone="purple">Approve 2</Badge>
              <Badge tone="green">Approved</Badge>
              <Badge tone="green">Complete</Badge>
              <Badge tone="orange">Outstanding</Badge>
            </div>
          </div>

          <div className="showcase-group">
            <span className="showcase-label">FORM CONTROLS</span>
            <div className="foundation-fields">
              <Field label="Default select" value="Select option" />
              <Field
                label="Date range"
                value="01 Mar – 31 Mar 2025"
                icon="calendar"
              />
              <SearchField
                value=""
                onChange={() => {}}
                placeholder="Search records…"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="foundation__section">
        <SectionHeading
          number="04"
          title="Outstanding quantity pattern"
          note="Status grounded in fulfilment"
        />
        <div className="quantity-story">
          <div>
            <span>REQUESTED</span>
            <strong>
              3 <small>pcs</small>
            </strong>
          </div>
          <Icon name="arrowRight" />
          <div>
            <span>PURCHASED</span>
            <strong>
              2 <small>pcs</small>
            </strong>
          </div>
          <Icon name="arrowRight" />
          <div className="quantity-story__remain">
            <span>REMAINING</span>
            <strong>
              1 <small>pc</small>
            </strong>
          </div>
          <Badge tone="orange">Outstanding</Badge>
          <p>
            The request stays outstanding until purchased quantity equals
            requested quantity.
          </p>
        </div>
      </section>
    </div>
  );
}
