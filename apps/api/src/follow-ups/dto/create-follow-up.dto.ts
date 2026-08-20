import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateFollowUpDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  memberId!: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
