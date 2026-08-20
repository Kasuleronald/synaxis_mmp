import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";
import { GivingMethod } from "@life-mmp/shared";

/** Provider-agnostic ledger entry (Section 8): `method` covers cash/bank/
 * mobile money today; a MoMo/Airtel driver fast-follows on this same shape,
 * so giving's data model never has to change when it lands. */
export class CreateGivingRecordDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  fundId?: string;

  @IsOptional()
  @IsUUID()
  pledgeId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsString()
  giverName?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(GivingMethod)
  method?: GivingMethod;

  @IsOptional()
  @IsDateString()
  givenAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
