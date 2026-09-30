import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';

class CreateProductDto {
  url: string;
  userId?: string;
}

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Add product from URL' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createFromUrl(
      createProductDto.url,
      createProductDto.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  findAll(@Query('skip') skip?: number, @Query('take') take?: number) {
    return this.productsService.findAll(skip, take);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}
