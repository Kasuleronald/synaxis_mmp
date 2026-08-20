import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateDebriefDto {
  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  actualAttendance?: number;

  @IsOptional()
  @IsString()
  ministers?: string;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
