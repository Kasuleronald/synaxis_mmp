import { IsString, MinLength } from "class-validator";

export class RenameGivingCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
