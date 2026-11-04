import { useState, useRef, useEffect, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { pageMeta } from "../../data/mockData";
import type { PageKey } from "../../types";

interface AppLayoutProps {
  activePage: PageKey | null;
  onNavigate: (page: PageKey, path?: string) => void;
  onNavigateProfile?: () => void;
  onRequestLogout?: () => void;
  hideDefaultHeader?: boolean;
  children: ReactNode;
}

export function AppLayout({
  activePage,
  onNavigate,
  onNavigateProfile,
  onRequestLogout,
  hideDefaultHeader = false,
  children,
}: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("geniusone_sidebar_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  // Mobile off-canvas drawer state for phone screens
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("geniusone_sidebar_collapsed", String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const meta = (activePage && pageMeta[activePage]) || pageMeta.report;

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      {/* Topbar Header with Logo, Collapse Toggle, and Mobile Trigger */}
      <Header
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        onNavigateProfile={onNavigateProfile}
        onNavigateAdmin={() => onNavigate("user-permission-admin" as PageKey, "/admin/user-permissions")}
        onNavigateAudit={() => onNavigate("audit-log-admin" as PageKey, "/admin/audit-logs")}
        onLogoutRequest={onRequestLogout}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      {/* Main Workspace */}
      <div className="workspace">
        {/* Collapsible Sidebar with Mobile Drawer Support */}
        <Sidebar
          activePage={activePage}
          onNavigate={(page, path) => {
            setIsMobileSidebarOpen(false);
            onNavigate(page, path);
          }}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main>
          {/* Standard Page Header (Only for List Views) */}
          {!hideDefaultHeader && (
            <div className="page-header">
              <div>
                <span className="eyebrow">{meta.eyebrow}</span>
                <h1>{meta.title}</h1>
              </div>
              {(activePage === "pr" || activePage === "po" || activePage === "report" || activePage === "warehouse") && (
                <div className="page-header__actions">
                  <Button variant="secondary" icon="print" onClick={() => window.print()}>
                    Print view
                  </Button>
                  <div ref={actionsRef} style={{ position: "relative", display: "inline-block" }}>
                    <Button
                      variant="ghost"
                      icon="more"
                      onClick={() => setIsActionsOpen((prev) => !prev)}
                    >
                      Actions
                    </Button>
                    {isActionsOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          right: 0,
                          background: "#ffffff",
                          border: "1px solid var(--line-strong, #cbd5e1)",
                          borderRadius: "var(--radius-sm, 6px)",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                          zIndex: 100,
                          minWidth: "170px",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsOpen(false);
                            window.print();
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 14px",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--line, #e2e8f0)",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--ink, #1e293b)",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Icon name="print" size={13} style={{ color: "var(--ink-soft)" }} />
                          <span>Print Page</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsOpen(false);
                            const excelBtn = document.querySelector(".table-panel__heading .btn--excel") as HTMLButtonElement | null;
                            if (excelBtn) {
                              excelBtn.click();
                            } else {
                              window.location.reload();
                            }
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 14px",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--line, #e2e8f0)",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--ink, #1e293b)",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Icon name="download" size={13} style={{ color: "#16a34a" }} />
                          <span>Export to Excel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsActionsOpen(false);
                            window.location.reload();
                          }}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "9px 14px",
                            background: "transparent",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--ink, #1e293b)",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <Icon name="refresh" size={13} style={{ color: "#2563eb" }} />
                          <span>Refresh View</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Module Content */}
          <div className="content">{children}</div>
        </main>
      </div>

      {/* Fixed Viewport Application Footer */}
      <Footer />
    </div>
  );
}

export default AppLayout;
