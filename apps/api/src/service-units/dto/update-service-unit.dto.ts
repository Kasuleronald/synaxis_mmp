import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateServiceUnitDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;
}
