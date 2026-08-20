import { IsOptional, IsString } from "class-validator";

export class ReviewRequisitionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
