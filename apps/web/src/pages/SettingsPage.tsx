import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { COUNTRIES, CURRENCIES, Theme } from "@life-mmp/shared";
import { useOrg } from "../context/OrgContext";
import { ApiError } from "../lib/api";

const THEME_SWATCHES: Record<Theme, { label: string; color: string }> = {
  [Theme.GROWTH]: { label: "Growth", color: "#1B7A57" },
  [Theme.HERITAGE]: { label: "Heritage", color: "#2A3B7C" },
  [Theme.EMBER]: { label: "Ember", color: "#C1502E" },
  [Theme.REGAL]: { label: "Regal", color: "#6B3FA0" },
  [Theme.SLATE]: { label: "Slate", color: "#1E6E6E" },
};

const MAX_LOGO_BYTES = 1_000_000; // ~1MB source image, before base64 overhead

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const { org, update } = useOrg();

  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [memberTerm, setMemberTerm] = useState("");
  const [householdTerm, setHouseholdTerm] = useState("");
  const [fellowshipTerm, setFellowshipTerm] = useState("");
  const [departmentTerm, setDepartmentTerm] = useState("");
  const [devotionalTerm, setDevotionalTerm] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDataUri, setLogoDataUri] = useState<string | undefined>(undefined);
  const [secondaryCurrency, setSecondaryCurrency] = useState("");
  const [secondaryCurrencyRate, setSecondaryCurrencyRate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTheme, setSavingTheme] = useState<Theme | null>(null);
  const [savingTerms, setSavingTerms] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [termMessage, setTermMessage] = useState<string | null>(null);
  const [savingCurrencyToggle, setSavingCurrencyToggle] = useState(false);
  const [currencyToggleMessage, setCurrencyToggleMessage] = useState<string | null>(null);
  const [currencyToggleError, setCurrencyToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    setDisplayName(org.displayName);
    setCountry(org.country ?? "");
    setCity(org.city ?? "");
    setContactEmail(org.contactEmail ?? "");
    setContactPhone(org.contactPhone ?? "");
    setCurrency(org.currency);
    setMemberTerm(org.memberTerm ?? "");
    setHouseholdTerm(org.householdTerm ?? "");
    setFellowshipTerm(org.fellowshipTerm ?? "");
    setDepartmentTerm(org.departmentTerm ?? "");
    setDevotionalTerm(org.devotionalTerm ?? "");
    setLogoPreview(org.logoUrl);
    setSecondaryCurrency(org.secondaryCurrency ?? "");
    setSecondaryCurrencyRate(org.secondaryCurrencyRate != null ? String(org.secondaryCurrencyRate) : "");
  }, [org]);

  async function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be under 1MB. Try a smaller or more compressed image.");
      return;
    }
    setError(null);
    const dataUri = await fileToDataUri(file);
    setLogoPreview(dataUri);
    setLogoDataUri(dataUri);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSavingProfile(true);
    try {
      await update({
        displayName,
        country: country || undefined,
        city: city || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        currency,
        ...(logoDataUri ? { logoUrl: logoDataUri } : {}),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSubmitTerminology(e: FormEvent) {
    e.preventDefault();
    setTermError(null);
    setTermMessage(null);
    setSavingTerms(true);
    try {
      await update({ memberTerm, householdTerm, fellowshipTerm, departmentTerm, devotionalTerm });
      setTermMessage("Terminology saved.");
    } catch (err) {
      setTermError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSavingTerms(false);
    }
  }

  async function onSubmitCurrencyToggle(e: FormEvent) {
    e.preventDefault();
    setCurrencyToggleError(null);
    setCurrencyToggleMessage(null);
    setSavingCurrencyToggle(true);
    try {
      await update({
        secondaryCurrency,
        secondaryCurrencyRate: secondaryCurrency && secondaryCurrencyRate ? Number(secondaryCurrencyRate) : undefined,
      });
      setCurrencyToggleMessage("Saved.");
    } catch (err) {
      setCurrencyToggleError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSavingCurrencyToggle(false);
    }
  }

  async function onPickTheme(theme: Theme) {
    setSavingTheme(theme);
    setError(null);
    try {
      await update({ theme });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update theme.");
    } finally {
      setSavingTheme(null);
    }
  }

  if (!org) {
    return <div className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading…</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1">Settings</h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        Your church's identity and profile. Visible to everyone in {org.displayName}.
      </p>

      <section
        className="rounded-xl border p-5 mb-6 flex items-center justify-between gap-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <h2 className="text-sm font-medium mb-1">User guide</h2>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            A walkthrough of every role and workflow in Synaxis, with screenshots.
          </p>
        </div>
        <a
          href="/user_guide.pdf"
          download
          className="rounded-md px-4 py-2 text-sm font-medium shrink-0"
          style={{ background: "var(--accent)", color: "white" }}
        >
          Download PDF
        </a>
      </section>

      <section className="rounded-xl border p-5 mb-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <h2 className="text-sm font-medium mb-4">Theme</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(THEME_SWATCHES).map(([value, meta]) => {
            const isActive = org.theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onPickTheme(value as Theme)}
                disabled={savingTheme !== null}
                className="flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 text-xs disabled:opacity-60"
                style={{
                  borderColor: isActive ? meta.color : "var(--line)",
                  borderWidth: isActive ? 2 : 1,
                  background: "var(--surface)",
                }}
              >
                <span
                  className="block rounded-full"
                  style={{ width: 22, height: 22, background: meta.color }}
                />
                <span style={{ color: "var(--ink)" }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--ink-muted)" }}>
          Applies to everyone in your organization immediately.
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border p-5 grid gap-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <h2 className="text-sm font-medium">Church profile</h2>

        <div>
          <label className="block text-sm mb-1">Logo</label>
          <div className="flex items-center gap-4">
            <div
              className="rounded-lg border flex items-center justify-center overflow-hidden shrink-0"
              style={{ width: 64, height: 64, borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  None
                </span>
              )}
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoChange} className="text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Church name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
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
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Kampala"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm mb-1">Contact phone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+256 700 000000"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            {message}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <form
        onSubmit={onSubmitCurrencyToggle}
        className="rounded-xl border p-5 mt-6 grid gap-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <h2 className="text-sm font-medium mb-1">Second currency display</h2>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Optional -- lets finance screens show a second currency alongside {org.currency}, recomputed
            using the rate below. Display-only: nothing is stored in the second currency, and this is
            not historical-rate-aware (a gift recorded a year ago redisplays at today's rate, not the
            rate then). Leave the currency blank to turn it off.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Second currency</label>
            <select
              value={secondaryCurrency}
              onChange={(e) => setSecondaryCurrency(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            >
              <option value="">Off</option>
              {CURRENCIES.filter((c) => c.code !== org.currency).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">
              Rate (1 {org.currency} = ? {secondaryCurrency || "..."})
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              disabled={!secondaryCurrency}
              value={secondaryCurrencyRate}
              onChange={(e) => setSecondaryCurrencyRate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        </div>
        {currencyToggleError && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {currencyToggleError}
          </div>
        )}
        {currencyToggleMessage && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            {currencyToggleMessage}
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={savingCurrencyToggle || (!!secondaryCurrency && !secondaryCurrencyRate)}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {savingCurrencyToggle ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <form
        onSubmit={onSubmitTerminology}
        className="rounded-xl border p-5 mt-6 grid gap-4"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}
      >
        <div>
          <h2 className="text-sm font-medium mb-1">Terminology</h2>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Different churches call these the same thing differently -- rename them here and the
            new word appears in the sidebar and page titles everywhere. Leave blank to use the
            default.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">"Members"</label>
            <input
              value={memberTerm}
              onChange={(e) => setMemberTerm(e.target.value)}
              placeholder="Members"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">"Households"</label>
            <input
              value={householdTerm}
              onChange={(e) => setHouseholdTerm(e.target.value)}
              placeholder="Households"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">"Fellowships"</label>
            <input
              value={fellowshipTerm}
              onChange={(e) => setFellowshipTerm(e.target.value)}
              placeholder="Fellowships / Cell groups"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">"Departments"</label>
            <input
              value={departmentTerm}
              onChange={(e) => setDepartmentTerm(e.target.value)}
              placeholder="Directorates & departments"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">"Daily Devotional"</label>
            <input
              value={devotionalTerm}
              onChange={(e) => setDevotionalTerm(e.target.value)}
              placeholder="Daily Devotional"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--line)" }}
            />
          </div>
        </div>
        {termError && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {termError}
          </div>
        )}
        {termMessage && (
          <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            {termMessage}
          </div>
        )}
        <div>
          <button
            type="submit"
            disabled={savingTerms}
            className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {savingTerms ? "Saving…" : "Save terminology"}
          </button>
        </div>
      </form>
    </div>
  );
}
