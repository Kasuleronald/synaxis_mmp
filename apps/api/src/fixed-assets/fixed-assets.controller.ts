import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { CreateFixedAssetDto } from "./dto/create-fixed-asset.dto";
import { CreateConditionRequestDto } from "./dto/create-condition-request.dto";
import { RespondConditionRequestDto } from "./dto/respond-condition-request.dto";
import { CreateFixedAssetEditRequestDto } from "./dto/create-fixed-asset-edit-request.dto";
import { AddFixedAssetPhotoDto } from "./dto/add-fixed-asset-photo.dto";
import { Audit } from "../audit-log/audit.decorator";
import { FixedAssetsService } from "./fixed-assets.service";

@Controller("fixed-assets")
@UseGuards(SessionAuthGuard)
export class FixedAssetsController {
  constructor(private readonly fixedAssets: FixedAssetsService) {}

  @Post()
  @Audit({ action: "FIXED_ASSET_CREATED", entityType: "fixedAsset" })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateFixedAssetDto) {
    return this.fixedAssets.create(tenantContextFor(user), dto, user.id);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.fixedAssets.list(tenantContextFor(user));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.fixedAssets.get(tenantContextFor(user), id);
  }

  @Delete(":id")
  @Audit({ action: "FIXED_ASSET_DELETED", entityType: "fixedAsset" })
  remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.fixedAssets.remove(tenantContextFor(user), id);
  }

  @Post(":id/photos")
  @Audit({ action: "FIXED_ASSET_PHOTO_ADDED", entityType: "fixedAssetPhoto" })
  addPhoto(@CurrentUser() user: SessionUser, @Param("id") id: string, @Body() dto: AddFixedAssetPhotoDto) {
    return this.fixedAssets.addPhoto(tenantContextFor(user), id, dto);
  }

  @Delete(":id/photos/:photoId")
  @Audit({ action: "FIXED_ASSET_PHOTO_REMOVED", entityType: "fixedAssetPhoto" })
  removePhoto(@CurrentUser() user: SessionUser, @Param("id") id: string, @Param("photoId") photoId: string) {
    return this.fixedAssets.removePhoto(tenantContextFor(user), id, photoId);
  }

  @Get("condition-requests/all")
  listConditionRequests(@CurrentUser() user: SessionUser) {
    return this.fixedAssets.listConditionRequests(tenantContextFor(user));
  }

  @Post(":id/condition-requests")
  @Audit({ action: "ASSET_CONDITION_REQUESTED", entityType: "assetConditionRequest", labelFields: ["message"] })
  createConditionRequest(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() dto: CreateConditionRequestDto,
  ) {
    return this.fixedAssets.createConditionRequest(tenantContextFor(user), id, dto, user.id);
  }

  @Post("condition-requests/:requestId/respond")
  @Audit({ action: "ASSET_CONDITION_RESPONDED", entityType: "assetConditionRequest", labelFields: ["message"] })
  respondToConditionRequest(
    @CurrentUser() user: SessionUser,
    @Param("requestId") requestId: string,
    @Body() dto: RespondConditionRequestDto,
  ) {
    return this.fixedAssets.respondToConditionRequest(tenantContextFor(user), requestId, dto, user.id);
  }

  @Get("edit-requests/all")
  listEditRequests(@CurrentUser() user: SessionUser) {
    return this.fixedAssets.listEditRequests(tenantContextFor(user));
  }

  @Post(":id/edit-requests")
  @Audit({ action: "FIXED_ASSET_EDIT_REQUESTED", entityType: "fixedAssetEditRequest", labelFields: ["note"] })
  createEditRequest(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() dto: CreateFixedAssetEditRequestDto,
  ) {
    return this.fixedAssets.createEditRequest(tenantContextFor(user), id, dto, user.id);
  }

  @Post("edit-requests/:requestId/approve")
  @Audit({ action: "FIXED_ASSET_EDIT_APPROVED", entityType: "fixedAssetEditRequest" })
  approveEditRequest(@CurrentUser() user: SessionUser, @Param("requestId") requestId: string) {
    return this.fixedAssets.approveEditRequest(tenantContextFor(user), requestId, user.id);
  }

  @Post("edit-requests/:requestId/reject")
  @Audit({ action: "FIXED_ASSET_EDIT_REJECTED", entityType: "fixedAssetEditRequest" })
  rejectEditRequest(@CurrentUser() user: SessionUser, @Param("requestId") requestId: string) {
    return this.fixedAssets.rejectEditRequest(tenantContextFor(user), requestId, user.id);
  }
}
