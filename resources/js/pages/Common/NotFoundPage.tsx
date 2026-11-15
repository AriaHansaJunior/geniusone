import React from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";

interface NotFoundPageProps {
  path?: string;
  onGoHome: () => void;
}

export function NotFoundPage({ path, onGoHome }: NotFoundPageProps) {
  return (
    <div className="placeholder-module-card placeholder-module-card--full">
      <div className="placeholder-empty-state">
        <div className="placeholder-empty-icon placeholder-empty-icon--danger">
          <Icon name="alertTriangle" size={32} />
        </div>
        <div className="notfound-kicker">
          404 Not Found
        </div>
        <h2 className="placeholder-empty-title">Page Not Found</h2>
        <p className="placeholder-empty-desc">
          {path ? (
            <>
              The requested address <code className="notfound-path-code">{path}</code> does not exist on this server.
            </>
          ) : (
            "The requested page or resource could not be found. Please check the URL or return to the dashboard."
          )}
        </p>
        <div className="notfound-actions">
          <Button variant="primary" icon="home" onClick={onGoHome}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
