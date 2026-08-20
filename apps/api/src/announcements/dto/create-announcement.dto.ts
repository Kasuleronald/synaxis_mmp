import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { Role } from "@life-mmp/shared";

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;

  @IsOptional()
  @IsUUID()
  targetBranchId?: string;
}
