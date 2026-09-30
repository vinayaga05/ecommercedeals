import { MockPriceProvider } from './mock.provider';
import { Retailer } from '../../../common/interfaces/price-provider.interface';

describe('MockPriceProvider', () => {
  let provider: MockPriceProvider;

  beforeEach(() => {
    provider = new MockPriceProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('parseProductId', () => {
    it('should parse Amazon ASIN from URL', () => {
      const url = 'https://www.amazon.in/dp/B08N5WRWNW';
      const productId = provider.parseProductId(url);
      expect(productId).toBe('B08N5WRWNW');
    });

    it('should parse Amazon ASIN from gp/product URL', () => {
      const url = 'https://www.amazon.in/gp/product/B08N5WRWNW';
      const productId = provider.parseProductId(url);
      expect(productId).toBe('B08N5WRWNW');
    });

    it('should parse Flipkart product ID from pid parameter', () => {
      const url = 'https://www.flipkart.com/product?pid=MOBGC9VGHHNHBYZW';
      const productId = provider.parseProductId(url);
      expect(productId).toBe('MOBGC9VGHHNHBYZW');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/product';
      const productId = provider.parseProductId(url);
      expect(productId).toBeNull();
    });

    it('should handle mixed case URLs', () => {
      const url = 'https://www.amazon.IN/DP/B08N5WRWNW';
      const productId = provider.parseProductId(url);
      expect(productId).toBe('B08N5WRWNW');
    });
  });

  describe('fetchPrice', () => {
    it('should return price data for known product', async () => {
      const result = await provider.fetchPrice('B08N5WRWNW');

      expect(result).toBeDefined();
      expect(result.price).toBeDefined();
      expect(result.product).toBeDefined();
      expect(result.price.effectivePrice).toBeGreaterThan(0);
      expect(result.price.currency).toBe('INR');
    });

    it('should generate data for unknown product', async () => {
      const result = await provider.fetchPrice('UNKNOWN123');

      expect(result).toBeDefined();
      expect(result.price.effectivePrice).toBeGreaterThan(0);
      expect(result.product.name).toContain('UNKNOWN123');
    });

    it('should add price variation on subsequent calls', async () => {
      const result1 = await provider.fetchPrice('B08N5WRWNW');
      const result2 = await provider.fetchPrice('B08N5WRWNW');

      const diff = Math.abs(result1.price.effectivePrice - result2.price.effectivePrice);
      expect(diff).toBeGreaterThan(0);
    });
  });

  describe('isHealthy', () => {
    it('should always return true for mock provider', async () => {
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('getRetailer', () => {
    it('should return AMAZON', () => {
      expect(provider.getRetailer()).toBe(Retailer.AMAZON);
    });
  });
});
