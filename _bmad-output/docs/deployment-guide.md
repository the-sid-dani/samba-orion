# Deployment Guide

> Production deployment for Samba AI

---

## Deployment Options

| Method | Best For | Complexity |
|--------|----------|------------|
| **Docker Compose** | Self-hosted, full control | Medium |
| **Docker + Managed DB** | Production with managed PostgreSQL | Medium |
| **Vercel** | Serverless, auto-scaling | Low |

---

## Docker Deployment

### Prerequisites

- Docker 24+
- Docker Compose v2+
- Domain with SSL (recommended)

### 1. Build Image

```bash
# From project root
docker build -t samba-ai:latest -f docker/Dockerfile .
```

### 2. Configure Environment

Create `docker/.env`:

```bash
# Database
POSTGRES_URL=postgres://postgres:password@postgres:5432/samba
POSTGRES_PASSWORD=password
POSTGRES_USER=postgres
POSTGRES_DB=samba

# Auth
BETTER_AUTH_SECRET=<generate-32-char-secret>
BETTER_AUTH_URL=https://your-domain.com

# AI Providers (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Optional
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

### 3. Deploy with Compose

```bash
cd docker
docker compose up -d
```

**Services Started:**
- `better-chatbot`: Main application on port 3000
- `postgres`: PostgreSQL 17 with persistent volume

### 4. Run Migrations

```bash
# First time only
docker compose exec better-chatbot node -e "
  const { db } = require('./src/lib/db/pg/connection');
  // Migrations auto-run on startup
"
```

---

## Docker Compose Configuration

```yaml
# docker/compose.yml
services:
  better-chatbot:
    build:
      context: ..
      dockerfile: ./docker/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NO_HTTPS=1
    env_file:
      - .env
    networks:
      - better-chatbot-networks
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:17
    env_file:
      - .env
    networks:
      - better-chatbot-networks
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  better-chatbot-networks:
    driver: bridge
```

---

## Dockerfile Explained

```dockerfile
# Multi-stage build for optimal image size

# Stage 1: Build
FROM node:23-alpine AS builder
WORKDIR /app
COPY . .
RUN corepack enable pnpm
RUN pnpm install --frozen-lockfile
ENV NEXT_STANDALONE_OUTPUT="true"
RUN pnpm build

# Stage 2: Runtime
FROM node:23-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

USER nextjs
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["node", "server.js"]
```

**Image Size:** ~200MB (standalone output)

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Select `Next.js` framework preset

### 2. Configure Environment

Add all required environment variables in Vercel dashboard:

| Variable | Required | Notes |
|----------|----------|-------|
| `POSTGRES_URL` | ✓ | Use Vercel Postgres or external |
| `BETTER_AUTH_SECRET` | ✓ | Generate secure secret |
| `BETTER_AUTH_URL` | ✓ | Your Vercel deployment URL |
| `OPENAI_API_KEY` | One required | Or other provider keys |

### 3. Database Setup

**Option A: Vercel Postgres**
```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Create Postgres
vercel storage create postgres
```

**Option B: External PostgreSQL**

Use any PostgreSQL 14+ provider:
- Supabase
- Neon
- Railway
- AWS RDS

### 4. Deploy

```bash
vercel --prod
```

Or push to main branch for automatic deployment.

---

## SSL/TLS Configuration

### With Reverse Proxy (Recommended)

Use nginx or Caddy in front of Docker:

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### With Caddy (Automatic SSL)

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## Production Checklist

### Security

- [ ] HTTPS enabled
- [ ] `BETTER_AUTH_SECRET` is unique and secure
- [ ] Database credentials are strong
- [ ] API keys stored securely (not in code)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

### Performance

- [ ] PostgreSQL connection pooling configured
- [ ] Static assets cached
- [ ] Gzip/Brotli compression enabled
- [ ] CDN for static files (optional)

### Monitoring

- [ ] Langfuse connected for AI observability
- [ ] Error tracking configured
- [ ] Health endpoints monitored
- [ ] Database backups scheduled

### Environment

```bash
# Production environment variables
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

---

## Health Checks

### Application Health

```bash
curl http://localhost:3000/api/health
```

### Langfuse Connection

```bash
curl http://localhost:3000/api/health/langfuse
```

### Database Connection

Check via Drizzle Studio or direct PostgreSQL query:

```sql
SELECT NOW();
```

---

## Scaling

### Horizontal Scaling

Run multiple container instances behind a load balancer:

```yaml
# docker-compose.scale.yml
services:
  better-chatbot:
    deploy:
      replicas: 3
```

**Requirements:**
- Shared PostgreSQL
- Sticky sessions for WebSocket (if using)
- Shared file storage for uploads

### Vertical Scaling

Increase container resources:

```yaml
services:
  better-chatbot:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U postgres samba > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres samba < backup.sql
```

### Automated Backups

```bash
# cron job example
0 0 * * * /usr/local/bin/backup-samba.sh
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs better-chatbot

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker compose ps

# Check connection string
docker compose exec better-chatbot env | grep POSTGRES
```

### Memory Issues

```bash
# Check memory usage
docker stats

# Increase if needed
docker compose up -d --memory="4g"
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

---

## Updates

### Rolling Update

```bash
# Pull latest
git pull

# Rebuild and deploy
docker compose build
docker compose up -d

# Run migrations if schema changed
docker compose exec better-chatbot pnpm db:migrate
```

### Zero-Downtime Deploy

Use blue-green deployment:

```bash
# Deploy to new container
docker compose -f compose.blue.yml up -d

# Switch traffic
# Update nginx/load balancer

# Stop old container
docker compose -f compose.green.yml down
```

---

*Generated from deployment configuration on 2025-12-30*

