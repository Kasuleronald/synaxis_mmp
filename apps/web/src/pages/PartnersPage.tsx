import { useEffect, useState, type FormEvent } from "react";
import { PARTNER_TYPE_LABELS, PartnerType, type PartnerDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";

export function PartnersPage() {
  const [partners, setPartners] = useState<PartnerDto[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<PartnerType>(PartnerType.PERSON);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<PartnerType>(PartnerType.PERSON);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function load() {
    setPartners(await api.get<PartnerDto[]>("/partners"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/partners", {
        name,
        type,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        notes: notes || undefined,
      });
      setName("");
      setContactEmail("");
      setContactPhone("");
      setNotes("");
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: PartnerDto) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditType(p.type);
    setEditEmail(p.contactEmail ?? "");
    setEditPhone(p.contactPhone ?? "");
    setEditNotes(p.notes ?? "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/partners/${id}`, {
      name: editName,
      type: editType,
      contactEmail: editEmail || undefined,
      contactPhone: editPhone || undefined,
      notes: editNotes || undefined,
    });
    setEditingId(null);
    await load();
  }

  async function deactivate(id: string) {
    await api.patch(`/partners/${id}/deactivate`);
    await load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Partners</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        External givers -- people, organizations, or sister churches who give financially without
        being a Member here. Tracked separately with their own giving and pledge history.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PartnerType)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {Object.entries(PARTNER_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Contact phone</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
            Add partner
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title="Add this partner?"
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Name", value: name },
            { label: "Type", value: PARTNER_TYPE_LABELS[type] },
            { label: "Contact email", value: contactEmail },
            { label: "Contact phone", value: contactPhone },
            { label: "Notes", value: notes },
          ]}
        />
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {partners.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No partners yet.
          </div>
        )}
        {partners.map((p) => (
          <div key={p.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            {editingId === p.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                <select value={editType} onChange={(e) => setEditType(e.target.value as PartnerType)} className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }}>
                  {Object.entries(PARTNER_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                <div className="flex items-center gap-2 sm:col-span-2">
                  <button type="button" onClick={() => saveEdit(p.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                    Save
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {p.name} <span className="text-xs font-normal" style={{ color: "var(--ink-muted)" }}>({PARTNER_TYPE_LABELS[p.type]})</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {[p.contactEmail, p.contactPhone].filter(Boolean).join(" · ") || "No contact info"}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton title="Edit" onClick={() => startEdit(p)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton title="Deactivate" onClick={() => deactivate(p.id)}>
                    <TrashIcon />
                  </IconButton>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
