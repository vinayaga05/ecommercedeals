import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertType } from '@prisma/client';

@Injectable()
export class DailyDigestService {
  private readonly logger = new Logger(DailyDigestService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyDigests() {
    this.logger.log('Starting daily digest job...');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          watches: {
            some: {
              active: true,
            },
          },
        },
        include: {
          watches: {
            where: { active: true },
            include: {
              listing: {
                include: {
                  product: true,
                  priceSnapshots: {
                    where: {
                      createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      },
                    },
                    orderBy: { createdAt: 'desc' },
                  },
                },
              },
            },
          },
        },
      });

      for (const user of users) {
        await this.generateDigestForUser(user);
      }

      this.logger.log(`Sent daily digests to ${users.length} users`);
    } catch (error) {
      this.logger.error('Error sending daily digests:', error);
    }
  }

  private async generateDigestForUser(user: any) {
    const droppedProducts = [];

    for (const watch of user.watches) {
      const snapshots = watch.listing.priceSnapshots;
      if (snapshots.length >= 2) {
        const latest = snapshots[0];
        const previous = snapshots[1];

        const latestPrice = Number(latest.effectivePrice);
        const previousPrice = Number(previous.effectivePrice);

        if (latestPrice < previousPrice) {
          const dropAmount = previousPrice - latestPrice;
          const dropPercent = (dropAmount / previousPrice) * 100;

          droppedProducts.push({
            productName: watch.listing.product.name,
            previousPrice,
            currentPrice: latestPrice,
            dropAmount,
            dropPercent,
            retailer: watch.listing.retailer,
          });
        }
      }
    }

    if (droppedProducts.length === 0) {
      return;
    }

    const message = this.buildDigestMessage(droppedProducts);

    const alert = await this.prisma.alert.create({
      data: {
        userId: user.id,
        watchId: user.watches[0].id,
        type: AlertType.DAILY_DIGEST,
        message,
        effectivePrice: 0,
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

    this.logger.log(
      `Sent digest to ${user.email}: ${droppedProducts.length} products dropped`,
    );
  }

  private buildDigestMessage(droppedProducts: any[]): string {
    const count = droppedProducts.length;
    let message = `Daily Digest: ${count} watched product${count > 1 ? 's' : ''} dropped in price!\n\n`;

    for (const product of droppedProducts.slice(0, 5)) {
      message += `• ${product.productName}\n`;
      message += `  ${product.retailer}: ₹${product.previousPrice.toFixed(2)} → ₹${product.currentPrice.toFixed(2)}`;
      message += ` (${product.dropPercent.toFixed(1)}% off)\n\n`;
    }

    if (count > 5) {
      message += `...and ${count - 5} more products`;
    }

    return message;
  }

  async generateDigestNow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        watches: {
          where: { active: true },
          include: {
            listing: {
              include: {
                product: true,
                priceSnapshots: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await this.generateDigestForUser(user);
  }
}
