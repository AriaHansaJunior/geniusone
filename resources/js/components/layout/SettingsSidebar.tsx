import React, { useState, useEffect } from "react";
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
  const { theme, isDefaultTheme } = useTheme();
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobileViewport(mq.matches);
    handleChange();
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const isMobileFloatingDock = !isDefaultTheme && isMobileViewport;
  const effectiveCollapsed = collapsed && !isMobileOpen && !isMobileFloatingDock;

  const visibleItems = SETTINGS_MENU_ITEMS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  const governanceItems = visibleItems.filter((item) => item.group === "Governance");
  const preferenceItems = visibleItems.filter((item) => item.group === "Preferences");

  const getShortDockLabel = (label: string) => {
    if (label === "User Permission") return "Permission";
    if (label === "Edit Profile") return "Profile";
    if (label === "System Theme") return "Theme";
    return label;
  };

  const renderNavItem = (item: SettingsSidebarItem) => {
    const isActive = activeTab === item.tab;
    const href = resolveSettingsPath(item.tab, theme);
    const displayLabel = isMobileFloatingDock ? getShortDockLabel(item.label) : item.label;

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
          {!effectiveCollapsed && <span className="sidebar-nav-text">{displayLabel}</span>}
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

            <div className="sidebar-nav-item-wrapper settings-sidebar__mobile-back">
              <a
                href={theme === "default" ? "/default/dashboard" : "/dashboard"}
                className="sidebar-nav-item settings-sidebar__nav-link"
                onClick={(e) => {
                  e.preventDefault();
                  onCloseMobile?.();
                  onExitSettings();
                }}
              >
                <Icon name="arrowLeft" size={18} className="sidebar-nav-icon" />
                <span className="sidebar-nav-text">Back</span>
              </a>
            </div>
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
