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

  // Load users from real backend API
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
          const modKey = mod.id === "purchase_requisition" ? "pr" : mod.id === "purchase_order" ? "po" : mod.id === "receive_note" ? "rn" : "rm";
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

    // Convert permissionDraft object into permission string keys
    const permissionStrings: string[] = [];
    if (editingUser.isSuperAdmin) {
      permissionStrings.push("*");
    } else {
      for (const mod of APPROVAL_MODULES) {
        const modKey = mod.id === "purchase_requisition" ? "pr" : mod.id === "purchase_order" ? "po" : mod.id === "receive_note" ? "rn" : "rm";
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
      initialSidebar = ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === "Dashboard" || i.section === "Procurement").map((i) => i.id);
    } else if (newUserData.sidebarPreset === "warehouse") {
      initialSidebar = ALL_SIDEBAR_MENU_ITEMS.filter((i) => i.section === "Dashboard" || i.section === "Warehouse" || i.section === "Exim").map((i) => i.id);
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
    <div className="page-shell user-permission-admin-page">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div className="page-header__left">
          <span className="page-eyebrow">ENTERPRISE GOVERNANCE & SECURITY</span>
          <h1 className="page-title">User & Access Management</h1>
          <p className="page-description">
            Create user accounts, grant custom sidebar navigation access, and configure granular two-tier approval permissions.
          </p>
        </div>

        <div className="page-header__actions">
          <Button variant="primary" icon="plus" onClick={() => setIsAddUserOpen(true)}>
            Add New User
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: "var(--radius-md, 8px)",
            background: feedback.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.28)" : "rgba(239, 68, 68, 0.28)"}`,
            color: feedback.type === "success" ? "#047857" : "#b91c1c",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name={feedback.type === "success" ? "check" : "alertTriangle"} size={16} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Search & Listing Table Frame */}
      <div className="table-card">
        <div className="table-card__toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search user by name, username, email, department, or role..."
          />
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "180px" }}>User Account</th>
                  <th style={{ minWidth: "160px" }}>Username / Email</th>
                  <th style={{ minWidth: "140px" }}>Role & Department</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Status</th>
                  <th style={{ minWidth: "220px" }}>Sidebar & Access Overview</th>
                  <th style={{ width: "170px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "var(--muted)" }}>
                      Loading enterprise users from system database...
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
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: user.isSuperAdmin ? "#7c3aed" : "var(--blue-600)",
                                color: "#ffffff",
                                display: "grid",
                                placeItems: "center",
                                fontSize: "12px",
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{user.name}</div>
                              {user.isSuperAdmin && (
                                <Badge tone="purple" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  SuperAdmin
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: "12px", fontWeight: 600, color: "var(--blue-700)" }}>
                            @{user.username}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{user.email}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{user.role_label || user.role}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{user.department}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => !user.isSuperAdmin && handleToggleStatus(user)}
                            style={{ background: "none", border: 0, cursor: user.isSuperAdmin ? "default" : "pointer", padding: 0 }}
                            title={user.isSuperAdmin ? "SuperAdmin cannot be deactivated" : "Click to toggle active/inactive status"}
                          >
                            <Badge tone={user.status === "active" ? "green" : "gray"}>
                              {user.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {user.isSuperAdmin ? (
                              <Badge tone="purple">Full Master Access (*)</Badge>
                            ) : (
                              <>
                                <Badge tone="blue">
                                  {sidebarCount} / {ALL_SIDEBAR_MENU_ITEMS.length} Sidebar Menus
                                </Badge>
                                <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center" }}>
                                  {user.role} permissions
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <Button
                              variant="secondary"
                              icon="lock"
                              onClick={() => handleOpenPermissions(user)}
                              title="Configure Sidebar Access & Permissions"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              Access & Sidebar
                            </Button>
                            {!user.isSuperAdmin && (
                              <Button
                                variant="danger"
                                icon="trash"
                                onClick={() => setUserToDelete(user)}
                                title="Delete user"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                              />
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
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="table-footer">
            <div className="table-footer__summary">
              Showing{" "}
              <strong>
                {filteredUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(safePage * pageSize, filteredUsers.length)}
              </strong>{" "}
              of <strong>{filteredUsers.length}</strong> users
            </div>
            <Pagination
              currentPage={safePage}
              totalRecords={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* MODAL 1: CREATE NEW USER */}
      {isAddUserOpen && (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-card" style={{ maxWidth: "560px" }}>
            <div className="dialog-card__header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                Add New Enterprise User
              </h3>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setIsAddUserOpen(false)}
                disabled={isSubmittingUser}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="dialog-card__body">
                {addUserError && (
                  <div
                    style={{
                      marginBottom: "12px",
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

                <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-field">
                    <label className="form-label">Full Name <span style={{ color: "#dc2626" }}>*</span></label>
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
                    <label className="form-label">Username <span style={{ color: "#dc2626" }}>*</span></label>
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
                    <label className="form-label">Email Address <span style={{ color: "#dc2626" }}>*</span></label>
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
                    <label className="form-label">Initial Password <span style={{ color: "#dc2626" }}>*</span></label>
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

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input
                        type="checkbox"
                        checked={newUserData.isSuperAdmin}
                        onChange={(e) => setNewUserData({ ...newUserData, isSuperAdmin: e.target.checked })}
                      />
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>Grant SuperAdmin Privileges (Full Unconditional Authorization)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="dialog-card__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
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

      {/* MODAL 2: SIDEBAR ACCESS & ACTION PERMISSION MANAGER */}
      {editingUser && permissionDraft && (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-card dialog-card--lg" style={{ maxWidth: "920px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="dialog-card__header">
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                  Access & Permission Configuration — {editingUser.name} (@{editingUser.username})
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Configure visible sidebar menus and granular document approval permissions.
                </p>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => setEditingUser(null)}
                disabled={isSubmittingPermissions}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", padding: "0 24px", background: "#f8fafc" }}>
              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: activeModalTab === "sidebar" ? 700 : 500,
                  color: activeModalTab === "sidebar" ? "var(--blue-700)" : "var(--muted)",
                  borderBottom: activeModalTab === "sidebar" ? "2px solid var(--blue-600)" : "2px solid transparent",
                  background: "transparent",
                  borderTop: 0,
                  borderLeft: 0,
                  borderRight: 0,
                  cursor: "pointer",
                }}
                onClick={() => setActiveModalTab("sidebar")}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="list" size={14} />
                  <span>Sidebar Menu Access Control ({sidebarDraft.length} enabled)</span>
                </span>
              </button>

              <button
                type="button"
                style={{
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: activeModalTab === "actions" ? 700 : 500,
                  color: activeModalTab === "actions" ? "var(--blue-700)" : "var(--muted)",
                  borderBottom: activeModalTab === "actions" ? "2px solid var(--blue-600)" : "2px solid transparent",
                  background: "transparent",
                  borderTop: 0,
                  borderLeft: 0,
                  borderRight: 0,
                  cursor: "pointer",
                }}
                onClick={() => setActiveModalTab("actions")}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Icon name="lock" size={14} />
                  <span>Document Action Permissions (CRUD & 2-Tier Approval)</span>
                </span>
              </button>
            </div>

            <div className="dialog-card__body" style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
              {editingUser.isSuperAdmin && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm, 6px)",
                    background: "rgba(124, 58, 237, 0.08)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    color: "#6d28d9",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Icon name="info" size={16} />
                  <span>
                    SuperAdmin account has unconditional full access to all sidebar menus and approval workflows.
                  </span>
                </div>
              )}

              {/* TAB 1: SIDEBAR MENU ACCESS CONTROL */}
              {activeModalTab === "sidebar" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Check items that this user can view in their sidebar navigation. Unchecked items will be completely hidden.
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Button
                        variant="secondary"
                        onClick={() => setSidebarDraft(ALL_SIDEBAR_MENU_ITEMS.map((i) => i.id))}
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                      >
                        Grant All Sidebar Items
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setSidebarDraft([])}
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {Object.entries(groupedSidebarItems).map(([sectionName, items]) => {
                      const allSelected = items.every((i) => sidebarDraft.includes(i.id));
                      const someSelected = items.some((i) => sidebarDraft.includes(i.id));

                      return (
                        <div
                          key={sectionName}
                          style={{
                            border: "1px solid var(--line)",
                            borderRadius: "var(--radius-md, 8px)",
                            overflow: "hidden",
                            background: "#ffffff",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 14px",
                              background: "#f8fafc",
                              borderBottom: "1px solid var(--line)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              {sectionName} Section ({items.filter((i) => sidebarDraft.includes(i.id)).length} / {items.length})
                            </span>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  background: "#ffffff",
                                  border: "1px solid var(--line)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  color: "var(--blue-700)",
                                }}
                                onClick={() => handleToggleSectionSidebar(sectionName, !allSelected)}
                              >
                                {allSelected ? "Deselect Section" : "Select All in Section"}
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              padding: "12px 14px",
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                              gap: "8px 14px",
                            }}
                          >
                            {items.map((item) => {
                              const isChecked = sidebarDraft.includes(item.id);
                              return (
                                <label
                                  key={item.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "12px",
                                    padding: "6px 8px",
                                    borderRadius: "4px",
                                    background: isChecked ? "rgba(0, 113, 227, 0.04)" : "transparent",
                                    border: isChecked ? "1px solid rgba(0, 113, 227, 0.15)" : "1px solid transparent",
                                    cursor: "pointer",
                                    transition: "all 0.12s ease",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSidebarItem(item.id)}
                                  />
                                  <span style={{ color: isChecked ? "var(--ink)" : "var(--muted)", fontWeight: isChecked ? 600 : 400 }}>
                                    {item.label}
                                    {item.group && (
                                      <small style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                                        {item.group}
                                      </small>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: DOCUMENT ACTION PERMISSIONS MATRIX */}
              {activeModalTab === "actions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {APPROVAL_MODULES.map((mod) => {
                    const modPerms = permissionDraft[mod.id] || createEmptyModulePermissions();
                    const allChecked = PERMISSION_ACTIONS.every((a) => modPerms[a.action]);

                    return (
                      <div
                        key={mod.id}
                        style={{
                          border: "1px solid var(--line)",
                          borderRadius: "var(--radius-md, 8px)",
                          padding: "14px",
                          background: "#ffffff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                          <div>
                            <strong style={{ fontSize: "13.5px", color: "var(--ink)" }}>{mod.label}</strong>
                            <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>
                              ({mod.category})
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleSetModulePreset(mod.id, "all")}
                              style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", border: "1px solid var(--line)", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Full Access
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetModulePreset(mod.id, "approver")}
                              style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", border: "1px solid var(--line)", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Approver Only
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetModulePreset(mod.id, "crud")}
                              style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", border: "1px solid var(--line)", borderRadius: "4px", cursor: "pointer" }}
                            >
                              CRUD Only
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetModulePreset(mod.id, "none")}
                              style={{ fontSize: "11px", padding: "2px 8px", background: "#f1f5f9", border: "1px solid var(--line)", borderRadius: "4px", cursor: "pointer" }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                            gap: "8px",
                            padding: "8px",
                            background: "#f8fafc",
                            borderRadius: "6px",
                          }}
                        >
                          {PERMISSION_ACTIONS.map((act) => {
                            const isChecked = Boolean(modPerms[act.action]);
                            const isApproval = act.category === "approval";

                            return (
                              <label
                                key={act.action}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  fontSize: "12px",
                                  padding: "6px 8px",
                                  borderRadius: "4px",
                                  background: isChecked ? (isApproval ? "rgba(124, 58, 237, 0.08)" : "rgba(0, 113, 227, 0.08)") : "#ffffff",
                                  border: isChecked ? `1px solid ${isApproval ? "rgba(124, 58, 237, 0.25)" : "rgba(0, 113, 227, 0.25)"}` : "1px solid var(--line)",
                                  cursor: "pointer",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSinglePermission(mod.id, act.action)}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, color: isChecked ? "var(--ink)" : "var(--muted)" }}>
                                    {act.label}
                                  </div>
                                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                                    {act.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="dialog-card__footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Selected: <strong>{sidebarDraft.length}</strong> sidebar menus enabled
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
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

      {/* MODAL 3: DELETE CONFIRMATION */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={Boolean(userToDelete)}
          title="Confirm User Account Removal"
          message={`Are you sure you want to permanently delete user account '${userToDelete.name}' (@${userToDelete.username})? This action will revoke all permissions and access credentials.`}
          confirmLabel="Delete Account"
          cancelLabel="Cancel"
          tone="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

export default UserPermissionAdmin;
