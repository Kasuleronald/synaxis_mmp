import { IsArray, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from "class-validator";

export class CreateAccountabilityDto {
  @IsNumber()
  @IsPositive()
  amountSpent!: number;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  receiptAssetIds?: string[];
}
