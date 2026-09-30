import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PriceCheckWorker } from './price-check.worker';
import { PricesModule } from '../prices/prices.module';
import { WatchesModule } from '../watches/watches.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'price-check',
    }),
    PricesModule,
    WatchesModule,
    AlertsModule,
    CampaignsModule,
    SchedulerModule,
  ],
  providers: [PriceCheckWorker],
})
export class WorkersModule {}
