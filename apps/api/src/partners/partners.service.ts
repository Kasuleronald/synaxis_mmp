import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { UpdatePartnerDto } from "./dto/update-partner.dto";

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreatePartnerDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.partner.create({
        data: {
          organizationId: ctx.organizationId as string,
          name: dto.name,
          type: dto.type,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          notes: dto.notes,
        },
      }),
    );
  }

  async list(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.partner.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    );
  }

  async update(ctx: TenantContext, id: string, dto: UpdatePartnerDto) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.partner.update({
        where: { id },
        data: { name: dto.name, type: dto.type, contactEmail: dto.contactEmail, contactPhone: dto.contactPhone, notes: dto.notes },
      }),
    );
  }

  async deactivate(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) => tx.partner.update({ where: { id }, data: { isActive: false } }));
  }
}
