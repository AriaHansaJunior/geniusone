import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface ButtonProps {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning" | "success" | "excel";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  loading?: boolean;
  onClick?: (e?: any) => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  "aria-label"?: string;
  title?: string;
}

export function Button({
  children,
  variant = "primary",
  size,
  icon,
  loading = false,
  onClick,
  type = "button",
  className = "",
  disabled = false,
  style,
  "aria-label": ariaLabel,
  title,
}: ButtonProps) {
  // When text is present, icons are omitted ("cukup hanya tulisan aja, ga perlu ditambahin icons").
  // Icons are only rendered for icon-only buttons (when there is no text).
  const hasText = Boolean(
    children !== undefined &&
    children !== null &&
    children !== false &&
    children !== true &&
    (typeof children !== "string" || children.trim().length > 0)
  );

  const sizeClass = size ? `button--${size}` : "";
  const loadingClass = loading ? "button--loading" : "";

  return (
    <button
      type={type}
      className={`button button--${variant} ${sizeClass} ${loadingClass} ${className}`.trim()}
      onClick={loading || disabled ? undefined : onClick}
      disabled={disabled || loading}
      style={style}
      aria-label={ariaLabel}
      aria-busy={loading ? "true" : undefined}
      title={title}
    >
      {loading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : (
        icon && !hasText && <Icon name={icon} size={16} />
      )}
      {children}
    </button>
  );
}
