import type { ReactNode } from "react";

export type BadgeTone = "blue" | "green" | "orange" | "red" | "gray" | "purple" | "cyan";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  style?: React.CSSProperties;
}

export function Badge({
  children,
  tone = "blue",
  className = "",
  style,
}: BadgeProps) {
  return (
    <span className={`badge badge--${tone} ${className}`.trim()} style={style}>
      <span className="badge__dot" />
      {children}
    </span>
  );
}
