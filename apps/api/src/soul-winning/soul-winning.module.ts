import { Module } from "@nestjs/common";
import { SoulWinningController } from "./soul-winning.controller";
import { SoulWinningService } from "./soul-winning.service";

@Module({
  controllers: [SoulWinningController],
  providers: [SoulWinningService],
})
export class SoulWinningModule {}
