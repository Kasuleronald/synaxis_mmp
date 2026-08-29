import { Controller, Get, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { AuditLogService } from "./audit-log.service";

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
}
