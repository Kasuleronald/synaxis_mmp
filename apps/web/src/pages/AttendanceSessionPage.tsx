import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import type { AttendanceRecordDto, AttendanceSessionDto, MemberDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { db } from "../lib/db";
import { enqueue } from "../lib/sync";

export function AttendanceSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<AttendanceSessionDto | null>(null);
  const [records, setRecords] = useState<AttendanceRecordDto[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberDto[]>([]);
  const [visitorName, setVisitorName] = useState("");

  const checkInUrl = session ? `${window.location.origin}/checkin/${session.qrToken}` : "";

  async function loadSession() {
    if (!id) return;
    const s = await api.get<AttendanceSessionDto>(`/attendance/sessions/${id}`);
    setSession(s);
    setRecords(await api.get<AttendanceRecordDto[]>(`/attendance/sessions/${id}/records`));
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (checkInUrl) QRCode.toDataURL(checkInUrl, { width: 220, margin: 1 }).then(setQrDataUrl);
  }, [checkInUrl]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const found = navigator.onLine
          ? await api.get<MemberDto[]>(`/members?q=${encodeURIComponent(search)}`)
          : (await db.members.orderBy("fullName").toArray()).filter((m) =>
              m.fullName.toLowerCase().includes(search.toLowerCase()),
            );
        setResults(found);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function checkInMember(member: MemberDto) {
    if (!id) return;
    const recordId = crypto.randomUUID();
    setRecords((r) => [{ id: recordId, sessionId: id, memberId: member.id, member: { id: member.id, fullName: member.fullName }, visitorName: null, checkedInAt: new Date().toISOString() }, ...r]);
    await enqueue({
      id: recordId,
      entity: "attendanceRecord",
      operation: "create",
      parentId: id,
      payload: { id: recordId, memberId: member.id },
    });
    setSearch("");
    setResults([]);
  }

  async function checkInVisitor() {
    if (!id || !visitorName.trim()) return;
    const recordId = crypto.randomUUID();
    setRecords((r) => [{ id: recordId, sessionId: id, memberId: null, visitorName, checkedInAt: new Date().toISOString() }, ...r]);
    await enqueue({
      id: recordId,
      entity: "attendanceRecord",
      operation: "create",
      parentId: id,
      payload: { id: recordId, visitorName },
    });
    setVisitorName("");
  }

  if (!session) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl grid gap-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">{session.name}</h1>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {new Date(session.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} ·{" "}
          {records.length} checked in
        </p>
      </div>

      <section className="rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        {qrDataUrl && <img src={qrDataUrl} alt="Check-in QR code" width={120} height={120} className="rounded-md border" style={{ borderColor: "var(--line)" }} />}
        <div className="text-sm">
          <p className="mb-1 font-medium">Scan to check in</p>
          <p className="mb-2" style={{ color: "var(--ink-muted)" }}>
            Anyone with this link can check themselves in -- no account needed. Same page an usher uses too.
          </p>
          <code className="text-xs break-all" style={{ color: "var(--accent-ink)" }}>
            {checkInUrl}
          </code>
        </div>
      </section>

      <section className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h2 className="text-sm font-medium mb-3">Manual check-in</h2>
        <div className="relative mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a member by name…"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border shadow-lg" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              {results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => checkInMember(m)}
                  className="block w-full text-left px-3 py-2 text-sm"
                  style={{ color: "var(--ink)" }}
                >
                  {m.fullName}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Or type a walk-in's name…"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="button"
            onClick={checkInVisitor}
            className="rounded-md px-4 py-2 text-sm font-medium shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Check in
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--ink-muted)" }}>
          Checked in
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
          {records.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              No one yet.
            </div>
          )}
          {records.map((r) => (
            <div key={r.id} className="px-4 py-3 border-t first:border-t-0 text-sm" style={{ borderColor: "var(--line-soft)" }}>
              {r.member?.fullName ?? r.visitorName}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
