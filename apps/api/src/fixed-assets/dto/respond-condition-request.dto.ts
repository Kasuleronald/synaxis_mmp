import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { AssetCondition } from "@life-mmp/shared";

export class RespondConditionRequestDto {
  @IsEnum(AssetCondition)
  condition!: AssetCondition;

  @IsString()
  @MinLength(1)
  description!: string;

  /** Ids of Assets (blobs) already uploaded via POST /assets -- photos are
   * uploaded first, then attached here by id, same two-step flow as any
   * other file reference in this app. */
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  photoAssetIds?: string[];
}
