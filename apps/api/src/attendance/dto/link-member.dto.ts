import { IsUUID } from "class-validator";

/** Links a walk-in's attendance record to the Member just created for them. */
export class LinkMemberDto {
  @IsUUID()
  memberId!: string;
}
