import { join } from "path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { BranchesModule } from "./branches/branches.module";
import { UsersModule } from "./users/users.module";
import { HouseholdsModule } from "./households/households.module";
import { MembersModule } from "./members/members.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { EventsModule } from "./events/events.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { ImportsModule } from "./imports/imports.module";
import { FellowshipsModule } from "./fellowships/fellowships.module";
import { OrgUnitsModule } from "./org-units/org-units.module";
import { DiscipleshipModule } from "./discipleship/discipleship.module";
import { DeletionRequestsModule } from "./deletion-requests/deletion-requests.module";
import { GivingModule } from "./giving/giving.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { AssetsModule } from "./assets/assets.module";
import { FixedAssetsModule } from "./fixed-assets/fixed-assets.module";
import { FellowshipReportsModule } from "./fellowship-reports/fellowship-reports.module";
import { ReportsModule } from "./reports/reports.module";
import { AnnouncementsModule } from "./announcements/announcements.module";
import { BirthdaysModule } from "./birthdays/birthdays.module";
import { PartnersModule } from "./partners/partners.module";
import { RequisitionsModule } from "./requisitions/requisitions.module";
import { TestimoniesModule } from "./testimonies/testimonies.module";
import { DevotionalsModule } from "./devotionals/devotionals.module";
import { SoulWinningModule } from "./soul-winning/soul-winning.module";
import { ServiceUnitsModule } from "./service-units/service-units.module";
import { AuditLogModule } from "./audit-log/audit-log.module";

@Module({
  imports: [
    // Explicit envFilePath so this resolves to apps/api/.env regardless of
    // the process's cwd -- Webuzo's Node.js Selector runs the compiled app
    // from the repo root, not apps/api, so the default cwd-relative lookup
    // would silently miss the .env file in production.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, "..", ".env") }),
    // Production only -- local dev always serves the web app through Vite
    // on its own port instead, so apps/web/dist may not even exist locally.
    // `/api*` is excluded since main.ts sets that as the API's global
    // prefix; everything else falls through to the built SPA, with
    // index.html as the fallback for client-side routes.
    ...(process.env.NODE_ENV === "production"
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, "..", "..", "web", "dist"),
            exclude: ["/api*"],
          }),
        ]
      : []),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    BranchesModule,
    UsersModule,
    HouseholdsModule,
    MembersModule,
    FollowUpsModule,
    EventsModule,
    AttendanceModule,
    ImportsModule,
    FellowshipsModule,
    OrgUnitsModule,
    DiscipleshipModule,
    DeletionRequestsModule,
    GivingModule,
    NotificationsModule,
    RegistrationsModule,
    AssetsModule,
    FixedAssetsModule,
    FellowshipReportsModule,
    ReportsModule,
    AnnouncementsModule,
    BirthdaysModule,
    PartnersModule,
    RequisitionsModule,
    TestimoniesModule,
    DevotionalsModule,
    SoulWinningModule,
    ServiceUnitsModule,
    AuditLogModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
