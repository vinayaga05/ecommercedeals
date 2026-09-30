import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PricesService } from './prices.service';

@ApiTags('prices')
@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get('history/:listingId')
  @ApiOperation({ summary: 'Get price history for a listing' })
  async getPriceHistory(
    @Param('listingId') listingId: string,
    @Query('limit') limit?: number,
  ) {
    return this.pricesService.getPriceHistory(listingId, limit);
  }

  @Get('lowest/:listingId')
  @ApiOperation({ summary: 'Get lowest price in last N days' })
  async getLowestPrice(
    @Param('listingId') listingId: string,
    @Query('days') days: number = 30,
  ) {
    return this.pricesService.getLowestPrice(listingId, days);
  }
}
