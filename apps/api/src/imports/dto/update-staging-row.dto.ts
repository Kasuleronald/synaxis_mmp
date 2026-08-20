import { IsEnum, IsObject, IsOptional } from "class-validator";
import { ImportRowStatus } from "@life-mmp/shared";

export class UpdateStagingRowDto {
  @IsOptional()
  @IsObject()
  extractedFields?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ImportRowStatus)
  status?: ImportRowStatus;
}
