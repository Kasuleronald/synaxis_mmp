import { IsBoolean, IsOptional } from "class-validator";

export class UpdateUserDto {
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
  isActive?: boolean;
}
