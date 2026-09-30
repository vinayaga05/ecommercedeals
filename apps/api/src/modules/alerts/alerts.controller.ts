import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get alerts for a user' })
  findByUser(
    @Param('userId') userId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.alertsService.findByUser(userId, skip, take);
  }
}
