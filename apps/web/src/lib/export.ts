import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AttendanceRecordDto, MemberDto } from "@life-mmp/shared";

const FOOTER_TEXT = "Extracted from Synaxis - Ministry Management Platform";

function detectImageFormat(dataUri: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUri.startsWith("data:image/png")) return "PNG";
  if (dataUri.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

/** Every PDF export in the app should call this right after creating the
 * doc and again (via `addBrandedFooter`) right before saving -- the church
 * logo top-left with the ministry name, and the platform footer on every
 * page, so exports read as coming from this system wherever they end up. */
export function addBrandedHeader(doc: jsPDF, orgName: string, title: string, logoDataUri?: string | null) {
  let textX = 14;
  if (logoDataUri) {
    try {
      doc.addImage(logoDataUri, detectImageFormat(logoDataUri), 14, 8, 12, 12);
      textX = 30;
    } catch {
      // Unsupported/corrupt image data -- fall back to a text-only header
      // rather than failing the whole export.
    }
  }
  doc.setFontSize(14);
  doc.text(`${orgName} -- ${title}`, textX, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleDateString(), textX, 21);
  doc.setTextColor(0);
}

export function addBrandedFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(FOOTER_TEXT, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.setTextColor(0);
  }
}

function birthdayLabel(m: MemberDto): string {
  if (!m.birthMonth) return "";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = [MONTHS[m.birthMonth - 1], m.birthDay ?? ""].filter(Boolean).join(" ");
  return m.birthYear ? `${parts}, ${m.birthYear}` : parts;
}

function toRows(members: MemberDto[]) {
  return members.map((m) => ({
    "Full name": m.fullName,
    Phone: m.phone ?? "",
    Email: m.email ?? "",
    Nationality: m.nationality ?? "",
    Birthday: birthdayLabel(m),
    "Marital status": m.maritalStatus ?? "",
    Student: m.isStudent ? m.school || "Yes" : "",
    Status: m.status,
  }));
}

export function exportMembersToExcel(members: MemberDto[], orgName: string) {
  const rows = toRows(members);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, `${orgName.replace(/[^a-z0-9]+/gi, "-")}-members.xlsx`);
}

export function exportMembersToPdf(members: MemberDto[], orgName: string, logoDataUri?: string | null) {
  const doc = new jsPDF({ orientation: "landscape" });
  addBrandedHeader(doc, orgName, "Members", logoDataUri);

  const rows = toRows(members);
  autoTable(doc, {
    startY: 26,
    head: [Object.keys(rows[0] ?? { "Full name": "" })],
    body: rows.map((r) => Object.values(r)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 122, 87] },
  });

  addBrandedFooter(doc);
  doc.save(`${orgName.replace(/[^a-z0-9]+/gi, "-")}-members.pdf`);
}

function attendanceRows(records: AttendanceRecordDto[]) {
  return records.map((r) => ({
    Name: r.member?.fullName ?? r.visitorName ?? "",
    Phone: r.member?.phone ?? r.visitorPhone ?? "",
    Type: r.memberId ? "Member" : "Walk-in",
    "Checked in at": new Date(r.checkedInAt).toLocaleString(),
  }));
}

export function exportAttendanceToExcel(records: AttendanceRecordDto[], orgName: string, sessionName: string) {
  const rows = attendanceRows(records);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `${sessionName.replace(/[^a-z0-9]+/gi, "-")}-attendance.xlsx`);
}

export function exportAttendanceToPdf(
  records: AttendanceRecordDto[],
  orgName: string,
  sessionName: string,
  logoDataUri?: string | null,
) {
  const doc = new jsPDF();
  addBrandedHeader(doc, orgName, sessionName, logoDataUri);

  const rows = attendanceRows(records);
  autoTable(doc, {
    startY: 26,
    head: [Object.keys(rows[0] ?? { Name: "" })],
    body: rows.map((r) => Object.values(r)),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 122, 87] },
  });

  addBrandedFooter(doc);
  doc.save(`${sessionName.replace(/[^a-z0-9]+/gi, "-")}-attendance.pdf`);
}
