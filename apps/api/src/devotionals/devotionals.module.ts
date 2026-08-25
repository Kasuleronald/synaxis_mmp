import { Module } from "@nestjs/common";
import { DevotionalsController } from "./devotionals.controller";
import { DevotionalsService } from "./devotionals.service";

@Module({
  controllers: [DevotionalsController],
  providers: [DevotionalsService],
})
export class DevotionalsModule {}
