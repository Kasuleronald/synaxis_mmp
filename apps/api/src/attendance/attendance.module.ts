import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { CheckInController } from "./check-in.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceController, CheckInController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
