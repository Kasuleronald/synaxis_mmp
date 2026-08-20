import { useEffect, useState, type FormEvent } from "react";
import {
  GIVING_METHOD_LABELS,
  GivingMethod,
  type CreateGivingRecordInput,
  type GivingCategoryDto,
  type GivingRecordDto,
  type PartnerDto,
} from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { api } from "../lib/api";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function GivingPage() {
  const { org } = useOrg();
  const [categories, setCategories] = useState<GivingCategoryDto[]>([]);
  const [records, setRecords] = useState<GivingRecordDto[]>([]);
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<GivingMethod>(GivingMethod.CASH);
  const [partnerId, setPartnerId] = useState("");
  const [giverName, setGiverName] = useState("");
  const [givenAt, setGivenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [cats, recs, prs] = await Promise.all([
      api.get<GivingCategoryDto[]>("/giving/categories"),
      api.get<GivingRecordDto[]>("/giving/records"),
      api.get<PartnerDto[]>("/partners"),
    ]);
    setCategories(cats);
    setRecords(recs);
    setPartners(prs);
    if (!categoryId && cats.length > 0) setCategoryId(cats[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAddCategory(e: FormEvent) {
    e.preventDefault();
    await api.post("/giving/categories", { name: newCategory });
    setNewCategory("");
    setShowCategoryForm(false);
    load();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const input: CreateGivingRecordInput = {
      categoryId,
      amount: Number(amount),
      method,
      partnerId: partnerId || undefined,
      giverName: giverName || undefined,
      givenAt: givenAt ? new Date(givenAt).toISOString() : undefined,
      notes: notes || undefined,
    };
    try {
      await api.post("/giving/records", input);
      setAmount("");
      setPartnerId("");
      setGiverName("");
      setNotes("");
      setMessage("Recorded.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const total = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const currency = org?.currency ?? "UGX";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Giving</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Cash, bank transfer, or mobile money -- recorded manually against categories your church
        defines. A provider integration plugs into the same ledger later, no data model change.
      </p>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold mb-3">Record giving</h2>
          <form onSubmit={onSubmit} className="grid gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm">Category</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryForm((s) => !s)}
                  className="text-xs underline"
                  style={{ color: "var(--accent-ink)" }}
                >
                  {showCategoryForm ? "Cancel" : "+ New category"}
                </button>
              </div>
              {showCategoryForm ? (
                <div className="flex gap-2">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Tithe"
                    className="flex-1 rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <button
                    type="button"
                    disabled={!newCategory.trim()}
                    onClick={onAddCategory}
                    className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  {categories.length === 0 && <option value="">No categories yet</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Amount ({currency})</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as GivingMethod)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  {Object.entries(GIVING_METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Partner (optional)</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">None</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Giver name (optional)</label>
              <input
                value={giverName}
                onChange={(e) => setGiverName(e.target.value)}
                placeholder="Name, or leave blank for anonymous"
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="date"
                value={givenAt}
                onChange={(e) => setGivenAt(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !categoryId}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {saving ? "Saving…" : "Record"}
            </button>
            {message && (
              <p className="text-sm" style={{ color: "var(--accent-ink)" }}>
                {message}
              </p>
            )}
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>
              Recent giving
            </h2>
            <span className="text-sm font-semibold">{formatMoney(total, currency)}</span>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {records.length === 0 && (
              <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                Nothing recorded yet.
              </div>
            )}
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <div>
                  <div className="text-sm font-medium">
                    {r.category?.name ?? "—"}{" "}
                    <span style={{ color: "var(--ink-muted)" }}>
                      · {r.member?.fullName ?? r.partner?.name ?? r.giverName ?? "Anonymous"}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {new Date(r.givenAt).toLocaleDateString(undefined, { dateStyle: "medium" })} ·{" "}
                    {GIVING_METHOD_LABELS[r.method]}
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatMoney(Number(r.amount), r.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
