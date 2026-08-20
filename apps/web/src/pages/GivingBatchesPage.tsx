import { useEffect, useState, type FormEvent } from "react";
import { GIVING_METHOD_LABELS, type GivingBatchDto, type GivingRecordDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { useOrg } from "../context/OrgContext";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function GivingBatchesPage() {
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const [batches, setBatches] = useState<GivingBatchDto[]>([]);
  const [name, setName] = useState("");
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [declaredTotal, setDeclaredTotal] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [records, setRecords] = useState<GivingRecordDto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDeclared, setEditDeclared] = useState("");

  async function load() {
    setBatches(await api.get<GivingBatchDto[]>("/giving/batches"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/giving/batches", {
        name,
        batchDate: new Date(batchDate).toISOString(),
        declaredTotal: declaredTotal ? Number(declaredTotal) : undefined,
      });
      setName("");
      setDeclaredTotal("");
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpand(b: GivingBatchDto) {
    if (expandedId === b.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(b.id);
    setRecords(await api.get<GivingRecordDto[]>(`/giving/records?batchId=${b.id}`));
  }

  async function saveDeclared(id: string) {
    await api.patch(`/giving/batches/${id}`, { declaredTotal: editDeclared ? Number(editDeclared) : undefined });
    setEditingId(null);
    await load();
  }

  async function close(id: string) {
    await api.patch(`/giving/batches/${id}/close`);
    await load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Giving batches</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Group the giving recorded from one collection -- a Sunday service, an event -- and reconcile
        it against what the counters declared. Attach a giving record to a batch from the Giving page.
      </p>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setConfirming(true);
          }}
          className="rounded-xl border p-4 grid gap-3 self-start"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <h2 className="text-sm font-semibold">New batch</h2>
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunday Service — 16 Aug"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Declared total ({currency}, optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={declaredTotal}
              onChange={(e) => setDeclaredTotal(e.target.value)}
              placeholder="What the counters said it added up to"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
            Open batch
          </button>
        </form>

        <div className="rounded-xl border overflow-hidden self-start" style={{ borderColor: "var(--line)" }}>
          {batches.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              No batches yet.
            </div>
          )}
          {batches.map((b) => (
            <div key={b.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => toggleExpand(b)} className="text-sm font-medium text-left underline">
                    {b.name}
                  </button>
                  <span
                    className="text-xs rounded-full px-2 py-0.5"
                    style={{
                      background: b.status === "OPEN" ? "var(--accent-soft)" : "var(--surface-2)",
                      color: b.status === "OPEN" ? "var(--accent-ink)" : "var(--ink-muted)",
                    }}
                  >
                    {b.status === "OPEN" ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  {new Date(b.batchDate).toLocaleDateString(undefined, { dateStyle: "medium" })} · {b.recordCount} record
                  {b.recordCount === 1 ? "" : "s"}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span>Actual: <strong>{formatMoney(b.actualTotal, b.currency)}</strong></span>
                  {editingId === b.id ? (
                    <span className="flex items-center gap-1">
                      Declared:
                      <input
                        autoFocus
                        type="number"
                        value={editDeclared}
                        onChange={(e) => setEditDeclared(e.target.value)}
                        className="w-28 rounded-md border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--line)" }}
                      />
                      <button type="button" onClick={() => saveDeclared(b.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                        Save
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setEditDeclared(b.declaredTotal ?? "");
                      }}
                      className="underline"
                      style={{ color: "var(--ink-muted)" }}
                      disabled={b.status === "CLOSED"}
                    >
                      Declared: {b.declaredTotal ? formatMoney(Number(b.declaredTotal), b.currency) : "not set"}
                    </button>
                  )}
                  {b.variance != null && (
                    <span style={{ color: b.variance === 0 ? "var(--ink-muted)" : "var(--danger)" }}>
                      Variance: {b.variance > 0 ? "+" : ""}
                      {formatMoney(b.variance, b.currency)}
                    </span>
                  )}
                  {b.status === "OPEN" && (
                    <button
                      type="button"
                      onClick={() => close(b.id)}
                      className="ml-auto rounded-md px-2 py-1 text-xs font-medium"
                      style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                    >
                      Close batch
                    </button>
                  )}
                </div>
              </div>
              {expandedId === b.id && (
                <div className="px-4 pb-3">
                  {records.length === 0 ? (
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      Nothing recorded against this batch yet.
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line-soft)" }}>
                      {records.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between px-3 py-2 text-xs border-t first:border-t-0"
                          style={{ borderColor: "var(--line-soft)" }}
                        >
                          <span>
                            {r.category?.name ?? "—"} · {r.member?.fullName ?? r.giverName ?? "Anonymous"} ·{" "}
                            {GIVING_METHOD_LABELS[r.method]}
                          </span>
                          <span className="font-medium">{formatMoney(Number(r.amount), r.currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {confirming && (
        <ConfirmCreatePreview
          title="Open this batch?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Name", value: name },
            { label: "Date", value: batchDate },
            { label: "Declared total", value: declaredTotal ? formatMoney(Number(declaredTotal), currency) : "" },
          ]}
        />
      )}
    </div>
  );
}
