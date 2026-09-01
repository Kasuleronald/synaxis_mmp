import { Module } from "@nestjs/common";
import { MeetingCategoriesController } from "./meeting-categories.controller";
import { MeetingCategoriesService } from "./meeting-categories.service";

@Module({
  controllers: [MeetingCategoriesController],
  providers: [MeetingCategoriesService],
  exports: [MeetingCategoriesService],
})
export class MeetingCategoriesModule {}
