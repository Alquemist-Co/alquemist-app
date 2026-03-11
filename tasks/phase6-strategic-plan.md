# Phase 6 — Operations: Strategic Implementation Plan

## Executive Summary

Phase 6 introduces real-time operations: alerts, environmental monitoring, IoT sensors, and cost tracking. It's the most architecturally complex phase so far — introducing Supabase Realtime, pg_cron jobs, table partitioning, polymorphic references, an IoT Edge Function, and time-series charting. It also resolves two Phase 5 data integrity gaps.

**Scope**: 4 PRDs (33-36), 5 new tables, 7 ENUMs, 1 Edge Function, 6 pg_cron jobs, 3 SQL utility functions.

---

## 1. Data Model Integrity Audit

Before building anything, these concerns from previous phases must be addressed:

### 1.1 Phase 5 Data Integrity Gaps (CRITICAL)

Two maintenance operations were deferred from Phase 5 and **must ship in Phase 6 pre-work**:

| Job | What it fixes | Risk if missing |
|-----|---------------|-----------------|
| `expire_documents` (daily 1:00 AM) | Sets `regulatory_documents.status = 'expired'` when `expiry_date < NOW()` | Documents stay "active" forever — compliance violations invisible |
| `check_overdue_activities` (hourly) | Sets `scheduled_activities.status = 'overdue'` when `scheduled_date < NOW() - interval` | Overdue activities never flagged — schedule page misleading |

**Decision**: Implement these two functions in the very first migration, before any Phase 6 tables.

### 1.2 `trg_batch_cost_update` Trigger — Verify Existence

The architecture doc references a trigger that updates `batches.total_cost` when `inventory_transactions` with `batch_id` are inserted. **This trigger may not exist in current migrations.** If missing, the COGS calculation in PRD 36 will have incorrect direct-cost data.

**Action**: Verify in migrations. If missing, add it in Phase 6 pre-work.

### 1.3 Polymorphic FK Integrity (alerts + attachments)

Both `alerts` and `attachments` use polymorphic references (`entity_type` + `entity_id`) — no DB-level FK constraint. Concerns:

- **Dangling references**: If a batch/activity is deleted, the alert/attachment still references it. Queries must handle missing entities gracefully (LEFT JOIN, not INNER JOIN).
- **RLS complexity**: Can't use a single FK-chain policy. Options:
  - **(A) Add `company_id` directly** to both tables — simplest RLS, minor denormalization.
  - **(B) Route RLS through entity_type** — complex, error-prone, slow.

**Decision**: Option A — add `company_id` to `alerts` and `attachments`. Use Pattern 1 (direct company_id) for RLS. The entity_type/entity_id is for context display, not access control.

### 1.4 Sensor/Reading RLS Performance

`sensors` and `environmental_readings` lack `company_id`. RLS would require 2-hop joins (zone -> facility -> company) on every query. For `environmental_readings` (high-volume), this is expensive.

**Decision**: Add `company_id` directly to both `sensors` and `environmental_readings`. Denormalize at write time.

### 1.5 `sensor_type` vs `env_parameter` Enum Mismatch

| sensor_type | env_parameter | Notes |
|-------------|---------------|-------|
| temperature | temperature | Match |
| humidity | humidity | Match |
| co2 | co2 | Match |
| light | light_ppfd | Name mismatch — need mapping |
| ec | ec | Match |
| ph | ph | Match |
| soil_moisture | *(no equivalent)* | Sensor type without reading parameter |
| vpd | vpd | Match |

**Decision**: Align the enums. Use `light_ppfd` in both, drop `soil_moisture` from sensor_type if not in data model, or add it to env_parameter. Resolve in PRD writing.

### 1.6 `environmental_readings` Partitioning

Monthly range partitioning on `timestamp` requires:
- Initial partition creation in migration
- A mechanism to create future partitions (pg_cron job or manual quarterly creation)
- Partition-aware queries (WHERE timestamp range should hit single partition)

**Decision**: Create 12 months of partitions in migration + a monthly pg_cron job to create the next month's partition. Simple and reliable.

### 1.7 `activity-attachments` Storage Bucket vs Generic `attachments`

Phase 5 created an `activity-attachments` storage bucket. Phase 6 introduces a generic `attachments` table supporting multiple entity types (activities, observations, batches, quality tests, etc.).

**Decision**: Keep the existing bucket for backward compatibility. Create a new generic `attachments` bucket for Phase 6+ uploads. The `attachments` table stores metadata pointing to either bucket via `storage_path`.

---

## 2. Dependency Map

```
Phase 1-5 (existing)
  |
  v
Phase 6 Pre-work (Migration 22)
  |-- Fix: expire_documents + check_overdue_activities cron functions
  |-- Fix: Verify trg_batch_cost_update trigger
  |-- New: 7 ENUMs
  |-- New: 5 tables (attachments, alerts, sensors, environmental_readings, overhead_costs)
  |-- New: RLS policies (all Pattern 1 via company_id)
  |-- New: Indexes + partitioning
  |-- New: Seed data
  |-- New: Zod schemas
  |-- New: Navigation update
  |
  v
Phase 6 Pre-work (Migration 23)
  |-- New: 6 pg_cron SQL functions + schedules
  |-- New: 3 utility SQL functions (get_env_readings_aggregated, calculate_batch_cogs, get_sensors_last_reading)
  |
  v
PRD 35: Sensors (/operations/sensors)        <-- simplest, CRUD only
  |                                               enables testing of sensor infrastructure
  v
PRD 33: Alerts (/operations/alerts)           <-- depends on sensors existing for env alerts
  |                                               Realtime subscriptions, polymorphic context
  v
PRD 34: Environmental (/operations/environmental)  <-- depends on sensors + readings
  |                                                    Recharts time series, aggregation queries
  v
PRD 36: Costs (/operations/costs)             <-- depends on all above for full COGS
  |                                               Feature-flagged, allocation logic
  v
Deferred: Photo upload in activity execution  <-- uses attachments table from pre-work
  |
  v
Phase 6 complete
```

### Why This Order

1. **Sensors first** — pure CRUD, no Realtime, no complex queries. Validates the migration, RLS, and schema infrastructure. Creates sensors needed by environmental + alerts.
2. **Alerts second** — the cron functions (created in pre-work) generate alerts. Building the alerts UI lets us verify cron jobs work. Realtime subscription pattern established here.
3. **Environmental third** — depends on sensors existing. Introduces Recharts time series (most complex UI). The `ingest-reading` Edge Function is implemented here.
4. **Costs last** — most isolated module. Feature-flagged. Depends on batches.total_cost being correct (verified earlier). Complex allocation logic but no real-time requirements.

---

## 3. Implementation Phases

### Phase 6.0 — Pre-work (2 migrations + schemas + seed + nav)

**Migration 22: Tables & Infrastructure**
```
- 7 ENUMs (alert_type, alert_severity, alert_status, sensor_type, env_parameter, cost_type, allocation_basis)
- 5 tables with company_id, updated_by DEFAULT '', timestamps trigger
- RLS policies (all Pattern 1 via company_id)
- Indexes: (zone_id, parameter, timestamp) on environmental_readings
          (company_id, status, created_at) on alerts
          (company_id, zone_id) on sensors
          (entity_type, entity_id) on alerts + attachments
- Partitioning: environmental_readings by month (12 initial + auto-create job)
- Verify/add trg_batch_cost_update on inventory_transactions
- Storage bucket: 'attachments' (generic)
```

**Migration 23: SQL Functions & Cron**
```
- fn_expire_documents() + cron.schedule (daily 1:00 AM)
- fn_check_overdue_activities() + cron.schedule (hourly)
- fn_check_expiring_documents() + cron.schedule (daily 6:00 AM)
- fn_check_low_inventory() + cron.schedule (daily 7:00 AM)
- fn_check_stale_batches() + cron.schedule (daily 8:00 AM)
- fn_check_env_readings() + cron.schedule (every 15 min)
- fn_get_env_readings_aggregated(zone_id, period, interval)
- fn_calculate_batch_cogs(facility_id?, status?)
- fn_get_sensors_last_reading(sensor_ids UUID[])
```

**Schemas**: `packages/schemas/src/sensors.ts`, `alerts.ts`, `overhead-costs.ts`, `attachments.ts`

**Seed**: Sensors, readings (time series), alerts (mixed types/statuses), overhead costs, attachments

**Navigation**: Enable operations in sidebar, add sub-items (Alertas, Ambiental, Sensores, Costos)

**Types**: Regenerate `types/database.ts`

### Phase 6.1 — PRD 35: Sensors

- Write PRD `docs/prd/operations/sensors.md`
- Server page: `app/(dashboard)/operations/sensors/page.tsx`
- Server actions: `app/(dashboard)/operations/sensors/actions.ts`
- Client component: `components/operations/sensors-list-client.tsx`
- Shared: `components/operations/operations-shared.tsx`
- Features: CRUD table, create/edit dialog, zone assignment, calibration tracking, last-reading display
- Permissions: admin/manager create/edit, supervisor+ view

### Phase 6.2 — PRD 33: Alerts

- Write PRD `docs/prd/operations/alerts.md`
- Server page + actions + client component
- Features: Alert list with severity badges, status filters, acknowledge/resolve actions, polymorphic entity context (expand to see batch/activity/sensor details), KPI cards (pending by severity), Supabase Realtime subscription for new alerts
- Realtime: Subscribe to `alerts` INSERT + UPDATE where company_id matches
- Complex part: Entity context resolution — switch on entity_type, fetch related record, display contextual info

### Phase 6.3 — PRD 34: Environmental

- Write PRD `docs/prd/operations/environmental.md`
- Server page + client component (heavy on charts)
- Edge Function: `supabase/functions/ingest-reading/index.ts`
- Integration tests: `__tests__/edge-functions/ingest-reading.test.ts`
- Features: Current readings cards (per zone, per parameter), time series charts (Recharts — 24h/7d/30d), multi-zone comparison, sensor status table, optimal range overlay from cultivar settings
- Realtime: Subscribe to `environmental_readings` INSERT for live updates

### Phase 6.4 — PRD 36: Costs

- Write PRD `docs/prd/operations/costs.md`
- Server page + actions + client component
- Features: Overhead cost CRUD, period-based entries, allocation basis selection, COGS per batch view (direct costs from inventory_transactions + allocated overhead), trend charts, feature-flagged behind `cost_tracking` company setting
- Complex part: `calculate_batch_cogs` SQL function — joins inventory_transactions + prorates overhead_costs

### Phase 6.5 — Deferred Phase 5 Work

- Photo upload UI in activity execution (`components/activities/execute-client.tsx`)
- Uses `attachments` table + `attachments` storage bucket
- Client-side image compression before upload
- Storage path: `{company_id}/activities/{activity_id}/{filename}`
- Integration tests for `execute-activity` Edge Function

---

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| pg_cron not available on Supabase free tier | Medium | High — no automated alerts | Verify pg_cron availability. Fallback: Vercel cron or Supabase Edge Function on schedule |
| Partitioning complexity in Supabase | Medium | Medium — migration errors | Test locally first. Have fallback: regular table + manual cleanup job |
| Realtime performance with many alerts | Low | Medium — UI lag | Filter Realtime subscription to company_id. Debounce UI updates |
| COGS calculation accuracy | Medium | High — wrong financial data | Write comprehensive tests. Compare with manual calculations. Feature-flag allows gradual rollout |
| `ingest-reading` security (public endpoint) | Medium | High — data poisoning | Validate sensor serial + API key. Rate limit. Reject unknown sensors |
| Polymorphic entity deletion | Low | Low — orphaned alerts | Alerts are informational. Soft-handle missing entities in UI |

---

## 5. Production Deployment Notes

| Step | How | Notes |
|------|-----|-------|
| Migrations | `npx supabase db push --linked` | Run 22 then 23 in order |
| pg_cron schedules | Supabase Dashboard > SQL Editor | `config.toml` is local-only. Must manually run `cron.schedule()` calls in production |
| Edge Function | `npx supabase functions deploy ingest-reading --no-verify-jwt --project-ref wzyomollizbhlempiabs` | Public endpoint for IoT devices |
| Realtime | Supabase Dashboard > Realtime | Enable replication for `alerts` and `environmental_readings` tables |
| Feature flag | Already wired | `cost_tracking` in company settings |
| Storage bucket | Created by migration | Verify RLS policies in Dashboard |
| Frontend | Push to `main` | Auto-deploy via Vercel |

---

## 6. Verification Checklist (Per PRD)

Before marking any PRD complete:

- [ ] Migration applies cleanly on fresh `dev:reset`
- [ ] RLS policies tested: can't read other company's data
- [ ] Seed data creates realistic test scenarios
- [ ] TypeScript types regenerated and no type errors
- [ ] Schema validation covers all user inputs
- [ ] Server actions handle errors gracefully
- [ ] UI renders correctly with empty state, single item, many items
- [ ] Pagination/filtering works via URL params
- [ ] Mobile responsive (operations pages used on tablets in facilities)
- [ ] Feature flag respected (costs module)
- [ ] PRD updated to match what was actually built
- [ ] `pnpm lint && pnpm typecheck && pnpm build` pass
- [ ] Integration tests pass after `dev:reset`
