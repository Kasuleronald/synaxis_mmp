import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { UpsertDevotionalDto } from "./dto/upsert-devotional.dto";
import { Audit } from "../audit-log/audit.decorator";
import { DevotionalsService } from "./devotionals.service";

@Controller("devotionals")
@UseGuards(SessionAuthGuard)
export class DevotionalsController {
  constructor(private readonly devotionals: DevotionalsService) {}

  @Get()
  getByDate(@CurrentUser() user: SessionUser, @Query("date") date?: string) {
    return this.devotionals.getByDate(tenantContextFor(user), date);
  }

  @Get("history")
  list(@CurrentUser() user: SessionUser) {
    return this.devotionals.list(tenantContextFor(user));
  }

  @Post()
  @Audit({ action: "DEVOTIONAL_UPSERTED", entityType: "devotional" })
  upsert(@CurrentUser() user: SessionUser, @Body() dto: UpsertDevotionalDto) {
    return this.devotionals.upsert(tenantContextFor(user), user, dto);
  }
}
