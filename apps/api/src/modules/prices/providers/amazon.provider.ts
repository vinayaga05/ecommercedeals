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
export class AmazonPriceProvider implements PriceProvider {
  private readonly logger = new Logger(AmazonPriceProvider.name);
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly partnerTag: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    this.accessKey = this.configService.get('AMAZON_ACCESS_KEY');
    this.secretKey = this.configService.get('AMAZON_SECRET_KEY');
    this.partnerTag = this.configService.get('AMAZON_PARTNER_TAG');
    this.region = this.configService.get('AMAZON_REGION', 'in');
  }

  getRetailer(): Retailer {
    return Retailer.AMAZON;
  }

  async fetchPrice(asin: string): Promise<PriceFetchResult> {
    this.ensureConfigured();

    try {
      const result = await this.callCreatorsAPI(asin);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch Amazon price for ${asin}:`, error.message);
      throw error;
    }
  }

  parseProductId(url: string): string | null {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/i,
      /\/gp\/product\/([A-Z0-9]{10})/i,
      /amazon\.[a-z.]+\/([A-Z0-9]{10})/i,
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
    if (!this.accessKey || !this.secretKey || !this.partnerTag) {
      throw new Error(
        'Amazon Creators API credentials not configured. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_PARTNER_TAG.',
      );
    }
  }

  private async callCreatorsAPI(asin: string): Promise<PriceFetchResult> {
    throw new Error(
      'TODO: Implement Amazon Creators API integration. ' +
        'API endpoint and request format to be confirmed from official documentation at https://creators.amazon.in/. ' +
        'Note: Displayed price may vary by delivery location. ' +
        'Current implementation requires actual API shape verification.',
    );
  }
}
