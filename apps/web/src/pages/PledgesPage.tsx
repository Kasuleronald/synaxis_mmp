import { useEffect, useState, type FormEvent } from "react";
import {
  PLEDGE_FREQUENCY_LABELS,
  PLEDGE_STATUS_LABELS,
  PledgeFrequency,
  type FundDto,
  type MemberDto,
  type PartnerDto,
  type PledgeDto,
} from "@life-mmp/shared";
import { api } from "../lib/api";
import { useOrg } from "../context/OrgContext";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { MemberSearchSelect } from "../components/MemberSearchSelect";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--accent-ink)",
  FULFILLED: "var(--accent-ink)",
  ARCHIVED: "var(--ink-muted)",
};

export function PledgesPage() {
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const [pledges, setPledges] = useState<PledgeDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);

  const [pledgerType, setPledgerType] = useState<"member" | "partner">("member");
  const [memberId, setMemberId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [fundId, setFundId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<PledgeFrequency>(PledgeFrequency.MONTHLY);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [p, m, pr, f] = await Promise.all([
      api.get<PledgeDto[]>("/giving/pledges"),
      api.get<MemberDto[]>("/members"),
      api.get<PartnerDto[]>("/partners"),
      api.get<FundDto[]>("/giving/funds"),
    ]);
    setPledges(p);
    setMembers(m);
    setPartners(pr);
    setFunds(f);
    if (!memberId && m.length > 0) setMemberId(m[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/giving/pledges", {
        memberId: pledgerType === "member" ? memberId : undefined,
        partnerId: pledgerType === "partner" ? partnerId : undefined,
        fundId: fundId || undefined,
        amount: Number(amount),
        frequency,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        notes: notes || undefined,
      });
      setAmount("");
      setNotes("");
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function reactivate(p: PledgeDto) {
    const newEndDate = window.prompt("New end date for this pledge (YYYY-MM-DD)?", "");
    if (newEndDate === null) return;
    await api.patch(`/giving/pledges/${p.id}/reactivate`, newEndDate ? { endDate: new Date(newEndDate).toISOString() } : {});
    await load();
  }

  const pledgerReady = pledgerType === "member" ? !!memberId : !!partnerId;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Pledges</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        A commitment (from a member or an external partner) to give a total amount over time.
        Fulfilled amount is calculated from actual giving history, not entered by hand. A pledge is
        automatically marked fulfilled once met, or archived once well past its end date unmet --
        archived pledges can be reactivated.
      </p>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setConfirming(true);
          }}
          className="rounded-xl border p-4 grid gap-3 self-start"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <h2 className="text-sm font-semibold">New pledge</h2>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={pledgerType === "member"} onChange={() => setPledgerType("member")} />
              Member
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={pledgerType === "partner"} onChange={() => setPledgerType("partner")} />
              Partner
            </label>
          </div>
          {pledgerType === "member" ? (
            <div>
              <label className="block text-sm mb-1">Member</label>
              <MemberSearchSelect members={members} value={memberId} onChange={setMemberId} emptyLabel="No members yet" />
            </div>
          ) : (
            <div>
              <label className="block text-sm mb-1">Partner</label>
              <select
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                <option value="">Choose one</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {partners.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                  No partners yet -- add one from the Partners page first.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Fund (optional)</label>
            <select
              value={fundId}
              onChange={(e) => setFundId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">General</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
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
              <label className="block text-sm mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PledgeFrequency)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              >
                {Object.entries(PLEDGE_FREQUENCY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">End date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <button
            type="submit"
            disabled={!pledgerReady}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Pledge
          </button>
        </form>

        <div className="rounded-xl border overflow-hidden self-start" style={{ borderColor: "var(--line)" }}>
          {pledges.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              No pledges yet.
            </div>
          )}
          {pledges.map((p) => {
            const pct = Math.min(100, Math.round((p.fulfilledAmount / Number(p.amount)) * 100));
            return (
              <div key={p.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">
                    {p.member?.fullName ?? p.partner?.name ?? "—"}{" "}
                    <span style={{ color: "var(--ink-muted)" }}>
                      · {p.fund?.name ?? "General"} · {PLEDGE_FREQUENCY_LABELS[p.frequency]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium" style={{ color: STATUS_COLORS[p.status] }}>
                      {PLEDGE_STATUS_LABELS[p.status]}
                    </span>
                    <span className="text-sm font-semibold">
                      {formatMoney(p.fulfilledAmount, p.currency)} / {formatMoney(Number(p.amount), p.currency)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full" style={{ width: `${pct}%`, background: p.status === "ARCHIVED" ? "var(--ink-muted)" : "var(--accent)" }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Started {new Date(p.startDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    {p.endDate && ` · ends ${new Date(p.endDate).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
                    {p.notes && ` · ${p.notes}`}
                  </div>
                  {p.status === "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => reactivate(p)}
                      className="text-xs font-medium underline shrink-0"
                      style={{ color: "var(--accent-ink)" }}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirming && (
        <ConfirmCreatePreview
          title="Record this pledge?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            {
              label: pledgerType === "member" ? "Member" : "Partner",
              value:
                pledgerType === "member"
                  ? members.find((m) => m.id === memberId)?.fullName ?? ""
                  : partners.find((p) => p.id === partnerId)?.name ?? "",
            },
            { label: "Fund", value: funds.find((f) => f.id === fundId)?.name ?? "General" },
            { label: "Amount", value: amount ? formatMoney(Number(amount), currency) : "" },
            { label: "Frequency", value: PLEDGE_FREQUENCY_LABELS[frequency] },
            { label: "Start date", value: startDate },
            { label: "End date", value: endDate },
            { label: "Notes", value: notes },
          ]}
        />
      )}
    </div>
  );
}
