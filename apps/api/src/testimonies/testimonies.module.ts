import { Module } from "@nestjs/common";
import { TestimoniesController } from "./testimonies.controller";
import { TestimoniesService } from "./testimonies.service";

@Module({
  controllers: [TestimoniesController],
  providers: [TestimoniesService],
})
export class TestimoniesModule {}
