import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../ui/Icon";
import { navigationConfig, type NavSection, type NavGroupItem, type NavLeafItem } from "../../config/navigation";
import type { PageKey } from "../../types";
import { useAuthPermission } from "../../context/AuthPermissionContext";

const STORAGE_KEY_SECTIONS = "geniusone_sidebar_sections";
const STORAGE_KEY_GROUPS = "geniusone_sidebar_groups";

interface SidebarProps {
  activePage: PageKey | null;
  onNavigate: (page: PageKey, path?: string) => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const { canAccessSidebarItem } = useAuthPermission();

  const filteredNavigation = React.useMemo(() => {
    return navigationConfig
      .map((section) => {
        // Direct leaf section
        if (section.path && !section.groups && !section.directItems) {
          if (!canAccessSidebarItem(section.id)) return null;
          return section;
        }

        // Unpopulated section (e.g. production)
        if (section.isUnpopulated) {
          if (!canAccessSidebarItem(section.id)) return null;
          return section;
        }

        // Section with groups or directItems
        const visibleGroups = (section.groups || [])
          .map((group) => {
            if (group.isDirectLeaf) {
              return canAccessSidebarItem(group.id) ? group : null;
            }
            const visibleItems = (group.items || []).filter((item) => canAccessSidebarItem(item.id));
            if (visibleItems.length === 0) return null;
            return { ...group, items: visibleItems };
          })
          .filter(Boolean) as NavGroupItem[];

        const visibleDirectItems = (section.directItems || []).filter((item) =>
          canAccessSidebarItem(item.id)
        );

        if (visibleGroups.length === 0 && visibleDirectItems.length === 0) {
          return null;
        }

        return {
          ...section,
          groups: visibleGroups.length > 0 ? visibleGroups : undefined,
          directItems: visibleDirectItems.length > 0 ? visibleDirectItems : undefined,
        };
      })
      .filter(Boolean) as NavSection[];
  }, [canAccessSidebarItem]);
  // Track open state of top-level sections (e.g. procurement, exim, warehouse)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY_SECTIONS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore parse error
      }
    }
    // Default on login / dashboard: all accordion sections closed by default
    const defaults: Record<string, boolean> = {
      dashboard: false,
      procurement: false,
      exim: false,
      warehouse: false,
    };
    if (activePage && activePage !== "dashboard") {
      for (const section of navigationConfig) {
        if (
          section.directItems?.some((i) => i.id === activePage) ||
          section.groups?.some((g) => g.id === activePage || g.items.some((i) => i.id === activePage))
        ) {
          defaults[section.id] = true;
          break;
        }
      }
    }
    return defaults;
  });

  // Track open state of subgroups (e.g. purchase-master, transactions, reports, exim-master, incoming)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY_GROUPS);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore parse error
      }
    }
    // Default on login / dashboard: all subgroups closed
    const defaults: Record<string, boolean> = {
      "purchase-master": false,
      transactions: false,
      "procurement-reports": false,
      "exim-master": false,
      "warehouse-master": false,
      "warehouse-incoming": false,
      "warehouse-adjustment": false,
      "warehouse-outcoming": false,
      "warehouse-request": false,
      "warehouse-report": false,
    };
    if (activePage && activePage !== "dashboard") {
      for (const section of navigationConfig) {
        if (section.groups) {
          for (const group of section.groups) {
            if (group.id === activePage || group.items.some((i) => i.id === activePage)) {
              if (!group.isDirectLeaf) {
                defaults[group.id] = true;
              }
              break;
            }
          }
        }
      }
    }
    return defaults;
  });

  // Persist top-level section state in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(openSections));
      } catch {
        // ignore
      }
    }
  }, [openSections]);

  // Persist subgroup state in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(openGroups));
      } catch {
        // ignore
      }
    }
  }, [openGroups]);

  // Floating tooltip for collapsed mode
  const [hoveredNav, setHoveredNav] = useState<{ label: string; top: number } | null>(null);

  // Automatically dismiss tooltip on navigation or collapse transition
  useEffect(() => {
    setHoveredNav(null);
  }, [activePage, collapsed]);

  // Global dismissal on scroll, window blur, or document-level escape
  useEffect(() => {
    const dismissTooltip = () => setHoveredNav(null);
    window.addEventListener("scroll", dismissTooltip, { passive: true });
    window.addEventListener("blur", dismissTooltip);
    window.addEventListener("resize", dismissTooltip, { passive: true });
    return () => {
      window.removeEventListener("scroll", dismissTooltip);
      window.removeEventListener("blur", dismissTooltip);
      window.removeEventListener("resize", dismissTooltip);
    };
  }, []);

  // Preserve user's saved session state on initial mount/refresh.
  // Only auto-expand parent section and subgroup when user navigates between pages.
  const isFirstMountRef = useRef(true);
  const prevActivePageRef = useRef<PageKey | null>(activePage);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (!activePage || activePage === "dashboard") {
      prevActivePageRef.current = activePage;
      return;
    }

    if (prevActivePageRef.current !== activePage) {
      prevActivePageRef.current = activePage;

      for (const section of navigationConfig) {
        // Check direct items
        if (section.path && activePage === section.id) {
          return;
        }
        if (section.directItems?.some((item) => item.id === activePage)) {
          setOpenSections((prev) => ({ ...prev, [section.id]: true }));
          return;
        }
        // Check nested groups
        if (section.groups) {
          for (const group of section.groups) {
            if (group.id === activePage || group.items.some((item) => item.id === activePage)) {
              setOpenSections((prev) => ({ ...prev, [section.id]: true }));
              if (!group.isDirectLeaf) {
                setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
              }
              return;
            }
          }
        }
      }
    }
  }, [activePage]);

  const toggleSection = (sectionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHoveredNav(null);
    if (collapsed) {
      onToggleCollapse?.();
      setOpenSections((prev) => ({ ...prev, [sectionId]: true }));
      return;
    }
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleGroup = (groupId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHoveredNav(null);
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleMouseEnter = (label: string, e: React.MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredNav({
      label,
      top: rect.top + rect.height / 2,
    });
  };

  const handleMouseLeave = () => {
    setHoveredNav(null);
  };

  const isSectionActive = (section: NavSection): boolean => {
    if (section.path && activePage === section.id) return true;
    if (section.directItems?.some((item) => item.id === activePage)) return true;
    if (section.groups?.some((group) => group.id === activePage || group.items.some((item) => item.id === activePage))) return true;
    return false;
  };

  return (
    <>
      <aside
        className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
          isMobileOpen ? "sidebar--mobile-open" : ""
        }`}
        aria-label="Main Navigation"
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar__top">
          {!collapsed && (
            <div className="sidebar__header">
              <span className="nav-label">ENTERPRISE NAVIGATION</span>
            </div>
          )}

          {/* Independent Vertical Scroll Area */}
          <nav className="sidebar-nav-scroll">
            {filteredNavigation.map((section) => {
              const hasSubmenu = Boolean(
                (section.groups && section.groups.length > 0) ||
                (section.directItems && section.directItems.length > 0)
              );
              const isSectionOpen = Boolean(openSections[section.id]);
              const sectionActive = isSectionActive(section);

              // 1. Direct Leaf Section (e.g. Dashboard)
              if (!hasSubmenu && !section.isUnpopulated) {
                const isActive = activePage === section.id;
                return (
                  <div key={section.id} className="sidebar-nav-item-wrapper">
                    <button
                      type="button"
                      className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        setHoveredNav(null);
                        onNavigate(section.id as PageKey, section.path);
                        onCloseMobile?.();
                      }}
                      onMouseEnter={(e) => handleMouseEnter(section.label, e)}
                      onMouseLeave={handleMouseLeave}
                      onPointerLeave={handleMouseLeave}
                      onBlur={handleMouseLeave}
                      aria-label={section.label}
                    >
                      <Icon name={section.icon} size={18} className="sidebar-nav-icon" />
                      {!collapsed && (
                        <span className="sidebar-nav-text">{section.label}</span>
                      )}
                    </button>
                  </div>
                );
              }

              // 2. Unpopulated Section (e.g. Production)
              if (section.isUnpopulated) {
                return (
                  <div key={section.id} className="sidebar-nav-item-wrapper">
                    <button
                      type="button"
                      className="sidebar-nav-item sidebar-nav-item--parent sidebar-nav-item--unpopulated"
                      onClick={(e) => toggleSection(section.id, e)}
                      onMouseEnter={(e) => handleMouseEnter(section.label, e)}
                      onMouseLeave={handleMouseLeave}
                      onPointerLeave={handleMouseLeave}
                      onBlur={handleMouseLeave}
                      aria-label={`${section.label} (Pending Specifications)`}
                      title={collapsed ? section.label : undefined}
                    >
                      <Icon name={section.icon} size={18} className="sidebar-nav-icon" />
                      {!collapsed && (
                        <>
                          <span className="sidebar-nav-text">{section.label}</span>
                          <span className="sidebar-nav-tag">Pending</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              }

              // 3. Expandable Parent Section (e.g. Procurement, Exim, Warehouse)
              return (
                <div key={section.id} className="sidebar-section-container">
                  <button
                    type="button"
                    className={`sidebar-nav-item sidebar-nav-item--parent ${
                      sectionActive ? "parent-active" : ""
                    } ${isSectionOpen && !collapsed ? "parent-expanded" : ""}`}
                    onClick={(e) => toggleSection(section.id, e)}
                    onMouseEnter={(e) => handleMouseEnter(section.label, e)}
                    onMouseLeave={handleMouseLeave}
                    onPointerLeave={handleMouseLeave}
                    onBlur={handleMouseLeave}
                    aria-expanded={isSectionOpen}
                    aria-label={section.label}
                  >
                    <Icon name={section.icon} size={18} className="sidebar-nav-icon" />
                    {!collapsed && (
                      <>
                        <span className="sidebar-nav-text">{section.label}</span>
                        <Icon
                          name="chevronDown"
                          size={14}
                          className={`sidebar-chevron ${
                            isSectionOpen ? "sidebar-chevron--open" : ""
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {/* Submenu Accordion Panel */}
                  {!collapsed && isSectionOpen && (
                    <div className="sidebar-submenu-panel">
                      {/* Nested Groups (e.g. Purchase Master, Transactions, Reports) */}
                      {section.groups?.map((group) => {
                        const isGroupOpen = Boolean(openGroups[group.id]);
                        const isPlaceholder = Boolean(group.isExpandablePlaceholder);

                        return (
                          <div key={group.id} className="sidebar-subgroup-container">
                            {group.sectionHeader && (
                              <div className="sidebar-group-divider-label">
                                {group.sectionHeader}
                              </div>
                            )}

                            {group.isDirectLeaf ? (
                              <button
                                type="button"
                                className={`sidebar-subgroup-header sidebar-subgroup-header--direct ${
                                  activePage === group.id ? "active" : ""
                                } ${
                                  group.isPlaceholder ? "subgroup-placeholder" : ""
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!group.isPlaceholder && group.path) {
                                    onNavigate(group.id as PageKey, group.path);
                                  }
                                }}
                                disabled={group.isPlaceholder}
                                title={group.label}
                              >
                                <span className="sidebar-subgroup-title">
                                  {group.label}
                                </span>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={`sidebar-subgroup-header ${
                                    isGroupOpen ? "subgroup-open" : ""
                                  } ${isPlaceholder ? "subgroup-placeholder" : ""}`}
                                  onClick={(e) => toggleGroup(group.id, e)}
                                >
                                  <span className="sidebar-subgroup-title">
                                    {group.label}
                                  </span>
                                  <Icon
                                    name="chevronDown"
                                    size={12}
                                    className={`sidebar-chevron-sm ${
                                      isGroupOpen ? "sidebar-chevron--open" : ""
                                    }`}
                                  />
                                </button>

                                {isGroupOpen && (
                                  <div className="sidebar-subgroup-items">
                                    {group.items.length === 0 ? (
                                      <div className="sidebar-placeholder-hint">
                                        No items configured
                                      </div>
                                    ) : (
                                      group.items.map((leaf) => {
                                        const isLeafActive = activePage === leaf.id;
                                        return (
                                          <button
                                            type="button"
                                            key={leaf.id}
                                            className={`sidebar-leaf-item ${
                                              isLeafActive ? "active" : ""
                                            } ${leaf.isPlaceholder ? "leaf-placeholder" : ""}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (!leaf.isPlaceholder) {
                                                onNavigate(leaf.id as PageKey, leaf.path);
                                                onCloseMobile?.();
                                              }
                                            }}
                                            disabled={leaf.isPlaceholder}
                                            title={leaf.label}
                                          >
                                            <span className="sidebar-leaf-dot" />
                                            <span className="sidebar-leaf-text">
                                              {leaf.label}
                                            </span>
                                            {leaf.badge && (
                                              <small className="sidebar-leaf-badge">
                                                {leaf.badge}
                                              </small>
                                            )}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Direct Items under Section (e.g. Receive Note, Document History) */}
                      {section.directItems?.map((leaf) => {
                        const isLeafActive = activePage === leaf.id;
                        return (
                          <button
                            type="button"
                            key={leaf.id}
                            className={`sidebar-leaf-item sidebar-leaf-item--direct ${
                              isLeafActive ? "active" : ""
                            } ${leaf.isPlaceholder ? "leaf-placeholder" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!leaf.isPlaceholder) {
                                onNavigate(leaf.id as PageKey, leaf.path);
                                onCloseMobile?.();
                              }
                            }}
                            disabled={leaf.isPlaceholder}
                            title={leaf.label}
                          >
                            <span className="sidebar-leaf-dot" />
                            <span className="sidebar-leaf-text">{leaf.label}</span>
                            {leaf.badge && (
                              <small className="sidebar-leaf-badge">{leaf.badge}</small>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Application Version */}
        <div className="sidebar__bottom">
          <div className="sidebar__version">
            {!collapsed ? (
              <>
                <strong>GENIUSONE</strong>
                <span>v2.0</span>
              </>
            ) : (
              <span>v2.0</span>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Floating Tooltip in Collapsed Sidebar Mode */}
      {collapsed && hoveredNav && (
        <div
          className="sidebar-floating-tooltip"
          style={{ top: `${hoveredNav.top}px` }}
          role="tooltip"
        >
          {hoveredNav.label}
        </div>
      )}
    </>
  );
}

export default Sidebar;
