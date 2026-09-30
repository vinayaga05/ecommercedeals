import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertType, Retailer } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CrossRetailerService {
  private readonly logger = new Logger(CrossRetailerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async checkCrossRetailerPrices(listingId: string) {
    const listing = await this.prisma.retailerListing.findUnique({
      where: { id: listingId },
      include: {
        product: {
          include: {
            listings: {
              where: {
                id: { not: listingId },
                availability: true,
              },
              include: {
                priceSnapshots: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        priceSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        watches: {
          where: { active: true },
          include: { user: true },
        },
      },
    });

    if (!listing || !listing.priceSnapshots[0]) {
      return;
    }

    const currentPrice = Number(listing.priceSnapshots[0].effectivePrice);
    const currentRetailer = listing.retailer;

    for (const otherListing of listing.product.listings) {
      if (
        otherListing.retailer === currentRetailer ||
        otherListing.priceSnapshots.length === 0
      ) {
        continue;
      }

      const otherPrice = Number(otherListing.priceSnapshots[0].effectivePrice);
      const priceDiff = Math.abs(currentPrice - otherPrice);
      const percentDiff = (priceDiff / Math.max(currentPrice, otherPrice)) * 100;

      if (percentDiff >= 5) {
        await this.sendCrossRetailerAlerts(
          listing,
          otherListing,
          currentPrice,
          otherPrice,
        );
      }
    }
  }

  private async sendCrossRetailerAlerts(
    listing1: any,
    listing2: any,
    price1: number,
    price2: number,
  ) {
    const cheaper = price1 < price2 ? listing1 : listing2;
    const expensive = price1 < price2 ? listing2 : listing1;
    const cheaperPrice = Math.min(price1, price2);
    const expensivePrice = Math.max(price1, price2);
    const savings = expensivePrice - cheaperPrice;
    const savingsPercent = (savings / expensivePrice) * 100;

    const message = `Cross-retailer price difference found!\n` +
      `${cheaper.retailer} has this product for ₹${cheaperPrice.toFixed(2)}\n` +
      `${expensive.retailer} price: ₹${expensivePrice.toFixed(2)}\n` +
      `Save ₹${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%) by buying from ${cheaper.retailer}`;

    const usersToAlert = new Set<string>();

    for (const watch of listing1.watches) {
      usersToAlert.add(watch.userId);
    }

    const listing2WithWatches = await this.prisma.retailerListing.findUnique({
      where: { id: listing2.id },
      include: {
        watches: {
          where: { active: true },
        },
      },
    });

    if (listing2WithWatches) {
      for (const watch of listing2WithWatches.watches) {
        usersToAlert.add(watch.userId);
      }
    }

    for (const userId of usersToAlert) {
      const watchId =
        listing1.watches.find((w) => w.userId === userId)?.id ||
        listing2WithWatches?.watches.find((w) => w.userId === userId)?.id;

      if (!watchId) continue;

      const alert = await this.prisma.alert.create({
        data: {
          userId,
          watchId,
          type: AlertType.CROSS_RETAILER,
          message,
          effectivePrice: new Decimal(cheaperPrice),
          previousPrice: new Decimal(expensivePrice),
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
    }

    this.logger.log(
      `Sent cross-retailer alerts for ${listing1.product.name}: ${cheaper.retailer} ₹${cheaperPrice} vs ${expensive.retailer} ₹${expensivePrice}`,
    );
  }
}
