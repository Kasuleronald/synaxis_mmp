import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";
import { optimizeImage } from "../lib/optimizeImage";
import { ChangePasswordModal } from "./ChangePasswordModal";

const AVATAR_MAX_DIMENSION = 512;

function initialsOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** Self-service profile photo, shown top-right in the header. Editable only
 * for the signed-in user's own account -- there's no "set someone else's
 * avatar" affordance anywhere, this is always about `useAuth().user`. */
export function Avatar() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!user) return null;

  async function onUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const optimized = await optimizeImage(file, { maxDimension: AVATAR_MAX_DIMENSION });
      const uploaded = await api.upload<{ id: string }>("/assets", optimized);
      await api.patch("/users/me/avatar", { assetId: uploaded.id });
      await refreshUser();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemove() {
    setUploading(true);
    setError(null);
    try {
      await api.delete("/users/me/avatar");
      await refreshUser();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove your photo.");
    } finally {
      setUploading(false);
    }
  }

  const photoSrc = user.avatarAssetId ? `/api/assets/${user.avatarAssetId}/file` : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Your profile photo"
        className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{ width: 30, height: 30, background: "var(--accent)" }}
      >
        {photoSrc ? (
          <img src={photoSrc} alt={user.fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-white">{initialsOf(user.fullName)}</span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl border p-3 z-50 shadow-lg"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{ width: 44, height: 44, background: "var(--accent)" }}
            >
              {photoSrc ? (
                <img src={photoSrc} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-white">{initialsOf(user.fullName)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.fullName}</div>
              <div className="text-xs truncate" style={{ color: "var(--ink-muted)" }}>{user.email}</div>
            </div>
          </div>

          {error && (
            <div className="rounded-md px-2 py-1.5 mb-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files)} />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {uploading ? "Uploading…" : "Change photo"}
            </button>
            {photoSrc && (
              <button
                type="button"
                disabled={uploading}
                onClick={onRemove}
                className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
              >
                Remove photo
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowChangePassword(true);
                setOpen(false);
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Change password
            </button>
          </div>
        </div>
      )}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
