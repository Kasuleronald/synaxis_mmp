import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { ORG_ASSIGNABLE_ROLES } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  branchId: true,
  isActive: true,
  isDeletionApprover: true,
  isRegistrationApprover: true,
  isFellowshipLeader: true,
  isPastor: true,
  isFellowshipsDepartmentHead: true,
  isDevotionalEditor: true,
  avatarAssetId: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateUserDto) {
    if (!ctx.organizationId) {
      throw new ForbiddenException("Only an organization member can invite staff");
    }
    if (!ORG_ASSIGNABLE_ROLES.includes(dto.role)) {
      // Belt-and-braces: an Org Admin can hand out any role except
      // PLATFORM_ADMIN, which class-validator's @IsEnum already lets
      // through since it's a valid Role -- this is the check that actually
      // excludes it.
      throw new BadRequestException(`Organizations cannot assign the ${dto.role} role`);
    }

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);

    return runWithTenant(this.prisma, ctx, async (tx) => {
      if (dto.branchId) {
        const branch = await tx.branch.findUnique({ where: { id: dto.branchId } });
        if (!branch) throw new BadRequestException("branchId does not belong to your organization");
      }
      const existingEmail = await tx.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (existingEmail) {
        throw new ConflictException(`${dto.email} is already registered to an account`);
      }
      return tx.user.create({
        data: {
          organizationId: ctx.organizationId as string,
          branchId: dto.branchId,
          email: dto.email.toLowerCase(),
          fullName: dto.fullName,
          passwordHash,
          role: dto.role,
        },
        select: USER_SELECT,
      });
    });
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.user.findMany({ orderBy: { createdAt: "asc" }, select: USER_SELECT }),
    );
  }

  /** Org Admin appoints/revokes deletion approvers here (Staff screen). */
  async update(ctx: TenantContext, id: string, dto: UpdateUserDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.user.update({ where: { id }, data: dto, select: USER_SELECT }),
    );
  }

  /** Self-service, unlike `update` above -- any logged-in user can set their
   * own profile photo, not just an Org Admin acting on someone else. `ctx`
   * still scopes the update to the caller's own org via RLS; `id` is always
   * the caller's own id, passed in by the controller from the session. */
  async setAvatar(ctx: TenantContext, id: string, assetId: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.user.update({ where: { id }, data: { avatarAssetId: assetId }, select: USER_SELECT }),
    );
  }

  async clearAvatar(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.user.update({ where: { id }, data: { avatarAssetId: null }, select: USER_SELECT }),
    );
  }
}
