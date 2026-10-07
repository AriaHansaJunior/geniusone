import { Icon } from "../ui/Icon";

export function DocNumber({ value, sub }: { value: string; sub: string }) {
  return (
    <div className="doc-number">
      <strong>{value}</strong>
      <span>{sub}</span>
    </div>
  );
}

export function Person({ name, sub }: { name: string; sub: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="person">
      <span className="avatar">{initials}</span>
      <div>
        <strong>{name}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

export function Material({ name, code }: { name: string; code: string }) {
  return (
    <div className="cell-main">
      <strong>{name}</strong>
      <span>{code}</span>
    </div>
  );
}

export function CellMain({ main, sub }: { main: string; sub: string }) {
  return (
    <div className="cell-main">
      <strong>{main}</strong>
      <span>{sub}</span>
    </div>
  );
}

export function Related({ text }: { text: string }) {
  return <span className="related">{text}</span>;
}

export function Approval({ step }: { step: number }) {
  return (
    <div className="approval">
      <span className={step >= 1 ? "done" : ""}>
        <Icon name="check" size={11} />
      </span>
      <i />
      <span className={step >= 2 ? "done" : ""}>
        <Icon name="check" size={11} />
      </span>
      <small>{step === 2 ? "2/2" : `${step}/2`}</small>
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress">
      <div>
        <span style={{ width: `${value}%` }} />
      </div>
      <small>{label}</small>
    </div>
  );
}

export function Quantity({
  requested,
  fulfilled,
}: {
  requested: string;
  fulfilled: string;
}) {
  return (
    <div className="cell-main">
      <strong>{requested}</strong>
      <span>
        {fulfilled === "—" ? "Not purchased" : `${fulfilled} purchased`}
      </span>
    </div>
  );
}
