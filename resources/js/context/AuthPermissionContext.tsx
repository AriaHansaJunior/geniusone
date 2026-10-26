/**
 * GENIUSONE UI 2.0 — Auth & Permission Context
 * Provides authenticated user profile, permissions evaluation, and simulation switcher.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ApprovalModule, PermissionAction, UserAccount } from "../types/permissions";
import { getCurrentUser, getStoredUsers, setCurrentUser } from "../services/userPermissionApi";

interface AuthPermissionContextValue {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  isSuperAdmin: boolean;
  can: (module: ApprovalModule, action: PermissionAction) => boolean;
  switchUser: (userId: string) => void;
  refreshUsers: () => void;
}

const AuthPermissionContext = createContext<AuthPermissionContextValue | null>(null);

export function AuthPermissionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserAccount>(() => getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => getStoredUsers());

  const refreshUsers = useCallback(() => {
    const users = getStoredUsers();
    setAllUsers(users);
    const curr = getCurrentUser();
    setCurrentUserState(curr);
  }, []);

  const switchUser = useCallback((userId: string) => {
    const updated = setCurrentUser(userId);
    setCurrentUserState(updated);
  }, []);

  const can = useCallback(
    (module: ApprovalModule, action: PermissionAction): boolean => {
      if (!currentUser) return false;
      // SuperAdmin has unconditional master access
      if (currentUser.isSuperAdmin) return true;

      // Check specific module and action
      const modulePerms = currentUser.permissions?.[module];
      if (!modulePerms) return false;

      return Boolean(modulePerms[action]);
    },
    [currentUser]
  );

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  return (
    <AuthPermissionContext.Provider
      value={{
        currentUser,
        allUsers,
        isSuperAdmin,
        can,
        switchUser,
        refreshUsers,
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
