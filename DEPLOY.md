# Production Deployment Guide - Hostinger VPS

This guide walks through deploying PriceWatch on a Hostinger VPS running Ubuntu with Docker.

## Prerequisites

- Hostinger VPS (Ubuntu 20.04 or 22.04)
- Domain name (optional, but recommended)
- SSH access to the VPS
- At least 2GB RAM, 20GB disk

## Step 1: Initial VPS Setup

### 1.1 Connect to VPS

```bash
ssh root@your-vps-ip
```

### 1.2 Update System

```bash
apt update && apt upgrade -y
```

### 1.3 Create Deploy User

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## Step 2: Install Docker

### 2.1 Install Docker Engine

```bash
# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker ${USER}

# Logout and login again for group to take effect
exit
su - deploy
```

### 2.2 Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Step 3: Clone and Configure Application

### 3.1 Clone Repository

```bash
cd ~
git clone <your-repo-url> pricewatch
cd pricewatch
```

### 3.2 Configure Environment

```bash
cp .env.example .env
nano .env
```

**Minimum production configuration:**

```env
# Database
DATABASE_URL="postgresql://pricewatch:CHANGE_THIS_PASSWORD@postgres:5432/pricewatch?schema=public"

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=""

# API
API_PORT=3000
NODE_ENV=production
JWT_SECRET="CHANGE_THIS_TO_RANDOM_STRING_USE_openssl_rand_base64_32"

# Price Provider (start with mock, add real credentials later)
PRICE_PROVIDER=mock

# Amazon Creators API (optional, get from https://creators.amazon.in/)
AMAZON_ACCESS_KEY=""
AMAZON_SECRET_KEY=""
AMAZON_PARTNER_TAG=""
AMAZON_REGION="in"

# Flipkart Affiliate API (optional, get from https://affiliate.flipkart.com/)
FLIPKART_AFFILIATE_ID=""
FLIPKART_AFFILIATE_TOKEN=""

# Firebase Cloud Messaging (optional)
FCM_PROJECT_ID=""
FCM_PRIVATE_KEY=""
FCM_CLIENT_EMAIL=""
NOTIFICATION_FALLBACK="console"

# Scheduler
SCHEDULER_TICK_INTERVAL_MS=60000
SCHEDULER_BATCH_SIZE=100

# Alerts
ALERT_COOLDOWN_HOURS=24
ALERT_DROP_THRESHOLD_PERCENT=5

# Rate Limiting
RATE_LIMIT_AMAZON=10
RATE_LIMIT_FLIPKART=10

# Workers
WORKER_CONCURRENCY=5
```

**⚠️ Security Notes:**
- Change `CHANGE_THIS_PASSWORD` to a strong random password
- Change `JWT_SECRET` to a random string (use: `openssl rand -base64 32`)
- Never commit real credentials to git

### 3.3 Configure Caddy for Your Domain (Optional)

Edit `Caddyfile`:

```bash
nano Caddyfile
```

Replace with:

```
your-domain.com {
    handle /api/* {
        reverse_proxy api:3000
    }

    handle /* {
        reverse_proxy web:3001
    }

    tls your-email@example.com

    log {
        output file /var/log/caddy/access.log
    }
}
```

## Step 4: Build and Start Services

### 4.1 Pull Base Images

```bash
docker compose pull postgres redis caddy
```

### 4.2 Build Application Images

```bash
docker compose build
```

This will build:
- API server
- Worker containers
- Web dashboard

### 4.3 Start Services

```bash
docker compose up -d
```

### 4.4 Check Service Status

```bash
docker compose ps
```

All services should show "Up" status:
- pricewatch-postgres
- pricewatch-redis
- pricewatch-api
- pricewatch-worker-1
- pricewatch-worker-2
- pricewatch-web
- pricewatch-caddy

### 4.5 View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f worker
```

## Step 5: Initialize Database

### 5.1 Run Migrations

Migrations run automatically on API startup, but you can run manually:

```bash
docker compose exec api npx prisma migrate deploy
```

### 5.2 Seed Database (Optional)

```bash
docker compose exec api npm run seed
```

This creates:
- Demo user
- 2 sample products (iPhone, Samsung)
- Price watches
- Sale campaigns

## Step 6: Verify Deployment

### 6.1 Check API Health

```bash
curl http://localhost:3000/api/products
# or
curl http://your-domain.com/api/products
```

### 6.2 Access Web Dashboard

Open in browser:
- With domain: `http://your-domain.com`
- Without domain: `http://your-vps-ip`

### 6.3 Check API Documentation

- With domain: `http://your-domain.com/api/docs`
- Without domain: `http://your-vps-ip:3000/api/docs`

## Step 7: Firewall Configuration

### 7.1 Set Up UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Step 8: Monitoring & Maintenance

### 8.1 View Logs

```bash
cd ~/pricewatch
docker compose logs -f --tail=100
```

### 8.2 Restart Services

```bash
docker compose restart
```

### 8.3 Stop Services

```bash
docker compose down
```

### 8.4 Update Application

```bash
cd ~/pricewatch
git pull
docker compose build
docker compose up -d
```

### 8.5 Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U pricewatch pricewatch > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_YYYYMMDD.sql | docker compose exec -T postgres psql -U pricewatch pricewatch
```

### 8.6 Scale Workers

Edit `docker-compose.yml` to adjust worker replicas:

```yaml
worker:
  # ...
  deploy:
    replicas: 5  # Increase for more concurrency
```

Then:

```bash
docker compose up -d --scale worker=5
```

## Step 9: Add Real Price Providers

### 9.1 Amazon Creators API

1. Sign up at https://creators.amazon.in/
2. Get your Access Key, Secret Key, and Partner Tag
3. Update `.env`:
   ```env
   PRICE_PROVIDER=production
   AMAZON_ACCESS_KEY=your_key
   AMAZON_SECRET_KEY=your_secret
   AMAZON_PARTNER_TAG=your_tag
   ```
4. Restart: `docker compose restart api worker`

**Note**: Amazon provider integration requires completion of TODOs in `amazon.provider.ts`

### 9.2 Flipkart Affiliate API ✅

1. Sign up at https://affiliate.flipkart.com/
2. Navigate to API section in affiliate dashboard
3. Generate API credentials (Affiliate ID and Token)
4. Update `.env`:
   ```env
   PRICE_PROVIDER=production
   FLIPKART_AFFILIATE_ID=your_affiliate_id
   FLIPKART_AFFILIATE_TOKEN=your_affiliate_token
   ```
5. Restart: `docker compose restart api worker`

**Provider Features:**
- Automatic rate limiting with retry + exponential backoff
- Handles authentication errors (401/403)
- Retries on server errors (500+)
- Parses MRP, selling price, special price, bank offers
- Detects availability (in stock / out of stock)
- Confidence labels based on availability and offers

**API Details:**
- Base URL: `https://affiliate-api.flipkart.net/affiliate`
- Endpoint: `GET /product/json?id={productId}`
- Required Headers: `Fk-Affiliate-Id`, `Fk-Affiliate-Token`
- Rate Limit: ~10 requests/minute (configurable via `RATE_LIMIT_FLIPKART`)

**Testing:**
After configuration, test with a known Flipkart product ID:
```bash
# Via API
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.flipkart.com/product/p/MOBGC9VGHHNHBYZW"}'
```

Check logs for successful fetch or any errors.

### 9.3 Firebase Cloud Messaging

1. Create project at https://console.firebase.google.com/
2. Go to Project Settings → Service Accounts
3. Generate new private key (JSON)
4. Extract credentials from JSON:
   ```json
   {
     "project_id": "your-project",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "firebase-adminsdk-...@....iam.gserviceaccount.com"
   }
   ```
5. Update `.env`:
   ```env
   FCM_PROJECT_ID=your-project
   FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FCM_CLIENT_EMAIL=firebase-adminsdk-...@....iam.gserviceaccount.com
   NOTIFICATION_FALLBACK=fcm
   ```
6. Restart: `docker compose restart api`

## Step 10: SSL/HTTPS with Domain

If using a domain, Caddy automatically provisions Let's Encrypt certificates.

**Requirements:**
1. Domain DNS pointing to VPS IP
2. Ports 80 and 443 open
3. Valid email in Caddyfile

Caddy will automatically:
- Request SSL certificate
- Redirect HTTP to HTTPS
- Auto-renew certificates

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs api
docker compose logs worker

# Check if ports are in use
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :5432
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U pricewatch -d pricewatch -c "SELECT 1;"
```

### Redis Issues

```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker compose exec redis redis-cli ping
```

### Worker Not Processing Jobs

```bash
# Check worker logs
docker compose logs worker

# Check Redis queue
docker compose exec redis redis-cli
> KEYS *
> LLEN bull:price-check:*
```

### Out of Memory

If services are killed by OOM:

1. Check memory usage: `docker stats`
2. Reduce worker replicas in `docker-compose.yml`
3. Reduce `WORKER_CONCURRENCY` in `.env`
4. Consider upgrading VPS plan

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## Performance Tuning

### For High Volume

1. **Increase worker replicas:**
   ```yaml
   deploy:
     replicas: 10
   ```

2. **Increase concurrency:**
   ```env
   WORKER_CONCURRENCY=10
   ```

3. **Tune batch size:**
   ```env
   SCHEDULER_BATCH_SIZE=200
   ```

4. **Optimize rate limits:**
   ```env
   RATE_LIMIT_AMAZON=20
   RATE_LIMIT_FLIPKART=20
   ```

### Database Optimization

```sql
-- Add indexes if needed
CREATE INDEX idx_listing_next_check ON "RetailerListing" ("nextCheckAt");
CREATE INDEX idx_snapshot_listing_created ON "PriceSnapshot" ("listingId", "createdAt");
```

## Security Checklist

- [ ] Changed default PostgreSQL password
- [ ] Set strong JWT secret
- [ ] Configured UFW firewall
- [ ] Enabled HTTPS with valid certificate
- [ ] Secured SSH (key-only, no password)
- [ ] Set up automated backups
- [ ] Configured log rotation
- [ ] Limited API rate limiting (TODO)
- [ ] Set up monitoring/alerts

## Maintenance Schedule

**Daily:**
- Check logs for errors
- Monitor disk space
- Verify scheduler is running

**Weekly:**
- Backup database
- Review alert performance
- Check worker queue depth

**Monthly:**
- Update Docker images
- Review security updates
- Optimize database

## Support

For issues:
1. Check logs: `docker compose logs`
2. Verify environment variables
3. Check database migrations
4. Review API documentation

## Next Steps After Deployment

1. Complete Amazon/Flipkart API integrations
2. Set up user authentication
3. Configure monitoring (Sentry, DataDog)
4. Implement backup automation
5. Set up CI/CD pipeline
6. Add admin user management UI
7. Enable rate limiting on API endpoints
8. Configure log aggregation

---

**Deployment Status Checklist:**

- [ ] VPS provisioned and configured
- [ ] Docker and Docker Compose installed
- [ ] Application cloned and `.env` configured
- [ ] Services built and running
- [ ] Database migrated and seeded
- [ ] Firewall configured
- [ ] Domain configured (if applicable)
- [ ] HTTPS enabled (if applicable)
- [ ] Backups configured
- [ ] Monitoring set up

**You're now running PriceWatch in production! 🚀**
