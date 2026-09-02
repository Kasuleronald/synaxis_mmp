import { IsDateString, IsOptional } from "class-validator";

/** A malformed from/to used to reach `memberProfile` as a bare string with
 * no validation at all -- an invalid Date silently became NaN once it hit
 * Prisma, which could fail the whole query unpredictably (Sep 2026: "the
 * download of member profile at times fails"). Validating here means a bad
 * value is rejected with a clear 400 instead. */
export class MemberProfileQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
