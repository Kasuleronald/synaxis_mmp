import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  COUNTRIES,
  Gender,
  ImportRowStatus,
  ImportStatus,
  MaritalStatus,
  MemberStatus,
  type ImportBatchDto,
  type ImportStagingRowDto,
} from "@life-mmp/shared";
import { api } from "../lib/api";

type BatchWithRows = ImportBatchDto & { rows: ImportStagingRowDto[] };

const GENDER_LABELS: Record<Gender, string> = { MALE: "Male", FEMALE: "Female" };
const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};
const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  VISITOR: "Visitor",
  NEW_CONVERT: "New convert",
  MEMBER: "Member",
  INACTIVE: "Inactive",
};

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function load() {
    if (!id) return;
    setBatch(await api.get<BatchWithRows>(`/imports/${id}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateRow(rowId: string, patch: Partial<ImportStagingRowDto>) {
    // Functional update, not a closure over `batch` -- bulk actions call
    // this for several rows in parallel (Promise.all), and each call needs
    // to build on whatever the *latest* state is, not the snapshot from
    // when the batch of calls started, or later calls would overwrite
    // earlier ones' optimistic updates.
    setBatch((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : prev));
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

  function toggleSelected(rowId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!batch) return;
    setSelectedIds((prev) => (prev.size === batch.rows.length ? new Set() : new Set(batch.rows.map((r) => r.id))));
  }

  async function approveSelected() {
    await Promise.all([...selectedIds].map((rowId) => updateRow(rowId, { status: ImportRowStatus.APPROVED })));
    setSelectedIds(new Set());
  }

  async function skipSelected() {
    await Promise.all([...selectedIds].map((rowId) => updateRow(rowId, { status: ImportRowStatus.REJECTED })));
    setSelectedIds(new Set());
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
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={approveSelected}
                className="rounded-md px-3 py-1.5 text-sm font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                Approve selected
              </button>
              <button
                type="button"
                onClick={skipSelected}
                className="rounded-md px-3 py-1.5 text-sm font-medium"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                Skip selected
              </button>
            </>
          )}
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
              {!isCommitted && (
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === batch.rows.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th className="text-left px-3 py-2 font-medium">Full name</th>
              <th className="text-left px-3 py-2 font-medium">Member #</th>
              <th className="text-left px-3 py-2 font-medium">Phone</th>
              <th className="text-left px-3 py-2 font-medium">Email</th>
              <th className="text-left px-3 py-2 font-medium">Gender</th>
              <th className="text-left px-3 py-2 font-medium">Date of birth</th>
              <th className="text-left px-3 py-2 font-medium">Address</th>
              <th className="text-left px-3 py-2 font-medium">Nationality</th>
              <th className="text-left px-3 py-2 font-medium">Marital status</th>
              <th className="text-left px-3 py-2 font-medium">Member status</th>
              <th className="text-left px-3 py-2 font-medium">Confidence</th>
              <th className="text-left px-3 py-2 font-medium">Review</th>
              {!isCommitted && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {batch.rows.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                {!isCommitted && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                    />
                  </td>
                )}
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.fullName
                  ) : (
                    <input
                      value={row.extractedFields.fullName ?? ""}
                      onChange={(e) => setField(row, "fullName", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)", minWidth: 140 }}
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
                    row.extractedFields.memberNumber
                  ) : (
                    <input
                      value={row.extractedFields.memberNumber ?? ""}
                      onChange={(e) => setField(row, "memberNumber", e.target.value)}
                      placeholder="Auto"
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)", minWidth: 70 }}
                    />
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
                      style={{ borderColor: "var(--line)", minWidth: 120 }}
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
                      style={{ borderColor: "var(--line)", minWidth: 150 }}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.gender ? GENDER_LABELS[row.extractedFields.gender] : ""
                  ) : (
                    <select
                      value={row.extractedFields.gender ?? ""}
                      onChange={(e) => setField(row, "gender", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <option value="">—</option>
                      {Object.entries(GENDER_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.dateOfBirth
                  ) : (
                    <input
                      value={row.extractedFields.dateOfBirth ?? ""}
                      onChange={(e) => setField(row, "dateOfBirth", e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)", minWidth: 100 }}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.address
                  ) : (
                    <input
                      value={row.extractedFields.address ?? ""}
                      onChange={(e) => setField(row, "address", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)", minWidth: 120 }}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.nationality
                  ) : (
                    <select
                      value={row.extractedFields.nationality ?? ""}
                      onChange={(e) => setField(row, "nationality", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)", minWidth: 130 }}
                    >
                      <option value="">Not set</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.maritalStatus ? MARITAL_STATUS_LABELS[row.extractedFields.maritalStatus] : ""
                  ) : (
                    <select
                      value={row.extractedFields.maritalStatus ?? ""}
                      onChange={(e) => setField(row, "maritalStatus", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <option value="">—</option>
                      {Object.entries(MARITAL_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isCommitted ? (
                    row.extractedFields.status ? MEMBER_STATUS_LABELS[row.extractedFields.status] : "Member"
                  ) : (
                    <select
                      value={row.extractedFields.status ?? ""}
                      onChange={(e) => setField(row, "status", e.target.value)}
                      className="rounded border px-2 py-1 text-sm w-full"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <option value="">Member (default)</option>
                      {Object.entries(MEMBER_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
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
