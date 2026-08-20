import { ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { runWithTenant, TenantContext } from "../prisma/tenant";
import { CreateProgramDto } from "./dto/create-program.dto";
import { CreateClassDto } from "./dto/create-class.dto";
import { EnrollDto } from "./dto/enroll.dto";

@Injectable()
export class DiscipleshipService {
  constructor(private readonly prisma: PrismaService) {}

  async createProgram(ctx: TenantContext, dto: CreateProgramDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.discipleshipProgram.create({ data: { organizationId: ctx.organizationId as string, ...dto } }),
    );
  }

  async listPrograms(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.discipleshipProgram.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { classes: true } } },
      }),
    );
  }

  async createClass(ctx: TenantContext, dto: CreateClassDto) {
    if (!ctx.organizationId) throw new ForbiddenException("Only an organization member can do that");
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.discipleshipClass.create({
        data: {
          organizationId: ctx.organizationId as string,
          programId: dto.programId,
          branchId: dto.branchId,
          name: dto.name,
          instructorId: dto.instructorId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
      }),
    );
  }

  async listClasses(ctx: TenantContext) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.discipleshipClass.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          program: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } },
        },
      }),
    );
  }

  async getClass(ctx: TenantContext, id: string) {
    return runWithTenant(this.prisma, ctx, (tx) =>
      tx.discipleshipClass.findUnique({
        where: { id },
        include: {
          program: { select: { id: true, name: true } },
          enrollments: { include: { member: { select: { id: true, fullName: true } } } },
        },
      }),
    );
  }

  async enroll(ctx: TenantContext, classId: string, dto: EnrollDto) {
    return runWithTenant(this.prisma, ctx, async (tx) => {
      const existing = await tx.classEnrollment.findUnique({
        where: { classId_memberId: { classId, memberId: dto.memberId } },
      });
      if (existing) throw new ConflictException("Already enrolled in this class");
      return tx.classEnrollment.create({
        data: { organizationId: ctx.organizationId as string, classId, memberId: dto.memberId },
      });
    });
  }
}
