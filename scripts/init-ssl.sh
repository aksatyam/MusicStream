#!/usr/bin/env bash
# MusicStream — SSL Certificate Setup
# Usage:
#   ./scripts/init-ssl.sh                 # Let's Encrypt (requires domain + port 80)
#   ./scripts/init-ssl.sh --self-signed   # Self-signed cert for testing
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
CERT_DIR="$ROOT_DIR/docker/nginx/certs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[ssl]${NC} $1"; }
warn() { echo -e "${YELLOW}[ssl]${NC} $1"; }
err()  { echo -e "${RED}[ssl]${NC} $1" >&2; }

# ─── Self-signed certificate ──────────────────────────────
generate_self_signed() {
    log "Generating self-signed certificate for testing..."

    local cert_path="$CERT_DIR/live/musicstream"
    mkdir -p "$cert_path"

    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout "$cert_path/privkey.pem" \
        -out "$cert_path/fullchain.pem" \
        -subj "/CN=localhost/O=MusicStream/C=US" \
        2>/dev/null

    log "Self-signed certificate created at $cert_path"
    warn "Browsers will show a security warning — this is expected for testing."
    echo ""
    echo "  Now run:"
    echo -e "  ${CYAN}./scripts/deploy.sh --build${NC}"
    echo ""
}

# ─── Let's Encrypt certificate ─────────────────────────────
generate_letsencrypt() {
    if [ ! -f "$ENV_FILE" ]; then
        err ".env file not found. Run ./scripts/deploy.sh first to generate it."
        exit 1
    fi

    source "$ENV_FILE"

    if [ "${DOMAIN:-}" = "music.example.com" ] || [ -z "${DOMAIN:-}" ]; then
        err "DOMAIN is not set in .env. Set it to your actual domain."
        exit 1
    fi

    if [ -z "${SSL_EMAIL:-}" ] || [ "${SSL_EMAIL:-}" = "admin@example.com" ]; then
        err "SSL_EMAIL is not set in .env. Set it for Let's Encrypt notifications."
        exit 1
    fi

    log "Obtaining Let's Encrypt certificate for $DOMAIN..."

    # Stop nginx if running (certbot needs port 80)
    docker compose -f "$ROOT_DIR/docker-compose.prod.yml" stop nginx 2>/dev/null || true

    # Run certbot in standalone mode
    docker run --rm \
        -v musicstream_certbot_certs:/etc/letsencrypt \
        -v musicstream_certbot_webroot:/var/www/certbot \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$SSL_EMAIL" \
        --cert-name musicstream \
        -d "$DOMAIN"

    log "Certificate obtained for $DOMAIN"

    # Set up auto-renewal cron job
    setup_renewal_cron

    echo ""
    echo "  Now run:"
    echo -e "  ${CYAN}./scripts/deploy.sh --build${NC}"
    echo ""
}

# ─── Auto-renewal cron ─────────────────────────────────────
setup_renewal_cron() {
    # The certbot container in docker-compose.prod.yml handles renewal
    # This adds a system cron as a backup to reload nginx after renewal
    local cron_cmd="0 0 * * * cd $ROOT_DIR && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload 2>/dev/null"

    if crontab -l 2>/dev/null | grep -q "musicstream.*nginx.*reload"; then
        log "Renewal cron already configured"
    else
        (crontab -l 2>/dev/null; echo "$cron_cmd # musicstream ssl renewal") | crontab -
        log "Added daily nginx reload cron for certificate renewal"
    fi
}

# ─── Main ──────────────────────────────────────────────────
case "${1:-letsencrypt}" in
    --self-signed)
        generate_self_signed
        ;;
    --help|-h)
        echo "MusicStream SSL Setup"
        echo ""
        echo "Usage: ./scripts/init-ssl.sh [option]"
        echo ""
        echo "Options:"
        echo "  (none)         Obtain Let's Encrypt certificate (needs domain + port 80)"
        echo "  --self-signed  Generate self-signed cert for local/testing use"
        echo "  --help         Show this help"
        ;;
    letsencrypt|"")
        generate_letsencrypt
        ;;
    *)
        err "Unknown option: $1"
        echo "Run ./scripts/init-ssl.sh --help for usage"
        exit 1
        ;;
esac
