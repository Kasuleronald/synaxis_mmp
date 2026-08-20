import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class UpdateOrgUnitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  headId?: string;
}
