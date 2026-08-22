import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @IsOptional()
  @IsUUID()
  leaderId?: string;
}
