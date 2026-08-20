import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { PartnerType } from "@life-mmp/shared";

export class CreatePartnerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
