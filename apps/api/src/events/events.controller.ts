import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateEventDto } from "./dto/create-event.dto";
import { CreateDebriefDto } from "./dto/create-debrief.dto";
import { EventsService } from "./events.service";

@Controller("events")
@UseGuards(SessionAuthGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @Audit({ action: "EVENT_CREATED", entityType: "event" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateEventDto) {
    return this.events.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.events.list(tenantContextFor(user));
  }

  @Post(":id/debrief")
  @Audit({ action: "EVENT_DEBRIEF_LOGGED", entityType: "event" })
  createDebrief(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: CreateDebriefDto) {
    return this.events.createDebrief(tenantContextFor(user), id, user.id, dto);
  }

  @Get(":id/debrief")
  getDebrief(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.events.getDebrief(tenantContextFor(user), id);
  }
}
