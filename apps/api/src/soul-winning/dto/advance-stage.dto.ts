import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { SoulWinningStage } from "@life-mmp/shared";

export class AdvanceStageDto {
  @IsEnum(SoulWinningStage)
  stage!: SoulWinningStage;

  @IsOptional()
  @IsString()
  note?: string;

  // Set when moving into ALLOCATED_TO_FELLOWSHIP.
  @IsOptional()
  @IsUUID()
  fellowshipId?: string;

  // Set when moving into ENROLLED_NEW_BELIEVERS_CLASS.
  @IsOptional()
  @IsUUID()
  classId?: string;
}
