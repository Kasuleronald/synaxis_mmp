import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { GivingCategoryDto, VendorDto } from "@life-mmp/shared";
import { api } from "../lib/api";
import { EditIcon, IconButton, TrashIcon } from "../components/icons";

type CategoryNode = GivingCategoryDto & { children: CategoryNode[] };

function buildTree(flat: GivingCategoryDto[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function CategoriesTab() {
  const [categories, setCategories] = useState<GivingCategoryDto[]>([]);
  const [name, setName] = useState("");
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [subName, setSubName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setCategories(await api.get<GivingCategoryDto[]>("/giving/categories"));
  }

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => buildTree(categories), [categories]);

  async function addRoot(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/giving/categories", { name });
    setName("");
    await load();
  }

  async function addSub(parentId: string) {
    if (!subName.trim()) return;
    await api.post("/giving/categories", { name: subName, parentId });
    setSubName("");
    setAddingUnder(null);
    await load();
  }

  async function rename(id: string) {
    await api.patch(`/giving/categories/${id}`, { name: editName });
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    await api.patch(`/giving/categories/${id}/deactivate`);
    await load();
  }

  function Node({ node, depth }: { node: CategoryNode; depth: number }) {
    const isEditing = editingId === node.id;
    return (
      <div>
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t first:border-t-0"
          style={{ borderColor: "var(--line-soft)", paddingLeft: `${16 + depth * 24}px` }}
        >
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 rounded-md border px-2 py-1 text-sm"
                style={{ borderColor: "var(--line)" }}
              />
              <button type="button" onClick={() => rename(node.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs" style={{ color: "var(--ink-muted)" }}>
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className={depth === 0 ? "text-sm font-semibold" : "text-sm"}>{node.name}</span>
              <div className="flex items-center gap-1">
                {depth === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingUnder(addingUnder === node.id ? null : node.id);
                      setSubName("");
                    }}
                    className="text-xs underline mr-2"
                    style={{ color: "var(--accent-ink)" }}
                  >
                    + Add subcategory
                  </button>
                )}
                <IconButton
                  title="Rename"
                  onClick={() => {
                    setEditingId(node.id);
                    setEditName(node.name);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton title="Delete" onClick={() => remove(node.id)}>
                  <TrashIcon />
                </IconButton>
              </div>
            </>
          )}
        </div>
        {addingUnder === node.id && (
          <div
            className="flex items-center gap-2 px-4 py-2 border-t"
            style={{ borderColor: "var(--line-soft)", background: "var(--surface-2)", paddingLeft: `${16 + (depth + 1) * 24}px` }}
          >
            <input
              autoFocus
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder="Subcategory name"
              className="flex-1 rounded-md border px-2 py-1 text-sm"
              style={{ borderColor: "var(--line)" }}
              onKeyDown={(e) => e.key === "Enter" && addSub(node.id)}
            />
            <button
              type="button"
              onClick={() => addSub(node.id)}
              className="rounded-md px-3 py-1 text-xs font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Add
            </button>
          </div>
        )}
        {node.children.map((c) => (
          <Node key={c.id} node={c} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={addRoot} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New top-level category, e.g. Benevolence"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Add category
        </button>
      </form>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {tree.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No categories yet.
          </div>
        )}
        {tree.map((n) => (
          <Node key={n.id} node={n} depth={0} />
        ))}
      </div>
    </div>
  );
}

function VendorsTab() {
  const [vendors, setVendors] = useState<VendorDto[]>([]);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function load() {
    setVendors(await api.get<VendorDto[]>("/giving/vendors"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    await api.post("/giving/vendors", {
      name,
      contactEmail: contactEmail || undefined,
      contactPhone: contactPhone || undefined,
      notes: notes || undefined,
    });
    setName("");
    setContactEmail("");
    setContactPhone("");
    setNotes("");
    setShowForm(false);
    await load();
  }

  function startEdit(v: VendorDto) {
    setEditingId(v.id);
    setEditName(v.name);
    setEditEmail(v.contactEmail ?? "");
    setEditPhone(v.contactPhone ?? "");
    setEditNotes(v.notes ?? "");
  }

  async function saveEdit(id: string) {
    await api.patch(`/giving/vendors/${id}`, {
      name: editName,
      contactEmail: editEmail || undefined,
      contactPhone: editPhone || undefined,
      notes: editNotes || undefined,
    });
    setEditingId(null);
    await load();
  }

  async function deactivate(id: string) {
    await api.patch(`/giving/vendors/${id}/deactivate`);
    await load();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Your church's own payees -- vendors, contractors, utility companies -- for pointing accounting
          entries at.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md px-3 py-1.5 text-sm font-medium shrink-0"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {showForm ? "Cancel" : "+ New payee"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onAdd} className="rounded-xl border p-4 mb-4 grid gap-3 sm:grid-cols-2" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
          </div>
          <div>
            <label className="block text-sm mb-1">Contact email</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
          </div>
          <div>
            <label className="block text-sm mb-1">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent)", color: "white" }}>
              Save payee
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--line)" }}>
        {vendors.length === 0 && (
          <div className="p-4 text-sm" style={{ color: "var(--ink-muted)" }}>
            No payees yet.
          </div>
        )}
        {vendors.map((v) => (
          <div key={v.id} className="px-4 py-3 border-t first:border-t-0" style={{ borderColor: "var(--line-soft)" }}>
            {editingId === v.id ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="rounded-md border px-2 py-1 text-sm" style={{ borderColor: "var(--line)" }} />
                <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes" className="rounded-md border px-2 py-1 text-sm sm:col-span-2" style={{ borderColor: "var(--line)" }} />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => saveEdit(v.id)} className="text-xs font-medium" style={{ color: "var(--accent-ink)" }}>
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
                  <div className="text-sm font-semibold">{v.name}</div>
                  <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    {[v.contactEmail, v.contactPhone].filter(Boolean).join(" · ") || "No contact info"}
                    {v.notes ? ` · ${v.notes}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton title="Edit" onClick={() => startEdit(v)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton title="Deactivate" onClick={() => deactivate(v.id)}>
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

export function FinancialSettingsPage() {
  const [tab, setTab] = useState<"categories" | "vendors">("categories");

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Financial settings</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        The categories and payees the rest of Finance draws from.
      </p>

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "var(--line)" }}>
        {(
          [
            ["categories", "Categories"],
            ["vendors", "Payees and Vendors"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className="px-4 py-2 text-sm font-medium -mb-px border-b-2"
            style={{
              borderColor: tab === value ? "var(--accent)" : "transparent",
              color: tab === value ? "var(--ink)" : "var(--ink-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "categories" ? <CategoriesTab /> : <VendorsTab />}
    </div>
  );
}
