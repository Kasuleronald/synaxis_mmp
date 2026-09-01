import { Type } from "class-transformer";
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from "class-validator";
import { RECURRENCE_FREQUENCIES, RecurrenceFrequency } from "@life-mmp/shared";

class RecurrenceDto {
  @IsIn(RECURRENCE_FREQUENCIES)
  frequency!: RecurrenceFrequency;

  @IsDateString()
  until!: string;
}

export class CreateEventDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
