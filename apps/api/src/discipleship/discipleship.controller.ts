import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { CreateProgramDto } from "./dto/create-program.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { EnrollDto } from "./dto/enroll.dto";
import { DiscipleshipService } from "./discipleship.service";

@Controller("discipleship")
@UseGuards(SessionAuthGuard)
export class DiscipleshipController {
  constructor(private readonly discipleship: DiscipleshipService) {}

  @Post("programs")
  @Audit({ action: "DISCIPLESHIP_PROGRAM_CREATED", entityType: "discipleshipProgram" })
  createProgram(@CurrentUser() user: SessionUser, @Body() dto: CreateProgramDto) {
    return this.discipleship.createProgram(tenantContextFor(user), dto);
  }

  @Get("programs")
  listPrograms(@CurrentUser() user: SessionUser) {
    return this.discipleship.listPrograms(tenantContextFor(user));
  }

  @Post("classes")
  @Audit({ action: "DISCIPLESHIP_CLASS_CREATED", entityType: "discipleshipClass" })
  createClass(@CurrentUser() user: SessionUser, @Body() dto: CreateClassDto) {
    return this.discipleship.createClass(tenantContextFor(user), dto);
  }

  @Get("classes")
  listClasses(@CurrentUser() user: SessionUser) {
    return this.discipleship.listClasses(tenantContextFor(user));
  }

  @Get("classes/:id")
  getClass(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.discipleship.getClass(tenantContextFor(user), id);
  }

  @Post("classes/:id/enroll")
  @Audit({ action: "DISCIPLESHIP_CLASS_ENROLLED", entityType: "discipleshipClass" })
  enroll(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: EnrollDto) {
    return this.discipleship.enroll(tenantContextFor(user), id, dto);
  }
}
