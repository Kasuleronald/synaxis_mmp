import { IsUUID } from "class-validator";

export class AddFixedAssetPhotoDto {
  @IsUUID()
  assetId!: string;
}
