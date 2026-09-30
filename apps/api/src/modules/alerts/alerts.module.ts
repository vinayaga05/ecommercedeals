import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { DailyDigestService } from './daily-digest.service';
import { CrossRetailerService } from './cross-retailer.service';
import { PricesModule } from '../prices/prices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PricesModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService, DailyDigestService, CrossRetailerService],
  exports: [AlertsService, CrossRetailerService],
})
export class AlertsModule {}
