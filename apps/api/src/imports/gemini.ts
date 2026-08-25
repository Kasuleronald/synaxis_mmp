/**
 * Gemini extraction (Section 7, step 3): only reached for PDFs, or
 * spreadsheets whose headers didn't map deterministically. Structured
 * output (responseSchema) is used specifically so the model can't wander
 * off-format -- the response is already the JSON shape we need, not prose
 * to regex out of.
 */

export interface GeminiExtractedRow {
  fullName?: string;
  memberNumber?: string;
  phone?: string;
  email?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  address?: string;
  nationality?: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  status?: "VISITOR" | "NEW_CONVERT" | "MEMBER" | "INACTIVE";
  confidence?: number;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          memberNumber: { type: "string", description: "An existing member/registration number, only if the document already assigns one" },
          phone: { type: "string" },
          email: { type: "string" },
          gender: { type: "string", enum: ["MALE", "FEMALE"] },
          dateOfBirth: { type: "string", description: "ISO 8601 date, YYYY-MM-DD, if determinable" },
          address: { type: "string" },
          nationality: { type: "string" },
          maritalStatus: { type: "string", enum: ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"] },
          status: { type: "string", enum: ["VISITOR", "NEW_CONVERT", "MEMBER", "INACTIVE"], description: "Default to MEMBER if the document doesn't distinguish visitors from members" },
          confidence: { type: "number", description: "0 to 1, your confidence this row was read correctly" },
        },
        required: ["fullName"],
      },
    },
  },
  required: ["rows"],
};

export class GeminiUnavailableError extends Error {}

export async function extractMembersWithGemini(text: string): Promise<GeminiExtractedRow[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiUnavailableError(
      "No Gemini API key configured -- add GEMINI_API_KEY to apps/api/.env to enable AI extraction.",
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = `You are extracting church membership records from a document. Read the text below (it may be a register, a list, or a table that didn't parse cleanly as a spreadsheet) and return every person you can find as a row. Only include fullName as required; leave other fields out if you can't determine them confidently, and set confidence per row accordingly.\n\n---\n${text.slice(0, 60_000)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("Gemini returned no extractable content");

  const parsed = JSON.parse(jsonText);
  return Array.isArray(parsed.rows) ? parsed.rows : [];
}

export interface DuplicateGroup {
  /** rowIndex values (0-based, matching ImportStagingRow.rowIndex) of rows
   * the model believes are the same person. */
  rowIndexes: number[];
  reason: string;
}

const DUPLICATES_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    groups: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rowIndexes: { type: "array", items: { type: "integer" } },
          reason: { type: "string", description: "Short reason these rows look like the same person" },
        },
        required: ["rowIndexes", "reason"],
      },
    },
  },
  required: ["groups"],
};

/** Aug 2026: exact-name matching alone missed same-file duplicates spelled
 * differently (typos, initials, reordered names, honorifics). This is a
 * second pass over the same batch's candidate rows specifically for that --
 * best-effort, never blocks a commit if it fails or isn't configured. */
export async function findDuplicatesWithGemini(
  rows: { rowIndex: number; fullName: string; phone?: string }[],
): Promise<DuplicateGroup[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || rows.length < 2) return [];

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const listing = rows.map((r) => `${r.rowIndex}: ${r.fullName}${r.phone ? ` (${r.phone})` : ""}`).join("\n");
  const prompt = `Below is a numbered list of names (with phone numbers where known) extracted from one church membership spreadsheet. Some names may refer to the same real person written differently -- typos, missing/extra initials, reordered names, nicknames, or honorifics (Mr./Mrs./Pastor). Two rows sharing a phone number are almost certainly the same person even if the names differ more. Group only rows you're confident are the same person; a name that's merely similar to another (e.g. two different siblings/relatives) is NOT a duplicate. Do not invent row numbers -- only use the numbers given. If nothing looks like a duplicate, return an empty groups array.\n\n${listing}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: DUPLICATES_RESPONSE_SCHEMA },
      }),
    },
  );
  if (!res.ok) return [];

  const data = await res.json().catch(() => null);
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) return [];

  try {
    const parsed = JSON.parse(jsonText);
    const validIndexes = new Set(rows.map((r) => r.rowIndex));
    return Array.isArray(parsed.groups)
      ? parsed.groups
          .map((g: any) => ({
            rowIndexes: Array.isArray(g.rowIndexes) ? g.rowIndexes.filter((i: unknown) => typeof i === "number" && validIndexes.has(i)) : [],
            reason: typeof g.reason === "string" ? g.reason : "Likely the same person",
          }))
          .filter((g: DuplicateGroup) => g.rowIndexes.length >= 2)
      : [];
  } catch {
    return [];
  }
}
