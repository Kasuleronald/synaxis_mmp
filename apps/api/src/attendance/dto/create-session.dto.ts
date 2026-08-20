import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateAttendanceSessionDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  date!: string;
}
