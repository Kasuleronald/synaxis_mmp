import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";
import { Role } from "@life-mmp/shared";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // Nullable, not just optional -- a mistakenly-assigned branch needs to be
  // reassignable (Aug 2026: "attached to a wrong/empty branch"), and "no
  // branch" is itself a valid target, not only "leave it as-is".
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  isDeletionApprover?: boolean;

  @IsOptional()
  @IsBoolean()
  isRegistrationApprover?: boolean;

  @IsOptional()
  @IsBoolean()
  isFellowshipLeader?: boolean;

  @IsOptional()
  @IsBoolean()
  isPastor?: boolean;

  @IsOptional()
  @IsBoolean()
  isFellowshipsDepartmentHead?: boolean;

  @IsOptional()
  @IsBoolean()
  isDevotionalEditor?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultFollowUpUser?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
