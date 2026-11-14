import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface ButtonProps {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning" | "success" | "excel" | "outline";
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
  // User rule: buttons must be either pure text OR pure icon (never both)
  const hasTextChildren =
    children !== undefined &&
    children !== null &&
    children !== false &&
    !(typeof children === "string" && children.trim() === "");
  const resolvedIcon = hasTextChildren ? undefined : icon;

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
        resolvedIcon && <Icon name={resolvedIcon} size={15} />
      )}
      {children}
    </button>
  );
}
