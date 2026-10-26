import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { Button } from "../ui/Button";
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
                <p>{meta.description}</p>
              </div>
              {(activePage === "pr" || activePage === "po" || activePage === "report" || activePage === "warehouse") && (
                <div className="page-header__actions">
                  <Button variant="secondary" icon="print">
                    Print view
                  </Button>
                  <Button variant="ghost" icon="more">
                    Actions
                  </Button>
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
