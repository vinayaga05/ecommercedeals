import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'price-check',
    }),
    CampaignsModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
