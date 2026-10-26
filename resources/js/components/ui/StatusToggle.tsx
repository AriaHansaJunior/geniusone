import { Icon } from "./Icon";

interface StatusToggleProps {
  hidden?: boolean;
  active?: boolean;
  onToggle: () => void;
  title?: string;
  className?: string;
  ariaLabel?: string;
  showText?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}

export function StatusToggle({
  hidden,
  active,
  onToggle,
  title,
  className = "",
  ariaLabel,
  showText = true,
  activeLabel = "Active",
  inactiveLabel,
}: StatusToggleProps) {
  // If `hidden` prop is explicitly provided, isActive is !hidden.
  // Otherwise if `active` prop is provided, isActive is active.
  const isActive = hidden !== undefined ? !hidden : Boolean(active);
  const resolvedInactiveLabel =
    inactiveLabel || (hidden !== undefined ? "Hidden" : "Inactive");
  const labelText = isActive ? activeLabel : resolvedInactiveLabel;

  const defaultTitle = isActive
    ? `Status: ${activeLabel} (Click to toggle)`
    : `Status: ${resolvedInactiveLabel} (Click to toggle)`;

  return (
    <button
      type="button"
      className={`status-toggle ${
        isActive ? "status-toggle--active" : "status-toggle--hidden"
      } ${className}`.trim()}
      onClick={onToggle}
      title={title || defaultTitle}
      aria-label={ariaLabel || `Status: ${labelText}`}
    >
      <span className="status-toggle__icon" aria-hidden="true">
        <Icon name={isActive ? "check" : "close"} size={12} strokeWidth={2.5} />
      </span>
      {showText && <span className="status-toggle__label">{labelText}</span>}
    </button>
  );
}

export default StatusToggle;
