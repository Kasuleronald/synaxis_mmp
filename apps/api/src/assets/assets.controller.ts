import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { SessionUser } from "@life-mmp/shared";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { tenantContextFor } from "../auth/tenant-context";
import { AssetsService } from "./assets.service";

const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6MB -- generous for a client-optimized photo

@Controller("assets")
@UseGuards(SessionAuthGuard)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_BYTES } }))
  upload(@CurrentUser() user: SessionUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.assets.upload(tenantContextFor(user), file, user.id);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.assets.list(tenantContextFor(user));
  }

  @Get(":id/file")
  async getFile(@CurrentUser() user: SessionUser, @Param("id") id: string, @Res() res: Response) {
    const asset = await this.assets.getFile(tenantContextFor(user), id);
    res.set({
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.name)}"`,
      "Cache-Control": "private, max-age=3600",
    });
    res.send(asset.data);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.assets.remove(tenantContextFor(user), id);
  }
}
