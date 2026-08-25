import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateServiceUnitDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string;
}
