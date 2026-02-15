#!/usr/bin/env bash
#
# MusicStream — Local Development Startup Script
# Starts the full application stack for local testing.
#
# Usage:
#   ./scripts/dev-start.sh              # Start core services (API + DB + Redis)
#   ./scripts/dev-start.sh --full       # Start core + extractors + monitoring
#   ./scripts/dev-start.sh --stop       # Stop all services
#   ./scripts/dev-start.sh --status     # Show service status
#   ./scripts/dev-start.sh --logs       # Tail all service logs
#   ./scripts/dev-start.sh --reset      # Stop + wipe volumes + restart
#
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log()  { echo -e "${BLUE}[MusicStream]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── Pre-flight checks ──────────────────────────────────────
preflight() {
  local missing=()

  if ! command -v docker &>/dev/null; then
    missing+=("docker")
  fi

  if ! docker info &>/dev/null 2>&1; then
    err "Docker daemon is not running. Please start Docker Desktop."
    exit 1
  fi

  if ! command -v node &>/dev/null; then
    missing+=("node")
  fi

  if ! command -v npm &>/dev/null; then
    missing+=("npm")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    exit 1
  fi

  local node_ver
  node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
  if [[ "$node_ver" -lt 22 ]]; then
    warn "Node.js v22+ recommended. You have $(node -v)."
  fi
}

# ── Install dependencies if needed ─────────────────────────
install_deps() {
  if [[ ! -d "$PROJECT_ROOT/backend/node_modules" ]]; then
    log "Installing backend dependencies..."
    (cd "$PROJECT_ROOT/backend" && npm ci)
    ok "Backend deps installed"
  fi

  if [[ ! -d "$PROJECT_ROOT/mobile/node_modules" ]]; then
    log "Installing mobile dependencies..."
    (cd "$PROJECT_ROOT/mobile" && npm ci)
    ok "Mobile deps installed"
  fi
}

# ── Start core infrastructure (Postgres + Redis) ──────────
start_infra() {
  log "Starting infrastructure (PostgreSQL, Redis)..."
  docker compose up -d postgres redis
  ok "Postgres + Redis containers started"

  # Wait for healthy
  log "Waiting for databases to be ready..."
  local retries=30
  while [[ $retries -gt 0 ]]; do
    if docker compose exec -T postgres pg_isready -U musicstream &>/dev/null && \
       docker compose exec -T redis redis-cli ping &>/dev/null; then
      ok "PostgreSQL and Redis are healthy"
      return 0
    fi
    retries=$((retries - 1))
    sleep 1
  done

  err "Infrastructure failed to become healthy within 30s"
  exit 1
}

# ── Start API server (native, not in Docker) ──────────────
start_api() {
  log "Starting API server on http://localhost:3000 ..."

  # Export env vars for the backend running natively
  export NODE_ENV=development
  export PORT=3000
  export DATABASE_URL="postgresql://musicstream:localdev123@localhost:5432/musicstream"
  export REDIS_URL="redis://localhost:6379"
  export INVIDIOUS_URL="http://localhost:3001"
  export PIPED_URL="http://localhost:3002"
  export NEWPIPE_URL="http://localhost:3004"
  export JWT_SECRET="musicstream_dev_jwt_secret_key_change_in_production"
  export JWT_EXPIRES_IN="15m"
  export JWT_REFRESH_EXPIRES_IN="7d"
  export S3_BUCKET="musicstream-dev-assets"
  export S3_ENDPOINT="http://localhost:9000"
  export S3_ACCESS_KEY="minioadmin"
  export S3_SECRET_KEY="minioadmin"
  export LOG_LEVEL="info"

  # Run API in background, output to log file
  local api_log="$PROJECT_ROOT/.dev-api.log"
  (cd "$PROJECT_ROOT/backend" && npx tsx watch src/server.ts > "$api_log" 2>&1) &
  local api_pid=$!
  echo "$api_pid" > "$PROJECT_ROOT/.dev-api.pid"

  # Wait for API to respond
  log "Waiting for API to start..."
  local retries=20
  while [[ $retries -gt 0 ]]; do
    if curl -sf http://localhost:3000/api/health &>/dev/null; then
      ok "API server is running (PID: $api_pid)"
      return 0
    fi
    retries=$((retries - 1))
    sleep 1
  done

  warn "API may not be fully ready yet. Check logs: tail -f $api_log"
}

# ── Start extractors (optional) ───────────────────────────
start_extractors() {
  log "Starting extractors (Invidious, Piped) — this may take a few minutes..."
  docker compose --profile extractors up -d invidious piped piped-proxy
  ok "Extractor containers started (may still be initializing)"
}

# ── Start monitoring (optional) ───────────────────────────
start_monitoring() {
  log "Starting monitoring (Prometheus, Grafana)..."
  docker compose up -d minio prometheus grafana
  ok "Monitoring stack started"
}

# ── Print status ──────────────────────────────────────────
print_status() {
  echo ""
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${CYAN}  MusicStream Local Development Environment${NC}"
  echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}"
  echo ""

  # Docker services
  echo -e "${BOLD}Docker Services:${NC}"
  docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
  echo ""

  # API process
  if [[ -f "$PROJECT_ROOT/.dev-api.pid" ]]; then
    local pid
    pid=$(cat "$PROJECT_ROOT/.dev-api.pid")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${BOLD}API Server:${NC} ${GREEN}Running${NC} (PID: $pid)"
    else
      echo -e "${BOLD}API Server:${NC} ${RED}Stopped${NC}"
    fi
  else
    echo -e "${BOLD}API Server:${NC} ${YELLOW}Not started via this script${NC}"
  fi

  echo ""
  echo -e "${BOLD}Endpoints:${NC}"
  echo -e "  API Health:    ${CYAN}http://localhost:3000/api/health${NC}"
  echo -e "  API Auth:      ${CYAN}http://localhost:3000/api/auth/login${NC}"
  echo -e "  API Search:    ${CYAN}http://localhost:3000/api/search?q=test${NC}"
  echo -e "  PostgreSQL:    ${CYAN}localhost:5432${NC}  (user: musicstream / pass: localdev123)"
  echo -e "  Redis:         ${CYAN}localhost:6379${NC}"

  if docker compose ps piped --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo -e "  Piped:         ${CYAN}http://localhost:3002${NC}"
  fi
  if docker compose ps invidious --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo -e "  Invidious:     ${CYAN}http://localhost:3001${NC}"
  fi
  if docker compose ps grafana --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
    echo -e "  Grafana:       ${CYAN}http://localhost:3005${NC}  (admin/admin)"
    echo -e "  MinIO Console: ${CYAN}http://localhost:9001${NC}  (minioadmin/minioadmin)"
  fi

  echo ""
  echo -e "${BOLD}Useful commands:${NC}"
  echo -e "  Run backend tests:   ${CYAN}cd backend && npm test${NC}"
  echo -e "  Run mobile tests:    ${CYAN}cd mobile && npm test${NC}"
  echo -e "  Run mobile (iOS):    ${CYAN}cd mobile && npx react-native run-ios${NC}"
  echo -e "  API logs:            ${CYAN}tail -f .dev-api.log${NC}"
  echo -e "  Docker logs:         ${CYAN}docker compose logs -f${NC}"
  echo -e "  Stop everything:     ${CYAN}./scripts/dev-start.sh --stop${NC}"
  echo ""
}

# ── Stop everything ───────────────────────────────────────
stop_all() {
  log "Stopping all services..."

  # Stop native API
  if [[ -f "$PROJECT_ROOT/.dev-api.pid" ]]; then
    local pid
    pid=$(cat "$PROJECT_ROOT/.dev-api.pid")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      # Also kill child processes (tsx watch spawns children)
      pkill -P "$pid" 2>/dev/null || true
      ok "API server stopped (PID: $pid)"
    fi
    rm -f "$PROJECT_ROOT/.dev-api.pid"
  fi

  # Stop Docker services
  docker compose --profile extractors down 2>/dev/null || docker compose down
  ok "Docker services stopped"

  rm -f "$PROJECT_ROOT/.dev-api.log"
}

# ── Reset (nuke volumes) ─────────────────────────────────
reset_all() {
  warn "This will destroy all local data (databases, caches, etc.)"
  read -rp "Are you sure? [y/N] " confirm
  if [[ "$confirm" != [yY] ]]; then
    log "Aborted."
    exit 0
  fi

  stop_all
  log "Removing Docker volumes..."
  docker compose --profile extractors down -v 2>/dev/null || docker compose down -v
  ok "All volumes removed"
  log "Restarting fresh..."
  main_start "${1:-}"
}

# ── Main start logic ─────────────────────────────────────
main_start() {
  local mode="${1:-core}"

  echo ""
  echo -e "${BOLD}${GREEN}🎵 MusicStream Local Dev Startup${NC}"
  echo ""

  preflight
  install_deps
  start_infra
  start_api

  if [[ "$mode" == "full" ]]; then
    start_extractors
    start_monitoring
  fi

  print_status
}

# ── Entry point ───────────────────────────────────────────
case "${1:-}" in
  --full)
    main_start "full"
    ;;
  --stop)
    stop_all
    ;;
  --status)
    print_status
    ;;
  --logs)
    echo -e "${BOLD}Tailing all logs (Ctrl+C to stop)...${NC}"
    docker compose logs -f &
    [[ -f "$PROJECT_ROOT/.dev-api.log" ]] && tail -f "$PROJECT_ROOT/.dev-api.log" &
    wait
    ;;
  --reset)
    reset_all "${2:-core}"
    ;;
  --help|-h)
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  (none)       Start core services (API + PostgreSQL + Redis)"
    echo "  --full       Start all services including extractors & monitoring"
    echo "  --stop       Stop all running services"
    echo "  --status     Show current service status"
    echo "  --logs       Tail logs from all services"
    echo "  --reset      Nuke everything and start fresh"
    echo "  --help       Show this help message"
    ;;
  *)
    main_start "core"
    ;;
esac
