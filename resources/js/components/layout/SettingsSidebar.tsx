import React from "react";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { useAuthPermission } from "../../context/AuthPermissionContext";
import { useTheme } from "../../context/ThemeContext";
import { resolveSettingsPath } from "../appRoutes";
import type { IconName, SettingsTab } from "../../types";

interface SettingsSidebarItem {
  tab: SettingsTab;
  label: string;
  icon: IconName;
  group: "Governance" | "Preferences";
  superAdminOnly?: boolean;
}

const SETTINGS_MENU_ITEMS: SettingsSidebarItem[] = [
  {
    tab: "user-permissions",
    label: "User Permission",
    icon: "lock",
    group: "Governance",
    superAdminOnly: true,
  },
  {
    tab: "audit-logs",
    label: "Audit Log",
    icon: "history",
    group: "Governance",
    superAdminOnly: true,
  },
  {
    tab: "edit-profile",
    label: "Edit Profile",
    icon: "user",
    group: "Preferences",
  },
  {
    tab: "system-theme",
    label: "System Theme",
    icon: "settings",
    group: "Preferences",
  },
];

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  onExitSettings: () => void;
  collapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function SettingsSidebar({
  activeTab,
  onSelectTab,
  onExitSettings,
  collapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}: SettingsSidebarProps) {
  const { isSuperAdmin } = useAuthPermission();
  const { theme } = useTheme();
  const effectiveCollapsed = collapsed && !isMobileOpen;

  const visibleItems = SETTINGS_MENU_ITEMS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  const governanceItems = visibleItems.filter((item) => item.group === "Governance");
  const preferenceItems = visibleItems.filter((item) => item.group === "Preferences");

  const renderNavItem = (item: SettingsSidebarItem) => {
    const isActive = activeTab === item.tab;
    const href = resolveSettingsPath(item.tab, theme);

    return (
      <div key={item.tab} className="sidebar-nav-item-wrapper">
        <a
          href={href}
          className={`sidebar-nav-item settings-sidebar__nav-link ${isActive ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onSelectTab(item.tab);
            onCloseMobile?.();
          }}
          aria-current={isActive ? "page" : undefined}
          title={effectiveCollapsed ? item.label : undefined}
        >
          <Icon name={item.icon} size={18} className="sidebar-nav-icon" />
          {!effectiveCollapsed && <span className="sidebar-nav-text">{item.label}</span>}
        </a>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`sidebar ${effectiveCollapsed ? "sidebar--collapsed" : ""} ${
          isMobileOpen ? "sidebar--mobile-open" : ""
        }`}
        aria-label="Settings Navigation"
      >
        <div className="sidebar__top">
          {!effectiveCollapsed && (
            <div className="sidebar__header">
              <span className="nav-label">SETTINGS MENU</span>
            </div>
          )}

          <nav className="sidebar-nav-scroll" aria-label="Settings Sections">
            {governanceItems.length > 0 && (
              <>
                {!effectiveCollapsed && (
                  <div className="settings-sidebar__group-label">
                    <span className="nav-label">ADMINISTRATION</span>
                  </div>
                )}
                {governanceItems.map(renderNavItem)}
              </>
            )}

            {!effectiveCollapsed && (
              <div className="settings-sidebar__group-label">
                <span className="nav-label">PREFERENCES</span>
              </div>
            )}
            {preferenceItems.map(renderNavItem)}
          </nav>
        </div>

        <div className="settings-sidebar__footer">
          {effectiveCollapsed ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="arrowLeft"
              className="settings-sidebar__back-btn"
              aria-label="Back to Application"
              title="Back to Application"
              onClick={() => {
                onCloseMobile?.();
                onExitSettings();
              }}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="settings-sidebar__back-btn"
              onClick={() => {
                onCloseMobile?.();
                onExitSettings();
              }}
            >
              Back to Dashboard
            </Button>
          )}
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
    </>
  );
}
