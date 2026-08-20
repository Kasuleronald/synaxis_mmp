import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { FixedAssetsController } from "./fixed-assets.controller";
import { FixedAssetsService } from "./fixed-assets.service";

@Module({
  imports: [NotificationsModule],
  controllers: [FixedAssetsController],
  providers: [FixedAssetsService],
})
export class FixedAssetsModule {}
