import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CONDITION_LABELS,
  FIXED_ASSET_CATEGORY_LABELS,
  type AttendanceTrendPoint,
  type DemographicsReportDto,
  type FellowshipLeaderboardEntryDto,
  type FixedAssetDto,
  type FundDto,
  type FundStatementDto,
  type GivingCategoryTotal,
  type GivingFundTotal,
  type GivingTrendPoint,
  type MemberDto,
  type MemberStatementDto,
  type MembersOverTimePoint,
  type PledgeDto,
} from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { api } from "../lib/api";

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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

const TABS = [
  ["overview", "Members & attendance"],
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
      <Card title="Member growth (new members per month)">
        {growth.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No members recorded yet.</p>}
        {growth.map((g) => (
          <Bar key={g.month} label={g.month} value={g.newMembers} max={growthMax} formatValue={(v) => `${v} (${g.cumulative} total)`} />
        ))}
      </Card>
      <Card title="Attendance trend (check-ins per month)">
        {attendance.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No attendance recorded yet.</p>}
        {attendance.map((a) => (
          <Bar key={a.period} label={a.period.slice(0, 7)} value={a.count} max={attendanceMax} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Membership status">
        {demographics?.byStatus.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Gender">
        {demographics?.byGender.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Marital status">
        {demographics?.byMaritalStatus.map((b) => (
          <Bar key={b.label} label={b.label} value={b.count} max={demographics.total || 1} formatValue={(v) => String(v)} />
        ))}
      </Card>
      <Card title="Age group">
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
      <Card title="Giving trend (total per month)">
        {trend.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nothing recorded yet.</p>}
        {trend.map((t) => (
          <Bar key={t.period} label={t.period.slice(0, 7)} value={t.total} max={trendMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="By category (all time)">
        {byCategory.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nothing recorded yet.</p>}
        {byCategory.map((c) => (
          <Bar key={c.categoryId} label={c.name} value={c.total} max={categoryMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="By fund (all time)">
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
      <Card title="Member giving statement">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm mb-3" style={{ borderColor: "var(--line)" }}>
          <option value="">Choose a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
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
      <Card title="Fund statement">
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

function PledgesTab({ currency }: { currency: string }) {
  const [pledges, setPledges] = useState<PledgeDto[]>([]);
  useEffect(() => {
    api.get<PledgeDto[]>("/giving/pledges").then(setPledges);
  }, []);

  return (
    <Card title="Pledge fulfillment">
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
      <Card title={`Current value by category (total ${formatMoney(totalValue, currency)})`}>
        {byCategory.length === 0 && <p className="text-sm" style={{ color: "var(--ink-muted)" }}>No assets recorded yet.</p>}
        {byCategory.map((c) => (
          <Bar key={c.category} label={FIXED_ASSET_CATEGORY_LABELS[c.category as keyof typeof FIXED_ASSET_CATEGORY_LABELS]} value={c.total} max={categoryMax} formatValue={(v) => formatMoney(v, currency)} />
        ))}
      </Card>
      <Card title="Condition across all branches">
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
    <Card title="Fellowship leader performance">
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
      {tab === "giving" && <GivingTab currency={currency} />}
      {tab === "statements" && <StatementsTab currency={currency} />}
      {tab === "pledges" && <PledgesTab currency={currency} />}
      {tab === "assets" && <AssetsTab currency={currency} />}
      {tab === "leaders" && <LeadersTab currency={currency} />}
    </div>
  );
}
