import { IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from "class-validator";

export class CreateFellowshipReportDto {
  @IsUUID()
  fellowshipId!: string;

  @IsDateString()
  meetingDate!: string;

  @IsInt()
  @Min(0)
  attendanceCount!: number;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  attendeeMemberIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  givingAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  expensesAmount?: number;

  @IsOptional()
  @IsString()
  expenseNotes?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
