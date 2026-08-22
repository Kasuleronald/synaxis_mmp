import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  COUNTRIES,
  Gender,
  MaritalStatus,
  type PublicOrgInfo,
  type SubmitRegistrationInput,
} from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";

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

/** Public route -- no login. A church shares this link (or a QR code of it)
 * so visitors can register themselves; nothing becomes a real member until
 * an appointed approver reviews it (see RegistrationsPage). Same field set
 * as the admin's Add Member form, minus what only an admin assigns
 * (status, household, fellowship, discipleship class, leadership). */
export function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<PublicOrgInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [nationality, setNationality] = useState("");
  const [address, setAddress] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | "">("");
  const [isStudent, setIsStudent] = useState(false);
  const [school, setSchool] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const orgDialCode = COUNTRIES.find((c) => c.name === org?.country)?.dialCode ?? "";
  // A number typed as "0712 345678" locally becomes "+256712345678" with
  // the country code -- the leading 0 is dropped, not kept. Prefilling the
  // code and showing the rest as a greyed example (not a real placeholder
  // digit sequence in the value) heads off people re-typing that 0.
  const phoneExample = orgDialCode ? `e.g. ${orgDialCode} 712 345678` : "";

  useEffect(() => {
    if (!slug) return;
    api
      .get<PublicOrgInfo>(`/register/${slug}`)
      .then((info) => {
        setOrg(info);
        document.documentElement.setAttribute("data-theme", info.theme.toLowerCase());
        const dialCode = COUNTRIES.find((c) => c.name === info.country)?.dialCode;
        if (dialCode) setPhone(`${dialCode} `);
        if (info.country) setNationality(info.country);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    const input: SubmitRegistrationInput = {
      fullName,
      phone: phone.trim() || undefined,
      email: email || undefined,
      gender: gender || undefined,
      nationality: nationality || undefined,
      birthMonth: birthMonth ? Number(birthMonth) : undefined,
      birthDay: birthDay ? Number(birthDay) : undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      maritalStatus: maritalStatus || undefined,
      isStudent,
      school: isStudent ? school || undefined : undefined,
      address: address || undefined,
      notes: notes || undefined,
    };
    try {
      await api.post(`/register/${slug}`, input);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return <CenteredCard>This registration link is no longer valid.</CenteredCard>;
  }

  if (done) {
    return (
      <CenteredCard org={org}>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✓</div>
          <p className="text-lg font-medium mb-1">Thank you, {fullName.split(" ")[0]}!</p>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Your registration was submitted. Someone from the church will confirm it soon.
          </p>
        </div>
      </CenteredCard>
    );
  }

  return (
    <CenteredCard org={org} wide>
      <h1 className="text-lg font-semibold mb-1 text-center">Register</h1>
      <p className="text-sm mb-5 text-center" style={{ color: "var(--ink-muted)" }}>
        Tell us a bit about yourself -- an admin will confirm this shortly.
      </p>

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Full name</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={phoneExample}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">Prefer not to say</option>
            {Object.entries(GENDER_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Nationality</label>
          <select
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">Not set</option>
            {COUNTRIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Address</label>
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Where you stay -- village, area, or street"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Birthday</label>
          <div className="flex gap-2">
            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm flex-1"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={31}
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              placeholder="Day"
              className="rounded-md border px-3 py-2 text-sm w-20"
              style={{ borderColor: "var(--line)" }}
            />
            <input
              type="number"
              min={1900}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="Year (optional)"
              className="rounded-md border px-3 py-2 text-sm w-32"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Marital status</label>
          <select
            value={maritalStatus}
            onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus | "")}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">Not set</option>
            {Object.entries(MARITAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm mb-1 mt-6">
            <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)} />
            Student
          </label>
          {isStudent && (
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="School name"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm mb-1">Anything else? (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>

        {error && (
          <div className="sm:col-span-2 rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </form>
    </CenteredCard>
  );
}

function CenteredCard({
  children,
  org,
  wide,
}: {
  children: React.ReactNode;
  org?: Pick<PublicOrgInfo, "displayName" | "logoUrl"> | null;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <div
        className={`w-full ${wide ? "max-w-xl" : "max-w-sm"} rounded-xl border p-6`}
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        {org?.displayName && (
          <p className="text-xs text-center mb-3 uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            {org.displayName}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
