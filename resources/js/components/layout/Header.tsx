import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon";

interface HeaderProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigateProfile?: () => void;
  onLogoutRequest?: () => void;
  onToggleMobileSidebar?: () => void;
}

export function Header({
  collapsed = false,
  onToggleCollapse,
  onNavigateProfile,
  onLogoutRequest,
  onToggleMobileSidebar,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="topbar">
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
          <span>RA</span>
          <div>
            <strong>Rizky Aditya</strong>
            <small>Procurement Manager</small>
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
                <div className="user-dropdown__avatar">RA</div>
                <div className="user-dropdown__info">
                  <strong>Rizky Aditya</strong>
                  <span className="user-dropdown__role">Procurement Manager</span>
                  <span className="user-dropdown__email">rizky.aditya@geniusone.com</span>
                </div>
              </div>

              <div className="user-dropdown__divider" />

              <div className="user-dropdown__menu">
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
