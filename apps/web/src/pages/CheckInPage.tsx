import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { COUNTRIES, type MemberDto, type OrganizationDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { db } from "../lib/db";
import { enqueue } from "../lib/sync";

/**
 * Public route -- no login. This is what a QR scan opens, and also what an
 * usher opens on a shared device: same page, same code path, whether the
 * device is signed in or not (Section 2/10).
 */
export function CheckInPage() {
  const { token } = useParams<{ token: string }>();
  const [org, setOrg] = useState<Pick<OrganizationDto, "displayName" | "logoUrl" | "theme" | "country"> | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberDto[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorIsStudent, setVisitorIsStudent] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // No signed-in useOrg() here (this route is public) -- the org's default
  // country only becomes known once the check-in info loads, so the dial
  // code fills in then rather than at first render; it never overwrites
  // whatever the visitor's already typed.
  useEffect(() => {
    if (!org?.country || visitorPhone) return;
    const dialCode = COUNTRIES.find((c) => c.name === org.country)?.dialCode;
    if (dialCode) setVisitorPhone(`${dialCode} `);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  const cacheKey = `checkin:${token}`;

  // An anonymous visitor has no org context to derive a theme from (that
  // normally comes from useOrg(), which is null when signed out) -- once we
  // know which church this session belongs to, brand the page to match.
  useEffect(() => {
    if (!org?.theme) return;
    document.documentElement.setAttribute("data-theme", org.theme.toLowerCase());
  }, [org?.theme]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const info = await api.get<{
          session: { name: string };
          organization: Pick<OrganizationDto, "displayName" | "logoUrl" | "theme" | "country">;
        }>(`/checkin/${token}`);
        setSessionName(info.session.name);
        setOrg(info.organization);
        localStorage.setItem(cacheKey, JSON.stringify({ sessionName: info.session.name, org: info.organization }));
      } catch {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setSessionName(parsed.sessionName);
          setOrg(parsed.org);
        } else {
          setError("This check-in link needs an internet connection the first time it's opened.");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await api.get<MemberDto[]>(`/checkin/${token}/search?q=${encodeURIComponent(search)}`));
      } catch {
        const local = await db.members.orderBy("fullName").toArray();
        setResults(local.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase())));
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, token]);

  async function checkIn(memberId?: string, name?: string) {
    if (!token) return;
    const id = crypto.randomUUID();
    await enqueue({
      id,
      entity: "publicCheckIn",
      operation: "create",
      parentId: token,
      payload: memberId
        ? { id, memberId }
        : { id, visitorName: name, visitorPhone: visitorPhone.trim() || undefined, isStudent: visitorIsStudent },
    });
    setDone(name ?? "You're");
    setSearch("");
    setResults([]);
    setVisitorName("");
    setVisitorIsStudent(false);
    const dialCode = org?.country ? COUNTRIES.find((c) => c.name === org.country)?.dialCode : undefined;
    setVisitorPhone(dialCode ? `${dialCode} ` : "");
  }

  if (error) {
    return <CenteredCard>{error}</CenteredCard>;
  }

  if (done) {
    return (
      <CenteredCard org={org}>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✓</div>
          <p className="text-lg font-medium mb-1">You're checked in!</p>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {sessionName}
          </p>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="mt-4 text-sm underline"
            style={{ color: "var(--accent-ink)" }}
          >
            Check in someone else
          </button>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard org={org}>
      <h1 className="text-lg font-semibold mb-1 text-center">{sessionName ?? "Check in"}</h1>
      <p className="text-sm mb-5 text-center" style={{ color: "var(--ink-muted)" }}>
        Find your name, or type it if you're visiting for the first time.
      </p>

      <div className="relative mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your name…"
          className="w-full rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border shadow-lg" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => checkIn(m.id, m.fullName)}
                className="block w-full text-left px-3 py-2 text-sm"
                style={{ color: "var(--ink)" }}
              >
                {m.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-center mb-2" style={{ color: "var(--ink-muted)" }}>
        First time here?
      </p>
      <div className="grid gap-2">
        <input
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          placeholder="Your full name"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        <div className="flex gap-2">
          <input
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="button"
            disabled={!visitorName.trim()}
            onClick={() => checkIn(undefined, visitorName)}
            className="rounded-md px-4 py-2 text-sm font-medium shrink-0 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Check in
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
          <input type="checkbox" checked={visitorIsStudent} onChange={(e) => setVisitorIsStudent(e.target.checked)} />
          I'm a student
        </label>
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ children, org }: { children: React.ReactNode; org?: Pick<OrganizationDto, "displayName" | "logoUrl"> | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div className="w-full max-w-sm rounded-xl border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        {org?.displayName && (
          <p className="text-xs text-center mb-3 uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            {org.displayName}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
