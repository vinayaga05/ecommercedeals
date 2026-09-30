import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PriceProvider,
  Retailer,
  PriceFetchResult,
  PriceConfidence,
} from '../../../common/interfaces/price-provider.interface';

@Injectable()
export class FlipkartPriceProvider implements PriceProvider {
  private readonly logger = new Logger(FlipkartPriceProvider.name);
  private readonly affiliateId: string;
  private readonly affiliateToken: string;
  private readonly apiBaseUrl = 'https://affiliate-api.flipkart.net/affiliate/api';

  constructor(private configService: ConfigService) {
    this.affiliateId = this.configService.get('FLIPKART_AFFILIATE_ID');
    this.affiliateToken = this.configService.get('FLIPKART_AFFILIATE_TOKEN');
  }

  getRetailer(): Retailer {
    return Retailer.FLIPKART;
  }

  async fetchPrice(productId: string): Promise<PriceFetchResult> {
    this.ensureConfigured();

    try {
      const result = await this.callAffiliateAPI(productId);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch Flipkart price for ${productId}:`, error.message);
      throw error;
    }
  }

  parseProductId(url: string): string | null {
    const patterns = [
      /pid=([A-Z0-9]+)/i,
      /\/p\/itm([a-z0-9]+)/i,
      /flipkart\.com\/.*\/([A-Z0-9]+)\/p/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  async isHealthy(): Promise<boolean> {
    try {
      this.ensureConfigured();
      return true;
    } catch {
      return false;
    }
  }

  private ensureConfigured() {
    if (!this.affiliateId || !this.affiliateToken) {
      throw new Error(
        'Flipkart Affiliate API credentials not configured. Set FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN.',
      );
    }
  }

  private async callAffiliateAPI(productId: string): Promise<PriceFetchResult> {
    throw new Error(
      'TODO: Implement Flipkart Affiliate API integration. ' +
        'Refer to https://affiliate.flipkart.com/ for API documentation. ' +
        'Typical endpoint: GET /affiliate/product/json?id={productId} ' +
        'Headers: Fk-Affiliate-Id, Fk-Affiliate-Token. ' +
        'Current implementation requires actual API shape verification.',
    );
  }
}
