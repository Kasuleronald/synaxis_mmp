import { useEffect, useState, type FormEvent } from "react";
import { HouseholdRole, type HouseholdDto, type MemberDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { MemberSearchSelect } from "../components/MemberSearchSelect";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";
import { useTerminology } from "../hooks/useTerminology";

export function HouseholdsPage() {
  const terms = useTerminology();
  const [households, setHouseholds] = useState<HouseholdDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [name, setName] = useState("");
  const [headMemberId, setHeadMemberId] = useState("");
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHeadMemberId, setEditHeadMemberId] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<Record<string, string>>({});
  const [couplesOnly, setCouplesOnly] = useState(false);

  async function load() {
    const [h, m] = await Promise.all([
      api.get<HouseholdDto[]>("/households"),
      api.get<MemberDto[]>("/members"),
    ]);
    setHouseholds(h);
    setMembers(m);
  }

  useEffect(() => {
    load();
  }, []);

  function onPickHead(id: string) {
    setHeadMemberId(id);
    if (!addressTouched) {
      const head = members.find((m) => m.id === id);
      setAddress(head?.address ?? "");
    }
  }

  function resetForm() {
    setName("");
    setHeadMemberId("");
    setAddress("");
    setAddressTouched(false);
  }

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/households", { name, headMemberId: headMemberId || undefined, address: address || undefined });
      resetForm();
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(h: HouseholdDto) {
    setEditingId(h.id);
    setEditName(h.name);
    setEditHeadMemberId(h.head?.id ?? "");
    setEditAddress(h.address ?? "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/households/${id}`, {
      name: editName,
      headMemberId: editHeadMemberId || undefined,
      address: editAddress || undefined,
    });
    setEditingId(null);
    await load();
  }

  async function requestDelete(h: HouseholdDto) {
    try {
      await api.post("/deletion-requests", { entityType: "household", entityId: h.id, entityLabel: h.name });
      setDeleteMessage((prev) => ({ ...prev, [h.id]: "Deletion requested -- awaiting an approver." }));
    } catch (err) {
      setDeleteMessage((prev) => ({
        ...prev,
        [h.id]: err instanceof ApiError ? err.message : "Couldn't file the deletion request.",
      }));
    }
  }

  // Spouse per household -- households already carry a head, but not the
  // rest of the roster, so "who's the couple" is read off the members list
  // instead (each member already knows its own householdId/householdRole).
  const spouseByHousehold = new Map<string, MemberDto>();
  for (const m of members) {
    if (m.householdId && m.householdRole === HouseholdRole.SPOUSE) spouseByHousehold.set(m.householdId, m);
  }
  const visibleHouseholds = couplesOnly ? households.filter((h) => spouseByHousehold.has(h.id)) : households;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="text-xl font-semibold">{terms.household}</h1>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
          <input type="checkbox" checked={couplesOnly} onChange={(e) => setCouplesOnly(e.target.checked)} />
          Couples only
        </label>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Family units -- pick a head here, or a member can join one from their own profile instead.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-4 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Balayo Family"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Head of household</label>
          <MemberSearchSelect members={members} value={headMemberId} onChange={onPickHead} emptyLabel="None yet" />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressTouched(true);
            }}
            placeholder="Filled in from the head's profile if they have one on file"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Add
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Create this household?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Name", value: name },
            { label: "Head", value: members.find((m) => m.id === headMemberId)?.fullName ?? "" },
            { label: "Address", value: address },
          ]}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {visibleHouseholds.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            {couplesOnly ? "No couples linked yet." : "No households yet."}
          </div>
        )}
        {visibleHouseholds.map((h) => {
          const isEditing = editingId === h.id;
          const isDeleting = deletingId === h.id;
          return (
            <div key={h.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
              {isEditing ? (
                <div className="px-4 py-3 grid gap-2">
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                  <MemberSearchSelect members={members} value={editHeadMemberId} onChange={setEditHeadMemberId} emptyLabel="None" />
                  <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => saveEdit(h.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div>{h.name}</div>
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {[
                        spouseByHousehold.has(h.id) && h.head
                          ? `${h.head.fullName} & ${spouseByHousehold.get(h.id)!.fullName}`
                          : h.head?.fullName,
                        h.address,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No head or address set"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton title="Edit" onClick={() => startEdit(h)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton title="Request deletion" onClick={() => setDeletingId(h.id)}>
                      <TrashIcon />
                    </IconButton>
                  </div>
                </div>
              )}
              {isDeleting && (
                <div className="mx-4 mb-3 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                  {deleteMessage[h.id] ? (
                    <p>{deleteMessage[h.id]}</p>
                  ) : (
                    <>
                      <p className="mb-2">
                        This won't delete "{h.name}" right away -- it files a request an appointed approver
                        has to confirm first.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => requestDelete(h)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--danger)", color: "white" }}>
                          Request deletion
                        </button>
                        <button type="button" onClick={() => setDeletingId(null)} className="rounded-md px-3 py-1.5 text-xs font-medium" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
