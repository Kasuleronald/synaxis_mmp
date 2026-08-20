import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateFellowshipDto } from "./dto/create-fellowship.dto";
import { UpdateFellowshipDto } from "./dto/update-fellowship.dto";
import { FellowshipsService } from "./fellowships.service";

@Controller("fellowships")
@UseGuards(SessionAuthGuard)
export class FellowshipsController {
  constructor(private readonly fellowships: FellowshipsService) {}

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateFellowshipDto) {
    return this.fellowships.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.fellowships.list(tenantContextFor(user));
  }

  @Patch(":id")
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateFellowshipDto) {
    return this.fellowships.update(tenantContextFor(user), id, dto);
  }
}
