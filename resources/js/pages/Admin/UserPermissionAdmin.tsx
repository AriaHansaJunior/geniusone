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
  getStoredRoles,
  resolveRoleDefinition,
  saveStoredRoles,
  hasCustomPermissionOverrides,
  getCustomOverridesSummary,
} from "../../types/permissions";
import { ALL_SIDEBAR_MENU_ITEMS, type SidebarMenuItemDescriptor } from "../../config/navigation";

interface UserPermissionAdminProps {
  onNavigateAudit?: () => void;
}

export function UserPermissionAdmin({ onNavigateAudit }: UserPermissionAdminProps = {}) {
  const { currentUser, isSuperAdmin, refreshUsers } = useAuthPermission();

  // UI-03: Active Admin Sub-View ("users" vs "roles") & Role Definitions State
  const [activeAdminView, setActiveAdminView] = useState<"users" | "roles">("users");
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getStoredRoles());
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [activeRoleModalTab, setActiveRoleModalTab] = useState<"sidebar" | "actions">("sidebar");

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

  // Enterprise Departments List
  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([
    { id: 1, name: "Produksi & Operasional" },
    { id: 2, name: "Produksi & Smelting" },
    { id: 3, name: "Maintenance & Engineering" },
    { id: 4, name: "HSE & K3" },
    { id: 5, name: "PPIC & Logistik" },
  ]);

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
      const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
      try {
        const res = await fetch("/api/exim/master/departments?per_page=100", {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        });
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
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch("/api/admin/users?per_page=100", {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
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

    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/toggle-status`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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

    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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

      const res = await fetch(`/api/admin/users/${editingUserProfile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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
            await fetch(`/api/admin/users/${editingUserProfile.id}/permissions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              credentials: "include",
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
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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

    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: user.name,
          username: user.username,
          email: user.email,
          role: newRoleCode,
          department_id: Number(user.department_id || user.departments_id || 1),
          status: user.status === "active" || user.status === 1 ? 1 : 0,
        }),
      });
      await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
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
      const init = INITIAL_ROLES.find((ir) => ir.code === role.code);
      cloned.sidebarPermissions = init?.sidebarPermissions || [];
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

    const nextRoles = isCreatingRole
      ? [...roles, finalRole]
      : roles.map((r) => (r.id === finalRole.id ? finalRole : r));

    setRoles(nextRoles);
    saveStoredRoles(nextRoles);

    // Propagate updated role sidebar & permissions to users assigned to this role who don't have custom overrides
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.role === finalRole.code && !hasCustomPermissionOverrides(u, nextRoles)) {
          return {
            ...u,
            sidebar_permissions: finalRole.sidebarPermissions || null,
          };
        }
        return u;
      })
    );

    // Persist to backend API if applicable
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
    try {
      const isExistingDbRole = Number.isInteger(Number(finalRole.id)) && Number(finalRole.id) > 0;
      if (isExistingDbRole) {
        await fetch(`/api/admin/roles/${finalRole.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            name: finalRole.code,
            label: finalRole.name,
            description: finalRole.description,
            sidebar_permissions: finalRole.sidebarPermissions,
            permissions: convertPermissionMapToStrings(finalRole.permissions),
          }),
        });
      }
    } catch {
      // Local storage is already updated
    }

    setEditingRole(null);
    showFeedback("success", `Role '${finalRole.name}' and its sidebar & approval permissions have been saved.`);
  };

  const handleDeleteRoleDefinition = (role: RoleDefinition) => {
    if (role.code === "superadmin") return;
    const nextRoles = roles.filter((r) => r.id !== role.id);
    setRoles(nextRoles);
    saveStoredRoles(nextRoles);
    showFeedback("success", `Role '${role.name}' removed.`);
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
          <Icon name="user" size={14} />
          <span>User Accounts (Role Assignment)</span>
        </button>
        <button
          type="button"
          className={`gov-admin-tab ${activeAdminView === "roles" ? "gov-admin-tab--active" : ""}`}
          onClick={() => setActiveAdminView("roles")}
          title="Manage Roles, CRUD, Approve/UnApprove, and Master Item Permissions"
        >
          <Icon name="shield" size={14} />
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
          <Icon name="history" size={14} />
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
              <Button variant="primary" icon="plus" onClick={handleOpenCreateRole}>
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
            <Button variant="primary" icon="plus" onClick={() => setIsAddUserOpen(true)}>
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
                <Icon name="list" size={14} />
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
                <Icon name="lock" size={14} />
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

      {/* =====================================================================
          MODAL 1: ADD NEW ENTERPRISE USER
          ===================================================================== */}
      {isAddUserOpen && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingUser) setIsAddUserOpen(false);
          }}
        >
          <div className="dialog-card dialog-card--profile" style={{ maxWidth: "580px" }}>
            <div className="dialog-card__header">
              <div>
                <h3>Add New Enterprise User</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Create an enterprise credentials profile with initial module authorizations.
                </p>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setIsAddUserOpen(false)}
                disabled={isSubmittingUser}
                title="Close"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="dialog-card__body">
                {addUserError && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm, 6px)",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#b91c1c",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {addUserError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-field">
                    <label className="form-label">
                      Full Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Hendra Pratama"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Username <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. hendra.p"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Email Address <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      placeholder="hendra@geniusone.internal"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Initial Password <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. TempPass2026!"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Department</label>
                    <CustomSelect
                      value={String(newUserData.department_id)}
                      onChange={(val) => setNewUserData({ ...newUserData, department_id: Number(val) })}
                      options={departmentsList.map((dept) => ({
                        value: String(dept.id),
                        label: dept.name,
                      }))}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">System Role (Inherits Role Permissions)</label>
                    <CustomSelect
                      value={newUserData.role}
                      disabled={newUserData.isSuperAdmin}
                      onChange={(val) => setNewUserData({ ...newUserData, role: val })}
                      options={roles.map((r) => ({
                        value: r.code,
                        label: r.name,
                        description: r.description,
                        badge: r.code === "superadmin" ? "All Access" : `${(r.sidebarPermissions || []).length} menus`,
                      }))}
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Initial Sidebar Access Preset</label>
                    <CustomSelect
                      value={newUserData.sidebarPreset}
                      onChange={(val) => setNewUserData({ ...newUserData, sidebarPreset: val as any })}
                      options={[
                        { value: "all", label: "Full Enterprise Sidebar Access (All Modules)" },
                        { value: "procurement", label: "Procurement Modules Only (PR, PO, Reports, Master)" },
                        { value: "warehouse", label: "Warehouse & Exim Modules Only (Receiving, Stocks, RN)" },
                      ]}
                    />
                  </div>

                  <div
                    className="form-field"
                    style={{
                      gridColumn: "1 / -1",
                      padding: "10px 12px",
                      background: "#f8fafc",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px" }}>
                      <input
                        type="checkbox"
                        checked={newUserData.isSuperAdmin}
                        onChange={(e) => setNewUserData({ ...newUserData, isSuperAdmin: e.target.checked })}
                      />
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        Grant SuperAdmin Privileges (Full Unconditional Master Access)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="dialog-card__footer">
                <Button variant="secondary" onClick={() => setIsAddUserOpen(false)} disabled={isSubmittingUser}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmittingUser}>
                  {isSubmittingUser ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: PERMISSION & SIDEBAR ACCESS MANAGEMENT MODAL
          ===================================================================== */}
      {editingUser && permissionDraft && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingPermissions) setEditingUser(null);
          }}
        >
          <div className="dialog-card perm-dialog-card">
            {/* Header: User Profile Capsule */}
            <div className="dialog-card__header">
              <div className="perm-header-user-info">
                <div className={`user-avatar ${editingUser.isSuperAdmin ? "user-avatar--super" : ""}`}>
                  {editingUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="perm-header-title">
                  <h3>
                    <span>{editingUser.name}</span>
                    <span className="user-username-badge">(@{editingUser.username})</span>
                    {editingUser.isSuperAdmin && (
                      <Badge tone="purple" style={{ fontSize: "10px", padding: "1px 6px" }}>
                        SuperAdmin
                      </Badge>
                    )}
                  </h3>
                  <p>
                    {editingUser.role_label || editingUser.role} • {editingUser.department} • Configure visible navigation and approval rights
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {!editingUser.isSuperAdmin && (
                  <button
                    type="button"
                    className="btn-perm-preset"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 11px",
                      fontSize: "11.5px",
                      borderRadius: "6px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    onClick={handleResetUserToRoleDefaults}
                    title={`Re-sync and reset permissions to defaults for Role '${resolveRoleDefinition(editingUser.role, roles)?.name || editingUser.role}'`}
                  >
                    <Icon name="refresh" size={13} />
                    <span>Reset to Role Defaults</span>
                  </button>
                )}
                <button
                  type="button"
                  className="dialog-close-btn"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmittingPermissions}
                  title="Close"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="perm-modal-tabs">
              <button
                type="button"
                className={`perm-modal-tab ${activeModalTab === "sidebar" ? "active" : ""}`}
                onClick={() => setActiveModalTab("sidebar")}
              >
                <Icon name="list" size={14} />
                <span>Sidebar Navigation Access</span>
                <span className="perm-modal-tab__badge">
                  {sidebarDraft.length} / {ALL_SIDEBAR_MENU_ITEMS.length}
                </span>
              </button>

              <button
                type="button"
                className={`perm-modal-tab ${activeModalTab === "actions" ? "active" : ""}`}
                onClick={() => setActiveModalTab("actions")}
              >
                <Icon name="lock" size={14} />
                <span>Document & Workflow Approvals</span>
                <span className="perm-modal-tab__badge">2-Tier</span>
              </button>
            </div>

            {/* Modal Body: Active Tab Content */}
            <div className="perm-modal-body">
              {editingUser.isSuperAdmin && (
                <div className="perm-superadmin-banner">
                  <Icon name="info" size={16} />
                  <span>
                    SuperAdmin accounts hold unconditional full privileges across all navigation modules and approval workflows.
                  </span>
                </div>
              )}

              {/* TAB 1: SIDEBAR MENU NAVIGATION */}
              {activeModalTab === "sidebar" && (
                <>
                  <div className="role-sidebar-notice" style={{ marginBottom: "12px" }}>
                    <Icon name="info" size={15} />
                    <span>
                      Assigned Role: <strong>{resolveRoleDefinition(editingUser.role, roles)?.name || editingUser.role}</strong>. Menus inherited from this role are marked with a <span className="perm-inherited-pill">Role</span> badge. Extra menus configured manually will grant custom privileges.
                    </span>
                  </div>

                  {/* Preset Bar */}
                  <div className="sidebar-preset-bar">
                    <span className="sidebar-preset-bar__label">Quick Presets:</span>
                    <div className="sidebar-preset-bar__buttons">
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplySidebarPreset("all")}
                      >
                        Grant All Menus
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplySidebarPreset("procurement")}
                      >
                        Procurement Only
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplySidebarPreset("warehouse")}
                      >
                        Warehouse & Exim Only
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplySidebarPreset("clear")}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Grouped Section Cards with Subgroups */}
                  {Object.entries(groupedSidebarStructure).map(([sectionName, subGroups]) => {
                    const allSectionItems = Object.values(subGroups).flat();
                    if (allSectionItems.length === 0) return null;

                    const allSelected = allSectionItems.every((i) => sidebarDraft.includes(i.id));
                    const enabledCount = allSectionItems.filter((i) => sidebarDraft.includes(i.id)).length;
                    const isSectionCollapsed = Boolean(collapsedSections[sectionName]);
                    const roleDef = resolveRoleDefinition(editingUser.role, roles);

                    return (
                      <div
                        key={sectionName}
                        className={`perm-section-card ${isSectionCollapsed ? "perm-section-card--collapsed" : ""}`}
                      >
                        <div
                          className="perm-section-header"
                          onClick={() => handleToggleSectionCollapse(sectionName)}
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
                                handleToggleSectionSidebar(sectionName, !allSelected);
                              }}
                            >
                              {allSelected ? "Deselect All in Section" : "Select All in Section"}
                            </button>
                          </div>
                        </div>

                        {!isSectionCollapsed && (
                          <>
                            {Object.entries(subGroups).map(([groupName, items]) => {
                              const isGroupAllSelected = items.every((i) => sidebarDraft.includes(i.id));
                              const groupEnabledCount = items.filter((i) => sidebarDraft.includes(i.id)).length;

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
                                        onClick={() => handleToggleSubgroupSidebar(items, !isGroupAllSelected)}
                                      >
                                        {isGroupAllSelected ? "Deselect" : "Select All"}
                                      </button>
                                    )}
                                  </div>

                                  <div className="perm-section-grid">
                                    {items.map((item) => {
                                      const isChecked = sidebarDraft.includes(item.id);
                                      const isInheritedRoleMenu = Boolean(
                                        roleDef?.sidebarPermissions?.includes(item.id) ||
                                        roleDef?.sidebarPermissions?.includes("*")
                                      );

                                      return (
                                        <label
                                          key={item.id}
                                          className={`perm-menu-item ${isChecked ? "perm-menu-item--checked" : ""}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleSidebarItem(item.id)}
                                          />
                                          <div className="perm-menu-item__details">
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                              <span className="perm-menu-item__name">{item.label}</span>
                                              {isInheritedRoleMenu && (
                                                <span
                                                  className="perm-inherited-pill"
                                                  title={`Inherited from base role '${roleDef?.name || editingUser.role}'`}
                                                >
                                                  Role
                                                </span>
                                              )}
                                            </div>
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

              {/* TAB 2: DOCUMENT & WORKFLOW APPROVAL ACTIONS */}
              {activeModalTab === "actions" && (
                <>
                  {/* Preset & View Toolbar for Workflow Approvals */}
                  <div className="sidebar-preset-bar">
                    <span className="sidebar-preset-bar__label">Quick Presets:</span>
                    <div className="sidebar-preset-bar__buttons">
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplyAllModulesPreset("all")}
                      >
                        Grant All Approvals
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplyAllModulesPreset("approver")}
                      >
                        All Approvers Only
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplyAllModulesPreset("crud")}
                      >
                        All CRUD Only
                      </button>
                      <button
                        type="button"
                        className="perm-preset-btn"
                        onClick={() => handleApplyAllModulesPreset("clear")}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {APPROVAL_MODULES.map((mod) => {
                    const modPerms = permissionDraft[mod.id] || createEmptyModulePermissions();
                    const activeCount = Object.values(modPerms).filter(Boolean).length;
                    const isCollapsed = Boolean(collapsedWorkflowModules[mod.id]);

                    return (
                      <div
                        key={mod.id}
                        className={`perm-workflow-module ${isCollapsed ? "perm-workflow-module--collapsed" : ""}`}
                      >
                        <div
                          className="perm-workflow-header"
                          onClick={() => handleToggleModuleCollapse(mod.id)}
                          title={isCollapsed ? "Click to expand" : "Click to minimize"}
                        >
                          <div className="perm-workflow-header__title">
                            <strong>{mod.label}</strong>
                            <Badge tone={mod.category === "Procurement" ? "blue" : "purple"}>
                              {mod.category}
                            </Badge>
                            <Badge tone={activeCount === PERMISSION_ACTIONS.length ? "blue" : activeCount > 0 ? "gray" : "gray"}>
                              {activeCount} / {PERMISSION_ACTIONS.length} Active
                            </Badge>
                          </div>

                          <div className="perm-workflow-header__presets">
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetModulePreset(mod.id, "all");
                              }}
                            >
                              Full Access
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetModulePreset(mod.id, "approver");
                              }}
                            >
                              Approver Only
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetModulePreset(mod.id, "crud");
                              }}
                            >
                              CRUD Only
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetModulePreset(mod.id, "none");
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="perm-workflow-body">
                            {/* Column 1: Standard Document CRUD Actions */}
                            <div className="perm-group-box">
                              <span className="perm-group-box__title">
                                <Icon name="archive" size={12} />
                                Standard Document Rights (CRUD)
                              </span>
                              <div className="perm-group-box__items">
                                {PERMISSION_ACTIONS.filter((a) => a.category === "crud").map((act) => {
                                  const isChecked = Boolean(modPerms[act.action]);
                                  return (
                                    <label
                                      key={act.action}
                                      className={`perm-action-card ${isChecked ? "perm-action-card--checked" : ""}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleSinglePermission(mod.id, act.action)}
                                      />
                                      <div>
                                        <div className="perm-action-card__label">{act.label}</div>
                                        <div className="perm-action-card__desc">{act.description}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Column 2: Two-Stage Workflow Approvals */}
                            <div className="perm-group-box">
                              <span className="perm-group-box__title">
                                <Icon name="shield" size={12} />
                                Two-Stage Workflow Approvals
                              </span>
                              <div className="perm-group-box__items">
                                {PERMISSION_ACTIONS.filter((a) => a.category === "approval").map((act) => {
                                  const isChecked = Boolean(modPerms[act.action]);
                                  return (
                                    <label
                                      key={act.action}
                                      className={`perm-action-card perm-action-card--approval ${
                                        isChecked ? "perm-action-card--checked" : ""
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleSinglePermission(mod.id, act.action)}
                                      />
                                      <div>
                                        <div className="perm-action-card__label">{act.label}</div>
                                        <div className="perm-action-card__desc">{act.description}</div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="perm-modal-footer">
              <span className="perm-modal-footer__summary">
                Selected: <strong>{sidebarDraft.length}</strong> sidebar navigation items enabled
              </span>
              <div className="perm-modal-footer__actions">
                <Button variant="secondary" onClick={() => setEditingUser(null)} disabled={isSubmittingPermissions}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSavePermissions} disabled={isSubmittingPermissions}>
                  {isSubmittingPermissions ? "Saving Changes..." : "Save Permissions & Sidebar Access"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: EDIT ENTERPRISE USER PROFILE & CREDENTIALS
          ===================================================================== */}
      {editingUserProfile && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSubmittingEditUser) setEditingUserProfile(null);
          }}
        >
          <div className="dialog-card dialog-card--profile" style={{ maxWidth: "580px" }}>
            <div className="dialog-card__header">
              <div>
                <h3>Edit User Account</h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Update credentials, profile information, and role assignments for <strong>{editingUserProfile.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setEditingUserProfile(null)}
                disabled={isSubmittingEditUser}
                title="Close"
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div className="dialog-card__body">
                {editUserError && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm, 6px)",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#b91c1c",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {editUserError}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-field">
                    <label className="form-label">
                      Full Name <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Hendra Pratama"
                      value={editUserProfileData.name}
                      onChange={(e) =>
                        setEditUserProfileData({ ...editUserProfileData, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Username <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. hendra.p"
                      value={editUserProfileData.username}
                      onChange={(e) =>
                        setEditUserProfileData({ ...editUserProfileData, username: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">
                      Email Address <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="email"
                      className="form-input"
                      required
                      placeholder="hendra@geniusone.internal"
                      value={editUserProfileData.email}
                      onChange={(e) =>
                        setEditUserProfileData({ ...editUserProfileData, email: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">
                      New Password{" "}
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 400 }}>
                        (Leave blank to keep current password)
                      </span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showEditPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="Enter new password (min. 6 characters)"
                        value={editUserProfileData.password}
                        onChange={(e) =>
                          setEditUserProfileData({ ...editUserProfileData, password: e.target.value })
                        }
                        minLength={6}
                        style={{ paddingRight: "38px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        title={showEditPassword ? "Hide password" : "Show password"}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          padding: "4px",
                        }}
                      >
                        <Icon name={showEditPassword ? "eyeOff" : "eye"} size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label">Department</label>
                    <CustomSelect
                      value={String(editUserProfileData.department_id)}
                      onChange={(val) =>
                        setEditUserProfileData({
                          ...editUserProfileData,
                          department_id: Number(val),
                        })
                      }
                      options={departmentsList.map((dept) => ({
                        value: String(dept.id),
                        label: dept.name,
                      }))}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">System Role (Inherits Role Permissions)</label>
                    <CustomSelect
                      value={editUserProfileData.role}
                      disabled={editUserProfileData.isSuperAdmin}
                      menuPlacement="top"
                      onChange={(val) =>
                        setEditUserProfileData({ ...editUserProfileData, role: val })
                      }
                      options={roles.map((r) => ({
                        value: r.code,
                        label: r.name,
                        description: r.description,
                        badge: r.code === "superadmin" ? "All Access" : `${(r.sidebarPermissions || []).length} menus`,
                      }))}
                    />
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Account Status</label>
                    <CustomSelect
                      value={String(editUserProfileData.status)}
                      disabled={editUserProfileData.isSuperAdmin}
                      onChange={(val) =>
                        setEditUserProfileData({
                          ...editUserProfileData,
                          status: Number(val) as 0 | 1,
                        })
                      }
                      options={[
                        { value: "1", label: "Active" },
                        { value: "0", label: "Inactive" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="dialog-card__footer">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingUserProfile(null)}
                  disabled={isSubmittingEditUser}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmittingEditUser}>
                  {isSubmittingEditUser ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: DELETE CONFIRMATION DIALOG
          ===================================================================== */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={Boolean(userToDelete)}
          title="Delete User Account"
          entityType="user account"
          entityName={userToDelete.name}
          entityCode={`@${userToDelete.username}`}
          notice="This action will permanently revoke this user's system credentials, sidebar access, and approval rights."
          confirmLabel="Delete User"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
}

export default UserPermissionAdmin;
