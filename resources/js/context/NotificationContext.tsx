import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Icon } from "../components/ui/Icon";
import { ApiError } from "../data/api";
import type { IconName } from "../types";

export type NotificationTone = "success" | "error" | "warning" | "info";

export interface ToastNotificationItem {
  id: string;
  tone: NotificationTone;
  title: string;
  message: string;
}

interface NotificationContextValue {
  notify: (tone: NotificationTone, title: string, message: string, durationMs?: number) => void;
  notifySuccess: (title: string, message?: string) => void;
  notifyError: (title: string, errOrMessage?: unknown) => void;
  notifyWarning: (title: string, message?: string) => void;
  notifyInfo: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function extractErrorMessage(err: unknown, fallback = "Operation failed. Please check your input and try again."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err.trim() || fallback;
  if (err instanceof ApiError) {
    if (err.errors && typeof err.errors === "object") {
      const firstList = Object.values(err.errors).find((v) => Array.isArray(v) && v.length > 0);
      if (firstList && firstList[0]) {
        return firstList[0];
      }
    }
    if (err.message && err.message.trim()) return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "object" && "message" in (err as Record<string, unknown>)) {
    const msg = String((err as Record<string, unknown>).message ?? "").trim();
    if (msg) return msg;
  }
  return fallback;
}

const TONE_ICON_MAP: Record<NotificationTone, IconName> = {
  success: "checkCircle",
  error: "alertTriangle",
  warning: "alertTriangle",
  info: "info",
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastNotificationItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t !== undefined && typeof window !== "undefined") {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (tone: NotificationTone, title: string, message: string, durationMs = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev.slice(-3), { id, tone, title, message }]);

      if (durationMs > 0 && typeof window !== "undefined") {
        const timerId = window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
        timersRef.current.set(id, timerId);
      }
    },
    [dismiss]
  );

  const notifySuccess = useCallback(
    (title: string, message = "Changes saved to database.") => {
      notify("success", title, message, 4200);
    },
    [notify]
  );

  const notifyError = useCallback(
    (title: string, errOrMessage?: unknown) => {
      const resolved = extractErrorMessage(errOrMessage, "Request failed. Please try again.");
      notify("error", title, resolved, 6500);
    },
    [notify]
  );

  const notifyWarning = useCallback(
    (title: string, message = "Please review the form inputs.") => {
      notify("warning", title, message, 5200);
    },
    [notify]
  );

  const notifyInfo = useCallback(
    (title: string, message = "") => {
      notify("info", title, message, 4200);
    },
    [notify]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notify,
      notifySuccess,
      notifyError,
      notifyWarning,
      notifyInfo,
      dismiss,
    }),
    [notify, notifySuccess, notifyError, notifyWarning, notifyInfo, dismiss]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <div className="g1-toast-viewport" role="region" aria-label="Notifications" aria-live="polite">
          {items.map((item) => (
            <div
              key={item.id}
              className={`g1-toast g1-toast--${item.tone}`}
              role={item.tone === "error" || item.tone === "warning" ? "alert" : "status"}
            >
              <div className="g1-toast__icon" aria-hidden="true">
                <Icon name={TONE_ICON_MAP[item.tone]} size={15} />
              </div>
              <div className="g1-toast__body">
                <p className="g1-toast__title">{item.title}</p>
                {item.message && <p className="g1-toast__message">{item.message}</p>}
              </div>
              <button
                type="button"
                className="g1-toast__close"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used inside a NotificationProvider.");
  }
  return ctx;
}
