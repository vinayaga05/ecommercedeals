import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { PricesModule } from '../prices/prices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PricesModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
