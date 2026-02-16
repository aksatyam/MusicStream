# MusicStream — Deployment Guide

Two deployment options are available:

| Option | Cost | Setup Time | Best For |
|--------|------|-----------|----------|
| **[Render.com](#option-1-rendercom-recommended)** | Free | 5 minutes | Quick, no server management |
| **[VPS + Docker Compose](#option-2-vps--docker-compose)** | Free–$5/mo | 20 minutes | Full control, any VPS provider |

---

## Option 1: Render.com (Recommended)

Deploy with free managed PostgreSQL, Redis, and auto-HTTPS — no server to manage.

### What You Get (Free Tier)

| Service | Specs | Limit |
|---------|-------|-------|
| Web Service | 512 MB RAM, Docker | 750 hrs/month |
| PostgreSQL 16 | 1 GB storage | Never expires |
| Redis | 25 MB (cache) | Never expires |
| HTTPS/SSL | Automatic | Free |
| Custom Domain | Supported | Free |

> **Note:** Free web services sleep after 15 min of inactivity (10-30 sec cold start on next request).

### Step 1: Push Code to GitHub

Make sure your MusicStream repo is on GitHub with the latest code:

```bash
git add -A && git commit -m "Add Render deployment config" && git push
```

### Step 2: Create a Render Account

1. Go to [render.com](https://render.com) and sign up with **GitHub**
2. No credit card required

### Step 3: Deploy via Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your **MusicStream** GitHub repository
4. Render detects the `render.yaml` file automatically
5. Review the services it will create:
   - `musicstream-api` (Web Service)
   - `musicstream-db` (PostgreSQL)
   - `musicstream-redis` (Redis)
6. Click **Apply** and wait for all 3 services to deploy (3-5 minutes)

### Step 4: Run Database Migration

Migrations run automatically on startup. Check the deploy logs:

1. Go to **Dashboard** → **musicstream-api** → **Logs**
2. You should see:
   ```
   Running migration: 001_initial_schema.sql
   Migration complete: 001_initial_schema.sql
   Database migrations complete
   MusicStream API running on port 10000
   ```

### Step 5: Verify

Your API is live at:

```
https://musicstream-api.onrender.com/api/health
```

You should see:

```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Step 6: Update Mobile App

Update the production API URL in `mobile/src/services/api.ts`:

```typescript
const PRODUCTION_API_URL = 'https://musicstream-api.onrender.com/api';
```

### Render Architecture

```
Internet (HTTPS)
      │
      ▼
┌─────────────────────────────────────────────┐
│  Render Platform (Managed)                  │
│                                             │
│  ┌──────────────────────────────────┐       │
│  │  musicstream-api (Docker)        │       │
│  │  Port 10000 + Auto HTTPS        │       │
│  └──────────┬───────────┬──────────┘       │
│             │           │                   │
│       ┌─────▼─────┐  ┌─▼──────────┐       │
│       │ PostgreSQL │  │   Redis    │       │
│       │   1 GB     │  │   25 MB    │       │
│       └───────────┘  └────────────┘       │
└─────────────────────────────────────────────┘
```

### Updating on Render

Just push to GitHub — Render auto-deploys:

```bash
git push origin main
# Render detects the push and redeploys automatically
```

### Render Troubleshooting

**Build fails:**
- Check logs in Dashboard → musicstream-api → Events
- Make sure `backend/Dockerfile.render` is present and `render.yaml` points to it

**Database connection error:**
- Render auto-injects `DATABASE_URL` — check Environment tab
- Render Postgres requires SSL (already configured in `db.ts`)

**Redis connection error:**
- Check that the Redis service is running in Dashboard
- The `REDIS_URL` is auto-injected from the Blueprint

**Service sleeping / cold starts:**
- Free tier sleeps after 15 min inactivity — this is normal
- First request after sleep takes 10-30 seconds
- Consider upgrading to Starter ($7/mo) to keep service awake

**Custom domain:**
- Dashboard → musicstream-api → Settings → Custom Domains
- Add your domain and configure DNS as instructed

---

## Option 2: VPS + Docker Compose

Deploy on any Linux VPS with Docker Compose (Oracle Cloud, DigitalOcean, Hetzner, etc.).

### Prerequisites

- A Linux VPS with 1+ GB RAM, 20+ GB disk
- SSH access with root/sudo
- Optional: a domain name

### Step 1: Server Setup

```bash
ssh user@<your-server-ip>

# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/aksatyam/MusicStream/main/scripts/setup-oracle-vps.sh | bash

# Log out and back in (for docker group)
exit
ssh user@<your-server-ip>
```

### Step 2: Clone and Configure

```bash
git clone https://github.com/aksatyam/MusicStream.git
cd MusicStream

# First run — generates .env with secure passwords
./scripts/deploy.sh

# Edit if needed
vim .env
```

### Step 3: SSL Certificate

**With a domain:**

```bash
./scripts/init-ssl.sh
```

**Without a domain (self-signed for testing):**

```bash
./scripts/init-ssl.sh --self-signed
```

### Step 4: Deploy

```bash
./scripts/deploy.sh --build
```

### Management Commands

```bash
./scripts/deploy.sh --build     # Rebuild and deploy
./scripts/deploy.sh --down      # Stop all services
./scripts/deploy.sh --restart   # Restart services
./scripts/deploy.sh --logs      # Tail all logs
./scripts/deploy.sh --status    # Show service status
```

### VPS Architecture

```
Internet
   │
   ▼
┌──────────────────────────────────────────┐
│  VPS (any Linux server)                  │
│                                          │
│  ┌─────────┐    ┌──────────────────┐     │
│  │  Nginx   │───▶│  MusicStream API │     │
│  │ :80/:443 │    │     :3000        │     │
│  └─────────┘    └──────┬───────────┘     │
│                         │                 │
│              ┌──────────┼──────────┐      │
│              ▼                     ▼      │
│       ┌────────────┐      ┌────────────┐  │
│       │ PostgreSQL │      │   Redis    │  │
│       │    :5432   │      │   :6379    │  │
│       └────────────┘      └────────────┘  │
│                                          │
│  Certbot (auto SSL renewal every 12h)    │
└──────────────────────────────────────────┘
```
