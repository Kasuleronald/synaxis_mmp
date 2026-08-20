import { useEffect, useState } from "react";
import { GIVING_METHOD_LABELS, type GivingRecordDto } from "@life-mmp/shared";
import { api } from "../lib/api";

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function AccountingPage() {
  const [records, setRecords] = useState<GivingRecordDto[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    const qs = params.toString();
    setRecords(await api.get<GivingRecordDto[]>(`/giving/records${qs ? `?${qs}` : ""}`));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = records.reduce((sum, r) => sum + Number(r.amount), 0);
  const currency = records[0]?.currency ?? "UGX";

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Accounting</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        A chronological register of everything recorded in Giving -- category, fund, and batch all in
        one place for reconciliation. This is a register, not full double-entry bookkeeping; export it
        into your accounting software for that.
      </p>

      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
        </div>
        <button type="button" onClick={load} className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
          Filter
        </button>
        <span className="ml-auto text-sm font-semibold">Total: {formatMoney(total, currency)}</span>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Fund</th>
              <th className="px-4 py-2 font-medium">Giver</th>
              <th className="px-4 py-2 font-medium">Method</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center" style={{ color: "var(--ink-muted)" }}>
                  Nothing recorded in this range.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(r.givenAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </td>
                <td className="px-4 py-2">{r.category?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.fund?.name ?? "—"}</td>
                <td className="px-4 py-2">{r.member?.fullName ?? r.giverName ?? "Anonymous"}</td>
                <td className="px-4 py-2">{GIVING_METHOD_LABELS[r.method]}</td>
                <td className="px-4 py-2 text-right font-medium">{formatMoney(Number(r.amount), r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
