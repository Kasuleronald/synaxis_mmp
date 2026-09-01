import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Role } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { AuthService } from "../auth/auth.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Platform Admin action: creates the tenant and appoints its first Org
   * Admin in one transaction. Both rows are written under the platform
   * admin's bypass tenant context (Section 6) -- the only place that bypass
   * is exercised on a *write*, and only for the organization/user identity
   * rows themselves, never for any ministry-data table.
   */
  async createOrganization(ctx: TenantContext, dto: CreateOrganizationDto) {
    const passwordHash = await bcrypt.hash(dto.orgAdmin.password, 12);

    return runWithTenant(this.prisma, ctx, async (tx) => {
      const existing = await tx.organization.findUnique({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
      }

      const organization = await tx.organization.create({
        data: {
          displayName: dto.displayName,
          slug: dto.slug,
          theme: dto.theme,
        },
      });

      const existingEmail = await tx.user.findUnique({ where: { email: dto.orgAdmin.email.toLowerCase() } });
      if (existingEmail) {
        throw new ConflictException(`${dto.orgAdmin.email} is already registered to an account`);
      }

      const orgAdmin = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.orgAdmin.email.toLowerCase(),
          fullName: dto.orgAdmin.fullName,
          passwordHash,
          role: Role.ORG_ADMIN,
          // Same "first login forces a real password" policy as a staff
          // invite (Sep 2026) -- only the Platform Admin who just typed
          // this temporary password in sees it.
          mustChangePassword: true,
        },
      });

      return { organization, orgAdmin: { id: orgAdmin.id, email: orgAdmin.email, fullName: orgAdmin.fullName } };
    });
  }

  async listOrganizations(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.organization.findMany({ orderBy: { createdAt: "desc" } }),
    );
  }

  async getOrganization(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.organization.findUnique({ where: { id } }));
  }

  /**
   * Settings screen (an Org Admin editing their own org) or Platform
   * Administration (editing any org's basic identity -- name/theme, the
   * provisioning-level fields, never the tenant data the org itself owns).
   * The ownership check only applies to the former; a Platform Admin's
   * bypass is already what current_org_id/is_platform_admin means for this
   * identity table.
   */
  async updateOrganization(ctx: TenantContext, id: string, dto: UpdateOrganizationDto) {
    if (!ctx.isPlatformAdmin && ctx.organizationId !== id) {
      throw new ForbiddenException("You can only edit your own organization");
    }
    // An empty string is how the Settings screen says "turn the secondary
    // currency toggle off" -- Prisma would otherwise happily store "" as a
    // real currency code.
    const data = {
      ...dto,
      secondaryCurrency: dto.secondaryCurrency === "" ? null : dto.secondaryCurrency,
    };
    return runWithTenant(this.prisma, ctx, (tx) => tx.organization.update({ where: { id }, data }));
  }

  /** Platform Admin only -- separate from updateOrganization, which is
   * scoped to an Org Admin editing their own org's settings. Suspension is
   * a platform-level judgment call, not tenant data. */
  async setSuspended(ctx: TenantContext, id: string, isSuspended: boolean) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.organization.update({ where: { id }, data: { isSuspended } }));
  }

  /** Platform Admin only. Targets the org's earliest-created ORG_ADMIN
   * (normally the one made alongside the org itself); the reset link is
   * emailed straight to that admin, never handed back to the Platform Admin
   * who triggered it (Sep 2026 -- "should only send... not themselves see
   * the reset"). */
  async generateAdminResetLink(ctx: TenantContext, orgId: string) {
    const admin = await runWithTenant(this.prisma, ctx, (tx) =>
      tx.user.findFirst({
        where: { organizationId: orgId, role: Role.ORG_ADMIN },
        orderBy: { createdAt: "asc" },
      }),
    );
    if (!admin) throw new NotFoundException("This organization has no admin to reset");
    return this.auth.sendResetEmailForUser(admin.id);
  }
}
