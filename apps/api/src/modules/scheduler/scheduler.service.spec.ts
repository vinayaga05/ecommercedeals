import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { Priority } from '@prisma/client';

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    const mockQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: PrismaService,
          useValue: {
            retailerListing: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: CampaignsService,
          useValue: {
            findActive: jest.fn(),
          },
        },
        {
          provide: getQueueToken('price-check'),
          useValue: mockQueue,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateNextCheckAt', () => {
    it('should schedule urgent checks every 15-30 minutes', () => {
      const now = new Date();
      const nextCheck = service.calculateNextCheckAt(Priority.URGENT, true, false);
      const diffMinutes = (nextCheck.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(15);
      expect(diffMinutes).toBeLessThanOrEqual(30);
    });

    it('should schedule high priority checks every 4-6 hours', () => {
      const now = new Date();
      const nextCheck = service.calculateNextCheckAt(Priority.HIGH, true, false);
      const diffMinutes = (nextCheck.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(240);
      expect(diffMinutes).toBeLessThanOrEqual(360);
    });

    it('should schedule normal checks every 12-24 hours', () => {
      const now = new Date();
      const nextCheck = service.calculateNextCheckAt(Priority.NORMAL, true, false);
      const diffMinutes = (nextCheck.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(720);
      expect(diffMinutes).toBeLessThanOrEqual(1440);
    });

    it('should schedule out-of-stock items every 6-12 hours', () => {
      const now = new Date();
      const nextCheck = service.calculateNextCheckAt(Priority.NORMAL, false, false);
      const diffMinutes = (nextCheck.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(360);
      expect(diffMinutes).toBeLessThanOrEqual(720);
    });

    it('should schedule campaign items every 15-30 minutes', () => {
      const now = new Date();
      const nextCheck = service.calculateNextCheckAt(Priority.NORMAL, true, true);
      const diffMinutes = (nextCheck.getTime() - now.getTime()) / 1000 / 60;

      expect(diffMinutes).toBeGreaterThanOrEqual(15);
      expect(diffMinutes).toBeLessThanOrEqual(30);
    });
  });
});
