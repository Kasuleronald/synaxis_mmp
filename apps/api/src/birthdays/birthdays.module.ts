import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { BirthdayRemindersService } from "./birthday-reminders.service";

@Module({
  imports: [NotificationsModule],
  providers: [BirthdayRemindersService],
})
export class BirthdaysModule {}
