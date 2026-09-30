import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PricesService } from '../prices/prices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

describe('AlertsService', () => {
  let service: AlertsService;
  let prismaService: PrismaService;

  const mockPrisma = {
    alert: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPricesService = {
    getLowestPrice: jest.fn(),
  };

  const mockNotificationsService = {
    sendAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PricesService,
          useValue: mockPricesService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateWatchRules', () => {
    beforeEach(() => {
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({
        id: 'alert1',
        userId: 'user1',
        watchId: 'watch1',
      });
    });

    it('should trigger alert when price meets target', async () => {
      const watch = {
        id: 'watch1',
        userId: 'user1',
        active: true,
        targetPrice: new Decimal(50000),
      };

      const currentPrice = new Decimal(49000);
      const previousPrice = new Decimal(55000);

      const alerts = await service.evaluateWatchRules(
        [watch],
        currentPrice,
        previousPrice,
        'listing1',
      );

      expect(alerts.length).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalled();
    });

    it('should trigger alert when drop percentage threshold is met', async () => {
      const watch = {
        id: 'watch1',
        userId: 'user1',
        active: true,
        dropPercentage: 10,
      };

      const currentPrice = new Decimal(45000);
      const previousPrice = new Decimal(55000);

      const alerts = await service.evaluateWatchRules(
        [watch],
        currentPrice,
        previousPrice,
        'listing1',
      );

      expect(alerts.length).toBe(1);
    });

    it('should trigger alert for lowest in 30 days', async () => {
      const watch = {
        id: 'watch1',
        userId: 'user1',
        active: true,
        lowestIn30Days: true,
      };

      const currentPrice = new Decimal(48000);
      mockPricesService.getLowestPrice.mockResolvedValue({
        effectivePrice: new Decimal(50000),
      });

      const alerts = await service.evaluateWatchRules(
        [watch],
        currentPrice,
        null,
        'listing1',
      );

      expect(alerts.length).toBe(1);
      expect(mockPricesService.getLowestPrice).toHaveBeenCalledWith('listing1', 30);
    });

    it('should not trigger alert when in cooldown', async () => {
      const watch = {
        id: 'watch1',
        userId: 'user1',
        active: true,
        targetPrice: new Decimal(50000),
      };

      mockPrisma.alert.findFirst.mockResolvedValue({
        id: 'recent-alert',
        createdAt: new Date(),
      });

      const currentPrice = new Decimal(49000);
      const alerts = await service.evaluateWatchRules(
        [watch],
        currentPrice,
        null,
        'listing1',
      );

      expect(alerts.length).toBe(0);
    });
  });
});
