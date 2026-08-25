import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";
import type { AttendanceRecordDto, AttendanceSessionDto, MemberDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { db } from "../lib/db";
import { enqueue } from "../lib/sync";
import { IconButton, TrashIcon, UserPlusIcon } from "../components/icons";

export function AttendanceSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<AttendanceSessionDto | null>(null);
  const [records, setRecords] = useState<AttendanceRecordDto[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MemberDto[]>([]);
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [addMemberFor, setAddMemberFor] = useState<AttendanceRecordDto | null>(null);
  const [addMemberAddress, setAddMemberAddress] = useState("");
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const checkInUrl = session ? `${window.location.origin}/checkin/${session.qrToken}` : "";

  // Who's already in this session -- lets both the search results and the
  // walk-in form warn/refuse before a duplicate check-in even reaches the
  // server (which also de-dupes, but catching it here avoids the round trip
  // and gives an immediate "already checked in" instead of a silent no-op).
  const checkedInMemberIds = useMemo(() => new Set(records.filter((r) => r.memberId).map((r) => r.memberId as string)), [records]);
  const checkedInVisitorNames = useMemo(
    () => new Set(records.filter((r) => !r.memberId && r.visitorName).map((r) => (r.visitorName as string).trim().toLowerCase())),
    [records],
  );
  const visitorNameTaken = visitorName.trim().length > 0 && checkedInVisitorNames.has(visitorName.trim().toLowerCase());

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
    if (!id || checkedInMemberIds.has(member.id)) return;
    const recordId = crypto.randomUUID();
    setRecords((r) => [
      { id: recordId, sessionId: id, memberId: member.id, member: { id: member.id, fullName: member.fullName, phone: member.phone ?? null }, visitorName: null, visitorPhone: null, checkedInAt: new Date().toISOString() },
      ...r,
    ]);
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
    if (!id || !visitorName.trim() || visitorNameTaken) return;
    const recordId = crypto.randomUUID();
    const name = visitorName.trim();
    const phone = visitorPhone.trim() || null;
    setRecords((r) => [{ id: recordId, sessionId: id, memberId: null, visitorName: name, visitorPhone: phone, checkedInAt: new Date().toISOString() }, ...r]);
    await enqueue({
      id: recordId,
      entity: "attendanceRecord",
      operation: "create",
      parentId: id,
      payload: { id: recordId, visitorName: name, visitorPhone: phone ?? undefined },
    });
    setVisitorName("");
    setVisitorPhone("");
  }

  async function deleteRecord(record: AttendanceRecordDto) {
    const label = record.member?.fullName ?? record.visitorName ?? "this check-in";
    if (!window.confirm(`Remove ${label} from this session's attendance?`)) return;
    const previous = records;
    setRecords((r) => r.filter((x) => x.id !== record.id));
    try {
      await api.delete(`/attendance/sessions/${id}/records/${record.id}`);
    } catch {
      setRecords(previous);
    }
  }

  function openAddMember(record: AttendanceRecordDto) {
    setAddMemberFor(record);
    setAddMemberAddress("");
    setAddMemberError(null);
  }

  async function submitAddMember(e: FormEvent) {
    e.preventDefault();
    if (!addMemberFor) return;
    if (!addMemberAddress.trim()) {
      setAddMemberError("Address is required.");
      return;
    }
    setAddMemberError(null);
    try {
      const newMember = await api.post<MemberDto>("/members", {
        id: crypto.randomUUID(),
        fullName: addMemberFor.visitorName ?? "",
        phone: addMemberFor.visitorPhone ?? "",
        address: addMemberAddress.trim(),
      });
      const updated = await api.patch<AttendanceRecordDto>(
        `/attendance/sessions/${id}/records/${addMemberFor.id}/link-member`,
        { memberId: newMember.id },
      );
      setRecords((r) => r.map((x) => (x.id === addMemberFor.id ? { ...updated, member: { id: newMember.id, fullName: newMember.fullName, phone: newMember.phone } } : x)));
      setAddMemberFor(null);
    } catch (err) {
      setAddMemberError(err instanceof ApiError ? err.message : "Couldn't add this member. Try again.");
    }
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
              {results.map((m) => {
                const already = checkedInMemberIds.has(m.id);
                return already ? (
                  <div key={m.id} className="px-3 py-2 text-sm flex items-center justify-between" style={{ color: "var(--ink-muted)" }}>
                    <span>{m.fullName}</span>
                    <span className="text-xs">Already checked in</span>
                  </div>
                ) : (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => checkInMember(m)}
                    className="block w-full text-left px-3 py-2 text-sm"
                    style={{ color: "var(--ink)" }}
                  >
                    {m.fullName}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2 mb-1">
          <input
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            placeholder="Walk-in's name…"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <input
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="w-40 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
          <button
            type="button"
            onClick={checkInVisitor}
            disabled={!visitorName.trim() || visitorNameTaken}
            className="rounded-md px-4 py-2 text-sm font-medium shrink-0 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Check in
          </button>
        </div>
        {visitorNameTaken && (
          <p className="text-xs" style={{ color: "var(--danger, #b91c1c)" }}>
            Someone with that name is already checked in to this session.
          </p>
        )}
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
            <div
              key={r.id}
              className="px-4 py-3 border-t first:border-t-0 text-sm flex items-center justify-between gap-3"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <div>
                <div>{r.member?.fullName ?? r.visitorName}</div>
                {(r.member?.phone ?? r.visitorPhone) && (
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {r.member?.phone ?? r.visitorPhone}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!r.memberId && (
                  <IconButton title="Add as a member" onClick={() => openAddMember(r)}>
                    <UserPlusIcon />
                  </IconButton>
                )}
                <IconButton title="Remove from this session" onClick={() => deleteRecord(r)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </section>

      {addMemberFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <form
            onSubmit={submitAddMember}
            className="w-full max-w-sm rounded-xl border p-4 grid gap-3"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <h3 className="text-sm font-medium">Add {addMemberFor.visitorName} as a member</h3>
            <label className="text-sm grid gap-1">
              Phone
              <input
                value={addMemberFor.visitorPhone ?? ""}
                onChange={(e) => setAddMemberFor((f) => (f ? { ...f, visitorPhone: e.target.value } : f))}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </label>
            <label className="text-sm grid gap-1">
              Address
              <input
                value={addMemberAddress}
                onChange={(e) => setAddMemberAddress(e.target.value)}
                required
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
            </label>
            {addMemberError && <p className="text-sm" style={{ color: "#b91c1c" }}>{addMemberError}</p>}
            <div className="flex justify-end gap-2 mt-1">
              <button type="button" onClick={() => setAddMemberFor(null)} className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                Cancel
              </button>
              <button type="submit" className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
                Add member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
