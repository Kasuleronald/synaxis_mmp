import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateGivingCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
