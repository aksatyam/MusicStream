#!/usr/bin/env bash
# MusicStream — Oracle Cloud Free Tier VPS Setup
# Run this ONCE on a fresh Ubuntu 22.04/24.04 ARM64 instance
# Usage: curl -fsSL <raw-url> | bash  OR  ./scripts/setup-oracle-vps.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[setup]${NC} $1"; }
err()  { echo -e "${RED}[setup]${NC} $1" >&2; }

# ─── System Updates ───────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ─── Install Docker ───────────────────────────────────────
if command -v docker &>/dev/null; then
    log "Docker already installed: $(docker --version)"
else
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    log "Docker installed: $(docker --version)"
fi

# ─── Install Docker Compose plugin ────────────────────────
if docker compose version &>/dev/null 2>&1; then
    log "Docker Compose already installed: $(docker compose version --short)"
else
    log "Installing Docker Compose plugin..."
    sudo apt-get install -y -qq docker-compose-plugin
    log "Docker Compose installed: $(docker compose version --short)"
fi

# ─── Install Git ──────────────────────────────────────────
if ! command -v git &>/dev/null; then
    log "Installing Git..."
    sudo apt-get install -y -qq git
fi

# ─── Firewall — open ports 80 and 443 ────────────────────
log "Configuring host firewall (iptables)..."

# Check if rules already exist
if sudo iptables -L INPUT -n | grep -q "dpt:80"; then
    log "Port 80 already open"
else
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
    log "Opened port 80"
fi

if sudo iptables -L INPUT -n | grep -q "dpt:443"; then
    log "Port 443 already open"
else
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
    log "Opened port 443"
fi

# Persist iptables rules
sudo apt-get install -y -qq iptables-persistent
sudo netfilter-persistent save 2>/dev/null || true

# ─── Swap (recommended for stability) ────────────────────
if [ ! -f /swapfile ]; then
    log "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    log "Swap configured (2GB)"
else
    log "Swap already configured"
fi

# ─── Enable Docker on boot ───────────────────────────────
sudo systemctl enable docker
sudo systemctl start docker

# ─── Summary ─────────────────────────────────────────────
echo ""
echo "============================================"
echo -e "${GREEN}  Oracle Cloud VPS Setup Complete!${NC}"
echo "============================================"
echo ""
echo "  Next steps:"
echo ""
echo -e "  1. ${CYAN}Log out and back in${NC} (for docker group to take effect)"
echo -e "     ${YELLOW}exit${NC} then SSH back in"
echo ""
echo -e "  2. ${CYAN}Clone the repo:${NC}"
echo -e "     git clone https://github.com/aksatyam/MusicStream.git"
echo -e "     cd MusicStream"
echo ""
echo -e "  3. ${CYAN}Run deploy script:${NC}"
echo -e "     ./scripts/deploy.sh"
echo -e "     ${YELLOW}# Edit .env with your domain, then:${NC}"
echo -e "     vim .env"
echo ""
echo -e "  4. ${CYAN}Get SSL certificate:${NC}"
echo -e "     ./scripts/init-ssl.sh"
echo -e "     ${YELLOW}# OR for testing without a domain:${NC}"
echo -e "     ./scripts/init-ssl.sh --self-signed"
echo ""
echo -e "  5. ${CYAN}Deploy:${NC}"
echo -e "     ./scripts/deploy.sh --build"
echo ""
echo -e "  ${RED}IMPORTANT:${NC} Also open ports 80 & 443 in OCI Console:"
echo -e "  Networking > VCN > Security Lists > Default > Add Ingress Rules"
echo -e "  Source: 0.0.0.0/0, Protocol: TCP, Dest Port: 80,443"
echo ""
