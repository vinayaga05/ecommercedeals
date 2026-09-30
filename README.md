# PriceWatch - E-Commerce Price Monitoring System

A comprehensive price monitoring solution for Amazon and Flipkart products in the Indian market. Track prices, set alerts, and never miss a deal.

## 🎯 Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Smart Scheduling**: Due-based scheduler (NOT per-product cron) with dynamic priority
- **Multi-Retailer Support**: Amazon India and Flipkart
- **Intelligent Alerts**: Target price, percentage drops, lowest in 30/90 days
- **Daily Digest**: Morning summary of watched products that dropped in price (9 AM daily)
- **Cross-Retailer Comparison**: Alerts when same product is cheaper on another retailer (≥5% difference)
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
- **Authentication**: User registration, login, JWT validation
- **Scheduler**: Due-based selection, next check time calculation
- **Alerts**: Rule evaluation, cooldown logic
- **Daily Digest**: Price drop detection, message generation
- **Cross-Retailer**: Price comparison, alert triggering
- **Price Providers**: 
  - Mock provider: URL parsing, price variations
  - **Flipkart provider**: API calls, error handling, retries, rate limiting, response parsing (fixture-based, no live calls)

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
   
   **Status**: Stubbed (TODO: verify API endpoint and implement request signing)

3. **Flipkart Affiliate API** ✅ **Implemented** (production)
   ```env
   PRICE_PROVIDER=production
   FLIPKART_AFFILIATE_ID=your_id
   FLIPKART_AFFILIATE_TOKEN=your_token
   ```
   Obtain from: https://affiliate.flipkart.com/
   
   **API Details:**
   - Base URL: `https://affiliate-api.flipkart.net/affiliate`
   - Endpoint: `GET /product/json?id={productId}`
   - Auth: Headers `Fk-Affiliate-Id` and `Fk-Affiliate-Token`
   - Rate limit: ~10 requests/min with automatic retry + exponential backoff
   - Error handling: 404 (not found), 401/403 (auth), 429 (rate limit), 500+ (server)
   - Parses: MRP, selling price, special price, bank offers, availability
   - Maps to: listed price, MRP, coupon price, bank offer (with label), effective price
   
   **Note**: Implementation based on Flipkart Affiliate API documentation. Response structure may vary - tested with fixture data, not verified against live API.

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
# Authentication (public)
POST   /api/auth/register         # Register new user
POST   /api/auth/login            # Login (returns JWT)
GET    /api/auth/me               # Get current user (requires JWT)

# Products (create requires JWT)
POST   /api/products              # Add product from URL
GET    /api/products              # List products
GET    /api/products/:id          # Get product details

# Watches (requires JWT, scoped to current user)
POST   /api/watches               # Create watch rule
GET    /api/watches               # Current user's watches
GET    /api/watches/:id           # Get watch details
DELETE /api/watches/:id           # Deactivate watch

# Alerts (requires JWT, scoped to current user)
GET    /api/alerts                # Current user's alerts
GET    /api/prices/history/:listingId  # Price history

# Campaigns
GET    /api/campaigns             # List campaigns
POST   /api/campaigns             # Create campaign

# Notifications
POST   /api/notifications/register  # Register FCM token
```

All endpoints requiring authentication need `Authorization: Bearer <token>` header.

## ✅ What's Implemented

- ✅ JWT authentication with bcrypt password hashing
- ✅ User-scoped watches and alerts
- ✅ Complete NestJS API with all modules
- ✅ Prisma schema with comprehensive data model
- ✅ Due-based scheduler (NOT per-product cron)
- ✅ BullMQ workers with rate limiting
- ✅ Daily digest job (9 AM: "N watched products dropped today")
- ✅ Cross-retailer price comparison (alerts when ≥5% difference)
- ✅ Mock price provider (working)
- ✅ Flipkart Affiliate API provider (fully implemented with tests)
- ✅ Amazon provider interface (TODO: API integration)
- ✅ Price snapshot deduplication
- ✅ Alert rules with cooldown
- ✅ FCM notifications with fallback
- ✅ Next.js admin dashboard
- ✅ React Native Expo mobile app skeleton
- ✅ Docker Compose setup
- ✅ Unit tests (auth, scheduler, alerts, daily digest, cross-retailer)
- ✅ Seed script with demo user
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

### Flipkart Affiliate API Integration ✅ **Complete**

Full implementation with:
- ✅ Real API endpoint: `https://affiliate-api.flipkart.net/affiliate/product/json`
- ✅ Authentication headers: `Fk-Affiliate-Id`, `Fk-Affiliate-Token`
- ✅ Rate limiting with exponential backoff (429 handling)
- ✅ Retry logic for server errors (500+)
- ✅ Error handling: 404 (not found), 401/403 (auth failures)
- ✅ Price parsing: MRP, selling price, special price, bank offers
- ✅ Availability detection: in stock / out of stock
- ✅ Confidence labels: CONFIRMED, CONDITIONAL (with offers), ESTIMATED (out of stock)
- ✅ Comprehensive unit tests with fixture responses

**Implementation notes:**
- Based on Flipkart Affiliate API documentation structure
- Handles both `productBaseInfoV1` and `productBaseInfo` response formats
- Parses nested price objects (`{ amount, currency }`) and direct values
- Extracts bank offer details (type, title, discount amount)
- Falls back to mock provider when credentials not configured
- **Not verified against live Flipkart API** - tested with fixture data only

**Known limitations:**
- Response structure inferred from documentation, may need adjustment for live API
- Image URL extraction handles both object (`{ '400': url }`) and string formats
- Availability parsing handles boolean, string ("In Stock"), and field variations

### Other Production TODOs

- User management in admin dashboard
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
