# Alquemist — Instrucciones para Claude Code

## Proyecto

PWA de gestión agrícola integral: offline-first, multi-tenant, 5 roles, 43 tablas, 48 pantallas.

**Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Realtime + Storage), Drizzle ORM, Dexie.js, Zustand, TanStack Query v5, React Hook Form + Zod, Serwist (PWA), Lucide icons, Recharts
**Hosting**: Vercel | **Testing**: Vitest + Playwright | **Monitoreo**: Sentry

## Documentación de referencia

Consultar estos documentos **antes** de tomar decisiones de arquitectura o implementación:

| Documento | Contenido |
|---|---|
| `docs/alquemist-proyecto.md` | Arquitectura, stack, estructura del proyecto, roadmap 20 semanas, setup día 1 |
| `docs/alquemist-features.md` | RLS policies, Zod schemas, Dexie offline schema, sync queue, features por módulo, API routes, convenciones de código |
| `docs/alquemist-pwa-reqs.md` | Roles y permisos, design system, 48 pantallas, catálogo de componentes, navegación, accesibilidad, performance |
| `docs/alquemist-modelo-definitivo.md` | 43 tablas en 8 dominios, relaciones cross-domain, diccionario de campos, flujos operativos |

## Progreso

**Fase actual**: 1 — Core Loop

| Feature | Status | Fecha |
|---------|--------|-------|
| F-001 Setup del proyecto | Done | 2026-02-16 |
| F-002 Design system | Done | 2026-02-16 |
| F-003 Database schema | Done | 2026-02-16 |
| F-004 Auth y middleware | Done | 2026-02-16 |
| F-005 Layout principal | Done | 2026-02-16 |
| F-006 PWA basica | Done | 2026-02-16 |
| F-007 Provisioning basico de usuarios | Done | 2026-02-16 |
| F-011 Configuracion de tipos de cultivo y fases | Done | 2026-02-16 |
| F-012 Configuracion de cultivares | In Progress | - |

Backlog organizado por estado en `docs/backlog/{planned,in-progress,done}/`.
Log de cambios en `docs/CHANGELOG.md`.

## Gestión del backlog

El backlog está en `docs/backlog/{planned,in-progress,done}/`. Estas reglas se siguen **siempre** que se trabaje en una feature del backlog.

### Al iniciar una feature (F-XXX)

1. `git mv docs/backlog/planned/F-XXX-*.md docs/backlog/in-progress/`
2. Actualizar status `Planned` → `In Progress` y link a `./in-progress/` en:
   - `docs/backlog/BACKLOG.md`
   - `docs/backlog/BACKLOG-FASE-X.md` (la fase correspondiente)
3. Actualizar tabla Progreso en este archivo (`CLAUDE.md`)
4. Commit: `docs(backlog): iniciar F-XXX descripción-corta`

### Al completar cada story (US-XXX-YYY)

1. Marcar status `Done` en el archivo de la feature (`F-XXX-*.md`)
2. Actualizar counters en `BACKLOG.md` y `BACKLOG-FASE-X.md`

### Al completar una feature (F-XXX)

1. `git mv docs/backlog/in-progress/F-XXX-*.md docs/backlog/done/`
2. Actualizar status `In Progress` → `Done` y link a `./done/` en:
   - `docs/backlog/BACKLOG.md`
   - `docs/backlog/BACKLOG-FASE-X.md`
3. Actualizar counters (Planned/In Progress/Done) en ambos índices
4. Actualizar tabla Progreso en este archivo (`CLAUDE.md`) con fecha
5. Agregar entrada en `docs/CHANGELOG.md` con stories, commits y notas técnicas
6. Actualizar `MEMORY.md` si hay decisiones técnicas relevantes para futuras sesiones

### Commits estratégicos

Durante la implementación de una feature, hacer commits en estos puntos:

| Momento | Formato del commit |
|---------|-------------------|
| Inicio de feature (backlog update) | `docs(backlog): iniciar F-XXX descripción` |
| Después de cada story funcional | `feat(alcance): US-XXX-YYY descripción` |
| Feature completa + backlog actualizado | `docs(backlog): completar F-XXX descripción` |
| Fin de sesión (siempre) | Commit del estado actual + push |

### Push

- **Push al completar cada feature** (o al final de la sesión si queda en progreso)
- Siempre verificar `npm run lint && npm run build` antes de push

## Sistema de desarrollo — Plan-First

**Regla central: toda tarea comienza con un plan. Sin excepción.**

```
1. Entender → 2. Planificar → 3. Ejecutar (con skills) → 4. Verificar
```

### Matriz de skills por tipo de tarea

| Tarea | Flujo de skills |
|---|---|
| Feature nueva (idea o descripción) | `/product-owner` → implementar |
| Feature con stories existentes | Implementar directamente |
| Descomponer requisitos en historias | `/product-owner` |
| Código React / Next.js | Aplicar `vercel-react-best-practices` |
| Código de base de datos (queries, schema, RLS) | Aplicar `supabase-postgres-best-practices` |
| Bug fix | Plan → diagnóstico → fix → verificar |
| Crear nueva skill o capacidad | `/skill-creator` |

### Regla de best practices

Las skills `vercel-react-best-practices` y `supabase-postgres-best-practices` se aplican **siempre** que se escriba o revise código en su dominio — no solo cuando se invoquen explícitamente.

## Estructura del proyecto

```
src/
├── app/              → Rutas, layouts, pages (App Router)
├── components/
│   ├── ui/           → Componentes base reutilizables
│   └── [module]/     → Componentes específicos por módulo
├── lib/
│   ├── schemas/      → Zod schemas (compartidos client/server)
│   ├── actions/      → Server Actions
│   ├── db/           → Drizzle schema, queries, migrations
│   ├── offline/      → Dexie schemas, sync queue
│   └── utils/        → Utilidades compartidas
├── hooks/            → Custom React hooks
├── stores/           → Zustand stores
├── types/            → TypeScript types e interfaces
└── styles/           → Estilos globales

docs/
├── *.md              → Documentación fuente del proyecto
└── backlog/          → Feature docs y BACKLOG.md (vía /product-owner)

public/               → Assets estáticos, PWA manifest, icons
```

## Convenciones de código

- **Archivos**: `kebab-case.ts` / `kebab-case.tsx`
- **Funciones / variables**: `camelCase`
- **Componentes React**: `PascalCase`
- **Tablas / columnas DB**: `snake_case`
- **Path alias**: `@/*` → `./src/*`
- **Mutaciones**: Server Actions (nunca API routes para mutaciones internas)
- **Validación**: Zod schemas compartidos entre client y server
- **Formularios**: React Hook Form + Zod resolver
- **Errores**: Clase `AppError` con código, mensaje y contexto
- **Updates optimistas**: TanStack Query `onMutate` / `onError` / `onSettled`
- **Estado**: Zustand (UI local) + TanStack Query (server state) + Dexie (offline)

## Design system

- **Colores**: `#005E42` primary (Cinnabar Green), `#ECF7A3` accent (Green Pea Lime), `#F7F8F2` surface
- **Fonts**: DM Sans (headings y body, Bold 800 para títulos), DM Mono (datos numéricos)
- **Icons**: Lucide (outlined, 1.5px stroke, 20px en navegación)
- **Spacing**: base 4px
- **Enfoque**: Mobile-first, responsive (sm / md / lg / xl)
- **Componentes**: Seguir el catálogo definido en `docs/alquemist-pwa-reqs.md`

## Git workflow

### Commits — Conventional Commits

Formato: `tipo(alcance): descripción breve`

**Tipos**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
**Alcance**: nombre del módulo — `ordenes`, `batches`, `inventario`, `calidad`, `actividades`, `areas`, `operaciones`, `config`, `auth`, `core`, `ui`

Ejemplos:
```
feat(batches): agregar avance de fase con validación de yield
fix(sync): corregir retry en cola de sincronización offline
docs(prd): documentar módulo de inventario
refactor(ui): extraer componente StatCard reutilizable
```

### Branches

Formato: `tipo/descripción-corta`

Ejemplos: `feat/batch-phase-advance`, `fix/sync-queue-retry`, `docs/prd-inventory`

### Pull Requests

- Título descriptivo (< 70 caracteres)
- Resumen de cambios en el body
- Checklist de verificación (lint, build, tests si aplican)

## Desarrollo local

### Supabase local (Docker)

```bash
npm run db:start    # Levanta Postgres, Auth, Storage, Studio via Docker
npm run db:stop     # Detiene todos los contenedores
npm run db:reset    # Borra la DB, re-aplica migraciones + seed
npm run db:status   # Muestra estado y URLs de los servicios
```

**URLs locales:**
| Servicio | URL |
|----------|-----|
| API (PostgREST) | http://127.0.0.1:54321 |
| Base de datos | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Mailpit (emails) | http://127.0.0.1:54324 |

**Variables de entorno:**
- `.env.local` apunta a Supabase local por defecto (keys generadas por `supabase start`)
- Para producción: descomentar las credenciales de Supabase Cloud en `.env.local`
- `.env.example` tiene el template con URLs locales

**Migraciones:**
- Archivos en `supabase/migrations/` con formato `{timestamp}_nombre.sql`
- Seed data en `supabase/seed.sql` (se ejecuta automáticamente con `db:reset`)
- Para agregar una nueva migración: `npx supabase migration new nombre_descriptivo`

**Seed de auth (importante):**
- `auth.identities` rows son requeridas para que `signInWithPassword` funcione (sin ellas → error 500)
- Token columns en `auth.users` (`confirmation_token`, `recovery_token`, etc.) deben ser `''`, no NULL (GoTrue scan error)
- En WSL2 + Docker Desktop: si los contenedores quedan ghost después de `supabase stop`, verificar puertos con `ss -tlnp | grep 5432` y matar shims si es necesario

## Produccion (Supabase Cloud + Vercel)

### Supabase Cloud

- **Project ref**: `bavpxtnwxvemqmntfnmd`
- **Link**: `npx supabase link --project-ref bavpxtnwxvemqmntfnmd`
- **Push migraciones**: `npx supabase db push` (aplica migraciones nuevas sin resetear)
- **Reset completo**: `npx supabase db reset --linked` (destructivo: borra todo y re-aplica)

### Vercel

- Deploy automatico en push a `main`
- Env vars configuradas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`
- Pendiente: `SUPABASE_SERVICE_ROLE_KEY` (necesario para F-007)

### Runbook: crear primer admin en Cloud

Si la DB de produccion esta vacia (sin usuarios), crear el primer admin via SQL Editor en Supabase Dashboard:

```sql
-- 1. Crear usuario en auth.users
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  role, aud, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'admin@tuempresa.com',
  crypt('password-temporal-seguro', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin","company_id":"<COMPANY_UUID>"}',
  '{"full_name":"Nombre Admin"}',
  'authenticated', 'authenticated', '', '', '', '',
  now(), now()
);

-- 2. Crear fila en public.users (usar el UUID generado arriba)
INSERT INTO public.users (id, company_id, email, full_name, role)
VALUES ('<AUTH_USER_UUID>', '<COMPANY_UUID>', 'admin@tuempresa.com', 'Nombre Admin', 'admin');

-- 3. Crear identity (requerida para signInWithPassword)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (gen_random_uuid(), '<AUTH_USER_UUID>', 'admin@tuempresa.com', 'email',
  jsonb_build_object('sub', '<AUTH_USER_UUID>', 'email', 'admin@tuempresa.com'),
  now(), now(), now());
```

> **Nota**: Este proceso manual sera reemplazado por F-007 (provisioning basico de usuarios).

### Pendientes para produccion completa

- [ ] `SUPABASE_SERVICE_ROLE_KEY` en Vercel (para admin API)
- [ ] SMTP configurado en Supabase para emails de invitacion
- [ ] Custom domain (Vercel + Supabase)
- [ ] Sentry para monitoreo de errores
- [ ] Rate limiting en Server Actions

## Verificación

Ejecutar **antes** de considerar cualquier tarea completa:

```bash
npm run lint        # ESLint — cero errores
npm run build       # Build de producción — cero errores
```

Cuando aplique:
```bash
npm run dev         # Verificación visual en el navegador
npm test            # Tests unitarios e integración (cuando se configuren)
```
