import { Module } from "@nestjs/common";
import { GivingController } from "./giving.controller";
import { GivingService } from "./giving.service";
import { PledgeLifecycleService } from "./pledge-lifecycle.service";

@Module({
  controllers: [GivingController],
  providers: [GivingService, PledgeLifecycleService],
})
export class GivingModule {}
