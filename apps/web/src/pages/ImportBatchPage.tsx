import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ImportRowStatus, ImportStatus, type ImportBatchDto, type ImportStagingRowDto } from "@life-mmp/shared";
import { api } from "../lib/api";

type BatchWithRows = ImportBatchDto & { rows: ImportStagingRowDto[] };

function confidenceColor(c: number | null): string {
  if (c === null) return "var(--ink-muted)";
  if (c >= 0.8) return "var(--accent-ink)";
  if (c >= 0.55) return "var(--warn)";
  return "var(--danger)";
}

export function ImportBatchPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchWithRows | null>(null);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<{ committed: number; skipped: number } | null>(null);

  async function load() {
    if (!id) return;
    setBatch(await api.get<BatchWithRows>(`/imports/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateRow(rowId: string, patch: Partial<ImportStagingRowDto>) {
    if (!batch) return;
    setBatch({ ...batch, rows: batch.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) });
    await api.patch(`/imports/rows/${rowId}`, patch);
  }

  async function setField(row: ImportStagingRowDto, field: string, value: string) {
    await updateRow(row.id, { extractedFields: { ...row.extractedFields, [field]: value } });
  }

  async function approveAll() {
    if (!batch) return;
    const pending = batch.rows.filter((r) => r.status === ImportRowStatus.PENDING);
    await Promise.all(pending.map((r) => updateRow(r.id, { status: ImportRowStatus.APPROVED })));
  }

  async function onCommit() {
    if (!id) return;
    setCommitting(true);
    try {
      const result = await api.post<{ committed: number; skipped: number }>(`/imports/${id}/commit`);
      setSummary(result);
      load();
    } finally {
      setCommitting(false);
    }
  }

  if (!batch) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  const approvedCount = batch.rows.filter((r) => r.status === ImportRowStatus.APPROVED).length;
  const isCommitted = batch.status === ImportStatus.COMMITTED;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{batch.filename}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        {batch.rows.length} rows extracted{batch.usedAi ? " with AI assistance" : ""}. Review, fix anything
        wrong, then approve what's ready to become real member records.
      </p>

      {summary && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm max-w-xl" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          Committed {summary.committed} member{summary.committed === 1 ? "" : "s"}
          {summary.skipped > 0 ? `; ${summary.skipped} left in staging (not approved)` : ""}.
        </div>
      )}

      {!isCommitted && (
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={approveAll}
            className="rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Approve all
          </button>
          <button
            type="button"
            disabled={approvedCount === 0 || committing}
            onClick={onCommit}
            className="rounded-md px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {committing ? "Committing…" : `Commit ${approvedCount} approved`}
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              <th className="text-left px-3 py-2 font-medium">Full name</th>
              <th className="text-left px-3 py-2 font-medium">Phone</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Confidence</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              {!isCommitted && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.fullName
                  ) : (
                    <input
                      value={row.extractedFields.fullName ?? ""}
                      onChange={(e) => setField(row, "fullName", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    />
                  )}
                  {row.possibleDuplicateOfId && (
                    <div className="text-xs mt-0.5" style={{ color: "var(--warn)" }}>
                      Possible duplicate of an existing member
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.phone
                  ) : (
                    <input
                      value={row.extractedFields.phone ?? ""}
                      onChange={(e) => setField(row, "phone", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.email
                  ) : (
                    <input
                      value={row.extractedFields.email ?? ""}
                      onChange={(e) => setField(row, "email", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <span style={{ color: confidenceColor(row.confidence) }}>
                    {row.confidence !== null ? `${Math.round(row.confidence * 100)}%` : "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "var(--ink-muted)" }}>
                  {row.status}
                </td>
                {!isCommitted && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, { status: ImportRowStatus.APPROVED })}
                        className="rounded px-2 py-1 text-xs"
                        style={
                          row.status === ImportRowStatus.APPROVED
                            ? { background: "var(--accent)", color: "white" }
                            : { background: "var(--surface-2)", color: "var(--ink)" }
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRow(row.id, { status: ImportRowStatus.REJECTED })}
                        className="rounded px-2 py-1 text-xs"
                        style={
                          row.status === ImportRowStatus.REJECTED
                            ? { background: "var(--danger)", color: "white" }
                            : { background: "var(--surface-2)", color: "var(--ink)" }
                        }
                      >
                        Skip
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
