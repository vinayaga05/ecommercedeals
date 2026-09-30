import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  PriceProvider,
  Retailer,
  PriceFetchResult,
  PriceConfidence,
} from '../../../common/interfaces/price-provider.interface';

interface FlipkartProductResponse {
  productBaseInfoV1?: {
    title?: string;
    imageUrls?: { 400: string; 800: string }[];
    productBrand?: string;
    productCategory?: string;
    productDescription?: string;
    availability?: boolean;
    inStock?: boolean;
  };
  productShippingInfoV1?: {
    sellerName?: string;
  };
  productBaseInfo?: {
    productId?: string;
    title?: string;
    imageUrls?: string[];
    maximumRetailPrice?: { amount?: number; currency?: string };
    flipkartSellingPrice?: { amount?: number; currency?: string };
    flipkartSpecialPrice?: { amount?: number; currency?: string };
    offers?: Array<{
      type?: string;
      title?: string;
      description?: string;
      discountAmount?: number;
    }>;
    productUrl?: string;
    availability?: string;
  };
}

@Injectable()
export class FlipkartPriceProvider implements PriceProvider {
  private readonly logger = new Logger(FlipkartPriceProvider.name);
  private readonly affiliateId: string;
  private readonly affiliateToken: string;
  private readonly apiBaseUrl = 'https://affiliate-api.flipkart.net/affiliate';
  private readonly axiosInstance: AxiosInstance;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000;

  constructor(private configService: ConfigService) {
    this.affiliateId = this.configService.get('FLIPKART_AFFILIATE_ID');
    this.affiliateToken = this.configService.get('FLIPKART_AFFILIATE_TOKEN');

    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 10000,
      headers: {
        'Fk-Affiliate-Id': this.affiliateId || '',
        'Fk-Affiliate-Token': this.affiliateToken || '',
        'Accept': 'application/json',
      },
    });
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
      this.logger.error(
        `Failed to fetch Flipkart price for ${productId}:`,
        error.message,
      );
      throw error;
    }
  }

  parseProductId(url: string): string | null {
    const patterns = [
      /pid=([A-Z0-9]+)/i,
      /\/p\/itm([a-z0-9]+)/i,
      /flipkart\.com\/.*\/([A-Z0-9]+)\/p/i,
      /flipkart\.com\/[^\/]+\/p\/itm([a-z0-9]+)/i,
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

  private async callAffiliateAPI(
    productId: string,
    retryCount = 0,
  ): Promise<PriceFetchResult> {
    try {
      const response = await this.axiosInstance.get<FlipkartProductResponse>(
        `/product/json`,
        {
          params: { id: productId },
        },
      );

      if (!response.data) {
        throw new Error('Empty response from Flipkart API');
      }

      return this.parseFlipkartResponse(response.data, productId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 429 && retryCount < this.maxRetries) {
          const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
          this.logger.warn(
            `Rate limit hit for ${productId}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
          );
          await this.sleep(backoffDelay);
          return this.callAffiliateAPI(productId, retryCount + 1);
        }

        if (status === 404) {
          throw new Error(`Product ${productId} not found on Flipkart`);
        }

        if (status === 401 || status === 403) {
          throw new Error(
            'Flipkart API authentication failed. Check FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN.',
          );
        }

        if (status && status >= 500 && retryCount < this.maxRetries) {
          const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
          this.logger.warn(
            `Server error for ${productId}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
          );
          await this.sleep(backoffDelay);
          return this.callAffiliateAPI(productId, retryCount + 1);
        }
      }

      throw error;
    }
  }

  private parseFlipkartResponse(
    data: FlipkartProductResponse,
    productId: string,
  ): PriceFetchResult {
    const productInfo = data.productBaseInfoV1 || data.productBaseInfo;

    if (!productInfo) {
      throw new Error('Invalid response format from Flipkart API');
    }

    const mrp = this.extractPrice(productInfo, 'mrp');
    const sellingPrice = this.extractPrice(productInfo, 'selling');
    const specialPrice = this.extractPrice(productInfo, 'special');

    const availability = this.parseAvailability(productInfo);
    const offers = this.parseOffers(productInfo);

    const effectivePrice = specialPrice || sellingPrice || mrp || 0;
    const listedPrice = sellingPrice || mrp || effectivePrice;

    let confidence = PriceConfidence.CONFIRMED;
    if (!availability) {
      confidence = PriceConfidence.ESTIMATED;
    } else if (specialPrice && offers.length > 0) {
      confidence = PriceConfidence.CONDITIONAL;
    }

    const bankOffer = offers.find((o) => o.type?.includes('bank'))
      ? offers[0].discountAmount
      : undefined;
    const bankOfferLabel = bankOffer
      ? offers.find((o) => o.type?.includes('bank'))?.title
      : undefined;

    return {
      price: {
        listedPrice: listedPrice,
        mrp: mrp,
        couponPrice: specialPrice,
        bankOffer: bankOffer,
        bankOfferLabel: bankOfferLabel,
        effectivePrice: effectivePrice,
        confidence: confidence,
        currency: 'INR',
      },
      product: {
        name:
          productInfo.title ||
          (productInfo as any).productTitle ||
          `Flipkart Product ${productId}`,
        brand: productInfo.productBrand,
        category: productInfo.productCategory,
        imageUrl: this.extractImageUrl(productInfo),
        description: productInfo.productDescription,
        seller:
          data.productShippingInfoV1?.sellerName ||
          (productInfo as any).sellerName ||
          'Flipkart',
        availability: availability,
      },
    };
  }

  private extractPrice(
    productInfo: any,
    type: 'mrp' | 'selling' | 'special',
  ): number | undefined {
    if (type === 'mrp') {
      return (
        productInfo.maximumRetailPrice?.amount ||
        productInfo.mrp?.amount ||
        productInfo.maximumRetailPrice
      );
    } else if (type === 'selling') {
      return (
        productInfo.flipkartSellingPrice?.amount ||
        productInfo.sellingPrice?.amount ||
        productInfo.flipkartSellingPrice
      );
    } else if (type === 'special') {
      return (
        productInfo.flipkartSpecialPrice?.amount ||
        productInfo.specialPrice?.amount ||
        productInfo.flipkartSpecialPrice
      );
    }
    return undefined;
  }

  private parseAvailability(productInfo: any): boolean {
    if (typeof productInfo.availability === 'boolean') {
      return productInfo.availability;
    }
    if (typeof productInfo.inStock === 'boolean') {
      return productInfo.inStock;
    }
    if (typeof productInfo.availability === 'string') {
      const avail = productInfo.availability.toLowerCase();
      return avail === 'in stock' || avail === 'available' || avail === 'true';
    }
    return true;
  }

  private parseOffers(productInfo: any): Array<{
    type?: string;
    title?: string;
    description?: string;
    discountAmount?: number;
  }> {
    if (Array.isArray(productInfo.offers)) {
      return productInfo.offers;
    }
    return [];
  }

  private extractImageUrl(productInfo: any): string | undefined {
    if (Array.isArray(productInfo.imageUrls) && productInfo.imageUrls.length > 0) {
      const firstImage = productInfo.imageUrls[0];
      if (typeof firstImage === 'object' && firstImage['400']) {
        return firstImage['400'];
      }
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

