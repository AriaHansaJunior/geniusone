/**
 * GENIUSONE UI 2.0 — Auth & Granular Permission Context
 * Provides real session authentication, user identity, and permission checking across the app.
 * No guest superadmin fallbacks or hardcoded role allowlists exist here.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiFetch, clearApiCache, isValidAuthToken } from "../data/api";
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
  updateCurrentUser: (patch: Partial<UserAccount>) => void;
  refreshCurrentUser: () => Promise<void>;
  refreshUsers: () => void;
  refreshRoles: () => Promise<RoleDefinition[]>;
}

const AuthPermissionContext = createContext<AuthPermissionContextValue | undefined>(undefined);

function normalizeAuthUser(data: any): UserAccount {
  const roleCode = String(data?.role || "viewer");
  const isSuper =
    Boolean(data?.isSuperAdmin ?? data?.is_super_admin) ||
    roleCode.toLowerCase() === "superadmin";

  return {
    id: data.id,
    name: data.name || "",
    username: data.username || "",
    email: data.email || "",
    role: roleCode,
    role_label: data.role_label || ucfirstRole(roleCode),
    department: data.department_name || data.department?.name || data.department || "-",
    department_id: data.department_id ?? data.departments_id ?? null,
    departments_id: data.departments_id ?? data.department_id ?? null,
    job_title: data.job_title ?? null,
    employee_id: data.employee_id ?? null,
    preferred_language: data.preferred_language ?? "EN",
    photo: data.photo || null,
    isSuperAdmin: isSuper,
    is_super_admin: isSuper,
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    sidebar_permissions: Array.isArray(data.sidebar_permissions) ? data.sidebar_permissions : null,
  };
}

function ucfirstRole(role: string): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";
}

function getStoredUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("geniusone_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed.id || parsed.username)) {
        return parsed as UserAccount;
      }
    }
  } catch {
    // ignore invalid JSON from legacy storage
  }
  return null;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("geniusone_token");
    return isValidAuthToken(raw) ? raw : null;
  } catch {
    return null;
  }
}

function clearAuthStorage(): void {
  clearApiCache();
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
    const activeUser = currentUser ?? getStoredUser();
    const isAdminActor = Boolean(
      activeUser?.isSuperAdmin || String(activeUser?.role || "").toLowerCase() === "superadmin"
    );
    if (!getStoredToken() || !isAdminActor) {
      return [];
    }
    try {
      const list = await fetchRolesApi();
      setRoles(list);
      return list;
    } catch {
      return [];
    }
  }, [currentUser]);

  const refreshUsers = useCallback(() => {
    const activeUser = currentUser ?? getStoredUser();
    const isAdminActor = Boolean(
      activeUser?.isSuperAdmin || String(activeUser?.role || "").toLowerCase() === "superadmin"
    );
    if (!getStoredToken() || !isAdminActor) return;
    fetchUsersApi()
      .then((list) => setUsers(list))
      .catch(() => {});
    refreshRoles();
  }, [currentUser, refreshRoles]);

  // Verify token against backend /api/auth/me once on mount
  useEffect(() => {
    let active = true;
    const storedToken = getStoredToken();
    if (!storedToken) {
      clearAuthStorage();
      setCurrentUserState(null);
      setToken(null);
      setAuthReady(true);
      return;
    }

    apiFetch("/api/auth/me")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          throw new Error("UNAUTHENTICATED");
        }
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!active || !json) return;
        if (json?.status === "success" && json.data) {
          const u = normalizeAuthUser(json.data);
          setCurrentUserState(u);
          try {
            sessionStorage.setItem("geniusone_user", JSON.stringify(u));
            localStorage.removeItem("geniusone_user");
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err?.message === "UNAUTHENTICATED") {
          clearAuthStorage();
          setToken(null);
          setCurrentUserState(null);
        }
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

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

  const loginUser = useCallback((newToken: string, user: UserAccount) => {
    // Defensive normalization in case callers pass (user, token)
    let resolvedToken = newToken as any;
    let resolvedUser = user as any;
    if (typeof resolvedToken === "object" && resolvedToken !== null && typeof resolvedUser === "string") {
      resolvedUser = newToken;
      resolvedToken = user;
    }
    const normalizedUser = normalizeAuthUser(resolvedUser);
    const tokenStr = isValidAuthToken(resolvedToken) ? resolvedToken : "";

    clearApiCache();
    try {
      if (tokenStr) {
        sessionStorage.setItem("geniusone_token", tokenStr);
        localStorage.removeItem("geniusone_token");
      }
      sessionStorage.setItem("geniusone_user", JSON.stringify(normalizedUser));
      localStorage.removeItem("geniusone_user");
    } catch {
      // ignore
    }
    setToken(tokenStr || null);
    setCurrentUserState(normalizedUser);
    setAuthReady(true);
  }, []);

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

  const updateCurrentUser = useCallback((patch: Partial<UserAccount>) => {
    setCurrentUserState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem("geniusone_user", JSON.stringify(next));
        localStorage.removeItem("geniusone_user");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.status === "success" && json.data) {
        const u = normalizeAuthUser(json.data);
        setCurrentUserState(u);
        try {
          sessionStorage.setItem("geniusone_user", JSON.stringify(u));
          localStorage.removeItem("geniusone_user");
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
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
          receive_note_return: "return",
          bpb: "rn",
          request_material: "rm",
          transfer_stock_return: "rm",
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

      // Allow all sidebar navigation items by default when no explicit restriction array is set
      return true;
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
        updateCurrentUser,
        refreshCurrentUser,
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
