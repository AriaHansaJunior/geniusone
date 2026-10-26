import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GeniusOne ErrorBoundary caught an error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            background: "#ffffff",
            borderRadius: "var(--radius-sm, 6px)",
            border: "1px solid var(--line, #e2e8f0)",
            margin: "20px auto",
            maxWidth: "600px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="alertTriangle" size={24} />
          </div>
          <div>
            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--ink, #0f172a)",
              }}
            >
              {this.props.fallbackTitle || "An unexpected view error occurred"}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "var(--muted, #64748b)",
                maxWidth: "440px",
              }}
            >
              The application encountered an unexpected issue while rendering this section.
              You can reload the view or reset your filters.
            </p>
          </div>
          <Button variant="primary" onClick={this.handleReset}>
            Reload View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
