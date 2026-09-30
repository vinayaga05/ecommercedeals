import { Test, TestingModule } from '@nestjs/testing';
import { DailyDigestService } from './daily-digest.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('DailyDigestService', () => {
  let service: DailyDigestService;
  let prismaService: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
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
        DailyDigestService,
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

    service = module.get<DailyDigestService>(DailyDigestService);
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

  it('should generate digest for user with price drops', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      watches: [
        {
          id: 'watch1',
          listing: {
            retailer: 'AMAZON',
            product: {
              name: 'Test Product',
            },
            priceSnapshots: [
              {
                effectivePrice: new Decimal(45000),
                createdAt: new Date(),
              },
              {
                effectivePrice: new Decimal(50000),
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              },
            ],
          },
        },
      ],
    };

    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.alert.create.mockResolvedValue({
      id: 'alert1',
      userId: 'user1',
      watchId: 'watch1',
    });

    await service.sendDailyDigests();

    expect(mockPrisma.alert.create).toHaveBeenCalled();
    expect(mockNotifications.sendAlert).toHaveBeenCalled();

    const createCall = mockPrisma.alert.create.mock.calls[0][0];
    expect(createCall.data.type).toBe('DAILY_DIGEST');
    expect(createCall.data.message).toContain('1 watched product');
    expect(createCall.data.message).toContain('Test Product');
  });

  it('should not send digest if no price drops', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      watches: [
        {
          id: 'watch1',
          listing: {
            product: {
              name: 'Test Product',
            },
            priceSnapshots: [
              {
                effectivePrice: new Decimal(50000),
                createdAt: new Date(),
              },
              {
                effectivePrice: new Decimal(50000),
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              },
            ],
          },
        },
      ],
    };

    mockPrisma.user.findMany.mockResolvedValue([mockUser]);

    await service.sendDailyDigests();

    expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    expect(mockNotifications.sendAlert).not.toHaveBeenCalled();
  });

  it('should handle multiple products in digest', async () => {
    const mockUser = {
      id: 'user1',
      email: 'test@example.com',
      watches: [
        {
          id: 'watch1',
          listing: {
            retailer: 'AMAZON',
            product: { name: 'Product 1' },
            priceSnapshots: [
              { effectivePrice: new Decimal(40000), createdAt: new Date() },
              {
                effectivePrice: new Decimal(50000),
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              },
            ],
          },
        },
        {
          id: 'watch2',
          listing: {
            retailer: 'FLIPKART',
            product: { name: 'Product 2' },
            priceSnapshots: [
              { effectivePrice: new Decimal(20000), createdAt: new Date() },
              {
                effectivePrice: new Decimal(25000),
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
              },
            ],
          },
        },
      ],
    };

    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.alert.create.mockResolvedValue({
      id: 'alert1',
      userId: 'user1',
      watchId: 'watch1',
    });

    await service.sendDailyDigests();

    const createCall = mockPrisma.alert.create.mock.calls[0][0];
    expect(createCall.data.message).toContain('2 watched products');
    expect(createCall.data.message).toContain('Product 1');
    expect(createCall.data.message).toContain('Product 2');
  });
});
