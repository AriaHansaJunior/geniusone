/**
 * GENIUSONE UI 2.0 — SuperAdmin User & Permission Administration
 * Granular module-scoped authorization management and user account administration.
 */

import React, { useState, useMemo, useEffect } from "react";
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
import {
  createUserApi,
  deleteUserApi,
  getStoredUsers,
  updateUserApi,
  updateUserPermissionsApi,
} from "../../services/userPermissionApi";

export function UserPermissionAdmin() {
  const { currentUser, isSuperAdmin, switchUser, refreshUsers } = useAuthPermission();

  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
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
    role: "Staff",
    department: "Purchasing",
    isSuperAdmin: false,
  });
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Edit Permissions Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<UserPermissionMap | null>(null);
  const [isConfirmingPermissionSave, setIsConfirmingPermissionSave] = useState(false);
  const [isSubmittingPermissions, setIsSubmittingPermissions] = useState(false);

  // Delete User Confirmation
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reload users when component mounts or refreshed
  const loadUsers = () => {
    const list = getStoredUsers();
    setUsers(list);
    refreshUsers();
  };

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Filtered and Paginated users
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Open Permission Modal for a user
  const handleOpenPermissions = (user: UserAccount) => {
    setEditingUser(user);
    // Deep clone the user's permissions draft
    const clone = JSON.parse(JSON.stringify(user.permissions || createDefaultPermissionMap(user.isSuperAdmin)));
    setPermissionDraft(clone);
  };

  // Toggle single permission checkbox
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

  // Batch permission presets
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
        // approver
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

  // Save permissions
  const handleSavePermissions = async () => {
    if (!editingUser || !permissionDraft) return;
    setIsSubmittingPermissions(true);
    try {
      const res = await updateUserPermissionsApi(editingUser.id, permissionDraft);
      if (res.success && res.user) {
        showFeedback("success", `Permissions updated successfully for ${res.user.name}.`);
        loadUsers();
        setEditingUser(null);
        setPermissionDraft(null);
        setIsConfirmingPermissionSave(false);
      } else {
        showFeedback("error", res.error || "Failed to update permissions.");
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Error saving permissions.");
    } finally {
      setIsSubmittingPermissions(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setIsSubmittingUser(true);
    try {
      const res = await createUserApi(newUserData);
      if (res.success && res.user) {
        showFeedback("success", `User account created: ${res.user.name} (@${res.user.username}).`);
        loadUsers();
        setIsAddUserOpen(false);
        setNewUserData({
          name: "",
          username: "",
          email: "",
          role: "Staff",
          department: "Purchasing",
          isSuperAdmin: false,
        });
      } else {
        setAddUserError(res.error || "Failed to create user.");
      }
    } catch (err: any) {
      setAddUserError(err?.message || "Unexpected error occurred.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteUserApi(userToDelete.id);
      if (res.success) {
        showFeedback("success", `User ${userToDelete.name} has been removed.`);
        loadUsers();
        setUserToDelete(null);
      } else {
        showFeedback("error", res.error || "Cannot delete user.");
      }
    } catch (err: any) {
      showFeedback("error", err?.message || "Error deleting user.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-shell user-permission-admin-page">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div className="page-header__left">
          <span className="page-eyebrow">SYSTEM & SECURITY ADMINISTRATION</span>
          <h1 className="page-title">User & Permission Management</h1>
          <p className="page-description">
            Manage enterprise accounts, roles, and granular two-stage approval permissions across procurement and warehouse modules.
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

      {/* Active User Simulation Switcher Pill */}
      <div
        className="panel"
        style={{
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          background: "rgba(0, 113, 227, 0.04)",
          border: "1px solid rgba(0, 113, 227, 0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--blue-600)",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            {currentUser.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
              Active User Session: <strong>{currentUser.name}</strong> ({currentUser.role})
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              {currentUser.isSuperAdmin ? "SuperAdmin (Full Master Access)" : `Department: ${currentUser.department}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Simulate User:</span>
          <select
            className="form-input"
            style={{ fontSize: "12px", padding: "4px 8px", width: "auto" }}
            value={currentUser.id}
            onChange={(e) => switchUser(e.target.value)}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.role}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                  <th style={{ minWidth: "220px" }}>Module Permissions Overview</th>
                  <th style={{ width: "160px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user, idx) => {
                    const rowNumber = (safePage - 1) * pageSize + idx + 1;
                    const isSelf = user.id === currentUser.id;

                    // Summary of permissions
                    const canApproveAny = APPROVAL_MODULES.some(
                      (m) => user.permissions?.[m.id]?.approve_1 || user.permissions?.[m.id]?.approve_2
                    );

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
                          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{user.role}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{user.department}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Badge tone={user.status === "active" ? "green" : "gray"}>
                            {user.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {user.isSuperAdmin ? (
                              <Badge tone="purple">Full System Access</Badge>
                            ) : (
                              APPROVAL_MODULES.map((m) => {
                                const perms = user.permissions?.[m.id];
                                if (!perms) return null;
                                const hasAppr = perms.approve_1 || perms.approve_2;
                                const hasCrud = perms.create || perms.update;
                                if (!hasAppr && !hasCrud && !perms.view) return null;

                                return (
                                  <span
                                    key={m.id}
                                    style={{
                                      fontSize: "10.5px",
                                      padding: "2px 6px",
                                      borderRadius: "var(--radius-sm, 4px)",
                                      background: hasAppr ? "rgba(0, 113, 227, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                      color: hasAppr ? "#0066cc" : "var(--ink)",
                                      border: "1px solid rgba(0, 0, 0, 0.06)",
                                      fontWeight: 600,
                                    }}
                                    title={`${m.label}: ${hasAppr ? "Approver" : "Contributor"}`}
                                  >
                                    {m.id === "purchase_requisition" ? "PR" : m.id === "purchase_order" ? "PO" : m.id === "receive_note" ? "RN/BPB" : "RM"}
                                    {hasAppr ? " (Appr)" : ""}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <Button
                              variant="secondary"
                              icon="lock"
                              onClick={() => handleOpenPermissions(user)}
                              title="Configure Granular Permissions"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                            >
                              Permissions
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

      {/* MODAL 1: ADD NEW USER ACCOUNT */}
      {isAddUserOpen && (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-card dialog-card--md">
            <div className="dialog-card__header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                Create New Enterprise User
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
                    <label className="form-label">Department</label>
                    <select
                      className="form-input"
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    >
                      <option value="Purchasing">Purchasing</option>
                      <option value="Warehouse">Warehouse</option>
                      <option value="Finance">Finance</option>
                      <option value="Board of Directors">Board of Directors</option>
                      <option value="Executive & Systems">Executive & Systems</option>
                    </select>
                  </div>

                  <div className="form-field" style={{ gridColumn: "1 / -1" }}>
                    <label className="form-label">Role Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Purchasing Manager / Approver"
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    />
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

      {/* MODAL 2: GRANULAR PERMISSION MATRIX DRAWER */}
      {editingUser && permissionDraft && (
        <div className="dialog-overlay" role="dialog" aria-modal="true">
          <div className="dialog-card dialog-card--lg" style={{ maxWidth: "880px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="dialog-card__header">
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                  Granular Module Permissions — {editingUser.name}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Configure independent CRUD, Stage 1 Approval, and Stage 2 Approval rights per document type.
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

            <div className="dialog-card__body" style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
              {editingUser.isSuperAdmin && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md, 8px)",
                    background: "rgba(124, 58, 237, 0.08)",
                    border: "1px solid rgba(124, 58, 237, 0.25)",
                    fontSize: "12px",
                    color: "var(--ink)",
                  }}
                >
                  <strong>Note:</strong> This user is designated as <strong>SuperAdmin</strong>. SuperAdmins automatically possess unconditional authorization across all modules.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {APPROVAL_MODULES.map((mod) => {
                  const modPerms = permissionDraft[mod.id] || createEmptyModulePermissions();

                  return (
                    <div
                      key={mod.id}
                      style={{
                        padding: "16px",
                        borderRadius: "var(--radius-md, 8px)",
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>
                            {mod.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {mod.description}
                          </div>
                        </div>

                        {/* Presets */}
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-action-pill"
                            style={{ fontSize: "10.5px", padding: "2px 8px" }}
                            onClick={() => handleSetModulePreset(mod.id, "all")}
                          >
                            Grant All
                          </button>
                          <button
                            type="button"
                            className="btn-action-pill"
                            style={{ fontSize: "10.5px", padding: "2px 8px" }}
                            onClick={() => handleSetModulePreset(mod.id, "approver")}
                          >
                            Approver Only
                          </button>
                          <button
                            type="button"
                            className="btn-action-pill"
                            style={{ fontSize: "10.5px", padding: "2px 8px" }}
                            onClick={() => handleSetModulePreset(mod.id, "crud")}
                          >
                            CRUD Only
                          </button>
                          <button
                            type="button"
                            className="btn-action-pill"
                            style={{ fontSize: "10.5px", padding: "2px 8px", color: "#dc2626" }}
                            onClick={() => handleSetModulePreset(mod.id, "none")}
                          >
                            Revoke
                          </button>
                        </div>
                      </div>

                      {/* Checkboxes Matrix */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                        {PERMISSION_ACTIONS.map((actionMeta) => {
                          const isChecked = Boolean(modPerms[actionMeta.action]);
                          const isApproval = actionMeta.category === "approval";

                          return (
                            <label
                              key={actionMeta.action}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "6px 10px",
                                borderRadius: "var(--radius-sm, 6px)",
                                background: isChecked
                                  ? isApproval
                                    ? "rgba(0, 113, 227, 0.08)"
                                    : "rgba(16, 185, 129, 0.08)"
                                  : "rgba(0, 0, 0, 0.02)",
                                border: `1px solid ${
                                  isChecked
                                    ? isApproval
                                      ? "rgba(0, 113, 227, 0.3)"
                                      : "rgba(16, 185, 129, 0.3)"
                                    : "var(--line)"
                                }`,
                                cursor: "pointer",
                                fontSize: "12px",
                                userSelect: "none",
                              }}
                              title={actionMeta.description}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSinglePermission(mod.id, actionMeta.action)}
                              />
                              <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? "var(--ink)" : "var(--muted)" }}>
                                {actionMeta.label}
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

            <div className="dialog-card__footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Consequential changes take effect immediately upon confirmation.
              </span>

              <div style={{ display: "flex", gap: "10px" }}>
                <Button variant="secondary" onClick={() => setEditingUser(null)} disabled={isSubmittingPermissions}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  icon="check"
                  onClick={() => setIsConfirmingPermissionSave(true)}
                  disabled={isSubmittingPermissions}
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM CONSEQUENTIAL PERMISSION SAVE */}
      {isConfirmingPermissionSave && editingUser && (
        <ConfirmDialog
          isOpen={true}
          title="Confirm Permission Changes"
          message={`Are you sure you want to apply these updated module authorizations to ${editingUser.name}? Changes will alter the user's operational ability to create, edit, approve, or unapprove live transactions.`}
          confirmLabel={isSubmittingPermissions ? "Applying..." : "Confirm & Save"}
          cancelLabel="Review Changes"
          variant="primary"
          onConfirm={handleSavePermissions}
          onCancel={() => setIsConfirmingPermissionSave(false)}
        />
      )}

      {/* MODAL 4: DELETE USER CONFIRM */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete User Account"
          message={`Are you sure you want to permanently delete the account for ${userToDelete.name} (@${userToDelete.username})? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete User"}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
}

export default UserPermissionAdmin;
