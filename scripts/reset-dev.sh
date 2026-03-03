#!/usr/bin/env bash
set -euo pipefail

# Reset database: re-apply all migrations + seed data + regenerate types
# Usage: bash scripts/reset-dev.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
check() { echo -e "${GREEN}  [OK]${NC} $1"; }

PROJECT_ID="alquemist-app"
DB_CONTAINER="supabase_db_${PROJECT_ID}"

# --- Step 1: Verify Supabase is running ---
info "Checking Supabase status..."
npx supabase status >/dev/null 2>&1 || error "Supabase is not running. Run 'pnpm dev:setup' first."
check "Supabase is running"

# --- Step 2: Reset database ---
info "Resetting database (migrations + seed)..."
npx supabase db reset
MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
check "Database reset complete ($MIGRATION_COUNT migrations + seed.sql applied)"

# --- Step 3: Regenerate types ---
info "Regenerating TypeScript types..."
pnpm gen:types
check "TypeScript types regenerated"

# --- Step 4: Verify seed data ---
info "Verifying seed data..."
COMPANY_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -t -c \
  "SELECT count(*) FROM public.companies;" 2>/dev/null | tr -d ' ')

if [ "$COMPANY_COUNT" -gt 0 ] 2>/dev/null; then
  check "Seed data verified: $COMPANY_COUNT company(ies) found"
else
  echo -e "${RED}  [WARN]${NC} Could not verify seed data. Check supabase/seed.sql"
fi

echo ""
info "Database reset complete!"
echo "  Test user: admin@test.com / password123"
