import { Module } from "@nestjs/common";
import { ServiceUnitsController } from "./service-units.controller";
import { ServiceUnitsService } from "./service-units.service";

@Module({
  controllers: [ServiceUnitsController],
  providers: [ServiceUnitsService],
})
export class ServiceUnitsModule {}
