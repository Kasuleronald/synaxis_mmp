import { Module } from "@nestjs/common";
import { FellowshipsController } from "./fellowships.controller";
import { FellowshipsService } from "./fellowships.service";

@Module({
  controllers: [FellowshipsController],
  providers: [FellowshipsService],
})
export class FellowshipsModule {}
