/**
 * GENIUSONE UI 2.0 — Real Auth & Permission Context
 * Directly integrated with Laravel session and database authentication.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ApprovalModule, PermissionAction, UserAccount } from "../types/permissions";

interface AuthPermissionContextValue {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  can: (module: ApprovalModule | string, action: PermissionAction | string) => boolean;
  canAccessSidebarItem: (itemId: string) => boolean;
  loginUser: (user: UserAccount, token?: string) => void;
  logoutUser: () => Promise<void>;
  switchUser: (userId: string) => void;
  refreshUsers: () => void;
}

const DEFAULT_GUEST: UserAccount = {
  id: 1,
  name: "Super Administrator",
  username: "superadmin",
  email: "superadmin@geniusone.internal",
  role: "superadmin",
  role_label: "Super Administrator",
  department: "Executive & Systems",
  status: "active",
  isSuperAdmin: true,
  is_super_admin: true,
  permissions: ["*"],
};

function getStoredUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("geniusone_user") || localStorage.getItem("geniusone_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.username)) {
        return {
          ...parsed,
          isSuperAdmin: Boolean(
            parsed.isSuperAdmin ||
            parsed.is_super_admin ||
            parsed.role === "superadmin" ||
            parsed.role === "SuperAdmin"
          ),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

const AuthPermissionContext = createContext<AuthPermissionContextValue | null>(null);

export function AuthPermissionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserAccount>(() => {
    return getStoredUser() || DEFAULT_GUEST;
  });
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getStoredUser());
  });

  const fetchCurrentUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.status === "success" && json.data) {
          const u: UserAccount = {
            ...json.data,
            isSuperAdmin: Boolean(json.data.is_super_admin || json.data.role === "superadmin"),
          };
          setCurrentUserState(u);
          setIsAuthenticated(true);
          sessionStorage.setItem("geniusone_user", JSON.stringify(u));
          localStorage.setItem("geniusone_user", JSON.stringify(u));
        }
      } else if (res.status === 401) {
        const stored = getStoredUser();
        if (!stored) {
          setIsAuthenticated(false);
        }
      }
    } catch {
      // offline fallback
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch("/api/auth/users", {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.status === "success" && Array.isArray(json.data)) {
          setAllUsers(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, [fetchCurrentUser, fetchUsers]);

  const loginUser = useCallback((user: UserAccount, token?: string) => {
    const formattedUser: UserAccount = {
      ...user,
      isSuperAdmin: Boolean(
        user.is_super_admin ||
        user.isSuperAdmin ||
        user.role === "superadmin" ||
        user.role === "SuperAdmin"
      ),
    };
    setCurrentUserState(formattedUser);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("geniusone_user", JSON.stringify(formattedUser));
      localStorage.setItem("geniusone_user", JSON.stringify(formattedUser));
      if (token) {
        sessionStorage.setItem("geniusone_token", token);
        localStorage.setItem("geniusone_token", token);
      }
    }
  }, []);

  const logoutUser = useCallback(async () => {
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("geniusone_user");
      localStorage.removeItem("geniusone_user");
      sessionStorage.removeItem("geniusone_token");
      localStorage.removeItem("geniusone_token");
      sessionStorage.removeItem("geniusone_sidebar_sections");
      sessionStorage.removeItem("geniusone_sidebar_groups");
    }
    setIsAuthenticated(false);
    setCurrentUserState(DEFAULT_GUEST);
  }, []);

  const switchUser = useCallback((userId: string) => {
    const found = allUsers.find((u) => String(u.id) === String(userId));
    if (found) {
      loginUser(found);
    }
  }, [allUsers, loginUser]);

  const can = useCallback(
    (module: ApprovalModule | string, action: PermissionAction | string): boolean => {
      if (!currentUser) return false;
      // SuperAdmin has master access
      if (currentUser.isSuperAdmin || currentUser.is_super_admin || currentUser.role === "superadmin") {
        return true;
      }

      // If permissions is an array of strings from Laravel (e.g. ['pr.view', 'po.create', ...])
      if (Array.isArray(currentUser.permissions)) {
        if (currentUser.permissions.includes("*")) return true;

        const modPrefixMap: Record<string, string> = {
          purchase_requisition: "pr",
          purchase_order: "po",
          receive_note: "rn",
          request_material: "rm",
        };
        const prefix = modPrefixMap[module] || module;

        if (
          currentUser.permissions.includes(`${prefix}.${action}`) ||
          currentUser.permissions.includes(`${prefix}.*`) ||
          currentUser.permissions.includes(`${module}.${action}`) ||
          currentUser.permissions.includes(`${module}.*`)
        ) {
          return true;
        }
      }

      // If permissions is an object map
      if (typeof currentUser.permissions === "object" && !Array.isArray(currentUser.permissions)) {
        const modPerms = (currentUser.permissions as any)[module];
        if (modPerms && modPerms[action] !== undefined) {
          return Boolean(modPerms[action]);
        }
      }

      // Default Admin role has full crud & approvals
      if (currentUser.role === "admin") {
        return true;
      }

      return false;
    },
    [currentUser]
  );

  const canAccessSidebarItem = useCallback(
    (itemId: string): boolean => {
      if (!currentUser) return false;
      if (
        currentUser.isSuperAdmin ||
        currentUser.is_super_admin ||
        currentUser.role === "superadmin" ||
        currentUser.role === "SuperAdmin"
      ) {
        return true;
      }

      // If sidebar_permissions array is explicitly set by SuperAdmin
      if (Array.isArray(currentUser.sidebar_permissions)) {
        if (currentUser.sidebar_permissions.includes("*")) return true;
        return currentUser.sidebar_permissions.includes(itemId);
      }

      // Default fallback by role if no custom sidebar override set
      if (currentUser.role === "admin") return true;

      const role = (currentUser.role || "").toLowerCase();
      if (itemId === "dashboard" || itemId === "stock-notification-master") return true;

      if (role === "procurement") {
        return [
          "supplier", "payment-term", "purchase-category", "delivery-terms",
          "additional-costs", "pph", "rafaksi-type", "job-number",
          "pr", "po", "report", "pr-report", "po-report"
        ].includes(itemId);
      }

      if (role === "warehouse") {
        return [
          "warehouse-master", "wh-type-of-request", "wh-destination-location",
          "wh-adj-prod", "wh-adj-bc", "wh-opname-material", "wh-adj-stock",
          "transfer-stock-return", "transfer-stock-result", "receive-material-non-fasilitas",
          "warehouse", "purchase-return", "sales-return", "wh-out-do", "wh-out-issue",
          "wh-out-disposal", "wh-req-weight-note", "wh-req-material",
          "wh-rep-stock-item", "wh-rep-stock-card", "receive-note", "receive-note-return", "document-history"
        ].includes(itemId);
      }

      if (role.includes("approver")) {
        return ["pr", "po", "report", "warehouse", "receive-note"].includes(itemId);
      }

      if (role === "viewer") {
        return ["report", "pr-report", "po-report", "wh-rep-stock-item"].includes(itemId);
      }

      return true;
    },
    [currentUser]
  );

  return (
    <AuthPermissionContext.Provider
      value={{
        currentUser,
        allUsers,
        isAuthenticated,
        isSuperAdmin: Boolean(
          currentUser?.isSuperAdmin ||
          currentUser?.is_super_admin ||
          currentUser?.role === "superadmin"
        ),
        can,
        canAccessSidebarItem,
        loginUser,
        logoutUser,
        switchUser,
        refreshUsers: fetchUsers,
      }}
    >
      {children}
    </AuthPermissionContext.Provider>
  );
}

export function useAuthPermission(): AuthPermissionContextValue {
  const ctx = useContext(AuthPermissionContext);
  if (!ctx) {
    throw new Error("useAuthPermission must be used within an AuthPermissionProvider");
  }
  return ctx;
}
