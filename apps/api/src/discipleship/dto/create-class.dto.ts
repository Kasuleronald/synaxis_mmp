import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateClassDto {
  @IsUUID()
  programId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
