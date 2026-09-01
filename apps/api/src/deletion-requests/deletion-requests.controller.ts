import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateDeletionRequestDto } from "./dto/create-deletion-request.dto";
import { DeletionRequestsService } from "./deletion-requests.service";

@Controller("deletion-requests")
@UseGuards(SessionAuthGuard)
export class DeletionRequestsController {
  constructor(private readonly deletionRequests: DeletionRequestsService) {}

  @Post()
  @Audit({ action: "DELETION_REQUESTED", entityType: "deletionRequest" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateDeletionRequestDto) {
    return this.deletionRequests.create(tenantContextFor(user), user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.deletionRequests.list(tenantContextFor(user));
  }

  @Post(":id/approve")
  @Audit({ action: "DELETION_APPROVED", entityType: "deletionRequest" })
  approve(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.deletionRequests.approve(tenantContextFor(user), id, user.id);
  }

  @Post(":id/reject")
  @Audit({ action: "DELETION_REJECTED", entityType: "deletionRequest" })
  reject(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.deletionRequests.reject(tenantContextFor(user), id, user.id);
  }
}
