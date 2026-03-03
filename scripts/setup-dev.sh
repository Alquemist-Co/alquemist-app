#!/usr/bin/env bash
set -euo pipefail

# Full clean development environment setup
# Usage: bash scripts/setup-dev.sh
#
# This script is idempotent — safe to run multiple times.
# On WSL2, it auto-detects and handles Docker port binding issues.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
check() { echo -e "${GREEN}  [OK]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
info "=============================="
info "  Alquemist Dev Environment"
info "=============================="
echo ""

# ============================================================
# Step 1: Prerequisites
# ============================================================
info "Checking prerequisites..."

# 1a. Node.js >= 20
command -v node >/dev/null 2>&1 || error "Node.js not found. Install Node.js >= 20."
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_VERSION" -ge 20 ] || error "Node.js >= 20 required. Found: $(node --version)"
check "Node.js $(node --version)"

# 1b. pnpm
command -v pnpm >/dev/null 2>&1 || error "pnpm not found. Install: npm install -g pnpm"
check "pnpm $(pnpm --version)"

# 1c. Docker daemon running
command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker Desktop or Docker Engine."
if ! docker info >/dev/null 2>&1; then
  if grep -qi "microsoft" /proc/version 2>/dev/null; then
    warn "Docker daemon not responding. WSL2 detected."
    warn "Attempting: sudo service docker restart (may ask for password)"
    if sudo service docker restart 2>/dev/null; then
      sleep 3
      docker info >/dev/null 2>&1 || error "Docker still not responding. Open Docker Desktop from Windows and retry."
    else
      error "Could not restart Docker. Open Docker Desktop from Windows and retry."
    fi
  else
    error "Docker daemon not responding. Start Docker and retry."
  fi
fi
check "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# 1d. Docker Compose
docker compose version >/dev/null 2>&1 || error "Docker Compose not found. Update Docker."
check "Docker Compose $(docker compose version --short)"

# 1e. Supabase CLI (via npx)
npx supabase --version >/dev/null 2>&1 || error "Supabase CLI not available via npx."
check "Supabase CLI $(npx supabase --version)"

# ============================================================
# Step 2: WSL2-specific checks + Docker port binding test
# ============================================================
if grep -qi "microsoft" /proc/version 2>/dev/null; then
  info "WSL2 environment detected. Running checks..."

  # Read ports from config.toml
  API_PORT=$(grep -E '^\[api\]' -A5 supabase/config.toml | grep '^port' | head -1 | tr -dc '0-9')
  DB_PORT=$(grep -E '^\[db\]' -A5 supabase/config.toml | grep '^port' | head -1 | tr -dc '0-9')

  # Check if ports are already in use
  for port in $API_PORT $DB_PORT; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      warn "Port $port is already in use (may be a previous Supabase instance)"
    fi
  done

  # Test Docker port binding — this is the most common WSL2 failure mode
  # Use an ephemeral test port (not one Supabase uses, in case it's already running)
  TEST_PORT=19876
  info "Testing Docker port binding..."
  if docker run --rm -p "${TEST_PORT}:80" alpine echo "port_ok" >/dev/null 2>&1; then
    check "Docker port binding works"
  else
    echo ""
    error "Docker cannot bind ports (common WSL2/Hyper-V issue).

  Fix: Restart Docker service:
    sudo service docker restart

  If that doesn't work, reinstall Docker:
    sudo apt-get purge -y docker-ce docker-ce-cli containerd.io
    # Then reinstall following docs/DEVELOPMENT.md"
  fi
else
  # Non-WSL2: basic port check
  API_PORT=$(grep -E '^\[api\]' -A5 supabase/config.toml | grep '^port' | head -1 | tr -dc '0-9')
  DB_PORT=$(grep -E '^\[db\]' -A5 supabase/config.toml | grep '^port' | head -1 | tr -dc '0-9')
  for port in $API_PORT $DB_PORT; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      warn "Port $port is already in use"
    fi
  done
fi

# ============================================================
# Step 3: Install pnpm dependencies
# ============================================================
info "Installing pnpm dependencies..."
pnpm install --frozen-lockfile
check "Dependencies installed"

# ============================================================
# Step 4: Stop existing Supabase (clean slate)
# ============================================================
info "Stopping any existing Supabase containers..."
npx supabase stop --no-backup 2>/dev/null || true
check "Previous containers stopped"

# ============================================================
# Step 5: Start Supabase
# ============================================================
info "Starting Supabase (this may take a few minutes on first run)..."
npx supabase start
check "Supabase started"

# ============================================================
# Step 6: Generate .env.local
# ============================================================
info "Generating .env.local from Supabase status..."

# Preserve existing RESEND_API_KEY if present
EXISTING_RESEND=""
if [ -f .env.local ] && grep -q "^RESEND_API_KEY=" .env.local; then
  EXISTING_RESEND=$(grep "^RESEND_API_KEY=" .env.local)
fi

ENV_CONTENT=$(npx supabase status -o env 2>/dev/null)

# Extract values and write with our app's variable names
API_URL=$(echo "$ENV_CONTENT" | grep '^API_URL=' | cut -d= -f2- | tr -d '"')
ANON_KEY=$(echo "$ENV_CONTENT" | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')
SVC_KEY=$(echo "$ENV_CONTENT" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')

{
  echo "NEXT_PUBLIC_SUPABASE_URL=${API_URL}"
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}"
  echo "SUPABASE_SERVICE_ROLE_KEY=${SVC_KEY}"
  echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
  if [ -n "$EXISTING_RESEND" ]; then
    echo "$EXISTING_RESEND"
  else
    echo "RESEND_API_KEY=re_xxxxx"
  fi
} > .env.local

check ".env.local generated"

# ============================================================
# Step 7: Generate TypeScript types
# ============================================================
info "Generating TypeScript types from database..."
pnpm gen:types
check "TypeScript types generated (types/database.ts)"

# ============================================================
# Step 8: Run health checks
# ============================================================
info "Running health checks..."
bash "${SCRIPT_DIR}/health-check.sh" || error "Health checks failed. See output above."
check "All health checks passed"

# ============================================================
# Step 9: Summary (dynamic URLs from supabase status)
# ============================================================
SUMMARY_ENV=$(npx supabase status -o env 2>/dev/null)
SUMMARY_API=$(echo "$SUMMARY_ENV" | grep '^API_URL=' | cut -d= -f2-)
SUMMARY_DB=$(echo "$SUMMARY_ENV" | grep '^DB_URL=' | cut -d= -f2-)
SUMMARY_STUDIO=$(echo "$SUMMARY_ENV" | grep '^STUDIO_URL=' | cut -d= -f2-)
SUMMARY_INBUCKET=$(echo "$SUMMARY_ENV" | grep '^INBUCKET_URL=' | cut -d= -f2-)

echo ""
info "=============================="
info "  Setup complete!"
info "=============================="
echo ""
echo "  Supabase Studio:  ${SUMMARY_STUDIO:-http://127.0.0.1:15434}"
echo "  Supabase API:     ${SUMMARY_API:-http://127.0.0.1:15432}"
echo "  Inbucket (email): ${SUMMARY_INBUCKET:-http://127.0.0.1:15435}"
echo "  Database:         ${SUMMARY_DB:-postgresql://postgres:postgres@127.0.0.1:15433/postgres}"
echo ""
echo "  Test user: admin@test.com / password123"
echo ""
echo "  Next steps:"
echo "    pnpm dev          — Start Next.js dev server only"
echo "    pnpm dev:start    — Start Supabase + Next.js together"
echo ""
