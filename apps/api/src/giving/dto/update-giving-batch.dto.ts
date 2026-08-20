import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class UpdateGivingBatchDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  batchDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  declaredTotal?: number;
}
