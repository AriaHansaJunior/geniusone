import React from "react";
import { Icon } from "../../components/ui/Icon";
import type { IconName } from "../../types";

interface PlaceholderPageProps {
  eyebrow?: string;
  title: string;
  category?: string;
  icon?: IconName;
}

export function PlaceholderPage({
  title,
  icon = "file",
}: PlaceholderPageProps) {
  return (
    <div className="placeholder-module-card">
      <div className="placeholder-empty-state">
        <div className="placeholder-empty-icon">
          <Icon name={icon} size={32} />
        </div>
        <h2 className="placeholder-empty-title">{title}</h2>
        <p className="placeholder-empty-desc">
          This module is ready for detailed interface specifications and screen workflows in the next phase.
        </p>
        <div className="placeholder-empty-badge">
          <span>Pending Screen References</span>
        </div>
      </div>
    </div>
  );
}

export default PlaceholderPage;
