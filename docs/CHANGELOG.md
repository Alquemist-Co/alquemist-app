# Changelog

## 2026-02-18

### Fase 5: Configuracion, Flujos Operacionales y Calidad — COMPLETA

#### Bloque A: CRUD de Configuracion — Done

##### F-070: CRUD de Facilities — Done
- US-070-001/002/003: Lista de facilities con stats, crear/editar, desactivar con validacion
- Server actions en `src/lib/actions/facilities.ts`
- Ruta: `/settings/facilities`

##### F-071: CRUD de Zonas — Done
- US-071-001/002/003/004: Lista con filtros, crear/editar, sub-CRUDs de estructuras, desactivar
- Server actions en `src/lib/actions/zone-config.ts`
- Ruta: `/settings/zones`

##### F-072: CRUD de Proveedores — Done
- US-072-001/002/003: Lista con busqueda, crear/editar, desactivar
- Server actions en `src/lib/actions/suppliers.ts`
- Ruta: `/settings/suppliers`

##### F-073: Gestion de Unidades de Medida — Done
- US-073-001/002/003: Lista agrupada por dimension, crear/editar, validacion conversiones
- Server actions en `src/lib/actions/units.ts`
- Ruta: `/settings/units`

##### F-074: Gestion de Categorias de Recursos — Done
- US-074-001/002/003: Lista jerarquica, crear/editar con padre, desactivar
- Server actions en `src/lib/actions/categories.ts`
- Ruta: `/settings/categories`

##### F-075: CRUD de Tipos de Actividad — Done
- US-075-001/002: Lista, crear/editar/desactivar
- Server actions en `src/lib/actions/activity-type-config.ts`
- Ruta: `/settings/activity-types`

##### F-076: CRUD de Cultivation Schedules — Done
- US-076-001/002/003/004/005: Lista, wizard multi-step, editar fases/templates, preview, desactivar
- Server actions en `src/lib/actions/schedule-config.ts`
- Wizard de 4 pasos: basico → fases → templates → preview
- Ruta: `/settings/schedules`

##### F-077: Configuracion de Empresa — Done
- US-077-001/002/003: Ver config, editar datos, gestionar features
- Server actions en `src/lib/actions/company-settings.ts`
- Ruta: `/settings/company`

#### Bloque B: Flujos Operacionales — Done

##### F-080: Transferencia de Stock entre Zonas — Done
- US-080-001/002/003: Seleccion de lote y destino, preview, edge cases (parcial, agotado)
- Dialog de transferencia en pagina de stock
- Server action `transferStock()` en `src/lib/actions/inventory.ts`

##### F-081: Ajuste de Stock y Registro de Waste — Done
- US-081-001/002/003: Ajuste con razon, registro de merma, filtros en log
- Dialogs en pagina de stock
- Server actions `adjustStock()`, `registerWaste()` en `src/lib/actions/inventory.ts`

##### F-082: Hold, Cancel y Zone Change de Batch — Done
- US-082-001/002/003/004: Hold con razon, resume (regenera actividades), cancel (irreversible, manager+), zone change
- `batch-actions-dialogs.tsx` con 4 dialogs
- Server actions `holdBatch()`, `resumeBatch()`, `cancelBatch()`, `changeBatchZone()` en `src/lib/actions/batches.ts`
- Hold suspende actividades pendientes; resume regenera via `generateScheduledActivities()`

##### F-083: Creacion Manual de Batch — Done
- US-083-001/002/003: Formulario con cultivar/fase/zona, schedule assignment, codigo auto-generado `PREFIX-YY-NNNN`
- Server actions `getManualBatchFormData()`, `createManualBatch()` en `src/lib/actions/batches.ts`
- Ruta: `/batches/new`

##### F-084: Observaciones Rapidas — Done
- US-084-001/002/003: Formulario con selector de batch, tipos y severidades, auto-alerta para critical/high
- Server actions en `src/lib/actions/observations.ts`
- Crea activity (tipo "Observacion") + observation en transaccion
- Ruta: `/activities/observations`

##### F-085: Calendario de Actividades — Done
- US-085-001/002/003/004: Vista semanal y mensual, drag-to-reschedule (desktop), navegacion temporal
- `getCalendarActivities()` en `src/lib/actions/scheduled-activities.ts`
- CSS Grid 7 cols, status colors, "Hoy" button
- Ruta: `/activities/calendar`

##### F-086: Edicion de Perfil de Usuario — Done
- US-086-001/002: Datos personales (nombre, telefono), cambiar contrasena
- Server actions en `src/lib/actions/profile.ts`
- Ruta: `/profile`

##### F-087: Cambio de Facility Activa — Done
- US-087-001/002: Selector en TopBar, filtrado global
- Server actions en `src/lib/actions/facility-switch.ts`
- `FacilitySelector` en `src/components/layout/facility-selector.tsx`

#### Bloque D: Calidad Transversal — Done

##### F-088: Push Notifications — Done
- US-088-001/002/003: Toggle de permisos en perfil, `Notification.requestPermission()`, localStorage flag
- `NotificationsCard` en `profile-form.tsx`

##### F-089: Hardening IoT Webhook — Done
- US-089-001/002/003: Rate limiter in-memory (100/min), validacion de rangos fisicos, idempotencia, ingestion por lotes (max 100, 207 Multi-Status)
- Reescritura completa de `/api/webhooks/iot/route.ts`
- Timestamp drift tolerance 5min, backward compatible con formato single

##### F-090: Accesibilidad y UX Mejorada — Done
- US-090-001/002/003/004: Skip-to-content, ARIA landmarks, reduced motion, high contrast
- CSS en `globals.css`: `@media (prefers-reduced-motion: reduce)`, `@media (prefers-contrast: more)`
- AppShell: `<a href="#main-content">`, `role="main"`, `id="main-content"`
- Dialog: `aria-label={title}`

---

### Fase 4: Polish y Lanzamiento — COMPLETA

#### F-064: Documentacion — Done
- US-064-001: README con quick setup, stack, scripts, estructura, roles y verificacion
- US-064-002: Guia de onboarding (`docs/onboarding-guide.md`) con arquitectura, patrones de codigo, DB, auth, offline, gotchas
- US-064-003: Runbook de operaciones (`docs/runbook.md`) con 10 secciones y 20+ escenarios diagnosticables
- `.env.example` actualizado con todas las variables (IOT_API_KEY, CRON_SECRET)

#### F-063: Testing — Done
- US-063-001: Vitest v4 configurado con jsdom, @testing-library/jest-dom, path aliases
- US-063-004: 28 tests para schemas Zod (login, user, order, product) — validaciones positivas y negativas
- Tests de permisos: 9 tests para `canAccessModule` y `hasPermission` (5 roles, unknown module/action)
- **Total**: 37 tests, `npm test` y `npm run test:watch` scripts
- **Nota tecnica**: UUID v4 validation en Zod es estricta — UUIDs de seed (11111111-...) no pasan validacion, usar UUIDs v4 reales en tests

#### F-062: Optimizacion de Performance — Done
- US-062-005: Bundle analyzer (`@next/bundle-analyzer`) con script `npm run analyze`
- US-062-003: `optimizePackageImports` para lucide-react y recharts
- US-062-003: Image optimization (webp/avif) via `next.config.ts`
- Recharts ya lazy-loaded via `next/dynamic` en yield-chart.tsx

#### F-061: Gestion de Usuarios — Done
- US-061-001: Lista de usuarios con search filter, role badges color-coded, toggle activo/inactivo
- US-061-002: Editor de usuario con selects de rol, facility, campo telefono
- US-061-004: Toggle active con proteccion last-admin (no se puede desactivar ultimo admin)
- US-061-005: Validaciones de negocio: no auto-modificar rol, guard en updateUser
- **Server actions**: `users.ts` con getUsers, getUserById, updateUser, toggleUserActive
- Rutas: `/settings/users` (lista) y `/settings/users/[userId]` (edicion)

#### F-060: Busqueda Global (Cmd+K) — Done
- US-060-001: Modal con Cmd+K/Ctrl+K shortcut, debounce 300ms, keyboard navigation (ArrowUp/Down/Enter)
- US-060-002: Busqueda multi-entidad (batches, orders, products, zones, users) con LIKE pattern matching
- US-060-003: Historial en localStorage (max 10 busquedas recientes)
- US-060-004: Click en resultado navega al detalle con iconos por tipo
- Integrado en AppShell para disponibilidad global

#### F-059: Dashboard Viewer — Done
- US-059-001: Header read-only con titulo "Resumen de Produccion", subtitulo informativo, facility select
- US-059-002: KPIs read-only (batches activos, ordenes en progreso, tasa de calidad) sin onClick
- US-059-003: Tabla de ordenes simplificada (status, prioridad, fecha) + yield progress bar sin links

#### F-058: Dashboard Gerente — Done
- US-058-001: Header con facility filter (reutiliza patron de F-057)
- US-058-002: KPIs 2x2 grid (batches, ordenes pendientes, yield promedio, COGS/batch)
- US-058-003: Yield chart (Recharts BarChart lazy-loaded) — yield real vs esperado por cultivar
- US-058-004: Ordenes en progreso con priority badges y progress bars
- US-058-005: Cost distribution bar (materiales/labor/overhead) como barra horizontal proporcional
- US-058-006: Quick actions (nueva orden, reporte costos, centro alertas)
- Admin reutiliza dashboard de manager (mismas necesidades)
- `yield-chart.tsx`: Recharts BarChart con dynamic import, custom tooltip, colores brand (#005E42/#ECF7A3)

#### F-057: Dashboard Supervisor — Done
- US-057-001: Header "Supervision" con subtitulo de zonas/batches y facility select (oculto si solo 1)
- US-057-002: 4 StatCards (batches activos, hoy, completadas, vencidas) con tap-to-filter
- US-057-003: Grid de zonas con health indicator (verde/amarillo/rojo/gris), env readings compactos y occupancy
- US-057-004: Panel de equipo con avatar iniciales, nombre, badge activo/inactivo (lastLoginAt < 2h)
- US-057-005: Actividades agrupadas por status (overdue/pending/completed) con filter desde stats
- US-057-006: Quick actions bar con links a nueva orden, actividades y centro de alertas
- **Server actions**: `dashboard.ts` con queries agregadas para operators, zone alerts, active batches, activities filtradas por facility, conditions ambientales — todo en `getSupervisorDashboardData()` con `Promise.all`
- **Arquitectura**: Client-side facility filter con `useTransition` para refetch non-blocking, reutiliza `PullToRefresh` de F-056
- **Decisiones tecnicas**: Sin sparklines (O(N) queries por zona demasiado costoso — latest readings como texto), sin timeline por hora (planned_date no tiene componente hora), sin progreso por operador (assigned_to no existe en scheduled_activities)
- 8 archivos nuevos: 7 componentes en `src/components/dashboard/` + `src/lib/actions/dashboard.ts`

---

## 2026-02-17

### Fase 4: Polish y Lanzamiento — Iniciada

#### F-056: Dashboard Operador — Done
- US-056-001: Header contextual con saludo por hora, fecha formateada, facility badge
- US-056-002: Stats strip con 3 StatCards clickeables (pendientes/completadas/alertas) que filtran la lista
- US-056-003: Lista de actividades del dia con cards coloreadas por tipo, overdue section, empty state
- US-056-004: Banners compactos de alertas (max 3) con severidad y link "Ver todas"
- US-056-005: Pull-to-refresh con gesto touch (80px threshold) + boton + timestamp + manejo offline
- US-056-006: FAB 56px con bottom sheet de 3 acciones rapidas (actividad ad-hoc, observacion, foto)
- **Cambios base**: `AuthClaims.fullName`, `requireAuth()` extrae fullName, `StatCard` onClick/selected, `getFacilityNameById()`
- **Arquitectura**: page.tsx convertido a Server Component con role routing, data fetching paralelo con Promise.all
- 8 archivos nuevos en `src/components/dashboard/`, roles sin dashboard ven placeholder

### fix(auth): Auth resiliente — manejo de refresh tokens invalidos
- **proxy.ts**: Detecta `getUser()` error, limpia cookies stale `sb-*-auth-token*` con `maxAge=0`, retorna flag `sessionCleared`
- **middleware.ts**: Skip `updateSession()` para rutas publicas sin auth cookies (evita round-trip innecesario), redirige usuarios autenticados de `/login` a `/`, pasa `?expired=true` al redirect cuando sesion fue limpiada
- **auth-provider.tsx**: Maneja `getUser()` error con `clearAuth()`, `.catch()` para errores inesperados, manejo explicito de evento `SIGNED_OUT`
- **use-logout.ts**: `signOut()` graceful — captura error si sesion ya invalida, continua con `clearAuth()` + redirect
- **Root cause**: Despues de `db:reset` (local o Cloud), refresh tokens en cookies se invalidan pero el browser las mantiene, causando loop de errores silenciosos y pagina en blanco

---

## 2026-02-16

### Fase 3: Operaciones y Offline — COMPLETA

#### Pre-work: Schema migration + permissions
- SQL migration adding 5 columns to alerts (title, batch_id, created_by, resolved_by, resolution_notes) + 4 performance indices
- Fixed latent bug in quality.ts alert INSERT (missing company_id)
- Added permissions: manage_sensors, acknowledge_alert, resolve_alert, view_costs

#### F-046: Gestion de Sensores — Done
- US-046-001/002/003: Sensor list with zone filter, create/edit dialog, calibration indicators (green <72d, yellow 72-90d, red >90d)
- Operations hub page replacing EmptyState with 4-module grid
- Server actions in `src/lib/actions/sensors.ts`

#### F-045: Monitoreo Ambiental — Done
- US-045-001/002/003/004/005: Dashboard with zone cards, 4 DialGauges per zone (temp, humidity, CO2, VPD), 30s polling
- Custom SVG DialGauge component (270° arc, optimal range band, color by status)
- IoT webhook API route `/api/webhooks/iot` with X-API-Key auth, auto-alert with 30min debounce
- Server actions in `src/lib/actions/environmental.ts`

#### F-041: Mapa de Facility y Grid de Zonas — Done
- US-041-001/002/003: Facility selector (auto-select if single), zone grid cards with purpose colors, facility stats
- Zustand facility store (non-persisted), server actions in `src/lib/actions/areas.ts`

#### F-042: Detalle de Zona — Done
- US-042-001/002/003/004: Zone header with badges, climate dials (reuses DialGauge), active batches list
- Environmental history chart placeholder (Recharts lazy)

#### F-047: Centro de Alertas — Done
- US-047-001/002/003/004/005: 3-tab alert center (pending/acknowledged/resolved), cursor pagination
- Acknowledge + resolve flows with permission gates
- 3 Vercel Cron jobs: overdue-check (hourly), stock-alerts (6h), expiration-check (daily 6am)
- `vercel.json` with cron schedules, shared cron auth helper

#### F-043: Posiciones de Planta — Done
- US-043-001/002/003: CSS Grid cells (32/40px), status colors, stats strip, position detail dialog with status change

#### F-048: Costos Overhead y COGS — Done
- US-048-001/002/003/004/005: Overhead cost CRUD, allocation table (5 basis types), batch COGS calculation
- BatchCostsTab added to batch detail view (materials + labor + overhead breakdown)
- Cost comparison with same-cultivar batches (avg + stddev)

#### F-044: Ocupacion Planificada (Gantt) — Done
- US-044-001/002/003: Custom SVG Gantt chart, zones as rows, weeks as columns, overlap detection
- Availability projection table with next-free-date per zone

#### F-049: Offline Completo — Done
- US-049-001/002/003/004/005/006: Dexie v1 schema (8 cached + 3 sync tables)
- FIFO sync queue with exponential backoff (3 retries), LWW conflict resolver
- Photo compressor (Canvas/OffscreenCanvas, 1200px JPEG 80%)
- Data preloader (post-auth download), enhanced OfflineBanner with sync status
- Background sync event listener in service worker

#### F-050: Supabase Realtime — Done
- US-050-001/002/003/004/005: Channel manager with dedup, 4 realtime hooks
- Alert channel: INSERT → toast + badge increment (viewer excluded)
- Batch UPDATE, activities INSERT/UPDATE, env readings INSERT (page-scoped)
- RealtimeProvider wraps AppShell, connection state in Zustand store
- Cleanup on logout

---

### Fase 2: Inventario y Calidad — COMPLETA

#### F-027: Catalogo de Productos — Done
- US-027-001/002/003/004: Product CRUD with search, category/procurement type filters, show inactive toggle, SKU uniqueness validation, deactivation with stock warning
- Server actions in `src/lib/actions/inventory.ts` (shared for all inventory features)
- Zod schema in `src/lib/schemas/product.ts` — uses `z.number().nonnegative().optional()` (not `z.coerce.number()` which causes RHF type inference issues)
- RHF + Zod form with `{ valueAsNumber: true }` on number register calls
- **Commits**: 2b9c127

#### F-028: Recepcion de Compras — Done
- US-028-001/002/003: Individual and bulk reception, auto-calc expiration from shelfLifeDays, supplier pre-fill from product
- Atomic bulk reception via `db.transaction()` with N inventory_item + inventory_transaction inserts
- **Commits**: 32347af

#### F-026: Stock Actual — Done
- US-026-001/002/003/005: Product and zone view toggle (Zustand), lot detail dialog, low stock alerts
- US-026-004: Stock chart deferred (requires meaningful data for Recharts)
- GROUP BY queries server-side for stock aggregation
- **Commits**: 32347af

#### F-029: Log de Movimientos — Done
- US-029-001/002/003: Transaction table with cursor pagination, type/product/date filters, detail dialog, CSV export with BOM UTF-8
- TRANSACTION_SIGNS constant for +/- coloring per type
- **Commits**: 95a6d3e

#### F-030: Recetas / BOM — Done
- US-030-001/002/003/004/005: Recipe list, detail with stock availability, scale calculator, FIFO execution with FOR UPDATE locks, CRUD form with dynamic ingredient rows
- `executeRecipe()` atomically consumes ingredients FIFO (by expiration_date ASC NULLS LAST) and creates output inventory_item + transactions
- **Commits**: 95a6d3e

#### F-031: Transformaciones — Done
- US-031-001/002: Transform dialog in batch detail, executeTransformation action with multi-output + waste transaction
- US-031-003: Yield comparison deferred (requires accumulated data)
- `getTransformationContext()` reads phase_product_flows for pre-configured outputs
- **Commits**: fff44db

#### F-032: Tests de Calidad — Done
- US-032-001/002/003/004: Pending tests list with days-waiting badges, create test form, record results with auto-calc pass/fail + auto-alert on failure
- US-032-005: Certificate upload actions ready (UI deferred — requires Supabase Storage bucket)
- `recordResults()` atomic: INSERT results + UPDATE test + INSERT alert if failed
- Quality tab added to batch detail view
- **Commits**: fff44db

#### F-033: Historial de Calidad — Done
- US-033-001/002: History table with cultivar/type/pass filters, cursor pagination, trend chart with Recharts LineChart + 3-point SMA
- Dynamic import for TrendChart (SSR disabled)
- **Commits**: fff44db

#### F-034: Split de Batch — Done
- US-034-001/002/003/004: 3-step split wizard (quantity slider → zone/reason → confirm), derived code (LOT-001-A/B/C), merge dialog for siblings, validation (status check, plant count bounds)
- `splitBatch()` atomic: create child, update parent plant_count, insert batch_lineage
- `mergeBatches()` atomic: transfer plants, mark sources completed, insert lineage
- **Commits**: fff44db

#### F-035: Genealogia Visual — Done
- US-035-001/002/003: SVG tree diagram with recursive CTE (up to root, then down to all descendants), operations table, clickable nodes navigate to batch detail
- Custom layout algorithm: top-down with parent centered over children
- **Commits**: fff44db

#### Pre-work: Schema Migration
- `supabase/migrations/20260217031122_fase2_schema_additions.sql`: ADD min_stock_threshold to products, ADD certificate_url to quality_tests, CREATE quality-certificates storage bucket
- **Commits**: 2b9c127

---

### F-022: Ejecutar actividad completa — Done
- US-022-001: Paso 1 Resources — `getActivityContext` loads template_snapshot, scales resources by plant_count using quantity_basis (per_plant/fixed/per_zone), returns product info with units. Editable quantity_actual inputs with planned vs actual diff highlighting
- US-022-002: Paso 2 Checklist — Items from template_snapshot with critical gating (disables confirm button until all critical items completed), expected value range validation ("1.5-2.0" ± tolerance), color-coded status (ok/warning/error)
- US-022-003: Observations with photos — Deferred (requires Supabase Storage bucket setup)
- US-022-004: Paso 3 Confirm — `executeActivity` transactional: INSERT activities + INSERT activity_resources (qty > 0 only) + UPDATE scheduled_activity status='completed'. Concurrency check (rejects if already completed). Non-blocking advancePhase trigger if template has triggers_phase_change_id. Summary view with resources, checklist status, duration, notes
- US-022-005: Timer — useEffect-based interval (avoids React Compiler impure render error), pause/resume with pausedMs tracking, minimum 1 minute duration, displayed in header
- US-022-006: Offline — Deferred to Fase 3 (requires Dexie schema + sync queue)
- Server actions in `src/lib/actions/execute-activity.ts`
- Page: `/activities/[activityId]` with SC error handling + CC wizard
- **Commits**: d1a3c5a
- **Notas**: Checklist results stored as notes text (no activity_checklist_results table in DB). Template snapshot used for both resources and checklist (frozen at scheduling time). Resource scaling simplified (per_m2 and per_L_solution not implemented — requires zone effective_growing_area data). Timer uses lazy ref init to avoid `Date.now()` during render (React Compiler purity rule). 3-step wizard (not 4 — observations deferred).

### F-021: Lista de actividades de hoy — Done
- US-021-001: `getTodayActivities` server action — query for today's planned_date + overdue activities, joins templates, activity_types, batches, zones. Ordered by status priority (overdue > pending > completed) then date
- US-021-002: `ActivityCard` component — color-coded left border by activity type name (8 type colors), template name, batch code, zone, estimated duration, crop day, status badge, links to activity detail
- US-021-003: Quick-complete (swipe) — Deferred, requires F-022 executeActivity
- US-021-004: Overdue sticky section — CSS `sticky top-0 z-10`, warning background, compact OverdueCard, shows max 3 with "+N mas"
- US-021-005: Filter chips — "Pendientes (N)" / "Completadas (N)" / "Todas (N)", client-side filter, brand-colored active chip
- Activities page converted from EmptyState placeholder to SC (data fetch) + CC (TodayActivitiesView)
- **Commits**: 2df7a81
- **Notas**: No time field in scheduled_activities (only planned_date), so timeline is a list sorted by status/date rather than hour-by-hour. Activity type colors mapped by normalized lowercase name (accent-stripped). No assigned_to filter yet (US-020-004 deferred). getTodayActivities query excludes 'skipped' status.

### F-020: Programar actividades desde schedule — Done
- US-020-001: `generateScheduledActivities(batchId, phaseId)` — reads cultivation_schedule, finds templates for phase via activity_template_phases, generates activities by frequency (daily/weekly/biweekly/once/on_demand), creates template_snapshot JSONB with resources + checklist, bulk inserts scheduled_activities
- US-020-002: `rescheduleActivity(id, newDate)` — validates date >= today, status in pending/overdue, updates planned_date and resets status to pending
- US-020-003: `cancelScheduledActivity(id, reason)` — validates reason >= 5 chars, sets status to 'skipped' (closest to cancelled in enum)
- US-020-004: Auto-assign operator by zone — Deferred (requires zone-operator assignment setup)
- Hooks: `generateScheduledActivities` called from `approveOrder` (F-014) and `advancePhase` (F-018) as non-blocking fire-and-forget
- ActivitiesTab: batch detail tab showing activities grouped by phase, with reschedule/cancel dialogs for supervisors+
- Server actions in `src/lib/actions/scheduled-activities.ts`
- **Commits**: f6ac1a0
- **Notas**: Non-blocking hook pattern (`.catch(() => {})`) to avoid blocking order approval/phase advance. Template snapshot frozen at scheduling time. `getBatchScheduledActivities` uses raw SQL join for template name/code. ActivitiesTab uses ref guard for StrictMode + derives loading state from null check (ESLint `set-state-in-effect` rule). Enum has no 'cancelled' status, using 'skipped' instead.

### F-019: Templates de actividad (CRUD) — Done
- US-019-001: Template list with type/phase/text filters, activity type badges, phase badges, resource/checklist counts
- US-019-002: Template editor with basic data form (code, name, type, frequency, duration, trigger days), advanced config (triggers_phase_change, triggers_transformation)
- US-019-003: Resources editor with product selector, quantity input, quantity_basis dropdown (fixed/per_plant/per_m2/per_zone/per_L_solution), optional toggle, move-up/move-down reorder
- US-019-004: Checklist editor with instruction input, critical/photo toggles, expected value/tolerance fields, move-up/move-down reorder
- US-019-005: Phase selection via toggle chips with crop type labels, warning when no phases selected
- Server actions: `getTemplates`, `getTemplate`, `getTemplateFormData`, `createTemplate`, `updateTemplate`, `setTemplateResources`, `setTemplateChecklist`
- `manage_templates` permission for manager/admin added
- Settings hub updated with templates link
- **Commits**: a13558e
- **Notas**: Reorder via buttons (same pattern as F-011 phases). Resources and checklist saved atomically via DELETE+INSERT in transaction. `z.number()` with `valueAsNumber: true` in register for RHF compat (not `z.coerce`). Toggle uses controlled approach (`watch`+`setValue`) instead of `register` spread. Shared `TemplateEditor` component for both create and edit pages.

### F-018: Avanzar fase de batch — Done
- US-018-001: `advancePhase` transactional — update batch.currentPhaseId, mark current order_phase completed, mark next order_phase in_progress, skip pending scheduled_activities
- US-018-002: Zone change conditional — if next phase `requiresZoneChange=true`, zone selector required. Zone occupancy calculated from active batches
- US-018-003: Pending activities warning — fetches pending/overdue activities for current phase, shows yellow warning banner with list, marks as 'skipped' on advance
- US-018-004: Batch completion at exit phase — `completeBatch` sets batch status='completed', checks if all order batches done to auto-complete order
- `getAdvancePhaseData` query: batch validation, next phase detection, pending activities, available zones with occupancy
- `AdvancePhaseDialog` with conditional zone selector, pending activities warning, notes, exit phase mode ("Completar batch" vs "Avanzar fase")
- "Avanzar fase" button gated by `advance_phase` permission, only visible for active batches
- **Commits**: 513bab4
- **Notas**: Zone capacity validation is informational (shown in dropdown), not blocking — full capacity enforcement deferred to avoid false blocks with zone sharing. Notes field accepted but not persisted (no timeline events table yet). `generateScheduledActivities` hook deferred to F-020.

### F-015/F-016/F-017: Listas y detalle de ordenes y batches — Done
- F-015: Order list enhanced with status filter chips, text search, count display. Order detail already built in F-014.
- F-016: Batch list with grid cards, combinable filters (status, phase, zone, cultivar), "Limpiar filtros". Cards show code, cultivar, phase, zone, plants, dates.
- F-017: Batch detail with hero header (code, cultivar, zone, plants, start date), progress bar, phase stepper with current/completed indicators, 5 tabs (Timeline functional, Activities/Inventory/Costs/Quality as placeholders for later features).
- Server actions: `getBatches`, `getBatch`, `getBatchFilterOptions`, `getOrders`, `getOrder` with multi-table JOINs
- **Commits**: a9f1ea5
- **Notas**: US-015-002 (kanban P2) deferred. US-015-004 (yield waterfall chart) deferred — requires Recharts. Tab content lazy loaded by tab state. Phase stepper reused from order detail. All filter logic is client-side (catalog-level data).

### F-014: Aprobar/rechazar orden y crear batch — Done
- US-014-001: `approveOrder` transactional — update order status, create batch BAT-YYYY-NNN, mark first phase in_progress
- US-014-002: `rejectOrder` con razon obligatoria (min 5 chars), updates status to cancelled
- US-014-003: Stock validation deferred to F-026 (inventory module not yet built)
- Order detail page: approve/reject buttons (role-gated), phase table, batch link
- Order list page: cards with status badges, priority, batch link, "Nueva Orden" button
- **Commits**: 979bb99
- **Notas**: Batch code BAT-YYYY-NNN (facilities don't have `code` field). Optimistic lock via WHERE status='draft'. getOrder/getOrders queries with multi-table JOINs. F-015 will enhance these pages.

### F-013: Crear orden de produccion — wizard 5 pasos — Done
- US-013-001: Paso 1 — Cultivar selection cards con crop type filter chips, visual selection state
- US-013-002: Paso 2 — Entry/exit phase selection con stepper visual, skip toggles para can_skip phases
- US-013-003: Paso 3 — Quantity input + real-time yield cascade usando `calculateYieldCascade()` pure function
- US-013-004: Paso 4 — Per-phase zone assignment, auto-date calculation, priority, assignedTo
- US-013-005: Paso 5 — Review summary con edit links, save as draft via `createOrder` transactional action
- US-013-006: Persistencia — Zustand store con `persist` middleware, 24h TTL, draft recovery dialog
- **Commits**: 70ef155
- **Notas**: `getOrderWizardData()` single query con Promise.all (7 queries paralelas). Order code auto-gen `OP-YYYY-NNN`. `createOrder` transactional: INSERT production_orders + INSERT N production_order_phases atomicamente. Yield cascade es pure function en `src/lib/utils/yield-cascade.ts` (client+server). Wizard store key `alquemist-order-wizard` con TTL 24h. Approve button presente pero disabled (F-014).

### F-012: Configuracion de cultivares — Done
- US-012-001: CRUD de cultivares — List con filter por crop type, create/edit form con todos los campos, show inactive toggle
- US-012-002: Phase durations — Key-value editor per phase con cycle total calculado, fallback a default_duration_days
- US-012-003: Optimal conditions — Min/max editor per parameter (temp, humidity, CO2, EC, pH, light, VPD) con unidades
- US-012-004: Cultivar products — Atomic replace via `setCultivarProducts()` en `db.transaction()`
- **Commits**: 0f90acb
- **Notas**: Zod schema `optimalConditionsSchema` con refine(min <= max). `numRegister` helper para convertir inputs a number. Cultivar form es pagina dedicada (no Dialog) por la cantidad de campos. Phases filtradas por crop type seleccionado.

### F-011: Configuracion de tipos de cultivo y fases — Done
- US-011-001: CRUD de tipos de cultivo — Settings hub, crop type list con cards, create/edit en Dialog, `ActionResult<T>` type, Zod schemas, Server Actions, `manage_crop_config` permission
- US-011-002: CRUD de fases con reorder — Detail page con phase list, move-up/move-down reorder (atomic CASE WHEN), phase form con toggles, delete con dependency check
- US-011-003: Phase product flows — Inline editable flow table por fase, split Inputs/Outputs, product/category/unit selectors, role badges, atomic replace (DELETE + INSERT)
- US-011-004: Validacion visual de cadena — Compara output primario de fase N con input de fase N+1, indicadores verde/amarillo/rojo con iconos
- US-011-005: Soft delete y proteccion — `deactivateCropType` con conteo de ordenes activas, `reactivateCropType`, show inactive toggle, confirmation dialogs
- **Commits**: 67a2812, 4221473, 14f6b83, e62b774
- **Notas**: `ActionResult<T>` en `src/lib/actions/types.ts` como tipo reutilizable. Reorder via buttons (no drag) — evita @dnd-kit (30KB+), accesible por teclado. Phase flows usa atomic replace en `db.transaction()`. Chain validation es informativa, no bloquea. Zod `z.boolean()` sin `.default()` para compatibilidad con zodResolver RHF types.

### F-007: Provisioning basico de usuarios — Done
- US-007-001: Supabase Admin client helper (`src/lib/supabase/admin.ts`) con `server-only` guard, `service_role_key`, `autoRefreshToken: false`
- US-007-002: Server Action `createUser` (`src/lib/actions/create-user.ts`) con Zod validation, `requireAuth(['admin'])`, `admin.auth.admin.createUser()`, insert en `public.users`, password generation
- US-007-003: Pagina de creacion de usuario (`/settings/users/new`) con Server Component (facilities query) + Client Component (RHF + Zod), Dialog con password temporal y boton copiar
- **Commits**: c19d3e9, 0679863, 6dfbf5f
- **Notas**: `server-only` package instalado. Zod schema en `src/lib/schemas/user.ts`. Zod v4 usa `.issues` en lugar de `.errors`. Admin client usa `createClient` directo (no SSR). Selects nativos con estilos de Input para roles y facilities. Password generado con `crypto.getRandomValues` (14 chars alfanumerico sin ambiguos).

### F-006: PWA basica — Done
- US-006-002: Manifest PWA dinamico (`src/app/manifest.ts`) con branding Alquemist, iconos 192/512/maskable en `public/icons/`, favicon, apple-touch-icon
- US-006-001: Serwist v9 service worker con precache del shell, runtime caching via `defaultCache`, fallback a `~offline`, build con `--webpack`
- US-006-003: Meta tags de instalabilidad: `applicationName`, `appleWebApp`, `themeColor`, `formatDetection`, titulo con template
- US-006-004: Banner permanente de conexion con `useOnlineStatus` (useSyncExternalStore), integrado en AppShell entre TopBar y main
- **Commits**: 08ba755, 014d3c6, 2fbd4b9, 3b9f49b
- **Notas**: Serwist requiere `--webpack` en build (Next.js 16 default es Turbopack). `webworker` lib agregada a tsconfig para tipos de SW. ESLint ignora `public/sw.js` generado. SVGs default de Next.js eliminados. Hook `useOnlineStatus` usa `useSyncExternalStore` sin Zustand.

### F-005: Layout principal responsive — Done
- US-005-001: Sidebar desktop collapsed (64px) / expanded (240px) con toggle Cmd+B, items filtrados por rol, perfil de usuario, persistencia en localStorage
- US-005-002: Bottom tab bar mobile con 4 tabs configurados por rol + boton Mas, safe area, dot indicator
- US-005-003: Top bar con breadcrumbs (desktop) / titulo (mobile), search/bell placeholders, user menu dropdown con logout
- US-005-004: Menu Mas como bottom sheet via Dialog, grid de modulos restantes por rol, cerrar sesion
- US-005-005: Dashboard con saludo personalizado, 8 paginas placeholder con EmptyState, pagina 404 personalizada
- **Prerequisito**: fullName agregado al auth store (extraido de user_metadata.full_name)
- **Commits**: 9628258, 4a4fa73, 9629868, 3a602bf, 6f99bdb, 43aa94c, 0101020, 3d19d1a
- **Notas**: AppShell orquesta todos los componentes de layout. Sidebar store con Zustand persist. Navigation config centralizada en src/lib/nav/navigation.ts. CSS-only responsive (hidden lg:flex / flex lg:hidden). Viewport meta para safe areas PWA.

### Deploy a produccion (Supabase Cloud + Vercel)
- Supabase Cloud project linked (ref: `bavpxtnwxvemqmntfnmd`)
- `uuid_generate_v4()` reemplazado por `gen_random_uuid()` nativo en 4 archivos de migracion (~40 ocurrencias) — la extension `uuid-ossp` no esta disponible en el schema `extensions` de Cloud
- Extension `uuid-ossp` removida (CREATE EXTENSION queda como no-op comment)
- 10 migraciones aplicadas a Cloud via `npx supabase db reset --linked`
- Variables de entorno configuradas en Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`)
- `seed.sql` es solo local — usa `pgcrypto` para hash de passwords, no disponible en Cloud auth schema
- **Commits**: b4e0ebc, 0bf16a1

### F-004: Autenticacion y middleware de roles — Done
- US-004-001: Pantalla de login con Supabase Auth (RHF + Zod + signInWithPassword)
- US-004-002: Middleware de proteccion de rutas por rol (getUser, route-access matrix, header injection)
- US-004-003: Sistema de permisos por rol en frontend (permissions map, Zustand auth store, useAuth hook, AuthProvider, RoleGate, PermissionGate, requireAuth server helper)
- US-004-004: Logout y manejo de sesion expirada (useLogout hook, LogoutButton, clearAuth)
- **Commits**: 8bcb4c8, 189aa6c, 13cdd55, 5069665
- **Notas**: proxy.ts migrado de getClaims() a getUser() (mas seguro). Route groups (auth)/(dashboard). 5 roles con ~25 action-level permissions. AuthProvider con useRef guard para StrictMode. requireAuth() pattern para Server Actions. Stale cookie cleanup y error handling agregado post-Fase 3 (ver 2026-02-17).

### F-002: Design system (componentes base UI) — Done
- US-002-001: Button (primary, secondary, ghost) con cva, loading, icon, sizes
- US-002-002: Card base + StatCard con DM Mono, left border semántico, href opcional
- US-002-003: Input (forwardRef, RHF compatible, error states) + Toggle (switch role)
- US-002-004: Badge (filled, outlined, success, warning, error, info) con truncation
- US-002-005: Dialog nativo con bottom sheet mobile (drag-to-dismiss) + modal desktop
- US-002-006: Table responsive (desktop table + mobile cards) con sort client-side
- US-002-007: Toast con store Zustand (success/error/warning/info, auto-dismiss)
- US-002-008: ProgressBar (aria-progressbar) + Skeleton (shimmer) + EmptyState (icon + CTA)
- US-002-009: Página /design-system con catálogo completo interactivo
- **Commits**: 7d225d5, 3dfdb77, dc42780, 114a8b8, 874a2d6, 648b436, f7af7ff, 1d5c09a, 935bb6d
- **Notas**: Dependencies: class-variance-authority, clsx, tailwind-merge. Utility cn() en lib/utils/cn.ts. ToastContainer global en layout.tsx. Tokens extendidos: radius-dialog, radius-progress, overlay color, keyframe animations (shimmer, slide-up, slide-down, fade-in).

### F-003: Schema de base de datos — Done
- US-003-001: Auth helper functions (auth.company_id, auth.user_role, auth.facility_id)
- US-003-002: Sistema (2) + Produccion (5) = 7 tablas
- US-003-003: Areas (4) + Inventario (8) = 12 tablas
- US-003-004: Actividades (10 tablas)
- US-003-005: Nexo (2) + Ordenes (2) + Calidad (2) + Operaciones (5) = 11 tablas
- US-003-006: RLS policies tipo A, B, C, D para todas las tablas
- US-003-007: Drizzle ORM schema tipado por dominio + postgres.js driver
- US-003-008: Seed data (1 company, 3 users, 2 crop types, 3 cultivars, 11 phases, 1 order, 1 batch)
- **Commits**: 83c795a, 881866e, 8e3a292, ee08f6d, 334db57, 066dd4f, 5ac3a99, 0627112
- **Notas**: SQL manual (no drizzle-kit generate). FKs diferidas con ALTER TABLE para dependencias circulares. ~32 ENUMs. Triggers para updated_at, inmutabilidad de inventory_transactions, auto-populate company_id. Indices compuestos para queries frecuentes.

### F-001: Setup del proyecto y deploy — Done
- US-001-001: Proyecto Next.js 16 + TypeScript + Tailwind v4
- US-001-002: Dependencias core instaladas
- US-001-003: Supabase client helpers + env configurado
- US-001-004: Tailwind v4 brand tokens + DM Sans/Mono
- US-001-005: Deploy en Vercel con CI/CD
- **Commits**: fd2da48, a139654
- **Notas**: Tailwind v4 usa @theme inline en CSS. Supabase API migro a publishable key + proxy.ts + getClaims().
