import React from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";

interface NotFoundPageProps {
  path?: string;
  onGoHome: () => void;
}

export function NotFoundPage({ path, onGoHome }: NotFoundPageProps) {
  return (
    <div className="placeholder-module-card" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <div className="placeholder-empty-state">
        <div className="placeholder-empty-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <Icon name="alertTriangle" size={32} />
        </div>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
          404 Not Found
        </div>
        <h2 className="placeholder-empty-title">Page Not Found</h2>
        <p className="placeholder-empty-desc">
          {path ? (
            <>
              The requested address <code style={{ background: "var(--canvas-alt)", padding: "2px 6px", borderRadius: "4px" }}>{path}</code> does not exist on this server.
            </>
          ) : (
            "The requested page or resource could not be found. Please check the URL or return to the dashboard."
          )}
        </p>
        <div style={{ marginTop: "20px" }}>
          <Button variant="primary" icon="home" onClick={onGoHome}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
