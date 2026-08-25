import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { Gender, HouseholdRole, LeadershipRole, MaritalStatus, MemberStatus, WorkingStatus } from "@life-mmp/shared";

export class CreateMemberDto {
  // Client-generated (uuid v4) so a visitor can be registered offline and
  // sync later -- the server upserts by this id, making a retried sync
  // batch safe to replay (Section 7/10).
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  householdId?: string;

  @IsOptional()
  @IsEnum(HouseholdRole)
  householdRole?: HouseholdRole;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  memberNumber?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  birthDay?: number;

  // Optional on purpose (Aug 2026 request) -- month/day are often the only
  // part of a birthday anyone actually recorded.
  @IsOptional()
  @IsInt()
  @Min(1900)
  birthYear?: number;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsEnum(WorkingStatus)
  workingStatus?: WorkingStatus;

  @IsOptional()
  @IsBoolean()
  isStudent?: boolean;

  @IsOptional()
  @IsString()
  school?: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(1)
  address!: string;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(LeadershipRole, { each: true })
  leadershipRoles?: LeadershipRole[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsUUID()
  spouseMemberId?: string;
}
