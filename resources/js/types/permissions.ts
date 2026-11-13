/**
 * GENIUSONE UI 2.0 — Granular Permission System Types
 * Defines permissions per module for role-based and user-level authorization.
 * All roles and permissions are stored in the database and fetched via API.
 */

import type { ApprovalModule } from "./approval";
export type { ApprovalModule };

export type PermissionAction =
  | "create"
  | "view"
  | "update"
  | "delete"
  | "approve_1"
  | "unapprove_1"
  | "approve_2"
  | "unapprove_2";

export interface PermissionActionMeta {
  action: PermissionAction;
  label: string;
  description: string;
  category: "crud" | "approval";
}

export const PERMISSION_ACTIONS: PermissionActionMeta[] = [
  { action: "create", label: "Create", description: "Create new transaction documents", category: "crud" },
  { action: "view", label: "View", description: "Read and inspect document details", category: "crud" },
  { action: "update", label: "Update", description: "Edit pending or rejected documents", category: "crud" },
  { action: "delete", label: "Delete", description: "Delete draft documents", category: "crud" },
  { action: "approve_1", label: "Approve 1", description: "Grant Stage 1 Approval (Department / Lead)", category: "approval" },
  { action: "unapprove_1", label: "UnApprove 1", description: "Revoke Stage 1 Approval and request revision", category: "approval" },
  { action: "approve_2", label: "Approve 2", description: "Grant Stage 2 Final Approval (Director / Management)", category: "approval" },
  { action: "unapprove_2", label: "UnApprove 2", description: "Revoke Stage 2 Final Approval", category: "approval" },
];

export interface ModuleMeta {
  id: ApprovalModule;
  label: string;
  category: string;
  description: string;
}

export const APPROVAL_MODULES: ModuleMeta[] = [
  {
    id: "master_item",
    label: "Master Item",
    category: "Master Data",
    description: "Master Item catalog, facility configuration (Fasilitas / Non Fasilitas), and specifications",
  },
  {
    id: "purchase_requisition",
    label: "Purchase Requisition (PR)",
    category: "Procurement",
    description: "Material requisition approvals before purchase order issuance",
  },
  {
    id: "purchase_order",
    label: "Purchase Order (PO)",
    category: "Procurement",
    description: "Commercial supplier purchase order authorizations",
  },
  {
    id: "receive_note",
    label: "Receive Material / BPB (RN)",
    category: "Warehouse & Exim",
    description: "Gate-inbound and goods receipt verification",
  },
  {
    id: "request_material",
    label: "Request Material (RM)",
    category: "Warehouse",
    description: "Internal production and material dispatch requisitions",
  },
];

export type ModulePermissions = Record<PermissionAction, boolean>;

export type UserPermissionMap = Record<string, ModulePermissions>;

export interface RoleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  canManageMasterItem: boolean;
  permissions: UserPermissionMap;
  sidebarPermissions?: string[];
  isSystem?: boolean;
}

export interface UserAccount {
  id: string | number;
  name: string;
  username: string;
  email: string;
  role: string;
  role_label?: string;
  department?: string;
  department_id?: number | null;
  departments_id?: number | null;
  job_title?: string | null;
  employee_id?: string | null;
  preferred_language?: string | null;
  avatar?: string;
  photo?: string | null;
  status?: "active" | "inactive" | number;
  isSuperAdmin?: boolean;
  is_super_admin?: boolean;
  permissions?: UserPermissionMap | string[];
  sidebar_permissions?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Creates empty permissions where all actions are false.
 */
export function createEmptyModulePermissions(): ModulePermissions {
  return {
    create: false,
    view: false,
    update: false,
    delete: false,
    approve_1: false,
    unapprove_1: false,
    approve_2: false,
    unapprove_2: false,
  };
}

/**
 * Creates full permissions where all actions are true.
 */
export function createFullModulePermissions(): ModulePermissions {
  return {
    create: true,
    view: true,
    update: true,
    delete: true,
    approve_1: true,
    unapprove_1: true,
    approve_2: true,
    unapprove_2: true,
  };
}

/**
 * Creates a blank permission map for all supported modules.
 */
export function createDefaultPermissionMap(allAllowed = false): UserPermissionMap {
  const map: Partial<UserPermissionMap> = {};
  for (const mod of APPROVAL_MODULES) {
    map[mod.id] = allAllowed ? createFullModulePermissions() : createEmptyModulePermissions();
  }
  return map as UserPermissionMap;
}

export function normalizePermissionModuleId(modKey: string): string {
  const k = modKey.trim().toLowerCase();
  if (k === "master_item" || k === "item") return "master_item";
  if (k === "pr" || k === "purchase_requisition") return "purchase_requisition";
  if (k === "po" || k === "purchase_order") return "purchase_order";
  if (k === "rn" || k === "bpb" || k === "receive_note") return "receive_note";
  if (k === "rm" || k === "request_material") return "request_material";
  return k;
}

export function convertStringsToPermissionMap(permList?: Array<string | { name?: string }> | null): UserPermissionMap {
  if (!Array.isArray(permList)) return createDefaultPermissionMap(false);
  const rawNames = permList.map((p) => (typeof p === "string" ? p : String(p?.name || ""))).filter(Boolean);
  if (rawNames.includes("*")) return createDefaultPermissionMap(true);

  const map = createDefaultPermissionMap(false);
  for (const name of rawNames) {
    const parts = name.split(".");
    if (parts.length < 2) continue;
    const modId = normalizePermissionModuleId(parts[0]);
    const act = parts[1] as PermissionAction;
    if (map[modId] && act in map[modId]) {
      map[modId][act] = true;
    }
  }
  return map;
}

export function convertPermissionMapToStrings(permMap: UserPermissionMap): string[] {
  const result: string[] = [];
  for (const mod of APPROVAL_MODULES) {
    const modKey =
      mod.id === "master_item"
        ? "master_item"
        : mod.id === "purchase_requisition"
        ? "pr"
        : mod.id === "purchase_order"
        ? "po"
        : mod.id === "receive_note"
        ? "rn"
        : "rm";
    const modPerms = permMap[mod.id];
    if (!modPerms) continue;
    for (const act of PERMISSION_ACTIONS) {
      if (modPerms[act.action]) {
        result.push(`${modKey}.${act.action}`);
      }
    }
  }
  return result;
}

export function mapBackendRoleToDefinition(r: any): RoleDefinition {
  const code = String(r.name || r.code || "").trim();
  const isSuper = code.toLowerCase() === "superadmin";
  const permMap = isSuper
    ? createDefaultPermissionMap(true)
    : r.permissions && !Array.isArray(r.permissions) && typeof r.permissions === "object"
      ? (r.permissions as UserPermissionMap)
      : convertStringsToPermissionMap(r.permissions);

  const sidebar = isSuper
    ? ["*"]
    : Array.isArray(r.sidebar_permissions)
      ? r.sidebar_permissions
      : Array.isArray(r.sidebarPermissions)
        ? r.sidebarPermissions
        : [];

  return {
    id: String(r.id ?? code),
    code,
    name: String(r.label || r.name || code),
    description: String(r.description || ""),
    canManageMasterItem: isSuper || Boolean(permMap.master_item?.create || permMap.master_item?.update),
    permissions: permMap,
    sidebarPermissions: sidebar,
    isSystem: Boolean(r.is_system ?? r.isSystem),
  };
}

export function resolveRoleDefinition(
  roleCodeOrName: string | undefined | null,
  rolesList: RoleDefinition[] = []
): RoleDefinition | undefined {
  if (!roleCodeOrName || !Array.isArray(rolesList)) return undefined;
  const q = roleCodeOrName.trim().toLowerCase();
  return rolesList.find(
    (r) =>
      r.code.toLowerCase() === q ||
      r.name.toLowerCase() === q
  );
}

/**
 * Detailed summary of custom overrides applied to a user beyond their assigned role.
 */
export interface CustomOverrideSummary {
  hasOverrides: boolean;
  extraSidebarCount: number;
  extraActionCount: number;
  extraSidebarItems: string[];
  extraActionNames: string[];
}

/**
 * Analyzes whether a user has custom permission overrides or added permissions beyond their assigned role.
 */
export function getCustomOverridesSummary(
  user: UserAccount,
  rolesList: RoleDefinition[] = []
): CustomOverrideSummary {
  const emptyResult: CustomOverrideSummary = {
    hasOverrides: false,
    extraSidebarCount: 0,
    extraActionCount: 0,
    extraSidebarItems: [],
    extraActionNames: [],
  };

  if (user.isSuperAdmin || user.is_super_admin || user.role === "superadmin") {
    return emptyResult;
  }

  const roleDef = resolveRoleDefinition(user.role, rolesList);
  if (!roleDef) return emptyResult;

  const roleSidebar = roleDef.sidebarPermissions || [];
  const extraSidebarItems: string[] = [];

  if (Array.isArray(user.sidebar_permissions) && !roleSidebar.includes("*")) {
    for (const menuId of user.sidebar_permissions) {
      if (!roleSidebar.includes(menuId)) {
        extraSidebarItems.push(menuId);
      }
    }
  }

  const extraActionNames: string[] = [];

  if (Array.isArray(user.permissions)) {
    for (const p of user.permissions) {
      if (p === "*") continue;
      const parts = p.split(".");
      if (parts.length < 2) continue;
      const fullModId = normalizePermissionModuleId(parts[0]);
      const actKey = parts[1];

      const roleHasAction = Boolean(roleDef.permissions[fullModId]?.[actKey as PermissionAction]);
      if (!roleHasAction) {
        extraActionNames.push(p);
      }
    }
  } else if (user.permissions && typeof user.permissions === "object") {
    for (const modId of Object.keys(user.permissions)) {
      const userModPerms = (user.permissions as UserPermissionMap)[modId];
      const roleModPerms = roleDef.permissions[modId] || createEmptyModulePermissions();
      for (const act of PERMISSION_ACTIONS) {
        if (userModPerms?.[act.action] && !roleModPerms[act.action]) {
          extraActionNames.push(`${modId}.${act.action}`);
        }
      }
    }
  }

  const hasOverrides = extraSidebarItems.length > 0 || extraActionNames.length > 0;

  return {
    hasOverrides,
    extraSidebarCount: extraSidebarItems.length,
    extraActionCount: extraActionNames.length,
    extraSidebarItems,
    extraActionNames,
  };
}

/**
 * Returns true if the user has custom independent permission overrides beyond their assigned role.
 */
export function hasCustomPermissionOverrides(
  user: UserAccount,
  rolesList: RoleDefinition[] = []
): boolean {
  return getCustomOverridesSummary(user, rolesList).hasOverrides;
}
