import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricesService } from '../prices/prices.service';
import { Priority } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private pricesService: PricesService,
  ) {}

  async createFromUrl(url: string, userId?: string) {
    const parsed = this.pricesService.parseProductUrl(url);
    if (!parsed) {
      throw new Error('Invalid product URL. Must be from Amazon.in or Flipkart.com');
    }

    const { retailer, productId } = parsed;

    let listing = await this.prisma.retailerListing.findUnique({
      where: {
        retailer_retailerProductId: {
          retailer,
          retailerProductId: productId,
        },
      },
      include: { product: true },
    });

    if (listing) {
      this.logger.log(`Listing already exists: ${listing.id}`);
      return listing;
    }

    const priceData = await this.pricesService['providerMap']
      .get(retailer)
      .fetchPrice(productId);

    const product = await this.prisma.product.create({
      data: {
        name: priceData.product.name,
        brand: priceData.product.brand,
        category: priceData.product.category,
        imageUrl: priceData.product.imageUrl,
        description: priceData.product.description,
      },
    });

    listing = await this.prisma.retailerListing.create({
      data: {
        productId: product.id,
        retailer,
        retailerProductId: productId,
        url,
        seller: priceData.product.seller,
        availability: priceData.product.availability,
        priority: Priority.NORMAL,
        nextCheckAt: this.calculateNextCheckAt(Priority.NORMAL, true),
      },
      include: { product: true },
    });

    await this.prisma.priceSnapshot.create({
      data: {
        listingId: listing.id,
        listedPrice: priceData.price.listedPrice,
        mrp: priceData.price.mrp,
        couponPrice: priceData.price.couponPrice,
        bankOffer: priceData.price.bankOffer,
        bankOfferLabel: priceData.price.bankOfferLabel,
        exchangePrice: priceData.price.exchangePrice,
        memberPrice: priceData.price.memberPrice,
        effectivePrice: priceData.price.effectivePrice,
        confidence: priceData.price.confidence,
        currency: priceData.price.currency,
      },
    });

    this.logger.log(`Created product ${product.id} and listing ${listing.id}`);
    return listing;
  }

  async findAll(skip = 0, take = 20) {
    return this.prisma.product.findMany({
      skip,
      take,
      include: {
        listings: {
          include: {
            priceSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        listings: {
          include: {
            priceSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    });
  }

  private calculateNextCheckAt(priority: Priority, available: boolean): Date {
    const now = new Date();
    let hoursToAdd: number;

    if (!available) {
      hoursToAdd = 6 + Math.random() * 6;
    } else {
      switch (priority) {
        case Priority.URGENT:
          hoursToAdd = 0.25 + Math.random() * 0.25;
          break;
        case Priority.HIGH:
          hoursToAdd = 4 + Math.random() * 2;
          break;
        case Priority.NORMAL:
        default:
          hoursToAdd = 12 + Math.random() * 12;
      }
    }

    now.setHours(now.getHours() + hoursToAdd);
    return now;
  }
}
