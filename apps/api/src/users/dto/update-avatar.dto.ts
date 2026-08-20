import { IsUUID } from "class-validator";

export class UpdateAvatarDto {
  @IsUUID()
  assetId!: string;
}
