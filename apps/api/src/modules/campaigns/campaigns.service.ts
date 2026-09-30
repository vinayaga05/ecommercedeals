import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Retailer } from '@prisma/client';

export class CreateCampaignDto {
  name: string;
  retailer: Retailer;
  startDate: Date;
  endDate: Date;
  description?: string;
}

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(createCampaignDto: CreateCampaignDto) {
    return this.prisma.saleCampaign.create({
      data: createCampaignDto,
    });
  }

  async findActive() {
    const now = new Date();
    return this.prisma.saleCampaign.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  async findAll() {
    return this.prisma.saleCampaign.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async isActiveCampaign(retailer: Retailer): Promise<boolean> {
    const now = new Date();
    const campaign = await this.prisma.saleCampaign.findFirst({
      where: {
        retailer,
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    return !!campaign;
  }
}
