/**
 * Gemini extraction (Section 7, step 3): only reached for PDFs, or
 * spreadsheets whose headers didn't map deterministically. Structured
 * output (responseSchema) is used specifically so the model can't wander
 * off-format -- the response is already the JSON shape we need, not prose
 * to regex out of.
 */

export interface GeminiExtractedRow {
  fullName?: string;
  phone?: string;
  email?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  address?: string;
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
          phone: { type: "string" },
          email: { type: "string" },
          gender: { type: "string", enum: ["MALE", "FEMALE"] },
          dateOfBirth: { type: "string", description: "ISO 8601 date, YYYY-MM-DD, if determinable" },
          address: { type: "string" },
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
