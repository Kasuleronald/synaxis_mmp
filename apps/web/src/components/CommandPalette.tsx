import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { DiscipleshipClassDto, EventDto, FellowshipDto, MemberDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

interface Result {
  type: string;
  label: string;
  sublabel?: string;
  to: string;
}

/** Global Ctrl/Cmd+K quick search across Members/Fellowships/Discipleship
 * classes/Events -- fetched fresh each time the palette opens rather than
 * kept in some app-wide cache, since these lists are small for a single
 * church and staying simple beats staying perfectly in sync. */
export function CommandPalette() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [fellowships, setFellowships] = useState<FellowshipDto[]>([]);
  const [classes, setClasses] = useState<DiscipleshipClassDto[]>([]);
  const [events, setEvents] = useState<EventDto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !user || user.role === "PLATFORM_ADMIN") return;
    setQuery("");
    Promise.all([
      api.get<MemberDto[]>("/members").catch(() => []),
      api.get<FellowshipDto[]>("/fellowships").catch(() => []),
      api.get<DiscipleshipClassDto[]>("/discipleship/classes").catch(() => []),
      api.get<EventDto[]>("/events").catch(() => []),
    ]).then(([m, f, c, e]) => {
      setMembers(m);
      setFellowships(f);
      setClasses(c);
      setEvents(e);
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, user]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    for (const m of members) {
      if (m.fullName.toLowerCase().includes(q)) out.push({ type: "Member", label: m.fullName, sublabel: m.memberNumber ?? undefined, to: `/members/${m.id}` });
    }
    for (const f of fellowships) {
      if (f.name.toLowerCase().includes(q)) out.push({ type: "Fellowship", label: f.name, to: "/fellowships" });
    }
    for (const c of classes) {
      if (c.name.toLowerCase().includes(q)) out.push({ type: "Class", label: c.name, to: `/discipleship/classes/${c.id}` });
    }
    for (const e of events) {
      if (e.title.toLowerCase().includes(q)) out.push({ type: "Event", label: e.title, sublabel: new Date(e.startsAt).toLocaleDateString(), to: "/events" });
    }
    return out.slice(0, 20);
  }, [query, members, fellowships, classes, events]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-lg overflow-hidden"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members, fellowships, classes, events…"
          className="w-full px-4 py-3 text-sm outline-none"
          style={{ background: "transparent", color: "var(--ink)" }}
        />
        <div className="border-t max-h-80 overflow-y-auto" style={{ borderColor: "var(--line-soft)" }}>
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--ink-muted)" }}>
              No matches.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.label}-${i}`}
              type="button"
              onClick={() => {
                navigate(r.to);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm border-t first:border-t-0"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <span>
                {r.label}
                {r.sublabel && <span style={{ color: "var(--ink-muted)" }}> · {r.sublabel}</span>}
              </span>
              <span className="text-xs uppercase tracking-wide shrink-0" style={{ color: "var(--ink-muted)" }}>
                {r.type}
              </span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 text-xs border-t" style={{ borderColor: "var(--line-soft)", color: "var(--ink-muted)" }}>
          Ctrl/Cmd+K to toggle · Esc to close
        </div>
      </div>
    </div>
  );
}
