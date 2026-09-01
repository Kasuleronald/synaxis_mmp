import { IsString, MinLength } from "class-validator";

export class RecordExportDto {
  @IsString()
  @MinLength(1)
  label!: string;
}
