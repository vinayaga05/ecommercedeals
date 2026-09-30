export enum Retailer {
  AMAZON = 'AMAZON',
  FLIPKART = 'FLIPKART',
}

export enum PriceConfidence {
  CONFIRMED = 'CONFIRMED',
  CONDITIONAL = 'CONDITIONAL',
  ESTIMATED = 'ESTIMATED',
}

export interface PriceBreakdown {
  listedPrice: number;
  mrp?: number;
  couponPrice?: number;
  bankOffer?: number;
  bankOfferLabel?: string;
  exchangePrice?: number;
  memberPrice?: number;
  effectivePrice: number;
  confidence: PriceConfidence;
  currency: string;
}

export interface ProductInfo {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  seller?: string;
  availability: boolean;
}

export interface PriceFetchResult {
  price: PriceBreakdown;
  product: ProductInfo;
}

export interface PriceProvider {
  getRetailer(): Retailer;
  
  fetchPrice(productId: string): Promise<PriceFetchResult>;
  
  parseProductId(url: string): string | null;
  
  isHealthy(): Promise<boolean>;
}
