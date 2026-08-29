import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CONDITION_LABELS,
  FIXED_ASSET_CATEGORY_LABELS,
  type AttendanceRecordDto,
  type AttendanceSessionDto,
  type AttendanceTrendPoint,
  type DemographicsReportDto,
  type FellowshipLeaderboardEntryDto,
  type FixedAssetDto,
  type FundDto,
  type FundStatementDto,
  type GivingCategoryTotal,
  type GivingFundTotal,
  type GivingTrendPoint,
  type MemberAttendanceDto,
  type MemberDto,
  type MemberStatementDto,
  type MembersOverTimePoint,
  type PledgeDto,
  type ServiceUnitAttendanceReportDto,
  type ServiceUnitAttendanceReportRow,
} from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { api } from "../lib/api";
import { exportAttendanceToExcel, exportAttendanceToPdf, exportRowsToExcel } from "../lib/export";
import { MemberSearchSelect } from "../components/MemberSearchSelect";

function formatMoney(amount: number | string, currency: string) {
  return `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Bar({ label, value, max, formatValue }: { label: string; value: number; max: number; formatValue: (v: number) => string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span style={{ color: "var(--ink-muted)" }}>{formatValue(value)}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function Card({
  title,
  children,
  exportRows,
}: {
  title: string;
  children: React.ReactNode;
  /** Row data to offer as an Excel download -- omit for cards with nothing
   * tabular to export (e.g. a picker, not a result). Untyped on purpose:
   * every report's row shape is different, and this only ever passes
   * through to a generic key/value sheet writer. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exportRows?: any[];
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {exportRows && (
          <button
            type="button"
            onClick={() => exportRowsToExcel(exportRows, title)}
            className="text-xs underline shrink-0"
            style={{ color: "var(--accent-ink)" }}
          >
            Export
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const TABS = [
  ["overview", "Members & attendance"],
  ["attendance", "Attendance lists"],
  ["serviceUnits", "Service units"],
  ["giving", "Giving"],
  ["statements", "Statements"],
  ["pledges", "Pledges"],
  ["assets", "Fixed assets"],
  ["leaders", "Fellowship leaders"],
] as const;
type TabKey = (typeof TABS)[number][0];

function OverviewTab() {
  const [growth, setGrowth] = useState<MembersOverTimePoint[]>([]);
  const [demographics, setDemographics] = useState<DemographicsReportDto | null>(null);
  const [attendance, setAttendance] = useState<AttendanceTrendPoint[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<MembersOverTimePoint[]>("/reports/members-over-time"),
      api.get<DemographicsReportDto>("/reports/demographics"),
      api.get<AttendanceTrendPoint[]>("/reports/attendance-trend?groupBy=month"),
    ]).then(([g, d, a]) => {
      setGrowth(g);
      setDemographics(d);
      setAttendance(a);
    });
  }, []);

  const growthMax = Math.max(1, ...growth.map((g) => g.newMembers));
  const attendanceMax = Math.max(1, ...attendance.map((a) => a.count));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Member growth (new members per month)" exportRows={growth}>
        {growth.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No members recorded yet.</p>}
        {growth.map((g) => (
          <Bar key={g.month} label={g.month} value={g.newMembers} max={growthMax} formatValue={(v) => `${v} (${g.cumulative} total)`} />
        ))}
      </Card>
      <Card title="Attendance trend (check-ins per month)" exportRows={attendance}>
        {attendance.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No attendance recorded yet.</p>}
        {attendance.map((a) => (
          <Bar key={a.period} label={a.period.slice(0, 7)} value={a.count} max={attendanceMax} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Membership status" exportRows={demographics?.byStatus}>
        {demographics?.byStatus.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Gender" exportRows={demographics?.byGender}>
        {demographics?.byGender.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Marital status" exportRows={demographics?.byMaritalStatus}>
        {demographics?.byMaritalStatus.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Age group" exportRows={demographics?.byAgeGroup}>
        {demographics?.byAgeGroup.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
    </div>
  );
}

function GivingTab({ currency }: { currency: string }) {
  const [trend, setTrend] = useState<GivingTrendPoint[]>([]);
  const [byCategory, setByCategory] = useState<GivingCategoryTotal[]>([]);
  const [byFund, setByFund] = useState<GivingFundTotal[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<GivingTrendPoint[]>("/reports/giving-trend?groupBy=month"),
      api.get<GivingCategoryTotal[]>("/reports/giving-by-category"),
      api.get<GivingFundTotal[]>("/reports/giving-by-fund"),
    ]).then(([t, c, f]) => {
      setTrend(t);
      setByCategory(c);
      setByFund(f);
    });
  }, []);

  const trendMax = Math.max(1, ...trend.map((t) => t.total));
  const categoryMax = Math.max(1, ...byCategory.map((c) => c.total));
  const fundMax = Math.max(1, ...byFund.map((f) => f.total));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Giving trend (total per month)" exportRows={trend}>
        {trend.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nothing recorded yet.</p>}
        {trend.map((t) => (
          <Bar key={t.period} label={t.period.slice(0, 7)} value={t.total} max={trendMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="By category (all time)" exportRows={byCategory}>
        {byCategory.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nothing recorded yet.</p>}
        {byCategory.map((c) => (
          <Bar key={c.categoryId} label={c.name} value={c.total} max={categoryMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="By fund (all time)" exportRows={byFund}>
        {byFund.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nothing recorded yet.</p>}
        {byFund.map((f) => (
          <Bar key={f.fundId ?? "none"} label={f.name} value={f.total} max={fundMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
    </div>
  );
}

function StatementsTab({ currency }: { currency: string }) {
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [funds, setFunds] = useState<FundDto[]>([]);
  const [memberId, setMemberId] = useState("");
  const [fundId, setFundId] = useState("");
  const [memberStatement, setMemberStatement] = useState<MemberStatementDto | null>(null);
  const [fundStatement, setFundStatement] = useState<FundStatementDto | null>(null);

  useEffect(() => {
    Promise.all([api.get<MemberDto[]>("/members"), api.get<FundDto[]>("/giving/funds")]).then(([m, f]) => {
      setMembers(m);
      setFunds(f);
    });
  }, []);

  useEffect(() => {
    if (!memberId) {
      setMemberStatement(null);
      return;
    }
    api.get<MemberStatementDto>(`/reports/member-statement/${memberId}`).then(setMemberStatement);
  }, [memberId]);

  useEffect(() => {
    if (!fundId) {
      setFundStatement(null);
      return;
    }
    api.get<FundStatementDto>(`/reports/fund-statement/${fundId}`).then(setFundStatement);
  }, [fundId]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="Member giving statement"
        exportRows={memberStatement?.lines.map((l) => ({
          Date: l.givenAt,
          Category: l.category?.name ?? "",
          Amount: l.amount,
          Currency: l.currency,
          "Running total": l.runningTotal,
        }))}
      >
        <div className="mb-3">
          <MemberSearchSelect members={members} value={memberId} onChange={setMemberId} emptyLabel="Choose a member" />
        </div>
        {memberStatement && (
          <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line-soft)" }}>
            {memberStatement.lines.length === 0 ? (
              <div className="p-3 text-xs" style={{ color: "var(--ink-muted)" }}>No giving on record for this member.</div>
            ) : (
              <>
                {memberStatement.lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-2 text-xs border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
                    <span>
                      {new Date(l.givenAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {l.category?.name ?? "—"}
                    </span>
                    <span>
                      {formatMoney(l.amount, l.currency)} <span style={{ color: "var(--ink-muted)" }}>(bal {formatMoney(l.runningTotal, l.currency)})</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <span>Total</span>
                  <span>{formatMoney(memberStatement.total, currency)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
      <Card
        title="Fund statement"
        exportRows={fundStatement?.lines.map((l) => ({
          Date: l.givenAt,
          Giver: l.member?.fullName ?? l.giverName ?? "Anonymous",
          Amount: l.amount,
          Currency: l.currency,
          "Running total": l.runningTotal,
        }))}
      >
        <select value={fundId} onChange={(e) => setFundId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mb-3" style={{ borderColor: "var(--line)" }}>
          <option value="">Choose a fund</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {fundStatement && (
          <div className="rounded-md border overflow-hidden" style={{ borderColor: "var(--line-soft)" }}>
            {fundStatement.lines.length === 0 ? (
              <div className="p-3 text-xs" style={{ color: "var(--ink-muted)" }}>No giving recorded against this fund.</div>
            ) : (
              <>
                {fundStatement.lines.map((l) => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-2 text-xs border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
                    <span>
                      {new Date(l.givenAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {l.member?.fullName ?? l.giverName ?? "Anonymous"}
                    </span>
                    <span>
                      {formatMoney(l.amount, l.currency)} <span style={{ color: "var(--ink-muted)" }}>(bal {formatMoney(l.runningTotal, l.currency)})</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <span>Total</span>
                  <span>{formatMoney(fundStatement.total, currency)}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function AttendanceListsTab() {
  const { org } = useOrg();
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [memberId, setMemberId] = useState("");
  const [memberAttendance, setMemberAttendance] = useState<MemberAttendanceDto | null>(null);

  useEffect(() => {
    api.get<AttendanceSessionDto[]>("/attendance/sessions").then(setSessions);
    api.get<MemberDto[]>("/members").then(setMembers);
  }, []);

  useEffect(() => {
    if (!memberId) {
      setMemberAttendance(null);
      return;
    }
    api.get<MemberAttendanceDto>(`/reports/member-attendance/${memberId}`).then(setMemberAttendance);
  }, [memberId]);

  async function download(format: "excel" | "pdf") {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    setDownloading(true);
    try {
      const records = await api.get<AttendanceRecordDto[]>(`/attendance/sessions/${sessionId}/records`);
      if (format === "excel") exportAttendanceToExcel(records, org?.displayName ?? "Synaxis MMP", session.name);
      else exportAttendanceToPdf(records, org?.displayName ?? "Synaxis MMP", session.name, org?.logoUrl);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Download an event's attendance list">
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm mb-3"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">Choose an event/session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {new Date(s.date).toLocaleDateString()}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!sessionId || downloading}
            onClick={() => download("excel")}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Excel (.xlsx)
          </button>
          <button
            type="button"
            disabled={!sessionId || downloading}
            onClick={() => download("pdf")}
            className="rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            PDF
          </button>
        </div>
      </Card>
      <Card
        title="Individual attendance"
        exportRows={memberAttendance?.lines.map((l) => ({ Session: l.sessionName, "Checked in at": l.checkedInAt }))}
      >
        <div className="mb-3">
          <MemberSearchSelect members={members} value={memberId} onChange={setMemberId} emptyLabel="Choose a member" />
        </div>
        {memberAttendance && (
          <>
            <p className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
              {memberAttendance.totalCheckIns} check-in{memberAttendance.totalCheckIns === 1 ? "" : "s"}
              {memberAttendance.firstCheckIn &&
                ` · first ${new Date(memberAttendance.firstCheckIn).toLocaleDateString()} · last ${new Date(memberAttendance.lastCheckIn as string).toLocaleDateString()}`}
            </p>
            <div className="rounded-md border overflow-hidden max-h-72 overflow-y-auto" style={{ borderColor: "var(--line-soft)" }}>
              {memberAttendance.lines.length === 0 ? (
                <div className="p-3 text-xs" style={{ color: "var(--ink-muted)" }}>No check-ins on record for this member.</div>
              ) : (
                memberAttendance.lines.map((l, i) => (
                  <div
                    key={`${l.sessionId}-${i}`}
                    className="flex items-center justify-between px-3 py-2 text-xs border-t first:border-t-0"
                    style={{ borderColor: "var(--line-soft)" }}
                  >
                    <span>{l.sessionName}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{new Date(l.checkedInAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

const BAR_AREA_HEIGHT = 200;
const BAR_WIDTH = 22;

/** ~5 gridlines at a clean step (1/2/5/10/20/25/50/100...), same rule the
 * marks spec asks for on any axis ("round to clean numbers"). */
function niceAxisTicks(maxValue: number): number[] {
  const roughStep = Math.max(maxValue, 1) / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const rawStep = [1, 2, 5, 10].map((m) => m * magnitude).find((c) => roughStep <= c) ?? 10 * magnitude;
  // Attendance counts are whole people -- a "1.5" gridline never makes sense.
  const step = Math.max(1, Math.round(rawStep));
  const ceiling = Math.max(Math.ceil(maxValue / step) * step, step);
  const ticks: number[] = [];
  for (let t = 0; t <= ceiling; t += step) ticks.push(t);
  return ticks;
}

/** A single column -- label sits inside near the top when the bar is tall
 * enough to hold it with padding, otherwise above the bar (never clipped),
 * matching the "measure first" rule for in-mark labels. */
function GroupedColumn({ value, axisMax, color, title }: { value: number; axisMax: number; color: string; title: string }) {
  const pxHeight = axisMax > 0 ? (value / axisMax) * BAR_AREA_HEIGHT : 0;
  const labelFits = pxHeight >= 26;
  return (
    <div className="flex flex-col items-center justify-end" style={{ height: BAR_AREA_HEIGHT, width: BAR_WIDTH }}>
      {!labelFits && (
        <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--ink)" }}>
          {value}
        </div>
      )}
      <div
        title={title}
        className="w-full flex justify-center transition-opacity hover:opacity-85"
        style={{ height: Math.max(pxHeight, value > 0 ? 2 : 0), background: color, borderRadius: "4px 4px 0 0" }}
      >
        {labelFits && (
          <span className="text-xs font-semibold mt-1" style={{ color: "white" }}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

/** Present/absent as two grouped columns per service unit, for one chosen
 * service -- fixed status colors (never the org's accent theme). Red/green
 * fails the colorblind-separation check by nature of being a status pair
 * (see palette.md), so every value is also a plain-text direct label --
 * never color-alone -- and a table view sits underneath. */
function ServiceUnitAttendanceChart({ rows }: { rows: ServiceUnitAttendanceReportRow[] }) {
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.present, r.absent]));
  const ticks = niceAxisTicks(maxValue);
  const axisMax = ticks[ticks.length - 1];

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: "var(--status-good)" }} />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm" style={{ background: "var(--status-critical)" }} />
          Absent
        </span>
      </div>

      <div className="overflow-x-auto mb-4">
        <div className="flex" style={{ minWidth: rows.length * 84 + 32 }}>
          <div
            className="flex flex-col-reverse justify-between text-xs pr-2 shrink-0"
            style={{ height: BAR_AREA_HEIGHT, color: "var(--ink-muted)" }}
          >
            {ticks.map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 flex flex-col-reverse justify-between pointer-events-none">
              {ticks.map((t) => (
                <div key={t} style={{ borderTop: "1px solid var(--line)" }} />
              ))}
            </div>
            <div className="relative flex items-end gap-6 px-3" style={{ height: BAR_AREA_HEIGHT }}>
              {rows.map((r) => (
                <div key={r.unitId} className="flex items-end gap-1.5 shrink-0">
                  <GroupedColumn value={r.present} axisMax={axisMax} color="var(--status-good)" title={`${r.unitName} -- Present: ${r.present}`} />
                  <GroupedColumn value={r.absent} axisMax={axisMax} color="var(--status-critical)" title={`${r.unitName} -- Absent: ${r.absent}`} />
                </div>
              ))}
            </div>
            <div className="flex gap-6 px-3 mt-1.5">
              {rows.map((r) => (
                <div
                  key={r.unitId}
                  className="text-xs text-center shrink-0"
                  style={{ color: "var(--ink-muted)", width: BAR_WIDTH * 2 + 6 }}
                >
                  {r.unitName}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <details>
        <summary className="text-xs cursor-pointer" style={{ color: "var(--accent-ink)" }}>
          View as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
                <th className="py-1.5 pr-3 font-medium">Service unit</th>
                <th className="py-1.5 pr-3 font-medium text-right">Present</th>
                <th className="py-1.5 pr-3 font-medium text-right">Absent</th>
                <th className="py-1.5 pr-3 font-medium text-right">Total</th>
                <th className="py-1.5 pr-3 font-medium text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unitId} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-1.5 pr-3 font-medium">{r.unitName}</td>
                  <td className="py-1.5 pr-3 text-right">{r.present}</td>
                  <td className="py-1.5 pr-3 text-right">{r.absent}</td>
                  <td className="py-1.5 pr-3 text-right">{r.total}</td>
                  <td className="py-1.5 pr-3 text-right">{r.total > 0 ? `${Math.round((r.present / r.total) * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function ServiceUnitsTab() {
  const [sessions, setSessions] = useState<AttendanceSessionDto[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [report, setReport] = useState<ServiceUnitAttendanceReportDto | null>(null);

  useEffect(() => {
    api.get<AttendanceSessionDto[]>("/attendance/sessions").then((all) => {
      const services = all.filter((s) => !s.classId);
      setSessions(services);
      if (services.length > 0) setSessionId(services[0].id);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setReport(null);
      return;
    }
    api.get<ServiceUnitAttendanceReportDto>(`/reports/service-unit-attendance?sessionId=${sessionId}`).then(setReport);
  }, [sessionId]);

  return (
    <Card
      title="Present vs. absent, by service unit"
      exportRows={report?.units.map((u) => ({
        "Service unit": u.unitName,
        Present: u.present,
        Absent: u.absent,
        Total: u.total,
        Rate: u.total > 0 ? `${Math.round((u.present / u.total) * 100)}%` : "",
      }))}
    >
      <select
        value={sessionId}
        onChange={(e) => setSessionId(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm mb-4"
        style={{ borderColor: "var(--line)" }}
      >
        {sessions.length === 0 && <option value="">No services recorded yet</option>}
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} · {new Date(s.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </option>
        ))}
      </select>
      {sessionId && report && report.units.length === 0 && (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No service units set up yet.</p>
      )}
      {sessionId && report && report.units.length > 0 && <ServiceUnitAttendanceChart rows={report.units} />}
    </Card>
  );
}

function PledgesTab({ currency }: { currency: string }) {
  const [pledges, setPledges] = useState<PledgeDto[]>([]);
  useEffect(() => {
    api.get<PledgeDto[]>("/giving/pledges").then(setPledges);
  }, []);

  return (
    <Card
      title="Pledge fulfillment"
      exportRows={pledges.map((p) => ({
        Member: p.member?.fullName ?? "—",
        Fund: p.fund?.name ?? "General",
        Fulfilled: p.fulfilledAmount,
        Pledged: p.amount,
        Currency: p.currency,
      }))}
    >
      {pledges.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No pledges yet.</p>}
      {pledges.map((p) => (
        <Bar
          key={p.id}
          label={`${p.member?.fullName ?? "—"} · ${p.fund?.name ?? "General"}`}
          value={p.fulfilledAmount}
          max={Number(p.amount) || 1}
          formatValue={(v) => `${formatMoney(v, p.currency)} / ${formatMoney(p.amount, p.currency)}`}
        />
      ))}
    </Card>
  );
}

function AssetsTab({ currency }: { currency: string }) {
  const [assets, setAssets] = useState<FixedAssetDto[]>([]);
  useEffect(() => {
    api.get<FixedAssetDto[]>("/fixed-assets").then(setAssets);
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) map.set(a.category, (map.get(a.category) ?? 0) + a.currentValue);
    return Array.from(map.entries()).map(([category, total]) => ({ category, total }));
  }, [assets]);

  const byCondition = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) map.set(a.currentCondition, (map.get(a.currentCondition) ?? 0) + 1);
    return Array.from(map.entries()).map(([condition, count]) => ({ condition, count }));
  }, [assets]);

  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const categoryMax = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={`Current value by category (total ${formatMoney(totalValue, currency)})`} exportRows={byCategory}>
        {byCategory.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No assets recorded yet.</p>}
        {byCategory.map((c) => (
          <Bar key={c.category} label={FIXED_ASSET_CATEGORY_LABELS[c.category as keyof typeof FIXED_ASSET_CATEGORY_LABELS]} value={c.total} max={categoryMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="Condition across all branches" exportRows={byCondition}>
        {byCondition.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No assets recorded yet.</p>}
        {byCondition.map((c) => (
          <Bar key={c.condition} label={ASSET_CONDITION_LABELS[c.condition as keyof typeof ASSET_CONDITION_LABELS]} value={c.count} max={assets.length || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
    </div>
  );
}

function LeadersTab({ currency }: { currency: string }) {
  const [rows, setRows] = useState<FellowshipLeaderboardEntryDto[]>([]);
  useEffect(() => {
    api.get<FellowshipLeaderboardEntryDto[]>("/reports/fellowship-leaderboard").then(setRows);
  }, []);

  return (
    <Card
      title="Fellowship leader performance"
      exportRows={rows.map((r) => ({
        Leader: r.leaderName,
        Fellowships: r.fellowships.join(", "),
        "Reports submitted": r.reportsSubmitted,
        Approved: r.approved,
        Rejected: r.rejected,
        "Avg. attendance": r.averageAttendance,
        "Giving approved": r.givingApproved,
      }))}
    >
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No fellowship reports submitted yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
                <th className="py-2 pr-3 font-medium">Leader</th>
                <th className="py-2 pr-3 font-medium">Fellowships</th>
                <th className="py-2 pr-3 font-medium text-right">Reports</th>
                <th className="py-2 pr-3 font-medium text-right">Approved</th>
                <th className="py-2 pr-3 font-medium text-right">Rejected</th>
                <th className="py-2 pr-3 font-medium text-right">Avg. attendance</th>
                <th className="py-2 pr-3 font-medium text-right">Giving approved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.leaderId} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                  <td className="py-2 pr-3 font-medium">{r.leaderName}</td>
                  <td className="py-2 pr-3" style={{ color: "var(--ink-muted)" }}>{r.fellowships.join(", ")}</td>
                  <td className="py-2 pr-3 text-right">{r.reportsSubmitted}</td>
                  <td className="py-2 pr-3 text-right">{r.approved}</td>
                  <td className="py-2 pr-3 text-right">{r.rejected}</td>
                  <td className="py-2 pr-3 text-right">{r.averageAttendance}</td>
                  <td className="py-2 pr-3 text-right">{formatMoney(r.givingApproved, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ReportsPage() {
  const { org } = useOrg();
  const currency = org?.currency ?? "UGX";
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Reports</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Aggregated views across the system -- membership, attendance, giving, pledges, fixed assets,
        and fellowship leader activity.
      </p>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: "var(--line)" }}>
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className="px-4 py-2 text-sm font-medium -mb-px border-b-2 whitespace-nowrap"
            style={{
              borderColor: tab === value ? "var(--accent)" : "transparent",
              color: tab === value ? "var(--ink)" : "var(--ink-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "attendance" && <AttendanceListsTab />}
      {tab === "serviceUnits" && <ServiceUnitsTab />}
      {tab === "giving" && <GivingTab currency={currency} />}
      {tab === "statements" && <StatementsTab currency={currency} />}
      {tab === "pledges" && <PledgesTab currency={currency} />}
      {tab === "assets" && <AssetsTab currency={currency} />}
      {tab === "leaders" && <LeadersTab currency={currency} />}
    </div>
  );
}
