import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { SessionUser } from "@life-mmp/shared";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant } from "../prisma/tenant";

const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** No email sending exists yet -- this hands back a link for whoever
   * triggered it (a Platform Admin, from the org's own screen) to relay
   * directly, the same "copy the link yourself" pattern as the public
   * registration link. */
  async generateResetLinkForUser(userId: string): Promise<{ email: string; token: string }> {
    const token = randomBytes(24).toString("base64url");
    const user = await runWithTenant(
      this.prisma,
      { organizationId: null, isPlatformAdmin: true },
      (tx) =>
        tx.user.update({
          where: { id: userId },
          data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
          select: { email: true },
        }),
    );
    return { email: user.email, token };
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
        data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
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
  };
}
