import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface ButtonProps {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warning" | "success" | "excel";
  icon?: IconName;
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
  icon,
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

  return (
    <button
      type={type}
      className={`button button--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      aria-label={ariaLabel}
      title={title}
    >
      {icon && !hasText && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
