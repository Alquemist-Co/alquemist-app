# Guia de Onboarding para Desarrolladores

## Arquitectura general

Alquemist es una PWA de gestion agricola con arquitectura Next.js App Router.

```
Browser ──> Next.js App Router ──> Server Actions ──> Drizzle ORM ──> PostgreSQL (Supabase)
                │                        │
                ├── Zustand (UI state)   ├── requireAuth() (auth guard)
                ├── TanStack Query       ├── Zod (validation)
                ├── Dexie.js (offline)   └── postgres.js (driver)
                └── Serwist (SW/cache)
```

### Flujo de datos

1. **Server Components** hacen queries via Server Actions con `requireAuth()` guard
2. **Client Components** reciben datos como props y manejan interactividad
3. **Mutaciones** via Server Actions: `"use server"` → Zod validation → auth check → Drizzle query
4. **Estado**: Zustand para UI local, TanStack Query para server cache, Dexie para offline

## Patrones de codigo

### Server Action (query)

```typescript
// src/lib/actions/example.ts
"use server";
import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { myTable } from "@/lib/db/schema/domain";

export async function getItems() {
  const claims = await requireAuth(["admin", "supervisor"]);
  return db
    .select()
    .from(myTable)
    .where(eq(myTable.companyId, claims.companyId));
}
```

`requireAuth(roles?)` verifica la sesion y opcionalmente restringe por rol. Retorna `AuthClaims` con `userId`, `email`, `role`, `companyId`, `facilityId`, `fullName`.

### Server Action (mutacion)

```typescript
export async function createItem(data: CreateItemData) {
  const claims = await requireAuth(["admin"]);
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) return { error: "Datos invalidos" };

  await db.insert(myTable).values({
    ...parsed.data,
    companyId: claims.companyId,
  });

  return { success: true };
}
```

### Page pattern (Server + Client)

```typescript
// page.tsx (Server Component)
export default async function ItemsPage() {
  const items = await getItems();
  return <ItemList items={items} />;
}

// item-list.tsx (Client Component)
"use client";
export function ItemList({ items }: { items: Item[] }) {
  // interactividad aqui
}
```

### Componentes UI

Componentes base en `src/components/ui/` usan `cva` (class-variance-authority) para variantes:

```typescript
import { Button } from "@/components/ui/button";     // primary, secondary, ghost
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";         // success, warning, error, info
import { Dialog } from "@/components/ui/dialog";       // bottom sheet mobile, modal desktop
import { Toggle } from "@/components/ui/toggle";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/table";
```

Combinar clases con `cn()`:

```typescript
import { cn } from "@/lib/utils/cn";
<div className={cn("p-4", isActive && "bg-brand")} />
```

### Formularios

React Hook Form + Zod resolver:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mySchema, type MyData } from "@/lib/schemas/my-schema";

const { register, handleSubmit, formState: { errors } } = useForm<MyData>({
  resolver: zodResolver(mySchema),
});
```

### Permisos en UI

```typescript
import { RoleGate } from "@/components/auth/role-gate";
import { PermissionGate } from "@/components/auth/permission-gate";

<RoleGate roles={["admin", "manager"]}>
  <Button>Solo admin y manager ven esto</Button>
</RoleGate>

<PermissionGate action="manage_users">
  <Button>Solo si tiene permiso manage_users</Button>
</PermissionGate>
```

### Toasts

```typescript
import { useToastStore } from "@/lib/utils/toast-store";
const addToast = useToastStore((s) => s.addToast);
addToast({ type: "success", message: "Guardado" });
```

## Estilos y tokens

Tailwind v4 con tokens en `src/app/globals.css` via `@theme`:

- **Colores**: `--color-brand` (#005E42), `--color-accent` (#ECF7A3), `--color-surface` (#F7F8F2)
- **Fonts**: DM Sans (body), DM Mono (datos numericos)
- **Spacing**: base 4px
- **Radii**: `--radius-card` (12px), `--radius-dialog` (20px)

No existe `tailwind.config.ts` — todo via CSS custom properties.

## Base de datos

### Schema

Drizzle schemas en `src/lib/db/schema/` organizados por dominio:

- `enums.ts` — ~32 enums del sistema
- `core.ts` — companies, facilities, users
- `production.ts` — orders, batches, cultivation_schedules
- `activities.ts` — activity_templates, scheduled_activities, activities
- `inventory.ts` — products, inventory_lots, inventory_transactions
- `quality.ts` — quality_tests, quality_results
- `areas.ts` — zones, plant_positions
- `operations.ts` — sensors, environmental_readings, alerts

### Migraciones

SQL manual en `supabase/migrations/`. Para crear una nueva:

```bash
npx supabase migration new nombre_descriptivo
# Editar el archivo generado en supabase/migrations/
npm run db:reset  # Aplicar
```

### RLS

4 tipos de policies:
- **A**: company_id directo en la tabla
- **B**: via facility (JOIN con facilities)
- **C**: company_id redundante con trigger auto-populate
- **D**: catalogo global (sin restriccion de company)

## Auth

- **Middleware** (`src/lib/auth/middleware.ts`): intercepta requests, valida sesion, redirige si no autenticado
- **Route access** (`src/lib/auth/route-access.ts`): matriz de que roles pueden ver cada ruta
- **Permissions** (`src/lib/auth/permissions.ts`): ~25 action-level permissions
- **Auth store** (Zustand): hydratado por `AuthProvider`, disponible globalmente

## Offline (Dexie.js)

8 tablas cacheadas localmente + sync queue con backoff exponencial:

```typescript
import { offlineDb } from "@/lib/offline/db";
const batches = await offlineDb.batches.toArray();
```

Sync queue procesa operaciones pendientes cuando vuelve la conexion.

## Realtime (Supabase)

4 hooks para suscripciones:
- `useRealtimeAlerts` — alertas nuevas/resueltas
- `useRealtimeBatches` — cambios en batches
- `useRealtimeActivities` — actividades completadas
- `useRealtimeEnvironmental` — lecturas de sensores

## Git workflow

### Commits

Conventional commits: `tipo(alcance): descripcion`

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Alcances: `ordenes`, `batches`, `inventario`, `calidad`, `actividades`, `areas`, `operaciones`, `config`, `auth`, `core`, `ui`

### Verificacion pre-commit

```bash
npm run lint    # 0 errores
npm run build   # 0 errores
npm test        # Tests pasan
```

### Backlog

Features en `docs/backlog/{planned,in-progress,done}/`. Al iniciar un feature, mover de `planned/` a `in-progress/`. Al completar, mover a `done/`. Actualizar contadores en `BACKLOG.md` y `CLAUDE.md`.

## Gotchas

- **Build webpack**: `npm run build` usa `--webpack` (Serwist no soporta Turbopack)
- **Date.now()**: No usar en `useState` initializer ni render (React Compiler lo detecta como impuro). Usar `useRef` + init en `useEffect`
- **Zod v4**: `.safeParse` errors via `.issues` (no `.errors`). `.optional().or(z.literal(""))` para campos opcionales en forms
- **ESLint set-state-in-effect**: No llamar setState sincronamente en useEffect. Usar ref guard
- **zodResolver + .default()**: `z.boolean().default(true)` causa type mismatch. Usar defaults en `defaultValues` del form
- **Selects nativos**: No hay componente `<Select>` custom — usar `<select>` HTML con estilos de `Input`
- **WSL2 + Docker**: Contenedores ghost pueden sobrevivir. Verificar puertos con `ss -tlnp | grep 5432`
- **UUID seed**: Los UUIDs de seed usan patron `11111111-...-111` (no son UUID v4 validos, pero PostgreSQL los acepta)
- **Supabase CLI**: Usar `npx supabase` (no esta en PATH)
