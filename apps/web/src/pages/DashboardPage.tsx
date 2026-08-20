import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FollowUpStatus,
  Gender,
  MaritalStatus,
  Role,
  type BranchDto,
  type EventDto,
  type GivingSummaryDto,
  type MemberDto,
  type UserDto,
} from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../lib/api";

// Validated categorical palette (dataviz skill) -- light/dark step pairs
// chosen for sufficient contrast under white tile text.
const TILE_COLORS = {
  blue: { light: "#2a78d6", dark: "#3987e5" },
  violet: { light: "#4a3aa7", dark: "#9085e9" },
  aqua: { light: "#1baf7a", dark: "#199e70" },
  orange: { light: "#eb6834", dark: "#d95926" },
  rose: { light: "#c23b6b", dark: "#d9578a" },
  teal: { light: "#0f8a8a", dark: "#14a3a3" },
} as const;

const PIE_PALETTE = ["#2a78d6", "#e0578e", "#1baf7a", "#eb6834", "#9085e9", "#94a3b8"];

function BranchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FollowUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  );
}

function AttendanceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2 1 3.5 1 2-1 3.5-1 2 1 3.5 1 2-1 3.5-1 2 1 2 1" />
      <path d="M12 7V3M9 3s0 2 1.5 2S12 3 12 3s0 2 1.5 2S15 3 15 3" />
    </svg>
  );
}

function NewMemberIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  );
}

function GivingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function StatTile({
  label,
  value,
  sublabel,
  color,
  icon,
  to,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  color: keyof typeof TILE_COLORS;
  icon: React.ReactNode;
  to?: string;
}) {
  const { mode } = useTheme();
  const bg = TILE_COLORS[color][mode];
  const content = (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: bg }}>
      <div className="rounded-full flex items-center justify-center" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)" }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="text-sm text-white/85">{label}</div>
        {sublabel && <div className="text-xs text-white/70 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulative = 0;
  const stops = data.map((d, i) => {
    const start = total > 0 ? (cumulative / total) * 360 : 0;
    cumulative += d.value;
    const end = total > 0 ? (cumulative / total) * 360 : 0;
    return `${PIE_PALETTE[i % PIE_PALETTE.length]} ${start}deg ${end}deg`;
  });
  const gradient = total > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--surface-2)";

  return (
    <div className="flex items-center gap-5">
      <div className="rounded-full shrink-0" style={{ width: 120, height: 120, background: gradient }} />
      <div className="flex flex-col gap-1.5 text-sm min-w-0">
        {data.length === 0 && <span style={{ color: "var(--ink-muted)" }}>No data yet.</span>}
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="rounded-full shrink-0" style={{ width: 10, height: 10, background: PIE_PALETTE[i % PIE_PALETTE.length] }} />
            <span className="truncate">{d.label}</span>
            <span className="shrink-0" style={{ color: "var(--ink-muted)" }}>
              {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const BIRTHDAY_WINDOW_DAYS = 30;
const NEW_MEMBER_WINDOW_DAYS = 30;

/** This year's (or, if it's already passed, next year's) occurrence of a
 * month/day birthday -- used to measure "is this within the next N days"
 * across a Dec->Jan year boundary without special-casing it. */
function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = new Date(from.getFullYear(), month - 1, day);
  if (thisYear >= new Date(from.getFullYear(), from.getMonth(), from.getDate())) return thisYear;
  return new Date(from.getFullYear() + 1, month - 1, day);
}

export function DashboardPage() {
  const { user } = useAuth();
  const { org } = useOrg();
  const canSeeGiving = user?.role === Role.ORG_ADMIN || user?.role === Role.FINANCE_OFFICER;
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberDto[] | null>(null);
  const [pendingFollowUps, setPendingFollowUps] = useState<number | null>(null);
  const [weekAttendance, setWeekAttendance] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventDto[]>([]);
  const [givingSummary, setGivingSummary] = useState<GivingSummaryDto | null>(null);

  useEffect(() => {
    api.get<BranchDto[]>("/branches").then((b) => setBranchCount(b.length)).catch(() => {});
    if (user?.role === Role.ORG_ADMIN) {
      api.get<UserDto[]>("/users").then((u) => setStaffCount(u.length)).catch(() => {});
    }
    api.get<MemberDto[]>("/members").then(setMembers).catch(() => {});
    api
      .get<unknown[]>(`/follow-ups?status=${FollowUpStatus.PENDING}`)
      .then((f) => setPendingFollowUps(f.length))
      .catch(() => {});
    api
      .get<{ date: string; _count: { records: number } }[]>("/attendance/sessions")
      .then((sessions) => {
        const cutoff = Date.now() - WEEK_MS;
        const total = sessions
          .filter((s) => new Date(s.date).getTime() >= cutoff)
          .reduce((sum, s) => sum + s._count.records, 0);
        setWeekAttendance(total);
      })
      .catch(() => {});
    api
      .get<EventDto[]>("/events")
      .then((events) => setUpcomingEvents(events.filter((e) => new Date(e.startsAt) >= new Date()).slice(0, 5)))
      .catch(() => {});
    if (canSeeGiving) {
      api.get<GivingSummaryDto>("/giving/summary").then(setGivingSummary).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const now = new Date();

  const upcomingBirthdays = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.birthMonth && m.birthDay)
      .map((m) => ({ member: m, next: nextOccurrence(m.birthMonth as number, m.birthDay as number, now) }))
      .filter((b) => (b.next.getTime() - now.getTime()) / DAY_MS <= BIRTHDAY_WINDOW_DAYS)
      .sort((a, b) => a.next.getTime() - b.next.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const newMembers = useMemo(() => {
    if (!members) return [];
    const cutoff = now.getTime() - NEW_MEMBER_WINDOW_DAYS * DAY_MS;
    return members.filter((m) => new Date(m.createdAt).getTime() >= cutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  const genderData = useMemo(() => {
    if (!members) return [];
    const counts = new Map<string, number>();
    for (const m of members) {
      const key = m.gender === Gender.MALE ? "Male" : m.gender === Gender.FEMALE ? "Female" : "Unspecified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
  }, [members]);

  const maritalData = useMemo(() => {
    if (!members) return [];
    const labels: Record<string, string> = {
      [MaritalStatus.MARRIED]: "Married",
      [MaritalStatus.SINGLE]: "Single",
      [MaritalStatus.DIVORCED]: "Divorced",
      [MaritalStatus.WIDOWED]: "Widowed",
    };
    const counts = new Map<string, number>();
    for (const m of members) {
      const key = m.maritalStatus ? labels[m.maritalStatus] : "Unspecified";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
  }, [members]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Welcome, {user?.fullName?.split(" ")[0]}</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        People, follow-up, events, attendance, discipleship, and giving are live -- reporting lands over
        the next sprints.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatTile label="Members" value={members?.length ?? "—"} color="aqua" icon={<PeopleIcon />} to="/members" />
        <StatTile
          label="Pending follow-ups"
          value={pendingFollowUps ?? "—"}
          color="orange"
          icon={<FollowUpIcon />}
          to="/follow-ups"
        />
        <StatTile
          label="This week's attendance"
          value={weekAttendance ?? "—"}
          color="blue"
          icon={<AttendanceIcon />}
          to="/attendance"
        />
        <StatTile label="Branches" value={branchCount ?? "—"} color="violet" icon={<BranchIcon />} />
        <StatTile
          label={`Birthdays in ${BIRTHDAY_WINDOW_DAYS} days`}
          value={members ? upcomingBirthdays.length : "—"}
          color="rose"
          icon={<CakeIcon />}
        />
        <StatTile
          label={`New members (${NEW_MEMBER_WINDOW_DAYS}d)`}
          value={members ? newMembers.length : "—"}
          color="teal"
          icon={<NewMemberIcon />}
          to="/members"
        />
        {staffCount !== null && <StatTile label="Staff" value={staffCount} color="violet" icon={<PeopleIcon />} />}
        {canSeeGiving && (
          <StatTile
            label={givingSummary ? `${givingSummary.currency} this week` : "This week's giving"}
            value={givingSummary ? givingSummary.thisWeekTotal.toLocaleString() : "—"}
            sublabel={
              givingSummary && org?.secondaryCurrency && org.secondaryCurrencyRate
                ? `≈ ${org.secondaryCurrency} ${(givingSummary.thisWeekTotal * org.secondaryCurrencyRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : undefined
            }
            color="orange"
            icon={<GivingIcon />}
            to="/giving"
          />
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Upcoming events
          </h2>
          <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--line)" }}>
            {upcomingEvents.length === 0 && (
              <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                Nothing scheduled. <Link to="/events" style={{ color: "var(--accent-ink)" }}>Create an event</Link>.
              </div>
            )}
            {upcomingEvents.map((e) => (
              <div key={e.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
                <div className="text-sm font-medium">{e.title}</div>
                <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {new Date(e.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Upcoming birthdays (next {BIRTHDAY_WINDOW_DAYS} days)
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
            {upcomingBirthdays.length === 0 && (
              <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                No birthdays in the next {BIRTHDAY_WINDOW_DAYS} days.
              </div>
            )}
            {upcomingBirthdays.map(({ member, next }) => (
              <Link
                key={member.id}
                to={`/members/${member.id}`}
                className="flex items-center justify-between px-4 py-3 border-t first:border-t-0"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <span className="text-sm font-medium">{member.fullName}</span>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Gender
          </h2>
          <div className="rounded-xl border p-4 mb-8" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <PieChart data={genderData} />
          </div>

          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
            Marital status
          </h2>
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <PieChart data={maritalData} />
          </div>
        </div>
      </div>
    </div>
  );
}
