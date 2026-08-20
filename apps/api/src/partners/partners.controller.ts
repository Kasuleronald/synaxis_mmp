import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";
import { PartnersService } from "./partners.service";

const FINANCE_ROLES = [Role.ORG_ADMIN, Role.FINANCE_OFFICER] as const;

@Controller("partners")
@UseGuards(SessionAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Post()
  @Roles(...FINANCE_ROLES)
  create(@CurrentUser() user: SessionUser, @Body() dto: CreatePartnerDto) {
    return this.partners.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.partners.list(tenantContextFor(user));
  }

  @Patch(":id")
  @Roles(...FINANCE_ROLES)
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(tenantContextFor(user), id, dto);
  }

  @Patch(":id/deactivate")
  @Roles(...FINANCE_ROLES)
  deactivate(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.partners.deactivate(tenantContextFor(user), id);
  }
}
