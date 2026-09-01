import { Body, Controller, Get, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BackupService } from "./backup.service";

@Controller("backup")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(Role.ORG_ADMIN)
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get("export")
  async export(@CurrentUser() user: SessionUser, @Res() res: Response) {
    const bundle = await this.backup.exportOrg(user);
    const datePart = new Date().toISOString().slice(0, 10);
    const slug = bundle.organization.slug || "organization";
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="synaxis-backup-${slug}-${datePart}.json"`);
    res.send(JSON.stringify(bundle));
  }

  @Post("restore")
  restore(@CurrentUser() user: SessionUser, @Body() bundle: unknown) {
    return this.backup.restoreOrg(user, bundle);
  }
}
