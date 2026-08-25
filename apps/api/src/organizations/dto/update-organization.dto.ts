import { IsEmail, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Theme } from "@life-mmp/shared";

// Logos are stored as base64 data URIs directly on the row until real object
// storage exists (Section 3 of the blueprint defers that). ~1.4MB of base64
// is roughly a 1MB source image -- plenty for a church logo, small enough to
// not turn the organizations table into a file store.
const MAX_LOGO_DATA_URI_LENGTH = 1_400_000;

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @IsOptional()
  @Matches(/^data:image\/(png|jpeg|jpg|webp);base64,/, {
    message: "logoUrl must be a base64 data URI (png/jpeg/webp)",
  })
  @MaxLength(MAX_LOGO_DATA_URI_LENGTH, { message: "Logo image is too large" })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  householdTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fellowshipTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  departmentTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  devotionalTerm?: string;

  // Display-only currency toggle for finance screens -- never touches
  // stored amounts/currency, not historical-rate-aware (an accepted,
  // documented tradeoff). An empty string clears it back to "off".
  @IsOptional()
  @IsString()
  @MaxLength(10)
  secondaryCurrency?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  secondaryCurrencyRate?: number;
}
