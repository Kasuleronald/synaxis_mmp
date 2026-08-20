import { Module } from "@nestjs/common";
import { DiscipleshipController } from "./discipleship.controller";
import { DiscipleshipService } from "./discipleship.service";

@Module({
  controllers: [DiscipleshipController],
  providers: [DiscipleshipService],
})
export class DiscipleshipModule {}
