import * as XLSX from "xlsx";

/** Parses .xlsx/.xls/.csv into row objects keyed by their own header row --
 * xlsx handles all three formats from the same buffer-sniffed entry point. */
export function parseSheet(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}
