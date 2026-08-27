import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { GivingController } from "./giving.controller";
import { GivingService } from "./giving.service";
import { PledgeLifecycleService } from "./pledge-lifecycle.service";

@Module({
  imports: [NotificationsModule],
  controllers: [GivingController],
  providers: [GivingService, PledgeLifecycleService],
})
export class GivingModule {}
