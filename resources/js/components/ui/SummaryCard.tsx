export function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
}) {
  return (
    <div className={`summary-card ${tone ? `summary-card--${tone}` : ""}`}>
      <div className="summary-card__label">{label}</div>
      <div className="summary-card__row">
        <strong>{value}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}
