import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { apiFetch } from "../../data/api";

interface EditProfileProps {
  onBack: () => void;
  onSaveConfirmed: () => void;
}

const LANGUAGE_OPTIONS = [
  "English (US) — Default",
  "English (UK)",
  "Bahasa Indonesia",
];

export function EditProfile({ onBack, onSaveConfirmed }: EditProfileProps) {
  // Temporary component state for profile fields
  const [name, setName] = useState("Super Administrator GeniusOne");
  const [username, setUsername] = useState("superadmin");
  const [email, setEmail] = useState("superadmin@geniusone.internal");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState("English (US) — Default");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Confirmation dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status === "success" && data.data) {
          if (data.data.name) setName(data.data.name);
          if (data.data.username) setUsername(data.data.username);
          if (data.data.email) setEmail(data.data.email);
          if (data.data.photo) setPhotoPreview(data.data.photo);
        }
      })
      .catch(() => {});
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotoPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowSaveDialog(true);
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleConfirmSave = async () => {
    setShowSaveDialog(false);
    setSaveError(null);
    try {
      const res = await apiFetch("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({
          name,
          username,
          email,
          password: password.trim() ? password : undefined,
          photo: photoPreview || undefined,
        }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setSaveError(json?.message || "Failed to update profile in database.");
        return;
      }
      onSaveConfirmed();
    } catch (e: any) {
      console.warn("Failed to update profile to database:", e);
      setSaveError(e?.message || "Failed to update profile in database.");
    }
  };

  const handleCancelDialog = () => {
    setShowSaveDialog(false);
  };

  // Get initials for avatar placeholder
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "AG";

  return (
    <div className="full-page-detail edit-profile-page">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handlePhotoChange}
        style={{ display: "none" }}
        id="profile-photo-upload"
      />

      {/* Main Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">Edit Profile</h2>
          </div>
          <span className="detail-header-card__meta">
            Manage your personal profile details, credentials, and system preferences.
          </span>
        </div>
      </div>

      {saveError && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontSize: "0.875rem",
          }}
        >
          {saveError}
        </div>
      )}

      {/* Main Content Layout: Balanced Two-Column Structure */}
      <div className="edit-profile-layout">
        {/* Left Column: Profile Photo & Identity Card */}
        <aside className="profile-photo-card">
          <div className="profile-photo-card__header">
            <span className="profile-photo-card__label">PROFILE PHOTO</span>
          </div>

          <div className="profile-photo-card__body">
            {/* Interactive Circular Avatar Dropzone */}
            <div
              className={`profile-avatar-dropzone ${photoPreview ? "has-photo" : ""}`}
              onClick={handleTriggerUpload}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTriggerUpload();
                }
              }}
              title="Click to choose or change profile photo"
            >
              {photoPreview ? (
                <>
                  <img
                    src={photoPreview}
                    alt="Profile Avatar Preview"
                    className="profile-avatar-img"
                  />
                  <div className="profile-avatar-overlay">
                    <Icon name="upload" size={16} />
                    <span>Change</span>
                  </div>
                </>
              ) : (
                <div className="profile-avatar-empty">
                  <div className="profile-avatar-initials">{initials}</div>
                  <div className="profile-avatar-action-text">
                    <Icon name="upload" size={14} />
                    <strong>Choose Photo</strong>
                    <small>Click to upload</small>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button if photo exists */}
            {photoPreview && (
              <button
                type="button"
                className="profile-avatar-remove-btn"
                onClick={handleRemovePhoto}
              >
                <Icon name="close" size={12} />
                <span>Remove Photo</span>
              </button>
            )}

            {/* User Identity Highlights */}
            <div className="profile-photo-card__identity">
              <h3 className="profile-photo-card__name">{name || "Administrator"}</h3>
              <span className="profile-photo-card__username">@{username || "admin"}</span>
              <div className="profile-photo-card__badge-wrap">
                <Badge tone="green">Procurement Manager</Badge>
              </div>
            </div>

            {/* Metadata Summary List */}
            <div className="profile-photo-card__meta-list">
              <div className="profile-meta-row">
                <span className="profile-meta-label">Organization</span>
                <span className="profile-meta-value">PT GENIUS ONE</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">Department</span>
                <span className="profile-meta-value">Procurement & Supply Chain</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">User ID</span>
                <span className="profile-meta-value code-pill">USR-2026-0842</span>
              </div>
            </div>
          </div>

          <div className="profile-photo-card__footer">
            <span>Supports JPG, PNG, WEBP (Max 2MB)</span>
          </div>
        </aside>

        {/* Right Column: Structured Information Sections */}
        <section className="profile-form-section">
          <form onSubmit={handleFormSubmit} className="profile-form-card">
            {/* Step 1: Personal Information */}
            <div className="profile-form-group-card">
              <div className="profile-form-group-header">
                <div className="profile-step-tag">STEP 1</div>
                <h3 className="profile-form-group-title">Personal Information</h3>
                <p className="profile-form-group-desc">
                  Corporate identity and employee account details.
                </p>
              </div>

              <div className="profile-form-fields-grid">
                <div className="master-form-group">
                  <label className="master-form-label">
                    Full Name <span style={{ color: "var(--red-600)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="master-form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">
                    Username <span style={{ color: "var(--red-600)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="master-form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">
                    Corporate Email <span style={{ color: "var(--red-600)" }}>*</span>
                  </label>
                  <input
                    type="email"
                    className="master-form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter corporate email address"
                    required
                  />
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">Role & Department</label>
                  <input
                    type="text"
                    className="master-form-input"
                    value="Procurement Manager • Supply Chain"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Security & System Preferences */}
            <div className="profile-form-group-card">
              <div className="profile-form-group-header">
                <div className="profile-step-tag">STEP 2</div>
                <h3 className="profile-form-group-title">Security & System Preferences</h3>
                <p className="profile-form-group-desc">
                  Manage login credentials and default display language.
                </p>
              </div>

              <div className="profile-form-fields-grid">
                <div className="master-form-group">
                  <label className="master-form-label">Change Password</label>
                  <div className="password-input-wrapper" style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="master-form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password (blank = keep current)"
                      autoComplete="new-password"
                      style={{ paddingRight: "40px" }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      title={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "var(--slate-400)",
                        cursor: "pointer",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                    </button>
                  </div>
                  <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", display: "block" }}>
                    Min. 8 chars with uppercase and number.
                  </small>
                </div>

                <div className="master-form-group">
                  <label className="master-form-label">Change Language</label>
                  <CustomSelect
                    value={language}
                    onChange={(val) => setLanguage(val)}
                    options={LANGUAGE_OPTIONS}
                  />
                  <small style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", display: "block" }}>
                    Interface language across all modules.
                  </small>
                </div>
              </div>
            </div>

            {/* Form Action Buttons: Cancel & Save Changes */}
            <div className="profile-form-actions">
              <Button type="button" variant="secondary" onClick={onBack}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Changes
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveDialog}
        title="Confirm Profile Changes"
        message="Are you sure the updated profile information is correct?"
        confirmLabel="Confirm & Save"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="alertTriangle"
        onConfirm={handleConfirmSave}
        onCancel={handleCancelDialog}
      />
    </div>
  );
}

export default EditProfile;
