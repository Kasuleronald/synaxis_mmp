import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { OrgUnitType } from "@life-mmp/shared";

export class CreateOrgUnitDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsEnum(OrgUnitType)
  type!: OrgUnitType;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsUUID()
  headId?: string;
}
