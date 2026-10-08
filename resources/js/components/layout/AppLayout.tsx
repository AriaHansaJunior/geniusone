import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { Button } from "../ui/Button";
import { pageMeta } from "../../data/mockData";
import type { PageKey } from "../../types";

interface AppLayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  hideDefaultHeader?: boolean;
  children: ReactNode;
}

export function AppLayout({
  activePage,
  onNavigate,
  hideDefaultHeader = false,
  children,
}: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = pageMeta[activePage] || pageMeta.report;

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      {/* Topbar Header with Logo and Collapse Toggle */}
      <Header
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Workspace */}
      <div className="workspace">
        {/* Collapsible Sidebar */}
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
          collapsed={collapsed}
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
              <div className="page-header__actions">
                <Button variant="secondary" icon="print">
                  Print view
                </Button>
                <Button variant="ghost" icon="more">
                  Actions
                </Button>
              </div>
            </div>
          )}

          {/* Module Content */}
          <div className="content">{children}</div>

          {/* Shared Application Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
