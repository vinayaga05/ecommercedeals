import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { WatchesModule } from './modules/watches/watches.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PricesModule } from './modules/prices/prices.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { WorkersModule } from './modules/workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule,
    ProductsModule,
    WatchesModule,
    AlertsModule,
    PricesModule,
    CampaignsModule,
    NotificationsModule,
    SchedulerModule,
    WorkersModule,
  ],
})
export class AppModule {}
