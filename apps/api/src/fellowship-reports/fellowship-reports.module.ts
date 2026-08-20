import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { FellowshipReportsController } from "./fellowship-reports.controller";
import { FellowshipReportsService } from "./fellowship-reports.service";

@Module({
  imports: [NotificationsModule],
  controllers: [FellowshipReportsController],
  providers: [FellowshipReportsService],
})
export class FellowshipReportsModule {}
