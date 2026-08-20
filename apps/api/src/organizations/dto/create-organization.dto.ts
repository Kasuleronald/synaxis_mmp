import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Theme } from "@life-mmp/shared";

class OrgAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: "slug must be lowercase letters, numbers, and hyphens only",
  })
  slug!: string;

  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @ValidateNested()
  @Type(() => OrgAdminDto)
  orgAdmin!: OrgAdminDto;
}
