import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { useAuthPermission } from "../../context/AuthPermissionContext";

interface HeaderProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigateProfile?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateAudit?: () => void;
  onLogoutRequest?: () => void;
  onToggleMobileSidebar?: () => void;
}

export function Header({
  collapsed = false,
  onToggleCollapse,
  onNavigateProfile,
  onNavigateAdmin,
  onNavigateAudit,
  onLogoutRequest,
  onToggleMobileSidebar,
}: HeaderProps) {
  const { currentUser, isSuperAdmin } = useAuthPermission();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "US";

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleEditProfile = () => {
    setIsDropdownOpen(false);
    onNavigateProfile?.();
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogoutRequest?.();
  };

  // Synchronize CSS animation start phase with system epoch time
  // so page navigation or full page reloads seamlessly maintain the continuous flowing gradient
  const [flowPhase1] = useState(() => {
    const cycle = 46; // 46-second primary slow stream
    const sec = (Date.now() / 1000) % cycle;
    return -Number(sec.toFixed(3));
  });

  const [flowPhase2] = useState(() => {
    const cycle = 34; // 34-second secondary gentle sheen stream
    const sec = (Date.now() / 1000) % cycle;
    return -Number(sec.toFixed(3));
  });

  const [flowEdgePhase] = useState(() => {
    const cycle = 24; // 24-second luminous edge stream
    const sec = (Date.now() / 1000) % cycle;
    return -Number(sec.toFixed(3));
  });

  return (
    <header className="topbar">
      {/* Dynamic Ambient Infinite Stream Layer (Seamless Zero-Cut Flow) */}
      <div
        className="topbar__ambient"
        aria-hidden="true"
        style={
          {
            "--flow-phase-1": `${flowPhase1}s`,
            "--flow-phase-2": `${flowPhase2}s`,
            "--flow-edge-phase": `${flowEdgePhase}s`,
          } as React.CSSProperties
        }
      >
        {/* Primary Aurora Stream (Continuous dual-track translateX 0 -> -50%) */}
        <div className="topbar__stream topbar__stream--primary">
          <div className="topbar__stream-track topbar__stream-track--slow">
            <div className="topbar__stream-segment" />
            <div className="topbar__stream-segment" />
          </div>
        </div>

        {/* Secondary Gentle Sheen (Continuous counter stream translateX -50% -> 0) */}
        <div className="topbar__stream topbar__stream--secondary">
          <div className="topbar__stream-track topbar__stream-track--medium">
            <div className="topbar__stream-segment topbar__stream-segment--secondary" />
            <div className="topbar__stream-segment topbar__stream-segment--secondary" />
          </div>
        </div>

        {/* High-Clarity Frosted Glass Veil */}
        <div className="topbar__glass" />

        {/* Delicate Luminous Bottom Border Edge */}
        <div className="topbar__edge">
          <div className="topbar__edge-track">
            <div className="topbar__edge-segment" />
            <div className="topbar__edge-segment" />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Hamburger Button */}
      {onToggleMobileSidebar && (
        <button
          type="button"
          className="topbar__mobile-toggle"
          onClick={onToggleMobileSidebar}
          aria-label="Open navigation menu"
          title="Open navigation menu"
        >
          <span className="topbar__hamburger-bar" />
          <span className="topbar__hamburger-bar" />
          <span className="topbar__hamburger-bar" />
        </button>
      )}

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
        <span className="topbar__status-dot" aria-hidden="true" />
        <span>PT GENIUS ONE</span>
      </div>

      <div className="topbar__actions">
        <button type="button" aria-label="Settings" title="Settings">
          <Icon name="settings" size={17} />
        </button>

        <div
          ref={userMenuRef}
          className={`user ${isDropdownOpen ? "user--active" : ""}`}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          aria-label="User profile menu"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsDropdownOpen((prev) => !prev);
            }
          }}
        >
          <span>{initials}</span>
          <div>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </div>
          <Icon
            name="chevronDown"
            size={12}
            className={`user__chevron ${isDropdownOpen ? "user__chevron--open" : ""}`}
          />

          {/* User Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="user-dropdown"
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="User options"
            >
              <div className="user-dropdown__header">
                <div className="user-dropdown__avatar">{initials}</div>
                <div className="user-dropdown__info">
                  <strong>{currentUser.name}</strong>
                  <span className="user-dropdown__role">{currentUser.role}</span>
                  <span className="user-dropdown__email">{currentUser.email}</span>
                </div>
              </div>

              <div className="user-dropdown__divider" />

              <div className="user-dropdown__menu">
                {isSuperAdmin && onNavigateAdmin && (
                  <button
                    type="button"
                    className="user-dropdown__item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onNavigateAdmin();
                    }}
                    role="menuitem"
                  >
                    <Icon name="lock" size={15} />
                    <span>User & Permission Admin</span>
                  </button>
                )}

                {isSuperAdmin && onNavigateAudit && (
                  <button
                    type="button"
                    className="user-dropdown__item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      onNavigateAudit();
                    }}
                    role="menuitem"
                  >
                    <Icon name="history" size={15} />
                    <span>System Audit Logs</span>
                  </button>
                )}

                <button
                  type="button"
                  className="user-dropdown__item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProfile();
                  }}
                  role="menuitem"
                >
                  <Icon name="user" size={15} />
                  <span>Edit Profile</span>
                </button>

                <div className="user-dropdown__divider" />

                <button
                  type="button"
                  className="user-dropdown__item user-dropdown__item--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  role="menuitem"
                >
                  <Icon name="logOut" size={15} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
