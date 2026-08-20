import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "./guards/session-auth.guard";
import { AuthService } from "./auth.service";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @UseGuards(AuthGuard("local"))
  @Post("login")
  @HttpCode(200)
  login(@Req() req: Request) {
    // AuthGuard('local') sets req.user on a successful strategy check, but
    // does NOT reliably trigger passport's session login in this Nest/passport
    // version combo -- req.session.passport stayed empty and no cookie was
    // ever sent. Logging in explicitly is what actually persists the session.
    return new Promise<{ user: SessionUser }>((resolve, reject) => {
      req.logIn(req.user as Express.User, (err) => {
        if (err) return reject(err);
        resolve({ user: req.user as SessionUser });
      });
    });
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return new Promise<{ ok: true }>((resolve, reject) => {
      req.logout((err) => {
        if (err) return reject(err);
        req.session.destroy((destroyErr) => {
          if (destroyErr) return reject(destroyErr);
          res.clearCookie("connect.sid");
          resolve({ ok: true });
        });
      });
    });
  }

  @UseGuards(SessionAuthGuard)
  @Get("me")
  me(@Req() req: Request) {
    return { user: req.user as SessionUser };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }
}
