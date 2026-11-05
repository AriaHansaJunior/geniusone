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
  // Respect GeniusOne design rules: "The Add New button must display only one plus icon."
  // If icon is provided, render it. If children is "Add New" without an explicit icon, default to "plus".
  const isAddNewText =
    typeof children === "string" && children.trim().toLowerCase() === "add new";
  const resolvedIcon = icon || (isAddNewText ? ("plus" as IconName) : undefined);

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
