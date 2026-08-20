import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  GIVING_METHOD_LABELS,
  GivingMethod,
  Role,
  type FellowshipDto,
  type FellowshipReportDto,
  type FundDto,
  type GivingCategoryDto,
  type MemberDto,
} from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { api, ApiError } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";

function formatMoney(amount: number | string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function blockEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
    e.preventDefault();
  }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "var(--warn)",
  APPROVED: "var(--accent-ink)",
  REJECTED: "var(--danger)",
};

export function FellowshipReportsPage() {
  const { user } = useAuth();
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const canReview = user?.role === Role.ORG_ADMIN || user?.role === Role.FINANCE_OFFICER;

  const [fellowships, setFellowships] = useState<FellowshipDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [categories, setCategories] = useState<GivingCategoryDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [reports, setReports] = useState<FellowshipReportDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [fellowshipId, setFellowshipId] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceCount, setAttendanceCount] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [givingAmount, setGivingAmount] = useState("");
  const [expensesAmount, setExpensesAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewCategoryId, setReviewCategoryId] = useState("");
  const [reviewFundId, setReviewFundId] = useState("");
  const [reviewMethod, setReviewMethod] = useState<GivingMethod>(GivingMethod.CASH);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [searchRef, setSearchRef] = useState("");
  const [searchFellowshipId, setSearchFellowshipId] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchFrom, setSearchFrom] = useState("");
  const [searchTo, setSearchTo] = useState("");
  const [searchResults, setSearchResults] = useState<FellowshipReportDto[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function load() {
    const [f, m, c, fu, r] = await Promise.all([
      api.get<FellowshipDto[]>("/fellowships"),
      api.get<MemberDto[]>("/members"),
      api.get<GivingCategoryDto[]>("/giving/categories"),
      api.get<FundDto[]>("/giving/funds"),
      api.get<FellowshipReportDto[]>("/fellowship-reports"),
    ]);
    setFellowships(f);
    setMembers(m);
    setCategories(c);
    setFunds(fu);
    setReports(r);
    if (!fellowshipId && f.length > 0) setFellowshipId(f[0].id);
  }

  async function runSearch() {
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchRef) params.set("refNumber", searchRef);
      if (searchFellowshipId) params.set("fellowshipId", searchFellowshipId);
      if (searchStatus) params.set("financeStatus", searchStatus);
      if (searchFrom) params.set("from", new Date(searchFrom).toISOString());
      if (searchTo) params.set("to", new Date(searchTo).toISOString());
      setSearchResults(await api.get<FellowshipReportDto[]>(`/fellowship-reports?${params.toString()}`));
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchRef("");
    setSearchFellowshipId("");
    setSearchStatus("");
    setSearchFrom("");
    setSearchTo("");
    setSearchResults(null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fellowshipMembers = useMemo(
    () => members.filter((m) => m.fellowshipId === fellowshipId),
    [members, fellowshipId],
  );

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function resetForm() {
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setAttendanceCount("");
    setAttendeeIds([]);
    setNotes("");
    setGivingAmount("");
    setExpensesAmount("");
    setExpenseNotes("");
    setCategoryId("");
  }

  async function onConfirmCreate() {
    setSaving(true);
    setError(null);
    try {
      await api.post("/fellowship-reports", {
        fellowshipId,
        meetingDate: new Date(meetingDate).toISOString(),
        attendanceCount: Number(attendanceCount),
        attendeeMemberIds: attendeeIds.length ? attendeeIds : undefined,
        notes: notes || undefined,
        givingAmount: givingAmount ? Number(givingAmount) : undefined,
        expensesAmount: expensesAmount ? Number(expensesAmount) : undefined,
        expenseNotes: expenseNotes || undefined,
        categoryId: categoryId || undefined,
      });
      resetForm();
      setConfirming(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit this report.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  function startReview(r: FellowshipReportDto) {
    setReviewingId(r.id);
    setReviewCategoryId(r.categoryId ?? "");
    setReviewFundId("");
    setReviewMethod(GivingMethod.CASH);
    setReviewNote("");
  }

  async function approve(r: FellowshipReportDto) {
    setReviewing(true);
    setError(null);
    try {
      await api.post(`/fellowship-reports/${r.id}/approve`, {
        categoryId: reviewCategoryId || undefined,
        fundId: reviewFundId || undefined,
        method: reviewMethod,
        note: reviewNote || undefined,
      });
      setReviewingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't approve this report.");
    } finally {
      setReviewing(false);
    }
  }

  async function reject(r: FellowshipReportDto) {
    setReviewing(true);
    setError(null);
    try {
      await api.post(`/fellowship-reports/${r.id}/reject`, { note: reviewNote || undefined });
      setReviewingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reject this report.");
    } finally {
      setReviewing(false);
    }
  }

  const pending = reports.filter((r) => r.financeStatus === "PENDING");
  const reviewed = reports.filter((r) => r.financeStatus !== "PENDING");

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Fellowship reports</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        {canReview
          ? "Every leader's meeting write-up -- attendance, giving, expenses. Giving only posts to the ledger once you confirm a category below; expenses are recorded here for visibility, not as an accounting entry."
          : "Report on your fellowship's last meeting -- who came, what was collected, what was spent. Giving you report here doesn't hit the ledger until finance reviews and confirms it."}
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
        onKeyDown={blockEnterSubmit}
        className="rounded-xl border p-4 mb-6 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Fellowship</label>
          <select
            required
            value={fellowshipId}
            onChange={(e) => {
              setFellowshipId(e.target.value);
              setAttendeeIds([]);
            }}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {fellowships.length === 0 && <option value="">No fellowships yet</option>}
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Meeting date</label>
          <input
            required
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Attendance (total headcount, including visitors)</label>
          <input
            required
            type="number"
            min="0"
            value={attendanceCount}
            onChange={(e) => setAttendanceCount(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        {fellowshipMembers.length > 0 && (
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Which members were there? (optional)</label>
            <div className="rounded-md border p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-40 overflow-y-auto" style={{ borderColor: "var(--line)" }}>
              {fellowshipMembers.map((m) => (
                <label key={m.id} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={attendeeIds.includes(m.id)} onChange={() => toggleAttendee(m.id)} />
                  {m.fullName}
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Giving collected ({currency}, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={givingAmount}
            onChange={(e) => setGivingAmount(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Suggested category (optional)</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">Let finance decide</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Expenses ({currency}, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={expensesAmount}
            onChange={(e) => setExpensesAmount(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">What were expenses for?</label>
          <input
            value={expenseNotes}
            onChange={(e) => setExpenseNotes(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!fellowshipId}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Submit report
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Submit this report?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Fellowship", value: fellowships.find((f) => f.id === fellowshipId)?.name ?? "" },
            { label: "Meeting date", value: meetingDate },
            { label: "Attendance", value: attendanceCount },
            { label: "Attendees checked", value: attendeeIds.length ? String(attendeeIds.length) : "" },
            { label: "Giving collected", value: givingAmount ? formatMoney(givingAmount, currency) : "" },
            { label: "Expenses", value: expensesAmount ? formatMoney(expensesAmount, currency) : "" },
            { label: "Notes", value: notes },
          ]}
        />
      )}

      {canReview && (
        <div className="rounded-xl border p-4 mb-8" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold mb-3">Find a report</h2>
          <p className="text-xs mb-3" style={{ color: "var(--ink-muted)" }}>
            Search across every fellowship by the reference number on a paper receipt, or by date range,
            fellowship, and review status.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 mb-3">
            <input
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="Ref number, e.g. 20082026-1"
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
            <select
              value={searchFellowshipId}
              onChange={(e) => setSearchFellowshipId(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Any fellowship</option>
              {fellowships.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Any status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input type="date" value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
            <input type="date" value={searchTo} onChange={(e) => setSearchTo(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={searching}
              onClick={runSearch}
              className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {searching ? "Searching…" : "Search"}
            </button>
            {searchResults !== null && (
              <button type="button" onClick={clearSearch} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                Clear
              </button>
            )}
          </div>

          {searchResults !== null && (
            <div className="rounded-md border overflow-hidden mt-3" style={{ borderColor: "var(--line-soft)" }}>
              {searchResults.length === 0 && (
                <div className="p-3 text-xs" style={{ color: "var(--ink-muted)" }}>No reports match.</div>
              )}
              {searchResults.map((r) => (
                <div key={r.id} className="px-3 py-2 text-xs border-t first:border-t-0 flex items-center justify-between" style={{ borderColor: "var(--line-soft)" }}>
                  <span>
                    <strong>{r.refNumber}</strong> · {r.fellowship?.name} · {new Date(r.meetingDate).toLocaleDateString(undefined, { dateStyle: "medium" })} · by {r.submittedBy?.fullName}
                  </span>
                  <span className="font-medium shrink-0" style={{ color: STATUS_COLORS[r.financeStatus] }}>
                    {r.financeStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Pending finance review ({pending.length})
      </h2>
      <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
        {pending.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>Nothing waiting.</div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {r.fellowship?.name} <span style={{ color: "var(--ink-muted)" }}>· {new Date(r.meetingDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Submitted by {r.submittedBy?.fullName} · attendance {r.attendanceCount}
                  {r.givingAmount && ` · giving ${formatMoney(r.givingAmount, r.currency ?? currency)}`}
                  {r.expensesAmount && ` · expenses ${formatMoney(r.expensesAmount, r.currency ?? currency)}`}
                </div>
                {r.notes && <div className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{r.notes}</div>}
              </div>
              {canReview ? (
                user?.id === r.submittedById ? (
                  <span className="text-xs shrink-0" style={{ color: "var(--ink-muted)" }}>
                    You filed this -- another reviewer needs to check it.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => startReview(r)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium shrink-0"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Review
                  </button>
                )
              ) : (
                <span className="text-xs shrink-0" style={{ color: STATUS_COLORS.PENDING }}>
                  Awaiting review
                </span>
              )}
            </div>

            {reviewingId === r.id && (
              <div className="mt-3 rounded-md border p-3 grid gap-2 sm:grid-cols-2" style={{ borderColor: "var(--line)" }}>
                {r.givingAmount != null && (
                  <>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Category (required to approve giving)</label>
                      <select value={reviewCategoryId} onChange={(e) => setReviewCategoryId(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                        <option value="">Choose one</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Fund (optional)</label>
                      <select value={reviewFundId} onChange={(e) => setReviewFundId(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                        <option value="">General</option>
                        {funds.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Method</label>
                      <select value={reviewMethod} onChange={(e) => setReviewMethod(e.target.value as GivingMethod)} className="w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }}>
                        {Object.entries(GIVING_METHOD_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: "var(--ink-muted)" }}>Note (optional)</label>
                  <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className="w-full rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="button"
                    disabled={reviewing || (r.givingAmount != null && !reviewCategoryId)}
                    onClick={() => approve(r)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => reject(r)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    Reject
                  </button>
                  <button type="button" onClick={() => setReviewingId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
        Reviewed
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {reviewed.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>Nothing reviewed yet.</div>
        )}
        {reviewed.map((r) => (
          <div key={r.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {r.fellowship?.name} <span style={{ color: "var(--ink-muted)" }}>· {new Date(r.meetingDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  By {r.submittedBy?.fullName} · attendance {r.attendanceCount}
                  {r.givingAmount && ` · giving ${formatMoney(r.givingAmount, r.currency ?? currency)}`}
                  {r.category && ` · ${r.category.name}`}
                  {r.financeNote && ` -- "${r.financeNote}"`}
                </div>
              </div>
              <span className="text-xs font-medium shrink-0" style={{ color: STATUS_COLORS[r.financeStatus] }}>
                {r.financeStatus === "APPROVED" ? "Approved" : "Rejected"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
