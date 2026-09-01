import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength, ValidateIf, ValidateNested } from "class-validator";
import { RECURRENCE_FREQUENCIES, RecurrenceFrequency, WEEKDAY_ORDINALS, WeekdayOrdinal } from "@life-mmp/shared";

class RecurrenceDto {
  @IsIn(RECURRENCE_FREQUENCIES)
  frequency!: RecurrenceFrequency;

  @IsDateString()
  until!: string;

  // Both required only for MONTHLY_WEEKDAY -- a plain DAILY/WEEKLY/MONTHLY
  // recurrence never sets these.
  @ValidateIf((o) => o.frequency === "MONTHLY_WEEKDAY")
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @ValidateIf((o) => o.frequency === "MONTHLY_WEEKDAY")
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(WEEKDAY_ORDINALS, { each: true })
  ordinals?: WeekdayOrdinal[];
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
