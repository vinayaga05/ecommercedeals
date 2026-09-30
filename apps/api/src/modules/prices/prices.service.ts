import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PriceProvider,
  Retailer,
  PriceFetchResult,
} from '../../common/interfaces/price-provider.interface';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);
  private providerMap: Map<Retailer, PriceProvider>;

  constructor(
    private prisma: PrismaService,
    @Inject('PRICE_PROVIDERS') providers: PriceProvider[],
  ) {
    this.providerMap = new Map();
    providers.forEach((provider) => {
      this.providerMap.set(provider.getRetailer(), provider);
    });
  }

  async fetchAndSavePrice(listingId: string): Promise<any> {
    const listing = await this.prisma.retailerListing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const provider = this.providerMap.get(listing.retailer);
    if (!provider) {
      throw new Error(`No provider for retailer ${listing.retailer}`);
    }

    try {
      const result = await provider.fetchPrice(listing.retailerProductId);

      const latestSnapshot = await this.prisma.priceSnapshot.findFirst({
        where: { listingId },
        orderBy: { createdAt: 'desc' },
      });

      const priceChanged =
        !latestSnapshot ||
        Math.abs(
          result.price.effectivePrice - Number(latestSnapshot.effectivePrice),
        ) > 0.01;

      if (priceChanged) {
        const snapshot = await this.prisma.priceSnapshot.create({
          data: {
            listingId,
            listedPrice: new Decimal(result.price.listedPrice),
            mrp: result.price.mrp ? new Decimal(result.price.mrp) : null,
            couponPrice: result.price.couponPrice
              ? new Decimal(result.price.couponPrice)
              : null,
            bankOffer: result.price.bankOffer
              ? new Decimal(result.price.bankOffer)
              : null,
            bankOfferLabel: result.price.bankOfferLabel || null,
            exchangePrice: result.price.exchangePrice
              ? new Decimal(result.price.exchangePrice)
              : null,
            memberPrice: result.price.memberPrice
              ? new Decimal(result.price.memberPrice)
              : null,
            effectivePrice: new Decimal(result.price.effectivePrice),
            confidence: result.price.confidence,
            currency: result.price.currency,
          },
        });

        await this.prisma.retailerListing.update({
          where: { id: listingId },
          data: {
            lastCheckedAt: new Date(),
            availability: result.product.availability,
            seller: result.product.seller || listing.seller,
          },
        });

        this.logger.log(
          `Price changed for listing ${listingId}: ${result.price.effectivePrice} ${result.price.currency}`,
        );

        return { snapshot, changed: true, result };
      }

      await this.prisma.retailerListing.update({
        where: { id: listingId },
        data: {
          lastCheckedAt: new Date(),
          availability: result.product.availability,
        },
      });

      return { changed: false, result };
    } catch (error) {
      this.logger.error(`Error fetching price for ${listingId}:`, error.message);
      throw error;
    }
  }

  async getPriceHistory(listingId: string, limit = 100) {
    return this.prisma.priceSnapshot.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLowestPrice(listingId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await this.prisma.priceSnapshot.findMany({
      where: {
        listingId,
        createdAt: { gte: since },
      },
      orderBy: { effectivePrice: 'asc' },
      take: 1,
    });

    return snapshots[0] || null;
  }

  parseProductUrl(url: string): { retailer: Retailer; productId: string } | null {
    for (const [retailer, provider] of this.providerMap.entries()) {
      const productId = provider.parseProductId(url);
      if (productId) {
        return { retailer, productId };
      }
    }
    return null;
  }
}
