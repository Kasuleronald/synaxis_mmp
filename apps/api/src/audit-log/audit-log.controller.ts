import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { AuditLogService } from "./audit-log.service";
import { RecordExportDto } from "./dto/record-export.dto";

@Controller("audit-log")
@UseGuards(SessionAuthGuard, RolesGuard)
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @Roles(Role.ORG_ADMIN)
  list(@CurrentUser() user: SessionUser) {
    return this.auditLog.list(tenantContextFor(user));
  }

  @Get("logins")
  @Roles(Role.PLATFORM_ADMIN)
  listLogins(@CurrentUser() user: SessionUser) {
    return this.auditLog.listLogins(tenantContextFor(user));
  }

  // No @Roles() -- any signed-in org member can trigger an export from
  // whatever page they're already allowed to see, so whoever did it gets
  // logged the same way regardless of role. There's no dedicated export
  // route to hang an @Audit() decorator off of (exports are generated
  // client-side from data the page already has), so the frontend calls
  // this directly right after building the file.
  @Post("export")
  async recordExport(@CurrentUser() user: SessionUser, @Body() dto: RecordExportDto) {
    await this.auditLog.record(user, { action: "DATA_EXPORTED", entityType: "export", entityLabel: dto.label });
    return { ok: true };
  }
}
