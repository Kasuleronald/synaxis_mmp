import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { SessionUser } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";
import { EmailService } from "../email/email.service";

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<SessionUser> {
    // No org context exists yet for a login attempt -- this is the one place
    // the platform-admin RLS bypass is used on behalf of someone who is not
    // (yet) known to be a platform admin. It's safe here specifically
    // because the query is an exact email match, never a listing, and the
    // caller must still produce the correct password below.
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) =>
        tx.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { organization: { select: { isSuspended: true } } },
        }),
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // Checked after the password, not before: a suspended org shouldn't
    // leak "this account exists" to someone who doesn't already know the
    // password. Platform Administrators have no organization, so this
    // never applies to them.
    if (user.organization?.isSuspended) {
      throw new UnauthorizedException("Your organisation is suspended, contact your administrator.");
    }

    return toSessionUser(user);
  }

  async findById(id: string): Promise<SessionUser | null> {
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) => tx.user.findUnique({ where: { id } }),
    );
    return user ? toSessionUser(user) : null;
  }

  /** Emails the reset link straight to the account holder (Sep 2026: "the
   * admin should only send the reset password to the email of the user and
   * not themselves see the reset") -- whoever triggered this (a Platform
   * Admin resetting an Org Admin, or an Org Admin resetting their own staff)
   * never sees the token or link itself, only whether the send succeeded. */
  async sendResetEmailForUser(userId: string): Promise<{ email: string }> {
    const token = randomBytes(24).toString("base64url");
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) =>
        tx.user.update({
          where: { id: userId },
          data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
          select: { email: true, fullName: true },
        }),
    );
    const link = `${process.env.WEB_ORIGIN ?? ""}/reset-password/${token}`;
    this.email.send(
      user.email,
      "Reset your Synaxis password",
      `Hi ${user.fullName},\n\nA password reset was requested for your Synaxis account. Use the link below to set a new password -- it expires in 24 hours and can only be used once:\n\n${link}\n\nIf you didn't expect this, you can ignore this email; your password won't change unless you use the link above.`,
    );
    return { email: user.email };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) => tx.user.findUnique({ where: { passwordResetToken: token } }),
    );
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException("This reset link has expired or is no longer valid.");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await runWithTenant(this.prisma, { organizationId: null, isPlatformAdmin: true }, (tx) =>
      tx.user.update({
        where: { id: user.id },
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null, mustChangePassword: false },
      }),
    );
  }

  /** Self-service, from inside the app -- the one path that requires
   * knowing the current password rather than an emailed token. Also clears
   * mustChangePassword, so this is what the forced first-login screen calls
   * too. */
  async changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) => tx.user.findUnique({ where: { id: userId } }),
    );
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException("Your current password is incorrect.");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await runWithTenant(this.prisma, { organizationId: null, isPlatformAdmin: true }, (tx) =>
      tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
    );
  }
}

function toSessionUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string | null;
  branchId: string | null;
  avatarAssetId: string | null;
  isFellowshipLeader: boolean;
  isPastor: boolean;
  isFellowshipsDepartmentHead: boolean;
  isDevotionalEditor: boolean;
  mustChangePassword: boolean;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as SessionUser["role"],
    organizationId: user.organizationId,
    branchId: user.branchId,
    avatarAssetId: user.avatarAssetId,
    isFellowshipLeader: user.isFellowshipLeader,
    isPastor: user.isPastor,
    isFellowshipsDepartmentHead: user.isFellowshipsDepartmentHead,
    isDevotionalEditor: user.isDevotionalEditor,
    mustChangePassword: user.mustChangePassword,
  };
}
