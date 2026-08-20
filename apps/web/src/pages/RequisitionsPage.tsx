import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Role,
  type FellowshipDto,
  type FundRequisitionDto,
  type OrgUnitDto,
} from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { api, ApiError } from "../lib/api";
import { optimizeImage } from "../lib/optimizeImage";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";

function formatMoney(amount: number | string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "var(--warn)",
  APPROVED: "var(--accent-ink)",
  REJECTED: "var(--danger)",
  PENDING: "var(--warn)",
};

type OrgUnitNode = OrgUnitDto & { children: OrgUnitNode[] };

export function RequisitionsPage() {
  const { user } = useAuth();
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const canReview = user?.role === Role.ORG_ADMIN || user?.role === Role.FINANCE_OFFICER;

  const [requisitions, setRequisitions] = useState<FundRequisitionDto[]>([]);
  const [departments, setDepartments] = useState<OrgUnitDto[]>([]);
  const [fellowships, setFellowships] = useState<FellowshipDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [fellowshipId, setFellowshipId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [accountingForId, setAccountingForId] = useState<string | null>(null);
  const [amountSpent, setAmountSpent] = useState("");
  const [description, setDescription] = useState("");
  const [receiptPhotos, setReceiptPhotos] = useState<{ id: string; name: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [r, d, f] = await Promise.all([
      api.get<FundRequisitionDto[]>("/requisitions"),
      api.get<OrgUnitNode[]>("/org-units"),
      api.get<FellowshipDto[]>("/fellowships"),
    ]);
    setRequisitions(r);
    setDepartments(d.flatMap((directorate) => [directorate, ...directorate.children]));
    setFellowships(f);
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/requisitions", {
        amount: Number(amount),
        reason,
        departmentId: departmentId || undefined,
        fellowshipId: fellowshipId || undefined,
      });
      setAmount("");
      setReason("");
      setDepartmentId("");
      setFellowshipId("");
      setConfirming(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit this requisition.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  async function reviewRequisition(id: string, action: "approve" | "reject") {
    try {
      await api.post(`/requisitions/${id}/${action}`, { note: reviewNote || undefined });
      setReviewingId(null);
      setReviewNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't review this requisition.");
    }
  }

  async function reviewAccountability(id: string, action: "approve" | "reject") {
    try {
      await api.post(`/requisitions/accountability/${id}/${action}`, { note: reviewNote || undefined });
      setReviewNote("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't review this accountability.");
    }
  }

  async function onUploadReceipt(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        const optimized = await optimizeImage(file);
        const uploaded = await api.upload<{ id: string; name: string }>("/assets", optimized);
        setReceiptPhotos((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function submitAccountability() {
    if (!accountingForId) return;
    try {
      await api.post(`/requisitions/${accountingForId}/accountability`, {
        amountSpent: Number(amountSpent),
        description,
        receiptAssetIds: receiptPhotos.map((p) => p.id),
      });
      setAccountingForId(null);
      setAmountSpent("");
      setDescription("");
      setReceiptPhotos([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't file this accountability.");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Fund requisitions</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Money out, then prove how it was spent -- a leader asks for funds for a stated reason,
        finance approves or rejects, and only afterward does the leader file an accountability
        report of what it actually went toward, reviewed separately.
      </p>

      {error && (
        <div className="rounded-md px-3 py-2 mb-4 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-6 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Amount ({currency})</label>
          <input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Department (optional)</label>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Reason</label>
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div>
          <label className="block text-sm mb-1">Fellowship (optional)</label>
          <select value={fellowshipId} onChange={(e) => setFellowshipId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}>
            <option value="">None</option>
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
            Request funds
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Submit this requisition?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Amount", value: amount ? formatMoney(amount, currency) : "" },
            { label: "Reason", value: reason },
            { label: "Department", value: departments.find((d) => d.id === departmentId)?.name ?? "" },
            { label: "Fellowship", value: fellowships.find((f) => f.id === fellowshipId)?.name ?? "" },
          ]}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {requisitions.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>No requisitions yet.</div>
        )}
        {requisitions.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {formatMoney(r.amount, r.currency)} <span style={{ color: "var(--ink-muted)" }}>· {r.reason}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Requested by {r.requestedBy?.fullName}
                  {r.department && ` · ${r.department.name}`}
                  {r.fellowship && ` · ${r.fellowship.name}`}
                </div>
              </div>
              <span className="text-xs font-medium shrink-0" style={{ color: STATUS_COLORS[r.status] }}>
                {r.status === "REQUESTED" ? "Pending" : r.status === "APPROVED" ? "Approved" : "Rejected"}
              </span>
            </div>

            {r.status === "REQUESTED" && canReview && user?.id !== r.requestedById && (
              <div className="mt-2">
                {reviewingId === r.id ? (
                  <div className="flex items-center gap-2">
                    <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Note (optional)" className="flex-1 rounded-md border px-2 py-1 text-xs" style={{ borderColor: "var(--line)" }} />
                    <button type="button" onClick={() => reviewRequisition(r.id, "approve")} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>Approve</button>
                    <button type="button" onClick={() => reviewRequisition(r.id, "reject")} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Reject</button>
                    <button type="button" onClick={() => setReviewingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setReviewingId(r.id)} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>Review</button>
                )}
              </div>
            )}

            {r.status === "APPROVED" && !r.accountability && r.requestedById === user?.id && (
              <div className="mt-2">
                {accountingForId === r.id ? (
                  <div className="rounded-md border p-3 grid gap-2" style={{ borderColor: "var(--line)" }}>
                    <input type="number" min="0" step="0.01" value={amountSpent} onChange={(e) => setAmountSpent(e.target.value)} placeholder={`Amount spent (${r.currency})`} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was it spent on?" rows={2} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                    <div>
                      <input ref={photoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => onUploadReceipt(e.target.files)} />
                      <button type="button" disabled={uploadingPhoto} onClick={() => photoInputRef.current?.click()} className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                        {uploadingPhoto ? "Uploading…" : "+ Add receipt photos"}
                      </button>
                      {receiptPhotos.length > 0 && <span className="text-xs ml-2" style={{ color: "var(--ink-muted)" }}>{receiptPhotos.length} attached</span>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={!amountSpent || !description.trim()} onClick={submitAccountability} className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60" style={{ background: "var(--accent)", color: "white" }}>Submit</button>
                      <button type="button" onClick={() => setAccountingForId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAccountingForId(r.id)} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>File accountability</button>
                )}
              </div>
            )}

            {r.accountability && (
              <div className="mt-2 rounded-md border p-3" style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    Spent {formatMoney(r.accountability.amountSpent, r.currency)} -- {r.accountability.description}
                  </div>
                  <span className="text-xs font-medium shrink-0" style={{ color: STATUS_COLORS[r.accountability.status] }}>
                    {r.accountability.status === "PENDING" ? "Pending review" : r.accountability.status === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                </div>
                {r.accountability.receipts.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {r.accountability.receipts.map((p) => (
                      <a key={p.id} href={`/api/assets/${p.asset.id}/file`} target="_blank" rel="noreferrer">
                        <img src={`/api/assets/${p.asset.id}/file`} alt={p.asset.name} className="rounded-md object-cover" style={{ width: 56, height: 56 }} />
                      </a>
                    ))}
                  </div>
                )}
                {r.accountability.status === "PENDING" && canReview && user?.id !== r.accountability.submittedById && (
                  <div className="flex items-center gap-2 mt-2">
                    <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Note (optional)" className="flex-1 rounded-md border px-2 py-1 text-xs" style={{ borderColor: "var(--line)" }} />
                    <button type="button" onClick={() => reviewAccountability(r.accountability!.id, "approve")} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--accent)", color: "white" }}>Approve</button>
                    <button type="button" onClick={() => reviewAccountability(r.accountability!.id, "reject")} className="rounded-md px-3 py-1 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>Reject</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
