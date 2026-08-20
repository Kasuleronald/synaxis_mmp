import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { DeletionRequestsController } from "./deletion-requests.controller";
import { DeletionRequestsService } from "./deletion-requests.service";

@Module({
  imports: [NotificationsModule],
  controllers: [DeletionRequestsController],
  providers: [DeletionRequestsService],
})
export class DeletionRequestsModule {}
