import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { Audit } from "../audit-log/audit.decorator";
import { UpdateStagingRowDto } from "./dto/update-staging-row.dto";
import { ImportsService } from "./imports.service";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB -- generous for a membership spreadsheet or scanned PDF

@Controller("imports")
@UseGuards(SessionAuthGuard)
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_BYTES } }))
  @Audit({ action: "IMPORT_STARTED", entityType: "importBatch", labelFields: ["filename"] })
  upload(@CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.imports.upload(tenantContextFor(user), file);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.imports.listBatches(tenantContextFor(user));
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.imports.getBatch(tenantContextFor(user), id);
  }

  @Patch("rows/:rowId")
  updateRow(@CurrentUser() user: SessionUser, @Param("rowId") rowId: string, @Body() dto: UpdateStagingRowDto) {
    return this.imports.updateRow(tenantContextFor(user), rowId, dto);
  }

  @Post(":id/commit")
  @Audit({ action: "IMPORT_COMMITTED", entityType: "importBatch" })
  commit(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.imports.commit(tenantContextFor(user), id);
  }
}
