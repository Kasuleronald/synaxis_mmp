import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { Gender, HouseholdRole, LeadershipRole, MaritalStatus, MemberStatus, WorkingStatus } from "@life-mmp/shared";

export class UpdateMemberDto {
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

  @IsOptional()
  @IsString()
  fullName?: string;

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

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

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
  @IsUUID()
  spouseMemberId?: string;
}
