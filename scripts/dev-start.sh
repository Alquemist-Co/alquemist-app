#!/usr/bin/env bash
set -euo pipefail

# Start Supabase (if needed) + Next.js dev server
# Usage: bash scripts/dev-start.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- Ensure Docker is running ---
if ! docker info >/dev/null 2>&1; then
  if grep -qi "microsoft" /proc/version 2>/dev/null; then
    warn "Docker not responding. WSL2 detected."
    warn "Attempting: sudo service docker restart"
    if sudo service docker restart 2>/dev/null; then
      sleep 3
      docker info >/dev/null 2>&1 || { echo -e "${RED}[ERROR]${NC} Docker still not responding. Open Docker Desktop from Windows."; exit 1; }
    else
      echo -e "${RED}[ERROR]${NC} Could not restart Docker. Open Docker Desktop from Windows."
      exit 1
    fi
  else
    echo -e "${RED}[ERROR]${NC} Docker is not running. Start Docker and retry."
    exit 1
  fi
fi

# --- Start Supabase if not running ---
if npx supabase status >/dev/null 2>&1; then
  info "Supabase is already running"
else
  info "Starting Supabase..."
  npx supabase start
  info "Supabase started"
fi

# --- Verify .env.local exists ---
if [ ! -f .env.local ]; then
  warn ".env.local not found — generating from Supabase status..."
  ENV_CONTENT=$(npx supabase status -o env 2>/dev/null)
  API_URL=$(echo "$ENV_CONTENT" | grep '^API_URL=' | cut -d= -f2- | tr -d '"')
  ANON_KEY=$(echo "$ENV_CONTENT" | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')
  SVC_KEY=$(echo "$ENV_CONTENT" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')

  {
    echo "NEXT_PUBLIC_SUPABASE_URL=${API_URL}"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}"
    echo "SUPABASE_SERVICE_ROLE_KEY=${SVC_KEY}"
    echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
    echo "RESEND_API_KEY=re_xxxxx"
  } > .env.local
  info ".env.local generated"
fi

# --- Start Next.js ---
info "Starting Next.js dev server (Turbopack)..."
echo ""
exec pnpm dev
