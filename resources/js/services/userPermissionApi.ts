/**
 * GENIUSONE UI 2.0 — User & Permission Administration API Service
 * All user accounts, roles, and granular permissions are stored in the database.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "../data/api";
import {
  type RoleDefinition,
  type UserAccount,
  type UserPermissionMap,
  convertPermissionMapToStrings,
  mapBackendRoleToDefinition,
} from "../types/permissions";

export interface CreateUserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  department?: string;
  departments_id?: number | null;
  job_title?: string;
  employee_id?: string;
  preferred_language?: string;
  status?: "active" | "inactive" | number;
  isSuperAdmin?: boolean;
  permissions?: UserPermissionMap | string[];
  sidebar_permissions?: string[] | null;
}

export function mapBackendUserToAccount(u: any): UserAccount {
  const isSuper =
    Boolean(u.is_super_admin ?? u.isSuperAdmin) ||
    String(u.role || "").toLowerCase() === "superadmin";
  return {
    id: u.id,
    name: u.name || "",
    username: u.username || "",
    email: u.email || "",
    role: u.role || "viewer",
    role_label: u.role_label || u.roleModel?.label || u.role || "Viewer",
    department: u.department_name || u.department?.name || (typeof u.department === "string" ? u.department : "-"),
    department_id: u.department_id ?? u.departments_id ?? u.department?.id ?? null,
    departments_id: u.departments_id ?? u.department_id ?? u.department?.id ?? null,
    job_title: u.job_title ?? null,
    employee_id: u.employee_id ?? null,
    preferred_language: u.preferred_language ?? "EN",
    photo: u.photo ?? null,
    status: u.status === 0 || u.status === "inactive" ? "inactive" : "active",
    isSuperAdmin: isSuper,
    is_super_admin: isSuper,
    permissions: Array.isArray(u.permissions)
      ? u.permissions
      : Array.isArray(u.direct_permissions)
        ? u.direct_permissions.map((p: any) => (typeof p === "string" ? p : p.name)).filter(Boolean)
        : u.permissions || [],
    sidebar_permissions: Array.isArray(u.sidebar_permissions) ? u.sidebar_permissions : null,
    createdAt: u.created_at || u.createdAt || "-",
    updatedAt: u.updated_at || u.updatedAt || "-",
  };
}

export async function fetchUsersApi(params?: Record<string, string | number | undefined>): Promise<UserAccount[]> {
  const res = await apiGet<{ data: any[] }>("/api/admin/users", { per_page: 200, ...params });
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data.map(mapBackendUserToAccount);
}

export async function createUserApi(
  payload: CreateUserPayload
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const permsArray = Array.isArray(payload.permissions)
      ? payload.permissions
      : payload.permissions
        ? convertPermissionMapToStrings(payload.permissions)
        : undefined;

    const res = await apiPost<{ data: any }>("/api/admin/users", {
      name: payload.name.trim(),
      username: payload.username.trim(),
      email: payload.email.trim(),
      password: payload.password,
      role: payload.role.trim(),
      departments_id: payload.departments_id ?? (payload as any).department_id ?? null,
      job_title: payload.job_title,
      employee_id: payload.employee_id,
      preferred_language: payload.preferred_language || "EN",
      status: payload.status === "inactive" || payload.status === 0 ? 0 : 1,
      permissions: permsArray,
      sidebar_permissions: payload.sidebar_permissions ?? null,
    });
    return {
      success: true,
      user: res?.data ? mapBackendUserToAccount(res.data) : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to create user." };
  }
}

export async function updateUserApi(
  userId: string | number,
  updates: Partial<UserAccount> & { password?: string }
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const permsArray = Array.isArray(updates.permissions)
      ? updates.permissions
      : updates.permissions
        ? convertPermissionMapToStrings(updates.permissions)
        : undefined;

    const res = await apiPut<{ data: any }>(`/api/admin/users/${userId}`, {
      name: updates.name,
      username: updates.username,
      email: updates.email,
      password: updates.password,
      role: updates.role,
      departments_id: updates.departments_id ?? updates.department_id,
      job_title: updates.job_title,
      employee_id: updates.employee_id,
      preferred_language: updates.preferred_language,
      status:
        updates.status === undefined
          ? undefined
          : updates.status === "inactive" || updates.status === 0
            ? 0
            : 1,
      permissions: permsArray,
      sidebar_permissions: updates.sidebar_permissions,
    });
    return {
      success: true,
      user: res?.data ? mapBackendUserToAccount(res.data) : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update user." };
  }
}

export async function updateUserPermissionsApi(
  userId: string | number,
  permissions: UserPermissionMap | string[],
  sidebarPermissions?: string[] | null
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const permsArray = Array.isArray(permissions)
      ? permissions
      : convertPermissionMapToStrings(permissions);
    const res = await apiPost<{ data: any }>(`/api/admin/users/${userId}/permissions`, {
      permissions: permsArray,
      sidebar_permissions: sidebarPermissions ?? null,
    });
    return {
      success: true,
      user: res?.data ? mapBackendUserToAccount(res.data) : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update user permissions." };
  }
}

export async function toggleUserStatusApi(
  userId: string | number
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const res = await apiPatch<{ data: { status: number } }>(`/api/admin/users/${userId}/toggle-status`);
    return { success: true, status: res?.data?.status };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to toggle user status." };
  }
}

export async function resetUserPasswordApi(
  userId: string | number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPost(`/api/admin/users/${userId}/reset-password`, {
      new_password: newPassword,
      new_password_confirmation: newPassword,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reset password." };
  }
}

export async function deleteUserApi(userId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    await apiDelete(`/api/admin/users/${userId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete user." };
  }
}

export async function fetchRolesApi(): Promise<RoleDefinition[]> {
  const res = await apiGet<{ data: any[] }>("/api/admin/roles");
  if (!res?.data || !Array.isArray(res.data)) return [];
  return res.data.map(mapBackendRoleToDefinition);
}

export async function createRoleApi(role: RoleDefinition): Promise<RoleDefinition> {
  const res = await apiPost<{ data: any }>("/api/admin/roles", {
    name: role.code,
    label: role.name,
    description: role.description,
    sidebar_permissions: role.sidebarPermissions || [],
    permissions: convertPermissionMapToStrings(role.permissions),
  });
  return mapBackendRoleToDefinition(res?.data || role);
}

export async function updateRoleApi(roleId: string | number, role: RoleDefinition): Promise<RoleDefinition> {
  const res = await apiPut<{ data: any }>(`/api/admin/roles/${roleId}`, {
    name: role.code,
    label: role.name,
    description: role.description,
    sidebar_permissions: role.sidebarPermissions || [],
    permissions: convertPermissionMapToStrings(role.permissions),
  });
  return mapBackendRoleToDefinition(res?.data || role);
}

export async function deleteRoleApi(roleId: string | number): Promise<boolean> {
  return apiDelete(`/api/admin/roles/${roleId}`);
}
