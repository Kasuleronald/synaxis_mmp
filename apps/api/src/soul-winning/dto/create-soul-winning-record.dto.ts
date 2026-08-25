import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateSoulWinningRecordDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MinLength(1)
  fullName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  wonAt?: string;

  @IsOptional()
  @IsString()
  wonWhere?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
