import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { Role } from "@life-mmp/shared";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
