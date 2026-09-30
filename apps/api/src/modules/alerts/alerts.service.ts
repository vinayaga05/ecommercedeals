import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PricesService } from '../prices/prices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private readonly cooldownHours: number;
  private readonly dropThresholdPercent: number;

  constructor(
    private prisma: PrismaService,
    private pricesService: PricesService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.cooldownHours = parseInt(
      this.configService.get('ALERT_COOLDOWN_HOURS', '24'),
      10,
    );
    this.dropThresholdPercent = parseFloat(
      this.configService.get('ALERT_DROP_THRESHOLD_PERCENT', '5'),
    );
  }

  async evaluateWatchRules(
    watches: any[],
    currentPrice: Decimal,
    previousPrice: Decimal | null,
    listingId: string,
  ) {
    const alerts = [];

    for (const watch of watches) {
      if (!watch.active) continue;

      if (await this.isInCooldown(watch.id)) {
        this.logger.debug(`Watch ${watch.id} is in cooldown, skipping`);
        continue;
      }

      const alert = await this.checkWatchConditions(
        watch,
        currentPrice,
        previousPrice,
        listingId,
      );

      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  private async checkWatchConditions(
    watch: any,
    currentPrice: Decimal,
    previousPrice: Decimal | null,
    listingId: string,
  ) {
    const currentPriceNum = Number(currentPrice);
    const previousPriceNum = previousPrice ? Number(previousPrice) : null;

    if (watch.targetPrice && currentPriceNum <= Number(watch.targetPrice)) {
      return this.createAlert(
        watch,
        AlertType.TARGET_PRICE_MET,
        `Price dropped to ₹${currentPriceNum.toFixed(2)} (target: ₹${Number(watch.targetPrice).toFixed(2)})`,
        currentPrice,
        previousPrice,
      );
    }

    if (watch.dropPercentage && previousPriceNum) {
      const dropPercent =
        ((previousPriceNum - currentPriceNum) / previousPriceNum) * 100;
      if (dropPercent >= watch.dropPercentage) {
        return this.createAlert(
          watch,
          AlertType.DROP_PERCENTAGE,
          `Price dropped ${dropPercent.toFixed(1)}% to ₹${currentPriceNum.toFixed(2)}`,
          currentPrice,
          previousPrice,
        );
      }
    }

    if (watch.lowestIn30Days) {
      const lowest30 = await this.pricesService.getLowestPrice(listingId, 30);
      if (lowest30 && currentPriceNum <= Number(lowest30.effectivePrice)) {
        return this.createAlert(
          watch,
          AlertType.LOWEST_30_DAYS,
          `Lowest price in 30 days: ₹${currentPriceNum.toFixed(2)}`,
          currentPrice,
          previousPrice,
        );
      }
    }

    if (watch.lowestIn90Days) {
      const lowest90 = await this.pricesService.getLowestPrice(listingId, 90);
      if (lowest90 && currentPriceNum <= Number(lowest90.effectivePrice)) {
        return this.createAlert(
          watch,
          AlertType.LOWEST_90_DAYS,
          `Lowest price in 90 days: ₹${currentPriceNum.toFixed(2)}`,
          currentPrice,
          previousPrice,
        );
      }
    }

    return null;
  }

  private async createAlert(
    watch: any,
    type: AlertType,
    message: string,
    effectivePrice: Decimal,
    previousPrice: Decimal | null,
  ) {
    const alert = await this.prisma.alert.create({
      data: {
        userId: watch.userId,
        watchId: watch.id,
        type,
        message,
        effectivePrice,
        previousPrice,
      },
      include: {
        user: true,
        watch: {
          include: {
            listing: {
              include: { product: true },
            },
          },
        },
      },
    });

    await this.notificationsService.sendAlert(alert);

    return alert;
  }

  private async isInCooldown(watchId: string): Promise<boolean> {
    const cooldownStart = new Date();
    cooldownStart.setHours(cooldownStart.getHours() - this.cooldownHours);

    const recentAlert = await this.prisma.alert.findFirst({
      where: {
        watchId,
        createdAt: { gte: cooldownStart },
        status: 'SENT',
      },
    });

    return !!recentAlert;
  }

  async findByUser(userId: string, skip = 0, take = 50) {
    return this.prisma.alert.findMany({
      where: { userId },
      skip,
      take,
      include: {
        watch: {
          include: {
            listing: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsSent(alertId: string) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  async markAsFailed(alertId: string) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { status: 'FAILED' },
    });
  }
}
