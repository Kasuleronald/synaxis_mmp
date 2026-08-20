import { IsOptional, IsString } from "class-validator";

export class CreateConditionRequestDto {
  @IsOptional()
  @IsString()
  message?: string;
}
