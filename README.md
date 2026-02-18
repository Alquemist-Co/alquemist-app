# Alquemist

PWA de gestion agricola integral: offline-first, multi-tenant, 5 roles.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage), Drizzle ORM
- **State**: Zustand (UI), TanStack Query v5 (server), Dexie.js (offline)
- **Forms**: React Hook Form + Zod v4
- **PWA**: Serwist v9 (service worker, precaching, offline fallback)
- **Testing**: Vitest + Testing Library
- **Hosting**: Vercel + Supabase Cloud

## Requisitos previos

- Node.js 20+
- Docker Desktop (para Supabase local)
- npm (incluido con Node.js)

## Setup rapido

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd alquemist-app
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con las credenciales de Supabase local (se generan en el paso 3).

### 3. Levantar Supabase local

```bash
npm run db:start
```

Esto arranca PostgreSQL, Auth, Storage y Studio via Docker. Al finalizar muestra las URLs y keys:

| Servicio | URL |
|----------|-----|
| API (PostgREST) | http://127.0.0.1:54321 |
| Base de datos | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Mailpit (emails) | http://127.0.0.1:54324 |

Copiar `anon key` y `service_role key` a `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key del output>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 4. Aplicar migraciones y seed

```bash
npm run db:reset
```

Esto aplica todas las migraciones en `supabase/migrations/` y ejecuta `supabase/seed.sql` con datos de prueba.

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000. Login con cualquier usuario de prueba:

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Admin | admin@alquemist.local | Admin123! | admin |
| Supervisor | supervisor@alquemist.local | Super123! | supervisor |
| Operator | operator@alquemist.local | Oper123! | operator |
| Manager | manager@alquemist.local | Mgr123! | manager |
| Viewer | viewer@alquemist.local | View123! | viewer |

## Scripts

| Script | Descripcion |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de produccion (webpack, requerido por Serwist) |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest |
| `npm run test:watch` | Tests en modo watch |
| `npm run analyze` | Bundle analyzer |
| `npm run db:start` | Levantar Supabase local |
| `npm run db:stop` | Detener Supabase local |
| `npm run db:reset` | Reset completo (migraciones + seed) |
| `npm run db:status` | Estado de servicios Supabase |

## Estructura del proyecto

```
src/
  app/              # Rutas y pages (App Router)
    (auth)/         # Login (publico)
    (dashboard)/    # Paginas protegidas
  components/
    ui/             # Componentes base (Button, Card, Input, Dialog, etc.)
    layout/         # AppShell, Sidebar, TopBar, BottomBar
    dashboard/      # Dashboards por rol
    shared/         # Skeleton, EmptyState, SearchModal
    data/           # StatCard, DialGauge
  lib/
    actions/        # Server Actions (mutaciones y queries)
    auth/           # Middleware, permissions, route-access
    db/schema/      # Drizzle ORM schemas
    schemas/        # Zod validation schemas
    supabase/       # Clientes Supabase (browser, server, admin)
    offline/        # Dexie schemas, sync queue
    nav/            # Configuracion de navegacion por rol
    utils/          # cn(), toast-store, cron-auth
  hooks/            # Custom React hooks
  stores/           # Zustand stores
  types/            # TypeScript types

supabase/
  migrations/       # SQL migrations (timestamped)
  seed.sql          # Datos de prueba

docs/               # Documentacion del proyecto
  backlog/          # Feature specs y tracking

tests/              # Unit tests
```

## Roles y permisos

5 roles con acceso diferenciado:

| Modulo | Operator | Supervisor | Manager | Admin | Viewer |
|--------|----------|------------|---------|-------|--------|
| Dashboard | Si | Si | Si | Si | Si |
| Batches | Si | Si | Si | Si | Si (lectura) |
| Orders | - | Si | Si | Si | Si (lectura) |
| Activities | Si | Si | Si | Si | Si (lectura) |
| Inventory | Si | Si | Si | Si | Si (lectura) |
| Quality | Si | Si | Si | Si | Si (lectura) |
| Areas | Si | Si | Si | Si | Si (lectura) |
| Operations | Si | Si | Si | Si | Si (lectura) |
| Settings | - | Si | Si | Si | - |

## Base de datos

43 tablas en 8 dominios, ~32 enums. Migraciones manuales en SQL.

- Row Level Security (RLS) activado en todas las tablas
- Triggers para `updated_at`, inmutabilidad de transactions, auto-populate `company_id`
- Drizzle ORM para type-safe queries via `postgres.js` driver

## Produccion

- **Supabase Cloud**: `npx supabase db push` para migraciones incrementales
- **Vercel**: Deploy automatico en push a `main`
- **Build**: `npm run build` (usa webpack, requerido por Serwist)

## Verificacion

Antes de cada commit:

```bash
npm run lint    # 0 errores
npm run build   # 0 errores
npm test        # Todos los tests pasan
```
