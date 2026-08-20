import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min, MinLength } from "class-validator";
import { AssetCondition, FixedAssetCategory } from "@life-mmp/shared";

export class UpdateFixedAssetDto {
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
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depreciationRatePercent?: number;

  @IsOptional()
  @IsEnum(AssetCondition)
  conditionAtAcquisition?: AssetCondition;
}
