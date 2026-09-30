import { Injectable } from '@nestjs/common';
import {
  PriceProvider,
  Retailer,
  PriceFetchResult,
  PriceConfidence,
} from '../../../common/interfaces/price-provider.interface';

@Injectable()
export class MockPriceProvider implements PriceProvider {
  private mockData: Map<string, PriceFetchResult> = new Map();

  constructor() {
    this.seedMockData();
  }

  getRetailer(): Retailer {
    return Retailer.AMAZON;
  }

  async fetchPrice(productId: string): Promise<PriceFetchResult> {
    await this.simulateDelay();

    if (this.mockData.has(productId)) {
      const data = this.mockData.get(productId);
      return this.addPriceVariation(data);
    }

    return this.generateRandomProduct(productId);
  }

  parseProductId(url: string): string | null {
    const amazonMatch = url.match(/\/dp\/([A-Z0-9]{10})/i);
    if (amazonMatch) return amazonMatch[1];

    const flipkartMatch = url.match(/pid=([A-Z0-9]+)/i);
    if (flipkartMatch) return flipkartMatch[1];

    const genericMatch = url.match(/product[_-]?id[=_]([A-Z0-9]+)/i);
    if (genericMatch) return genericMatch[1];

    return null;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  private seedMockData() {
    this.mockData.set('B08N5WRWNW', {
      price: {
        listedPrice: 59999,
        mrp: 69999,
        couponPrice: 57999,
        bankOffer: 56999,
        bankOfferLabel: 'HDFC Credit Card',
        memberPrice: 56499,
        effectivePrice: 56499,
        confidence: PriceConfidence.CONFIRMED,
        currency: 'INR',
      },
      product: {
        name: 'Apple iPhone 13 (128GB) - Midnight',
        brand: 'Apple',
        category: 'Electronics > Mobiles',
        imageUrl: 'https://m.media-amazon.com/images/I/61VuVU94RnL._SL1500_.jpg',
        description: '15.40 cm (6.1-inch) Super Retina XDR display',
        seller: 'Amazon.in',
        availability: true,
      },
    });

    this.mockData.set('MOBGC9VGHHNHBYZW', {
      price: {
        listedPrice: 22999,
        mrp: 27999,
        couponPrice: 21999,
        memberPrice: 21499,
        effectivePrice: 21499,
        confidence: PriceConfidence.CONFIRMED,
        currency: 'INR',
      },
      product: {
        name: 'SAMSUNG Galaxy M34 5G (Midnight Blue, 128 GB)',
        brand: 'Samsung',
        category: 'Mobiles & Accessories',
        imageUrl: 'https://rukminim2.flixcart.com/image/416/416/xif0q/mobile/v/9/y/-original-imagshxfb4zpvzq2.jpeg',
        description: '8 GB RAM | 128 GB ROM',
        seller: 'RetailNet',
        availability: true,
      },
    });
  }

  private generateRandomProduct(productId: string): PriceFetchResult {
    const basePrice = Math.floor(Math.random() * 50000) + 5000;
    const mrp = basePrice * 1.2;

    return {
      price: {
        listedPrice: basePrice,
        mrp,
        effectivePrice: basePrice,
        confidence: PriceConfidence.ESTIMATED,
        currency: 'INR',
      },
      product: {
        name: `Product ${productId}`,
        brand: 'Generic',
        category: 'Electronics',
        seller: 'Mock Seller',
        availability: true,
      },
    };
  }

  private addPriceVariation(data: PriceFetchResult): PriceFetchResult {
    const variation = (Math.random() - 0.5) * 0.1;
    const newPrice = Math.floor(data.price.effectivePrice * (1 + variation));

    return {
      ...data,
      price: {
        ...data.price,
        listedPrice: newPrice,
        effectivePrice: newPrice,
      },
    };
  }

  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 500 + 200;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
