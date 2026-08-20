export function ConfirmCreatePreview({
  title,
  rows,
  onConfirm,
  onCancel,
  confirming,
}: {
  title: string;
  rows: { label: string; value: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border p-5"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>
          Double-check these details before confirming -- removing a record afterward needs another
          appointed approver to review and confirm it, not just you.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
          {rows
            .filter((r) => r.value)
            .map((r) => (
              <div key={r.label}>
                <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
                  {r.label}
                </dt>
                <dd>{r.value}</dd>
              </div>
            ))}
        </dl>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {confirming ? "Creating…" : "Confirm & create"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
