/**
 * GENIUSONE UI 2.0 — Granular Permission System Types
 * Defines permissions per module for role-based and user-level authorization.
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

export interface RoleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  canManageMasterItem: boolean;
  permissions: UserPermissionMap;
  sidebarPermissions?: string[];
}

const ROLES_STORAGE_KEY = "geniusone_roles_v2";

function buildRolePermMap(
  overrides: Partial<Record<ApprovalModule, Partial<ModulePermissions>>>
): UserPermissionMap {
  const map: Partial<UserPermissionMap> = {};
  for (const mod of APPROVAL_MODULES) {
    map[mod.id] = {
      ...createEmptyModulePermissions(),
      ...(overrides[mod.id] || {}),
    };
  }
  return map as UserPermissionMap;
}

export const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: "role_superadmin",
    code: "superadmin",
    name: "Super Administrator",
    description: "Unconditional master access to all modules, Master Item, and approvals.",
    canManageMasterItem: true,
    permissions: createDefaultPermissionMap(true),
    sidebarPermissions: ["*"],
  },
  {
    id: "role_master_item",
    code: "master_item_manager",
    name: "Master Item Manager",
    description: "Dedicated role for managing Master Item catalog and Facility configuration.",
    canManageMasterItem: true,
    permissions: buildRolePermMap({
      master_item: {
        create: true,
        view: true,
        update: true,
        delete: true,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_requisition: { create: false, view: true, update: false, delete: false },
      purchase_order: { create: false, view: true, update: false, delete: false },
      receive_note: { create: false, view: true, update: false, delete: false },
      request_material: { create: false, view: true, update: false, delete: false },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "supplier",
      "payment-term",
      "item",
      "warehouse-master",
      "unit",
      "satuan",
      "brand",
      "classification",
      "department",
      "facility",
      "hs",
      "category",
    ],
  },
  {
    id: "role_purchasing",
    code: "procurement",
    name: "Purchasing / Procurement",
    description: "Manage PR, PO, and authorized to add/update Master Items.",
    canManageMasterItem: true,
    permissions: buildRolePermMap({
      master_item: {
        create: true,
        view: true,
        update: true,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_requisition: {
        create: true,
        view: true,
        update: true,
        delete: true,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_order: {
        create: true,
        view: true,
        update: true,
        delete: true,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      receive_note: { create: false, view: true, update: false, delete: false },
      request_material: { create: false, view: true, update: false, delete: false },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "supplier",
      "payment-term",
      "purchase-category",
      "delivery-terms",
      "additional-costs",
      "pph",
      "rafaksi-type",
      "job-number",
      "item",
      "pr",
      "po",
      "report",
      "pr-report",
      "po-report",
    ],
  },
  {
    id: "role_accounting",
    code: "accounting",
    name: "Accounting & Finance",
    description: "Financial review, approval, and authorized to add/manage Master Items.",
    canManageMasterItem: true,
    permissions: buildRolePermMap({
      master_item: {
        create: true,
        view: true,
        update: true,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_requisition: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_order: {
        create: false,
        view: true,
        update: true,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      receive_note: { create: false, view: true, update: false, delete: false },
      request_material: { create: false, view: true, update: false, delete: false },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "payment-term",
      "additional-costs",
      "pph",
      "pr",
      "po",
      "report",
      "pr-report",
      "po-report",
    ],
  },
  {
    id: "role_approver1",
    code: "approver_tier1",
    name: "Approver Stage 1 (Dept Head)",
    description: "Stage 1 Approve and UnApprove authority across transaction modules.",
    canManageMasterItem: false,
    permissions: buildRolePermMap({
      master_item: { create: false, view: true, update: false, delete: false },
      purchase_requisition: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      purchase_order: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      receive_note: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      request_material: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "pr",
      "po",
      "receive-note",
      "warehouse",
      "wh-req-material",
      "report",
      "pr-report",
      "po-report",
    ],
  },
  {
    id: "role_approver2",
    code: "approver_tier2",
    name: "Approver Stage 2 (Director)",
    description: "Final Stage 2 Approve and UnApprove authority across transaction modules.",
    canManageMasterItem: false,
    permissions: buildRolePermMap({
      master_item: { create: false, view: true, update: false, delete: false },
      purchase_requisition: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: true,
        unapprove_2: true,
      },
      purchase_order: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: true,
        unapprove_2: true,
      },
      receive_note: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: true,
        unapprove_2: true,
      },
      request_material: {
        create: false,
        view: true,
        update: false,
        delete: false,
        approve_1: false,
        unapprove_1: false,
        approve_2: true,
        unapprove_2: true,
      },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "pr",
      "po",
      "receive-note",
      "warehouse",
      "wh-req-material",
      "report",
      "pr-report",
      "po-report",
    ],
  },
  {
    id: "role_warehouse",
    code: "warehouse",
    name: "Warehouse & Inventory",
    description: "Manage Receive Material (BPB), Request Material, and inspect Master Items.",
    canManageMasterItem: false,
    permissions: buildRolePermMap({
      master_item: { create: false, view: true, update: false, delete: false },
      purchase_requisition: { create: false, view: true, update: false, delete: false },
      purchase_order: { create: false, view: true, update: false, delete: false },
      receive_note: {
        create: true,
        view: true,
        update: true,
        delete: true,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
      request_material: {
        create: true,
        view: true,
        update: true,
        delete: true,
        approve_1: true,
        unapprove_1: true,
        approve_2: false,
        unapprove_2: false,
      },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "warehouse-master",
      "type-of-mutation",
      "wh-type-of-request",
      "wh-destination-location",
      "wh-adj-prod",
      "wh-adj-bc",
      "wh-opname-material",
      "wh-adj-stock",
      "transfer-stock-return",
      "transfer-stock-result",
      "receive-material-non-fasilitas",
      "warehouse",
      "purchase-return",
      "sales-return",
      "wh-out-do",
      "wh-out-issue",
      "wh-out-disposal",
      "wh-req-weight-note",
      "wh-req-material",
      "wh-req-weight-note-fg",
      "wh-req-shipping",
      "warehouse-move-location",
      "wh-rep-receive-material",
      "wh-rep-stock-item",
      "wh-rep-stock-card",
      "wh-rep-stock-transfer",
      "wh-rep-delivery-order",
      "wh-rep-stock-mutation",
      "wh-rep-outstanding-request",
      "receive-note",
      "receive-note-return",
      "document-history",
    ],
  },
  {
    id: "role_requester",
    code: "requester",
    name: "Department Requisitioner",
    description: "Create and view Purchase Requisitions and Material Requests.",
    canManageMasterItem: false,
    permissions: buildRolePermMap({
      master_item: { create: false, view: true, update: false, delete: false },
      purchase_requisition: { create: true, view: true, update: true, delete: false },
      purchase_order: { create: false, view: true, update: false, delete: false },
      receive_note: { create: false, view: true, update: false, delete: false },
      request_material: { create: true, view: true, update: true, delete: false },
    }),
    sidebarPermissions: [
      "dashboard",
      "stock-notification-master",
      "pr",
      "wh-req-material",
      "report",
    ],
  },
];

export function getStoredRoles(): RoleDefinition[] {
  if (typeof window === "undefined") return INITIAL_ROLES;
  try {
    const raw = localStorage.getItem(ROLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r) => {
          const init = INITIAL_ROLES.find((ir) => ir.code === r.code);
          return {
            ...r,
            sidebarPermissions:
              Array.isArray(r.sidebarPermissions) && r.sidebarPermissions.length > 0
                ? r.sidebarPermissions
                : (init?.sidebarPermissions || []),
          };
        });
      }
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ROLES));
  } catch {
    // ignore
  }
  return INITIAL_ROLES;
}

export function saveStoredRoles(roles: RoleDefinition[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore
  }
}

export function resolveRoleDefinition(
  roleCodeOrName: string | undefined | null,
  rolesList?: RoleDefinition[]
): RoleDefinition | undefined {
  if (!roleCodeOrName) return undefined;
  const list = rolesList || getStoredRoles();
  const q = roleCodeOrName.trim().toLowerCase();
  return list.find(
    (r) =>
      r.code.toLowerCase() === q ||
      r.name.toLowerCase() === q ||
      (q.includes("purchas") && r.code === "procurement") ||
      (q.includes("procurement") && r.code === "procurement") ||
      (q.includes("account") && r.code === "accounting") ||
      (q.includes("finance") && r.code === "accounting") ||
      (q.includes("master item") && r.code === "master_item_manager") ||
      (q.includes("approver 1") && r.code === "approver_tier1") ||
      (q.includes("approver 2") && r.code === "approver_tier2") ||
      (q.includes("warehouse") && r.code === "warehouse")
  );
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

export type ModulePermissions = Record<PermissionAction, boolean>;

export type UserPermissionMap = Record<string, ModulePermissions>;

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
 * Rule: If a user with Role X has permissions added or customized independently by admin (e.g. extra sidebar menus
 * or extra module actions), they are marked with an asterisk (*) next to their name.
 */
export function getCustomOverridesSummary(
  user: UserAccount,
  rolesList?: RoleDefinition[]
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

  // Check 1: Sidebar permissions overrides
  if (Array.isArray(user.sidebar_permissions) && !roleSidebar.includes("*")) {
    for (const menuId of user.sidebar_permissions) {
      if (!roleSidebar.includes(menuId)) {
        extraSidebarItems.push(menuId);
      }
    }
  }

  // Check 2: Action permissions overrides (CRUD / Approvals)
  const extraActionNames: string[] = [];

  if (Array.isArray(user.permissions)) {
    for (const p of user.permissions) {
      if (p === "*") continue;
      const parts = p.split(".");
      if (parts.length < 2) continue;
      const modKey = parts[0];
      const actKey = parts[1];

      const fullModId =
        modKey === "master_item"
          ? "master_item"
          : modKey === "pr"
          ? "purchase_requisition"
          : modKey === "po"
          ? "purchase_order"
          : modKey === "rn" || modKey === "bpb"
          ? "receive_note"
          : modKey === "rm"
          ? "request_material"
          : modKey;

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
  rolesList?: RoleDefinition[]
): boolean {
  return getCustomOverridesSummary(user, rolesList).hasOverrides;
}
