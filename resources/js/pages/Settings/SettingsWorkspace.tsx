import React from "react";
import { useAuthPermission } from "../../context/AuthPermissionContext";
import { EditProfile } from "../Auth/EditProfile";
import { UserPermissionAdmin } from "../Admin/UserPermissionAdmin";
import { AuditLogAdmin } from "../Admin/AuditLogAdmin";
import { SystemThemeSettings } from "./SystemThemeSettings";
import { Button } from "../../components/ui/Button";
import type { SettingsTab } from "../../types";

interface SettingsWorkspaceProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  onExitSettings: () => void;
}

export function SettingsWorkspace({
  activeTab,
  onSelectTab,
  onExitSettings,
}: SettingsWorkspaceProps) {
  const { isSuperAdmin } = useAuthPermission();

  if ((activeTab === "user-permissions" || activeTab === "audit-logs") && !isSuperAdmin) {
    return (
      <div className="master-page-shell">
        <div className="route-guard-card">
          <h2 className="route-guard-card__title">Access Restricted</h2>
          <p className="route-guard-card__desc">
            User Permission and System Audit Logs are restricted to Super Administrator accounts.
          </p>
          <div className="master-actions-group">
            <Button
              type="button"
              variant="primary"
              onClick={() => onSelectTab("edit-profile")}
            >
              Go to Edit Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const mobileTabs: Array<{ tab: SettingsTab; label: string; adminOnly?: boolean }> = [
    { tab: "user-permissions", label: "User Permission", adminOnly: true },
    { tab: "audit-logs", label: "Audit Log", adminOnly: true },
    { tab: "edit-profile", label: "Edit Profile" },
    { tab: "system-theme", label: "System Theme" },
  ];

  return (
    <div className="settings-workspace">
      <div className="settings-mobile-nav" aria-label="Mobile Settings Menu">
        {mobileTabs
          .filter((item) => !item.adminOnly || isSuperAdmin)
          .map((item) => (
            <Button
              key={item.tab}
              type="button"
              variant={activeTab === item.tab ? "primary" : "outline"}
              size="sm"
              className="settings-mobile-nav__btn"
              onClick={() => onSelectTab(item.tab)}
            >
              {item.label}
            </Button>
          ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="settings-mobile-nav__btn"
          onClick={onExitSettings}
        >
          Back
        </Button>
      </div>

      {activeTab === "user-permissions" && isSuperAdmin && (
        <UserPermissionAdmin onNavigateAudit={() => onSelectTab("audit-logs")} />
      )}

      {activeTab === "audit-logs" && isSuperAdmin && (
        <AuditLogAdmin onNavigateUsers={() => onSelectTab("user-permissions")} />
      )}

      {activeTab === "edit-profile" && (
        <EditProfile onBack={onExitSettings} onSaveConfirmed={onExitSettings} />
      )}

      {activeTab === "system-theme" && <SystemThemeSettings />}
    </div>
  );
}
