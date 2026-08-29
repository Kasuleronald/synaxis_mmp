import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MemberDto } from "@life-mmp/shared";

/** A searchable stand-in for `<select>` over the full members list -- a
 * plain dropdown becomes unusable once a congregation has more than a
 * couple dozen people (Aug 2026: "whenever there is selection of a member
 * either by dropdown... there must be a search", named for the spouse
 * picker specifically but applying to every full-member-list picker). */
export function MemberSearchSelect({
  members,
  value,
  onChange,
  placeholder = "Search a member by name…",
  emptyLabel = "None",
}: {
  members: MemberDto[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = members.find((m) => m.id === value) ?? null;

  function updatePosition() {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }

  // Portaled to <body> and positioned `fixed` off the input's own
  // coordinates -- an `absolute` dropdown gets clipped the moment it's used
  // inside anything scrollable (a modal dialog's own overflow-y-auto body,
  // a bordered list wrapper), which a plain sibling `absolute` can't escape.
  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside, true);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside, true);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = (q ? members.filter((m) => m.fullName.toLowerCase().includes(q)) : members).slice(0, 50);

  return (
    <div className="relative" ref={containerRef}>
      <input
        value={open ? query : (selected?.fullName ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        placeholder={placeholder}
        className="w-full rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--line)" }}
      />
      {selected && !open && (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: "var(--ink-muted)" }}
        >
          ✕
        </button>
      )}
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100] mt-0 rounded-md border shadow-lg max-h-56 overflow-y-auto"
            style={{ top: coords.top, left: coords.left, width: coords.width, borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className="block w-full text-left px-3 py-2 text-sm"
              style={{ color: "var(--ink-muted)" }}
            >
              {emptyLabel}
            </button>
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="block w-full text-left px-3 py-2 text-sm"
                style={{ color: "var(--ink)" }}
              >
                {m.fullName}
                {m.memberNumber ? ` (${m.memberNumber})` : ""}
              </button>
            ))}
            {results.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                No matches
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
