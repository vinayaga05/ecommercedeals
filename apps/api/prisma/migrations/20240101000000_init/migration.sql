-- CreateEnum
CREATE TYPE "Retailer" AS ENUM ('AMAZON', 'FLIPKART');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "PriceConfidence" AS ENUM ('CONFIRMED', 'CONDITIONAL', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TARGET_PRICE_MET', 'DROP_PERCENTAGE', 'LOWEST_30_DAYS', 'LOWEST_90_DAYS', 'LOWEST_EVER', 'CROSS_RETAILER', 'DAILY_DIGEST');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerListing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailer" "Retailer" NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "seller" TEXT,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "nextCheckAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listedPrice" DECIMAL(10,2) NOT NULL,
    "mrp" DECIMAL(10,2),
    "couponPrice" DECIMAL(10,2),
    "bankOffer" DECIMAL(10,2),
    "bankOfferLabel" TEXT,
    "exchangePrice" DECIMAL(10,2),
    "memberPrice" DECIMAL(10,2),
    "effectivePrice" DECIMAL(10,2) NOT NULL,
    "confidence" "PriceConfidence" NOT NULL DEFAULT 'CONFIRMED',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "targetPrice" DECIMAL(10,2),
    "dropPercentage" INTEGER,
    "lowestIn30Days" BOOLEAN NOT NULL DEFAULT false,
    "lowestIn90Days" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceWatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "watchId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "effectivePrice" DECIMAL(10,2) NOT NULL,
    "previousPrice" DECIMAL(10,2),
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "retailer" "Retailer" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "RetailerListing_nextCheckAt_idx" ON "RetailerListing"("nextCheckAt");

-- CreateIndex
CREATE INDEX "RetailerListing_retailer_retailerProductId_idx" ON "RetailerListing"("retailer", "retailerProductId");

-- CreateIndex
CREATE INDEX "RetailerListing_productId_idx" ON "RetailerListing"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerListing_retailer_retailerProductId_key" ON "RetailerListing"("retailer", "retailerProductId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_listingId_createdAt_idx" ON "PriceSnapshot"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "PriceSnapshot_createdAt_idx" ON "PriceSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "PriceWatch_userId_idx" ON "PriceWatch"("userId");

-- CreateIndex
CREATE INDEX "PriceWatch_listingId_idx" ON "PriceWatch"("listingId");

-- CreateIndex
CREATE INDEX "PriceWatch_active_idx" ON "PriceWatch"("active");

-- CreateIndex
CREATE UNIQUE INDEX "PriceWatch_userId_listingId_key" ON "PriceWatch"("userId", "listingId");

-- CreateIndex
CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_watchId_idx" ON "Alert"("watchId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "SaleCampaign_retailer_active_idx" ON "SaleCampaign"("retailer", "active");

-- CreateIndex
CREATE INDEX "SaleCampaign_startDate_endDate_idx" ON "SaleCampaign"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerListing" ADD CONSTRAINT "RetailerListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RetailerListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceWatch" ADD CONSTRAINT "PriceWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceWatch" ADD CONSTRAINT "PriceWatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "RetailerListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "PriceWatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
