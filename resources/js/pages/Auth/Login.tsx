import React, { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { useAuthPermission } from "../../context/AuthPermissionContext";

interface LoginProps {
  onNavigateHome?: () => void;
  onLoginSuccess?: () => void;
}

export function Login({ onNavigateHome, onLoginSuccess }: LoginProps) {
  const { loginUser } = useAuthPermission();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setStatusMessage("Please enter your username and password.");
      return;
    }
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok && data?.status === "success") {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("geniusone_sidebar_sections");
            sessionStorage.removeItem("geniusone_sidebar_groups");
          } catch {
            // ignore
          }
        }
        if (data.data?.user) {
          loginUser(data.data.user, data.data.token);
        }
        if (onLoginSuccess) {
          onLoginSuccess();
        } else if (onNavigateHome) {
          onNavigateHome();
        }
      } else {
        setStatusMessage(data?.message || "Invalid username or password.");
      }
    } catch (err) {
      setStatusMessage("Unable to connect to the authentication service. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Top Header with GeniusOne Enterprise Brand */}
      <header className="login-header">
        <div className="login-header__brand">
          <div className="brand__mark">
            <span />
            <span />
            <span />
          </div>
          <div className="brand__text">
            <strong>GENIUSONE</strong>
            <span>Enterprise Operations</span>
          </div>
        </div>

        <div className="login-header__badge">
          <span>PT GENIUS ONE</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-card__accent" />

          <div className="login-card__content">
            <div className="login-card__header">
              <span className="login-card__eyebrow">ENTERPRISE PORTAL</span>
              <h1 className="login-card__title">Sign In to GeniusOne</h1>
              <p className="login-card__subtitle">
                Enter your operational credentials to authenticate against the enterprise governance system.
              </p>
            </div>

            {statusMessage && (
              <div className="login-card__alert" role="status">
                <Icon name="alertTriangle" size={16} />
                <span>{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="login-username">Username or Email</label>
                <div className="input-with-icon">
                  <Icon name="user" size={16} className="input-icon" />
                  <input
                    id="login-username"
                    type="text"
                    className="form-input form-input--icon-left"
                    placeholder="Enter username or email"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (statusMessage) setStatusMessage(null);
                    }}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-group__label-row">
                  <label htmlFor="login-password">Password</label>
                  <a
                    href="#forgot-password"
                    className="login-forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setStatusMessage("Please contact your IT System Administrator to reset your enterprise password.");
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="input-with-icon">
                  <Icon name="lock" size={16} className="input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="form-input form-input--icon-left form-input--icon-right"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (statusMessage) setStatusMessage(null);
                    }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                  </button>
                </div>
              </div>

              <div className="login-form__options">
                <label className="login-checkbox">
                  <input type="checkbox" defaultChecked />
                  <span>Remember my enterprise credentials</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Login Footer */}
      <footer className="login-footer">
        <div className="login-footer__left">
          <span>&copy; 2026 PT GENIUS ONE. All rights reserved.</span>
          <span>Enterprise Operations & Procurement Management</span>
        </div>
        <div className="login-footer__right">
          <span>English (US)</span>
          <span className="footer-separator">&bull;</span>
          <span>Protected by Enterprise Security Standards</span>
        </div>
      </footer>
    </div>
  );
}

export default Login;
