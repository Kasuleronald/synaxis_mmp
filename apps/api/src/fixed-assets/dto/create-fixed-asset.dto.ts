import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, Min, MinLength } from "class-validator";
import { AssetCondition, FixedAssetCategory } from "@life-mmp/shared";

export class CreateFixedAssetDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(FixedAssetCategory)
  category!: FixedAssetCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  acquisitionDate!: string;

  @IsNumber()
  @IsPositive()
  acquisitionCost!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depreciationRatePercent?: number;

  @IsEnum(AssetCondition)
  conditionAtAcquisition!: AssetCondition;
}
