# Changelog

## 2026-02-16

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
- **Notas**: proxy.ts migrado de getClaims() a getUser() (mas seguro). Route groups (auth)/(dashboard). 5 roles con ~25 action-level permissions. AuthProvider con useRef guard para StrictMode. requireAuth() pattern para Server Actions.

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
