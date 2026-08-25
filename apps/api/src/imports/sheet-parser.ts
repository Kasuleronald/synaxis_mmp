import * as XLSX from "xlsx";

/** Some spreadsheets (re-saved/exported by tools that don't recompute
 * dimensions -- Google Sheets exports, older Excel, third-party writers)
 * carry a `!ref` that undercounts the sheet's real data, and `sheet_to_json`
 * trusts it blindly: a 140-row file with a stale `!ref` claiming only 100
 * rows silently parses as exactly 100, no error, no warning (confirmed:
 * this is a real, reproducible cause of "only some of my rows imported").
 * Recomputing the range from the sheet's own cell keys, rather than trusting
 * the stored one, is cheap and makes this class of truncation impossible. */
function fixStaleRange(sheet: XLSX.WorkSheet): void {
  const keys = Object.keys(sheet).filter((k) => k[0] !== "!");
  if (keys.length === 0) return;
  const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  for (const key of keys) {
    const addr = XLSX.utils.decode_cell(key);
    if (addr.r < range.s.r) range.s.r = addr.r;
    if (addr.c < range.s.c) range.s.c = addr.c;
    if (addr.r > range.e.r) range.e.r = addr.r;
    if (addr.c > range.e.c) range.e.c = addr.c;
  }
  sheet["!ref"] = XLSX.utils.encode_range(range);
}

/** Parses .xlsx/.xls/.csv into row objects keyed by their own header row --
 * xlsx handles all three formats from the same buffer-sniffed entry point.
 *
 * Reads every sheet in the workbook, not just the first -- a membership
 * list split across two tabs (e.g. an update pasted into a second sheet
 * rather than appended to the first) would otherwise silently lose
 * whatever's on the sheets nobody thought to check for. A sheet with no
 * matching name column just contributes zero rows once column-mapping
 * runs, so this is harmless for genuinely single-sheet files too. */
export function parseSheet(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const allHeaders = new Set<string>();
  const allRows: Record<string, string>[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    fixStaleRange(sheet);
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
    for (const row of rows) {
      allRows.push(row);
      for (const key of Object.keys(row)) allHeaders.add(key);
    }
  }
  return { headers: Array.from(allHeaders), rows: allRows };
}
