import { IsEnum, IsString, MinLength } from "class-validator";
import { TestimonyCategory } from "@life-mmp/shared";

export class CreateTestimonyDto {
  @IsEnum(TestimonyCategory)
  category!: TestimonyCategory;

  @IsString()
  @MinLength(1)
  content!: string;
}
