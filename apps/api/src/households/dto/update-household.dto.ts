import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  headMemberId?: string;
}
