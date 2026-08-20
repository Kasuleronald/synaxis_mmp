import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { FollowUpStatus } from "@life-mmp/shared";

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
