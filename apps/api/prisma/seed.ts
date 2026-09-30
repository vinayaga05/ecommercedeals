import { PrismaClient, Retailer, Priority, PriceConfidence } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash: hashedPassword,
    },
  });

  console.log('✅ Created user:', user1.email);
  console.log('   Password: password123');

  const product1 = await prisma.product.create({
    data: {
      name: 'Apple iPhone 13 (128GB) - Midnight',
      brand: 'Apple',
      category: 'Electronics > Mobiles',
      imageUrl: 'https://m.media-amazon.com/images/I/61VuVU94RnL._SL1500_.jpg',
      description: '15.40 cm (6.1-inch) Super Retina XDR display',
    },
  });

  const listing1 = await prisma.retailerListing.create({
    data: {
      productId: product1.id,
      retailer: Retailer.AMAZON,
      retailerProductId: 'B08N5WRWNW',
      url: 'https://www.amazon.in/dp/B08N5WRWNW',
      seller: 'Amazon.in',
      availability: true,
      priority: Priority.NORMAL,
      nextCheckAt: new Date(),
    },
  });

  await prisma.priceSnapshot.create({
    data: {
      listingId: listing1.id,
      listedPrice: 59999,
      mrp: 69999,
      couponPrice: 57999,
      bankOffer: 56999,
      bankOfferLabel: 'HDFC Credit Card',
      memberPrice: 56499,
      effectivePrice: 56499,
      confidence: PriceConfidence.CONFIRMED,
      currency: 'INR',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'SAMSUNG Galaxy M34 5G (Midnight Blue, 128 GB)',
      brand: 'Samsung',
      category: 'Mobiles & Accessories',
      imageUrl: 'https://rukminim2.flixcart.com/image/416/416/xif0q/mobile/v/9/y/-original-imagshxfb4zpvzq2.jpeg',
      description: '8 GB RAM | 128 GB ROM',
    },
  });

  const listing2 = await prisma.retailerListing.create({
    data: {
      productId: product2.id,
      retailer: Retailer.FLIPKART,
      retailerProductId: 'MOBGC9VGHHNHBYZW',
      url: 'https://www.flipkart.com/samsung-galaxy-m34-5g-midnight-blue-128-gb/p/itm1234567890',
      seller: 'RetailNet',
      availability: true,
      priority: Priority.NORMAL,
      nextCheckAt: new Date(),
    },
  });

  await prisma.priceSnapshot.create({
    data: {
      listingId: listing2.id,
      listedPrice: 22999,
      mrp: 27999,
      couponPrice: 21999,
      memberPrice: 21499,
      effectivePrice: 21499,
      confidence: PriceConfidence.CONFIRMED,
      currency: 'INR',
    },
  });

  console.log('✅ Created products and listings');

  const watch1 = await prisma.priceWatch.create({
    data: {
      userId: user1.id,
      listingId: listing1.id,
      targetPrice: 55000,
      dropPercentage: 10,
      lowestIn30Days: true,
      active: true,
    },
  });

  const watch2 = await prisma.priceWatch.create({
    data: {
      userId: user1.id,
      listingId: listing2.id,
      targetPrice: 20000,
      dropPercentage: 5,
      active: true,
    },
  });

  console.log('✅ Created price watches');

  const bigBillionDays = await prisma.saleCampaign.create({
    data: {
      name: 'Big Billion Days',
      retailer: Retailer.FLIPKART,
      startDate: new Date('2024-10-15'),
      endDate: new Date('2024-10-22'),
      active: false,
      description: 'Flipkart annual mega sale',
    },
  });

  const greatIndianFestival = await prisma.saleCampaign.create({
    data: {
      name: 'Great Indian Festival',
      retailer: Retailer.AMAZON,
      startDate: new Date('2024-10-15'),
      endDate: new Date('2024-10-20'),
      active: false,
      description: 'Amazon annual mega sale',
    },
  });

  console.log('✅ Created sale campaigns');

  console.log('🎉 Seeding completed!');
  console.log(`   - Users: 1`);
  console.log(`   - Products: 2`);
  console.log(`   - Listings: 2`);
  console.log(`   - Watches: 2`);
  console.log(`   - Campaigns: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
