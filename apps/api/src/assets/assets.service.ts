import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";

const LIST_SELECT = {
  id: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(ctx: TenantContext, file: Express.Multer.File, uploadedById: string) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.asset.create({
        data: {
          organizationId: ctx.organizationId as string,
          name: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          data: file.buffer,
          uploadedById,
        },
        select: LIST_SELECT,
      }),
    );
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.asset.findMany({ orderBy: { createdAt: "desc" }, select: LIST_SELECT }),
    );
  }

  /** Serves the raw bytes -- deliberately a separate call from list(), which
   * never selects `data`, so browsing the library doesn't drag every file's
   * full content over the wire just to render a grid of names. */
  async getFile(ctx: TenantContext, id: string) {
    const asset = await runWithTenant(this.prisma, ctx, (tx) =>
      tx.asset.findUnique({ where: { id }, select: { data: true, mimeType: true, name: true } }),
    );
    if (!asset) throw new NotFoundException("Asset not found");
    return asset;
  }

  async remove(ctx: TenantContext, id: string) {
    await runWithTenant(this.prisma, ctx, (tx) => tx.asset.delete({ where: { id } }));
  }
}
