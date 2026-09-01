import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateSoulWinningRecordDto } from "./dto/create-soul-winning-record.dto";
import { UpdateSoulWinningRecordDto } from "./dto/update-soul-winning-record.dto";
import { AdvanceStageDto } from "./dto/advance-stage.dto";
import { LinkMemberDto } from "./dto/link-member.dto";
import { Audit } from "../audit-log/audit.decorator";
import { SoulWinningService } from "./soul-winning.service";

@Controller("soul-winning")
@UseGuards(SessionAuthGuard)
export class SoulWinningController {
  constructor(private readonly soulWinning: SoulWinningService) {}

  @Post()
  @Audit({ action: "SOUL_WINNING_RECORD_CREATED", entityType: "soulWinningRecord" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateSoulWinningRecordDto) {
    return this.soulWinning.create(tenantContextFor(user), dto);
  }

  @Get()
  list(@CurrentUser() user: SessionUser, @Query("stage") stage?: string, @Query("assignedToId") assignedToId?: string) {
    return this.soulWinning.list(tenantContextFor(user), { stage, assignedToId });
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.soulWinning.get(tenantContextFor(user), id);
  }

  @Patch(":id")
  @Audit({ action: "SOUL_WINNING_RECORD_UPDATED", entityType: "soulWinningRecord" })
  update(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateSoulWinningRecordDto) {
    return this.soulWinning.update(tenantContextFor(user), id, dto);
  }

  @Post(":id/advance-stage")
  @Audit({ action: "SOUL_WINNING_RECORD_STAGE_ADVANCED", entityType: "soulWinningRecord" })
  advanceStage(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: AdvanceStageDto) {
    return this.soulWinning.advanceStage(tenantContextFor(user), id, dto);
  }

  @Patch(":id/link-member")
  @Audit({ action: "SOUL_WINNING_RECORD_MEMBER_LINKED", entityType: "soulWinningRecord" })
  linkMember(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: LinkMemberDto) {
    return this.soulWinning.linkMember(tenantContextFor(user), id, dto);
  }
}
