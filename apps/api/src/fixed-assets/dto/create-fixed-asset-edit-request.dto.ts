import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min, MinLength } from "class-validator";
import { AssetCondition, FixedAssetCategory } from "@life-mmp/shared";

/** The proposed changes, one field per editable column on FixedAsset --
 * stored verbatim as JSON on the request row and only ever applied to the
 * real asset once an approver confirms it (fixed-assets.service.ts's
 * `update()`), never on submission. */
export class CreateFixedAssetEditRequestDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(FixedAssetCategory)
  category?: FixedAssetCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  acquisitionCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depreciationRatePercent?: number;

  @IsOptional()
  @IsEnum(AssetCondition)
  conditionAtAcquisition?: AssetCondition;

  @IsOptional()
  @IsString()
  note?: string;
}
