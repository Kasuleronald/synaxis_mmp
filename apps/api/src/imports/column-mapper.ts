/**
 * The deterministic pass (Section 7, step 2): recognizes common header
 * variants without an AI call. "Name" / "Full Name" / "Member Name" all map
 * to fullName because they all normalize into (or contain) one of the
 * synonyms below -- this is what handles most real-world spreadsheets,
 * including ones with no relation to any template.
 */

export const MEMBER_TARGET_FIELDS = [
  "fullName",
  "memberNumber",
  "phone",
  "email",
  "gender",
  "dateOfBirth",
  "address",
  "nationality",
  "maritalStatus",
  "status",
] as const;
export type MemberTargetField = (typeof MEMBER_TARGET_FIELDS)[number];

const SYNONYMS: Record<MemberTargetField, string[]> = {
  fullName: ["name", "full name", "member name", "fullname", "names", "full names", "member"],
  memberNumber: ["member number", "member no", "member id", "membership number", "reg number", "registration number", "id number"],
  phone: ["phone", "telephone", "tel", "phone number", "mobile", "mobile number", "contact", "cell", "cell number"],
  email: ["email", "email address", "e mail", "mail"],
  gender: ["gender", "sex"],
  dateOfBirth: ["dob", "date of birth", "birthday", "birth date", "dateofbirth"],
  address: ["address", "location", "residence", "home address", "physical address"],
  nationality: ["nationality", "citizenship", "country", "nation"],
  maritalStatus: ["marital status", "marriage status", "married"],
  status: ["status", "membership status", "member status", "type", "member type"],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance, normalized to a 0..1 similarity score. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const distance = dp[a.length][b.length];
  return 1 - distance / Math.max(a.length, b.length);
}

function scoreHeaderForField(header: string, field: MemberTargetField): number {
  const normHeader = normalize(header);
  let best = 0;
  for (const syn of SYNONYMS[field]) {
    if (normHeader === syn) return 1;
    if (normHeader.includes(syn) || syn.includes(normHeader)) best = Math.max(best, 0.85);
    best = Math.max(best, similarity(normHeader, syn) * 0.9);
  }
  return best;
}

export interface ColumnMapping {
  field: MemberTargetField;
  header: string;
  confidence: number;
}

/** Greedy assignment: highest-confidence (field, header) pairs first, each
 * field and each header used at most once. Threshold below 0.55 is treated
 * as "couldn't confidently map" and left out. */
export function mapColumns(headers: string[]): ColumnMapping[] {
  const candidates: ColumnMapping[] = [];
  for (const header of headers) {
    for (const field of MEMBER_TARGET_FIELDS) {
      const confidence = scoreHeaderForField(header, field);
      if (confidence >= 0.55) candidates.push({ field, header, confidence });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);

  const usedFields = new Set<string>();
  const usedHeaders = new Set<string>();
  const result: ColumnMapping[] = [];
  for (const c of candidates) {
    if (usedFields.has(c.field) || usedHeaders.has(c.header)) continue;
    usedFields.add(c.field);
    usedHeaders.add(c.header);
    result.push(c);
  }
  return result;
}
