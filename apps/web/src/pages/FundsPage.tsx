import { useEffect, useState, type FormEvent } from "react";
import type { FundDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { useOrg } from "../context/OrgContext";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function FundProgress({ fund, currency }: { fund: FundDto; currency: string }) {
  if (!fund.targetAmount) return null;
  const target = Number(fund.targetAmount);
  const pct = Math.min(100, Math.round((fund.raisedAmount / target) * 100));
  const overdue = fund.deadlineDate && new Date(fund.deadlineDate) < new Date() && pct < 100;
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span style={{ color: "var(--ink-muted)" }}>
          {formatMoney(fund.raisedAmount, currency)} of {formatMoney(target, currency)}
        </span>
        <span style={{ color: overdue ? "var(--danger)" : "var(--ink-muted)" }}>
          {pct}%{fund.deadlineDate ? ` · by ${new Date(fund.deadlineDate).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: overdue ? "var(--danger)" : "var(--accent)" }} />
      </div>
    </div>
  );
}

export function FundsPage() {
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  async function load() {
    setFunds(await api.get<FundDto[]>("/giving/funds"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/giving/funds", {
        name,
        description: description || undefined,
        targetAmount: targetAmount ? Number(targetAmount) : undefined,
        deadlineDate: deadlineDate ? new Date(deadlineDate).toISOString() : undefined,
      });
      setName("");
      setDescription("");
      setTargetAmount("");
      setDeadlineDate("");
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(f: FundDto) {
    setEditingId(f.id);
    setEditName(f.name);
    setEditDescription(f.description ?? "");
    setEditTarget(f.targetAmount ?? "");
    setEditDeadline(f.deadlineDate ? f.deadlineDate.slice(0, 10) : "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/giving/funds/${id}`, {
      name: editName,
      description: editDescription || undefined,
      targetAmount: editTarget ? Number(editTarget) : undefined,
      deadlineDate: editDeadline ? new Date(editDeadline).toISOString() : undefined,
    });
    setEditingId(null);
    await load();
  }

  async function deactivate(id: string) {
    await api.patch(`/giving/funds/${id}/deactivate`);
    await load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Funds</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        A designated pool of money -- Building Fund, Missions Fund -- separate from what kind of
        income a gift is. Set a target and an optional deadline to track a fundraising campaign's
        progress.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Building Fund"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Description (optional)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Target amount ({currency}, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Deadline (optional)</label>
          <input
            type="date"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
            Create fund
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Create this fund?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Name", value: name },
            { label: "Description", value: description },
            { label: "Target amount", value: targetAmount ? formatMoney(Number(targetAmount), currency) : "" },
            { label: "Deadline", value: deadlineDate },
          ]}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {funds.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No funds yet.
          </div>
        )}
        {funds.map((f) => (
          <div key={f.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            {editingId === f.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border px-2 py-1 text-sm sm:col-span-2"
                  style={{ borderColor: "var(--line)" }}
                />
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  className="rounded-md border px-2 py-1 text-sm sm:col-span-2"
                  style={{ borderColor: "var(--line)" }}
                />
                <input
                  type="number"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  placeholder="Target amount"
                  className="rounded-md border px-2 py-1 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="rounded-md border px-2 py-1 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => saveEdit(f.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{f.name}</div>
                  {f.description && (
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {f.description}
                    </div>
                  )}
                  <FundProgress fund={f} currency={currency} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton title="Edit" onClick={() => startEdit(f)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton title="Deactivate" onClick={() => deactivate(f.id)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
