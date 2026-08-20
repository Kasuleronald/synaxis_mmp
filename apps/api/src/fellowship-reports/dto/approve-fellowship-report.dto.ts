import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { GivingMethod } from "@life-mmp/shared";

/** Finance confirms (or overrides) how the giving side should be
 * categorized before it's posted -- the leader's own suggestion, if any, is
 * just a starting point, never binding. Only required when the report
 * actually carries a givingAmount. */
export class ApproveFellowshipReportDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  fundId?: string;

  @IsOptional()
  @IsEnum(GivingMethod)
  method?: GivingMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
