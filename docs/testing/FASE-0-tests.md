# Test Plan — Fase 0: Foundation (F-001 a F-007)

## Prerequisites
- `npm run db:reset` executed successfully
- `npm run dev` running at localhost:3000
- All 5 test users available (see TEST-DATA.md for credentials)

## Credentials
| Rol | Email | Password |
|-----|-------|----------|
| admin | admin@agrotech.co | Admin123! |
| supervisor | supervisor@agrotech.co | Super123! |
| operator | operator@agrotech.co | Oper123! |
| manager | manager@agrotech.co | Mgr123! |
| viewer | viewer@agrotech.co | View123! |

---

## F-001: Setup del Proyecto y Deploy

### Context
F-001 establishes the project foundation: Next.js 14+ with App Router, TypeScript strict mode, Tailwind CSS v4 with inline `@theme` tokens in `globals.css`, DM Sans and DM Mono fonts via `next/font/google` (self-hosted for offline), and Supabase integration. Environment variables are configured in `.env.local` pointing to local Supabase (`127.0.0.1:54321`). The design tokens define primary `#005E42`, accent `#ECF7A3`, and surface `#F7F8F2`.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F001-001 | Dev server starts without errors | P0 | N/A | Node.js installed, `npm install` completed | 1. Run `npm run dev` in terminal 2. Wait for compilation 3. Open http://localhost:3000 in browser | Terminal shows "Ready" with localhost:3000 URL, zero errors. Browser loads the login page (or dashboard if session exists). No console errors in browser DevTools. |
| T-0F001-002 | Production build succeeds with zero errors | P0 | N/A | Dependencies installed | 1. Run `npm run build` in terminal 2. Wait for build to complete 3. Check exit code | Build exits with code 0. Output shows all routes compiled. No TypeScript errors, no ESLint errors. `.next` directory is generated. |
| T-0F001-003 | Tailwind brand tokens load correctly (primary #005E42, accent #ECF7A3) | P1 | N/A | Dev server running | 1. Open localhost:3000/login 2. Inspect the "A" logo square with DevTools 3. Check computed `background-color` 4. Inspect page background 5. Inspect the "Alquemist" heading color | Logo background resolves to `#005E42` (brand). Page surface background is `#F7F8F2`. Heading text color is `#005E42`. All values match the `@theme inline` tokens in `globals.css`. |
| T-0F001-004 | DM Sans and DM Mono fonts load correctly | P1 | N/A | Dev server running | 1. Open localhost:3000/login 2. Inspect the "Alquemist" heading, check `font-family` 3. Navigate to /design-system 4. Inspect a numeric value in a StatCard, check `font-family` 5. Open Network tab, filter by "font" | Heading uses DM Sans (`var(--font-dm-sans)`). Numeric data uses DM Mono (`var(--font-dm-mono)`). Font files are served from `/_next/static/` (self-hosted), not from `fonts.googleapis.com`. |
| T-0F001-005 | Environment variables are set and functional | P2 | N/A | `.env.local` file exists in project root | 1. Verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` 2. Verify it contains `NEXT_PUBLIC_SUPABASE_ANON_KEY` 3. Verify it contains `DATABASE_URL` 4. Start dev server and check terminal for missing env var warnings 5. Open login page and check Network tab for Supabase requests | All 3 critical variables are defined. Dev server starts without env var warnings. Login page makes requests to the configured Supabase URL (local: `http://127.0.0.1:54321`). |

---

## F-002: Design System

### Context
F-002 delivers 9 base UI components in `src/components/ui/`: Button (primary/secondary/ghost variants via cva), Card, Input, Toggle, Badge (6 variants), Dialog (native `<dialog>`, bottom sheet on mobile, modal on desktop, drag-to-dismiss), Table (sortable columns, row click), Toast (Zustand store, 4 types, auto-dismiss), and ProgressBar. Plus shared components: Skeleton (shimmer animation), EmptyState, and StatCard. All are showcased on the public `/design-system` page at `src/app/design-system/page.tsx`. Touch targets follow 48px minimum for mobile.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F002-001 | Design system page loads with all component sections | P0 | N/A | Dev server running | 1. Navigate to localhost:3000/design-system (public route, no login needed) | Page loads with title "Design System" and subtitle "Alquemist -- Componentes base UI". All 11 sections visible: Buttons, Cards, Inputs, Toggles, Badges, Dialog, Table, Toasts, Progress Bar, Skeleton, Empty State. |
| T-0F002-002 | Button variants (primary, secondary, ghost) render correctly | P0 | N/A | On /design-system page | 1. Scroll to Buttons section 2. Identify the three variant buttons 3. Hover over each button | Primary: green background (#005E42), white text. Secondary: transparent background, visible border, dark text. Ghost: no border, no background, dark text. All show visual feedback on hover. |
| T-0F002-003 | Button states: loading, disabled, and sizes | P1 | N/A | On /design-system page | 1. Find "Cargando" button 2. Find "Deshabilitado" button 3. Try clicking disabled button 4. Compare Small, Default, Large buttons | Loading button shows a spinner animation and is non-clickable. Disabled button has reduced opacity and `cursor: not-allowed`. Three sizes show visibly different padding and font size. Secondary disabled and Ghost disabled also appear. |
| T-0F002-004 | Card and StatCard render with correct styling | P1 | N/A | On /design-system page | 1. Scroll to Cards section 2. Inspect base Card components 3. Inspect StatCard row (4 cards) | Base cards: white background, rounded corners (16px radius), hover border transitions to brand color. Four StatCards display: "42" (brand), "91.7%" (success/green), "3" (warning/amber), "1" (error/red), each with label text below. |
| T-0F002-005 | Input component states (normal, error, focus, disabled) | P1 | N/A | On /design-system page | 1. Scroll to Inputs section 2. Click into "Nombre del cultivar" input 3. Observe the error input ("Con error") 4. Observe the disabled input | Normal input: border changes to brand color on focus with a focus ring. Error input: red border, error message "Este campo es requerido" displayed below in red. Disabled input: muted style, non-editable, shows "No editable" text. Labels use uppercase 11px styling. |
| T-0F002-006 | Toggle switches between on and off states | P1 | N/A | On /design-system page | 1. Scroll to Toggles section 2. Click the interactive toggle 3. Observe label change 4. Click again to toggle back 5. Try clicking the disabled toggle | Toggle animates between off (gray) and on (green/brand). Label updates: "Desactivado" when off, "Activado" when on. Disabled toggle (labeled "Deshabilitado (on)") does not respond to clicks. |
| T-0F002-007 | Badge variants display all 6 types | P1 | N/A | On /design-system page | 1. Scroll to Badges section 2. Identify each variant | Six badges visible: Filled (brand green), Outlined (border only), Success (green), Warning (amber), Error (red), Info (cyan). Below them, a long-text badge truncates with ellipsis within a 200px container. |
| T-0F002-008 | Dialog opens as modal on desktop, bottom sheet on mobile | P0 | N/A | On /design-system page | 1. In desktop viewport (>=1024px), click "Abrir Dialog" 2. Observe the modal 3. Press Escape to close 4. Reopen and click the overlay to close 5. Switch to mobile viewport (<640px) in DevTools 6. Click "Abrir Dialog" again 7. Observe the bottom sheet | Desktop: dialog appears centered with overlay (semitransparent). Title "Confirmar accion" and body text visible. Closes on Escape and on overlay click. Mobile: dialog slides up from bottom as a sheet. Both modes have footer with "Cancelar" and "Confirmar" buttons. |
| T-0F002-009 | Table renders with sortable columns and row click | P1 | N/A | On /design-system page | 1. Scroll to Table section 2. Observe the 4 batch rows (BAT-001 to BAT-004) 3. Click the "ID" column header twice 4. Click any row | Four rows with columns: ID, Cultivar, Fase, Yield, Unidades. Clicking a sortable header toggles sort order (ascending/descending). Clicking a row triggers a toast "Click en BAT-00X". Numeric columns (Yield, Unidades) are right-aligned. |
| T-0F002-010 | Toast notifications display and auto-dismiss | P0 | N/A | On /design-system page | 1. Click "Toast Success" button 2. Observe the notification 3. Wait 3-5 seconds for auto-dismiss 4. Click "Toast Error" 5. Click "Toast Warning" 6. Click "Toast Info" | Success toast: green with message "Actividad completada". Error toast: red with "Error al guardar los cambios". Warning toast: amber with "Stock bajo en zona A". Info toast: cyan with "Sincronizacion completa". Each auto-dismisses with exit animation. |
| T-0F002-011 | ProgressBar renders at various fill levels | P1 | N/A | On /design-system page | 1. Scroll to Progress Bar section | Four bars: 0% (empty, label "Sin progreso"), 35% (warning/amber fill, "Vegetativo"), 72% (brand/default fill, "Floracion"), 100% (success/green fill, "Completo"). Fill width corresponds to percentage. Rounded corners (3px radius). |
| T-0F002-012 | Skeleton and EmptyState components render | P2 | N/A | On /design-system page | 1. Scroll to Skeleton section 2. Observe shimmer animation 3. Scroll to Empty State section | Skeleton: text lines, circle, card, and table-row placeholders with shimmer animation (gradient sweep). Two EmptyState cards: first shows leaf icon, "No hay batches activos", description, and "Ir a Ordenes" action button; second shows package icon, "Sin inventario", description only (no action). |

---

## F-003: Database Schema

### Context
F-003 defines 43 tables across 8 domains with RLS policies, triggers, and ~32 enums. Migrations live in `supabase/migrations/` as timestamped SQL files. Drizzle schema mirrors the SQL in `src/lib/db/schema/`. Seed data in `supabase/seed.sql` populates one company (AgroTech Colombia SAS) with 5 users, 1 facility, 3 zones, 2 crop types, 3 cultivars, 5 production orders, 5 batches (including split children), products, suppliers, sensors, and more. RLS policy types: A (direct company_id), B (via facility join), C (redundant company_id with trigger), D (global catalog). The `updated_at` trigger fires on every UPDATE. Inventory transactions are immutable.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F003-001 | db:reset completes without FK violations | P0 | N/A | Docker running, `npm run db:start` completed | 1. Run `npm run db:reset` in terminal 2. Wait for completion 3. Check output for errors | Command exits with code 0. All migrations applied in order. Seed data loaded successfully. No FK violation errors, no enum errors, no syntax errors. Output shows "Finished" or equivalent success message. |
| T-0F003-002 | RLS blocks cross-company data access | P0 | admin | DB reset completed, dev server running | 1. Login as admin@agrotech.co 2. Navigate to /batches 3. Note visible batches (all belong to company 11111111-...) 4. In Supabase Studio SQL Editor, create a second company and insert a batch for it 5. Refresh /batches in the app | Only batches from company `11111111-1111-1111-1111-111111111111` are visible. The batch from the other company does not appear. RLS policies filter all queries by the authenticated user's `company_id` from `app_metadata`. |
| T-0F003-003 | Seed data loads expected entity counts | P1 | N/A | `npm run db:reset` completed | 1. Open Supabase Studio at localhost:54323 2. Check `companies` table (1 row: "AgroTech Colombia SAS") 3. Check `users` table (5 rows) 4. Check `facilities` table (1 row) 5. Check `zones` table (3 rows) 6. Check `crop_types` (2 rows) 7. Check `cultivars` (3 rows) 8. Check `production_orders` (5 rows) 9. Check `batches` (5 rows) | All counts match. Users have correct roles (admin, supervisor, operator, manager, viewer). Orders span 5 statuses (draft, approved, in_progress, completed, cancelled). UUIDs follow the seed pattern (111..., 222..., etc.). |
| T-0F003-004 | updated_at trigger fires on record update | P1 | N/A | DB reset completed, Studio open | 1. In SQL Editor run: `SELECT updated_at FROM companies WHERE id = '11111111-1111-1111-1111-111111111111'` 2. Note the timestamp 3. Wait 1 second 4. Run: `UPDATE companies SET name = 'AgroTech Updated' WHERE id = '11111111-1111-1111-1111-111111111111'` 5. Run the SELECT again | The `updated_at` value after UPDATE is later than the original. The trigger automatically sets the timestamp without requiring it in the UPDATE statement. |
| T-0F003-005 | UNIQUE constraint rejects duplicate SKU | P1 | N/A | DB reset completed, Studio open | 1. In SQL Editor, find an existing product SKU (e.g., from `SELECT sku FROM products LIMIT 1`) 2. Attempt to insert a product with the same SKU: `INSERT INTO products (id, company_id, name, sku, category, unit) VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Duplicate', '<existing_sku>', 'seeds', 'unit')` | INSERT fails with error 23505 (unique_violation). Error message indicates the SKU already exists. No duplicate row is created. |
| T-0F003-006 | FK constraint rejects invalid reference | P1 | N/A | DB reset completed, Studio open | 1. In SQL Editor, attempt to insert a batch referencing a non-existent order: `INSERT INTO batches (id, company_id, production_order_id, cultivar_id, code, current_phase_id, status) VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666601', 'LOT-TEST', '77777777-7777-7777-7777-777777777701', 'active')` | INSERT fails with error 23503 (foreign_key_violation). Error identifies the `production_order_id` reference as invalid. Referential integrity is maintained. |
| T-0F003-007 | ENUM constraint rejects invalid value | P1 | N/A | DB reset completed, Studio open | 1. In SQL Editor, attempt: `INSERT INTO users (id, company_id, email, full_name, role) VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'test@test.co', 'Test User', 'superadmin')` | INSERT fails with invalid enum value error. 'superadmin' is not a member of `user_role` enum. Only valid values are: admin, manager, supervisor, operator, viewer. |
| T-0F003-008 | Unauthenticated REST request returns zero rows | P2 | N/A | Supabase local running | 1. Using curl or browser, make a GET request: `curl http://127.0.0.1:54321/rest/v1/users -H "apikey: <anon_key>"` (without Authorization header) 2. Check response | Response returns an empty array `[]` or a 401 error. No user data is exposed. RLS policies block all anonymous access to protected tables. |

---

## F-004: Auth y Middleware

### Context
F-004 implements authentication via Supabase Auth (`signInWithPassword`), using `src/lib/supabase/proxy.ts` with `getUser()` for server-side verification. The login page at `src/app/(auth)/login/page.tsx` uses React Hook Form + Zod (`loginSchema`). Middleware in `src/lib/auth/middleware.ts` extracts role from `user.app_metadata.role`, enforces route access per `route-access.ts` (operator blocked from `/orders` and `/settings`, viewer blocked from `/settings`), and redirects forbidden access to `/?forbidden=true`. The auth store (Zustand) is hydrated by `AuthProvider`. Permission gates (`<RoleGate>`, `<PermissionGate>`) provide client-side UI filtering. `requireAuth()` in `src/lib/auth/require-auth.ts` guards Server Actions.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F004-001 | Login succeeds with valid admin credentials | P0 | admin | Session cleared, on /login | 1. Navigate to localhost:3000/login 2. Enter email: admin@agrotech.co 3. Enter password: Admin123! 4. Click "Iniciar sesion" | Button shows loading spinner briefly. Redirected to `/` (dashboard). AppShell renders with sidebar (desktop) or bottom bar (mobile). Name "Carlos Admin" and role "Administrador" visible in user area. |
| T-0F004-002 | Login succeeds for supervisor | P0 | supervisor | Session cleared | 1. Navigate to /login 2. Enter supervisor@agrotech.co / Super123! 3. Click "Iniciar sesion" | Redirected to dashboard. Name "Maria Supervisor", role "Supervisor". Navigation includes Ordenes and Configuracion modules. |
| T-0F004-003 | Login succeeds for operator | P0 | operator | Session cleared | 1. Navigate to /login 2. Enter operator@agrotech.co / Oper123! 3. Click "Iniciar sesion" | Redirected to dashboard. Name "Juan Operador", role "Operador". Navigation does NOT include Ordenes or Configuracion. |
| T-0F004-004 | Login succeeds for manager and viewer | P0 | manager, viewer | Session cleared | 1. Login as manager@agrotech.co / Mgr123! -- verify name "Ana Gerente", role "Gerente", has Ordenes + Configuracion 2. Logout, login as viewer@agrotech.co / View123! -- verify name "Luis Viewer", role "Viewer", has Ordenes but NOT Configuracion | Both users authenticate successfully. Manager sees full navigation. Viewer sees Ordenes (read-only) but no Configuracion. |
| T-0F004-005 | Login fails with wrong password | P0 | N/A | On /login page | 1. Enter email: admin@agrotech.co 2. Enter password: WrongPassword123 3. Click "Iniciar sesion" | Red error message "Credenciales invalidas" appears below the form (via `role="alert"`). User stays on /login. Password field receives focus. No information leaked about the email. |
| T-0F004-006 | Login fails with non-existent email | P0 | N/A | On /login page | 1. Enter email: noexiste@agrotech.co 2. Enter password: SomePass123 3. Click "Iniciar sesion" | Same generic error "Credenciales invalidas" appears. No distinction from wrong-password error (prevents email enumeration). User stays on /login. |
| T-0F004-007 | Login form validates input (empty fields, invalid email) | P1 | N/A | On /login page | 1. Leave both fields empty, click "Iniciar sesion" 2. Enter "notanemail" in email, click submit 3. Enter valid email but leave password empty | Zod validation messages appear for each invalid field. Invalid email shows format error. Empty password shows required error. No server request is made until client-side validation passes. |
| T-0F004-008 | Unauthenticated user is redirected to /login | P0 | N/A | No session (incognito or cleared cookies) | 1. Open localhost:3000/ directly 2. Observe redirect 3. Check URL 4. Try localhost:3000/batches 5. Try localhost:3000/settings | Each attempt redirects to `/login?redirectTo={path}`. The `redirectTo` parameter preserves the intended destination. Login page renders normally. |
| T-0F004-009 | Operator cannot access /orders (middleware redirect) | P0 | operator | Logged in as operator@agrotech.co | 1. Type localhost:3000/orders in the URL bar and press Enter 2. Observe the redirect | Operator is redirected to `/?forbidden=true`. The /orders page does not render. The URL changes to `/`. No "Ordenes" module appears in operator's navigation (sidebar or bottom bar). |
| T-0F004-010 | Operator cannot access /settings (middleware redirect) | P0 | operator | Logged in as operator@agrotech.co | 1. Type localhost:3000/settings in the URL bar 2. Observe the redirect | Redirected to `/?forbidden=true`. /settings page does not render. No "Configuracion" link in navigation. |
| T-0F004-011 | Viewer cannot access /settings | P1 | viewer | Logged in as viewer@agrotech.co | 1. Type localhost:3000/settings in the URL bar 2. Observe the redirect | Redirected to `/?forbidden=true`. Viewer can access /orders (read-only view) but not /settings. No "Configuracion" in navigation. |
| T-0F004-012 | Session persists across page reload | P1 | admin | Logged in as admin@agrotech.co | 1. Note the user info displayed (name, role) 2. Press F5 (full page reload) 3. Observe the result | After reload, user remains authenticated on the same page. Name and role badge still visible. No redirect to /login. Auth store rehydrates from Supabase session cookie. |
| T-0F004-013 | Logout clears session and redirects to /login | P1 | admin | Logged in as admin@agrotech.co | 1. Open the user menu (click avatar/initials) 2. Click "Cerrar sesion" 3. Observe redirect 4. Try navigating to localhost:3000/ | Redirected to /login page. Navigating to any protected route redirects back to /login. Auth store is cleared (Zustand `clearAuth()`). Supabase session cookies are removed. |
| T-0F004-014 | redirectTo parameter works after successful login | P1 | admin | Not logged in | 1. Navigate directly to localhost:3000/batches 2. Get redirected to /login?redirectTo=/batches 3. Login with admin@agrotech.co / Admin123! | After successful login, redirected to `/batches` (not to `/`). The `redirectTo` query parameter is consumed by the login form and passed to `router.push()`. |

---

## F-005: Layout Principal

### Context
F-005 implements the AppShell in `src/components/layout/app-shell.tsx`: Sidebar (desktop `hidden lg:flex`, collapsible via Cmd+B, state persisted in localStorage key `alquemist-sidebar`), TopBar with breadcrumbs, BottomBar (mobile `flex lg:hidden`, 4 role-specific tabs from `BOTTOM_BAR_TABS` in `navigation.ts` + "Mas" button), MoreMenu (Dialog as bottom sheet with grid of remaining modules), and UserMenu dropdown. Navigation is configured in `src/lib/nav/navigation.ts` with 9 modules. Role-based filtering uses `canAccessModule()` from permissions. Sidebar widths: collapsed 64px, expanded 240px. Bottom bar height: 64px. Responsive breakpoint: `lg` (1024px). CSS-only visibility, no JS media query listeners.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F005-001 | Desktop shows sidebar, hides bottom bar | P0 | admin | Logged in, viewport >= 1024px | 1. Observe left side of screen 2. Observe bottom of screen 3. Check sidebar content | Green sidebar visible on the left with module icons. Bottom bar is hidden (CSS `flex lg:hidden`). Main content offset by sidebar width (64px collapsed or 240px expanded). Sidebar shows user initials and role badge at bottom. |
| T-0F005-002 | Mobile shows bottom bar, hides sidebar | P0 | admin | Logged in, viewport < 1024px (DevTools device toolbar) | 1. Observe left side -- no sidebar 2. Observe bottom of screen | Sidebar is hidden (CSS `hidden lg:flex`). Bottom bar visible at bottom with 5 items (4 tabs + "Mas"). Main content fills full width. Content has bottom padding equal to bottombar height (64px). |
| T-0F005-003 | Sidebar toggle with Cmd+B expands/collapses | P0 | admin | Logged in, desktop viewport, sidebar initially collapsed | 1. Press Ctrl+B (or Cmd+B on Mac) 2. Observe sidebar expand to 240px with icons + labels 3. Press Ctrl+B again 4. Observe sidebar collapse to 64px with icons only | Sidebar toggles between collapsed (64px, icons only, module labels hidden) and expanded (240px, icons + text labels + "ALQUEMIST" header). Content area shifts with smooth CSS transition (duration 250ms). |
| T-0F005-004 | Bottom bar shows correct 4 tabs for operator | P1 | operator | Logged in as operator, mobile viewport | 1. Observe the 4 main tabs in bottom bar | Tabs are: Inicio (Home icon), Actividades (Zap icon), Inventario (Package icon), Batches (Sprout icon). Fifth item is "Mas". No Ordenes or Configuracion tabs visible. |
| T-0F005-005 | Bottom bar shows correct 4 tabs for admin | P1 | admin | Logged in as admin, mobile viewport | 1. Observe the 4 main tabs in bottom bar | Tabs are: Inicio (Home icon), Configuracion (Settings icon), Batches (Sprout icon), Operaciones (Radio icon). Fifth item is "Mas". |
| T-0F005-006 | "Mas" menu opens and shows remaining modules | P1 | admin | Logged in as admin, mobile viewport | 1. Tap "Mas" tab in bottom bar 2. Observe the bottom sheet dialog | Bottom sheet opens with 3-column grid showing modules not in bottom bar: Ordenes, Actividades, Inventario, Areas, Calidad. Each item has an icon and label. Tapping a module navigates to it and closes the menu. |
| T-0F005-007 | Breadcrumbs show correct path on desktop | P1 | admin | Logged in, desktop viewport | 1. Navigate to /batches 2. Observe breadcrumbs in top bar 3. Navigate to /settings 4. Observe breadcrumbs update | Breadcrumbs display the current module name derived from `getModuleByHref()`. Shows "Batches" on /batches, "Configuracion" on /settings. Root `/` shows "Inicio" or no additional breadcrumb. |
| T-0F005-008 | User menu dropdown opens/closes | P1 | admin | Logged in, desktop viewport | 1. Click user avatar/initials in top-right area 2. Observe dropdown contents 3. Click outside the dropdown 4. Reopen it and press Escape | Dropdown opens showing user name and role. Closes on outside click. Closes on Escape keypress. Contains logout action. |
| T-0F005-009 | Sidebar state persists in localStorage across reload | P2 | admin | Logged in, desktop viewport | 1. Expand sidebar (Ctrl+B if collapsed) 2. Reload page (F5) 3. Verify sidebar is still expanded 4. Collapse sidebar (Ctrl+B) 5. Reload page | Sidebar retains expanded/collapsed state after reload. In DevTools > Application > Local Storage, key `alquemist-sidebar` stores the persisted state via Zustand `persist`. |
| T-0F005-010 | Navigation to all 9 modules works for admin | P1 | admin | Logged in as admin, desktop viewport | 1. Click each sidebar link: Inicio, Batches, Ordenes, Actividades, Inventario, Areas, Calidad, Operaciones, Configuracion 2. Verify URL and active state for each | Each click navigates to the correct route (/, /batches, /orders, /activities, /inventory, /areas, /quality, /operations, /settings). Active module is highlighted with brand-light color and left border accent. Page content loads without errors. |

---

## F-006: PWA Basica

### Context
F-006 implements Progressive Web App capabilities using Serwist v9 (`@serwist/next`). Service worker entry at `src/app/sw.ts` with `defaultCache`, `skipWaiting`, and `clientsClaim`. Precaching via `self.__SW_MANIFEST` injected at build time. Web manifest exported from `src/app/manifest.ts` at `/manifest.webmanifest`. Icons in `public/icons/` (192x192, 512x512, maskable 512x512). Offline fallback route `~offline`. The OfflineBanner component in `src/components/shared/offline-banner.tsx` uses `useSyncExternalStore` via `useOnlineStatus` hook to show connection status: green "Conectado" (online) or amber "Sin conexion" (offline), with sync status overlay. Note: the full service worker only runs in production build (`npm run build && npm start`), not in dev mode.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F006-001 | Web manifest is valid and accessible | P0 | N/A | Dev server running | 1. Navigate to localhost:3000/manifest.webmanifest 2. Verify JSON content 3. Open DevTools > Application > Manifest | JSON contains: `name: "Alquemist"`, `short_name: "Alquemist"`, `display: "standalone"`, `theme_color: "#005E42"`, `background_color: "#F7F8F2"`, `start_url: "/"`. Three icons listed (192x192, 512x512, maskable 512x512). No manifest errors in DevTools. |
| T-0F006-002 | Service worker registers successfully | P1 | N/A | Production build running (`npm run build && npm start`) | 1. Open localhost:3000 in Chrome 2. Open DevTools > Application > Service Workers | Service worker listed as "activated and is running". Source: `/sw.js`. Scope: `/`. No registration errors in console. Precached assets visible in Cache Storage. |
| T-0F006-003 | Offline banner appears when network is disabled | P1 | admin | Logged in, production build running | 1. Observe the thin 28px banner below the top bar (shows green "Conectado" with Wifi icon) 2. Open DevTools > Network, check "Offline" 3. Observe banner change | Banner transitions to amber/warning background with WifiOff icon and text "Sin conexion". Banner has `role="status"` and `aria-live="polite"` for screen reader accessibility. App does not crash. |
| T-0F006-004 | Offline banner restores to "Conectado" when network returns | P1 | admin | Banner currently shows "Sin conexion" (from T-0F006-003) | 1. Uncheck "Offline" in DevTools Network tab 2. Observe the banner | Banner transitions back to green/success background with Wifi icon and text "Conectado". Transition is smooth (CSS `transition-colors duration-200`). |
| T-0F006-005 | Offline fallback page loads for uncached navigation | P2 | N/A | Production build, SW active, network disabled | 1. Disable network in DevTools 2. Navigate to an uncached page URL (e.g., type a path that has not been visited before) | Instead of the browser's default offline error page, a custom Alquemist offline fallback page loads from the `~offline` route. Page is branded and informative. |

---

## F-007: Provisioning Basico de Usuarios

### Context
F-007 enables admin-only user creation at `/settings/users/new`. The page is a Server Component that loads facilities, wrapping the `CreateUserForm` client component. The form uses React Hook Form + Zod (`createUserSchema` in `src/lib/schemas/user.ts`) with fields: email (required, valid format), fullName (required, 2-100 chars), role (enum select, defaults to operator), facilityId (optional UUID select), password (optional, min 8 chars if provided). The `createUser` Server Action in `src/lib/actions/create-user.ts` is guarded by `requireAuth(['admin'])`, calls `admin.auth.admin.createUser()` via Supabase Admin API (service_role_key), then inserts into `public.users` via Drizzle. Auto-generated passwords are 14 characters, alphanumeric without ambiguous characters (0, O, l, 1, I removed). On success, a Dialog shows the temporary password with a copy-to-clipboard button.

### Test Cases

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|------------|------|-----|----------------|-------|-------------------|
| T-0F007-001 | Admin can access the create user page | P0 | admin | Logged in as admin@agrotech.co | 1. Navigate to localhost:3000/settings/users/new | Page loads with heading "Crear usuario". Form displays 5 fields: Email, Nombre completo, Rol (select with 5 options), Facility (select, optional), Contrasena (optional). "Crear usuario" button visible. Role defaults to "Operador". |
| T-0F007-002 | Admin creates a new user with auto-generated password | P0 | admin | On /settings/users/new | 1. Enter email: newuser@agrotech.co 2. Enter name: New User 3. Select role: Operador 4. Leave facility as "Sin asignar" 5. Leave password field empty 6. Click "Crear usuario" 7. Observe the success dialog | Dialog "Usuario creado" appears with message about sharing password securely. A monospace code block displays the generated password. Password is exactly 14 characters, alphanumeric (no ambiguous chars like 0, O, l, 1, I). Copy button (clipboard icon) is next to the password. |
| T-0F007-003 | Newly created user can login with generated password | P0 | N/A | User created in T-0F007-002, password noted or copied | 1. Close success dialog, then logout 2. Navigate to /login 3. Enter email: newuser@agrotech.co 4. Enter the generated password 5. Click "Iniciar sesion" | Login succeeds. User redirected to dashboard. Name "New User" displayed. Role is Operador. Navigation reflects operator permissions (no Ordenes, no Configuracion). |
| T-0F007-004 | Non-admin roles cannot access /settings/users/new | P0 | supervisor | Logged in as supervisor@agrotech.co | 1. Navigate directly to localhost:3000/settings/users/new | Access blocked by `requireAuth(['admin'])`. Page returns an error or redirect. Supervisor can access /settings but not the user creation sub-route (only admin has `manage_users` permission). Test also with manager, operator, viewer for completeness. |
| T-0F007-005 | Form validates required fields (email, name) | P1 | admin | On /settings/users/new | 1. Leave all fields at defaults (empty email, empty name) 2. Click "Crear usuario" 3. Enter invalid email "not-an-email" 4. Click "Crear usuario" 5. Enter valid email, but name with 1 character 6. Click submit | Empty email: validation error shown. Invalid email format: "Email invalido" message in red. Name < 2 chars: "Minimo 2 caracteres" message. Form does not submit to server until all client-side validations pass. |
| T-0F007-006 | Duplicate email shows server-side error | P1 | admin | On /settings/users/new, admin@agrotech.co already exists | 1. Enter email: admin@agrotech.co 2. Enter name: Duplicate Test 3. Select role: Admin 4. Click "Crear usuario" | Error toast appears with message "Ya existe un usuario con este email" (from Supabase Admin API error). No user is created. Form remains editable for correction. |
| T-0F007-007 | Facility assignment sets assigned_facility_id | P2 | admin | On /settings/users/new, at least one facility exists in seed | 1. Enter email: facilityuser@agrotech.co 2. Enter name: Facility User 3. Select role: Operador 4. Select the seed facility from the dropdown 5. Click "Crear usuario" 6. After success, verify in Supabase Studio: `SELECT assigned_facility_id FROM users WHERE email = 'facilityuser@agrotech.co'` | Success dialog appears. In `public.users` table, the new user's `assigned_facility_id` matches the selected facility UUID (`33333333-3333-3333-3333-333333333301`). The user's `app_metadata.facility_id` in `auth.users` also matches. |
| T-0F007-008 | Copy password button copies to clipboard | P1 | admin | Success dialog visible after creating a user | 1. Click the copy button (Copy icon) next to the generated password 2. Observe visual feedback 3. Open a text editor and paste (Ctrl+V) | Copy icon changes to a green Check icon for ~2 seconds. Text "Copiado al portapapeles" appears below the password. Pasted content matches the displayed password exactly. The copy button's aria-label changes from "Copiar contrasena" to "Copiado". |

---

## Resumen

| Feature | Total Tests | P0 | P1 | P2 |
|---------|------------|----|----|-----|
| F-001: Setup del Proyecto | 5 | 2 | 2 | 1 |
| F-002: Design System | 12 | 4 | 7 | 1 |
| F-003: Database Schema | 8 | 2 | 5 | 1 |
| F-004: Auth y Middleware | 14 | 9 | 5 | 0 |
| F-005: Layout Principal | 10 | 3 | 6 | 1 |
| F-006: PWA Basica | 5 | 1 | 3 | 1 |
| F-007: Provisioning de Usuarios | 8 | 4 | 3 | 1 |
| **Total** | **62** | **25** | **31** | **6** |
