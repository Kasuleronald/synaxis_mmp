import { IsUUID } from "class-validator";

export class LinkMemberDto {
  @IsUUID()
  memberId!: string;
}
