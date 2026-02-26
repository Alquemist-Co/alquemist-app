# ALQUEMIST

## Arquitectura de Sistema

_Stack simplificado: Supabase + Next.js + Vercel_

Febrero 2026 · v1.0

---

## Tabla de Contenidos

1. Decisión Arquitectónica
2. Stack Tecnológico
3. Arquitectura General
4. Capa de Base de Datos (Supabase)
5. Capa de API y Lógica de Negocio
6. Capa de Frontend (Next.js)
7. Seguridad y Multi-Tenancy
8. Procesamiento Asíncrono
9. Almacenamiento de Archivos
10. Monitoreo Ambiental (IoT)
11. Estrategia de Deployment
12. Escalabilidad y Límites
13. Evolución Futura

---

## 1. Decisión Arquitectónica

### Contexto

Alquemist es un sistema de gestión agrícola con 45 tablas, 9 dominios, multi-tenancy, y flujos transaccionales complejos (cosecha multi-output, transformaciones de inventario, splits de batch). Está diseñado para 50-200 usuarios concurrentes con presupuesto limitado.

### Decisión: Online-Only con Cola de Reintentos

Se descarta la estrategia offline-first con sync bidireccional (PowerSync/ElectricSQL) por las siguientes razones:

- **Complejidad desproporcionada:** La sincronización bidireccional de 45 tablas con transacciones inmutables, transformaciones multi-output y splits de batch requiere una capa de sync custom que duplica la lógica de negocio.
- **Superficie de bugs:** Mantener alineadas las políticas RLS (seguridad en servidor) con las sync rules (filtrado offline) en dos sistemas paralelos es una fuente constante de inconsistencias.
- **El caso de uso real es acotado:** Los operarios de campo primariamente registran datos (actividades, observaciones, checklist), no consultan reportes complejos. Una cola de reintentos local cubre el 90% de las necesidades sin sync bidireccional.

### Estrategia de Conectividad

| Escenario                        | Solución                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Conexión normal                  | Operación directa contra Supabase                                                                          |
| Conexión lenta                   | La app funciona normalmente (queries optimizados, paginación)                                              |
| Sin conexión temporal (< 30 min) | Cola de reintentos en Service Worker — formularios se guardan localmente y se envían al recuperar conexión |
| Sin conexión prolongada          | El operario no puede usar la app — se documenta como limitación conocida                                   |

La cola de reintentos NO es una base de datos local. Es un array de requests pendientes en IndexedDB que se procesan FIFO al recuperar conexión. No hay queries locales, no hay sync bidireccional, no hay resolución de conflictos.

---

## 2. Stack Tecnológico

### Stack Principal

| Capa                    | Tecnología                         | Justificación                                                      |
| ----------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| **Base de datos**       | Supabase (PostgreSQL 15+)          | RLS nativo, auth integrado, realtime, storage, PostgREST           |
| **Auth**                | Supabase Auth                      | JWT, roles via app_metadata, integración directa con RLS           |
| **API CRUD**            | Supabase PostgREST (auto-generada) | API REST automática para las ~25 tablas de catálogo/configuración  |
| **API de Orquestación** | Supabase Edge Functions (Deno)     | Flujos transaccionales complejos (~8 operaciones críticas)         |
| **Frontend**            | Next.js 15+ (App Router)           | SSR para dashboards, client components para formularios operativos |
| **Styling**             | Tailwind CSS + shadcn/ui           | Componentes accesibles, diseño consistente, desarrollo rápido      |
| **Deployment**          | Vercel                             | Zero-config para Next.js, edge network, preview deployments        |
| **Storage**             | Supabase Storage                   | Documentos regulatorios, fotos de observaciones, adjuntos          |
| **Realtime**            | Supabase Realtime                  | Alertas, actualizaciones de estado de batch, notificaciones        |

### Dependencias Clave

| Librería                     | Propósito                                                 |
| ---------------------------- | --------------------------------------------------------- |
| `@supabase/supabase-js`      | Cliente Supabase para browser y server                    |
| `@supabase/ssr`              | Integración Next.js con cookies para auth server-side     |
| `zod`                        | Validación de schemas (compartida entre client y server)  |
| `react-hook-form`            | Formularios con validación                                |
| `@tanstack/react-query`      | Cache, revalidación y estado del servidor                 |
| `recharts`                   | Gráficas para dashboards                                  |
| `date-fns`                   | Manipulación de fechas con timezone                       |
| `next-pwa` o `@serwist/next` | Service Worker para cola de reintentos y cacheo de assets |

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENTES                         │
│                                                         │
│  ┌─────────────────┐       ┌─────────────────────────┐  │
│  │  Dashboard Web   │       │   App Campo (PWA)       │  │
│  │  (SSR + Client)  │       │   (Client-Only)         │  │
│  │                  │       │                         │  │
│  │  • Reportes      │       │  • Registrar actividad  │  │
│  │  • Config        │       │  • Checklist            │  │
│  │  • Órdenes       │       │  • Observaciones/fotos  │  │
│  │  • Inventario    │       │  • Cola de reintentos   │  │
│  └────────┬─────────┘       └────────────┬────────────┘  │
│           │                              │               │
└───────────┼──────────────────────────────┼───────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js)                     │
│                                                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │  Server Comps     │  │  API Routes                 │  │
│  │  (SSR dashboards) │  │  (proxy a Supabase)         │  │
│  └──────────────────┘  └─────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       SUPABASE                           │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐  │
│  │ PostgREST│ │Edge Funcs│ │  Auth  │ │   Storage   │  │
│  │ (CRUD)   │ │(Orquest.)│ │  (JWT) │ │  (Archivos) │  │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └─────────────┘  │
│       │            │           │                        │
│       ▼            ▼           ▼                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │              PostgreSQL 15+                       │   │
│  │                                                   │   │
│  │  • 45 tablas con RLS                             │   │
│  │  • Triggers para side-effects inmediatos         │   │
│  │  • pg_cron para jobs periódicos                  │   │
│  │  • Funciones security definer para RLS           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────┐                                        │
│  │  Realtime   │  Alertas, estados de batch             │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

### Principio de Separación

El sistema divide las operaciones en dos categorías claras:

**CRUD directo via PostgREST (~70% de operaciones):** Lectura y escritura simple de catálogos, consultas, listados. El cliente Supabase habla directamente con PostgREST. RLS filtra por tenant automáticamente. No requiere lógica server-side custom.

Tablas CRUD: companies, users, crop_types, cultivars, production_phases, facilities, zones, zone_structures, plant_positions, resource_categories, products, units_of_measure, suppliers, recipes, activity_types, activity_templates, activity_template_phases, activity_template_resources, activity_template_checklist, cultivation_schedules, sensors, overhead_costs, regulatory_doc_types, product_regulatory_requirements, shipment_doc_requirements.

**Orquestación via Edge Functions (~30% de operaciones):** Flujos que involucran múltiples tablas en una transacción atómica, cálculos en cascada, o side-effects complejos. Se implementan como Edge Functions que ejecutan la lógica completa dentro de una transacción de Postgres.

Flujos orquestados:

1. **Aprobar orden → crear batch → programar actividades** (Flujo 1 del modelo)
2. **Ejecutar actividad → registrar recursos → generar transacciones de inventario** (Flujo 2)
3. **Cosecha multi-output → transformaciones → avance de fase** (Flujo 3)
4. **Split/merge de batch → lineage → redistribuir schedule** (Flujo 4)
5. **Transición de fase → actualizar batch → mover zona** (cross-cutting)
6. **Recepción de envío → inspección → crear inventory_items** (Flujo 7)
7. **Ejecución de receta → escalar → generar transacciones** (Inventario)
8. **Cálculo de yields en cascada al crear/editar orden** (Órdenes)

---

## 4. Capa de Base de Datos (Supabase)

### PostgreSQL como Fuente de Verdad

Todas las 45 tablas viven en un único PostgreSQL gestionado por Supabase. El modelo de datos existente se implementa sin modificaciones estructurales.

### Triggers para Side-Effects Inmediatos

Los triggers de Postgres manejan efectos secundarios que deben ocurrir sincrónicamente con la escritura:

| Trigger                         | Tabla                  | Efecto                                                                                          |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| `trg_update_inventory_balance`  | inventory_transactions | Actualiza quantity_available/reserved/committed en inventory_items según el type de transacción |
| `trg_update_timestamps`         | \* (todas)             | Actualiza updated_at automáticamente                                                            |
| `trg_calculate_zone_capacity`   | zone_structures        | Recalcula effective_growing_area_m2 y plant_capacity en zones                                   |
| `trg_calculate_facility_totals` | zones                  | Recalcula total_growing_area_m2 y total_plant_capacity en facilities                            |
| `trg_check_regulatory_expiry`   | regulatory_documents   | Al insertar, auto-calcula expiry_date desde issue_date + valid_for_days si aplica               |
| `trg_batch_cost_update`         | inventory_transactions | Actualiza total_cost en batches cuando se registra una transacción con batch_id                 |

### pg_cron para Jobs Periódicos

Jobs que corren en schedule fijo, implementados como funciones SQL invocadas por pg_cron:

| Job                        | Frecuencia     | Acción                                                                                                       |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `check_expiring_documents` | Diario 6:00 AM | Genera alertas type='regulatory_expiring' para documentos que vencen en los próximos 30 días                 |
| `check_overdue_activities` | Cada hora      | Genera alertas type='overdue_activity' para scheduled_activities con planned_date < hoy y status='pending'   |
| `check_low_inventory`      | Diario 7:00 AM | Genera alertas type='low_inventory' para inventory_items bajo mínimo configurable                            |
| `check_stale_batches`      | Diario 8:00 AM | Genera alertas type='stale_batch' para batches sin actividad en N días                                       |
| `expire_documents`         | Diario 1:00 AM | Cambia status='expired' en regulatory_documents donde expiry_date < hoy                                      |
| `check_env_readings`       | Cada 15 min    | Compara últimas environmental_readings contra cultivars.optimal_conditions y genera alertas env_out_of_range |

### Funciones SQL Reutilizables

Funciones que encapsulan lógica de negocio accesible desde Edge Functions y desde RLS:

```sql
-- Obtener company_id del usuario actual (para RLS)
get_user_company_id() → UUID

-- Obtener facility_ids accesibles por el usuario actual
get_user_facilities() → UUID[]

-- Calcular yields en cascada para un cultivar desde entry a exit phase
calculate_cascade_yields(cultivar_id, entry_phase_id, exit_phase_id, initial_qty) → JSONB

-- Verificar compliance regulatorio de un batch
check_batch_compliance(batch_id) → JSONB {total_required, fulfilled, missing[], expiring[]}

-- Obtener el costo total de un batch (directo + overhead prorrateado)
calculate_batch_cogs(batch_id) → DECIMAL
```

---

## 5. Capa de API y Lógica de Negocio

### CRUD via PostgREST

Para las tablas de catálogo y configuración, el cliente Supabase se usa directamente:

```typescript
// Ejemplo: listar cultivars activos del crop_type seleccionado
const { data, error } = await supabase
  .from('cultivars')
  .select('*, crop_type:crop_types(name)')
  .eq('crop_type_id', cropTypeId)
  .eq('is_active', true)
  .order('name')
```

RLS filtra automáticamente por company_id. No se necesita lógica server-side.

### Edge Functions para Orquestación

Cada flujo complejo se implementa como una Edge Function que recibe parámetros validados y ejecuta toda la lógica dentro de una transacción:

```
POST /functions/v1/approve-production-order
POST /functions/v1/execute-activity
POST /functions/v1/execute-harvest          (cosecha multi-output)
POST /functions/v1/transition-phase
POST /functions/v1/split-batch
POST /functions/v1/merge-batch
POST /functions/v1/confirm-shipment-receipt
POST /functions/v1/execute-recipe
POST /functions/v1/calculate-order-yields
```

Cada Edge Function sigue la misma estructura:

```typescript
// Estructura estándar de Edge Function
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  // 1. Autenticación — extraer JWT del header
  const authHeader = req.headers.get('Authorization')
  const supabase = createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  // 2. Validación — Zod schema compartido con frontend
  const body = await req.json()
  const parsed = ApproveOrderSchema.safeParse(body)
  if (!parsed.success) return new Response(JSON.stringify(parsed.error), { status: 400 })

  // 3. Ejecución en transacción — via función SQL o RPC
  const { data, error } = await supabase.rpc('approve_production_order', {
    order_id: parsed.data.orderId,
    zone_id: parsed.data.zoneId,
  })

  // 4. Respuesta
  if (error) return new Response(JSON.stringify({ error }), { status: 500 })
  return new Response(JSON.stringify(data), { status: 200 })
})
```

La lógica pesada (crear batch, generar scheduled_activities, reservar inventario) vive en funciones SQL `security definer` invocadas via `supabase.rpc()`. Esto mantiene la Edge Function como orquestador liviano y la lógica atómica dentro de Postgres, evitando el límite de 2s de CPU de las Edge Functions.

### Validación Compartida

Los schemas Zod se definen en un paquete compartido (`packages/schemas/`) usado tanto por el frontend (validación de formularios) como por las Edge Functions (validación de input):

```
packages/
  schemas/
    src/
      production-order.ts    # CreateOrderSchema, ApproveOrderSchema
      activity.ts            # ExecuteActivitySchema
      harvest.ts             # ExecuteHarvestSchema
      inventory.ts           # AdjustmentSchema, TransferSchema
      shipment.ts            # ConfirmReceiptSchema
      ...
```

---

## 6. Capa de Frontend (Next.js)

### Estructura de Rutas

```
app/
  (auth)/
    login/
    signup/
    invite/[token]/
    forgot-password/
    reset-password/[token]/
  (dashboard)/             ← Layout con sidebar, requiere auth
    layout.tsx             ← Server Component: valida sesión, carga company
    page.tsx               ← Dashboard principal (fase 9)
    production/
      orders/              ← Listado y creación de órdenes
      orders/[id]/         ← Detalle de orden
      batches/             ← Seguimiento de batches activos
      batches/[id]/        ← Detalle de batch con timeline
    areas/
      facilities/
      zones/
      zones/[id]/          ← Detalle de zona
    inventory/
      products/
      suppliers/
      shipments/
      shipments/[id]/      ← Detalle de envío
      recipes/
      items/               ← Stock actual (fase 7)
      transactions/        ← Log inmutable, solo lectura (fase 7)
    activities/
      schedule/            ← Calendar view de scheduled_activities
      execute/[id]/        ← Formulario de ejecución (Client Component)
      history/
    quality/
      tests/
      tests/[id]/          ← Detalle de test
    regulatory/
      documents/
      documents/[id]/      ← Detalle de documento
    operations/
      alerts/
      environmental/
      sensors/
      costs/
    settings/
      profile/
      company/
      users/
      catalog/
      crop-types/
      cultivars/
      activity-templates/
      regulatory-config/
  (field)/                 ← Rutas optimizadas para operarios en campo
    layout.tsx             ← Layout simplificado para móvil
    today/                 ← Actividades del día para este operario
    execute/[id]/          ← Ejecución rápida de actividad
    observe/               ← Registrar observación ad-hoc
    scan/                  ← Escanear QR de batch/zona
```

### Separación Server vs Client Components

**Server Components (default):** Listados, reportes, dashboards, configuración. Fetch data en el servidor con `supabase.auth.getUser()` para seguridad.

**Client Components:** Formularios de ejecución, interfaces interactivas, filtros dinámicos, componentes que necesitan estado local o React Query.

```typescript
// Server Component — listado de batches
export default async function BatchesPage() {
  const supabase = await createServerClient()
  const { data: batches } = await supabase
    .from('batches')
    .select('*, cultivar:cultivars(name), zone:zones(name), phase:production_phases(name)')
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  return <BatchList batches={batches} />
}

// Client Component — formulario de ejecución de actividad
'use client'
export function ActivityExecutionForm({ scheduledActivity }) {
  // React Hook Form + Zod + mutations via React Query
}
```

### React Query para Estado del Servidor

React Query (`@tanstack/react-query`) gestiona el cache y la revalidación de datos en Client Components:

```typescript
// Hook reutilizable
function useBatchActivities(batchId: string) {
  return useQuery({
    queryKey: ['batch-activities', batchId],
    queryFn: () =>
      supabase
        .from('activities')
        .select('*')
        .eq('batch_id', batchId)
        .order('performed_at', { ascending: false }),
    staleTime: 30_000, // 30s antes de refetch
  })
}

// Mutations para operaciones complejas
function useExecuteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => supabase.functions.invoke('execute-activity', { body: data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch-activities', variables.batchId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
    },
  })
}
```

### PWA con Cola de Reintentos

La PWA se implementa con `@serwist/next` o `next-pwa` para:

1. **Cacheo de assets estáticos** — La app shell carga instantáneamente.
2. **Cola de reintentos** — Requests fallidos por falta de conexión se encolan y reintentan.

```typescript
// service-worker.ts — Cola de reintentos simple
import { Queue } from 'workbox-background-sync'

const activityQueue = new Queue('activity-submissions', {
  maxRetentionTime: 24 * 60, // Reintentar hasta 24 horas
  onSync: async ({ queue }) => {
    let entry
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request)
      } catch (error) {
        await queue.unshiftRequest(entry)
        throw error // Detiene el procesamiento, reintenta después
      }
    }
  },
})

// Interceptar requests a Edge Functions
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/functions/v1/execute-activity')) {
    const bgSyncLogic = async () => {
      try {
        const response = await fetch(event.request.clone())
        return response
      } catch (error) {
        await activityQueue.pushRequest({ request: event.request })
        return new Response(JSON.stringify({ queued: true }), { status: 202 })
      }
    }
    event.respondWith(bgSyncLogic())
  }
})
```

El frontend detecta cuando un request fue encolado (status 202) y muestra un indicador visual al operario: "Actividad registrada — se sincronizará cuando vuelva la conexión."

---

## 7. Seguridad y Multi-Tenancy

### Modelo de Aislamiento

Cada tabla que contiene datos de tenant tiene `company_id` como columna de aislamiento. La cadena de aislamiento es:

```
users.company_id (del JWT app_metadata)
  → filtra companies, facilities, zones, batches, orders, etc.
    → tablas hijas heredan aislamiento via JOINs
```

### RLS — Estructura de Políticas

Todas las políticas RLS siguen un patrón estandarizado para mantener consistencia y performance en las 45 tablas:

**Patrón 1: Tablas con company_id directo**

```sql
-- Función helper cacheada (security definer, ejecuta una sola vez por request)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
$$;

-- Política estándar para tablas con company_id
CREATE POLICY "tenant_isolation" ON facilities
  FOR ALL
  USING (company_id = (SELECT get_my_company_id()))
  WITH CHECK (company_id = (SELECT get_my_company_id()));
```

El `(SELECT ...)` wrapper permite al optimizador de Postgres cachear el resultado y no re-ejecutar la función por cada fila.

**Patrón 2: Tablas sin company_id directo (heredan via FK)**

```sql
-- inventory_transactions hereda via batch → company
CREATE POLICY "tenant_isolation" ON inventory_transactions
  FOR ALL
  USING (
    zone_id IN (SELECT id FROM zones WHERE facility_id IN (
      SELECT id FROM facilities WHERE company_id = (SELECT get_my_company_id())
    ))
  );
```

Para tablas de alto volumen como inventory_transactions, se usa una función `security definer` que retorna los zone_ids accesibles, evitando la cascada de RLS en tablas intermedias:

```sql
CREATE OR REPLACE FUNCTION get_my_zone_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ARRAY(
    SELECT z.id FROM public.zones z
    JOIN public.facilities f ON z.facility_id = f.id
    WHERE f.company_id = (
      SELECT (auth.jwt() -> 'app_metadata' ->> 'company_id')::UUID
    )
  )
$$;

CREATE POLICY "tenant_isolation" ON inventory_transactions
  FOR ALL
  USING (zone_id = ANY((SELECT get_my_zone_ids())));
```

**Patrón 3: Control por rol**

```sql
-- Solo admin y manager pueden modificar catálogos
CREATE POLICY "catalog_write" ON products
  FOR INSERT
  USING (
    (SELECT get_my_company_id()) IS NOT NULL
    AND (SELECT auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'manager')
  );
```

### Roles y Permisos

Los roles se almacenan en `app_metadata` del JWT (no en `user_metadata`, que es editable por el usuario):

| Rol        | Acceso Catálogos | Crear Órdenes | Ejecutar Actividades | Aprobar Órdenes | Admin |
| ---------- | ---------------- | ------------- | -------------------- | --------------- | ----- |
| admin      | CRUD             | ✓             | ✓                    | ✓               | ✓     |
| manager    | CRUD             | ✓             | ✓                    | ✓               | ✗     |
| supervisor | Read             | ✓             | ✓                    | ✗               | ✗     |
| operator   | Read             | ✗             | ✓                    | ✗               | ✗     |
| viewer     | Read             | ✗             | ✗                    | ✗               | ✗     |

### Índices Críticos para RLS

Para que las políticas RLS no degraden performance:

```sql
-- Índice en company_id para todas las tablas con aislamiento directo
CREATE INDEX idx_facilities_company ON facilities (company_id);
CREATE INDEX idx_batches_company ON batches ((
  SELECT company_id FROM facilities f
  JOIN zones z ON z.facility_id = f.id
  WHERE z.id = batches.zone_id
));

-- Índice en zone_id para tablas de alto volumen
CREATE INDEX idx_transactions_zone ON inventory_transactions (zone_id);
CREATE INDEX idx_activities_zone ON activities (zone_id);
CREATE INDEX idx_readings_zone ON environmental_readings (zone_id);
```

---

## 8. Procesamiento Asíncrono

### Fase 1: Triggers + pg_cron (Lanzamiento)

Todos los procesos asíncronos se resuelven dentro de PostgreSQL:

- **Triggers AFTER INSERT/UPDATE:** Para side-effects inmediatos (actualizar balances, recalcular capacidades).
- **pg_cron:** Para jobs periódicos (alertas, expiraciones, monitoreo ambiental).
- **Funciones SQL transaccionales:** Para flujos complejos invocados desde Edge Functions.

Esta arquitectura mantiene toda la lógica en un solo lugar (Postgres), es debuggeable con SQL estándar, y no requiere infraestructura adicional.

### Fase 2: Cola de Tareas (Si se necesita)

Si los flujos crecen en complejidad o necesitan retry con backoff, se migra a un servicio de colas. Opciones compatibles con el stack:

| Opción          | Ventaja                                            | Cuándo migrar                                                      |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| **Trigger.dev** | Serverless, UI de monitoreo, retries configurables | Cuando necesites observabilidad de workflows                       |
| **Inngest**     | Event-driven, pasos con retry individual           | Cuando los flujos tengan > 5 pasos encadenados                     |
| **pg_boss**     | Vive dentro de Postgres, zero infra adicional      | Cuando pg_cron no sea suficiente pero no quieras salir de Postgres |

La migración es incremental: cada flujo se puede mover individualmente de "función SQL invocada por Edge Function" a "job en cola" sin afectar los demás.

---

## 9. Almacenamiento de Archivos

### Supabase Storage

Estructura de buckets:

```
regulatory-documents/       ← Documentos regulatorios (PDFs, certificados)
  {company_id}/
    {doc_type_code}/
      {document_id}.pdf

activity-attachments/       ← Fotos de observaciones, cosecha, etc.
  {company_id}/
    {batch_id}/
      {activity_id}/
        {attachment_id}.jpg

shipment-documents/         ← Documentación de transporte
  {company_id}/
    {shipment_id}/
      {document_id}.pdf
```

### Políticas de Storage

```sql
-- Solo usuarios de la misma company pueden acceder
CREATE POLICY "company_isolation" ON storage.objects
  FOR ALL
  USING (
    bucket_id IN ('regulatory-documents', 'activity-attachments', 'shipment-documents')
    AND (storage.foldername(name))[1] = (SELECT get_my_company_id())::TEXT
  );
```

### Optimización para Fotos de Campo

Las fotos tomadas en campo se comprimen client-side antes de subir:

- Máximo 1920px en el lado más largo
- Calidad JPEG 80%
- Metadata EXIF preservada (GPS, timestamp)
- Upload directo a Supabase Storage con presigned URL

---

## 10. Monitoreo Ambiental (IoT)

### Ingesta de Datos

Los sensores envían lecturas via HTTP POST a una Edge Function dedicada:

```
POST /functions/v1/ingest-reading
{
  "sensor_serial": "TM-HCS1-001",
  "readings": [
    { "parameter": "temperature", "value": 24.5, "unit": "°C" },
    { "parameter": "humidity", "value": 55.2, "unit": "%RH" }
  ]
}
```

La Edge Function valida el sensor (serial → sensor_id → zone_id), inserta en environmental_readings, y verifica contra optimal_conditions del cultivar activo en esa zona.

### Particionamiento de Lecturas

`environmental_readings` es la tabla de mayor volumen. Se particiona por mes:

```sql
CREATE TABLE environmental_readings (
  ...
) PARTITION BY RANGE (timestamp);

-- Particiones mensuales creadas via pg_cron
CREATE TABLE environmental_readings_2026_03
  PARTITION OF environmental_readings
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

Política de retención: lecturas individuales se mantienen 6 meses; después se agregan a promedios horarios y se archivan.

### Realtime para Alertas

Las alertas generadas por desviaciones ambientales se pushean al frontend via Supabase Realtime:

```typescript
// Client Component — escuchar alertas en tiempo real
supabase
  .channel('alerts')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `company_id=eq.${companyId}`,
    },
    (payload) => {
      showNotification(payload.new)
    }
  )
  .subscribe()
```

---

## 11. Estrategia de Deployment

### Environments

| Ambiente        | URL              | Base de datos                | Propósito                 |
| --------------- | ---------------- | ---------------------------- | ------------------------- |
| **Development** | localhost:3000   | Supabase local (Docker)      | Desarrollo con datos seed |
| **Preview**     | \*.vercel.app    | Supabase proyecto staging    | Preview por PR, QA        |
| **Production**  | app.alquemist.co | Supabase proyecto producción | Usuarios reales           |

### CI/CD Pipeline

```
git push → GitHub Actions
  ├── Lint + Type check
  ├── Tests unitarios (Vitest)
  ├── Tests de integración (schemas Zod, funciones SQL)
  ├── Deploy Edge Functions a Supabase (si cambiaron)
  ├── Migraciones DB (supabase db push) — solo en merge a main
  └── Deploy Next.js a Vercel (automático)
```

### Migraciones de Base de Datos

Se usa Supabase CLI para gestionar migraciones:

```bash
# Crear migración
supabase migration new add_regulatory_tables

# Aplicar localmente
supabase db push

# Aplicar en staging/production
supabase db push --linked
```

Las migraciones incluyen tanto DDL (tablas, índices) como DML (seed de datos base como units_of_measure, resource_categories base, activity_types estándar).

---

## 12. Escalabilidad y Límites

### Límites Conocidos de Supabase

| Recurso                  | Límite (Pro Plan)           | Impacto en Alquemist                                                            |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------------- |
| Conexiones DB            | 60 directas + pooler        | Suficiente para 50-200 usuarios con connection pooling                          |
| Edge Function CPU        | 2s por request              | Flujos complejos delegan a funciones SQL (sin límite de CPU dentro de Postgres) |
| Edge Function Wall Clock | 400s                        | Más que suficiente para orquestación                                            |
| Storage                  | 100GB incluido              | Adecuado para documentos y fotos                                                |
| Realtime                 | 500 conexiones concurrentes | Suficiente para alertas y notificaciones                                        |
| Database size            | 8GB (Pro), extensible       | Monitorear environmental_readings y inventory_transactions                      |

### Estrategia de Escalamiento

**Fase 1 (0-50 usuarios):** Supabase Pro ($25/mes) + Vercel Pro ($20/mes). Todo en un solo proyecto Supabase.

**Fase 2 (50-200 usuarios):** Mismo stack. Optimizar queries con EXPLAIN ANALYZE. Agregar read replicas si los reportes pesados impactan la operación.

**Fase 3 (200+ usuarios):** Evaluar Supabase Team/Enterprise. Considerar separar environmental_readings a TimescaleDB. Evaluar CDN para assets estáticos de la PWA.

### Monitoreo

- **Supabase Dashboard:** Métricas de DB, Edge Functions, Storage, Auth.
- **Vercel Analytics:** Performance del frontend, Core Web Vitals.
- **Supabase Log Explorer:** Queries lentos, errores de RLS, Edge Function failures.
- **pg_stat_statements:** Top queries por tiempo de ejecución para optimización continua.

---

## 13. Evolución Futura

### Offline Completo (Si se necesita)

Si el feedback de campo demuestra que la cola de reintentos no es suficiente, se puede agregar PowerSync sin cambios al modelo de datos:

1. Crear rol de replicación en Postgres para PowerSync.
2. Definir sync rules basadas en la jerarquía company → facility → zone.
3. Agregar PowerSync SDK al frontend para las rutas de `/field/*`.
4. La cola de reintentos existente se reemplaza por el upload handler de PowerSync.

El modelo de datos no cambia porque PowerSync trabaja sobre el mismo Postgres.

### App Nativa (Si se necesita)

Si se necesita acceso a hardware del dispositivo (cámara avanzada, NFC, Bluetooth para sensores), se puede envolver la PWA en Capacitor sin reescribir:

```
Next.js PWA → Capacitor → APK/IPA
```

Las rutas de `/field/*` ya están diseñadas como Client Components, lo que facilita esta migración.

### API Pública (Si se necesita)

Si terceros necesitan integrar con Alquemist (labs de calidad, ERPs, proveedores), se puede exponer un subset de la API de PostgREST con API keys dedicadas y rate limiting, sin construir una API separada.
