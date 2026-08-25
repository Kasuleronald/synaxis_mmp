/**
 * Confidently parses a date-of-birth string into ISO (YYYY-MM-DD), or
 * returns null when the format is ambiguous/unrecognized -- callers should
 * route null results to the AI normalization pass (gemini.ts) rather than
 * guess (Aug 2026: "the AI should also help reformat the date in case some
 * are in different formats").
 *
 * Handles what real membership spreadsheets actually contain: already-ISO
 * dates, Excel serial numbers (a date-formatted cell read back as a bare
 * number when the source file didn't apply real date formatting), named
 * months in either order ("12 May 1990" / "May 12, 1990" / "12-May-90"),
 * and numeric D/M/Y-style dates. Day-first (D/M/Y) is assumed for a
 * genuinely ambiguous numeric date -- the convention almost everywhere
 * outside the US, and the one this platform's own church contexts use.
 */

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function twoDigitYear(y: number): number {
  const currentTwoDigit = new Date().getFullYear() % 100;
  return y <= currentTwoDigit ? 2000 + y : 1900 + y;
}

function isValidDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toIso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateStringConfidently(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return isValidDate(y, mo, d) ? toIso(y, mo, d) : null;
  }

  // A bare number in a plausible date-serial range -- almost always a cell
  // that was a real date in Excel but had no date number-format applied, so
  // it round-tripped as a plain integer instead of a formatted string.
  if (/^\d{4,6}(\.0+)?$/.test(s)) {
    const serial = Math.round(Number(s));
    if (serial > 1 && serial < 60000) {
      const epoch = Date.UTC(1899, 11, 30);
      const dt = new Date(epoch + serial * 86400000);
      const y = dt.getUTCFullYear();
      if (y > 1900 && y < 2100) return toIso(y, dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    return null;
  }

  // "12 May 1990" / "12-May-90" / "12 May, 1990"
  m = s.match(/^(\d{1,2})[\s-]+([a-zA-Z]+)\.?[\s,-]+(\d{2,4})$/);
  if (m) {
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    if (mo) {
      const d = Number(m[1]);
      const y = m[3].length <= 2 ? twoDigitYear(Number(m[3])) : Number(m[3]);
      return isValidDate(y, mo, d) ? toIso(y, mo, d) : null;
    }
  }

  // "May 12, 1990" / "May 12 1990"
  m = s.match(/^([a-zA-Z]+)\.?\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    if (mo) {
      const d = Number(m[2]);
      const y = m[3].length <= 2 ? twoDigitYear(Number(m[3])) : Number(m[3]);
      return isValidDate(y, mo, d) ? toIso(y, mo, d) : null;
    }
  }

  // Numeric with separators: Y/M/D when the first part is clearly a
  // 4-digit year, otherwise D/M/Y (day-first), falling back to M/D/Y only
  // when the first number can't possibly be a day.
  m = s.match(/^(\d{1,4})[\/.\-](\d{1,2})[\/.\-](\d{1,4})$/);
  if (m) {
    const aStr = m[1], bStr = m[2], cStr = m[3];
    const a = Number(aStr), b = Number(bStr);
    if (aStr.length === 4) {
      const c = Number(cStr);
      return isValidDate(a, b, c) ? toIso(a, b, c) : null;
    }
    const y = cStr.length <= 2 ? twoDigitYear(Number(cStr)) : Number(cStr);
    if (a > 12 && b <= 12) return isValidDate(y, b, a) ? toIso(y, b, a) : null;
    if (a <= 12 && b > 12) return isValidDate(y, a, b) ? toIso(y, a, b) : null;
    if (a <= 12 && b <= 12) return isValidDate(y, b, a) ? toIso(y, b, a) : null;
    return null;
  }

  return null;
}
