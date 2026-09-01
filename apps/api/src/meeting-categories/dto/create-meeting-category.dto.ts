import { IsString, MinLength } from "class-validator";

export class CreateMeetingCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
