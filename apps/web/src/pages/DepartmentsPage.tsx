import { useEffect, useState, type FormEvent } from "react";
import { OrgUnitType, type MemberDto, type OrgUnitDto } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { ConfirmCreatePreview } from "../components/ConfirmCreatePreview";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";
import { MemberSearchSelect } from "../components/MemberSearchSelect";
import { useOrg } from "../context/OrgContext";
import { useTerminology } from "../hooks/useTerminology";

// Omit + redeclare `children`, not a plain intersection: OrgUnitDto already
// declares `children?: OrgUnitDto[]`, and intersecting a recursive
// self-reference on top of that leaves TS unable to narrow past the base
// type when indexing into it (children kept resolving to OrgUnitDto[]).
type OrgUnitNode = Omit<OrgUnitDto, "children"> & { _count: { members: number }; children: OrgUnitNode[] };

export function DepartmentsPage() {
  const terms = useTerminology();
  const { org } = useOrg();
  // Preserve the nicer two-word default copy when nothing's been
  // customized; a custom term replaces the whole phrase, since it's meant
  // to stand alone (e.g. "Ministries").
  const pageTitle = org?.departmentTerm || "Directorates & departments";
  const [tree, setTree] = useState<OrgUnitNode[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgUnitType>(OrgUnitType.DIRECTORATE);
  const [parentId, setParentId] = useState("");
  const [headId, setHeadId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHeadId, setEditHeadId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<Record<string, string>>({});

  async function load() {
    const [t, m] = await Promise.all([api.get<OrgUnitNode[]>("/org-units"), api.get<MemberDto[]>("/members")]);
    setTree(t);
    setMembers(m);
  }

  useEffect(() => {
    load();
  }, []);

  async function onConfirmCreate() {
    setSaving(true);
    try {
      await api.post("/org-units", {
        name,
        type,
        parentId: type === OrgUnitType.DEPARTMENT ? parentId : undefined,
        headId: headId || undefined,
      });
      setName("");
      setHeadId("");
      setConfirming(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(unit: OrgUnitNode) {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditHeadId(unit.headId ?? "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/org-units/${id}`, { name: editName, headId: editHeadId || undefined });
    setEditingId(null);
    await load();
  }

  async function requestDelete(unit: OrgUnitNode) {
    try {
      await api.post("/deletion-requests", { entityType: "orgUnit", entityId: unit.id, entityLabel: unit.name });
      setDeleteMessage((prev) => ({ ...prev, [unit.id]: "Deletion requested -- awaiting an approver." }));
    } catch (err) {
      setDeleteMessage((prev) => ({
        ...prev,
        [unit.id]: err instanceof ApiError ? err.message : "Couldn't file the deletion request.",
      }));
    }
  }

  function Row({ unit, indent }: { unit: OrgUnitNode; indent: boolean }) {
    const isEditing = editingId === unit.id;
    const isDeleting = deletingId === unit.id;
    return (
      <div style={{ background: indent ? "var(--surface-2)" : undefined }}>
        <div className={`flex items-center justify-between px-4 py-3 ${indent ? "pl-8" : ""}`}>
          {isEditing ? (
            <div className="flex-1 grid gap-2">
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border px-2 py-1 text-sm"
                  style={{ borderColor: "var(--line)" }}
                />
                <button type="button" onClick={() => saveEdit(unit.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                  Save
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  Cancel
                </button>
              </div>
              <MemberSearchSelect members={members} value={editHeadId} onChange={setEditHeadId} emptyLabel="No leader set" placeholder="Search for a leader…" />
            </div>
          ) : (
            <>
              <div>
                <span className={indent ? "text-sm" : "text-sm font-semibold"}>{unit.name}</span>
                {unit.head && (
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Led by {unit.head.fullName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {unit._count.members} members
                </span>
                <IconButton title="Edit" onClick={() => startEdit(unit)}>
                  <EditIcon />
                </IconButton>
                <IconButton title="Request deletion" onClick={() => setDeletingId(unit.id)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </>
          )}
        </div>
        {isDeleting && (
          <div className="mx-4 mb-3 rounded-md p-3 text-sm" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
            {deleteMessage[unit.id] ? (
              <p>{deleteMessage[unit.id]}</p>
            ) : (
              <>
                <p className="mb-2">
                  This won't delete "{unit.name}" right away -- it files a request an appointed approver has
                  to confirm first.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => requestDelete(unit)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{ background: "var(--danger)", color: "white" }}
                  >
                    Request deletion
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="rounded-md px-3 py-1.5 text-xs font-medium"
                    style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">{pageTitle}</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Departments nest under a directorate -- two levels, matching how the org actually runs.
      </p>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as OrgUnitType)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value={OrgUnitType.DIRECTORATE}>Directorate</option>
            <option value={OrgUnitType.DEPARTMENT}>Department</option>
          </select>
        </div>
        {type === OrgUnitType.DEPARTMENT && (
          <div>
            <label className="block text-sm mb-1">Under directorate</label>
            <select
              required
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Choose one</option>
              {tree.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === OrgUnitType.DIRECTORATE ? "Pastoral" : "Follow-up"}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Leader (optional)</label>
          <MemberSearchSelect members={members} value={headId} onChange={setHeadId} emptyLabel="None yet" placeholder="Search for a leader…" />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Create
          </button>
        </div>
      </form>

      {confirming && (
        <ConfirmCreatePreview
          title={`Create this ${type === OrgUnitType.DIRECTORATE ? "directorate" : "department"}?`}
          confirming={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={onConfirmCreate}
          rows={[
            { label: "Type", value: type === OrgUnitType.DIRECTORATE ? "Directorate" : "Department" },
            { label: "Name", value: name },
            { label: "Under directorate", value: tree.find((d) => d.id === parentId)?.name ?? "" },
            { label: "Leader", value: members.find((m) => m.id === headId)?.fullName ?? "" },
          ]}
        />
      )}

      {/* overflow-hidden gives the list its rounded corners, but it also clips the
          leader-search dropdown's popup while a row is being edited -- drop the clip
          for that case so the popup isn't cut off. */}
      <div className={`rounded-xl border ${editingId ? "" : "overflow-hidden"}`} style={{ borderColor: "var(--line)" }}>
        {tree.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No directorates yet.
          </div>
        )}
        {tree.map((d) => (
          <div key={d.id} className="border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            <Row unit={d} indent={false} />
            {d.children.map((c) => (
              <Row key={c.id} unit={c} indent />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
