import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FlipkartPriceProvider } from './flipkart.provider';
import { Retailer, PriceConfidence } from '../../../common/interfaces/price-provider.interface';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlipkartPriceProvider', () => {
  let provider: FlipkartPriceProvider;
  let configService: ConfigService;

  const mockAxiosInstance = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlipkartPriceProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FLIPKART_AFFILIATE_ID') return 'test-affiliate-id';
              if (key === 'FLIPKART_AFFILIATE_TOKEN') return 'test-token';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<FlipkartPriceProvider>(FlipkartPriceProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('getRetailer', () => {
    it('should return FLIPKART', () => {
      expect(provider.getRetailer()).toBe(Retailer.FLIPKART);
    });
  });

  describe('parseProductId', () => {
    it('should parse product ID from pid parameter', () => {
      const url = 'https://www.flipkart.com/product?pid=MOBGC9VGHHNHBYZW';
      expect(provider.parseProductId(url)).toBe('MOBGC9VGHHNHBYZW');
    });

    it('should parse product ID from /p/itm format', () => {
      const url = 'https://www.flipkart.com/product/p/itmabc123xyz';
      expect(provider.parseProductId(url)).toBe('abc123xyz');
    });

    it('should parse product ID from complex URL', () => {
      const url = 'https://www.flipkart.com/samsung-galaxy-m34/p/MOBGC9VGHHNHBYZW';
      expect(provider.parseProductId(url)).toBe('MOBGC9VGHHNHBYZW');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://example.com/product';
      expect(provider.parseProductId(url)).toBeNull();
    });
  });

  describe('fetchPrice', () => {
    it('should fetch and parse product with full price breakdown', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Samsung Galaxy M34 5G (Midnight Blue, 128 GB)',
            productBrand: 'Samsung',
            productCategory: 'Mobiles & Accessories',
            imageUrls: [{ '400': 'https://example.com/image.jpg', '800': 'https://example.com/image-large.jpg' }],
            productDescription: '8 GB RAM | 128 GB ROM',
            availability: true,
            inStock: true,
          },
          productShippingInfoV1: {
            sellerName: 'RetailNet',
          },
          productBaseInfo: {
            maximumRetailPrice: { amount: 27999, currency: 'INR' },
            flipkartSellingPrice: { amount: 22999, currency: 'INR' },
            flipkartSpecialPrice: { amount: 21499, currency: 'INR' },
            offers: [
              {
                type: 'bank_offer',
                title: 'HDFC Bank Credit Card',
                description: 'Extra 5% off',
                discountAmount: 1000,
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await provider.fetchPrice('MOBGC9VGHHNHBYZW');

      expect(result.price.listedPrice).toBe(22999);
      expect(result.price.mrp).toBe(27999);
      expect(result.price.couponPrice).toBe(21499);
      expect(result.price.bankOffer).toBe(1000);
      expect(result.price.bankOfferLabel).toBe('HDFC Bank Credit Card');
      expect(result.price.effectivePrice).toBe(21499);
      expect(result.price.confidence).toBe(PriceConfidence.CONDITIONAL);
      expect(result.price.currency).toBe('INR');

      expect(result.product.name).toBe('Samsung Galaxy M34 5G (Midnight Blue, 128 GB)');
      expect(result.product.brand).toBe('Samsung');
      expect(result.product.category).toBe('Mobiles & Accessories');
      expect(result.product.seller).toBe('RetailNet');
      expect(result.product.availability).toBe(true);
    });

    it('should handle out of stock products', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Out of Stock Product',
            availability: false,
            inStock: false,
          },
          productBaseInfo: {
            maximumRetailPrice: { amount: 10000 },
            flipkartSellingPrice: { amount: 9000 },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await provider.fetchPrice('TEST123');

      expect(result.product.availability).toBe(false);
      expect(result.price.confidence).toBe(PriceConfidence.ESTIMATED);
    });

    it('should retry on rate limit (429)', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Test Product',
            availability: true,
          },
          productBaseInfo: {
            flipkartSellingPrice: { amount: 5000 },
          },
        },
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 429 },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 429 },
        })
        .mockResolvedValueOnce(mockResponse);

      const result = await provider.fetchPrice('TEST123');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result.product.name).toBe('Test Product');
    });

    it('should throw error on 404', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 404 },
      });

      await expect(provider.fetchPrice('NOTFOUND')).rejects.toThrow(
        'Product NOTFOUND not found on Flipkart',
      );
    });

    it('should throw error on authentication failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        isAxiosError: true,
        response: { status: 401 },
      });

      await expect(provider.fetchPrice('TEST123')).rejects.toThrow(
        'Flipkart API authentication failed',
      );
    });

    it('should retry on server errors', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Test Product',
            availability: true,
          },
          productBaseInfo: {
            flipkartSellingPrice: { amount: 5000 },
          },
        },
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 500 },
        })
        .mockResolvedValueOnce(mockResponse);

      const result = await provider.fetchPrice('TEST123');

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.product.name).toBe('Test Product');
    });

    it('should handle products without offers', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Simple Product',
            availability: true,
          },
          productBaseInfo: {
            maximumRetailPrice: { amount: 5000 },
            flipkartSellingPrice: { amount: 4500 },
            offers: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await provider.fetchPrice('SIMPLE123');

      expect(result.price.bankOffer).toBeUndefined();
      expect(result.price.bankOfferLabel).toBeUndefined();
      expect(result.price.confidence).toBe(PriceConfidence.CONFIRMED);
    });

    it('should handle string availability format', async () => {
      const mockResponse = {
        data: {
          productBaseInfoV1: {
            title: 'Test Product',
          },
          productBaseInfo: {
            availability: 'In Stock',
            flipkartSellingPrice: { amount: 5000 },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await provider.fetchPrice('TEST123');

      expect(result.product.availability).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('should return true when credentials are configured', async () => {
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });

    it('should return false when credentials are missing', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FlipkartPriceProvider,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
        ],
      }).compile();

      const providerWithoutCreds = module.get<FlipkartPriceProvider>(
        FlipkartPriceProvider,
      );

      const healthy = await providerWithoutCreds.isHealthy();
      expect(healthy).toBe(false);
    });
  });
});
