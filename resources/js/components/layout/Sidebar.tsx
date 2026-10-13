import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { navigationConfig, type NavSection, type NavGroupItem, type NavLeafItem } from "../../config/navigation";
import type { PageKey } from "../../types";

interface SidebarProps {
  activePage: PageKey | null;
  onNavigate: (page: PageKey, path?: string) => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  // Track open state of top-level sections (e.g. procurement, exim, warehouse)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    procurement: true,
    exim: false,
    warehouse: false,
  });

  // Track open state of subgroups (e.g. purchase-master, transactions, reports, exim-master, incoming)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "purchase-master": false,
    transactions: true,
    "procurement-reports": false,
    "exim-master": true,
    "warehouse-master": true,
    "warehouse-incoming": true,
  });

  // Floating tooltip for collapsed mode
  const [hoveredNav, setHoveredNav] = useState<{ label: string; top: number } | null>(null);

  // Automatically expand parent section and subgroup when activePage changes
  useEffect(() => {
    if (!activePage) return;

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
  }, [activePage]);

  const toggleSection = (sectionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
    if (collapsed) setHoveredNav(null);
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
        className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}
        aria-label="Main Navigation"
      >
        <div className="sidebar__top">
          {!collapsed && (
            <div className="sidebar__header">
              <span className="nav-label">ENTERPRISE NAVIGATION</span>
            </div>
          )}

          {/* Independent Vertical Scroll Area */}
          <nav className="sidebar-nav-scroll">
            {navigationConfig.map((section) => {
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
                      onClick={() => onNavigate(section.id as PageKey, section.path)}
                      onMouseEnter={(e) => handleMouseEnter(section.label, e)}
                      onMouseLeave={handleMouseLeave}
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
                <span>v1.0</span>
              </>
            ) : (
              <span>v1.0</span>
            )}
          </div>
        </div>
      </aside>

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
