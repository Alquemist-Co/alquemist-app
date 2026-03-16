# Code Review Report — All Phases vs Foundational Docs

**Date**: 2026-03-16
**Scope**: Phases 1–7 (38 PRDs, 26 migrations, 7 edge functions)
**Reviewed against**: Architecture doc, Data Model doc, PRDs, Master Plan

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical (must fix)** | 14 |
| **Data Model Mismatches** | 15 |
| **PRD Deviations** | 33 |
| **Architecture Violations** | 10 |
| **Minor Issues** | 35+ |

---

## Critical Issues (Must Fix)

### CRIT-01 · Cross-tenant data leakage in `fn_transaction_kpis` [Phase 7]
- **File**: `supabase/migrations/00000000000025_transaction_kpis.sql` (lines 27-32)
- **Problem**: `SECURITY DEFINER` function queries `inventory_transactions` with NO `company_id` filter. Any authenticated user gets aggregated KPIs across ALL tenants.
- **Fix**: Add `AND company_id = (SELECT get_my_company_id())` or accept validated `p_company_id` param.

### CRIT-02 · `fn_execute_activity` uses wrong column names — will crash at runtime [Phase 5]
- **File**: `supabase/migrations/00000000000020_fn_execute_activity.sql` (lines 86-96)
- **Problem**: INSERT into `inventory_transactions` uses `item_id` (should be `inventory_item_id`), `performed_by` (should be `user_id`), `notes` (should be `reason`), `created_by` (non-existent). Also omits required `unit_id NOT NULL`.
- **Impact**: Any activity with resource consumption will crash the entire transaction.

### CRIT-03 · Edge Functions don't check user roles — any authenticated user can call them [Phases 4, 7]
- **Files**: `supabase/functions/approve-production-order/index.ts`, `transition-batch-phase/index.ts`, `adjust-inventory/index.ts`, `transfer-inventory/index.ts`
- **Problem**: All authenticate the JWT but never verify the user's role. Since they use `SERVICE_ROLE_KEY`, RLS is bypassed entirely. Operators/viewers can approve orders, transition batches, adjust/transfer inventory via direct API call.
- **Fix**: Read `user.app_metadata.role` and enforce allowed roles before proceeding.

### CRIT-04 · `fn_confirm_shipment_receipt` skips regulatory compliance check [Phase 3]
- **File**: `supabase/migrations/00000000000011_shipments_inventory_recipes.sql` (lines 330-458)
- **Problem**: PRD 20 RF-18 step 3: "If `company.settings.regulatory_mode === 'strict'`, verify mandatory docs." The SQL function doesn't check this at all. Enforcement is only client-side (button disabled).
- **Impact**: Direct API call bypasses regulatory compliance.

### CRIT-05 · `fn_confirm_shipment_receipt` status logic wrong for `accepted_with_observations` [Phase 3]
- **File**: Same migration, lines 431-434
- **Problem**: When `inspection_result = 'accepted_with_observations'`, function sets `v_all_accepted := false`, producing `partial_accepted` even when ALL lines are accepted/accepted_with_observations. Should produce `accepted`.

### CRIT-06 · Signup creates auth user BEFORE company — JWT race condition [Phase 1]
- **File**: `app/(auth)/signup/actions.ts` (lines 22-27)
- **Problem**: Auth user created first with `role: 'admin'` but no `company_id`. If JWT is minted between steps 1 and 3, `get_my_company_id()` returns NULL → all RLS policies fail.

### CRIT-07 · `fn_adjust_inventory` loses adjustment direction [Phase 7]
- **File**: `supabase/migrations/00000000000024_phase7_inventory_ops.sql` (line 60)
- **Problem**: Stores `ABS(p_quantity_change)` as transaction quantity. Type is always `'adjustment'`. No way to distinguish +3 from -3 in the transaction log. UI `formatQuantity` always shows `+`.

### CRIT-08 · `fn_transfer_inventory` always creates new destination item [Phase 7]
- **File**: Same migration (lines 158-171)
- **Problem**: PRD 37 RF-09 step 3: "If same product exists in destination zone (same batch_number, cost_per_unit): reuse." Implementation always creates a new item with `-T` suffix, causing item proliferation.

### CRIT-09 · `fn_execute_activity` has no negative-quantity guard [Phase 5]
- **File**: `supabase/migrations/00000000000020_fn_execute_activity.sql` (lines 99-101)
- **Problem**: `quantity_available = quantity_available - v_resource.quantity_actual` with no CHECK constraint or WHERE guard. Inventory can silently go negative.

### CRIT-10 · `fn_approve_production_order` casts quantity to INT, losing precision [Phase 4]
- **File**: `supabase/migrations/00000000000015_batches.sql` (line 238)
- **Problem**: `v_order.initial_quantity::INT` silently truncates decimal values (e.g., 21.5 → 21).

### CRIT-11 · `fn_check_overdue_activities` does NOT generate alerts [Phase 6]
- **File**: `supabase/migrations/00000000000022_phase6_cron_functions.sql` (lines 26-35)
- **Problem**: Only updates `scheduled_activities.status='overdue'`, never INSERTs into `alerts`. Supervisors will never see overdue activity alerts.

### CRIT-12 · `fn_check_env_readings` ignores `sensors.is_active` [Phase 6]
- **File**: Same migration (lines 180-199)
- **Problem**: Queries `environmental_readings` without joining `sensors` to check `is_active`. Deactivated sensors still trigger alerts.

### CRIT-13 · `calculate_batch_cogs` `per_zone` allocation divides by wrong denominator [Phase 6]
- **File**: Same migration (lines 424-427)
- **Problem**: Divides cost by count of all distinct zones in facility instead of count of batches in the specific zone. PRD says per_zone assigns cost only to batches in the specified zone.

### CRIT-14 · Middleware allows unauthenticated access to root `/` [Phase 1]
- **File**: `lib/supabase/middleware.ts` (line 57)
- **Problem**: Condition `!user && !isAuthRoute && pathname !== '/'` explicitly excludes `/` from protection.

---

## Data Model Mismatches

| ID | Phase | Issue |
|----|-------|-------|
| DM-01 | 3 | `shipment_items` missing `created_by` column |
| DM-02 | 3 | `plant_positions` table never created (in data model, not in migrations) |
| DM-03 | 3 | `recipe_executions` missing `updated_at`/`updated_by` and update trigger |
| DM-04 | 3 | `shipment_items` FKs not `DEFERRABLE INITIALLY DEFERRED` as PRD specifies |
| DM-05 | 4 | `batch_lineage` missing `updated_at`/`updated_by`/`created_by` and trigger |
| DM-06 | 4 | Phase chain uses `sort_order` range instead of `depends_on_phase_id` chain |
| DM-07 | 4 | `batches.plant_count` nullable but data model says INT (no opt) |
| DM-08 | 6 | `sensors`, `attachments`, `environmental_readings` have `company_id` not in data model doc |
| DM-09 | 6 | `overhead_costs` RLS uses Pattern 1 (direct company_id) but PRD says Pattern 2 |
| DM-10 | 7 | Missing composite indexes `(batch_id, type, timestamp)`, `(zone_id, timestamp)` per PRD |
| DM-11 | 7 | `batch_id` FK on `inventory_transactions` never added (deferred but never resolved) |
| DM-12 | 7 | `inventory_items` has `created_by`/`updated_by` not in data model doc |
| DM-13 | 2 | `resource_categories`/`units_of_measure` have `company_id` not in data model doc |
| DM-14 | 2 | `activity_template_phases` missing audit columns and trigger |
| DM-15 | 3 | Missing `trg_update_inventory_balance` trigger (architecture doc specifies it) |

---

## PRD Deviations (Top 20 by Impact)

| ID | Phase | Deviation |
|----|-------|-----------|
| PD-01 | 1 | Login/invite redirect hardcoded to `/settings` instead of role-based routes (RF-09) |
| PD-02 | 1 | No Zustand auth-store hydration (referenced in login/signup/invite/reset PRDs) |
| PD-03 | 1 | Login: specific error codes not handled (email_not_confirmed, banned, rate-limit) |
| PD-04 | 1 | Middleware doesn't append `?expired=true` on session expiry redirect |
| PD-05 | 1 | Forgot-password PRD says `resetPasswordForEmail()`, implementation uses `generateLink()+Resend` (PRD not updated) |
| PD-06 | 2 | Cultivar code uniqueness is per-crop_type, not per-company as PRD specifies |
| PD-07 | 2 | Profile page missing facility display (deferred in Phase 2, never added after Phase 3) |
| PD-08 | 2 | Crop types/cultivars use navigate-to-detail instead of PRD's master-detail panel |
| PD-09 | 3 | Zone schema missing `climate_config` Zod validation |
| PD-10 | 3 | Facilities/products/suppliers don't filter `is_active=true` by default |
| PD-11 | 3 | `inspectionLineSchema` missing 3 cross-field refinements |
| PD-12 | 4 | Phase chain uses `sort_order` instead of `depends_on_phase_id` (breaks bifurcating phases) |
| PD-13 | 4 | Batch hold/cancel doesn't capture reason or update scheduled_activities |
| PD-14 | 5 | `scaleQuantity` doesn't handle `per_L_solution` basis |
| PD-15 | 5 | History CSV export ignores active filters |
| PD-16 | 6 | Sensor delete (RF-12/13/14) not implemented |
| PD-17 | 6 | Alerts: no expanded panel, no date range filter, no facility filter |
| PD-18 | 6 | Costs: missing 6-month stacked bar chart |
| PD-19 | 7 | Items: missing lot history expansion, grouped view, value KPI |
| PD-20 | 7 | Items/transactions search only covers partial fields vs PRD spec |

Plus 13 additional minor PRD deviations across all phases.

---

## Architecture Violations

| ID | Phase | Violation |
|----|-------|-----------|
| AV-01 | 3,4 | Edge Functions don't use shared Zod schemas from `packages/schemas/` |
| AV-02 | 4 | Batch hold/cancel uses direct PostgREST instead of Edge Function (multi-table op) |
| AV-03 | 5 | `supersedeDoc`/`renewDoc` are not atomic (two separate client calls) |
| AV-04 | 2 | Profile/company forms send entity ID in update filter (PRD says rely on RLS only) |
| AV-05 | 6 | Sensors/costs CRUD done client-side without server actions |
| AV-06 | 6 | Environmental page creates Supabase client at component body level (per-render) |
| AV-07 | 1 | Architecture doc specifies `invite/[token]/` and `reset-password/[token]/` routes; implementation uses flat routes |
| AV-08 | 1 | Middleware redirects authenticated users on auth routes to `/settings` instead of role-based |
| AV-09 | 6 | Costs: UI shows delete for manager but RLS only allows admin → silent failure |
| AV-10 | 7 | CSV export hardcodes CLP currency instead of using company setting |

---

## Minor Issues (Selected)

| Phase | Issue |
|-------|-------|
| 1 | `forgot-password/actions.ts` doesn't catch Resend send failures |
| 1 | `invite/page.tsx` uses `getSession()` instead of `getUser()` |
| 1 | Auth layout `<Suspense>` has no fallback |
| 1 | Login: password field not cleared on failed attempt |
| 2 | `activity_types` missing unique name DB constraint |
| 2 | Company settings cancel doesn't revert timezone/currency fields |
| 3 | `generate_shipment_code` trigger has race condition |
| 3 | `fn_execute_recipe` calculates yield twice (redundant) |
| 3 | Climate config form fields have no validation (humidity > 100, negative temps) |
| 4 | `generate_order_code()`/`generate_batch_code()` race conditions under concurrency |
| 4 | Order creation not atomic (order + phases in separate calls) |
| 4 | `fn_transition_batch_phase` doesn't set `actual_start_date` on first phase |
| 4 | `expected_output_unit_id` always set to `initial_unit_id` |
| 5 | Quality test KPIs use `updated_at` instead of `result_date` for monthly counts |
| 5 | Schedule client-side search doesn't filter by batch |
| 5 | History table rows missing `key` on React Fragment |
| 5 | `formatDate` parses date-only strings as UTC → wrong day in UTC-negative timezones |
| 5 | Regulatory documents `category` filter accepted but never applied |
| 6 | Severity calculation always produces `high`, never `critical` (margin = 0) |
| 6 | Alerts `pendingTotal` KPI includes acknowledged alerts |
| 6 | `per_zone` cost validation missing in schema |
| 6 | Environmental `optimal_conditions` key mapping inconsistent (`RH` vs `humidity`) |
| 6 | Bulk acknowledge/resolve executes sequentially instead of batch query |
| 7 | Status dialog collects `reason` but discards it (only updates `lot_status`) |
| 7 | `reason` is optional in schema but required in PRD for status changes |
| 7 | Items `facility_id` filter accepted but never applied to query |
| 7 | "Lotes activos" KPI excludes `expired` (PRD says include all non-depleted) |
| 7 | Distinct products KPI fetches ALL rows, no depleted filter |
| 7 | CSV export limited to 1,000 rows; PRD specifies 10,000 |

---

## Recommended Fix Priority

### P0 — Security & Data Integrity (fix immediately)
1. CRIT-01: Cross-tenant KPI leakage
2. CRIT-02: `fn_execute_activity` wrong column names
3. CRIT-03: Edge Function role enforcement
4. CRIT-04: Regulatory compliance bypass
5. CRIT-09: Negative inventory guard

### P1 — Business Logic Bugs (fix before next release)
6. CRIT-05: Shipment receipt status logic
7. CRIT-06: Signup atomicity race
8. CRIT-07: Adjustment direction lost
9. CRIT-08: Transfer item proliferation
10. CRIT-10: Quantity truncation
11. CRIT-11: Overdue alerts not generated
12. CRIT-12: Inactive sensors generating alerts
13. CRIT-13: Cost allocation formula wrong
14. CRIT-14: Root path unprotected

### P2 — Data Model & Architecture Alignment
- All DM-* items (update migrations or docs to match)
- All AV-* items (refactor to match architecture patterns)

### P3 — PRD Sync & Feature Gaps
- All PD-* items (update PRDs to match implementation or implement missing features)

### P4 — Minor Quality
- All minor issues (address during normal development)
