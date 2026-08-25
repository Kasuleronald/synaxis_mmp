import { IsUUID } from "class-validator";

export class AddServiceUnitMemberDto {
  @IsUUID()
  memberId!: string;
}
