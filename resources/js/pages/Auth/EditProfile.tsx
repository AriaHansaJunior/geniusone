import React, { useState, useRef } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

interface EditProfileProps {
  onBack: () => void;
  onSaveConfirmed: () => void;
}

export function EditProfile({ onBack, onSaveConfirmed }: EditProfileProps) {
  // Temporary component state for profile fields
  const [name, setName] = useState("Rizky Aditya");
  const [username, setUsername] = useState("rizky.aditya");
  const [email, setEmail] = useState("rizky.aditya@geniusone.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState("English (US)");
  const [photoName, setPhotoName] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Confirmation dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/user/profile", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
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
      setPhotoName(file.name);
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

  const handleRemovePhoto = () => {
    setPhotoName("");
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowSaveDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveDialog(false);
    try {
      await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          username,
          email,
          password: password.trim() ? password : undefined,
          photo: photoPreview || undefined,
        }),
      });
    } catch (e) {
      console.warn("Failed to update profile to database:", e);
    }
    onSaveConfirmed();
  };

  const handleCancelDialog = () => {
    setShowSaveDialog(false);
    // User remains on the page with unsaved form values preserved in component state
  };

  return (
    <div className="full-page-detail edit-profile-page">
      {/* Top Action & Navigation Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button
            type="button"
            className="btn-back-pill"
            onClick={onBack}
            aria-label="Back to dashboard"
          >
            <span>Back</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Home</a>
            <span>/</span>
            <a>User Settings</a>
            <span>/</span>
            <span className="current">Edit Profile</span>
          </div>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">USER PROFILE & PREFERENCES</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">Edit Profile</h2>
          </div>
          <span className="detail-header-card__meta">
            Manage your personal profile details, credentials, and profile photo.
          </span>
        </div>
      </div>

      {/* Main Content Layout: Profile Info Panel + Edit Form */}
      <div className="edit-profile-layout">
        {/* Panel A: Profile Information Panel */}
        <aside className="profile-info-panel">
          <div className="profile-info-panel__header">
            <div className="profile-info-avatar-wrapper">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile Avatar Preview"
                  className="profile-info-avatar-img"
                />
              ) : (
                <div className="profile-info-avatar">RA</div>
              )}
              <span className="profile-status-indicator" title="Status: Active" />
            </div>

            <h3 className="profile-info-name">{name || "Rizky Aditya"}</h3>
            <span className="profile-info-username">@{username || "rizky.aditya"}</span>
            <div className="profile-info-badge-row">
              <Badge tone="green">Procurement Manager</Badge>
            </div>
          </div>

          <div className="profile-info-panel__details">
            <div className="profile-info-item">
              <span className="profile-info-item__label">Email Address</span>
              <strong className="profile-info-item__value">{email || "—"}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-item__label">Department</span>
              <strong className="profile-info-item__value">Procurement & Supply Chain</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-item__label">Organization</span>
              <strong className="profile-info-item__value">PT GENIUS ONE</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-item__label">Current Language</span>
              <strong className="profile-info-item__value">{language}</strong>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-item__label">User ID</span>
              <strong className="profile-info-item__value code-pill">USR-2026-0842</strong>
            </div>
          </div>

          <div className="profile-info-panel__footer-notice">
            <Icon name="alertTriangle" size={13} />
            <span>Profile updates are subject to enterprise auditing policies.</span>
          </div>
        </aside>

        {/* Panel B: Edit Profile Form */}
        <section className="profile-edit-section">
          <form onSubmit={handleFormSubmit} className="create-form-card">
            <div className="create-form-card__header">
              <h3>
                <Icon name="user" size={15} />
                <span>Personal & Account Information</span>
              </h3>
              <span className="create-form-card__subtitle">All changes will be reviewed before applying</span>
            </div>

            <div className="profile-form-grid">
              {/* Row 1: Name & Username */}
              <div className="form-group">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              {/* Row 2: Email & Password */}
              <div className="form-group">
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter corporate email address"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-password">Change Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="profile-password"
                    type={showPassword ? "text" : "password"}
                    className="form-input form-input--password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (blank = keep current)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={15} />
                  </button>
                </div>
                <small className="form-helper-text">
                  Min. 8 chars with uppercase and number.
                </small>
              </div>

              {/* Row 3: Photo & Language */}
              <div className="form-group">
                <label>Change Photo Profile</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                  id="profile-photo-upload"
                />

                <div className="photo-upload-container">
                  <div className="photo-upload-preview-area">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo Preview"
                        className="photo-upload-thumbnail"
                      />
                    ) : (
                      <div className="photo-upload-placeholder">
                        <Icon name="user" size={18} />
                      </div>
                    )}
                  </div>

                  <div className="photo-upload-actions">
                    <div className="photo-upload-btn-row">
                      <Button
                        type="button"
                        variant="secondary"
                        icon="upload"
                        onClick={handleTriggerUpload}
                      >
                        Choose Photo
                      </Button>
                      {photoPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          icon="close"
                          onClick={handleRemovePhoto}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <span className="photo-upload-hint">
                      {photoName
                        ? `Selected: ${photoName}`
                        : "JPG, PNG, WEBP. Max 2MB."}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="profile-language">Change Language</label>
                <div className="select-with-icon">
                  <select
                    id="profile-language"
                    className="form-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="English (US)">English (US) — Default</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                  </select>
                </div>
                <small className="form-helper-text">
                  Interface language across all modules.
                </small>
              </div>
            </div>

            <div className="create-actions-footer">
              <Button type="button" variant="secondary" onClick={onBack}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon="check">
                Save Changes
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Save Confirmation Dialog (Temporary Frontend Simulation) */}
      <ConfirmDialog
        isOpen={showSaveDialog}
        title="Confirm Profile Changes"
        message="Are you sure the information is correct? Your changes will not be saved permanently in this version."
        confirmLabel="Confirm & Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="alertTriangle"
        notice="Temporary simulation: Profile changes will reset upon navigating away."
        onConfirm={handleConfirmSave}
        onCancel={handleCancelDialog}
      />
    </div>
  );
}

export default EditProfile;
