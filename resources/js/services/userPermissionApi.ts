/**
 * GENIUSONE UI 2.0 — User & Permission Administration API Service
 * Handles user account management and granular module permissions for SuperAdmin.
 */

import type {
  ApprovalModule,
  ModulePermissions,
  PermissionAction,
  UserAccount,
  UserPermissionMap,
} from "../types/permissions";
import { APPROVAL_MODULES, createDefaultPermissionMap } from "../types/permissions";

const USERS_STORAGE_KEY = "geniusone_admin_users_v2";
const CURRENT_USER_KEY = "geniusone_current_user_v2";

/**
 * Builds custom permissions helper for a user.
 */
function buildCustomPermissions(custom: Partial<Record<ApprovalModule, Partial<ModulePermissions>>>): UserPermissionMap {
  const base = createDefaultPermissionMap(false);
  for (const mod of APPROVAL_MODULES) {
    if (custom[mod.id]) {
      base[mod.id] = { ...base[mod.id], ...custom[mod.id] };
    }
  }
  return base;
}

/**
 * Initial Realistic Seed Users for GENIUSONE enterprise system.
 */
const INITIAL_USERS: UserAccount[] = [
  {
    id: "usr_superadmin",
    name: "Super Administrator",
    username: "superadmin",
    email: "superadmin@geniusone.internal",
    role: "SuperAdmin",
    department: "Executive & Systems",
    status: "active",
    isSuperAdmin: true,
    permissions: createDefaultPermissionMap(true),
    createdAt: "2026-01-10 08:00",
    updatedAt: "2026-10-26 12:00",
  },
  {
    id: "usr_rizky",
    name: "Rizky Aditya",
    username: "rizky.aditya",
    email: "rizky.aditya@geniusone.internal",
    role: "Procurement Manager",
    department: "Purchasing",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: true, view: true, update: true, delete: true, approve_1: true, unapprove_1: true, approve_2: true, unapprove_2: true },
      purchase_order: { create: true, view: true, update: true, delete: true, approve_1: true, unapprove_1: true, approve_2: false, unapprove_2: false },
      receive_note: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      request_material: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
    }),
    createdAt: "2026-02-01 09:30",
    updatedAt: "2026-10-26 10:15",
  },
  {
    id: "usr_arsyeila",
    name: "Arsyeila Putri",
    username: "arsyeila",
    email: "arsyeila.putri@geniusone.internal",
    role: "Purchasing Staff (Creator)",
    department: "Purchasing",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: true, view: true, update: true, delete: true, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      purchase_order: { create: true, view: true, update: true, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      receive_note: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      request_material: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
    }),
    createdAt: "2026-03-15 11:00",
    updatedAt: "2026-10-20 14:20",
  },
  {
    id: "usr_yustina",
    name: "Yustina",
    username: "yustina",
    email: "yustina@geniusone.internal",
    role: "Finance & PO Lead (Approver 1)",
    department: "Finance",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: false, view: true, update: false, delete: false, approve_1: true, unapprove_1: true, approve_2: false, unapprove_2: false },
      purchase_order: { create: false, view: true, update: false, delete: false, approve_1: true, unapprove_1: true, approve_2: false, unapprove_2: false },
      receive_note: { create: false, view: true, update: false, delete: false, approve_1: true, unapprove_1: true, approve_2: false, unapprove_2: false },
      request_material: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
    }),
    createdAt: "2026-02-12 10:00",
    updatedAt: "2026-10-18 16:40",
  },
  {
    id: "usr_awi",
    name: "Awi L",
    username: "awi.l",
    email: "awi.l@geniusone.internal",
    role: "Executive Director (Approver 2)",
    department: "Board of Directors",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: true, unapprove_2: true },
      purchase_order: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: true, unapprove_2: true },
      receive_note: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: true, unapprove_2: true },
      request_material: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: true, unapprove_2: true },
    }),
    createdAt: "2026-01-05 08:30",
    updatedAt: "2026-10-12 09:10",
  },
  {
    id: "usr_bambang",
    name: "Bambang Sudarmono",
    username: "bambang.s",
    email: "bambang.s@geniusone.internal",
    role: "Warehouse Head",
    department: "Warehouse",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      purchase_order: { create: false, view: true, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      receive_note: { create: true, view: true, update: true, delete: false, approve_1: true, unapprove_1: true, approve_2: true, unapprove_2: true },
      request_material: { create: true, view: true, update: true, delete: true, approve_1: true, unapprove_1: true, approve_2: true, unapprove_2: true },
    }),
    createdAt: "2026-03-01 08:00",
    updatedAt: "2026-10-22 11:30",
  },
  {
    id: "usr_budi",
    name: "Budi Santoso",
    username: "budi.s",
    email: "budi.s@geniusone.internal",
    role: "Warehouse Material Requisition Staff",
    department: "Warehouse",
    status: "active",
    permissions: buildCustomPermissions({
      purchase_requisition: { create: false, view: false, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      purchase_order: { create: false, view: false, update: false, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      receive_note: { create: true, view: true, update: true, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
      request_material: { create: true, view: true, update: true, delete: false, approve_1: false, unapprove_1: false, approve_2: false, unapprove_2: false },
    }),
    createdAt: "2026-04-10 09:00",
    updatedAt: "2026-10-15 13:00",
  },
];

/**
 * Loads users from localStorage or initializes with seed users.
 */
export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading stored users:", err);
  }

  // Save initial seed users
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  } catch {
    // Ignore storage errors
  }
  return INITIAL_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Error saving stored users:", err);
  }
}

/**
 * Gets currently active simulated user.
 * Defaults to SuperAdmin or Rizky Aditya.
 */
export function getCurrentUser(): UserAccount {
  const users = getStoredUsers();
  try {
    const currentId = localStorage.getItem(CURRENT_USER_KEY);
    if (currentId) {
      const found = users.find((u) => u.id === currentId);
      if (found) return found;
    }
  } catch (err) {
    console.warn("Error getting current user:", err);
  }

  return users[0]; // Default SuperAdmin
}

export function setCurrentUser(userId: string): UserAccount {
  const users = getStoredUsers();
  const found = users.find((u) => u.id === userId) || users[0];
  try {
    localStorage.setItem(CURRENT_USER_KEY, found.id);
  } catch (err) {
    console.warn("Error setting current user:", err);
  }
  return found;
}

export interface CreateUserPayload {
  name: string;
  username: string;
  email: string;
  role: string;
  department: string;
  isSuperAdmin?: boolean;
  permissions?: UserPermissionMap;
}

/**
 * Creates a new user in the system.
 */
export async function createUserApi(payload: CreateUserPayload): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  // Validate required fields
  if (!payload.name?.trim()) return { success: false, error: "Name is required." };
  if (!payload.username?.trim()) return { success: false, error: "Username is required." };
  if (!payload.email?.trim()) return { success: false, error: "Email is required." };

  const users = getStoredUsers();

  // Check unique username and email
  if (users.some((u) => u.username.toLowerCase() === payload.username.trim().toLowerCase())) {
    return { success: false, error: "Username is already taken." };
  }
  if (users.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase())) {
    return { success: false, error: "Email address is already in use." };
  }

  const now = new Date().toISOString().replace("T", " ").substring(0, 16);
  const newUser: UserAccount = {
    id: `usr_${Date.now()}`,
    name: payload.name.trim(),
    username: payload.username.trim().toLowerCase(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role?.trim() || "Staff",
    department: payload.department?.trim() || "General",
    status: "active",
    isSuperAdmin: Boolean(payload.isSuperAdmin),
    permissions: payload.permissions || (payload.isSuperAdmin ? createDefaultPermissionMap(true) : createDefaultPermissionMap(false)),
    createdAt: now,
    updatedAt: now,
  };

  const updatedUsers = [newUser, ...users];
  saveStoredUsers(updatedUsers);

  return { success: true, user: newUser };
}

/**
 * Updates user account details.
 */
export async function updateUserApi(
  id: string,
  updates: Partial<Pick<UserAccount, "name" | "role" | "department" | "status" | "isSuperAdmin">>
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return { success: false, error: "User not found." };

  const target = users[index];
  const now = new Date().toISOString().replace("T", " ").substring(0, 16);

  const updated: UserAccount = {
    ...target,
    ...updates,
    updatedAt: now,
  };

  users[index] = updated;
  saveStoredUsers(users);

  // Update current user if modifying active session
  if (getCurrentUser().id === id) {
    setCurrentUser(id);
  }

  return { success: true, user: updated };
}

/**
 * Updates granular permissions for a user.
 */
export async function updateUserPermissionsApi(
  userId: string,
  permissions: UserPermissionMap
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return { success: false, error: "User not found." };

  const target = users[index];
  const now = new Date().toISOString().replace("T", " ").substring(0, 16);

  const updated: UserAccount = {
    ...target,
    permissions,
    updatedAt: now,
  };

  users[index] = updated;
  saveStoredUsers(users);

  if (getCurrentUser().id === userId) {
    setCurrentUser(userId);
  }

  return { success: true, user: updated };
}

/**
 * Deletes a user account.
 */
export async function deleteUserApi(userId: string): Promise<{ success: boolean; error?: string }> {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: "User not found." };

  if (target.isSuperAdmin && users.filter((u) => u.isSuperAdmin).length <= 1) {
    return { success: false, error: "Cannot delete the primary SuperAdmin account." };
  }

  const filtered = users.filter((u) => u.id !== userId);
  saveStoredUsers(filtered);

  if (getCurrentUser().id === userId) {
    setCurrentUser(filtered[0]?.id || "usr_superadmin");
  }

  return { success: true };
}
