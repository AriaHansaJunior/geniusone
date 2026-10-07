import type { ReactNode } from "react";

export type BadgeTone = "blue" | "green" | "orange" | "red" | "gray" | "purple";

export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" />
      {children}
    </span>
  );
}
