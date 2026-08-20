import { useEffect, useState, type FormEvent } from "react";
import { Role, TESTIMONY_CATEGORY_LABELS, TestimonyCategory, type TestimonyDto } from "@life-mmp/shared";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { IconButton, TrashIcon } from "../components/icons";

export function TestimoniesPage() {
  const { user } = useAuth();
  const [testimonies, setTestimonies] = useState<TestimonyDto[]>([]);
  const [category, setCategory] = useState<TestimonyCategory>(TestimonyCategory.SALVATION);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setTestimonies(await api.get<TestimonyDto[]>("/testimonies"));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/testimonies", { category, content });
      setContent("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.delete(`/testimonies/${id}`);
    await load();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Testimonies</h1>
      <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
        Share what God has done -- everyone with a login can read the feed. There's no editing; if
        something's wrong, take it down and repost.
      </p>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-4 mb-6 grid gap-3"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <label className="block text-sm mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TestimonyCategory)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {Object.entries(TESTIMONY_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Your testimony</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {saving ? "Posting…" : "Post testimony"}
          </button>
        </div>
      </form>

      <div className="grid gap-3">
        {testimonies.length === 0 && (
          <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--line)", color: "var(--ink-muted)" }}>
            Nothing shared yet.
          </div>
        )}
        {testimonies.map((t) => (
          <div key={t.id} className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-medium rounded-full px-2 py-0.5"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                {TESTIMONY_CATEGORY_LABELS[t.category]}
              </span>
              {user?.role === Role.ORG_ADMIN && (
                <IconButton title="Remove" onClick={() => remove(t.id)}>
                  <TrashIcon />
                </IconButton>
              )}
            </div>
            <p className="text-sm mb-2">{t.content}</p>
            <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {t.submittedBy?.fullName} · {new Date(t.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
