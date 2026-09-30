import { Test, TestingModule } from '@nestjs/testing';
import { CrossRetailerService } from './cross-retailer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('CrossRetailerService', () => {
  let service: CrossRetailerService;
  let prismaService: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    retailerListing: {
      findUnique: jest.fn(),
    },
    alert: {
      create: jest.fn(),
    },
  };

  const mockNotifications = {
    sendAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossRetailerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
      ],
    }).compile();

    service = module.get<CrossRetailerService>(CrossRetailerService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(
      NotificationsService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should detect cross-retailer price difference', async () => {
    const mockListing = {
      id: 'listing1',
      retailer: 'AMAZON',
      priceSnapshots: [
        {
          effectivePrice: new Decimal(50000),
        },
      ],
      product: {
        name: 'Test Product',
        listings: [
          {
            id: 'listing2',
            retailer: 'FLIPKART',
            availability: true,
            priceSnapshots: [
              {
                effectivePrice: new Decimal(45000),
              },
            ],
          },
        ],
      },
      watches: [
        {
          id: 'watch1',
          userId: 'user1',
          active: true,
        },
      ],
    };

    mockPrisma.retailerListing.findUnique
      .mockResolvedValueOnce(mockListing)
      .mockResolvedValueOnce({
        id: 'listing2',
        watches: [],
      });

    mockPrisma.alert.create.mockResolvedValue({
      id: 'alert1',
      userId: 'user1',
      watchId: 'watch1',
    });

    await service.checkCrossRetailerPrices('listing1');

    expect(mockPrisma.alert.create).toHaveBeenCalled();
    expect(mockNotifications.sendAlert).toHaveBeenCalled();

    const createCall = mockPrisma.alert.create.mock.calls[0][0];
    expect(createCall.data.type).toBe('CROSS_RETAILER');
    expect(createCall.data.message).toContain('FLIPKART');
    expect(createCall.data.message).toContain('45000');
    expect(createCall.data.message).toContain('Save');
  });

  it('should not alert if price difference is small', async () => {
    const mockListing = {
      id: 'listing1',
      retailer: 'AMAZON',
      priceSnapshots: [
        {
          effectivePrice: new Decimal(50000),
        },
      ],
      product: {
        name: 'Test Product',
        listings: [
          {
            id: 'listing2',
            retailer: 'FLIPKART',
            availability: true,
            priceSnapshots: [
              {
                effectivePrice: new Decimal(49500),
              },
            ],
          },
        ],
      },
      watches: [
        {
          id: 'watch1',
          userId: 'user1',
          active: true,
        },
      ],
    };

    mockPrisma.retailerListing.findUnique.mockResolvedValue(mockListing);

    await service.checkCrossRetailerPrices('listing1');

    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockNotifications.sendAlert).not.toHaveBeenCalled();
  });

  it('should alert all users watching either listing', async () => {
    const mockListing = {
      id: 'listing1',
      retailer: 'AMAZON',
      priceSnapshots: [
        {
          effectivePrice: new Decimal(50000),
        },
      ],
      product: {
        name: 'Test Product',
        listings: [
          {
            id: 'listing2',
            retailer: 'FLIPKART',
            availability: true,
            priceSnapshots: [
              {
                effectivePrice: new Decimal(45000),
              },
            ],
          },
        ],
      },
      watches: [
        {
          id: 'watch1',
          userId: 'user1',
          active: true,
        },
      ],
    };

    mockPrisma.retailerListing.findUnique
      .mockResolvedValueOnce(mockListing)
      .mockResolvedValueOnce({
        id: 'listing2',
        watches: [
          {
            id: 'watch2',
            userId: 'user2',
            active: true,
          },
        ],
      });

    mockPrisma.alert.create.mockResolvedValue({
      id: 'alert1',
    });

    await service.checkCrossRetailerPrices('listing1');

    expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
    expect(mockNotifications.sendAlert).toHaveBeenCalledTimes(2);
  });
});
