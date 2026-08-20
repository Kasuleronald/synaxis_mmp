import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { RegistrationsService } from "./registrations.service";

@Controller("registrations")
@UseGuards(SessionAuthGuard)
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.registrations.list(tenantContextFor(user));
  }

  @Post(":id/approve")
  approve(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.registrations.approve(tenantContextFor(user), id, user.id);
  }

  @Post(":id/reject")
  reject(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.registrations.reject(tenantContextFor(user), id, user.id);
  }
}
