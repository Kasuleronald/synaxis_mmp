import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { ImportStatus, type ImportBatchDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";

const STATUS_LABELS: Record<ImportStatus, string> = {
  UPLOADED: "Uploaded",
  EXTRACTING: "Extracting",
  READY_FOR_REVIEW: "Ready for review",
  COMMITTED: "Committed",
};

function downloadStarterTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Full Name", "Phone", "Gender", "Date of Birth", "Address"],
    ["Jane Doe", "+256700000000", "Female", "1990-05-14", "Kampala"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, "life-mmp-member-import-template.xlsx");
}

export function ImportCenterPage() {
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function load() {
    setBatches(await api.get<ImportBatchDto[]>("/imports"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const batch = await api.upload<ImportBatchDto & { id: string }>("/imports", file);
      navigate(`/imports/${batch.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Import Center</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Bring your existing membership records in -- whatever format they're already in. AI never
        writes a record directly; you always review before anything is committed.
      </p>

      <div
        className="rounded-xl border-2 border-dashed p-8 mb-4 text-center"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
        <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
          Excel, CSV, or PDF -- a member list, an attendance register, whatever you have.
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {uploading ? "Uploading…" : "Choose a file"}
        </button>
        <p className="text-xs mt-3">
          <button type="button" onClick={downloadStarterTemplate} className="underline" style={{ color: "var(--accent-ink)" }}>
            Or download a starter template
          </button>{" "}
          <span style={{ color: "var(--ink-muted)" }}>if you're starting from scratch.</span>
        </p>
      </div>

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Previous imports
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {batches.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No imports yet.
          </div>
        )}
        {batches.map((b) => (
          <Link
            key={b.id}
            to={`/imports/${b.id}`}
            className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
            style={{ borderColor: "var(--line-soft)" }}
          >
            <div>
              <div className="text-sm font-medium">{b.filename}</div>
              <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {b.rowCount ?? 0} rows{b.usedAi ? " · AI-assisted" : ""}
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
              {STATUS_LABELS[b.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
