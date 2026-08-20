import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { RegistrationStatus } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { NotificationsService } from "../notifications/notifications.service";
import { SubmitRegistrationDto } from "./dto/submit-registration.dto";

const REVIEWER_INCLUDE = {
  reviewedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Public flow (no session) -- mirrors the QR check-in pattern -------

  private async resolveOrgBySlug(slug: string) {
    const org = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: false, publicRegistration: true },
      (tx) =>
        tx.organization.findUnique({
          where: { slug },
          select: { id: true, displayName: true, logoUrl: true, theme: true, country: true },
        }),
    );
    if (!org) throw new NotFoundException("This registration link is no longer valid");
    return org;
  }

  async getPublicOrgInfo(slug: string) {
    return this.resolveOrgBySlug(slug);
  }

  async submit(slug: string, dto: SubmitRegistrationDto) {
    const org = await this.resolveOrgBySlug(slug);
    return runWithTenant(this.prisma, { organizationId: org.id, isPlatformAdmin: false }, async (tx) => {
      const registration = await tx.selfRegistration.create({
        data: { organizationId: org.id, ...dto },
      });
      const approvers = await tx.user.findMany({
        where: { organizationId: org.id, OR: [{ isRegistrationApprover: true }, { role: "ORG_ADMIN" }] },
        select: { id: true },
      });
      await this.notifications.notifyWithinTx(
        tx,
        org.id,
        approvers.map((a) => a.id),
        "REGISTRATION_SUBMITTED",
        `${registration.fullName} submitted a self-registration -- review it.`,
        "/registrations",
      );
      return { ok: true };
    });
  }

  // --- Admin flow (authenticated) -----------------------------------------

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.selfRegistration.findMany({ orderBy: { createdAt: "desc" }, include: REVIEWER_INCLUDE }),
    );
  }

  private async assertReviewerIsApprover(tx: any, reviewerId: string) {
    const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
    if (!reviewer || (!reviewer.isRegistrationApprover && reviewer.role !== "ORG_ADMIN")) {
      throw new ForbiddenException("You're not appointed as a registration approver");
    }
  }

  async approve(ctx: TenantContext, id: string, reviewerId: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const registration = await tx.selfRegistration.findUnique({ where: { id } });
      if (!registration) throw new NotFoundException("Registration not found");
      if (registration.status !== RegistrationStatus.PENDING) {
        throw new ForbiddenException("This registration was already reviewed");
      }

      const org = await tx.organization.update({
        where: { id: ctx.organizationId as string },
        data: { memberNumberSeq: { increment: 1 } },
        select: { memberNumberSeq: true },
      });
      const member = await tx.member.create({
        data: {
          organizationId: ctx.organizationId as string,
          fullName: registration.fullName,
          phone: registration.phone,
          email: registration.email,
          gender: registration.gender,
          nationality: registration.nationality,
          birthMonth: registration.birthMonth,
          birthDay: registration.birthDay,
          birthYear: registration.birthYear,
          maritalStatus: registration.maritalStatus,
          isStudent: registration.isStudent,
          school: registration.school,
          address: registration.address,
          notes: registration.notes,
          status: "VISITOR",
          memberNumber: String(org.memberNumberSeq).padStart(4, "0"),
        },
      });

      return tx.selfRegistration.update({
        where: { id },
        data: {
          status: RegistrationStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          memberIdCreated: member.id,
        },
        include: REVIEWER_INCLUDE,
      });
    });
  }

  async reject(ctx: TenantContext, id: string, reviewerId: string) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      await this.assertReviewerIsApprover(tx, reviewerId);
      const registration = await tx.selfRegistration.findUnique({ where: { id } });
      if (!registration) throw new NotFoundException("Registration not found");
      if (registration.status !== RegistrationStatus.PENDING) {
        throw new ForbiddenException("This registration was already reviewed");
      }
      return tx.selfRegistration.update({
        where: { id },
        data: { status: RegistrationStatus.REJECTED, reviewedById: reviewerId, reviewedAt: new Date() },
        include: REVIEWER_INCLUDE,
      });
    });
  }
}
