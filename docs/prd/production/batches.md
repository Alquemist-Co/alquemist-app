# Batches de Producción

## Metadata

- **Ruta**: `/production/batches`
- **Roles con acceso**: admin (lectura completa), manager (lectura completa), supervisor (lectura completa), operator (lectura completa), viewer (lectura completa)
- **Tipo componente**: Mixto (Server Component para listado con filtros, Client Components para filtros interactivos)
- **Edge Functions**: `approve-production-order` — aprobación transaccional (crea batch + programa actividades, absorbed from PRD 23)

## Absorbed from PRD 23

The approval flow was deferred from PRD 23 because it requires the `batches` table (created in this PRD's migration). This PRD includes:

1. **Migration**: `batches` table + `batch_status` ENUM. *Note: `scheduled_activities` table deferred to Phase 5 (PRD 26).*
2. **Edge Function**: `approve-production-order` — validates draft status, creates batch, updates order status + first phase. *Note: scheduled_activities generation deferred to Phase 5 (PRD 26).*
3. **SQL Function**: `approve_production_order(order_id, zone_id, schedule_id)` — SECURITY DEFINER, atomic transaction
4. **UI on order detail page** (`/production/orders/[id]`): Enable "Aprobar" button, approval dialog (zone select, schedule select, confirmation checkbox), batch created section, scheduled activities section

## Objetivo

Listar y filtrar todos los batches (lotes de producción) de la empresa. El batch es el **nexo central** del sistema — conecta cultivar, zona, fase, orden, inventario, actividades, calidad y regulatorio. Esta página es el punto de entrada para monitorear el estado de toda la producción activa.

Los batches se crean automáticamente al aprobar una orden de producción (via Edge Function in this PRD). No se crean manualmente desde esta página. Las acciones operativas (transición de fase, split, merge, etc.) se realizan desde la página de detalle (PRD 25).

Usuarios principales: todos los roles — cada uno monitorea la producción desde su perspectiva.

## Tablas del modelo involucradas

| Tabla             | Operaciones | Notas                                                                                     |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------- |
| batches           | R           | Lectura con filtros múltiples. RLS Pattern 2 (hereda via zone_id → facilities.company_id) |
| cultivars         | R           | Nombre del cultivar                                                                       |
| production_phases | R           | Nombre de la fase actual                                                                  |
| zones             | R           | Nombre de la zona actual                                                                  |
| facilities        | R           | Nombre de la facility (via zona)                                                          |
| production_orders | R           | Código de la orden que generó el batch                                                    |
| products          | R           | Producto actual del batch                                                                 |

## ENUMs utilizados

| ENUM         | Valores                                                         | Tabla.campo    |
| ------------ | --------------------------------------------------------------- | -------------- |
| batch_status | active \| phase_transition \| completed \| cancelled \| on_hold | batches.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Batches" + breadcrumb (Producción > Batches)
- **KPIs rápidos** — Fila de cards con métricas:
  - Total batches activos (status=active + phase_transition)
  - En transición de fase
  - En hold
  - Completados este mes
- **Barra de filtros** — Inline, múltiples filtros combinables
  - Select: Estado (Todos / active / phase_transition / completed / cancelled / on_hold) con labels en español:
    - active → "Activo"
    - phase_transition → "En transición"
    - completed → "Completado"
    - cancelled → "Cancelado"
    - on_hold → "En espera"
  - Select: Cultivar (Todos / lista de cultivars que tengan batches)
  - Select: Fase actual (Todas / lista de production_phases)
  - Select: Zona (Todas / lista de zones activas)
  - ~~Select: Facility (Todas / lista de facilities)~~ *Deferred — zones already show facility name in dropdown*
  - Input: Buscar por código de batch
  - ~~DateRange: Rango de fecha de inicio~~ *Deferred — consistent with orders page pattern*
- **Tabla de batches** — Server Component con datos paginados
  - Columnas: Código (batch code, link al detalle), Cultivar, Fase actual (badge), Zona, Plantas, Producto actual, Orden (link), Fecha inicio, Fecha fin esperada, Días en producción (calculado), Costo acumulado ($), Estado (badge con color), Acciones
  - Colores de badge de estado:
    - active → verde
    - phase_transition → azul
    - completed → gris
    - cancelled → rojo
    - on_hold → amarillo
  - Acciones por fila:
    - "Ver detalle" → navega a `/production/batches/{id}` (PRD 25)
  - Paginación server-side (20 por página)
  - Ordenamiento por fecha de inicio (más reciente primero, default), por código, por fase, o por zona
  - Click en fila → navega a `/production/batches/{id}`

**Responsive**: KPIs en grid responsive (4→2→1 columnas). Tabla con scroll horizontal en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener batches via Server Component: `supabase.from('batches').select('*, cultivar:cultivars(name, code), phase:production_phases(name, sort_order), zone:zones(name, facility:facilities(name)), order:production_orders(code), product:products(name, sku)').order('start_date', { ascending: false })` con paginación
- **RF-02**: Filtros se aplican como query params en la URL para deep-linking
- **RF-03**: Default filter: status IN ('active', 'phase_transition', 'on_hold') — mostrar solo batches en producción. Toggle "Mostrar completados/cancelados" para incluir todos
- **RF-04**: Filtro de búsqueda por código: `.ilike('code', '%term%')`
- **RF-05**: Filtro por cultivar: `.eq('cultivar_id', cultivarId)`
- **RF-06**: Filtro por fase: `.eq('current_phase_id', phaseId)`
- **RF-07**: Filtro por zona: `.eq('zone_id', zoneId)`
- **RF-08**: ~~Filtro por facility: zonas filtradas por facility, luego `.in('zone_id', zoneIdsOfFacility)`~~ *Deferred — zones dropdown already includes facility name*
- **RF-09**: Calcular "Días en producción": `Math.ceil((today - start_date) / (1000 * 60 * 60 * 24))`
- **RF-10**: KPIs se calculan con queries de count separados o con la respuesta paginada
- **RF-11**: ~~El costo acumulado (`total_cost`) es calculado por trigger `trg_batch_cost_update` — se muestra formateado con la moneda de la empresa~~ *Deferred to Phase 7 — `total_cost` column exists (DEFAULT 0), cost trigger and display deferred*
- **RF-12**: Click en el código de batch navega a `/production/batches/{id}`. Click en código de orden navega a `/production/orders/{id}`
- **RF-13**: No hay acciones de creación/edición/eliminación en esta página — los batches se crean desde órdenes y se gestionan desde el detalle

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — batches hereda aislamiento vía `zone_id → facilities.company_id`. Se usa `get_my_zone_ids()` para queries eficientes
- **RNF-02**: Paginación server-side — el número de batches puede crecer significativamente
- **RNF-03**: Los filtros combinados usan AND lógico — cada filtro adicional reduce el resultado
- **RNF-04**: ~~La columna de costo acumulado se oculta si la empresa no tiene `features_enabled.cost_tracking`~~ *Deferred to Phase 7 with RF-11*
- **RNF-05**: Los KPIs se actualizan con cada cambio de filtro o refresh

## Flujos principales

### Happy path — Ver batches activos

1. Manager navega a `/production/batches`
2. KPIs muestran: 12 activos, 2 en transición, 1 en hold, 5 completados este mes
3. Tabla muestra batches activos con datos de cultivar, fase, zona
4. Click en LOT-GELATO-260301 → navega al detalle

### Filtrar por cultivar y zona

1. Selecciona cultivar: "Gelato #41"
2. Tabla se filtra a batches de Gelato solamente
3. Selecciona zona: "Sala Floración A"
4. Tabla muestra solo batches de Gelato en esa zona
5. URL: `/production/batches?cultivar=xxx&zone=yyy`

### Filtrar por fase actual

1. Selecciona fase: "Secado"
2. Tabla muestra solo batches en fase de secado
3. Útil para el encargado de sala de secado

### Ver todos los batches (incluir completados)

1. Click toggle "Mostrar completados/cancelados"
2. Tabla incluye batches con status completed y cancelled
3. Filtra por DateRange para ver completados del mes pasado

### Navegación a orden

1. En la tabla, click en el código de orden (OP-2026-001)
2. Navega a `/production/orders/OP-2026-001` (detalle de la orden)

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| loading        | Skeleton de tabla y KPIs                                                               |
| loaded         | Tabla con datos, KPIs actualizados                                                     |
| empty          | Sin batches — "No hay batches de producción. Aprueba una orden para crear el primero." |
| empty-filtered | Sin resultados — "No se encontraron batches con estos filtros"                         |
| error          | Error al cargar — "Error al cargar batches. Intenta nuevamente"                        |

### Errores esperados

| Escenario           | Mensaje al usuario                              |
| ------------------- | ----------------------------------------------- |
| Error de red        | "Error de conexión. Intenta nuevamente" (toast) |
| Error cargando KPIs | KPIs muestran "—" con tooltip "Error al cargar" |

## Approval Flow (Absorbed from PRD 23)

### Edge Function: `approve-production-order`

```
POST /functions/v1/approve-production-order
{
  order_id: UUID,
  zone_id: UUID,          // zona inicial para el batch
  schedule_id: UUID | null // cultivation_schedule a usar (opt)
}
```

The Edge Function executes transactionally via SQL SECURITY DEFINER function:
1. Validate order is in status=draft
2. Update `production_orders.status` → 'approved'
3. Create `batches` row: cultivar_id, zone_id, current_phase_id=entry_phase, production_order_id, status='active', code auto-generated (LOT-{CULTIVAR_CODE}-{YYMMDD}-{NNN}), start_date=planned_start_date or today
4. ~~If schedule_id provided, generate `scheduled_activities` from `cultivation_schedules.phase_config` for each order phase~~ *Deferred to Phase 5 (PRD 26)*
5. Update `production_order_phases[0].status` → 'ready', `.batch_id` → new batch
6. Return: `{ batch_id, batch_code, scheduled_activities_count }`

### UI on Order Detail Page

Updates to `/production/orders/[id]` (PRD 23 page):
- Enable "Aprobar orden" button (replaces disabled placeholder)
- **Approval Dialog**: zone select (pre-filled from order), summary section (cultivar, quantity, phases), "Aprobar y crear lote" button. *Note: schedule select deferred to Phase 5 (PRD 26). Confirmation checkbox replaced by deliberate zone selection + summary review.*
- **Batch section**: visible after approval — batch code, status, link to `/production/batches/{batchId}`
- ~~**Activities section**: visible after approval — summary list of scheduled activities~~ *Deferred to Phase 5 (PRD 26)*
- Cancellation with batch: warning that cancelling order does not auto-cancel batch

### Approval RFs

- **RF-A1**: Al aprobar, invocar Edge Function `approve-production-order` with order_id, selected zone_id, optional schedule_id
- **RF-A2**: Tras aprobación, toast "Orden aprobada. Batch {code} creado con {N} actividades programadas" + refresh page
- **RF-A3**: If no cultivation_schedule exists, approve without activities. Toast variant: "Batch creado. No se programaron actividades."
- **RF-A4**: Only admin/manager can approve (not supervisor)
- **RF-A5**: Cancellation of approved/in_progress orders shows warning about existing batch

## Dependencias

- **Páginas relacionadas**:
  - `/production/batches/[id]` — detalle del batch (PRD 25)
  - `/production/orders/[id]` — detalle de la orden que generó el batch (PRD 23, extended here)
  - `/areas/zones/[id]` — detalle de la zona donde está el batch (PRD 16)
- **Edge Function**: `approve-production-order` — config in `supabase/config.toml` with `verify_jwt = false`
- **SQL Function**: `approve_production_order()` — SECURITY DEFINER, atomic transaction
- **Settings**: `companies.settings.features_enabled.cost_tracking` — controla visibilidad de columna de costos
- **Supabase client**: PostgREST para lecturas + Edge Function para aprobación

