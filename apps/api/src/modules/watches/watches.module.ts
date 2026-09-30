import { Module } from '@nestjs/common';
import { WatchesService } from './watches.service';
import { WatchesController } from './watches.controller';

@Module({
  controllers: [WatchesController],
  providers: [WatchesService],
  exports: [WatchesService],
})
export class WatchesModule {}
