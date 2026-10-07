import type { ReactNode } from "react";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { navigation, pageMeta } from "../../data/mockData";
import type { PageKey } from "../../types";

interface AppShellProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const meta = pageMeta[activePage];

  return (
    <div className="app-shell">
      {/* Topbar Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>GeniusOne</strong>
            <span>Enterprise Operations</span>
          </div>
        </div>

        <div className="topbar__context">
          <span>PT GENIUS MANUFACTURING</span>
          <i />
          <span>Head Office</span>
        </div>

        <div className="topbar__actions">
          <button type="button" aria-label="Back">
            <Icon name="arrowLeft" size={17} />
          </button>
          <button type="button" aria-label="Forward">
            <Icon name="arrowRight" size={17} />
          </button>
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

      {/* Main Workspace */}
      <div className="workspace">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav>
            <span className="nav-label">OPERATIONS</span>
            {navigation.slice(0, 4).map((item) => (
              <button
                type="button"
                key={item.key}
                className={activePage === item.key ? "active" : ""}
                onClick={() => onNavigate(item.key)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.key === "report" && <small>1,284</small>}
              </button>
            ))}

            <span className="nav-label nav-label--second">SYSTEM</span>
            {navigation.slice(4).map((item) => (
              <button
                type="button"
                key={item.key}
                className={activePage === item.key ? "active" : ""}
                onClick={() => onNavigate(item.key)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar__help">
            <div>
              <Icon name="layers" />
            </div>
            <strong>Design foundation</strong>
            <span>Session 1 · Visual source of truth</span>
          </div>

          <div className="sidebar__version">
            GENIUSONE <span>v1.0</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main>
          {/* Page Header */}
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

          {/* Module Content */}
          <div className="content">{children}</div>

          {/* Shared Footer */}
          <footer>
            <span>© 2025 GeniusOne Enterprise System</span>
            <div>
              <span>Data updated just now</span>
              <i />
              <span>System operational</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
