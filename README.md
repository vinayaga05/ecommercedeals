# PriceWatch - E-Commerce Price Monitoring System

A comprehensive price monitoring solution for Amazon and Flipkart products in the Indian market. Track prices, set alerts, and never miss a deal.

## 🎯 Features

- **Smart Scheduling**: Due-based scheduler (NOT per-product cron) with dynamic priority
- **Multi-Retailer Support**: Amazon India and Flipkart
- **Intelligent Alerts**: Target price, percentage drops, lowest in 30/90 days
- **Price History**: Detailed tracking with multiple price types (MRP, coupon, bank offers, etc.)
- **Sale Campaigns**: Automatic priority boost during Big Billion Days / Great Indian Festival
- **Push Notifications**: Firebase Cloud Messaging with console fallback
- **Deduplication**: Fetch once per product, evaluate all user rules
- **Rate Limiting**: Per-retailer rate limiting with exponential backoff
- **Scalable Workers**: BullMQ-based queue system with horizontal scaling

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   NestJS    │────▶│ PostgreSQL  │
│  Dashboard  │     │     API     │     └─────────────┘
└─────────────┘     └─────────────┘              │
                           │                     │
                           │                     │
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ React Native│────▶│   BullMQ    │────▶│    Redis    │
│  Expo App   │     │   Workers   │     └─────────────┘
└─────────────┘     └─────────────┘
```

### Monorepo Structure

```
ecommercedeals/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── products/
│   │   │   │   ├── watches/
│   │   │   │   ├── alerts/
│   │   │   │   ├── prices/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── notifications/
│   │   │   │   ├── scheduler/    # Due-based scheduler
│   │   │   │   └── workers/       # BullMQ price check workers
│   │   │   └── common/
│   │   │       └── interfaces/
│   │   │           └── price-provider.interface.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── web/                 # Next.js admin dashboard
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       └── lib/
│   └── mobile/              # React Native (Expo) app
│       ├── app/
│       ├── components/
│       └── lib/
├── docker-compose.yml
└── .env.example
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm 9+

### Local Development with Mock Provider

1. **Clone and install dependencies:**

```bash
git clone <repo-url>
cd ecommercedeals
npm install
```

2. **Set up environment:**

```bash
cp .env.example .env
# Edit .env if needed (defaults use mock provider)
```

3. **Start services with Docker Compose:**

```bash
docker compose up -d postgres redis
```

4. **Run database migrations:**

```bash
cd apps/api
npm run prisma:migrate:dev
npm run seed
```

5. **Start the API and worker:**

```bash
# Terminal 1 - API
cd apps/api
npm run dev

# Terminal 2 - Worker (in production runs separately)
cd apps/api
NODE_ENV=development npm run start
```

6. **Start the web dashboard:**

```bash
# Terminal 3
cd apps/web
npm run dev
```

7. **Access the applications:**

- API: http://localhost:3000/api
- API Docs: http://localhost:3000/api/docs
- Web Dashboard: http://localhost:3001
- Mobile: See `apps/mobile/README.md`

## 🧪 Testing

Run tests:

```bash
cd apps/api
npm test

# With coverage
npm run test:cov
```

Tests cover:
- Scheduler due-based selection
- Next check time calculation
- Alert rule evaluation
- Alert cooldown logic
- URL parsing for Amazon/Flipkart

## 🗄️ Database Schema

Key tables:
- `User`: Users and their settings
- `Product`: Product catalog
- `RetailerListing`: Per-retailer product listings with `next_check_at`
- `PriceSnapshot`: Historical prices with detailed breakdown
- `PriceWatch`: User watch rules
- `Alert`: Price alerts with cooldown tracking
- `SaleCampaign`: Sale event definitions
- `DeviceToken`: FCM push tokens

## 🔧 Configuration

### Price Providers

Three provider implementations:

1. **Mock Provider** (default in development)
   - No credentials needed
   - Simulated price variations
   - Seed data for iPhone 13 and Samsung Galaxy M34

2. **Amazon Creators API** (production)
   ```env
   PRICE_PROVIDER=production
   AMAZON_ACCESS_KEY=your_key
   AMAZON_SECRET_KEY=your_secret
   AMAZON_PARTNER_TAG=your_tag
   ```
   Obtain from: https://creators.amazon.in/

3. **Flipkart Affiliate API** (production)
   ```env
   FLIPKART_AFFILIATE_ID=your_id
   FLIPKART_AFFILIATE_TOKEN=your_token
   ```
   Obtain from: https://affiliate.flipkart.com/

### Push Notifications

Firebase Cloud Messaging (optional):

```env
FCM_PROJECT_ID=your_project_id
FCM_PRIVATE_KEY="your_private_key"
FCM_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
```

Falls back to console logging when not configured.

## 📊 How It Works

### Due-Based Scheduler

Every minute, the scheduler:

1. **Finds due listings**: `SELECT * WHERE next_check_at <= NOW()`
2. **Deduplicates**: Groups by retailer + product ID
3. **Enqueues**: Adds to BullMQ with priority
4. **Updates priorities**: Boosts for active campaigns and recent drops

### Worker Flow

1. **Fetch price** from provider (once per product)
2. **Evaluate all watches** for that listing (dedupe across users)
3. **Check alert conditions**:
   - Target price met
   - Drop % threshold
   - Lowest in 30/90 days
   - Cooldown check (1 alert per 24h unless material drop)
4. **Save snapshot** (only if price changed)
5. **Calculate next check time**:
   - Normal: 12-24 hours
   - High priority: 4-6 hours
   - Active campaign: 15-30 minutes
   - Out of stock: 6-12 hours

## 🚢 Deployment

See [DEPLOY.md](./DEPLOY.md) for production deployment on Hostinger VPS.

Quick production start:

```bash
docker compose up -d
```

This starts:
- PostgreSQL
- Redis
- API server
- 2x Worker replicas (scalable)
- Web dashboard
- Caddy reverse proxy with HTTPS

## 📝 API Endpoints

Key endpoints:

```
POST   /api/products              # Add product from URL
GET    /api/products              # List products
GET    /api/products/:id          # Get product details

POST   /api/watches               # Create watch rule
GET    /api/watches/user/:userId  # User's watches
DELETE /api/watches/:id           # Deactivate watch

GET    /api/alerts/user/:userId   # User's alerts
GET    /api/prices/history/:listingId  # Price history

GET    /api/campaigns             # List campaigns
POST   /api/campaigns             # Create campaign

POST   /api/notifications/register  # Register FCM token
```

## ✅ What's Implemented

- ✅ Complete NestJS API with all modules
- ✅ Prisma schema with comprehensive data model
- ✅ Due-based scheduler (NOT per-product cron)
- ✅ BullMQ workers with rate limiting
- ✅ Mock price provider (working)
- ✅ Amazon/Flipkart provider interfaces (TODO: API integration)
- ✅ Price snapshot deduplication
- ✅ Alert rules with cooldown
- ✅ FCM notifications with fallback
- ✅ Next.js admin dashboard
- ✅ React Native Expo mobile app skeleton
- ✅ Docker Compose setup
- ✅ Unit tests
- ✅ Seed script
- ✅ Complete documentation

## 🔜 TODO (Production Readiness)

### Amazon Creators API Integration

The Amazon provider is stubbed with clear TODOs:

```typescript
// apps/api/src/modules/prices/providers/amazon.provider.ts
private async callCreatorsAPI(asin: string): Promise<PriceFetchResult> {
  throw new Error(
    'TODO: Implement Amazon Creators API integration. ' +
    'API endpoint and request format to be confirmed from official documentation...'
  );
}
```

**Next steps:**
1. Verify current API endpoint from https://creators.amazon.in/
2. Implement request signing (AWS Signature V4)
3. Parse response format
4. Handle location-based price variations

### Flipkart Affiliate API Integration

Similar stub exists for Flipkart:

```typescript
// apps/api/src/modules/prices/providers/flipkart.provider.ts
private async callAffiliateAPI(productId: string): Promise<PriceFetchResult> {
  throw new Error(
    'TODO: Implement Flipkart Affiliate API integration. ' +
    'Refer to https://affiliate.flipkart.com/ for API documentation...'
  );
}
```

**Next steps:**
1. Get API documentation from affiliate portal
2. Implement authentication headers
3. Parse product feed response
4. Extract all price variants

### Other Production TODOs

- User authentication & authorization
- User management in admin dashboard
- Daily digest email/notification job
- Cross-retailer price comparison
- Lowest-ever alert detection
- Admin UI for all entities (campaigns, users, etc.)
- Rate limiting on API endpoints
- Monitoring & logging (Sentry, DataDog, etc.)
- Performance optimization (caching, indexes)
- CI/CD pipeline
- Backup strategy

## 📚 Documentation

- [API Documentation](http://localhost:3000/api/docs) - Swagger UI
- [Deployment Guide](./DEPLOY.md) - VPS setup instructions
- [Mobile App](./apps/mobile/README.md) - React Native setup

## 🤝 Contributing

This is an MVP. Key areas for contribution:

1. Complete Amazon Creators API integration
2. Complete Flipkart Affiliate API integration
3. Enhanced mobile UI/UX
4. Additional alert types
5. Performance optimizations

## 📄 License

MIT

## 🙏 Acknowledgments

Built with:
- NestJS
- Next.js
- React Native / Expo
- Prisma
- BullMQ
- PostgreSQL
- Redis
- Docker
