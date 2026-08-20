import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { RegisterController } from "./register.controller";
import { RegistrationsController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";

@Module({
  imports: [NotificationsModule],
  controllers: [RegisterController, RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
