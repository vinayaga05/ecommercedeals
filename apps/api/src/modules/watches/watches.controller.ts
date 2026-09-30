import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WatchesService, CreateWatchDto } from './watches.service';

@ApiTags('watches')
@Controller('watches')
export class WatchesController {
  constructor(private readonly watchesService: WatchesService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update a price watch' })
  create(@Body() createWatchDto: CreateWatchDto) {
    return this.watchesService.create(createWatchDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all watches for a user' })
  findByUser(@Param('userId') userId: string) {
    return this.watchesService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get watch by ID' })
  findOne(@Param('id') id: string) {
    return this.watchesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a watch' })
  deactivate(@Param('id') id: string) {
    return this.watchesService.deactivate(id);
  }
}
