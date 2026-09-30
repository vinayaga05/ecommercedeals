import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PricesService } from '../prices/prices.service';
import { WatchesService } from '../watches/watches.service';
import { AlertsService } from '../alerts/alerts.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@Processor('price-check', {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  limiter: {
    max: parseInt(process.env.RATE_LIMIT_AMAZON || '10', 10),
    duration: 60000,
  },
})
export class PriceCheckWorker extends WorkerHost {
  private readonly logger = new Logger(PriceCheckWorker.name);

  constructor(
    private prisma: PrismaService,
    private pricesService: PricesService,
    private watchesService: WatchesService,
    private alertsService: AlertsService,
    private campaignsService: CampaignsService,
    private schedulerService: SchedulerService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { listingId, retailer, retailerProductId } = job.data;

    this.logger.debug(
      `Processing price check for ${retailer}:${retailerProductId}`,
    );

    try {
      const listing = await this.prisma.retailerListing.findUnique({
        where: { id: listingId },
      });

      if (!listing) {
        this.logger.error(`Listing ${listingId} not found`);
        return { success: false, error: 'Listing not found' };
      }

      const previousSnapshot = await this.prisma.priceSnapshot.findFirst({
        where: { listingId },
        orderBy: { createdAt: 'desc' },
      });

      const result = await this.pricesService.fetchAndSavePrice(listingId);

      if (result.changed) {
        const watches = await this.watchesService.findByListing(listingId);

        if (watches.length > 0) {
          await this.alertsService.evaluateWatchRules(
            watches,
            result.snapshot.effectivePrice,
            previousSnapshot?.effectivePrice || null,
            listingId,
          );
        }
      }

      const isActiveCampaign = await this.campaignsService.isActiveCampaign(
        retailer,
      );

      const nextCheckAt = this.schedulerService.calculateNextCheckAt(
        listing.priority,
        result.result.product.availability,
        isActiveCampaign,
      );

      await this.prisma.retailerListing.update({
        where: { id: listingId },
        data: { nextCheckAt },
      });

      this.logger.debug(
        `Completed price check for ${listingId}, next check at ${nextCheckAt.toISOString()}`,
      );

      return {
        success: true,
        changed: result.changed,
        price: result.result.price.effectivePrice,
        nextCheckAt,
      };
    } catch (error) {
      this.logger.error(
        `Error processing price check for ${listingId}:`,
        error.message,
      );
      throw error;
    }
  }
}
