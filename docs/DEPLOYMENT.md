# MusicStream — Deployment Guide (Oracle Cloud Free Tier)

Deploy the MusicStream backend on Oracle Cloud's Always Free tier — 4 ARM CPUs, 24GB RAM, 200GB storage, completely free.

## Prerequisites

- Oracle Cloud account ([sign up free](https://cloud.oracle.com/free))
- A domain name pointing to your server IP (optional for testing)

## Step 1: Create the VM

1. Log into Oracle Cloud Console
2. Go to **Compute > Instances > Create Instance**
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | musicstream |
| **Image** | Ubuntu 22.04 or 24.04 (Canonical) |
| **Shape** | VM.Standard.A1.Flex (ARM) |
| **OCPUs** | 2 (save 2 for future use) |
| **RAM** | 12 GB (save 12 for future use) |
| **Boot volume** | 100 GB |
| **SSH key** | Upload your public key |

4. Click **Create** and wait for the instance to be running
5. Copy the **Public IP address**

## Step 2: Open Firewall Ports (OCI Console)

1. Go to **Networking > Virtual Cloud Networks**
2. Click your VCN > **Security Lists** > **Default Security List**
3. Click **Add Ingress Rules** and add:

| Source CIDR | Protocol | Dest Port | Description |
|-------------|----------|-----------|-------------|
| 0.0.0.0/0 | TCP | 80 | HTTP |
| 0.0.0.0/0 | TCP | 443 | HTTPS |

## Step 3: Server Setup

SSH into the instance and run the setup script:

```bash
ssh ubuntu@<your-public-ip>

# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/aksatyam/MusicStream/main/scripts/setup-oracle-vps.sh | bash

# Log out and back in (for docker group)
exit
ssh ubuntu@<your-public-ip>
```

This installs Docker, Docker Compose, opens firewall ports, and adds swap.

## Step 4: Clone and Configure

```bash
git clone https://github.com/aksatyam/MusicStream.git
cd MusicStream

# First run — generates .env with secure passwords
./scripts/deploy.sh

# Edit the environment file
vim .env
```

Set these values in `.env`:

```
DOMAIN=music.yourdomain.com    # Your domain (or server IP for testing)
SSL_EMAIL=you@email.com        # For Let's Encrypt notifications
```

The script auto-generates secure passwords for Postgres, Redis, and JWT.

## Step 5: SSL Certificate

**With a domain (recommended):**

```bash
# Point your domain's A record to the server IP first, then:
./scripts/init-ssl.sh
```

**Without a domain (testing):**

```bash
./scripts/init-ssl.sh --self-signed
```

## Step 6: Deploy

```bash
./scripts/deploy.sh --build
```

The first build takes 2-3 minutes. After that:

```bash
# Check everything is healthy
./scripts/deploy.sh --status

# Test the API
curl https://music.yourdomain.com/api/health
```

## Management Commands

```bash
./scripts/deploy.sh --build     # Rebuild and deploy
./scripts/deploy.sh --down      # Stop all services
./scripts/deploy.sh --restart   # Restart services
./scripts/deploy.sh --logs      # Tail all logs
./scripts/deploy.sh --logs api  # Tail API logs only
./scripts/deploy.sh --status    # Show service status
```

## Architecture on Oracle Cloud

```
Internet
   │
   ▼
┌──────────────────────────────────────────┐
│  Oracle Cloud VM (ARM, 2 OCPU, 12GB)    │
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

## Updating

To deploy a new version:

```bash
cd MusicStream
git pull origin main
./scripts/deploy.sh --build
```

## Resource Usage

Expected resource usage on Oracle Cloud free tier:

| Service | CPU | RAM | Storage |
|---------|-----|-----|---------|
| PostgreSQL | ~0.1 OCPU | ~200 MB | ~1 GB |
| Redis | ~0.05 OCPU | ~50 MB | ~10 MB |
| API + yt-dlp | ~0.3 OCPU | ~300 MB | ~500 MB |
| Nginx | ~0.05 OCPU | ~20 MB | ~5 MB |
| **Total** | **~0.5 OCPU** | **~570 MB** | **~1.5 GB** |

This leaves plenty of headroom on a 2 OCPU / 12 GB instance.

## Troubleshooting

**"Out of capacity" when creating VM:**
Oracle free tier VMs are subject to availability. Try a different availability domain or region.

**Can't reach the server on port 80/443:**
Check both layers:
1. OCI Security List ingress rules (Console)
2. Host iptables: `sudo iptables -L INPUT -n | grep -E "80|443"`

**Docker permission denied:**
Log out and back in after setup, or run: `newgrp docker`

**SSL certificate fails:**
Ensure your domain's A record points to the server IP and DNS has propagated: `dig +short music.yourdomain.com`

**Instance reclaimed by Oracle:**
Free tier instances with <20% CPU at the 95th percentile for 7 days may be reclaimed. The Certbot renewal timer and Redis persistence keep some baseline activity.
