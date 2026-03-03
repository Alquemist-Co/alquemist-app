#!/usr/bin/env bash
set -euo pipefail

# Health check for all Supabase local services
# Ports are read dynamically from `supabase status` — no hardcoded values.
# Usage: bash scripts/health-check.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "${GREEN}  [PASS]${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  [FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
info() { echo -e "${GREEN}[INFO]${NC} $1"; }

PROJECT_ID="alquemist-app"
DB_CONTAINER="supabase_db_${PROJECT_ID}"

info "Running health checks..."
echo ""

# --- 1. Supabase containers running ---
if npx supabase status >/dev/null 2>&1; then
  pass "Supabase containers are running"
else
  fail "Supabase containers are not running"
  echo ""
  echo "  Run 'pnpm dev:setup' to start Supabase."
  exit 1
fi

# Extract URLs and keys dynamically from supabase status
STATUS_ENV=$(npx supabase status -o env 2>/dev/null)
API_URL=$(echo "$STATUS_ENV" | grep '^API_URL=' | cut -d= -f2- | tr -d '"')
ANON_KEY=$(echo "$STATUS_ENV" | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')
SERVICE_KEY=$(echo "$STATUS_ENV" | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')
STUDIO_URL=$(echo "$STATUS_ENV" | grep '^STUDIO_URL=' | cut -d= -f2- | tr -d '"')

# --- 2. API endpoint (PostgREST via Kong) ---
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/rest/v1/" \
  -H "apikey: ${ANON_KEY}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  pass "API endpoint responds (HTTP $HTTP_CODE)"
else
  fail "API endpoint not responding (HTTP $HTTP_CODE) at ${API_URL}"
fi

# --- 3. Auth service (GoTrue) ---
AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/auth/v1/health" 2>/dev/null || echo "000")

if [ "$AUTH_CODE" = "200" ]; then
  pass "Auth service healthy (HTTP $AUTH_CODE)"
else
  fail "Auth service not responding (HTTP $AUTH_CODE)"
fi

# --- 4. Database connectivity ---
DB_RESULT=$(docker exec "$DB_CONTAINER" psql -U postgres -t -c "SELECT 1;" 2>/dev/null | tr -d ' ')

if [ "$DB_RESULT" = "1" ]; then
  pass "Database responds to queries"
else
  fail "Database not responding"
fi

# --- 5. Migration count matches files ---
EXPECTED_MIGRATIONS=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
APPLIED_MIGRATIONS=$(docker exec "$DB_CONTAINER" psql -U postgres -t -c \
  "SELECT count(*) FROM supabase_migrations.schema_migrations;" 2>/dev/null | tr -d ' ')

if [ "$APPLIED_MIGRATIONS" = "$EXPECTED_MIGRATIONS" ]; then
  pass "All $EXPECTED_MIGRATIONS migrations applied"
else
  fail "Expected $EXPECTED_MIGRATIONS migrations, found: ${APPLIED_MIGRATIONS:-unknown}"
fi

# --- 6. Edge Functions reachable ---
EF_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/functions/v1/confirm-shipment-receipt" 2>/dev/null || echo "000")

if [ "$EF_CODE" = "401" ] || [ "$EF_CODE" = "200" ]; then
  pass "Edge Functions reachable (confirm-shipment-receipt: HTTP $EF_CODE)"
else
  fail "Edge Functions not reachable (HTTP $EF_CODE)"
fi

# --- 7. Storage service ---
STORAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SERVICE_KEY}" 2>/dev/null || echo "000")

if [ "$STORAGE_CODE" = "200" ]; then
  pass "Storage service responds"
else
  fail "Storage service not responding (HTTP $STORAGE_CODE)"
fi

# --- 8. Studio UI ---
STUDIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${STUDIO_URL}" 2>/dev/null || echo "000")

if [ "$STUDIO_CODE" = "200" ] || [ "$STUDIO_CODE" = "302" ] || [ "$STUDIO_CODE" = "307" ]; then
  pass "Studio UI accessible (HTTP $STUDIO_CODE)"
else
  fail "Studio UI not accessible (HTTP $STUDIO_CODE)"
fi

# --- Summary ---
echo ""
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  info "All $TOTAL checks passed!"
  exit 0
else
  echo -e "${RED}[RESULT]${NC} $PASS/$TOTAL passed, $FAIL failed"
  exit 1
fi
