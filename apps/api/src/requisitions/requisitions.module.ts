import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RequisitionsController } from "./requisitions.controller";
import { RequisitionsService } from "./requisitions.service";

@Module({
  imports: [NotificationsModule],
  controllers: [RequisitionsController],
  providers: [RequisitionsService],
})
export class RequisitionsModule {}
