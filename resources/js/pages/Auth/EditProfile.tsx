import React, { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { useAuthPermission } from "../../context/AuthPermissionContext";
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

const CROP_VIEWPORT_SIZE = 260;
const CROP_OUTPUT_SIZE = 400;

export function EditProfile({ onBack, onSaveConfirmed }: EditProfileProps) {
  const { currentUser, updateCurrentUser, refreshCurrentUser } = useAuthPermission();

  // Profile fields state initialized from currentUser
  const [name, setName] = useState(currentUser?.name || "Super Administrator GeniusOne");
  const [username, setUsername] = useState(currentUser?.username || "superadmin");
  const [email, setEmail] = useState(currentUser?.email || "superadmin@geniusone.internal");
  const [roleLabel, setRoleLabel] = useState(currentUser?.role_label || currentUser?.role || "Super Administrator");
  const [departmentName, setDepartmentName] = useState(currentUser?.department || "Management & Operations");
  const [employeeCode, setEmployeeCode] = useState(
    currentUser?.employee_id || `USR-2026-${String(currentUser?.id || 1).padStart(4, "0")}`
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState("English (US) — Default");
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentUser?.photo || null);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  // Interactive Photo Crop & Preview Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({
    width: CROP_VIEWPORT_SIZE,
    height: CROP_VIEWPORT_SIZE,
  });
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  // Confirmation dialog & saving state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.status === "success" && data.data) {
          if (data.data.name) setName(data.data.name);
          if (data.data.username) setUsername(data.data.username);
          if (data.data.email) setEmail(data.data.email);
          if (data.data.role_label || data.data.role) {
            setRoleLabel(data.data.role_label || data.data.role);
          }
          if (data.data.department_name) {
            setDepartmentName(data.data.department_name);
          }
          if (data.data.employee_id || data.data.id) {
            setEmployeeCode(
              data.data.employee_id || `USR-2026-${String(data.data.id).padStart(4, "0")}`
            );
          }
          if (data.data.preferred_language === "ID") {
            setLanguage("Bahasa Indonesia");
          }
          setPhotoPreview(data.data.photo || null);
          setPhotoLoadError(false);
        }
      })
      .catch(() => {});
  }, []);

  // Compute base scale so image covers the CROP_VIEWPORT_SIZE square at zoom = 1
  const baseScale = Math.max(
    CROP_VIEWPORT_SIZE / Math.max(1, imgNaturalSize.width),
    CROP_VIEWPORT_SIZE / Math.max(1, imgNaturalSize.height)
  );
  const effectiveScale = baseScale * cropZoom;
  const scaledWidth = imgNaturalSize.width * effectiveScale;
  const scaledHeight = imgNaturalSize.height * effectiveScale;

  // Clamp pan offset so image always covers the circular crop frame
  const clampOffset = useCallback(
    (x: number, y: number, zoomVal: number = cropZoom, natSize = imgNaturalSize) => {
      const bScale = Math.max(
        CROP_VIEWPORT_SIZE / Math.max(1, natSize.width),
        CROP_VIEWPORT_SIZE / Math.max(1, natSize.height)
      );
      const effScale = bScale * zoomVal;
      const maxX = Math.max(0, (natSize.width * effScale - CROP_VIEWPORT_SIZE) / 2);
      const maxY = Math.max(0, (natSize.height * effScale - CROP_VIEWPORT_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [cropZoom, imgNaturalSize]
  );

  const openCropperWithSource = (dataUrl: string) => {
    setCropSource(dataUrl);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setIsCropModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          openCropperWithSource(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nat = {
      width: img.naturalWidth || CROP_VIEWPORT_SIZE,
      height: img.naturalHeight || CROP_VIEWPORT_SIZE,
    };
    setImgNaturalSize(nat);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
  };

  const handleZoomChange = (nextZoom: number) => {
    const clampedZoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
    setCropZoom(clampedZoom);
    setCropOffset((prev) => clampOffset(prev.x, prev.y, clampedZoom));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingCrop(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: cropOffset.x,
      origY: cropOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setCropOffset(clampOffset(dragStartRef.current.origX + dx, dragStartRef.current.origY + dy));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCrop) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsDraggingCrop(false);
    dragStartRef.current = null;
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(cropZoom + delta);
  };

  const handleApplyCrop = () => {
    const img = cropImageRef.current;
    if (!img || !cropSource) {
      setIsCropModalOpen(false);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Map viewport coordinates to output canvas coordinates
        const ratio = CROP_OUTPUT_SIZE / CROP_VIEWPORT_SIZE;
        const drawW = scaledWidth * ratio;
        const drawH = scaledHeight * ratio;
        const drawX = (CROP_VIEWPORT_SIZE / 2 - scaledWidth / 2 + cropOffset.x) * ratio;
        const drawY = (CROP_VIEWPORT_SIZE / 2 - scaledHeight / 2 + cropOffset.y) * ratio;

        ctx.clearRect(0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        const croppedDataUrl = canvas.toDataURL("image/png");
        setPhotoPreview(croppedDataUrl);
        setPhotoLoadError(false);
      }
    } catch {
      // Fallback if canvas fails
      setPhotoPreview(cropSource);
      setPhotoLoadError(false);
    }

    setIsCropModalOpen(false);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    setPhotoLoadError(false);
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
    setSaveError(null);
    setIsSaving(true);
    try {
      const hasValidPhoto = Boolean(photoPreview && !photoLoadError);
      const res = await apiFetch("/api/user/profile", {
        method: "POST",
        body: JSON.stringify({
          name,
          username,
          email,
          preferred_language: language.startsWith("Bahasa") ? "ID" : "EN",
          password: password.trim() ? password : undefined,
          photo: hasValidPhoto ? photoPreview : null,
          remove_photo: !hasValidPhoto,
        }),
      });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setSaveError(json?.message || "Failed to update profile in database.");
        return;
      }

      // Immediately sync updated profile & photo to AuthPermissionContext so topbar Header updates right away
      const updatedPhoto = json?.data?.photo ?? (hasValidPhoto ? photoPreview : null);
      updateCurrentUser({
        name: json?.data?.name || name,
        username: json?.data?.username || username,
        email: json?.data?.email || email,
        photo: updatedPhoto,
      });
      await refreshCurrentUser();

      onSaveConfirmed();
    } catch (e: any) {
      setSaveError(e?.message || "Failed to update profile in database.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDialog = () => {
    setShowSaveDialog(false);
  };

  // Get initials for avatar placeholder
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "AG";

  const showValidPhoto = Boolean(photoPreview && !photoLoadError);

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
              className={`profile-avatar-dropzone ${showValidPhoto ? "has-photo" : ""}`}
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
              {showValidPhoto ? (
                <>
                  <img
                    src={photoPreview!}
                    alt={name || "Profile Avatar"}
                    className="profile-avatar-img"
                    onError={() => {
                      setPhotoLoadError(true);
                      setPhotoPreview(null);
                    }}
                  />
                  <div className="profile-avatar-overlay">
                    <Icon name="upload" size={16} />
                    <span>Change Photo</span>
                  </div>
                </>
              ) : (
                <div className="profile-avatar-empty">
                  <div className="profile-avatar-initials">{initials}</div>
                  <div className="profile-avatar-action-text">
                    <Icon name="upload" size={14} />
                    <strong>Choose Photo</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Buttons for Photo (only when photo is present) */}
            {showValidPhoto && (
              <div className="profile-avatar-actions-row">
                <button
                  type="button"
                  className="profile-avatar-edit-btn"
                  onClick={() => openCropperWithSource(photoPreview!)}
                >
                  Crop / Adjust
                </button>
                <button
                  type="button"
                  className="profile-avatar-remove-btn"
                  onClick={handleRemovePhoto}
                >
                  Remove Photo
                </button>
              </div>
            )}

            {/* User Identity Highlights */}
            <div className="profile-photo-card__identity">
              <h3 className="profile-photo-card__name">{name || "Administrator"}</h3>
              <span className="profile-photo-card__username">@{username || "admin"}</span>
              <div className="profile-photo-card__badge-wrap">
                <Badge tone="green">{roleLabel}</Badge>
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
                <span className="profile-meta-value">{departmentName}</span>
              </div>
              <div className="profile-meta-row">
                <span className="profile-meta-label">User ID</span>
                <span className="profile-meta-value code-pill">{employeeCode}</span>
              </div>
            </div>
          </div>

          <div className="profile-photo-card__footer">
            <span>Supports JPG, PNG, WEBP with Interactive Crop</span>
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
                    value={`${roleLabel} • ${departmentName}`}
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
              <Button type="button" variant="secondary" onClick={onBack} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Interactive Photo Crop & Live Header Preview Modal */}
      {isCropModalOpen && cropSource && (
        <div
          className="profile-crop-modal-backdrop"
          onClick={() => setIsCropModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-modal-title"
        >
          <div className="profile-crop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-crop-modal__header">
              <div>
                <h3 id="crop-modal-title" className="profile-crop-modal__title">
                  Crop & Preview Profile Photo
                </h3>
                <p className="profile-crop-modal__subtitle">
                  Drag the photo to position and use the slider to zoom in or out.
                </p>
              </div>
              <button
                type="button"
                className="profile-crop-modal__close"
                onClick={() => setIsCropModalOpen(false)}
                aria-label="Close crop dialog"
              >
                ×
              </button>
            </div>

            <div className="profile-crop-modal__body">
              {/* Left: Interactive Drag & Zoom Crop Stage */}
              <div className="profile-crop-stage-col">
                <div
                  className={`profile-crop-viewport ${isDraggingCrop ? "is-dragging" : ""}`}
                  style={{ width: CROP_VIEWPORT_SIZE, height: CROP_VIEWPORT_SIZE }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheelZoom}
                >
                  <img
                    ref={cropImageRef}
                    src={cropSource}
                    alt="Crop source"
                    onLoad={handleCropImageLoad}
                    draggable={false}
                    className="profile-crop-source-img"
                    style={{
                      width: `${scaledWidth}px`,
                      height: `${scaledHeight}px`,
                      left: `calc(50% - ${scaledWidth / 2}px + ${cropOffset.x}px)`,
                      top: `calc(50% - ${scaledHeight / 2}px + ${cropOffset.y}px)`,
                    }}
                  />
                  {/* Circular Avatar Cutout Mask & Grid Guide */}
                  <div className="profile-crop-circle-mask" />
                </div>

                {/* Zoom Controls */}
                <div className="profile-crop-controls">
                  <div className="profile-crop-zoom-row">
                    <button
                      type="button"
                      className="profile-crop-zoom-btn"
                      onClick={() => handleZoomChange(cropZoom - 0.15)}
                      disabled={cropZoom <= 1}
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.02}
                      value={cropZoom}
                      onChange={(e) => handleZoomChange( parseFloat(e.target.value) )}
                      className="profile-crop-slider"
                      aria-label="Zoom level"
                    />
                    <button
                      type="button"
                      className="profile-crop-zoom-btn"
                      onClick={() => handleZoomChange(cropZoom + 0.15)}
                      disabled={cropZoom >= 3}
                    >
                      +
                    </button>
                  </div>
                  <div className="profile-crop-meta-row">
                    <span>Zoom: {Math.round(cropZoom * 100)}%</span>
                    <button
                      type="button"
                      className="profile-crop-reset-btn"
                      onClick={() => {
                        setCropZoom(1);
                        setCropOffset({ x: 0, y: 0 });
                      }}
                    >
                      Reset Position
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Live Preview in Profile Card & Top-Right Header */}
              <div className="profile-crop-preview-col">
                <div className="profile-crop-preview-section">
                  <span className="profile-crop-preview-label">PROFILE AVATAR PREVIEW</span>
                  <div className="profile-crop-live-circle profile-crop-live-circle--lg">
                    <div
                      className="profile-crop-live-inner"
                      style={{
                        transform: `scale(${88 / CROP_VIEWPORT_SIZE})`,
                        width: CROP_VIEWPORT_SIZE,
                        height: CROP_VIEWPORT_SIZE,
                      }}
                    >
                      <img
                        src={cropSource}
                        alt="Live avatar preview"
                        draggable={false}
                        style={{
                          position: "absolute",
                          maxWidth: "none",
                          width: `${scaledWidth}px`,
                          height: `${scaledHeight}px`,
                          left: `calc(50% - ${scaledWidth / 2}px + ${cropOffset.x}px)`,
                          top: `calc(50% - ${scaledHeight / 2}px + ${cropOffset.y}px)`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-crop-preview-section">
                  <span className="profile-crop-preview-label">TOP-RIGHT HEADER PREVIEW</span>
                  <div className="profile-crop-header-mockup">
                    <div className="profile-crop-live-circle profile-crop-live-circle--sm">
                      <div
                        className="profile-crop-live-inner"
                        style={{
                          transform: `scale(${32 / CROP_VIEWPORT_SIZE})`,
                          width: CROP_VIEWPORT_SIZE,
                          height: CROP_VIEWPORT_SIZE,
                        }}
                      >
                        <img
                          src={cropSource}
                          alt="Live header preview"
                          draggable={false}
                          style={{
                            position: "absolute",
                            maxWidth: "none",
                            width: `${scaledWidth}px`,
                            height: `${scaledHeight}px`,
                            left: `calc(50% - ${scaledWidth / 2}px + ${cropOffset.x}px)`,
                            top: `calc(50% - ${scaledHeight / 2}px + ${cropOffset.y}px)`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="profile-crop-header-mockup__text">
                      <strong>{name || currentUser?.name || "User"}</strong>
                      <small>{currentUser?.role || "superadmin"}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-crop-modal__footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCropModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleApplyCrop}>
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      )}

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
