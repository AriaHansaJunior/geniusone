/**
 * GENIUSONE UI 2.0 — Auth & Granular Permission Context
 * Provides real session authentication, user identity, and permission checking across the app.
 * No guest superadmin fallbacks or hardcoded role allowlists exist here.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch } from "../data/api";
import { fetchRolesApi, fetchUsersApi } from "../services/userPermissionApi";
import {
  type ApprovalModule,
  type PermissionAction,
  type RoleDefinition,
  type UserAccount,
  resolveRoleDefinition,
} from "../types/permissions";

interface AuthPermissionContextValue {
  currentUser: UserAccount | null;
  users: UserAccount[];
  roles: RoleDefinition[];
  isAuthenticated: boolean;
  authReady: boolean;
  isSuperAdmin: boolean;
  can: (module: ApprovalModule, action: PermissionAction) => boolean;
  canAccessSidebarItem: (itemId: string) => boolean;
  loginUser: (token: string, user: UserAccount) => void;
  logoutUser: () => Promise<void>;
  refreshUsers: () => void;
  refreshRoles: () => Promise<RoleDefinition[]>;
}

const AuthPermissionContext = createContext<AuthPermissionContextValue | undefined>(undefined);

function getStoredUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("geniusone_user") || localStorage.getItem("geniusone_user");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
  } catch {
    return null;
  }
}

function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("geniusone_token");
    sessionStorage.removeItem("geniusone_user");
    localStorage.removeItem("geniusone_token");
    localStorage.removeItem("geniusone_user");
  } catch {
    // ignore
  }
}

export function AuthPermissionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [authReady, setAuthReady] = useState<boolean>(false);

  const isAuthenticated = Boolean(token && currentUser);

  const isSuperAdmin = Boolean(
    currentUser &&
      (currentUser.isSuperAdmin ||
        currentUser.is_super_admin ||
        String(currentUser.role || "").toLowerCase() === "superadmin")
  );

  const refreshRoles = useCallback(async (): Promise<RoleDefinition[]> => {
    try {
      const list = await fetchRolesApi();
      setRoles(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  const refreshUsers = useCallback(() => {
    if (!getStoredToken()) return;
    fetchUsersApi()
      .then((list) => setUsers(list))
      .catch(() => {});
    refreshRoles();
  }, [refreshRoles]);

  // Verify token against backend /api/auth/me on mount
  useEffect(() => {
    let active = true;
    const storedToken = getStoredToken();
    if (!storedToken) {
      setCurrentUserState(null);
      setToken(null);
      setAuthReady(true);
      return;
    }

    apiFetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((json) => {
        if (!active) return;
        if (json?.status === "success" && json.data) {
          const u: UserAccount = {
            id: json.data.id,
            name: json.data.name,
            username: json.data.username,
            email: json.data.email,
            role: json.data.role,
            role_label: json.data.role_label,
            department: json.data.department_name || "-",
            department_id: json.data.department_id,
            departments_id: json.data.department_id,
            job_title: json.data.job_title,
            employee_id: json.data.employee_id,
            preferred_language: json.data.preferred_language,
            photo: json.data.photo || null,
            isSuperAdmin: Boolean(json.data.is_super_admin),
            is_super_admin: Boolean(json.data.is_super_admin),
            permissions: json.data.permissions || [],
            sidebar_permissions: json.data.sidebar_permissions || null,
          };
          setCurrentUserState(u);
          try {
            sessionStorage.setItem("geniusone_user", JSON.stringify(u));
            localStorage.setItem("geniusone_user", JSON.stringify(u));
          } catch {
            // ignore
          }
          refreshRoles();
          if (u.isSuperAdmin) {
            fetchUsersApi()
              .then((list) => {
                if (active) setUsers(list);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!active) return;
        clearAuthStorage();
        setToken(null);
        setCurrentUserState(null);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, [refreshRoles]);

  // Listen for 401 unauthorized events from apiFetch
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthStorage();
      setToken(null);
      setCurrentUserState(null);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("geniusone_unauthorized", handleUnauthorized);
      return () => window.removeEventListener("geniusone_unauthorized", handleUnauthorized);
    }
  }, []);

  const loginUser = useCallback(
    (newToken: string, user: UserAccount) => {
      try {
        sessionStorage.setItem("geniusone_token", newToken);
        sessionStorage.setItem("geniusone_user", JSON.stringify(user));
        localStorage.setItem("geniusone_token", newToken);
        localStorage.setItem("geniusone_user", JSON.stringify(user));
      } catch {
        // ignore
      }
      setToken(newToken);
      setCurrentUserState(user);
      setAuthReady(true);
      refreshRoles();
      if (user.isSuperAdmin || user.is_super_admin || String(user.role || "").toLowerCase() === "superadmin") {
        fetchUsersApi()
          .then((list) => setUsers(list))
          .catch(() => {});
      }
    },
    [refreshRoles]
  );

  const logoutUser = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network error on logout
    }
    clearAuthStorage();
    setToken(null);
    setCurrentUserState(null);
    setUsers([]);
  }, []);

  const can = useCallback(
    (module: ApprovalModule, action: PermissionAction): boolean => {
      if (!currentUser) return false;
      if (isSuperAdmin) return true;

      // 1. Check user-level permission array from backend (`user->getAllPermissions()`)
      if (Array.isArray(currentUser.permissions)) {
        if (currentUser.permissions.includes("*")) return true;

        const prefixMap: Record<ApprovalModule, string> = {
          master_item: "master_item",
          purchase_requisition: "pr",
          purchase_order: "po",
          receive_note: "rn",
          bpb: "rn",
          request_material: "rm",
        };
        const prefix = prefixMap[module] || module;

        if (
          currentUser.permissions.includes(`${prefix}.${action}`) ||
          currentUser.permissions.includes(`${prefix}.*`) ||
          currentUser.permissions.includes(`${module}.${action}`) ||
          currentUser.permissions.includes(`${module}.*`) ||
          (module === "master_item" &&
            (currentUser.permissions.includes(`item.${action}`) ||
              currentUser.permissions.includes("item.*"))) ||
          ((module === "receive_note" || module === "bpb") &&
            (currentUser.permissions.includes(`rn.${action}`) ||
              currentUser.permissions.includes(`bpb.${action}`) ||
              currentUser.permissions.includes(`receive_note.${action}`)))
        ) {
          return true;
        }
      }

      // 2. Check structured permission map if present
      if (currentUser.permissions && typeof currentUser.permissions === "object" && !Array.isArray(currentUser.permissions)) {
        const modPerms =
          (currentUser.permissions as any)[module] ||
          (module === "bpb" ? (currentUser.permissions as any)["receive_note"] : undefined);
        if (modPerms && typeof modPerms[action] === "boolean") {
          return modPerms[action];
        }
      }

      // 3. Check database role definition loaded from /api/admin/roles
      const roleDef = resolveRoleDefinition(currentUser.role, roles);
      if (roleDef) {
        const targetMod = module === "bpb" ? "receive_note" : module;
        if (roleDef.permissions[targetMod]?.[action]) {
          return true;
        }
      }

      return false;
    },
    [currentUser, isSuperAdmin, roles]
  );

  const canAccessSidebarItem = useCallback(
    (itemId: string): boolean => {
      if (!currentUser) return false;
      if (isSuperAdmin) return true;

      // 1. User-level / backend-resolved sidebar_permissions
      if (Array.isArray(currentUser.sidebar_permissions) && currentUser.sidebar_permissions.length > 0) {
        if (currentUser.sidebar_permissions.includes("*")) return true;
        return currentUser.sidebar_permissions.includes(itemId);
      }

      // 2. Database RoleDefinition loaded from /api/admin/roles
      const roleDef = resolveRoleDefinition(currentUser.role, roles);
      if (roleDef && Array.isArray(roleDef.sidebarPermissions) && roleDef.sidebarPermissions.length > 0) {
        if (roleDef.sidebarPermissions.includes("*")) return true;
        return roleDef.sidebarPermissions.includes(itemId);
      }

      // Always allow dashboard when authenticated if no explicit sidebar restriction array is populated yet
      return itemId === "dashboard";
    },
    [currentUser, isSuperAdmin, roles]
  );

  return (
    <AuthPermissionContext.Provider
      value={{
        currentUser,
        users,
        roles,
        isAuthenticated,
        authReady,
        isSuperAdmin,
        can,
        canAccessSidebarItem,
        loginUser,
        logoutUser,
        refreshUsers,
        refreshRoles,
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
