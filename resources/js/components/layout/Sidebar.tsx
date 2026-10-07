import { useState } from "react";
import { Icon } from "../ui/Icon";
import { navigation } from "../../data/mockData";
import type { PageKey } from "../../types";

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
}

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
}: SidebarProps) {
  const [hoveredNav, setHoveredNav] = useState<{ label: string; top: number } | null>(null);

  const handleMouseEnter = (label: string, e: React.MouseEvent<HTMLButtonElement>) => {
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

  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar__top">
          {!collapsed && (
            <div className="sidebar__header">
              <span className="nav-label">OPERATIONS</span>
            </div>
          )}

          <nav>
            {navigation.map((item) => (
              <button
                type="button"
                key={item.key}
                className={activePage === item.key ? "active" : ""}
                onClick={() => onNavigate(item.key)}
                onMouseEnter={(e) => handleMouseEnter(item.label, e)}
                onMouseLeave={handleMouseLeave}
                aria-label={item.label}
              >
                <Icon name={item.icon} size={18} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.key === "report" && <small>1,284</small>}
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

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

      {/* Floating Tooltip beside Collapsed Sidebar */}
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
