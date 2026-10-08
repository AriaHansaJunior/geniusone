import { Icon } from "../ui/Icon";
import { FluidWaveHeader } from "./FluidWaveHeader";

interface HeaderProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Header({ collapsed = false, onToggleCollapse }: HeaderProps) {
  return (
    <header className="topbar">
      {/* Dynamic Fluid Wave Canvas (Seamless Infinity Loop & Wall Reflection) */}
      <FluidWaveHeader />

      <div className={`brand ${collapsed ? "brand--collapsed" : ""}`}>
        <div
          className="brand__mark"
          onClick={collapsed ? onToggleCollapse : undefined}
          title={collapsed ? "Expand sidebar" : undefined}
          role={collapsed ? "button" : undefined}
          tabIndex={collapsed ? 0 : undefined}
        >
          <span />
          <span />
          <span />
        </div>

        {!collapsed && (
          <div className="brand__text">
            <strong>GENIUSONE</strong>
            <span>Enterprise Operations</span>
          </div>
        )}

        {!collapsed && onToggleCollapse && (
          <button
            type="button"
            className="brand__toggle"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <Icon name="arrowLeft" size={14} />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button
          type="button"
          className="topbar__expand-toggle"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <Icon name="arrowRight" size={14} />
        </button>
      )}

      <div className="topbar__context">
        <span>PT GENIUS MANUFACTURING</span>
      </div>

      <div className="topbar__actions">
       
        <button type="button" aria-label="Settings">
          <Icon name="settings" size={17} />
        </button>
        <div className="user">
          <span>RA</span>
          <div>
            <strong>Rizky Aditya</strong>
            <small>Procurement Manager</small>
          </div>
          <Icon name="chevron" size={13} />
        </div>
      </div>
    </header>
  );
}
