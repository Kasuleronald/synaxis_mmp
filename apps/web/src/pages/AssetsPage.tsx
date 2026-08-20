import { useEffect, useRef, useState } from "react";
import type { AssetDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { optimizeImage } from "../lib/optimizeImage";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

export function AssetsPage() {
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setAssets(await api.get<AssetDto[]>("/assets"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const optimized = await optimizeImage(file);
        const created = await api.upload<AssetDto>("/assets", optimized);
        setAssets((prev) => [created, ...prev]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/assets/${id}`);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this file.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold">Assets</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {uploading ? "Uploading…" : "+ Upload"}
          </button>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Photos, flyers, and documents your church uses -- images are automatically resized and
        recompressed in your browser before upload, so the library stays fast without you having to
        pre-shrink anything yourself.
      </p>

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm max-w-2xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
          Nothing uploaded yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <div
                className="flex items-center justify-center"
                style={{ height: 120, background: "var(--surface-2)", color: "var(--ink-muted)" }}
              >
                {a.mimeType.startsWith("image/") ? (
                  <img src={`/api/assets/${a.id}/file`} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <FileIcon />
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium truncate" title={a.name}>
                  {a.name}
                </div>
                <div className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
                  {formatSize(a.sizeBytes)} · {a.uploadedBy?.fullName ?? "Unknown"}
                </div>
                <div className="flex items-center justify-between">
                  <a
                    href={`/api/assets/${a.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline"
                    style={{ color: "var(--accent-ink)" }}
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    disabled={deletingId === a.id}
                    onClick={() => onDelete(a.id)}
                    title="Delete"
                    className="rounded-md p-1 disabled:opacity-50"
                    style={{ color: "var(--danger)" }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
