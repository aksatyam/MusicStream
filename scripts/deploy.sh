#!/usr/bin/env bash
# MusicStream — Production Deployment Script
# Usage: ./scripts/deploy.sh [--build] [--down] [--logs] [--status]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.production.example"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
err()  { echo -e "${RED}[error]${NC} $1" >&2; }

# ─── Prerequisites ─────────────────────────────────────────
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        err "Docker is not installed. Install it from https://docs.docker.com/engine/install/"
        exit 1
    fi

    if ! docker compose version &>/dev/null; then
        err "Docker Compose v2 is not installed."
        exit 1
    fi

    if ! docker info &>/dev/null 2>&1; then
        err "Docker daemon is not running. Start it first."
        exit 1
    fi

    log "Prerequisites OK"
}

# ─── Environment Setup ────────────────────────────────────
setup_env() {
    if [ ! -f "$ENV_FILE" ]; then
        warn ".env file not found. Creating from template..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"

        # Generate secure random values
        GENERATED_PG_PASS=$(openssl rand -hex 32)
        GENERATED_REDIS_PASS=$(openssl rand -hex 32)
        GENERATED_JWT_SECRET=$(openssl rand -hex 32)

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/POSTGRES_PASSWORD=CHANGE_ME_generate_with_openssl_rand_hex_32/POSTGRES_PASSWORD=$GENERATED_PG_PASS/" "$ENV_FILE"
            sed -i '' "s/REDIS_PASSWORD=CHANGE_ME_generate_with_openssl_rand_hex_32/REDIS_PASSWORD=$GENERATED_REDIS_PASS/" "$ENV_FILE"
            sed -i '' "s/JWT_SECRET=CHANGE_ME_generate_with_openssl_rand_hex_32/JWT_SECRET=$GENERATED_JWT_SECRET/" "$ENV_FILE"
        else
            sed -i "s/POSTGRES_PASSWORD=CHANGE_ME_generate_with_openssl_rand_hex_32/POSTGRES_PASSWORD=$GENERATED_PG_PASS/" "$ENV_FILE"
            sed -i "s/REDIS_PASSWORD=CHANGE_ME_generate_with_openssl_rand_hex_32/REDIS_PASSWORD=$GENERATED_REDIS_PASS/" "$ENV_FILE"
            sed -i "s/JWT_SECRET=CHANGE_ME_generate_with_openssl_rand_hex_32/JWT_SECRET=$GENERATED_JWT_SECRET/" "$ENV_FILE"
        fi

        log "Generated secure passwords in .env"
        warn "Edit .env to set your DOMAIN and SSL_EMAIL before deploying!"
        echo ""
        echo -e "  ${CYAN}vim $ENV_FILE${NC}"
        echo ""
        exit 0
    fi

    # Validate required values
    source "$ENV_FILE"
    local missing=0

    if [ "${DOMAIN:-}" = "music.example.com" ] || [ -z "${DOMAIN:-}" ]; then
        err "DOMAIN is not set in .env. Set it to your actual domain."
        missing=1
    fi
    if [ "${JWT_SECRET:-}" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ] || [ -z "${JWT_SECRET:-}" ]; then
        err "JWT_SECRET is not set in .env."
        missing=1
    fi
    if [ "${POSTGRES_PASSWORD:-}" = "CHANGE_ME_generate_with_openssl_rand_hex_32" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
        err "POSTGRES_PASSWORD is not set in .env."
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi

    log "Environment OK (domain: $DOMAIN)"
}

# ─── SSL Check ────────────────────────────────────────────
check_ssl() {
    if [ ! -f "$ROOT_DIR/docker/nginx/certs/live/musicstream/fullchain.pem" ] && \
       [ ! -d "/etc/letsencrypt/live/musicstream" ]; then

        # Check if certbot volume has certs (from previous run)
        if docker volume inspect musicstream_certbot_certs &>/dev/null 2>&1; then
            log "SSL certs found in Docker volume"
            return 0
        fi

        warn "No SSL certificates found."
        echo ""
        echo "  Run SSL setup first:"
        echo -e "  ${CYAN}./scripts/init-ssl.sh${NC}"
        echo ""
        echo "  Or use self-signed certs for testing:"
        echo -e "  ${CYAN}./scripts/init-ssl.sh --self-signed${NC}"
        echo ""
        exit 1
    fi
}

# ─── Deploy ───────────────────────────────────────────────
deploy() {
    local build_flag=""
    if [ "${1:-}" = "--build" ]; then
        build_flag="--build"
    fi

    log "Deploying MusicStream..."

    docker compose -f "$COMPOSE_FILE" up -d $build_flag

    log "Waiting for services to become healthy..."
    sleep 5

    # Show status
    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    log "Deployment complete!"
    echo ""
    echo -e "  API:   ${CYAN}https://${DOMAIN}/api/health${NC}"
    echo -e "  Logs:  ${CYAN}./scripts/deploy.sh --logs${NC}"
    echo ""
}

# ─── Commands ─────────────────────────────────────────────
case "${1:-deploy}" in
    --build)
        check_prerequisites
        setup_env
        check_ssl
        deploy --build
        ;;
    --down)
        log "Stopping MusicStream..."
        docker compose -f "$COMPOSE_FILE" down
        log "All services stopped."
        ;;
    --logs)
        docker compose -f "$COMPOSE_FILE" logs -f --tail=100 "${2:-}"
        ;;
    --status)
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        docker compose -f "$COMPOSE_FILE" top
        ;;
    --restart)
        log "Restarting MusicStream..."
        docker compose -f "$COMPOSE_FILE" restart
        ;;
    deploy|"")
        check_prerequisites
        setup_env
        check_ssl
        deploy
        ;;
    --help|-h)
        echo "MusicStream Deployment"
        echo ""
        echo "Usage: ./scripts/deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (none)     Deploy / start services"
        echo "  --build    Build images and deploy"
        echo "  --down     Stop all services"
        echo "  --restart  Restart all services"
        echo "  --status   Show service status"
        echo "  --logs     Tail logs (optionally: --logs api)"
        echo "  --help     Show this help"
        ;;
    *)
        err "Unknown command: $1"
        echo "Run ./scripts/deploy.sh --help for usage"
        exit 1
        ;;
esac
