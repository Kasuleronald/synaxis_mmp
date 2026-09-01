// Shared between apps/api and apps/web so role/theme names can never drift apart.

// Plain const objects, not TS `enum` -- the CommonJS output of a string enum
// assigns its members inside a nested IIFE, which Rollup's CJS interop
// (cjs-module-lexer) can't statically see as a named export. That broke
// `vite build` for apps/web with "Theme is not exported by .../shared/dist"
// even though it worked fine in dev. `as const` compiles to a single
// top-level `exports.Role = {...}` assignment, which is reliably detected.
export const Role = {
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  FINANCE_OFFICER: "FINANCE_OFFICER",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  FELLOWSHIP_LEADER: "FELLOWSHIP_LEADER",
  VOLUNTEER: "VOLUNTEER",
  MEMBER: "MEMBER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// Roles an Org Admin is allowed to hand out. PLATFORM_ADMIN is appointed only
// by another Platform Administrator, never by an org.
export const ORG_ASSIGNABLE_ROLES: Role[] = [
  Role.ORG_ADMIN,
  Role.FINANCE_OFFICER,
  Role.DEPARTMENT_HEAD,
  Role.FELLOWSHIP_LEADER,
  Role.VOLUNTEER,
  Role.MEMBER,
];

export const Theme = {
  ONYX: "ONYX",
  GROWTH: "GROWTH",
  HERITAGE: "HERITAGE",
  EMBER: "EMBER",
  REGAL: "REGAL",
  SLATE: "SLATE",
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export interface OrganizationDto {
  id: string;
  displayName: string;
  slug: string;
  logoUrl: string | null;
  theme: Theme;
  country: string | null;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  currency: string;
  isSuspended: boolean;
  memberTerm: string | null;
  householdTerm: string | null;
  fellowshipTerm: string | null;
  departmentTerm: string | null;
  devotionalTerm: string | null;
  // Display-only currency toggle for finance screens (never touches stored
  // amounts/currency, not historical-rate-aware -- an accepted tradeoff).
  secondaryCurrency: string | null;
  secondaryCurrencyRate: number | null;
  createdAt: string;
}

export interface UpdateOrganizationInput {
  displayName?: string;
  logoUrl?: string | null;
  theme?: Theme;
  country?: string;
  city?: string;
  contactEmail?: string;
  contactPhone?: string;
  currency?: string;
  memberTerm?: string;
  householdTerm?: string;
  fellowshipTerm?: string;
  departmentTerm?: string;
  devotionalTerm?: string;
  secondaryCurrency?: string | null;
  secondaryCurrencyRate?: number | null;
}

// Curated, not exhaustive -- Uganda first, East Africa next, per the roadmap.
// A currency the list doesn't cover can still be set via the API; the picker
// just doesn't offer it yet.
export const CURRENCIES = [
  { code: "UGX", label: "Ugandan Shilling (UGX)" },
  { code: "KES", label: "Kenyan Shilling (KES)" },
  { code: "TZS", label: "Tanzanian Shilling (TZS)" },
  { code: "RWF", label: "Rwandan Franc (RWF)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
] as const;

// East Africa first (the actual near-term market), then a solid spread of
// the rest of the world -- not all ~195 sovereign states, but enough that
// "pick from a list" beats free text for the vast majority of users. Used
// for both the org's own Country setting and a member's nationality.
export const COUNTRIES = [
  { name: "Uganda", dialCode: "+256" },
  { name: "Kenya", dialCode: "+254" },
  { name: "Tanzania", dialCode: "+255" },
  { name: "Rwanda", dialCode: "+250" },
  { name: "Burundi", dialCode: "+257" },
  { name: "South Sudan", dialCode: "+211" },
  { name: "Ethiopia", dialCode: "+251" },
  { name: "Somalia", dialCode: "+252" },
  { name: "Democratic Republic of the Congo", dialCode: "+243" },
  { name: "Nigeria", dialCode: "+234" },
  { name: "Ghana", dialCode: "+233" },
  { name: "South Africa", dialCode: "+27" },
  { name: "Zambia", dialCode: "+260" },
  { name: "Zimbabwe", dialCode: "+263" },
  { name: "Malawi", dialCode: "+265" },
  { name: "Mozambique", dialCode: "+258" },
  { name: "Cameroon", dialCode: "+237" },
  { name: "Ivory Coast", dialCode: "+225" },
  { name: "Senegal", dialCode: "+221" },
  { name: "Egypt", dialCode: "+20" },
  { name: "Morocco", dialCode: "+212" },
  { name: "Algeria", dialCode: "+213" },
  { name: "Sudan", dialCode: "+249" },
  { name: "United States", dialCode: "+1" },
  { name: "Canada", dialCode: "+1" },
  { name: "United Kingdom", dialCode: "+44" },
  { name: "Ireland", dialCode: "+353" },
  { name: "France", dialCode: "+33" },
  { name: "Germany", dialCode: "+49" },
  { name: "Netherlands", dialCode: "+31" },
  { name: "Belgium", dialCode: "+32" },
  { name: "Spain", dialCode: "+34" },
  { name: "Portugal", dialCode: "+351" },
  { name: "Italy", dialCode: "+39" },
  { name: "Switzerland", dialCode: "+41" },
  { name: "Sweden", dialCode: "+46" },
  { name: "Norway", dialCode: "+47" },
  { name: "Denmark", dialCode: "+45" },
  { name: "Finland", dialCode: "+358" },
  { name: "Poland", dialCode: "+48" },
  { name: "Australia", dialCode: "+61" },
  { name: "New Zealand", dialCode: "+64" },
  { name: "India", dialCode: "+91" },
  { name: "Pakistan", dialCode: "+92" },
  { name: "Bangladesh", dialCode: "+880" },
  { name: "China", dialCode: "+86" },
  { name: "Japan", dialCode: "+81" },
  { name: "South Korea", dialCode: "+82" },
  { name: "Philippines", dialCode: "+63" },
  { name: "Indonesia", dialCode: "+62" },
  { name: "Malaysia", dialCode: "+60" },
  { name: "Singapore", dialCode: "+65" },
  { name: "United Arab Emirates", dialCode: "+971" },
  { name: "Saudi Arabia", dialCode: "+966" },
  { name: "Qatar", dialCode: "+974" },
  { name: "Israel", dialCode: "+972" },
  { name: "Turkey", dialCode: "+90" },
  { name: "Brazil", dialCode: "+55" },
  { name: "Mexico", dialCode: "+52" },
  { name: "Jamaica", dialCode: "+1876" },
] as const;

export interface BranchDto {
  id: string;
  organizationId: string;
  name: string;
  isMain: boolean;
  leaderId: string | null;
  leader?: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface UserDto {
  id: string;
  organizationId: string | null;
  branchId: string | null;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  isDeletionApprover: boolean;
  isRegistrationApprover: boolean;
  isFellowshipLeader: boolean;
  isPastor: boolean;
  isFellowshipsDepartmentHead: boolean;
  isDevotionalEditor: boolean;
  avatarAssetId: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  branchId: string | null;
  avatarAssetId: string | null;
  isFellowshipLeader: boolean;
  isPastor: boolean;
  isFellowshipsDepartmentHead: boolean;
  isDevotionalEditor: boolean;
}

// --- Sprint 2: People -------------------------------------------------

export const MemberStatus = {
  VISITOR: "VISITOR",
  NEW_CONVERT: "NEW_CONVERT",
  MEMBER: "MEMBER",
  INACTIVE: "INACTIVE",
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

export const HouseholdRole = {
  HEAD: "HEAD",
  SPOUSE: "SPOUSE",
  CHILD: "CHILD",
  DEPENDENT: "DEPENDENT",
  OTHER: "OTHER",
} as const;
export type HouseholdRole = (typeof HouseholdRole)[keyof typeof HouseholdRole];

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const MaritalStatus = {
  SINGLE: "SINGLE",
  MARRIED: "MARRIED",
  DIVORCED: "DIVORCED",
  WIDOWED: "WIDOWED",
} as const;
export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus];

// Aug 2026 "soul winning" pipeline: a person won in evangelism is tracked
// through these stages until fully integrated -- see SoulWinningRecordDto.
export const SoulWinningStage = {
  WON: "WON",
  ATTENDING_PROGRAMS: "ATTENDING_PROGRAMS",
  VISITED: "VISITED",
  ALLOCATED_TO_FELLOWSHIP: "ALLOCATED_TO_FELLOWSHIP",
  ENROLLED_NEW_BELIEVERS_CLASS: "ENROLLED_NEW_BELIEVERS_CLASS",
  COMPLETED_NEW_BELIEVERS_CLASS: "COMPLETED_NEW_BELIEVERS_CLASS",
} as const;
export type SoulWinningStage = (typeof SoulWinningStage)[keyof typeof SoulWinningStage];

export const SOUL_WINNING_STAGE_LABELS: Record<SoulWinningStage, string> = {
  WON: "Won",
  ATTENDING_PROGRAMS: "Attending church programs",
  VISITED: "Being visited",
  ALLOCATED_TO_FELLOWSHIP: "Allocated to a fellowship/cell",
  ENROLLED_NEW_BELIEVERS_CLASS: "Enrolled in new believers class",
  COMPLETED_NEW_BELIEVERS_CLASS: "Completed new believers class",
};

// The order stages are meant to progress through -- drives "next stage"
// actions in the UI rather than a free jump to any value.
export const SOUL_WINNING_STAGE_ORDER: SoulWinningStage[] = [
  "WON",
  "ATTENDING_PROGRAMS",
  "VISITED",
  "ALLOCATED_TO_FELLOWSHIP",
  "ENROLLED_NEW_BELIEVERS_CLASS",
  "COMPLETED_NEW_BELIEVERS_CLASS",
];

export const WorkingStatus = {
  EMPLOYED: "EMPLOYED",
  SELF_EMPLOYED: "SELF_EMPLOYED",
  UNEMPLOYED: "UNEMPLOYED",
  STUDYING: "STUDYING",
} as const;
export type WorkingStatus = (typeof WorkingStatus)[keyof typeof WorkingStatus];

export const WORKING_STATUS_LABELS: Record<WorkingStatus, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  UNEMPLOYED: "Unemployed",
  STUDYING: "Still studying",
};

export const FollowUpStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type FollowUpStatus = (typeof FollowUpStatus)[keyof typeof FollowUpStatus];

// A member can hold several of these at once -- deliberately separate from
// MemberStatus (visitor/member lifecycle) and from Role (system login
// access), since most leaders here never get a login at all.
export const LeadershipRole = {
  PASTOR: "PASTOR",
  DIRECTORATE_LEADER: "DIRECTORATE_LEADER",
  DEPARTMENT_LEADER: "DEPARTMENT_LEADER",
  FELLOWSHIP_LEADER: "FELLOWSHIP_LEADER",
  BRANCH_LEADER: "BRANCH_LEADER",
} as const;
export type LeadershipRole = (typeof LeadershipRole)[keyof typeof LeadershipRole];

export const LEADERSHIP_ROLE_LABELS: Record<LeadershipRole, string> = {
  PASTOR: "Pastor",
  DIRECTORATE_LEADER: "Directorate leader",
  DEPARTMENT_LEADER: "Department leader",
  FELLOWSHIP_LEADER: "Fellowship leader",
  BRANCH_LEADER: "Branch leader",
};

export interface HouseholdDto {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  head: { id: string; fullName: string } | null;
  createdAt: string;
}

export interface CreateHouseholdInput {
  name: string;
  address?: string;
  headMemberId?: string;
}

export interface UpdateHouseholdInput {
  name?: string;
  address?: string;
  headMemberId?: string;
}

export interface MemberDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  householdId: string | null;
  household?: { id: string; name: string } | null;
  householdRole: HouseholdRole | null;
  fellowshipId: string | null;
  fellowship?: { id: string; name: string } | null;
  orgUnitId: string | null;
  createdById: string | null;
  createdBy?: { id: string; fullName: string } | null;
  fullName: string;
  memberNumber: string | null;
  gender: Gender | null;
  nationality: string | null;
  // Birthday, not birthdate -- birthYear is deliberately separate and
  // optional (Aug 2026 request): plenty of real records only ever had
  // month/day to begin with.
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  maritalStatus: MaritalStatus | null;
  workingStatus: WorkingStatus | null;
  isStudent: boolean | null;
  school: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: MemberStatus;
  leadershipRoles: LeadershipRole[];
  notes: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Tier-1 offline create -- id is client-generated (uuid) so a visitor can
 * be registered with no connectivity and synced idempotently later. */
export interface CreateMemberInput {
  id: string;
  branchId?: string;
  householdId?: string;
  householdRole?: HouseholdRole;
  fellowshipId?: string;
  orgUnitId?: string;
  fullName: string;
  memberNumber?: string;
  gender?: Gender;
  nationality?: string;
  birthMonth?: number;
  birthDay?: number;
  birthYear?: number;
  maritalStatus?: MaritalStatus;
  workingStatus?: WorkingStatus;
  isStudent?: boolean;
  school?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: MemberStatus;
  leadershipRoles?: LeadershipRole[];
  notes?: string;
  // When maritalStatus is MARRIED and the spouse is already a member record
  // in this org, linking them here joins both into a shared Household
  // (creating one if neither has one yet) instead of tracking marriage as
  // its own relationship -- Household/HouseholdRole already model exactly
  // this (Section 5), so spouse-linking reuses it rather than adding a
  // parallel spouseId field.
  spouseMemberId?: string;
}

export interface FollowUpDto {
  id: string;
  organizationId: string;
  memberId: string;
  member?: { id: string; fullName: string; phone: string | null };
  assignedToId: string | null;
  status: FollowUpStatus;
  notes: string | null;
  outcome: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateFollowUpInput {
  id: string;
  memberId: string;
  assignedToId?: string;
  notes?: string;
}

export interface UpdateFollowUpInput {
  status?: FollowUpStatus;
  notes?: string;
  outcome?: string;
  assignedToId?: string;
}

export interface EventDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  debrief?: { id: string } | null;
  // The auto-created attendance session behind this event's public
  // registration link (/checkin/:qrToken) -- always present once created.
  attendanceSessions?: { id: string; qrToken: string }[];
}

export interface CreateEventInput {
  branchId?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
}

/** Filed once an event has actually happened -- a concrete report type of
 * its own, distinct from creating the event, notifying church leadership
 * broadly rather than only the creator. One per event. */
export interface EventDebriefDto {
  id: string;
  organizationId: string;
  eventId: string;
  submittedById: string;
  submittedBy?: { id: string; fullName: string };
  venue: string | null;
  actualAttendance: number | null;
  ministers: string | null;
  strengths: string | null;
  challenges: string | null;
  recommendations: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateDebriefInput {
  venue?: string;
  actualAttendance?: number;
  ministers?: string;
  strengths?: string;
  challenges?: string;
  recommendations?: string;
  notes?: string;
}

export interface AttendanceSessionDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  eventId: string | null;
  classId: string | null;
  name: string;
  date: string;
  qrToken: string;
  checkInCount?: number;
}

export interface CreateAttendanceSessionInput {
  branchId?: string;
  eventId?: string;
  classId?: string;
  name: string;
  date: string;
}

export interface AttendanceRecordDto {
  id: string;
  sessionId: string;
  memberId: string | null;
  member?: { id: string; fullName: string; phone: string | null };
  visitorName: string | null;
  visitorPhone: string | null;
  checkedInAt: string;
}

/** Tier-1 offline create. Exactly one of memberId / visitorName is set. */
export interface CreateAttendanceRecordInput {
  id: string;
  memberId?: string;
  visitorName?: string;
  visitorPhone?: string;
}

// --- Sprint 3: Import Center -------------------------------------------

export const ImportStatus = {
  UPLOADED: "UPLOADED",
  EXTRACTING: "EXTRACTING",
  READY_FOR_REVIEW: "READY_FOR_REVIEW",
  COMMITTED: "COMMITTED",
} as const;
export type ImportStatus = (typeof ImportStatus)[keyof typeof ImportStatus];

export const ImportRowStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMMITTED: "COMMITTED",
} as const;
export type ImportRowStatus = (typeof ImportRowStatus)[keyof typeof ImportRowStatus];

export interface ImportBatchDto {
  id: string;
  organizationId: string;
  filename: string;
  targetEntity: string;
  status: ImportStatus;
  usedAi: boolean;
  createdAt: string;
  rowCount?: number;
  skippedRowCount: number;
}

export interface ImportStagingRowDto {
  id: string;
  importBatchId: string;
  rowIndex: number;
  extractedFields: {
    fullName?: string;
    memberNumber?: string;
    phone?: string;
    email?: string;
    gender?: Gender;
    dateOfBirth?: string;
    address?: string;
    nationality?: string;
    maritalStatus?: MaritalStatus;
    status?: MemberStatus;
  };
  confidence: number | null;
  source: "deterministic" | "ai";
  possibleDuplicateOfId: string | null;
  duplicateOfRowIndex: number | null;
  duplicateReason: string | null;
  status: ImportRowStatus;
}

// --- Sprint 4: Ministry structure ---------------------------------------

export const OrgUnitType = {
  DIRECTORATE: "DIRECTORATE",
  DEPARTMENT: "DEPARTMENT",
} as const;
export type OrgUnitType = (typeof OrgUnitType)[keyof typeof OrgUnitType];

export const EnrollmentStatus = {
  ENROLLED: "ENROLLED",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
} as const;
export type EnrollmentStatus = (typeof EnrollmentStatus)[keyof typeof EnrollmentStatus];

export interface FellowshipDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  leaderId: string | null;
  leader?: { id: string; fullName: string } | null;
  meetingDay: string | null;
  meetingTime: string | null;
  meetingLocation: string | null;
  memberCount?: number;
}

export interface CreateFellowshipInput {
  branchId?: string;
  name: string;
  leaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
}

export interface UpdateFellowshipInput {
  branchId?: string;
  name?: string;
  leaderId?: string;
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
}

export interface OrgUnitDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  parentId: string | null;
  type: OrgUnitType;
  name: string;
  headId: string | null;
  head?: { id: string; fullName: string } | null;
  children?: OrgUnitDto[];
}

export interface UpdateOrgUnitInput {
  name?: string;
  headId?: string;
}

export interface CreateOrgUnitInput {
  branchId?: string;
  parentId?: string;
  type: OrgUnitType;
  name: string;
  headId?: string;
}

export interface DiscipleshipProgramDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  classCount?: number;
}

export interface CreateDiscipleshipProgramInput {
  name: string;
  description?: string;
}

export interface DiscipleshipClassDto {
  id: string;
  organizationId: string;
  programId: string;
  program?: { id: string; name: string };
  branchId: string | null;
  name: string;
  instructorId: string | null;
  startDate: string | null;
  endDate: string | null;
  enrollmentCount?: number;
}

export interface CreateDiscipleshipClassInput {
  programId: string;
  branchId?: string;
  name: string;
  instructorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ClassEnrollmentDto {
  id: string;
  organizationId: string;
  classId: string;
  memberId: string;
  member?: { id: string; fullName: string };
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface CreateEnrollmentInput {
  memberId: string;
}

// --- Deletion approval (maker-checker) ----------------------------------

export const DeletionRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type DeletionRequestStatus = (typeof DeletionRequestStatus)[keyof typeof DeletionRequestStatus];

export interface DeletionRequestDto {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  requestedById: string;
  requestedBy?: { id: string; fullName: string };
  status: DeletionRequestStatus;
  reviewedById: string | null;
  reviewedBy?: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface CreateDeletionRequestInput {
  entityType: string;
  entityId: string;
  entityLabel: string;
}

// --- Sprint 5: Money & reporting ----------------------------------------

export const GivingMethod = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  MOBILE_MONEY: "MOBILE_MONEY",
  CHEQUE: "CHEQUE",
  OTHER: "OTHER",
} as const;
export type GivingMethod = (typeof GivingMethod)[keyof typeof GivingMethod];

export const GIVING_METHOD_LABELS: Record<GivingMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_MONEY: "Mobile money",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export interface GivingCategoryDto {
  id: string;
  organizationId: string;
  parentId: string | null;
  name: string;
  isActive: boolean;
}

export interface CreateGivingCategoryInput {
  name: string;
  parentId?: string;
}

export interface GivingRecordDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  fundId: string | null;
  fund?: { id: string; name: string } | null;
  pledgeId: string | null;
  batchId: string | null;
  memberId: string | null;
  member?: { id: string; fullName: string };
  partnerId: string | null;
  partner?: { id: string; name: string } | null;
  giverName: string | null;
  amount: string;
  currency: string;
  method: GivingMethod;
  providerRef: string | null;
  givenAt: string;
  recordedById: string | null;
  recordedBy?: { id: string; fullName: string };
  notes: string | null;
}

/** Provider-agnostic ledger entry (Section 8): `method` covers cash/bank/
 * mobile money today, `providerRef` is reserved for a MoMo/Airtel driver's
 * transaction id so this same shape carries the fast-follow integration. */
export interface CreateGivingRecordInput {
  branchId?: string;
  categoryId: string;
  fundId?: string;
  pledgeId?: string;
  batchId?: string;
  memberId?: string;
  partnerId?: string;
  giverName?: string;
  amount: number;
  currency?: string;
  method?: GivingMethod;
  givenAt?: string;
  notes?: string;
}

export interface GivingSummaryDto {
  currency: string;
  thisWeekTotal: number;
  thisMonthTotal: number;
  byCategory: { categoryId: string; name: string; total: number }[];
}

// --- Finance expansion: Funds, Vendors, Pledges, Batches -----------------

export interface FundDto {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  targetAmount: string | null;
  deadlineDate: string | null;
  isActive: boolean;
  createdAt: string;
  raisedAmount: number;
}

export interface CreateFundInput {
  name: string;
  description?: string;
  targetAmount?: number;
  deadlineDate?: string;
}

export type UpdateFundInput = Partial<CreateFundInput>;

export interface VendorDto {
  id: string;
  organizationId: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVendorInput {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export type UpdateVendorInput = Partial<CreateVendorInput>;

export const PartnerType = {
  PERSON: "PERSON",
  ORGANIZATION: "ORGANIZATION",
  CHURCH: "CHURCH",
} as const;
export type PartnerType = (typeof PartnerType)[keyof typeof PartnerType];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  PERSON: "Person",
  ORGANIZATION: "Organization",
  CHURCH: "Church",
};

/** An external giver -- not a Member of this church, tracked separately
 * since a Partner never has a household/fellowship/attendance history, only
 * a giving one (GivingRecord.partnerId / Pledge.partnerId). */
export interface PartnerDto {
  id: string;
  organizationId: string;
  name: string;
  type: PartnerType;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePartnerInput {
  name: string;
  type?: PartnerType;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export type UpdatePartnerInput = Partial<CreatePartnerInput>;

export const PledgeFrequency = {
  ONE_TIME: "ONE_TIME",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
} as const;
export type PledgeFrequency = (typeof PledgeFrequency)[keyof typeof PledgeFrequency];

export const PLEDGE_FREQUENCY_LABELS: Record<PledgeFrequency, string> = {
  ONE_TIME: "One-time",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export const PledgeStatus = {
  ACTIVE: "ACTIVE",
  FULFILLED: "FULFILLED",
  ARCHIVED: "ARCHIVED",
} as const;
export type PledgeStatus = (typeof PledgeStatus)[keyof typeof PledgeStatus];

export const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  ACTIVE: "Active",
  FULFILLED: "Fulfilled",
  ARCHIVED: "Archived",
};

/** `fulfilledAmount` is derived server-side (sum of GivingRecords carrying
 * this pledgeId) -- never stored, so it can never drift from actual giving.
 * `status` is the one piece of the lifecycle that IS stored: a background
 * job flips ACTIVE -> FULFILLED once fulfilledAmount meets amount, or
 * ACTIVE -> ARCHIVED once well past endDate unmet -- `reactivatePledge`
 * (giving/pledges/:id/reactivate) is the manual way back to ACTIVE. */
export interface PledgeDto {
  id: string;
  organizationId: string;
  memberId: string | null;
  member?: { id: string; fullName: string } | null;
  partnerId: string | null;
  partner?: { id: string; name: string } | null;
  fundId: string | null;
  fund?: { id: string; name: string } | null;
  amount: string;
  currency: string;
  frequency: PledgeFrequency;
  status: PledgeStatus;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  fulfilledAmount: number;
}

/** Exactly one of memberId/partnerId identifies who's pledging. */
export interface CreatePledgeInput {
  memberId?: string;
  partnerId?: string;
  fundId?: string;
  amount: number;
  currency?: string;
  frequency?: PledgeFrequency;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdatePledgeInput {
  fundId?: string;
  amount?: number;
  frequency?: PledgeFrequency;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export const BatchStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];

/** `actualTotal`/`variance` are derived server-side from the batch's linked
 * GivingRecords, mirroring how Pledge.fulfilledAmount works -- reconciliation
 * numbers are always computed from the ledger, never hand-maintained. */
export interface GivingBatchDto {
  id: string;
  organizationId: string;
  name: string;
  batchDate: string;
  declaredTotal: string | null;
  currency: string;
  status: BatchStatus;
  createdById: string | null;
  createdBy?: { id: string; fullName: string } | null;
  createdAt: string;
  actualTotal: number;
  variance: number | null;
  recordCount: number;
}

export interface CreateGivingBatchInput {
  name: string;
  batchDate: string;
  declaredTotal?: number;
  currency?: string;
}

export interface UpdateGivingBatchInput {
  name?: string;
  batchDate?: string;
  declaredTotal?: number;
}

// --- Sprint 5: In-app notifications --------------------------------------

// --- Fellowship (cell) leader reports -------------------------------------

/** A leader's write-up of one meeting. `financeStatus` reuses
 * DeletionRequestStatus -- the giving side never posts to Giving until an
 * ORG_ADMIN/FINANCE_OFFICER approves (see `givingRecordId`); expenses are
 * captured for visibility only, there's no expense ledger to post into yet. */
export interface FellowshipReportDto {
  id: string;
  organizationId: string;
  fellowshipId: string;
  refNumber: string;
  fellowship?: { id: string; name: string };
  submittedById: string;
  submittedBy?: { id: string; fullName: string };
  meetingDate: string;
  attendanceCount: number;
  notes: string | null;
  attendees: { id: string; member: { id: string; fullName: string } }[];
  givingAmount: string | null;
  expensesAmount: string | null;
  expenseNotes: string | null;
  currency: string | null;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
  financeStatus: DeletionRequestStatus;
  financeReviewedById: string | null;
  financeReviewedBy?: { id: string; fullName: string } | null;
  financeReviewedAt: string | null;
  financeNote: string | null;
  givingRecordId: string | null;
  createdAt: string;
}

export interface CreateFellowshipReportInput {
  fellowshipId: string;
  meetingDate: string;
  attendanceCount: number;
  attendeeMemberIds?: string[];
  notes?: string;
  givingAmount?: number;
  expensesAmount?: number;
  expenseNotes?: string;
  currency?: string;
  categoryId?: string;
}

export interface ApproveFellowshipReportInput {
  categoryId?: string;
  fundId?: string;
  method?: GivingMethod;
  note?: string;
}

export interface RejectFellowshipReportInput {
  note?: string;
}

// --- Reports ---------------------------------------------------------------

export interface MembersOverTimePoint {
  month: string;
  newMembers: number;
  cumulative: number;
}

export interface DemographicsBucket {
  label: string;
  count: number;
}

export interface DemographicsReportDto {
  total: number;
  byGender: DemographicsBucket[];
  byMaritalStatus: DemographicsBucket[];
  byStatus: DemographicsBucket[];
  byAgeGroup: DemographicsBucket[];
}

export interface AttendanceTrendPoint {
  period: string;
  count: number;
}

export interface GivingTrendPoint {
  period: string;
  total: number;
}

export interface GivingCategoryTotal {
  categoryId: string;
  name: string;
  total: number;
}

export interface GivingFundTotal {
  fundId: string | null;
  name: string;
  total: number;
}

export interface StatementLineDto extends GivingRecordDto {
  runningTotal: number;
}

export interface MemberStatementDto {
  member: { id: string; fullName: string } | null;
  lines: StatementLineDto[];
  total: number;
}

export interface FundStatementDto {
  fund: FundDto | null;
  lines: StatementLineDto[];
  total: number;
}

export interface MemberAttendanceLineDto {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  checkedInAt: string;
}

export interface MemberAttendanceDto {
  member: { id: string; fullName: string } | null;
  lines: MemberAttendanceLineDto[];
  totalCheckIns: number;
  firstCheckIn: string | null;
  lastCheckIn: string | null;
}

export interface FellowshipLeaderboardEntryDto {
  leaderId: string;
  leaderName: string;
  fellowships: string[];
  reportsSubmitted: number;
  approved: number;
  rejected: number;
  pending: number;
  averageAttendance: number;
  givingReported: number;
  givingApproved: number;
}

export interface ServiceUnitAttendanceReportRow {
  unitId: string;
  unitName: string;
  total: number;
  present: number;
  absent: number;
}

export interface ServiceUnitAttendanceReportDto {
  session: { id: string; name: string; date: string };
  units: ServiceUnitAttendanceReportRow[];
}

export interface AuditLogEntryDto {
  id: string;
  organizationId: string | null;
  actorId: string | null;
  actorName: string;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  createdAt: string;
}

export interface LoginAuditEntryDto extends AuditLogEntryDto {
  organizationName: string | null;
}

export interface NotificationDto {
  id: string;
  type: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

// --- Communications (in-app announcements) --------------------------------

/** Delivery rides the existing Notification table -- this is the sent-log
 * on top. Reaches logged-in staff Users only; there's no SMS/email/WhatsApp
 * provider configured, so it can't reach the congregation (Members) directly. */
export interface AnnouncementDto {
  id: string;
  organizationId: string;
  senderId: string | null;
  sender?: { id: string; fullName: string } | null;
  message: string;
  link: string | null;
  audienceLabel: string;
  recipientCount: number;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  message: string;
  link?: string;
  targetRole?: Role;
  targetBranchId?: string;
}

// --- Self-registration ---------------------------------------------------

export const RegistrationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export interface PublicOrgInfo {
  id: string;
  displayName: string;
  logoUrl: string | null;
  theme: Theme;
  country: string | null;
}

/** What a visitor with no account submits via /register/:slug -- the same
 * fields as CreateMemberInput minus the admin-assigned ones (status,
 * household, fellowship, discipleship class, leadership). */
export interface SubmitRegistrationInput {
  fullName: string;
  phone?: string;
  email?: string;
  gender?: Gender;
  nationality?: string;
  birthMonth?: number;
  birthDay?: number;
  birthYear?: number;
  maritalStatus?: MaritalStatus;
  isStudent?: boolean;
  school?: string;
  address?: string;
  notes?: string;
}

export interface SelfRegistrationDto {
  id: string;
  organizationId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  gender: Gender | null;
  nationality: string | null;
  birthMonth: number | null;
  birthDay: number | null;
  birthYear: number | null;
  maritalStatus: MaritalStatus | null;
  isStudent: boolean | null;
  school: string | null;
  address: string | null;
  notes: string | null;
  status: RegistrationStatus;
  reviewedById: string | null;
  reviewedBy?: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

// --- Church assets ---------------------------------------------------------

export interface AssetDto {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy?: { id: string; fullName: string } | null;
  createdAt: string;
}

// --- Fixed asset register --------------------------------------------------

export const FixedAssetCategory = {
  LAND: "LAND",
  BUILDING: "BUILDING",
  EQUIPMENT: "EQUIPMENT",
  VEHICLE: "VEHICLE",
  FURNITURE: "FURNITURE",
  OTHER: "OTHER",
} as const;
export type FixedAssetCategory = (typeof FixedAssetCategory)[keyof typeof FixedAssetCategory];

export const FIXED_ASSET_CATEGORY_LABELS: Record<FixedAssetCategory, string> = {
  LAND: "Land",
  BUILDING: "Building",
  EQUIPMENT: "Equipment",
  VEHICLE: "Vehicle",
  FURNITURE: "Furniture",
  OTHER: "Other",
};

export const AssetCondition = {
  EXCELLENT: "EXCELLENT",
  GOOD: "GOOD",
  FAIR: "FAIR",
  POOR: "POOR",
  NEEDS_REPAIR: "NEEDS_REPAIR",
  DISPOSED: "DISPOSED",
} as const;
export type AssetCondition = (typeof AssetCondition)[keyof typeof AssetCondition];

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  NEEDS_REPAIR: "Needs repair",
  DISPOSED: "Disposed",
};

export interface FixedAssetDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  branch?: { id: string; name: string } | null;
  name: string;
  category: FixedAssetCategory;
  description: string | null;
  acquisitionDate: string;
  acquisitionCost: string;
  currency: string;
  depreciationRatePercent: number | null;
  conditionAtAcquisition: AssetCondition;
  currentCondition: AssetCondition;
  currentValue: number;
  createdById: string | null;
  createdAt: string;
  _count?: { conditionRequests: number };
  photos: { id: string; asset: { id: string; name: string; mimeType: string } }[];
}

export interface CreateFixedAssetInput {
  branchId?: string;
  name: string;
  category: FixedAssetCategory;
  description?: string;
  acquisitionDate: string;
  acquisitionCost: number;
  currency?: string;
  depreciationRatePercent?: number;
  conditionAtAcquisition: AssetCondition;
}

export type UpdateFixedAssetInput = Partial<CreateFixedAssetInput>;

export const ConditionRequestStatus = {
  PENDING: "PENDING",
  RESPONDED: "RESPONDED",
} as const;
export type ConditionRequestStatus = (typeof ConditionRequestStatus)[keyof typeof ConditionRequestStatus];

export interface AssetConditionRequestDto {
  id: string;
  organizationId: string;
  fixedAssetId: string;
  fixedAsset?: { id: string; name: string; category: FixedAssetCategory; branch: { id: string; name: string } | null };
  requestedById: string;
  requestedBy?: { id: string; fullName: string };
  message: string | null;
  status: ConditionRequestStatus;
  createdAt: string;
  respondedById: string | null;
  respondedBy?: { id: string; fullName: string } | null;
  responseCondition: AssetCondition | null;
  responseDescription: string | null;
  respondedAt: string | null;
  photos: { id: string; asset: { id: string; name: string; mimeType: string } }[];
}

export interface CreateConditionRequestInput {
  message?: string;
}

export interface RespondConditionRequestInput {
  condition: AssetCondition;
  description: string;
  photoAssetIds?: string[];
}

/** Reuses DeletionRequestStatus -- same PENDING/APPROVED/REJECTED shape,
 * same maker-checker idea, just applied to editing the register instead of
 * removing from it. */
export interface FixedAssetEditRequestDto {
  id: string;
  organizationId: string;
  fixedAssetId: string;
  fixedAsset?: { id: string; name: string; category: FixedAssetCategory; branch: { id: string; name: string } | null };
  requestedById: string;
  requestedBy?: { id: string; fullName: string };
  proposedChanges: Partial<CreateFixedAssetInput>;
  note: string | null;
  status: DeletionRequestStatus;
  reviewedById: string | null;
  reviewedBy?: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export type CreateFixedAssetEditRequestInput = Partial<CreateFixedAssetInput> & { note?: string };

// --- Fund requisition -> accountability (two-phase money-out workflow) ----

export const RequisitionStatus = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type RequisitionStatus = (typeof RequisitionStatus)[keyof typeof RequisitionStatus];

export interface RequisitionReceiptDto {
  id: string;
  asset: { id: string; name: string; mimeType: string };
}

/** Phase 2 -- only ever filed against an already-APPROVED requisition, one
 * per requisition. `status` reuses DeletionRequestStatus, reviewed
 * separately from the requisition itself. */
export interface RequisitionAccountabilityDto {
  id: string;
  organizationId: string;
  requisitionId: string;
  submittedById: string;
  submittedBy?: { id: string; fullName: string };
  amountSpent: string;
  description: string;
  status: DeletionRequestStatus;
  reviewedById: string | null;
  reviewedBy?: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  receipts: RequisitionReceiptDto[];
}

export interface CreateAccountabilityInput {
  amountSpent: number;
  description: string;
  receiptAssetIds?: string[];
}

/** Phase 1 of "money out, then prove how it was spent" -- distinct from a
 * straight Giving/expense entry: a leader asks for funds for a stated
 * reason, finance approves or rejects before anything is disbursed. */
export interface FundRequisitionDto {
  id: string;
  organizationId: string;
  requestedById: string;
  requestedBy?: { id: string; fullName: string };
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  fellowshipId: string | null;
  fellowship?: { id: string; name: string } | null;
  amount: string;
  currency: string;
  reason: string;
  status: RequisitionStatus;
  reviewedById: string | null;
  reviewedBy?: { id: string; fullName: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  accountability?: RequisitionAccountabilityDto | null;
}

export interface CreateRequisitionInput {
  amount: number;
  currency?: string;
  reason: string;
  departmentId?: string;
  fellowshipId?: string;
}

export interface ReviewRequisitionInput {
  note?: string;
}

// --- Testimonies -----------------------------------------------------------

export const TestimonyCategory = {
  SALVATION: "SALVATION",
  HEALING: "HEALING",
  FINANCIAL_BREAKTHROUGH: "FINANCIAL_BREAKTHROUGH",
  EMPLOYMENT: "EMPLOYMENT",
  RESTORATION: "RESTORATION",
  SPIRITUAL_GROWTH: "SPIRITUAL_GROWTH",
  ACADEMIC: "ACADEMIC",
  OTHER: "OTHER",
} as const;
export type TestimonyCategory = (typeof TestimonyCategory)[keyof typeof TestimonyCategory];

export const TESTIMONY_CATEGORY_LABELS: Record<TestimonyCategory, string> = {
  SALVATION: "Salvation",
  HEALING: "Healing",
  FINANCIAL_BREAKTHROUGH: "Financial breakthrough",
  EMPLOYMENT: "Employment",
  RESTORATION: "Restoration",
  SPIRITUAL_GROWTH: "Spiritual growth",
  ACADEMIC: "Academic",
  OTHER: "Other",
};

/** A cheap, high-warmth community feature -- any signed-in user posts a
 * categorized testimony, everyone reads the feed, only an Org Admin can
 * remove one (no edit -- if it's wrong, take it down and repost). */
export interface TestimonyDto {
  id: string;
  organizationId: string;
  submittedById: string;
  submittedBy?: { id: string; fullName: string };
  category: TestimonyCategory;
  content: string;
  createdAt: string;
}

export interface CreateTestimonyInput {
  category: TestimonyCategory;
  content: string;
}

// --- Daily Devotional (Aug 2026) ----------------------------------------

export interface DevotionalDto {
  id: string;
  organizationId: string;
  date: string;
  title: string;
  scripture: string | null;
  body: string;
  authorId: string | null;
  author?: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDevotionalInput {
  date: string;
  title: string;
  scripture?: string;
  body: string;
}

// --- Soul Winning (Aug 2026) ---------------------------------------------

export interface SoulWinningStageChangeDto {
  id: string;
  stage: SoulWinningStage;
  note: string | null;
  changedAt: string;
}

export interface SoulWinningRecordDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  fullName: string;
  phone: string | null;
  address: string | null;
  wonAt: string;
  wonWhere: string | null;
  stage: SoulWinningStage;
  assignedToId: string | null;
  assignedTo?: { id: string; fullName: string } | null;
  fellowshipId: string | null;
  fellowship?: { id: string; name: string } | null;
  classId: string | null;
  class?: { id: string; name: string } | null;
  memberId: string | null;
  member?: { id: string; fullName: string } | null;
  notes: string | null;
  stageHistory: SoulWinningStageChangeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSoulWinningRecordInput {
  branchId?: string;
  fullName: string;
  phone?: string;
  address?: string;
  wonAt?: string;
  wonWhere?: string;
  assignedToId?: string;
  notes?: string;
}

export interface AdvanceSoulWinningStageInput {
  stage: SoulWinningStage;
  note?: string;
  fellowshipId?: string;
  classId?: string;
}

// --- Service Units (Aug 2026) ---------------------------------------------

export interface ServiceUnitDto {
  id: string;
  organizationId: string;
  branchId: string | null;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader?: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
  members?: { id: string; memberId: string; joinedAt: string; member: { id: string; fullName: string; phone: string | null } }[];
}

export interface CreateServiceUnitInput {
  branchId?: string;
  name: string;
  description?: string;
  leaderId?: string;
}

export interface ServiceUnitAttendanceDto {
  unit: { id: string; name: string };
  sessionCount: number;
  members: {
    memberId: string;
    fullName: string;
    totalSessions: number;
    attended: number;
    absent: number;
    rate: number | null;
  }[];
}
