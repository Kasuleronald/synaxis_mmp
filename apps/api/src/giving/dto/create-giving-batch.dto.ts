import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class CreateGivingBatchDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  batchDate!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  declaredTotal?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
