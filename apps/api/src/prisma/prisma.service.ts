import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // Deliberately NOT the same URL as `prisma migrate` uses. This connects
    // as the restricted life_mmp_app role (see db/init/01-app-role.sql) so
    // the row-level security policies in the init migration are actually
    // enforced instead of bypassed by a superuser connection.
    super({
      datasourceUrl: config.getOrThrow<string>("RUNTIME_DATABASE_URL"),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
