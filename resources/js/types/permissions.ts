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

export type UserPermissionMap = Record<ApprovalModule, ModulePermissions>;

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
