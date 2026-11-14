/**
 * GENIUSONE UI 2.0 — SuperAdmin User & Permission Administration
 * Full user management, sidebar menu access control, and granular document approval permissions.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/Button";
import { SearchField } from "../../components/ui/SearchField";
import { Pagination } from "../../components/ui/Pagination";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { StatusToggle } from "../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { useAuthPermission } from "../../context/AuthPermissionContext";
import { apiFetch } from "../../data/api";
import {
  APPROVAL_MODULES,
  PERMISSION_ACTIONS,
  type ApprovalModule,
  type ModulePermissions,
  type PermissionAction,
  type RoleDefinition,
  type UserAccount,
  type UserPermissionMap,
  convertPermissionMapToStrings,
  createDefaultPermissionMap,
  createEmptyModulePermissions,
  createFullModulePermissions,
  resolveRoleDefinition,
  hasCustomPermissionOverrides,
  getCustomOverridesSummary,
} from "../../types/permissions";
import {
  fetchRolesApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
} from "../../services/userPermissionApi";
import { ALL_SIDEBAR_MENU_ITEMS, type SidebarMenuItemDescriptor } from "../../config/navigation";
import { UserPermissionModals } from "./UserPermissionModals";

interface UserPermissionAdminProps {
  onNavigateAudit?: () => void;
}

export function UserPermissionAdmin({ onNavigateAudit }: UserPermissionAdminProps = {}) {
  const { currentUser, isSuperAdmin, refreshUsers, roles: contextRoles, refreshRoles } = useAuthPermission();

  // UI-03: Active Admin Sub-View ("users" vs "roles") & Role Definitions State
  const [activeAdminView, setActiveAdminView] = useState<"users" | "roles">("users");
  const [roles, setRoles] = useState<RoleDefinition[]>(() => contextRoles || []);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [activeRoleModalTab, setActiveRoleModalTab] = useState<"sidebar" | "actions">("sidebar");

  useEffect(() => {
    if (Array.isArray(contextRoles) && contextRoles.length > 0) {
      setRoles(contextRoles);
    }
  }, [contextRoles]);

  useEffect(() => {
    fetchRolesApi().then((dbRoles) => {
      if (Array.isArray(dbRoles)) {
        setRoles(dbRoles);
      }
    });
  }, []);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Alerts & Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Add User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "procurement",
    department_id: 1,
    isSuperAdmin: false,
    sidebarPreset: "all",
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit User Profile & Credentials Modal
  const [editingUserProfile, setEditingUserProfile] = useState<UserAccount | null>(null);
  const [editUserProfileData, setEditUserProfileData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "procurement",
    department_id: 1,
    status: 1 as 0 | 1,
    isSuperAdmin: false,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);

  // Enterprise Departments List (loaded from database)
  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([]);

  // Edit Permissions & Sidebar Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"sidebar" | "actions">("sidebar");
  const [permissionDraft, setPermissionDraft] = useState<UserPermissionMap | null>(null);
  const [sidebarDraft, setSidebarDraft] = useState<string[]>([]);
  const [isSubmittingPermissions, setIsSubmittingPermissions] = useState(false);

  // Collapsible / Minimize blocks state
  const [collapsedWorkflowModules, setCollapsedWorkflowModules] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const handleToggleModuleCollapse = (moduleId: string) => {
    setCollapsedWorkflowModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleToggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const handleApplyAllModulesPreset = (preset: "all" | "approver" | "crud" | "clear") => {
    if (!permissionDraft) return;
    setPermissionDraft((prev) => {
      if (!prev) return prev;
      const next: UserPermissionMap = { ...prev };
      for (const mod of APPROVAL_MODULES) {
        if (preset === "all") {
          next[mod.id] = createFullModulePermissions();
        } else if (preset === "approver") {
          next[mod.id] = {
            create: false,
            view: true,
            update: false,
            delete: false,
            approve_1: true,
            unapprove_1: true,
            approve_2: true,
            unapprove_2: true,
          };
        } else if (preset === "crud") {
          next[mod.id] = {
            create: true,
            view: true,
            update: true,
            delete: true,
            approve_1: false,
            unapprove_1: false,
            approve_2: false,
            unapprove_2: false,
          };
        } else {
          next[mod.id] = createEmptyModulePermissions();
        }
      }
      return next;
    });
  };

  // Delete User Confirmation
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Keyboard escape handler for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingUserProfile) setEditingUserProfile(null);
        else if (editingUser) setEditingUser(null);
        else if (isAddUserOpen) setIsAddUserOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingUserProfile, editingUser, isAddUserOpen]);

  // Load departments from backend API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiFetch("/api/exim/master/departments?per_page=100");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setDepartmentsList(
              json.data.map((d: any) => ({
                id: d.id,
                name: d.name,
              }))
            );
          }
        }
      } catch {
        // fallback to default list
      }
    };
    fetchDepartments();
  }, []);

  // Load users from backend API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/users?per_page=100");
      if (res.ok) {
        const json = await res.json();
        if (json?.status === "success" && Array.isArray(json.data)) {
          const mappedUsers = json.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            role_label: u.role_model?.label || u.role,
            department: u.department?.name || u.department || "General",
            department_id: u.departments_id || u.department_id || (u.department?.id ?? null),
            departments_id: u.departments_id || u.department_id || (u.department?.id ?? null),
            status: u.status === 1 || u.status === "active" ? "active" : "inactive",
            isSuperAdmin: Boolean(u.role === "superadmin" || u.is_super_admin),
            is_super_admin: Boolean(u.role === "superadmin" || u.is_super_admin),
            permissions: u.permissions || [],
            sidebar_permissions: u.sidebar_permissions || null,
            createdAt: u.created_at || "",
            updatedAt: u.updated_at || "",
          }));
          setUsers(mappedUsers);
          return;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtered and Paginated users
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q) ||
        (u.department || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Open Permission & Sidebar Modal for a user
  const handleOpenPermissions = (user: UserAccount) => {
    setEditingUser(user);
    setActiveModalTab("sidebar");

    const roleDef = resolveRoleDefinition(user.role, roles);

    // Initialize sidebar draft: if user has configured array, use it; if null, inherit from role!
    if (Array.isArray(user.sidebar_permissions)) {
      setSidebarDraft([...user.sidebar_permissions]);
    } else if (roleDef?.sidebarPermissions && roleDef.sidebarPermissions.length > 0) {
      if (roleDef.sidebarPermissions.includes("*")) {
        setSidebarDraft(ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id));
      } else {
        setSidebarDraft([...roleDef.sidebarPermissions]);
      }
    } else {
      // Default all items checked
      setSidebarDraft(ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id));
    }

    // Initialize action permissions draft
    let initialPerms: UserPermissionMap;
    if (user.permissions && typeof user.permissions === "object" && !Array.isArray(user.permissions)) {
      initialPerms = JSON.parse(JSON.stringify(user.permissions));
    } else {
      const permsArray = Array.isArray(user.permissions) ? user.permissions : [];
      const isSuper = user.isSuperAdmin || permsArray.includes("*");
      initialPerms = createDefaultPermissionMap(isSuper);

      if (!isSuper && permsArray.length > 0) {
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
          for (const act of PERMISSION_ACTIONS) {
            if (permsArray.includes(`${modKey}.${act.action}`) || permsArray.includes(`${mod.id}.${act.action}`)) {
              initialPerms[mod.id][act.action] = true;
            }
          }
        }
      } else if (!isSuper && roleDef) {
        // Inherit default permissions from the user's assigned Role (UI-03)
        initialPerms = JSON.parse(JSON.stringify(roleDef.permissions));
      }
    }
    setPermissionDraft(initialPerms);
  };

  // Reset a user's drafted permissions and sidebar to their assigned Role defaults
  const handleResetUserToRoleDefaults = () => {
    if (!editingUser) return;
    const roleDef = resolveRoleDefinition(editingUser.role, roles);
    if (!roleDef) {
      showFeedback("error", `Could not find definition for role '${editingUser.role}'.`);
      return;
    }

    if (roleDef.sidebarPermissions?.includes("*")) {
      setSidebarDraft(ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id));
    } else {
      setSidebarDraft([...(roleDef.sidebarPermissions || [])]);
    }

    setPermissionDraft(JSON.parse(JSON.stringify(roleDef.permissions)));
    showFeedback("success", `Permissions aligned with Role '${roleDef.name}'. Click 'Save Permissions' to persist changes.`);
  };

  // Toggle single sidebar item
  const handleToggleSidebarItem = (itemId: string) => {
    setSidebarDraft((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Select / Deselect section in sidebar
  const handleToggleSectionSidebar = (sectionName: string, selectAll: boolean) => {
    const sectionItemIds = ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === sectionName).map((i) => i.id);
    setSidebarDraft((prev) => {
      if (selectAll) {
        const set = new Set([...prev, ...sectionItemIds]);
        return Array.from(set);
      } else {
        return prev.filter((id) => !sectionItemIds.includes(id));
      }
    });
  };

  // Toggle all items within a subgroup
  const handleToggleSubgroupSidebar = (items: SidebarMenuItemDescriptor[], selectAll: boolean) => {
    const itemIds = items.map((i) => i.id);
    setSidebarDraft((prev) => {
      if (selectAll) {
        const set = new Set([...prev, ...itemIds]);
        return Array.from(set);
      } else {
        return prev.filter((id) => !itemIds.includes(id));
      }
    });
  };

  // Apply Sidebar Presets
  const handleApplySidebarPreset = (preset: "all" | "procurement" | "warehouse" | "clear") => {
    if (preset === "all") {
      setSidebarDraft(ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id));
    } else if (preset === "procurement") {
      setSidebarDraft(
        ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === "Dashboard" || i.section === "Procurement").map((i) => i.id)
      );
    } else if (preset === "warehouse") {
      setSidebarDraft(
        ALL_SIDEBAR_MENU_ITEMS.filter(
          (i) => i.section === "Dashboard" || i.section === "Warehouse" || i.section === "Exim"
        ).map((i) => i.id)
      );
    } else {
      setSidebarDraft([]);
    }
  };

  // Toggle single action permission
  const handleToggleSinglePermission = (module: ApprovalModule, action: PermissionAction) => {
    if (!permissionDraft) return;
    setPermissionDraft((prev) => {
      if (!prev) return prev;
      const currentVal = Boolean(prev[module]?.[action]);
      return {
        ...prev,
        [module]: {
          ...prev[module],
          [action]: !currentVal,
        },
      };
    });
  };

  // Batch action permission presets
  const handleSetModulePreset = (module: ApprovalModule, preset: "all" | "none" | "crud" | "approver") => {
    if (!permissionDraft) return;
    setPermissionDraft((prev) => {
      if (!prev) return prev;
      let newModPerms: ModulePermissions;

      if (preset === "all") {
        newModPerms = createFullModulePermissions();
      } else if (preset === "none") {
        newModPerms = createEmptyModulePermissions();
      } else if (preset === "crud") {
        newModPerms = {
          create: true,
          view: true,
          update: true,
          delete: true,
          approve_1: false,
          unapprove_1: false,
          approve_2: false,
          unapprove_2: false,
        };
      } else {
        newModPerms = {
          create: false,
          view: true,
          update: false,
          delete: false,
          approve_1: true,
          unapprove_1: true,
          approve_2: true,
          unapprove_2: true,
        };
      }

      return {
        ...prev,
        [module]: newModPerms,
      };
    });
  };

  // Save Permissions & Sidebar Access
  const handleSavePermissions = async () => {
    if (!editingUser || !permissionDraft) return;
    setIsSubmittingPermissions(true);

    const permissionStrings: string[] = [];
    if (editingUser.isSuperAdmin) {
      permissionStrings.push("*");
    } else {
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
        for (const act of PERMISSION_ACTIONS) {
          if (permissionDraft[mod.id]?.[act.action]) {
            permissionStrings.push(`${modKey}.${act.action}`);
          }
        }
      }
    }

    try {
      const res = await apiFetch(`/api/admin/users/${editingUser.id}/permissions`, {
        method: "POST",
        body: JSON.stringify({
          permissions: permissionStrings,
          sidebar_permissions: sidebarDraft,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.status === "success") {
        showFeedback("success", `Permissions and sidebar access updated successfully for ${editingUser.name}.`);
        loadUsers();
        refreshUsers();
        setEditingUser(null);
      } else {
        showFeedback("error", data?.message || "Failed to update permissions.");
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Error saving permissions to server.");
    } finally {
      setIsSubmittingPermissions(false);
    }
  };

  // Toggle user active / inactive status
  const handleToggleStatus = async (user: UserAccount) => {
    try {
      const res = await apiFetch(`/api/admin/users/${user.id}/toggle-status`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok && data?.status === "success") {
        showFeedback("success", `Account status changed for ${user.name}.`);
        loadUsers();
      } else {
        showFeedback("error", data?.message || "Failed to update status.");
      }
    } catch {
      showFeedback("error", "Error contacting server.");
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setIsSubmittingUser(true);

    let initialSidebar: string[] = ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id);
    if (newUserData.sidebarPreset === "procurement") {
      initialSidebar = ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === "Dashboard" || i.section === "Procurement").map(
        (i) => i.id
      );
    } else if (newUserData.sidebarPreset === "warehouse") {
      initialSidebar = ALL_SIDEBAR_MENU_ITEMS.filter(
        (i) => i.section === "Dashboard" || i.section === "Warehouse" || i.section === "Exim"
      ).map((i) => i.id);
    }

    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: newUserData.name.trim(),
          username: newUserData.username.trim(),
          email: newUserData.email.trim(),
          password: newUserData.password.trim() || "GeniusOne2026!",
          role: newUserData.isSuperAdmin ? "superadmin" : newUserData.role,
          department_id: newUserData.department_id || 1,
          status: 1,
          sidebar_permissions: initialSidebar,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.status === "success") {
        showFeedback("success", `User account created: ${newUserData.name} (@${newUserData.username}).`);
        loadUsers();
        refreshUsers();
        setIsAddUserOpen(false);
        setNewUserData({
          name: "",
          username: "",
          email: "",
          password: "",
          role: "procurement",
          department_id: 1,
          isSuperAdmin: false,
          sidebarPreset: "all",
        });
      } else {
        setAddUserError(data?.message || "Failed to create user account.");
      }
    } catch (err: any) {
      setAddUserError(err?.message || "Unexpected server error.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Open Edit User Profile Modal
  const handleOpenEditUserProfile = (user: UserAccount) => {
    setEditingUserProfile(user);
    setEditUserError(null);
    setShowEditPassword(false);

    let initialDeptId = 1;
    if (user.department_id) {
      initialDeptId = Number(user.department_id);
    } else if (user.departments_id) {
      initialDeptId = Number(user.departments_id);
    } else if (user.department) {
      const match = departmentsList.find(
        (d) => d.name.toLowerCase() === user.department?.toLowerCase()
      );
      if (match) initialDeptId = match.id;
    }

    setEditUserProfileData({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      password: "",
      department_id: initialDeptId,
      role: user.role || "procurement",
      status: user.status === "active" || user.status === 1 ? 1 : 0,
      isSuperAdmin: Boolean(user.isSuperAdmin || user.role === "superadmin" || user.id === 1),
    });
  };

  // Save Edited User Profile & Credentials
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserProfile) return;
    setEditUserError(null);

    const trimmedPassword = editUserProfileData.password.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      setEditUserError("New password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingEditUser(true);
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const payload: Record<string, any> = {
        name: editUserProfileData.name.trim(),
        username: editUserProfileData.username.trim(),
        email: editUserProfileData.email.trim(),
        role: editUserProfileData.isSuperAdmin ? "superadmin" : editUserProfileData.role,
        department_id: Number(editUserProfileData.department_id),
        status: editUserProfileData.status,
      };

      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      const res = await apiFetch(`/api/admin/users/${editingUserProfile.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data?.status === "success") {
        const roleChanged = editingUserProfile.role !== payload.role;
        if (roleChanged) {
          const selectedRole = resolveRoleDefinition(payload.role, roles);
          const derivedPermStrings = selectedRole ? convertPermissionMapToStrings(selectedRole.permissions) : [];
          const newSidebarPerms = selectedRole?.sidebarPermissions
            ? (selectedRole.sidebarPermissions.includes("*")
                ? ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id)
                : [...selectedRole.sidebarPermissions])
            : ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id);

          try {
            await apiFetch(`/api/admin/users/${editingUserProfile.id}/permissions`, {
              method: "POST",
              body: JSON.stringify({
                permissions: derivedPermStrings,
                sidebar_permissions: newSidebarPerms,
              }),
            });
          } catch {
            // ignore
          }
        }
        showFeedback("success", `User profile for '${editUserProfileData.name}' updated successfully.`);
        loadUsers();
        refreshUsers();
        setEditingUserProfile(null);
      } else {
        const errorMsg =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(" ") : "Failed to update user profile.");
        setEditUserError(errorMsg);
      }
    } catch (err: any) {
      setEditUserError(err?.message || "Unexpected server error.");
    } finally {
      setIsSubmittingEditUser(false);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data?.status === "success") {
        showFeedback("success", `User ${userToDelete.name} has been removed.`);
        loadUsers();
        setUserToDelete(null);
      } else {
        showFeedback("error", data?.message || "Cannot delete user.");
      }
    } catch {
      showFeedback("error", "Error deleting user.");
    } finally {
      setIsDeleting(false);
    }
  };

  // =========================================================================
  // UI-03: ROLE & PERMISSION MANAGEMENT HANDLERS
  // =========================================================================
  const handleAssignRoleDirectly = async (user: UserAccount, newRoleCode: string) => {
    const selectedRole = resolveRoleDefinition(newRoleCode, roles);
    const derivedPermStrings = selectedRole
      ? convertPermissionMapToStrings(selectedRole.permissions)
      : [];

    const newSidebarPerms = selectedRole?.sidebarPermissions
      ? (selectedRole.sidebarPermissions.includes("*")
          ? ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id)
          : [...selectedRole.sidebarPermissions])
      : ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id);

    // Optimistically update local users table
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              role: newRoleCode,
              role_label: selectedRole ? selectedRole.name : newRoleCode,
              permissions: derivedPermStrings,
              sidebar_permissions: newSidebarPerms,
            }
          : u
      )
    );

    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: user.name,
          username: user.username,
          email: user.email,
          role: newRoleCode,
          department_id: Number(user.department_id || user.departments_id || 1),
          status: user.status === "active" || user.status === 1 ? 1 : 0,
        }),
      });
      await apiFetch(`/api/admin/users/${user.id}/permissions`, {
        method: "POST",
        body: JSON.stringify({
          permissions: derivedPermStrings,
          sidebar_permissions: newSidebarPerms,
        }),
      });
    } catch {
      // local state already updated
    }

    showFeedback(
      "success",
      `Role '${selectedRole ? selectedRole.name : newRoleCode}' assigned to ${user.name}. All role permissions & sidebar menus applied automatically.`
    );
    refreshUsers();
  };

  const handleOpenCreateRole = () => {
    setIsCreatingRole(true);
    setActiveRoleModalTab("sidebar");
    setEditingRole({
      id: `role_${Date.now()}`,
      code: "",
      name: "",
      description: "",
      canManageMasterItem: false,
      permissions: createDefaultPermissionMap(false),
      sidebarPermissions: ["dashboard", "stock-notification-master"],
    });
  };

  const handleOpenEditRole = (role: RoleDefinition) => {
    setIsCreatingRole(false);
    setActiveRoleModalTab("sidebar");
    const cloned = JSON.parse(JSON.stringify(role));
    if (!Array.isArray(cloned.sidebarPermissions)) {
      cloned.sidebarPermissions = [];
    }
    setEditingRole(cloned);
  };

  const handleToggleRolePermission = (mod: ApprovalModule, act: PermissionAction) => {
    if (!editingRole) return;
    setEditingRole((prev) => {
      if (!prev) return prev;
      const curMod = prev.permissions[mod] || createEmptyModulePermissions();
      const nextVal = !curMod[act];
      const nextPerms: UserPermissionMap = {
        ...prev.permissions,
        [mod]: {
          ...curMod,
          [act]: nextVal,
        },
      };
      return {
        ...prev,
        canManageMasterItem:
          mod === "master_item" && (act === "create" || act === "update")
            ? nextVal || Boolean(nextPerms.master_item?.create || nextPerms.master_item?.update)
            : prev.canManageMasterItem,
        permissions: nextPerms,
      };
    });
  };

  const handleToggleMasterItemAccessForRole = (enabled: boolean) => {
    if (!editingRole) return;
    setEditingRole((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        canManageMasterItem: enabled,
        permissions: {
          ...prev.permissions,
          master_item: {
            ...(prev.permissions.master_item || createEmptyModulePermissions()),
            create: enabled,
            view: true,
            update: enabled,
          },
        },
      };
    });
  };

  const handleToggleRoleSidebarItem = (itemId: string) => {
    if (!editingRole) return;
    setEditingRole((prev) => {
      if (!prev) return prev;
      const curList = prev.sidebarPermissions || [];
      const nextList = curList.includes(itemId)
        ? curList.filter((id) => id !== itemId)
        : [...curList, itemId];
      return {
        ...prev,
        sidebarPermissions: nextList,
      };
    });
  };

  const handleToggleRoleSectionSidebar = (sectionName: string, selectAll: boolean) => {
    if (!editingRole) return;
    const sectionItemIds = ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === sectionName).map((i) => i.id);
    setEditingRole((prev) => {
      if (!prev) return prev;
      const curList = prev.sidebarPermissions || [];
      const nextList = selectAll
        ? Array.from(new Set([...curList, ...sectionItemIds]))
        : curList.filter((id) => !sectionItemIds.includes(id));
      return {
        ...prev,
        sidebarPermissions: nextList,
      };
    });
  };

  const handleToggleRoleSubgroupSidebar = (items: SidebarMenuItemDescriptor[], selectAll: boolean) => {
    if (!editingRole) return;
    const itemIds = items.map((i) => i.id);
    setEditingRole((prev) => {
      if (!prev) return prev;
      const curList = prev.sidebarPermissions || [];
      const nextList = selectAll
        ? Array.from(new Set([...curList, ...itemIds]))
        : curList.filter((id) => !itemIds.includes(id));
      return {
        ...prev,
        sidebarPermissions: nextList,
      };
    });
  };

  const handleApplyRoleSidebarPreset = (preset: "all" | "procurement" | "warehouse" | "clear") => {
    if (!editingRole) return;
    let nextList: string[] = [];
    if (preset === "all") {
      nextList = ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id);
    } else if (preset === "procurement") {
      nextList = ALL_SIDEBAR_MENU_ITEMS.filter(
        (i) => i.section === "Dashboard" || i.section === "Procurement"
      ).map((i) => i.id);
    } else if (preset === "warehouse") {
      nextList = ALL_SIDEBAR_MENU_ITEMS.filter(
        (i) => i.section === "Dashboard" || i.section === "Warehouse" || i.section === "Exim"
      ).map((i) => i.id);
    } else {
      nextList = [];
    }
    setEditingRole((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sidebarPermissions: nextList,
      };
    });
  };

  const handleApplyRoleAllModulesPreset = (preset: "all" | "approver" | "crud" | "clear") => {
    if (!editingRole) return;
    setEditingRole((prev) => {
      if (!prev) return prev;
      const nextPerms: UserPermissionMap = { ...prev.permissions };
      for (const mod of APPROVAL_MODULES) {
        if (preset === "all") {
          nextPerms[mod.id] = createFullModulePermissions();
        } else if (preset === "approver") {
          nextPerms[mod.id] = {
            create: false,
            view: true,
            update: false,
            delete: false,
            approve_1: true,
            unapprove_1: true,
            approve_2: true,
            unapprove_2: true,
          };
        } else if (preset === "crud") {
          nextPerms[mod.id] = {
            create: true,
            view: true,
            update: true,
            delete: true,
            approve_1: false,
            unapprove_1: false,
            approve_2: false,
            unapprove_2: false,
          };
        } else {
          nextPerms[mod.id] = createEmptyModulePermissions();
        }
      }
      return {
        ...prev,
        permissions: nextPerms,
      };
    });
  };

  const handleSaveRoleDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    const cleanName = editingRole.name.trim();
    if (!cleanName) return;
    const cleanCode =
      editingRole.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") ||
      cleanName.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const finalRole: RoleDefinition = {
      ...editingRole,
      name: cleanName,
      code: cleanCode,
      sidebarPermissions: editingRole.sidebarPermissions || [],
    };

    try {
      const isExistingDbRole = !isCreatingRole && Number.isInteger(Number(finalRole.id)) && Number(finalRole.id) > 0;
      const savedRole = isExistingDbRole
        ? await updateRoleApi(finalRole.id, finalRole)
        : await createRoleApi(finalRole);

      if (!savedRole) {
        showFeedback("error", "Failed to save role definition.");
        return;
      }

      const nextRoles = isCreatingRole
        ? [...roles, savedRole]
        : roles.map((r) => (r.id === finalRole.id || r.code === finalRole.code ? savedRole : r));

      setRoles(nextRoles);
      refreshRoles();

      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.role === savedRole.code && !hasCustomPermissionOverrides(u, nextRoles)) {
            return {
              ...u,
              sidebar_permissions: savedRole.sidebarPermissions || null,
            };
          }
          return u;
        })
      );

      setEditingRole(null);
      showFeedback("success", `Role '${savedRole.name}' and its sidebar & approval permissions have been saved.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to save role definition.");
    }
  };

  const handleDeleteRoleDefinition = async (role: RoleDefinition) => {
    if (role.code === "superadmin") return;
    try {
      const ok = await deleteRoleApi(role.id);
      if (!ok) {
        showFeedback("error", "Failed to delete role.");
        return;
      }
      const nextRoles = roles.filter((r) => r.id !== role.id);
      setRoles(nextRoles);
      refreshRoles();
      showFeedback("success", `Role '${role.name}' removed.`);
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Failed to delete role.");
    }
  };

  // Hierarchical sidebar items for display in Tab 1: Section -> Group -> Items[]
  const groupedSidebarStructure = useMemo(() => {
    const sectionOrder = ["Dashboard", "Procurement", "Exim", "Warehouse", "Production"];
    const structure: Record<string, Record<string, SidebarMenuItemDescriptor[]>> = {};

    for (const sec of sectionOrder) {
      structure[sec] = {};
    }

    for (const item of ALL_SIDEBAR_MENU_ITEMS) {
      const sec = item.section || "General";
      if (!structure[sec]) structure[sec] = {};
      const grp = item.group || "General";
      if (!structure[sec][grp]) structure[sec][grp] = [];
      structure[sec][grp].push(item);
    }
    return structure;
  }, []);

  return (
    <div className="user-admin-page">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`user-admin-feedback user-admin-feedback--${feedback.type}`}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name={feedback.type === "success" ? "check" : "alertTriangle"} size={16} />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            className="user-admin-feedback__close"
            onClick={() => setFeedback(null)}
            title="Dismiss notice"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* SuperAdmin Governance Navigation Tabs */}
      <div className="gov-admin-tabs">
        <button
          type="button"
          className={`gov-admin-tab ${activeAdminView === "users" ? "gov-admin-tab--active" : ""}`}
          onClick={() => setActiveAdminView("users")}
          title="Assign Roles to User Accounts"
        >
          <span>User Accounts (Role Assignment)</span>
        </button>
        <button
          type="button"
          className={`gov-admin-tab ${activeAdminView === "roles" ? "gov-admin-tab--active" : ""}`}
          onClick={() => setActiveAdminView("roles")}
          title="Manage Roles, CRUD, Approve/UnApprove, and Master Item Permissions"
        >
          <span>Role & Permission Management</span>
        </button>
        <button
          type="button"
          className="gov-admin-tab"
          onClick={() => {
            if (onNavigateAudit) onNavigateAudit();
            else window.location.href = "/admin/audit-logs";
          }}
          title="View System Audit Trail & History"
        >
          <span>System Audit Trail & History</span>
        </button>
      </div>

      {/* =====================================================================
          VIEW B: ROLE & PERMISSION MANAGEMENT (UI-03)
          ===================================================================== */}
      {activeAdminView === "roles" && (
        <div className="panel table-panel" style={{ marginBottom: "16px" }}>
          <div className="user-admin-toolbar">
            <div>
              <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
                Role & Permission Matrix
              </strong>
            </div>
            <div className="user-admin-toolbar__actions">
              <Button variant="primary" onClick={handleOpenCreateRole}>
                Add New Role
              </Button>
            </div>
          </div>

          <div className="table-frame">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "48px", textAlign: "center" }}>No</th>
                    <th style={{ minWidth: "190px" }}>Role Name & Code</th>
                    <th style={{ minWidth: "220px" }}>Description</th>
                    <th style={{ width: "155px", textAlign: "center" }}>Master Item Access</th>
                    <th style={{ width: "160px", textAlign: "center" }}>Visible Sidebar Menus</th>
                    <th style={{ minWidth: "260px" }}>Configured Permissions (CRUD & Approval)</th>
                    <th style={{ width: "150px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r, rIdx) => {
                    const hasMasterItem =
                      r.canManageMasterItem ||
                      Boolean(r.permissions.master_item?.create || r.permissions.master_item?.update);

                    // Summarize capabilities across modules
                    const allModPerms = Object.values(r.permissions || {});
                    const hasCreate = allModPerms.some((m) => m.create);
                    const hasView = allModPerms.some((m) => m.view);
                    const hasUpdate = allModPerms.some((m) => m.update);
                    const hasDelete = allModPerms.some((m) => m.delete);
                    const hasApprove = allModPerms.some((m) => m.approve_1 || m.approve_2);
                    const hasUnapprove = allModPerms.some((m) => m.unapprove_1 || m.unapprove_2);

                    return (
                      <tr key={r.id}>
                        <td style={{ textAlign: "center", fontWeight: 600, color: "var(--muted)" }}>
                          {rIdx + 1}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <strong style={{ color: "var(--ink)", fontSize: "12.5px" }}>{r.name}</strong>
                            <span className="user-username-badge" style={{ width: "fit-content" }}>
                              {r.code}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--ink-soft)" }}>{r.description}</td>
                        <td style={{ textAlign: "center" }}>
                          {hasMasterItem ? (
                            <Badge tone="green">Master Item Enabled</Badge>
                          ) : (
                            <Badge tone="gray">View Only</Badge>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {r.sidebarPermissions?.includes("*") ? (
                            <Badge tone="purple">All Menus (*)</Badge>
                          ) : (
                            <Badge tone="blue">
                              {r.sidebarPermissions?.length || 0} Menus Granted
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {hasCreate && <Badge tone="blue">Create</Badge>}
                            {hasView && <Badge tone="gray">View</Badge>}
                            {hasUpdate && <Badge tone="blue">Update</Badge>}
                            {hasDelete && <Badge tone="orange">Delete</Badge>}
                            {hasApprove && <Badge tone="green">Approve</Badge>}
                            {hasUnapprove && <Badge tone="purple">UnApprove</Badge>}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="user-row-actions">
                            <button
                              type="button"
                              className="btn-perm-action"
                              onClick={() => handleOpenEditRole(r)}
                              title={`Configure permissions for role ${r.name}`}
                            >
                              Edit Permissions
                            </button>
                            {r.code !== "superadmin" && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                onClick={() => handleDeleteRoleDefinition(r)}
                                title={`Delete role ${r.name}`}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card (Single Unified Container) */}
      {activeAdminView === "users" && (
      <div className="panel table-panel">
        {/* Table Toolbar: Search on Left, Add New User on Right */}
        <div className="user-admin-toolbar">
          <div className="user-admin-toolbar__search">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search user by name, username, email, department, or role..."
            />
          </div>

          <div className="user-admin-toolbar__actions">
            <Button variant="primary" onClick={() => setIsAddUserOpen(true)}>
              Add New User
            </Button>
          </div>
        </div>

        {/* Master User Listing Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "200px" }}>User Account</th>
                  <th style={{ minWidth: "170px" }}>Username / Email</th>
                  <th style={{ minWidth: "160px" }}>Role & Department</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                  <th style={{ minWidth: "220px" }}>Sidebar & Permissions</th>
                  <th style={{ width: "230px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                      Loading enterprise users from database...
                    </td>
                  </tr>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, idx) => {
                    const rowNumber = (safePage - 1) * pageSize + idx + 1;
                    const sidebarCount = Array.isArray(user.sidebar_permissions)
                      ? user.sidebar_permissions.length
                      : ALL_SIDEBAR_MENU_ITEMS.length;

                    return (
                      <tr key={user.id}>
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className={`user-avatar ${user.isSuperAdmin ? "user-avatar--super" : ""}`}>
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="user-identity">
                              <div className="user-name-row">
                                <span className="user-full-name">
                                  {user.name}
                                  {hasCustomPermissionOverrides(user, roles) && (
                                    <span
                                      className="custom-override-star"
                                      title={`Custom Permissions Active: ${user.name} has independent permissions customized beyond Role '${resolveRoleDefinition(user.role, roles)?.name || user.role}'.`}
                                    >
                                      *
                                    </span>
                                  )}
                                </span>
                                {user.isSuperAdmin && (
                                  <Badge tone="purple" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                    SuperAdmin
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="user-identity">
                            <span className="user-username-badge">@{user.username}</span>
                            <span className="user-email-text">{user.email}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-identity" style={{ gap: "4px", minWidth: "180px" }}>
                            <CustomSelect
                              value={user.isSuperAdmin ? "superadmin" : user.role}
                              disabled={user.isSuperAdmin}
                              onChange={(val) => handleAssignRoleDirectly(user, val)}
                              options={[
                                ...roles.map((r) => ({
                                  value: r.code,
                                  label: r.name,
                                })),
                                ...(!roles.some((r) => r.code === user.role) && user.role
                                  ? [{ value: user.role, label: user.role_label || user.role }]
                                  : []),
                              ]}
                            />
                            <span className="user-dept-text">{user.department}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <StatusToggle
                            active={user.status === "active"}
                            onToggle={() => !user.isSuperAdmin && handleToggleStatus(user)}
                            title={
                              user.isSuperAdmin
                                ? "SuperAdmin accounts cannot be deactivated"
                                : "Click to toggle active/inactive status"
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                            {user.isSuperAdmin ? (
                              <Badge tone="purple">Full Master Access (*)</Badge>
                            ) : (
                              <>
                                <Badge tone="blue">
                                  Role: {resolveRoleDefinition(user.role, roles)?.name || user.role_label || user.role}
                                </Badge>
                                {hasCustomPermissionOverrides(user, roles) && (
                                  <span
                                    className="perm-override-badge"
                                    title="Custom permissions configured beyond assigned role"
                                  >
                                    <Icon name="star" size={10} />
                                    Custom Overrides
                                  </span>
                                )}
                                {(resolveRoleDefinition(user.role, roles)?.canManageMasterItem ||
                                  resolveRoleDefinition(user.role, roles)?.permissions?.master_item?.create) && (
                                  <Badge tone="green">Master Item Access</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="user-row-actions">
                            <button
                              type="button"
                              className="btn-action-edit"
                              title={`Edit user profile & credentials for ${user.name}`}
                              onClick={() => handleOpenEditUserProfile(user)}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-perm-action"
                              onClick={() => handleOpenPermissions(user)}
                              title="Configure visible sidebar menus and approval rights"
                            >
                              Permissions & Sidebar
                            </button>
                            {!user.isSuperAdmin ? (
                              <button
                                type="button"
                                className="btn-action-delete"
                                title={`Delete user ${user.name}`}
                                onClick={() => setUserToDelete(user)}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            ) : (
                              <span style={{ width: "30px", height: "30px", display: "inline-block", flexShrink: 0 }} aria-hidden="true" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No user accounts found matching your search.</strong>
                        <span>Try adjusting your search criteria or create a new user.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Unified Table Bottom Pagination Controls */}
          <Pagination
            totalRecords={filteredUsers.length}
            currentPage={safePage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
      )}

      {/* =====================================================================
          MODAL 0: CREATE / EDIT ROLE & PERMISSIONS (UI-03)
          ===================================================================== */}
      {editingRole && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingRole(null);
          }}
        >
          <div className="dialog-card perm-dialog-card" style={{ maxWidth: "860px" }}>
            <div className="dialog-card__header">
              <div>
                <h3>{isCreatingRole ? "Create New Role" : `Edit Role: ${editingRole.name}`}</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Configure visible sidebar navigation menus, document CRUD permissions, and multi-tier approval authorizations.
                </p>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setEditingRole(null)}
                title="Close"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Modal Tabs for Role Configuration */}
            <div className="perm-modal-tabs">
              <button
                type="button"
                className={`perm-modal-tab ${activeRoleModalTab === "sidebar" ? "active" : ""}`}
                onClick={() => setActiveRoleModalTab("sidebar")}
              >
                <span>Sidebar Navigation Access</span>
                <span className="perm-modal-tab__badge">
                  {(editingRole.sidebarPermissions || []).includes("*")
                    ? "All"
                    : `${(editingRole.sidebarPermissions || []).length} / ${ALL_SIDEBAR_MENU_ITEMS.length}`}
                </span>
              </button>

              <button
                type="button"
                className={`perm-modal-tab ${activeRoleModalTab === "actions" ? "active" : ""}`}
                onClick={() => setActiveRoleModalTab("actions")}
              >
                <span>Document & Workflow Approvals</span>
                <span className="perm-modal-tab__badge">CRUD & Approvals</span>
              </button>
            </div>

            <form onSubmit={handleSaveRoleDefinition}>
              <div className="perm-modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div className="form-field">
                    <label className="form-label">
                      Role Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Purchasing, Accounting, Master Item Manager"
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Role Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. purchasing, accounting, master_item"
                      value={editingRole.code}
                      disabled={!isCreatingRole && editingRole.code === "superadmin"}
                      onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value })}
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Role Description</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Describe the responsibilities and module scope of this role"
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* TAB 1: SIDEBAR NAVIGATION MENUS */}
                {activeRoleModalTab === "sidebar" && (
                  <>
                    <div className="role-sidebar-notice">
                      <Icon name="info" size={15} />
                      <span>
                        Users assigned to <strong>{editingRole.name || "this role"}</strong> will automatically inherit these visible sidebar menus unless overridden individually by SuperAdmin.
                      </span>
                    </div>

                    {/* Preset Bar */}
                    <div className="sidebar-preset-bar">
                      <span className="sidebar-preset-bar__label">Quick Presets:</span>
                      <div className="sidebar-preset-bar__buttons">
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleSidebarPreset("all")}
                        >
                          Grant All Menus
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleSidebarPreset("procurement")}
                        >
                          Procurement Only
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleSidebarPreset("warehouse")}
                        >
                          Warehouse & Exim Only
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleSidebarPreset("clear")}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Grouped Section Cards with Subgroups */}
                    {Object.entries(groupedSidebarStructure).map(([sectionName, subGroups]) => {
                      const allSectionItems = Object.values(subGroups).flat();
                      if (allSectionItems.length === 0) return null;

                      const roleSidebar = editingRole.sidebarPermissions || [];
                      const isSuper = roleSidebar.includes("*");
                      const allSelected = isSuper || allSectionItems.every((i) => roleSidebar.includes(i.id));
                      const enabledCount = isSuper
                        ? allSectionItems.length
                        : allSectionItems.filter((i) => roleSidebar.includes(i.id)).length;
                      const isSectionCollapsed = Boolean(collapsedSections[`role_${sectionName}`]);

                      return (
                        <div
                          key={sectionName}
                          className={`perm-section-card ${isSectionCollapsed ? "perm-section-card--collapsed" : ""}`}
                        >
                          <div
                            className="perm-section-header"
                            onClick={() => handleToggleSectionCollapse(`role_${sectionName}`)}
                            title={isSectionCollapsed ? "Click to expand section" : "Click to minimize section"}
                          >
                            <span className="perm-section-title">
                              <span>{sectionName} Section</span>
                              <Badge tone={enabledCount === allSectionItems.length ? "blue" : enabledCount > 0 ? "gray" : "gray"}>
                                {enabledCount} / {allSectionItems.length} Active
                              </Badge>
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button
                                type="button"
                                className="perm-preset-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleRoleSectionSidebar(sectionName, !allSelected);
                                }}
                              >
                                {allSelected ? "Deselect All in Section" : "Select All in Section"}
                              </button>
                            </div>
                          </div>

                          {!isSectionCollapsed && (
                            <>
                              {Object.entries(subGroups).map(([groupName, items]) => {
                                const isGroupAllSelected = items.every((i) => isSuper || roleSidebar.includes(i.id));
                                const groupEnabledCount = isSuper
                                  ? items.length
                                  : items.filter((i) => roleSidebar.includes(i.id)).length;

                                return (
                                  <div key={groupName} className="perm-subgroup-block">
                                    <div className="perm-subgroup-header">
                                      <span className="perm-subgroup-title">
                                        <span>{groupName}</span>
                                        <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: 500 }}>
                                          ({groupEnabledCount}/{items.length} active)
                                        </span>
                                      </span>
                                      {items.length > 1 && (
                                        <button
                                          type="button"
                                          className="perm-subgroup-toggle-btn"
                                          onClick={() => handleToggleRoleSubgroupSidebar(items, !isGroupAllSelected)}
                                        >
                                          {isGroupAllSelected ? "Deselect" : "Select All"}
                                        </button>
                                      )}
                                    </div>

                                    <div className="perm-section-grid">
                                      {items.map((item) => {
                                        const isChecked = isSuper || roleSidebar.includes(item.id);
                                        return (
                                          <label
                                            key={item.id}
                                            className={`perm-menu-item ${isChecked ? "perm-menu-item--checked" : ""}`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => handleToggleRoleSidebarItem(item.id)}
                                            />
                                            <div className="perm-menu-item__details">
                                              <span className="perm-menu-item__name">{item.label}</span>
                                              <span className="perm-menu-item__group">{item.group || sectionName}</span>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* TAB 2: ACTIONS & APPROVALS */}
                {activeRoleModalTab === "actions" && (
                  <>
                    <div
                      className="form-field"
                      style={{
                        padding: "10px 14px",
                        background: "#f8fafc",
                        border: "1px solid var(--line)",
                        borderRadius: "6px",
                        marginBottom: "14px",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px" }}>
                        <input
                          type="checkbox"
                          checked={editingRole.canManageMasterItem}
                          onChange={(e) => handleToggleMasterItemAccessForRole(e.target.checked)}
                        />
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                          Authorize Role to Add & Manage Master Item (Purchasing, Accounting, or Master Item Specialist)
                        </span>
                      </label>
                    </div>

                    {/* Presets Toolbar for Actions */}
                    <div className="sidebar-preset-bar" style={{ marginBottom: "14px" }}>
                      <span className="sidebar-preset-bar__label">Action Presets:</span>
                      <div className="sidebar-preset-bar__buttons">
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleAllModulesPreset("all")}
                        >
                          Grant All Actions
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleAllModulesPreset("approver")}
                        >
                          Approver Authority Only
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleAllModulesPreset("crud")}
                        >
                          CRUD Only
                        </button>
                        <button
                          type="button"
                          className="perm-preset-btn"
                          onClick={() => handleApplyRoleAllModulesPreset("clear")}
                        >
                          Clear All Actions
                        </button>
                      </div>
                    </div>

                    {/* Permission Matrix Table per Module */}
                    <div className="table-frame">
                      <div className="table-scroll">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ minWidth: "180px" }}>Module</th>
                              <th style={{ textAlign: "center" }}>Create</th>
                              <th style={{ textAlign: "center" }}>View</th>
                              <th style={{ textAlign: "center" }}>Update</th>
                              <th style={{ textAlign: "center" }}>Delete</th>
                              <th style={{ textAlign: "center" }}>Approve 1</th>
                              <th style={{ textAlign: "center" }}>UnApprove 1</th>
                              <th style={{ textAlign: "center" }}>Approve 2</th>
                              <th style={{ textAlign: "center" }}>UnApprove 2</th>
                            </tr>
                          </thead>
                          <tbody>
                            {APPROVAL_MODULES.map((mod) => {
                              const mp = editingRole.permissions[mod.id] || createEmptyModulePermissions();
                              return (
                                <tr key={mod.id}>
                                  <td>
                                    <strong>{mod.label}</strong>
                                    <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{mod.category}</div>
                                  </td>
                                  {PERMISSION_ACTIONS.map((act) => (
                                    <td key={act.action} style={{ textAlign: "center" }}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(mp[act.action])}
                                        onChange={() => handleToggleRolePermission(mod.id, act.action)}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="dialog-card__footer">
                <Button variant="secondary" type="button" onClick={() => setEditingRole(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UserPermissionModals
        isAddUserOpen={isAddUserOpen}
        setIsAddUserOpen={setIsAddUserOpen}
        isSubmittingUser={isSubmittingUser}
        handleCreateUser={handleCreateUser}
        addUserError={addUserError}
        newUserData={newUserData}
        setNewUserData={setNewUserData}
        departmentsList={departmentsList}
        roles={roles}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        permissionDraft={permissionDraft}
        isSubmittingPermissions={isSubmittingPermissions}
        handleResetUserToRoleDefaults={handleResetUserToRoleDefaults}
        activeModalTab={activeModalTab}
        setActiveModalTab={setActiveModalTab}
        sidebarDraft={sidebarDraft}
        handleApplySidebarPreset={handleApplySidebarPreset}
        groupedSidebarStructure={groupedSidebarStructure}
        collapsedSections={collapsedSections}
        handleToggleSectionCollapse={handleToggleSectionCollapse}
        handleToggleSectionSidebar={handleToggleSectionSidebar}
        handleToggleSubgroupSidebar={handleToggleSubgroupSidebar}
        handleToggleSidebarItem={handleToggleSidebarItem}
        handleApplyAllModulesPreset={handleApplyAllModulesPreset}
        collapsedWorkflowModules={collapsedWorkflowModules}
        handleToggleModuleCollapse={handleToggleModuleCollapse}
        handleSetModulePreset={handleSetModulePreset}
        handleToggleSinglePermission={handleToggleSinglePermission}
        handleSavePermissions={handleSavePermissions}
        editingUserProfile={editingUserProfile}
        setEditingUserProfile={setEditingUserProfile}
        isSubmittingEditUser={isSubmittingEditUser}
        handleSaveEditUser={handleSaveEditUser}
        editUserError={editUserError}
        editUserProfileData={editUserProfileData}
        setEditUserProfileData={setEditUserProfileData}
        showEditPassword={showEditPassword}
        setShowEditPassword={setShowEditPassword}
        userToDelete={userToDelete}
        setUserToDelete={setUserToDelete}
        handleConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}

export default UserPermissionAdmin;
