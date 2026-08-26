import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";
import { PledgeFrequency } from "@life-mmp/shared";

/** Who's pledging (member/partner) is deliberately not editable here --
 * that's a different pledge, not a correction to this one. Everything
 * about the commitment itself (amount, fund, cadence, dates, notes) is. */
export class UpdatePledgeDto {
  @IsOptional()
  @IsUUID()
  fundId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsEnum(PledgeFrequency)
  frequency?: PledgeFrequency;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
