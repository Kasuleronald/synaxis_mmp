import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateTestimonyDto } from "./dto/create-testimony.dto";
import { Audit } from "../audit-log/audit.decorator";
import { TestimoniesService } from "./testimonies.service";

@Controller("testimonies")
@UseGuards(SessionAuthGuard, RolesGuard)
export class TestimoniesController {
  constructor(private readonly testimonies: TestimoniesService) {}

  @Post()
  @Audit({ action: "TESTIMONY_CREATED", entityType: "testimony", labelFields: ["content"] })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateTestimonyDto) {
    return this.testimonies.create(tenantContextFor(user), user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.testimonies.list(tenantContextFor(user));
  }

  @Delete(":id")
  @Roles(Role.ORG_ADMIN)
  @Audit({ action: "TESTIMONY_DELETED", entityType: "testimony" })
  remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.testimonies.remove(tenantContextFor(user), id);
  }
}
