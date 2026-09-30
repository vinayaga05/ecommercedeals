import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateWatchDto {
  userId: string;
  listingId: string;
  targetPrice?: number;
  dropPercentage?: number;
  lowestIn30Days?: boolean;
  lowestIn90Days?: boolean;
}

@Injectable()
export class WatchesService {
  constructor(private prisma: PrismaService) {}

  async create(createWatchDto: CreateWatchDto) {
    const existing = await this.prisma.priceWatch.findUnique({
      where: {
        userId_listingId: {
          userId: createWatchDto.userId,
          listingId: createWatchDto.listingId,
        },
      },
    });

    if (existing) {
      return this.prisma.priceWatch.update({
        where: { id: existing.id },
        data: {
          targetPrice: createWatchDto.targetPrice
            ? new Decimal(createWatchDto.targetPrice)
            : null,
          dropPercentage: createWatchDto.dropPercentage,
          lowestIn30Days: createWatchDto.lowestIn30Days,
          lowestIn90Days: createWatchDto.lowestIn90Days,
          active: true,
        },
        include: {
          listing: {
            include: {
              product: true,
              priceSnapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    }

    return this.prisma.priceWatch.create({
      data: {
        userId: createWatchDto.userId,
        listingId: createWatchDto.listingId,
        targetPrice: createWatchDto.targetPrice
          ? new Decimal(createWatchDto.targetPrice)
          : null,
        dropPercentage: createWatchDto.dropPercentage,
        lowestIn30Days: createWatchDto.lowestIn30Days,
        lowestIn90Days: createWatchDto.lowestIn90Days,
      },
      include: {
        listing: {
          include: {
            product: true,
            priceSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.priceWatch.findMany({
      where: { userId, active: true },
      include: {
        listing: {
          include: {
            product: true,
            priceSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByListing(listingId: string) {
    return this.prisma.priceWatch.findMany({
      where: { listingId, active: true },
      include: { user: true },
    });
  }

  async deactivate(id: string) {
    return this.prisma.priceWatch.update({
      where: { id },
      data: { active: false },
    });
  }

  async findOne(id: string) {
    return this.prisma.priceWatch.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            product: true,
            priceSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }
}
