import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WatchesService, CreateWatchDto } from './watches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('watches')
@Controller('watches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WatchesController {
  constructor(private readonly watchesService: WatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update a price watch' })
  create(@Body() createWatchDto: CreateWatchDto, @CurrentUser() user: any) {
    return this.watchesService.create({
      ...createWatchDto,
      userId: user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all watches for current user' })
  findMy(@CurrentUser() user: any) {
    return this.watchesService.findByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get watch by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.watchesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a watch' })
  deactivate(@Param('id') id: string) {
    return this.watchesService.deactivate(id);
  }
}
