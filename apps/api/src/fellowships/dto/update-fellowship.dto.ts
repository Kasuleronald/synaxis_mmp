import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateFellowshipDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;

  @IsOptional()
  @IsString()
  meetingDay?: string;

  @IsOptional()
  @IsString()
  meetingTime?: string;

  @IsOptional()
  @IsString()
  meetingLocation?: string;
}
