import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";
import { PledgeFrequency } from "@life-mmp/shared";

/** Exactly one of memberId/partnerId identifies who's pledging -- validated
 * in the service, not here, since class-validator doesn't have a clean
 * built-in "exactly one of" check across two optional fields. */
export class CreatePledgeDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @IsOptional()
  @IsUUID()
  fundId?: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PledgeFrequency)
  frequency?: PledgeFrequency;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
