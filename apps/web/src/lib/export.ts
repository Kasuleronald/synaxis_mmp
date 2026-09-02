import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attendanceRecordIsStudent, type AttendanceRecordDto, type MemberDto, type MemberProfileReportDto } from "@life-mmp/shared";

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
/** `dateLabel` defaults to today (the export itself) -- pass the actual
 * event/session date instead for a report about one specific occurrence
 * (Sep 2026: "events reports must have event dates instead of date of
 * export"), so the header reads as "when this happened," not "when this
 * was downloaded." */
export function addBrandedHeader(doc: jsPDF, orgName: string, title: string, logoDataUri?: string | null, dateLabel?: string) {
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
  doc.text(dateLabel ?? new Date().toLocaleDateString(), textX, 21);
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

const GENDER_EXPORT_LABELS: Record<string, string> = { MALE: "Male", FEMALE: "Female" };
const MARITAL_EXPORT_LABELS: Record<string, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  DIVORCED: "Divorced",
  WIDOWED: "Widowed",
};
const WORKING_STATUS_EXPORT_LABELS: Record<string, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self employed",
  UNEMPLOYED: "Unemployed",
  RETIRED: "Retired",
};

/** Every field the Members table can show (see ALL_COLUMNS in
 * MembersPage.tsx) -- exports aren't tied to whichever columns happen to be
 * toggled on/off on screen, they're the full record every time. */
function toRows(members: MemberDto[]) {
  return members.map((m) => ({
    "Full name": m.fullName,
    Number: m.memberNumber ?? "",
    Phone: m.phone ?? "",
    Email: m.email ?? "",
    Gender: m.gender ? (GENDER_EXPORT_LABELS[m.gender] ?? m.gender) : "",
    Household: m.household?.name ?? "",
    Fellowship: m.fellowship?.name ?? "",
    "Added by": m.createdBy?.fullName ?? "",
    Address: m.address ?? "",
    Nationality: m.nationality ?? "",
    Birthday: birthdayLabel(m),
    "Marital status": m.maritalStatus ? (MARITAL_EXPORT_LABELS[m.maritalStatus] ?? m.maritalStatus) : "",
    "Working status": m.workingStatus ? (WORKING_STATUS_EXPORT_LABELS[m.workingStatus] ?? m.workingStatus) : "",
    Student: m.isStudent ? m.school || "Yes" : "",
    Joined: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "",
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
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [27, 122, 87] },
  });

  addBrandedFooter(doc);
  doc.save(`${orgName.replace(/[^a-z0-9]+/gi, "-")}-members.pdf`);
}

function attendanceRows(records: AttendanceRecordDto[]) {
  return records.map((r, i) => {
    const isStudent = attendanceRecordIsStudent(r);
    return {
      "#": i + 1,
      Name: r.member?.fullName ?? r.visitorName ?? "",
      Phone: r.member?.phone ?? r.visitorPhone ?? "",
      Type: r.memberId ? "Member" : "Walk-in",
      Student: isStudent == null ? "" : isStudent ? "Yes" : "No",
      "Checked in at": new Date(r.checkedInAt).toLocaleString(),
    };
  });
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
  sessionDate?: string,
) {
  const doc = new jsPDF();
  addBrandedHeader(doc, orgName, sessionName, logoDataUri, sessionDate ? new Date(sessionDate).toLocaleDateString() : undefined);

  const rows = attendanceRows(records);
  autoTable(doc, {
    startY: 26,
    head: [Object.keys(rows[0] ?? { "#": "", Name: "" })],
    body: rows.map((r) => Object.values(r)),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 122, 87] },
    columnStyles: { 0: { cellWidth: 10 } },
  });

  addBrandedFooter(doc);
  doc.save(`${sessionName.replace(/[^a-z0-9]+/gi, "-")}-attendance.pdf`);
}

function memberProfilePeriodLabel(profile: MemberProfileReportDto): string {
  if (!profile.from && !profile.to) return "All time";
  const from = profile.from ? new Date(profile.from).toLocaleDateString() : "the beginning";
  const to = profile.to ? new Date(profile.to).toLocaleDateString() : "now";
  return `${from} to ${to}`;
}

/** "Download a member profile" (Sep 2026) -- attendance (present/absent)
 * and giving for a chosen period, in one document instead of two separate
 * report downloads. */
export function exportMemberProfileToPdf(profile: MemberProfileReportDto, orgName: string, logoDataUri?: string | null) {
  const doc = new jsPDF();
  const name = profile.member?.fullName ?? "Member";
  addBrandedHeader(doc, orgName, `${name} -- Profile`, logoDataUri);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Period: ${memberProfilePeriodLabel(profile)}`, 14, 26);
  doc.setTextColor(0);

  doc.setFontSize(11);
  doc.text("Attendance", 14, 34);
  autoTable(doc, {
    startY: 37,
    head: [["#", "Session", "Date", "Status"]],
    body: profile.attendance.lines.length
      ? profile.attendance.lines.map((l, i) => [i + 1, l.sessionName, new Date(l.sessionDate).toLocaleDateString(), l.present ? "Present" : "Absent"])
      : [["", "No sessions in this period", "", ""]],
    foot: [["", `Present: ${profile.attendance.presentCount}`, `Absent: ${profile.attendance.absentCount}`, ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 122, 87] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 10 } },
  });

  // jspdf-autotable attaches this at runtime; not part of jsPDF's own types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterAttendanceY = (doc as any).lastAutoTable.finalY as number;
  doc.setFontSize(11);
  doc.text("Giving", 14, afterAttendanceY + 10);
  autoTable(doc, {
    startY: afterAttendanceY + 13,
    head: [["Date", "Category", "Fund", "Amount", "Running total"]],
    body: profile.giving.lines.length
      ? profile.giving.lines.map((l) => [
          new Date(l.givenAt).toLocaleDateString(),
          l.category?.name ?? "",
          l.fund?.name ?? "Undesignated",
          `${l.currency} ${Number(l.amount).toLocaleString()}`,
          `${l.currency} ${Number(l.runningTotal).toLocaleString()}`,
        ])
      : [["No giving recorded in this period", "", "", "", ""]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 122, 87] },
  });

  addBrandedFooter(doc);
  doc.save(`${name.replace(/[^a-z0-9]+/gi, "-")}-profile.pdf`);
}

export function exportMemberProfileToExcel(profile: MemberProfileReportDto) {
  const name = profile.member?.fullName ?? "Member";
  const wb = XLSX.utils.book_new();

  const attendanceRows = profile.attendance.lines.map((l, i) => ({
    "#": i + 1,
    Session: l.sessionName,
    Date: new Date(l.sessionDate).toLocaleDateString(),
    Status: l.present ? "Present" : "Absent",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows.length ? attendanceRows : [{}]), "Attendance");

  const givingRows = profile.giving.lines.map((l) => ({
    Date: new Date(l.givenAt).toLocaleDateString(),
    Category: l.category?.name ?? "",
    Fund: l.fund?.name ?? "Undesignated",
    Amount: Number(l.amount),
    Currency: l.currency,
    "Running total": l.runningTotal,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(givingRows.length ? givingRows : [{}]), "Giving");

  XLSX.writeFile(wb, `${name.replace(/[^a-z0-9]+/gi, "-")}-profile.xlsx`);
}

/** Generic export for any Analytics report card -- takes whatever row
 * shape that card already has on screen (Aug 2026: "there should be
 * abilities to export all the reports"), so every report gets a download
 * without a bespoke column mapper per report. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportRowsToExcel(rows: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename.replace(/[^a-z0-9]+/gi, "-")}.xlsx`);
}
