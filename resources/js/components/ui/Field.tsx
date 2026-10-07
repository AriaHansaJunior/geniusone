import { Icon } from "./Icon";
import type { IconName } from "../../types";

export function Field({
  label,
  value,
  icon,
  wide,
}: {
  label: string;
  value: string;
  icon?: IconName;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "field--wide" : ""}`}>
      <span>{label}</span>
      <div className="field__control">
        {icon && <Icon name={icon} size={16} />}
        <span>{value}</span>
        {!icon || icon === "calendar" ? <Icon name="chevron" size={14} /> : null}
      </div>
    </label>
  );
}
