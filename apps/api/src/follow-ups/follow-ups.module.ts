import { Module } from "@nestjs/common";
import { FollowUpsController } from "./follow-ups.controller";
import { FollowUpsService } from "./follow-ups.service";
import { AbsenteeismCheckService } from "./absenteeism-check.service";

@Module({
  controllers: [FollowUpsController],
  providers: [FollowUpsService, AbsenteeismCheckService],
})
export class FollowUpsModule {}
