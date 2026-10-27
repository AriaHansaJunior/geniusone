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
import { useAuthPermission } from "../../context/AuthPermissionContext";
import {
  APPROVAL_MODULES,
  PERMISSION_ACTIONS,
  type ApprovalModule,
  type ModulePermissions,
  type PermissionAction,
  type UserAccount,
  type UserPermissionMap,
  createDefaultPermissionMap,
  createEmptyModulePermissions,
  createFullModulePermissions,
} from "../../types/permissions";
import { ALL_SIDEBAR_MENU_ITEMS, type SidebarMenuItemDescriptor } from "../../config/navigation";

export function UserPermissionAdmin() {
  const { currentUser, isSuperAdmin, refreshUsers } = useAuthPermission();

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
    password: "secret123",
    role: "procurement",
    department: "Purchasing",
    isSuperAdmin: false,
    sidebarPreset: "all",
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit Permissions & Sidebar Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"sidebar" | "actions">("sidebar");
  const [permissionDraft, setPermissionDraft] = useState<UserPermissionMap | null>(null);
  const [sidebarDraft, setSidebarDraft] = useState<string[]>([]);
  const [isSubmittingPermissions, setIsSubmittingPermissions] = useState(false);

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
        if (editingUser) setEditingUser(null);
        else if (isAddUserOpen) setIsAddUserOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingUser, isAddUserOpen]);

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

    // Initialize sidebar draft: if user has configured array, use it; if null, grant all
    if (Array.isArray(user.sidebar_permissions)) {
      setSidebarDraft([...user.sidebar_permissions]);
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
            mod.id === "purchase_requisition" ? "pr" : mod.id === "purchase_order" ? "po" : mod.id === "receive_note" ? "rn" : "rm";
          for (const act of PERMISSION_ACTIONS) {
            if (permsArray.includes(`${modKey}.${act.action}`) || permsArray.includes(`${mod.id}.${act.action}`)) {
              initialPerms[mod.id][act.action] = true;
            }
          }
        }
      }
    }
    setPermissionDraft(initialPerms);
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
          mod.id === "purchase_requisition" ? "pr" : mod.id === "purchase_order" ? "po" : mod.id === "receive_note" ? "rn" : "rm";
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
          password: newUserData.password || "secret123",
          role: newUserData.isSuperAdmin ? "superadmin" : newUserData.role,
          department_id: 1,
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
          password: "secret123",
          role: "procurement",
          department: "Purchasing",
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

  // Grouped sidebar items for display in Tab 1
  const groupedSidebarItems = useMemo(() => {
    const groups: Record<string, SidebarMenuItemDescriptor[]> = {};
    for (const item of ALL_SIDEBAR_MENU_ITEMS) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
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

      {/* Main Table Card (Single Unified Container) */}
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
                  <th style={{ width: "180px", textAlign: "center" }}>Actions</th>
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
                                <span className="user-full-name">{user.name}</span>
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
                          <div className="user-identity">
                            <span className="user-role-text">{user.role_label || user.role}</span>
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
                                  {sidebarCount} / {ALL_SIDEBAR_MENU_ITEMS.length} Menus
                                </Badge>
                                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                  {user.role}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="user-row-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="lock"
                              onClick={() => handleOpenPermissions(user)}
                              title="Configure visible sidebar menus and approval rights"
                            >
                              Permissions & Sidebar
                            </Button>
                            {!user.isSuperAdmin && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                title={`Delete user ${user.name}`}
                                onClick={() => setUserToDelete(user)}
                              >
                                <Icon name="trash" size={13} />
                              </button>
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
          <div className="dialog-card" style={{ maxWidth: "560px" }}>
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
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label className="form-label">Department</label>
                    <select
                      className="form-input"
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    >
                      <option value="Purchasing">Purchasing</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Finance">Finance</option>
                      <option value="Produksi & Smelting">Produksi & Smelting</option>
                      <option value="Maintenance & Engineering">Maintenance & Engineering</option>
                      <option value="Executive & Systems">Executive & Systems</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label className="form-label">System Role</label>
                    <select
                      className="form-input"
                      value={newUserData.role}
                      disabled={newUserData.isSuperAdmin}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    >
                      <option value="procurement">Procurement Officer</option>
                      <option value="warehouse">Warehouse & Inventory Officer</option>
                      <option value="approver_tier1">Approver Tier 1 (Dept Head)</option>
                      <option value="approver_tier2">Approver Tier 2 (Director)</option>
                      <option value="admin">Operations Administrator</option>
                      <option value="requester">Department Requisitioner</option>
                      <option value="viewer">Auditor / Read-Only</option>
                    </select>
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Initial Sidebar Access Preset</label>
                    <select
                      className="form-input"
                      value={newUserData.sidebarPreset}
                      onChange={(e) => setNewUserData({ ...newUserData, sidebarPreset: e.target.value })}
                    >
                      <option value="all">Full Enterprise Sidebar Access (All Modules)</option>
                      <option value="procurement">Procurement Modules Only (PR, PO, Reports, Master)</option>
                      <option value="warehouse">Warehouse & Exim Modules Only (Receiving, Stocks, RN)</option>
                    </select>
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

                  {/* Grouped Section Cards */}
                  {Object.entries(groupedSidebarItems).map(([sectionName, items]) => {
                    const allSelected = items.every((i) => sidebarDraft.includes(i.id));
                    const enabledCount = items.filter((i) => sidebarDraft.includes(i.id)).length;

                    return (
                      <div key={sectionName} className="perm-section-card">
                        <div className="perm-section-header">
                          <span className="perm-section-title">
                            <span>{sectionName} Section</span>
                            <Badge tone={enabledCount === items.length ? "blue" : enabledCount > 0 ? "gray" : "gray"}>
                              {enabledCount} / {items.length} Active
                            </Badge>
                          </span>
                          <button
                            type="button"
                            className="perm-preset-btn"
                            onClick={() => handleToggleSectionSidebar(sectionName, !allSelected)}
                          >
                            {allSelected ? "Deselect All" : "Select All in Section"}
                          </button>
                        </div>

                        <div className="perm-section-grid">
                          {items.map((item) => {
                            const isChecked = sidebarDraft.includes(item.id);
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
                                  <span className="perm-menu-item__name">{item.label}</span>
                                  {item.group && (
                                    <span className="perm-menu-item__group">{item.group}</span>
                                  )}
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

              {/* TAB 2: DOCUMENT & WORKFLOW APPROVAL ACTIONS */}
              {activeModalTab === "actions" && (
                <>
                  {APPROVAL_MODULES.map((mod) => {
                    const modPerms = permissionDraft[mod.id] || createEmptyModulePermissions();

                    return (
                      <div key={mod.id} className="perm-workflow-module">
                        <div className="perm-workflow-header">
                          <div className="perm-workflow-header__title">
                            <strong>{mod.label}</strong>
                            <Badge tone={mod.category === "Procurement" ? "blue" : "purple"}>
                              {mod.category}
                            </Badge>
                          </div>

                          <div className="perm-workflow-header__presets">
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={() => handleSetModulePreset(mod.id, "all")}
                            >
                              Full Access
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={() => handleSetModulePreset(mod.id, "approver")}
                            >
                              Approver Only
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={() => handleSetModulePreset(mod.id, "crud")}
                            >
                              CRUD Only
                            </button>
                            <button
                              type="button"
                              className="perm-preset-btn"
                              onClick={() => handleSetModulePreset(mod.id, "none")}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

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
