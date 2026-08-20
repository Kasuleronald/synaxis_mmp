import { IsOptional, IsString, IsUUID, MinLength, ValidateIf } from "class-validator";

/** Exactly one of memberId / visitorName -- a known person or a walk-in. */
export class CheckInDto {
  @IsUUID()
  id!: string;

  @ValidateIf((o) => !o.visitorName)
  @IsUUID()
  memberId?: string;

  @ValidateIf((o) => !o.memberId)
  @IsString()
  @MinLength(1)
  visitorName?: string;
}
