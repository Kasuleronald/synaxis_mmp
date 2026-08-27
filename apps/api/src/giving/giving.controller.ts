import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Role, SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateGivingCategoryDto } from "./dto/create-giving-category.dto";
import { RenameGivingCategoryDto } from "./dto/rename-giving-category.dto";
import { CreateGivingRecordDto } from "./dto/create-giving-record.dto";
import { CreateFundDto } from "./dto/create-fund.dto";
import { UpdateFundDto } from "./dto/update-fund.dto";
import { CreateVendorDto } from "./dto/create-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { CreatePledgeDto } from "./dto/create-pledge.dto";
import { UpdatePledgeDto } from "./dto/update-pledge.dto";
import { CreateGivingBatchDto } from "./dto/create-giving-batch.dto";
import { UpdateGivingBatchDto } from "./dto/update-giving-batch.dto";
import { GivingService } from "./giving.service";

const FINANCE_ROLES = [Role.ORG_ADMIN, Role.FINANCE_OFFICER] as const;

@Controller("giving")
@UseGuards(SessionAuthGuard, RolesGuard)
export class GivingController {
  constructor(private readonly giving: GivingService) {}

  @Post("categories")
  @Roles(...FINANCE_ROLES)
  createCategory(@CurrentUser() user: SessionUser, @Body() dto: CreateGivingCategoryDto) {
    return this.giving.createCategory(tenantContextFor(user), dto);
  }

  @Get("categories")
  listCategories(@CurrentUser() user: SessionUser) {
    return this.giving.listCategories(tenantContextFor(user));
  }

  @Patch("categories/:id")
  @Roles(...FINANCE_ROLES)
  renameCategory(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: RenameGivingCategoryDto) {
    return this.giving.renameCategory(tenantContextFor(user), id, dto);
  }

  @Patch("categories/:id/deactivate")
  @Roles(...FINANCE_ROLES)
  deactivateCategory(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.giving.deactivateCategory(tenantContextFor(user), id);
  }

  @Post("records")
  @Roles(...FINANCE_ROLES)
  createRecord(@CurrentUser() user: SessionUser, @Body() dto: CreateGivingRecordDto) {
    return this.giving.createRecord(tenantContextFor(user), user.id, dto);
  }

  @Get("records")
  listRecords(
    @CurrentUser() user: SessionUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("batchId") batchId?: string,
  ) {
    return this.giving.listRecords(tenantContextFor(user), from, to, batchId);
  }

  @Get("summary")
  summary(@CurrentUser() user: SessionUser) {
    return this.giving.summary(tenantContextFor(user));
  }

  // --- Funds ------------------------------------------------------------

  @Post("funds")
  @Roles(...FINANCE_ROLES)
  createFund(@CurrentUser() user: SessionUser, @Body() dto: CreateFundDto) {
    return this.giving.createFund(tenantContextFor(user), dto);
  }

  @Get("funds")
  listFunds(@CurrentUser() user: SessionUser) {
    return this.giving.listFunds(tenantContextFor(user));
  }

  @Patch("funds/:id")
  @Roles(...FINANCE_ROLES)
  updateFund(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateFundDto) {
    return this.giving.updateFund(tenantContextFor(user), id, dto);
  }

  @Patch("funds/:id/deactivate")
  @Roles(...FINANCE_ROLES)
  deactivateFund(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.giving.deactivateFund(tenantContextFor(user), id);
  }

  // --- Vendors ------------------------------------------------------------

  @Post("vendors")
  @Roles(...FINANCE_ROLES)
  createVendor(@CurrentUser() user: SessionUser, @Body() dto: CreateVendorDto) {
    return this.giving.createVendor(tenantContextFor(user), dto);
  }

  @Get("vendors")
  listVendors(@CurrentUser() user: SessionUser) {
    return this.giving.listVendors(tenantContextFor(user));
  }

  @Patch("vendors/:id")
  @Roles(...FINANCE_ROLES)
  updateVendor(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateVendorDto) {
    return this.giving.updateVendor(tenantContextFor(user), id, dto);
  }

  @Patch("vendors/:id/deactivate")
  @Roles(...FINANCE_ROLES)
  deactivateVendor(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.giving.deactivateVendor(tenantContextFor(user), id);
  }

  // --- Pledges ------------------------------------------------------------

  @Post("pledges")
  @Roles(...FINANCE_ROLES)
  createPledge(@CurrentUser() user: SessionUser, @Body() dto: CreatePledgeDto) {
    return this.giving.createPledge(tenantContextFor(user), user.id, dto);
  }

  @Get("pledges")
  listPledges(@CurrentUser() user: SessionUser) {
    return this.giving.listPledges(tenantContextFor(user));
  }

  @Patch("pledges/:id")
  @Roles(...FINANCE_ROLES)
  updatePledge(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdatePledgeDto) {
    return this.giving.updatePledge(tenantContextFor(user), id, dto);
  }

  @Patch("pledges/:id/reactivate")
  @Roles(...FINANCE_ROLES)
  reactivatePledge(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body("endDate") endDate?: string) {
    return this.giving.reactivatePledge(tenantContextFor(user), id, endDate);
  }

  // --- Giving batches -------------------------------------------------------

  @Post("batches")
  @Roles(...FINANCE_ROLES)
  createBatch(@CurrentUser() user: SessionUser, @Body() dto: CreateGivingBatchDto) {
    return this.giving.createBatch(tenantContextFor(user), user.id, dto);
  }

  @Get("batches")
  listBatches(@CurrentUser() user: SessionUser) {
    return this.giving.listBatches(tenantContextFor(user));
  }

  @Patch("batches/:id")
  @Roles(...FINANCE_ROLES)
  updateBatch(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: UpdateGivingBatchDto) {
    return this.giving.updateBatch(tenantContextFor(user), id, dto);
  }

  @Patch("batches/:id/close")
  @Roles(...FINANCE_ROLES)
  closeBatch(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.giving.closeBatch(tenantContextFor(user), id);
  }
}
