import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class UpsertDevotionalDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  scripture?: string;

  @IsString()
  @MinLength(1)
  body!: string;
}
