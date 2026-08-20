import { Gender, MaritalStatus, type SelfRegistrationDto } from "@life-mmp/shared";
import { IconButton } from "./icons";

const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};

const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "var(--ink-muted)" }}>
        {label}
      </dt>
      <dd style={{ color: value ? "var(--ink)" : "var(--ink-muted)" }}>{value || "Not set"}</dd>
    </div>
  );
}

export function RegistrationDialog({
  registration,
  busy,
  onClose,
  onApprove,
  onReject,
}: {
  registration: SelfRegistrationDto;
  busy: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line-soft)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            {registration.fullName}
          </h2>
          <IconButton onClick={onClose} title="Close">
            <CloseIcon />
          </IconButton>
        </div>

        <div className="p-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5">
            <Field label="Phone" value={registration.phone} />
            <Field label="Email" value={registration.email} />
            <Field label="Gender" value={registration.gender ? GENDER_LABELS[registration.gender] : null} />
            <Field label="Nationality" value={registration.nationality} />
            <Field
              label="Birthday"
              value={
                registration.birthMonth
                  ? `${MONTHS[registration.birthMonth - 1]} ${registration.birthDay ?? ""}${registration.birthYear ? `, ${registration.birthYear}` : ""}`
                  : null
              }
            />
            <Field
              label="Marital status"
              value={registration.maritalStatus ? MARITAL_LABELS[registration.maritalStatus] : null}
            />
            <Field label="Student" value={registration.isStudent ? registration.school || "Yes" : null} />
            <Field label="Address" value={registration.address} />
          </dl>
          {registration.notes && (
            <div className="mb-5 rounded-md p-3 text-sm" style={{ background: "var(--surface-2)" }}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--ink-muted)" }}>
                Anything else
              </div>
              "{registration.notes}"
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
            <button
              type="button"
              disabled={busy}
              onClick={onApprove}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--accent)", color: "white" }}
            >
              {busy ? "Working…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
