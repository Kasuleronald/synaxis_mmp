import { IsOptional, IsString } from "class-validator";

export class RejectFellowshipReportDto {
  @IsOptional()
  @IsString()
  note?: string;
}
