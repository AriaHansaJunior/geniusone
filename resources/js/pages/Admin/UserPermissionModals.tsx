import React from "react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../components/ui/CustomSelect";
import {
  APPROVAL_MODULES,
  PERMISSION_ACTIONS,
  type ApprovalModule,
  type PermissionAction,
  type RoleDefinition,
  type UserAccount,
  type UserPermissionMap,
  createEmptyModulePermissions,
  resolveRoleDefinition,
} from "../../types/permissions";
import { ALL_SIDEBAR_MENU_ITEMS, type SidebarMenuItemDescriptor } from "../../config/navigation";

interface UserPermissionModalsProps {
  isAddUserOpen: boolean;
  setIsAddUserOpen: (val: boolean) => void;
  isSubmittingUser: boolean;
  handleCreateUser: (e: React.FormEvent) => void;
  addUserError: string | null;
  newUserData: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
    department_id: number;
    isSuperAdmin: boolean;
    sidebarPreset: string;
  };
  setNewUserData: (data: any) => void;
  departmentsList: { id: number; name: string }[];
  roles: RoleDefinition[];
  editingUser: UserAccount | null;
  setEditingUser: (user: UserAccount | null) => void;
  permissionDraft: UserPermissionMap | null;
  isSubmittingPermissions: boolean;
  handleResetUserToRoleDefaults: () => void;
  activeModalTab: "sidebar" | "actions";
  setActiveModalTab: (tab: "sidebar" | "actions") => void;
  sidebarDraft: string[];
  handleApplySidebarPreset: (preset: "all" | "procurement" | "warehouse" | "clear") => void;
  groupedSidebarStructure: Record<string, Record<string, SidebarMenuItemDescriptor[]>>;
  collapsedSections: Record<string, boolean>;
  handleToggleSectionCollapse: (sectionName: string) => void;
  handleToggleSectionSidebar: (sectionName: string, selectAll: boolean) => void;
  handleToggleSubgroupSidebar: (items: SidebarMenuItemDescriptor[], selectAll: boolean) => void;
  handleToggleSidebarItem: (itemId: string) => void;
  handleApplyAllModulesPreset: (preset: "all" | "approver" | "crud" | "clear") => void;
  collapsedWorkflowModules: Record<string, boolean>;
  handleToggleModuleCollapse: (moduleId: string) => void;
  handleSetModulePreset: (module: ApprovalModule, preset: "all" | "approver" | "crud" | "none") => void;
  handleToggleSinglePermission: (module: ApprovalModule, action: PermissionAction) => void;
  handleSavePermissions: () => void;
  editingUserProfile: UserAccount | null;
  setEditingUserProfile: (user: UserAccount | null) => void;
  isSubmittingEditUser: boolean;
  handleSaveEditUser: (e: React.FormEvent) => void;
  editUserError: string | null;
  editUserProfileData: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: string;
    department_id: number;
    status: 0 | 1;
    isSuperAdmin: boolean;
  };
  setEditUserProfileData: (data: any) => void;
  showEditPassword: boolean;
  setShowEditPassword: (val: boolean) => void;
  userToDelete: UserAccount | null;
  setUserToDelete: (user: UserAccount | null) => void;
  handleConfirmDelete: () => void;
}

export function UserPermissionModals({
  isAddUserOpen,
  setIsAddUserOpen,
  isSubmittingUser,
  handleCreateUser,
  addUserError,
  newUserData,
  setNewUserData,
  departmentsList,
  roles,
  editingUser,
  setEditingUser,
  permissionDraft,
  isSubmittingPermissions,
  handleResetUserToRoleDefaults,
  activeModalTab,
  setActiveModalTab,
  sidebarDraft,
  handleApplySidebarPreset,
  groupedSidebarStructure,
  collapsedSections,
  handleToggleSectionCollapse,
  handleToggleSectionSidebar,
  handleToggleSubgroupSidebar,
  handleToggleSidebarItem,
  handleApplyAllModulesPreset,
  collapsedWorkflowModules,
  handleToggleModuleCollapse,
  handleSetModulePreset,
  handleToggleSinglePermission,
  handleSavePermissions,
  editingUserProfile,
  setEditingUserProfile,
  isSubmittingEditUser,
  handleSaveEditUser,
  editUserError,
  editUserProfileData,
  setEditUserProfileData,
  showEditPassword,
  setShowEditPassword,
  userToDelete,
  setUserToDelete,
  handleConfirmDelete,
}: UserPermissionModalsProps) {
  return (
    <>
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
    </>
  );
}
