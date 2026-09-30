import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';
import { MockPriceProvider } from './providers/mock.provider';
import { AmazonPriceProvider } from './providers/amazon.provider';
import { FlipkartPriceProvider } from './providers/flipkart.provider';
import { PriceProvider } from '../../common/interfaces/price-provider.interface';

const priceProviderFactory = {
  provide: 'PRICE_PROVIDERS',
  useFactory: (configService: ConfigService) => {
    const providerType = configService.get('PRICE_PROVIDER', 'mock');
    const providers: PriceProvider[] = [];

    if (providerType === 'mock') {
      const mockProvider = new MockPriceProvider();
      providers.push(mockProvider);
      providers.push(mockProvider);
    } else {
      providers.push(new AmazonPriceProvider(configService));
      providers.push(new FlipkartPriceProvider(configService));
    }

    return providers;
  },
  inject: [ConfigService],
};

@Module({
  controllers: [PricesController],
  providers: [PricesService, priceProviderFactory],
  exports: [PricesService],
})
export class PricesModule {}
