import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LocalStrategy } from "./local.strategy";
import { SessionSerializer } from "./session.serializer";

@Module({
  imports: [PassportModule.register({ session: true }), AuditLogModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, SessionSerializer],
  exports: [AuthService],
})
export class AuthModule {}
