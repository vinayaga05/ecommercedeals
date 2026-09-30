import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { Priority } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly batchSize: number;

  constructor(
    private prisma: PrismaService,
    private campaignsService: CampaignsService,
    @InjectQueue('price-check') private priceCheckQueue: Queue,
    private configService: ConfigService,
  ) {
    this.batchSize = parseInt(
      this.configService.get('SCHEDULER_BATCH_SIZE', '100'),
      10,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async schedulePriceChecks() {
    const startTime = Date.now();
    this.logger.log('Starting scheduler tick...');

    try {
      const now = new Date();
      const dueListings = await this.prisma.retailerListing.findMany({
        where: {
          nextCheckAt: { lte: now },
        },
        take: this.batchSize,
        orderBy: { nextCheckAt: 'asc' },
        include: {
          product: true,
          watches: {
            where: { active: true },
          },
        },
      });

      this.logger.log(`Found ${dueListings.length} listings due for check`);

      const grouped = this.groupByRetailerAndProduct(dueListings);

      for (const group of grouped) {
        await this.priceCheckQueue.add(
          'fetch-price',
          {
            listingId: group.listingId,
            retailer: group.retailer,
            retailerProductId: group.retailerProductId,
            watchIds: group.watchIds,
            priority: group.priority,
          },
          {
            priority: this.getJobPriority(group.priority),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );
      }

      await this.updatePriorities();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Scheduled ${grouped.length} price checks in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Error in scheduler tick:', error);
    }
  }

  private groupByRetailerAndProduct(listings: any[]) {
    const grouped = new Map<string, any>();

    for (const listing of listings) {
      const key = `${listing.retailer}-${listing.retailerProductId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          listingId: listing.id,
          retailer: listing.retailer,
          retailerProductId: listing.retailerProductId,
          watchIds: listing.watches.map((w) => w.id),
          priority: listing.priority,
        });
      } else {
        const existing = grouped.get(key);
        existing.watchIds.push(...listing.watches.map((w) => w.id));
        if (
          this.getPriorityValue(listing.priority) >
          this.getPriorityValue(existing.priority)
        ) {
          existing.priority = listing.priority;
        }
      }
    }

    return Array.from(grouped.values());
  }

  private async updatePriorities() {
    const activeCampaigns = await this.campaignsService.findActive();

    for (const campaign of activeCampaigns) {
      await this.prisma.retailerListing.updateMany({
        where: {
          retailer: campaign.retailer,
          availability: true,
        },
        data: {
          priority: Priority.URGENT,
        },
      });
    }

    const recentPriceDrops = await this.prisma.$queryRaw`
      SELECT DISTINCT rl.id
      FROM "RetailerListing" rl
      JOIN "PriceSnapshot" ps1 ON ps1."listingId" = rl.id
      JOIN "PriceSnapshot" ps2 ON ps2."listingId" = rl.id
      WHERE ps1."createdAt" > NOW() - INTERVAL '24 hours'
        AND ps2."createdAt" > ps1."createdAt"
        AND ps2."effectivePrice" < ps1."effectivePrice" * 0.95
      LIMIT 100
    `;

    if (Array.isArray(recentPriceDrops) && recentPriceDrops.length > 0) {
      await this.prisma.retailerListing.updateMany({
        where: {
          id: { in: recentPriceDrops.map((r: any) => r.id) },
        },
        data: {
          priority: Priority.HIGH,
        },
      });
    }
  }

  calculateNextCheckAt(
    priority: Priority,
    available: boolean,
    isActiveCampaign: boolean,
  ): Date {
    const now = new Date();
    let minutesToAdd: number;

    if (!available) {
      minutesToAdd = 360 + Math.random() * 360;
    } else if (isActiveCampaign) {
      minutesToAdd = 15 + Math.random() * 15;
    } else {
      switch (priority) {
        case Priority.URGENT:
          minutesToAdd = 15 + Math.random() * 15;
          break;
        case Priority.HIGH:
          minutesToAdd = 240 + Math.random() * 120;
          break;
        case Priority.NORMAL:
        default:
          minutesToAdd = 720 + Math.random() * 720;
      }
    }

    now.setMinutes(now.getMinutes() + minutesToAdd);
    return now;
  }

  private getJobPriority(priority: Priority): number {
    switch (priority) {
      case Priority.URGENT:
        return 1;
      case Priority.HIGH:
        return 5;
      case Priority.NORMAL:
      default:
        return 10;
    }
  }

  private getPriorityValue(priority: Priority): number {
    switch (priority) {
      case Priority.URGENT:
        return 3;
      case Priority.HIGH:
        return 2;
      case Priority.NORMAL:
      default:
        return 1;
    }
  }
}
