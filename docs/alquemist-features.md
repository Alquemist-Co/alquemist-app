# ALQUEMIST

Progressive Web Application

**Features de Implementación**

Server Actions · Validaciones · RLS · Offline Schema · Edge Cases ·
Acceptance Criteria

Febrero 2026 · v1.0

## Tabla de Contenidos

## Row Level Security Policies

Cada tabla con datos de tenant lleva una RLS policy que filtra por
company_id. El company_id del usuario se extrae del JWT: (auth.jwt() ->
'app_metadata' ->> 'company_id')::uuid. Se usa una función helper
para simplificar:

\-- Helper function (crear una sola vez) CREATE OR REPLACE FUNCTION
auth.company_id() RETURNS uuid AS \$\$ SELECT (auth.jwt() ->
'app_metadata' ->> 'company_id')::uuid; \$\$ LANGUAGE sql STABLE;
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS \$\$ SELECT
auth.jwt() -> 'app_metadata' ->> 'role'; \$\$ LANGUAGE sql
STABLE; CREATE OR REPLACE FUNCTION auth.facility_id() RETURNS uuid AS
\$\$ SELECT (auth.jwt() -> 'app_metadata' ->>
'facility_id')::uuid; \$\$ LANGUAGE sql STABLE;

Policies por Tipo de Tabla

**Tipo A — Tablas con company_id directo**

companies, facilities, users, cultivars, cultivation_schedules,
production_orders, sensors, overhead_costs, alerts, recipes

\-- Patrón: company_id directo ALTER TABLE {table} ENABLE ROW LEVEL
SECURITY; CREATE POLICY \"tenant_select\" ON {table} FOR SELECT USING
(company_id = auth.company_id()); CREATE POLICY \"tenant_insert\" ON
{table} FOR INSERT WITH CHECK (company_id = auth.company_id()); CREATE
POLICY \"tenant_update\" ON {table} FOR UPDATE USING (company_id =
auth.company_id()); CREATE POLICY \"tenant_delete\" ON {table} FOR
DELETE USING (company_id = auth.company_id());

**Tipo B — Tablas que heredan via facility**

zones, zone_structures, plant_positions

\-- Patrón: via facility → company CREATE POLICY \"tenant_select\" ON
zones FOR SELECT USING ( facility_id IN ( SELECT id FROM facilities
WHERE company_id = auth.company_id() ) );

**Tipo C — Tablas que heredan via batch**

batch_lineage, activities, scheduled_activities, activity_resources,
activity_observations, activity_checklist_results,
inventory_transactions, quality_tests, quality_test_results

\-- Patrón: via batch → (production_order | zone → facility) → company
\-- Opción eficiente: agregar company_id redundante en batches \-- y en
las tablas más queried (activities, inventory_transactions) ALTER TABLE
batches ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES
companies(id); ALTER TABLE activities ADD COLUMN IF NOT EXISTS
company_id uuid REFERENCES companies(id); ALTER TABLE
inventory_transactions ADD COLUMN IF NOT EXISTS company_id uuid
REFERENCES companies(id); \-- Trigger para auto-populate company_id en
batches CREATE OR REPLACE FUNCTION set_batch_company_id() RETURNS
trigger AS \$\$ BEGIN NEW.company_id := ( SELECT f.company_id FROM zones
z JOIN facilities f ON z.facility_id = f.id WHERE z.id = NEW.zone_id );
RETURN NEW; END; \$\$ LANGUAGE plpgsql; CREATE TRIGGER trg_batch_company
BEFORE INSERT ON batches FOR EACH ROW EXECUTE FUNCTION
set_batch_company_id();

**Tipo D — Tablas de catálogo global (SIN RLS)**

crop_types, production_phases, phase_product_flows, resource_categories,
units_of_measure — Estas tablas son globales (compartidas entre
tenants) o específicas del sistema. NO llevan RLS. Se protegen con
policies de solo lectura para roles que no sean admin.

\-- Catálogos: solo admin puede modificar ALTER TABLE crop_types ENABLE
ROW LEVEL SECURITY; CREATE POLICY \"read_all\" ON crop_types FOR SELECT
USING (true); CREATE POLICY \"admin_write\" ON crop_types FOR ALL USING
(auth.user_role() = 'admin');

Policies de Rol (Component-Level)

Además del filtro por tenant, ciertas acciones se restringen por rol.
Estas policies complementan las de tenant:

| **Tabla** | **Operación** | **Roles Permitidos** | **Detalle** |
| --- | --- | --- | --- |
| activities | **INSERT** | **operator, supervisor, admin** | Operador solo puede insertar actividades asignadas a sí mismo. Supervisor puede insertar en sus zonas. |
| activities | **UPDATE (status)** | **operator, supervisor** | Operador: solo sus propias. Supervisor: de operadores en sus zonas. Manager+ no ejecuta. |
| batches | **UPDATE (phase change)** | **supervisor, manager, admin** | Operador no puede cambiar fase. Solo vía completar actividad con triggers_phase_change. |
| batches | **INSERT (split)** | **supervisor, manager, admin** | Operador no puede splitear. Supervisor puede con aprobación implícita. |
| production_orders | **INSERT** | **manager, admin** | Solo gerente y admin crean órdenes. |
| production_orders | **UPDATE (approve)** | **manager, admin** | Solo gerente y admin aprueban. Draft → approved. |
| inventory_transactions | **INSERT** | **operator (via activity), supervisor, manager, admin** | Operador genera transacciones SOLO a través de actividades, no manualmente. |
| overhead_costs | **INSERT/UPDATE** | **manager, admin** | Costos indirectos solo gerenciales. |
| users | **INSERT/UPDATE** | **admin** | Solo admin gestiona usuarios. |
| quality_tests | **INSERT** | **supervisor, manager, admin** | Operador no crea tests, solo registra observaciones en actividades. |
| quality_test_results | **INSERT** | **supervisor, manager, admin** | Resultados de lab solo por supervisor+. |

## Zod Validation Schemas

Schemas compartidos entre client y server. Ubicación:
lib/validations/{domain}.schema.ts. Se usan en React Hook Form
(resolver) y en Server Actions (parse).

Batch — batch.schema.ts

```typescript
export const createBatchSchema = z.object({ production_order_id:
z.string().uuid(), cultivar_id: z.string().uuid(), zone_id:
z.string().uuid(), plant_count: z.number().int().min(1).max(100000),
source_type: z.enum(['seed', 'clone', 'purchase',
'transfer']), source_details: z.string().max(500).optional(), notes:
z.string().max(2000).optional(), }); export const splitBatchSchema =
z.object({ batch_id: z.string().uuid(), split_count:
z.number().int().min(1), target_zone_id: z.string().uuid(), reason:
z.string().min(5).max(500), }).refine(data => data.split_count > 0, {
message: 'Debe separar al menos 1 planta', }); export const
advancePhaseSchema = z.object({ batch_id: z.string().uuid(),
target_zone_id: z.string().uuid().optional(), notes:
z.string().max(2000).optional(), });
```

Orden de Producción — order.schema.ts

```typescript
export const createOrderSchema = z.object({ cultivar_id:
z.string().uuid(), entry_phase_id: z.string().uuid(), exit_phase_id:
z.string().uuid(), initial_quantity: z.number().positive(),
initial_unit_id: z.string().uuid(), initial_product_id:
z.string().uuid().optional(), target_zone_ids:
z.record(z.string().uuid(), z.string().uuid()), planned_start_date:
z.string().date(), priority: z.enum(['low', 'normal', 'high',
'urgent']).default('normal'), assigned_to: z.string().uuid(),
notes: z.string().max(2000).optional(), }).refine(data => { //
entry_phase must come before exit_phase in sort_order return true; //
validated server-side with DB lookup }, { message: 'Exit phase must
come after entry phase' }); export const approveOrderSchema =
z.object({ order_id: z.string().uuid(), });
```

Actividad (Ejecución) — activity.schema.ts

```typescript
export const executeActivitySchema = z.object({ scheduled_activity_id:
z.string().uuid(), resources: z.array(z.object({ product_id:
z.string().uuid(), quantity_actual: z.number().nonnegative(), unit_id:
z.string().uuid(), inventory_item_id: z.string().uuid().optional(),
notes: z.string().max(500).optional(), })), checklist:
z.array(z.object({ template_checklist_id: z.string().uuid(),
is_completed: z.boolean(), value_recorded: z.string().optional(),
photo_url: z.string().url().optional(), })), observations:
z.array(z.object({ type: z.enum(['pest', 'disease', 'deficiency',
'environmental', 'general']), severity: z.enum(['info', 'low',
'medium', 'high', 'critical']), description:
z.string().min(5).max(2000), affected_count:
z.number().int().nonnegative().optional(), photo_urls:
z.array(z.string().url()).max(5).optional(), })).optional(),
duration_minutes: z.number().int().min(1).max(1440), notes:
z.string().max(2000).optional(), });
```

Inventario — inventory.schema.ts

```typescript
export const receiveItemSchema = z.object({ product_id:
z.string().uuid(), quantity: z.number().positive(), unit_id:
z.string().uuid(), zone_id: z.string().uuid(), supplier_id:
z.string().uuid().optional(), supplier_lot:
z.string().max(100).optional(), cost_per_unit: z.number().nonnegative(),
currency: z.string().length(3).default('COP'), expiration_date:
z.string().date().optional(), notes: z.string().max(500).optional(), });
export const executeRecipeSchema = z.object({ recipe_id:
z.string().uuid(), scale_factor: z.number().positive().max(1000),
batch_id: z.string().uuid().optional(), zone_id: z.string().uuid(),
item_selections: z.array(z.object({ ingredient_product_id:
z.string().uuid(), inventory_item_id: z.string().uuid(), quantity:
z.number().positive(), })), }); export const adjustmentSchema =
z.object({ inventory_item_id: z.string().uuid(), quantity_delta:
z.number(), reason: z.string().min(5).max(500), type:
z.enum(['adjustment', 'waste', 'return']), });
```

Calidad — quality.schema.ts

```typescript
export const createTestSchema = z.object({ batch_id: z.string().uuid(),
phase_id: z.string().uuid(), test_type: z.string().min(2).max(100),
lab_name: z.string().max(200).optional(), sample_reference:
z.string().max(100), sampled_at: z.string().datetime(), }); export const
recordResultsSchema = z.object({ quality_test_id: z.string().uuid(),
results: z.array(z.object({ parameter_name: z.string(), value:
z.string(), unit: z.string().optional(), min_threshold:
z.number().optional(), max_threshold: z.number().optional(), })).min(1),
overall_passed: z.boolean(), certificate_url:
z.string().url().optional(), notes: z.string().max(2000).optional(), });
```

Áreas / Ambiente — area.schema.ts

```typescript
export const createZoneSchema = z.object({ facility_id:
z.string().uuid(), name: z.string().min(2).max(100), code:
z.string().min(2).max(20), purpose: z.enum([ 'propagation',
'vegetative', 'flowering', 'drying', 'curing', 'processing',
'storage', 'mother' ]), environment: z.enum(['indoor',
'outdoor', 'greenhouse', 'hybrid']), area_m2:
z.number().positive().optional(), capacity_plants:
z.number().int().positive().optional(), }); export const
sensorReadingSchema = z.object({ sensor_id: z.string().uuid(),
parameter: z.enum(['temperature', 'humidity', 'co2', 'vpd',
'light_intensity', 'ph', 'ec']), value: z.number(), unit:
z.string(), recorded_at: z.string().datetime(), });
```

Configuración — config.schema.ts

```typescript
export const createCropTypeSchema = z.object({ name:
z.string().min(2).max(100), category: z.string().max(50).optional(),
description: z.string().max(500).optional(), }); export const
createPhaseSchema = z.object({ crop_type_id: z.string().uuid(), name:
z.string().min(2).max(100), code:
z.string().min(2).max(20).regex(/\^[A-Z0-9\_]+\$/), sort_order:
z.number().int().min(1), is_transformation: z.boolean().default(false),
is_destructive: z.boolean().default(false), requires_zone_change:
z.boolean().default(false), can_be_entry_point:
z.boolean().default(false), can_be_exit_point:
z.boolean().default(false), can_skip: z.boolean().default(false),
default_duration_days: z.number().int().positive().optional(), });
export const createCultivarSchema = z.object({ crop_type_id:
z.string().uuid(), name: z.string().min(2).max(100), code:
z.string().max(20).optional(), breeder: z.string().max(100).optional(),
cycle_days: z.number().int().positive().optional(),
expected_yield_per_plant_g: z.number().positive().optional(),
quality_grade: z.string().max(20).optional(), phase_durations:
z.record(z.string(), z.number()).optional(), optimal_conditions:
z.object({ temp_min: z.number(), temp_max: z.number(), humidity_min:
z.number(), humidity_max: z.number(), co2_min: z.number().optional(),
co2_max: z.number().optional(), }).optional(), density_per_m2:
z.number().positive().optional(), });
```

Dexie Offline Schema

**Ubicación:** lib/offline/dexie-schema.ts. Solo se almacena localmente
lo que el usuario necesita para trabajar offline. No es un mirror
completo de la DB.

```typescript
import Dexie, { Table } from 'dexie'; export class AlquemistDB extends
Dexie { // === Datos descargados (read-only offline) ===
scheduledActivities!: Table; // Actividades del día/semana del usuario
batches!: Table; // Batches asignados al usuario o su zona
activityTemplates!: Table; // Templates con checklists y recursos
products!: Table; // Catálogo de productos (para selectors)
inventoryItems!: Table; // Stock por zona del usuario (para validar
disponibilidad) zones!: Table; // Zonas asignadas cultivars!: Table; //
Catálogo de cultivares productionPhases!: Table; // Fases por crop_type
// === Datos generados offline (write queue) === syncQueue!: Table; //
Cola de mutaciones pendientes offlinePhotos!: Table; // Fotos
comprimidas pendientes de upload constructor() { super('alquemist');
this.version(1).stores({ // Indexed fields (not all fields, just the
queried ones) scheduledActivities: 'id, batch_id, planned_date, status,
assigned_to', batches: 'id, code, zone_id, status, current_phase_id',
activityTemplates: 'id, activity_type, crop_type_id', products: 'id,
sku, name, category_id', inventoryItems: 'id, product_id, zone_id,
batch_id', zones: 'id, facility_id, name', cultivars: 'id,
crop_type_id, name', productionPhases: 'id, crop_type_id,
sort_order', // Write queues syncQueue: '++localId, timestamp, action,
status, entityType', offlinePhotos: '++localId, syncQueueId, blob,
compressedSize', }); } } export const db = new AlquemistDB();
```

Sync Queue: Estructura de Mutación

interface SyncQueueItem { localId?: number; // Auto-increment (Dexie)
timestamp: string; // ISO datetime del dispositivo action: string; //
'completeActivity' | 'createObservation' | 'receiveItem' | \...
entityType: string; // 'activity' | 'observation' |
'inventory_transaction' | \... payload: Record<string, any>; // El
body del Server Action serializado status: 'pending' | 'syncing' |
'synced' | 'failed'; retryCount: number; errorMessage?: string;
serverResponse?: Record<string, any>; // Response del server cuando se
sincroniza }

Sync Process

| **Paso** | **Detalle** |
| --- | --- |
| **1. | Serwist dispara evento 'sync' cuando detecta red. También: |
| Trigger** | al abrir la app, cada 60s si online, y manualmente con pull-to-refresh. |
| **2. Read | SELECT \* FROM syncQueue WHERE status = 'pending' ORDER BY |
| queue** | timestamp ASC (FIFO). |
| **3. | Por cada item: cambiar status a 'syncing' → llamar Server |
| Process** | Action correspondiente → si éxito: status='synced' → si error: retryCount++ y status='failed' si retryCount \>= 3. |
| **4. | Después de sincronizar la mutación padre: buscar |
| Photos** | offlinePhotos con syncQueueId → upload a Supabase Storage → actualizar URL en el registro server-side. |
| **5. | Tras sync exitoso: invalidar TanStack Query caches afectados |
| Refresh | → refetch desde server → actualizar Dexie con datos frescos. |
| local** |  |
| **6. | Si el server rechaza por conflicto (409): marcar como |
| Conflict | 'conflict' → mostrar notificación al usuario con opción de |
| check** | resolver manualmente. |
| **7. | Purgar items con status='synced' que tengan más de 7 días. |
| Cleanup** | Mantener 'failed' y 'conflict' indefinidamente para debug. |

## Pre-carga de Datos

Al iniciar sesión (y al detectar WiFi): se descargan los datos
necesarios para trabajar offline:

| **Tabla Local** | **Filtro de Descarga** | **Estimado** | **Frecuencia** |
| --- | --- | --- | --- |
| scheduledActivities | WHERE assigned_to = currentUser AND planned_date BETWEEN today AND +7days | \~100-200 registros | Cada login + cada sync |
| batches | WHERE zone_id IN (user zones) AND status = 'active' | \~20-50 registros | Cada login + cada 4h |
| activityTemplates | WHERE crop_type_id IN (active crop types) | \~20-40 registros | Cada login (raramente cambia) |
| products | ALL WHERE is_active = true | \~50-200 registros | Cada login (raramente cambia) |
| inventoryItems | WHERE zone_id IN (user zones) AND quantity_available \> 0 | \~100-500 registros | Cada sync (cambia frecuente) |
| zones | WHERE facility_id = user facility | \~5-20 registros | Cada login |
| cultivars | ALL WHERE is_active = true | \~10-50 registros | Cada login |
| productionPhases | ALL | \~20-60 registros | Cada login |

## Features de Implementación por Módulo

Cada feature especifica: Server Actions (con input/output),
validaciones, reglas de negocio, edge cases, y criterios de aceptación.
Cada feature es un ticket implementable en 2-8 horas.

## Módulo: Órdenes de Producción

### ORD-01: Crear Orden de Producción

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **createOrder(input)** | CreateOrderInput (see Zod) | INSERT production_orders + production_order_phases (one per phase in range). Returns order with phases. Status: 'draft'. |
| **calculateYieldCascade(cultivarId, | cultivar_id, phase | Returns array of {phase, |
| entryPhaseId, exitPhaseId, | IDs, quantity | input_qty, yield_pct, |
| initialQty)** |  | output_qty} by chaining phase_product_flows. Pure calculation, no DB write. |
| **getAvailablePhases(cropTypeId)** | crop_type_id | Returns production_phases ordered by sort_order with can_be_entry_point and can_be_exit_point flags. |

**Validación (Zod)**

// Validación adicional server-side (no solo Zod) 1.
entry_phase.sort_order < exit_phase.sort_order 2. Todas las fases
intermedias existen y tienen phase_product_flows 3. initial_product_id
es válido para la entry_phase (direction='in') 4. target_zones tienen
capacity >= initial_quantity 5. planned_start_date >= today

**Reglas de Negocio**

▸ Si el cultivar no tiene phase_product_flows completos para el rango
seleccionado, el yield cascade se calcula con yield_pct = 100% (sin
pérdida) y se muestra warning 'Yields no configurados — usando 100%
por defecto'

▸ Si can_skip phases existen en el rango pero el usuario las excluye,
recalcular yield cascade omitiendo esas fases

▸ El initial_product_id solo es requerido si entry_phase NO es la
primera fase del crop_type (i.e. se arranca desde trasplante con
plántulas ya compradas)

▸ Si se crean dos órdenes para la misma zona con fechas solapadas: no
bloquear, pero mostrar warning con capacidad restante

**Edge Cases**

⚠ Un cultivar sin phase_product_flows aún puede crear orden pero con
warning visible

⚠ Si entry_phase = exit_phase (orden de una sola fase, e.g. solo
processing), es válido

⚠ Si el usuario cambia el cultivar en paso 1 del wizard, los pasos 2-4
se resetean

⚠ Si hay 0 fases con can_be_entry_point, el wizard no puede avanzar del
paso 2

**Criterios de Aceptación**

✓ Gerente puede crear orden seleccionando cultivar, entry/exit phase, y
cantidad

✓ El yield cascade se calcula y muestra en tiempo real al cambiar
cantidad o fases

✓ La orden se guarda como draft sin afectar inventario ni crear batch

✓ Fases con can_skip=true se muestran como toggleable en el stepper

✓ Warning visible si zona seleccionada no tiene capacidad suficiente

### ORD-02: Aprobar Orden y Crear Batch

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **approveOrder(orderId)** | order_id | UPDATE order.status='approved'. INSERT batch con datos de la orden. INSERT batch.current_phase_id = entry_phase. UPDATE order.status='in_progress'. Returns batch. |
| **rejectOrder(orderId, | order_id, reason | UPDATE |
| reason)** |  | order.status='cancelled'. No crea batch. Registra reason en notes. |

**Reglas de Negocio**

▸ Solo órdenes en status 'draft' pueden aprobarse

▸ Al aprobar: se genera batch_code automático
({FACILITY_CODE}-{YEAR}-{SEQUENCE})

▸ El batch se vincula a la production_order via production_order_id

▸ La primera production_order_phase se marca como 'in_progress'

▸ Si la entry_phase tiene input product: se valida que hay stock
suficiente del initial_product_id en la zona. Si no hay stock: bloquear
aprobación con error 'Stock insuficiente de {product} en {zone}'

**Edge Cases**

⚠ Aprobar orden sin stock del input product: error claro con producto y
zona

⚠ Aprobar orden ya aprobada: error 409 'Orden ya aprobada'

⚠ Aprobar orden cancelada: error 400 'No se puede aprobar una orden
cancelada'

⚠ Dos managers aprueban la misma orden simultáneamente: el segundo
recibe 409

**Criterios de Aceptación**

✓ Al aprobar, el batch aparece en la lista de batches con fase actual =
entry_phase

✓ El batch_code es único y sigue el formato de la facility

✓ Si no hay stock, el botón 'Aprobar' muestra el motivo del bloqueo

✓ El batch aparece en el detalle de la orden con link directo

## Módulo: Batches

### BAT-01: Avanzar Fase de Batch

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **advancePhase(batchId, | batch_id, optional | UPDATE batch.current_phase_id |
| targetZoneId?, notes?)** | zone, notes | to next phase. If requires_zone_change: UPDATE zone_id. INSERT timeline event. UPDATE production_order_phase to 'completed'. Mark next order_phase as 'in_progress'. Returns updated batch. |

**Reglas de Negocio**

▸ Solo se puede avanzar a la fase SIGUIENTE en sort_order (no saltar
fases, excepto can_skip=true)

▸ Si la fase actual is_destructive=true: no se puede retroceder después

▸ Si la siguiente fase requires_zone_change=true: target_zone_id es
obligatorio

▸ Si hay actividades pendientes (scheduled, status='pending') en la
fase actual: warning '3 actividades pendientes no se ejecutarán.
¿Continuar?'

▸ Al avanzar: se generan las scheduled_activities de la nueva fase
(desde cultivation_schedule si existe)

▸ Si es la exit_phase: batch.status cambia a 'completed',
production_order se evalúa para completitud

**Edge Cases**

⚠ Batch ya en la última fase (exit_phase): advance completa el batch, no
avanza a fase inexistente

⚠ Batch con split children activos: ambos deben estar en la misma fase
para avanzar el parent. O avanzar independientemente.

⚠ Fase skippable no ejecutada: se salta en el stepper visual pero se
registra en timeline como 'skipped'

⚠ Avanzar fase mientras un operador está ejecutando una actividad
offline de la fase anterior: la actividad se acepta pero se marca como
'late_phase' en metadata

⚠ Si target_zone no tiene capacidad: error con capacidad actual y
disponible

**Criterios de Aceptación**

✓ El batch avanza a la siguiente fase y el stepper visual se actualiza

✓ Si la fase requiere cambio de zona, el selector de zona aparece
obligatoriamente

✓ Las actividades pendientes de la fase anterior se muestran como
warning antes de confirmar

✓ Al completar la última fase, el batch pasa a status 'completed'

### BAT-02: Split de Batch

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **splitBatch(batchId, | See | INSERT new batch (child) with |
| splitCount, | splitBatchSchema | split_count plants. UPDATE |
| targetZoneId, reason)** |  | parent batch plant_count -= split_count. INSERT batch_lineage {parent, child, operation='split', quantity}. Returns both batches. |

**Reglas de Negocio**

▸ split_count < batch.plant_count (no se puede splitear el 100%)

▸ El batch hijo hereda: cultivar_id, current_phase_id,
production_order_id

▸ El batch hijo genera nuevo código: {parent_code}-{letter} (LOT-001-A,
LOT-001-B)

▸ Las actividades pendientes del parent NO se duplican al hijo — se
crean nuevas para el hijo si hay cultivation_schedule

▸ Los costos históricos del parent NO se redistribuyen — el hijo
comienza con costo \$0 desde el momento del split

**Edge Cases**

⚠ Split de un batch que ya es hijo de un split anterior: permitido
(LOT-001-A-1), árbol crece

⚠ Split con split_count = plant_count - 1: parent queda con 1 planta ---
válido pero warning

⚠ Split de batch con actividad en ejecución offline: el split espera a
que la actividad se sincronice

⚠ Split de batch 'completed' o 'cancelled': error 400

⚠ Split de batch 'on_hold': permitido (puede ser la razón del hold ---
separar plantas enfermas)

**Criterios de Aceptación**

✓ El batch hijo aparece en la lista con referencia visual al parent

✓ El genealogy tree muestra la relación parent → child con timestamp y
razón

✓ El plant_count del parent se reduce visiblemente

✓ El costo del parent no cambia (no se redistribuye)

## Módulo: Actividades

### ACT-01: Ejecutar Actividad (Core Flow)

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **getActivityContext(scheduledActivityId)** | scheduled_activity_id | Returns: template con checklist y recursos, batch con plant_count y zone, productos disponibles en zona. Para pre-llenar el form. |
| **executeActivity(input)** | See executeActivitySchema | INSERT activity. INSERT activity_resources (one per resource). INSERT activity_checklist_results (one per item). INSERT inventory_transactions (consumption type per resource). INSERT activity_observations (if any). UPDATE scheduled_activity.status='completed'. If template.triggers_phase_change: call advancePhase(). Returns activity with all relations. |

**Validación (Zod)**

// Escalado automático de recursos const scaledQty =
template_resource.quantity_per_unit \* batch.plant_count \*
template_resource.scale_factor; // El operador ve este valor pre-llenado
pero puede override

**Reglas de Negocio**

▸ Cada recurso consumido genera un inventory_transaction
type='consumption' que resta del stock

▸ Si el template tiene triggers_phase_change=true, al completar se
avanza la fase del batch automáticamente

▸ Los checklist items con is_critical=true BLOQUEAN la completitud: el
botón 'Completar' está disabled hasta que todos los critical items
estén checked

▸ Si un checklist item tiene expected_value y tolerance: el
value_recorded se valida contra el rango. Fuera de rango = warning
visual pero no bloquea (a menos que is_critical)

▸ Las fotos se comprimen client-side a max 1200px, JPEG 80%. Se
almacenan en Supabase Storage bucket 'activity-photos'

▸ La duración se calcula automáticamente desde el inicio de la ejecución
hasta el confirm

▸ Los recursos con quantity_actual = 0 se omiten del insert (no se
registra si no se usó)

**Edge Cases**

⚠ Operador completa actividad offline → sync → pero el batch ya avanzó
de fase (otro supervisor lo hizo): aceptar la actividad pero marcarla
como 'late_phase' en metadata y notificar al supervisor

⚠ Operador no tiene stock del recurso en su zona: mostrar '0
disponible' en rojo pero permitir override con justificación (puede
haber stock no registrado)

⚠ Dos operadores ejecutan la misma scheduled_activity (duplicada por
error): el segundo intento falla con 409 'Actividad ya completada por
{user} a las {time}'

⚠ Actividad con 0 recursos y 0 checklist items: permitida (actividad de
solo observación)

⚠ Foto upload falla por tamaño: comprimir más agresivamente (800px,
60%). Si aún falla: guardar en Dexie para retry

⚠ Timer de duración se resetea si el operador sale y vuelve: no, el
timer persiste en sessionStorage/Zustand

**Criterios de Aceptación**

✓ Operador abre actividad y ve recursos pre-escalados por plant_count
del batch

✓ Items críticos bloquean el botón hasta completarse

✓ Al completar: inventario se actualiza, actividad aparece en timeline
del batch

✓ Si triggers_phase_change: el batch avanza automáticamente sin acción
adicional

✓ Funciona completo offline: datos se guardan en Dexie y sincronizan al
reconectar

✓ La duración se registra automáticamente

### ACT-02: Programar Actividades desde Schedule

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **generateScheduledActivities(batchId, | batch_id, phase_id | Lee cultivation_schedule del |
| phaseId)** |  | cultivar. Para cada template en la fase actual: genera scheduled_activities con planned_date calculada (batch.phase_start_date + schedule.start_day). Asigna a operator según zona. |
| **rescheduleActivity(scheduledActivityId, | id, new date | UPDATE planned_date. Si |
| newDate)** |  | new_date \< today: marca como 'overdue'. Registra log de reprogramación. |
| **cancelScheduledActivity(id, reason)** | id, reason | UPDATE status='cancelled'. Registra razón. No genera transacciones. |

**Reglas de Negocio**

▸ Las actividades se generan automáticamente al crear batch (si hay
cultivation_schedule) o al avanzar de fase

▸ El assigned_to se determina por: operador asignado a la zona del
batch, o round-robin si hay múltiples

▸ Actividades recurrentes (frequency='daily'): se generan para todos
los días del rango de la fase

▸ Si no hay cultivation_schedule: no se generan actividades automáticas
(solo ad-hoc manuales)

**Edge Cases**

⚠ Cultivation schedule tiene gaps (no cubre todos los días): los días
sin actividad quedan vacíos, no se rellenan

⚠ Batch cambia de zona después de generar actividades: las actividades
existentes mantienen el assigned_to original (no se redistribuyen)

⚠ Se genera una actividad para un día feriado/no laboral: no hay
concepto de feriados en v1, se genera igual

**Criterios de Aceptación**

✓ Al avanzar de fase, las actividades de la nueva fase se generan
automáticamente si hay schedule

✓ Supervisor puede reprogramar arrastrando en el calendario (desktop)

✓ Actividades vencidas aparecen con borde rojo y sección sticky en el
dashboard

## Módulo: Inventario

### INV-01: Recepción de Compras

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **receiveItem(input)** | See receiveItemSchema | INSERT inventory_item (new lot). INSERT inventory_transaction type='receipt'. Returns item with transaction. |
| **receiveBulk(items\[\])** | Array of receiveItemSchema | Transacción atómica: INSERT múltiples items + transactions. Si uno falla, rollback todo. Returns all items. |

**Reglas de Negocio**

▸ Cada recepción crea un nuevo inventory_item (lote) — nunca se suma a
un lote existente

▸ Si el producto tiene shelf_life_days: expiration_date se auto-calcula
si no se provee

▸ El cost_per_unit incluye impuestos pero no transporte (eso va a
overhead_costs)

▸ Si el producto tiene lot_tracking=false: aún se crea un item pero sin
supplier_lot

▸ El inventory_item hereda la unidad del producto pero puede recibirse
en unidad diferente (conversión automática si hay conversion_factor en
units_of_measure)

**Edge Cases**

⚠ Recibir producto que no existe en el catálogo: error 404 con link a
'Crear producto primero'

⚠ Recibir con cost_per_unit = 0: permitido (donación, muestra gratuita)
pero warning

⚠ Recibir cantidad negativa: error de validación Zod (positive())

⚠ Zona de almacenamiento no tiene propósito 'storage': warning pero
permitido

**Criterios de Aceptación**

✓ Al recibir, el stock del producto se actualiza inmediatamente en la
vista de Stock Actual

✓ El lote aparece en el detalle del producto con todos los campos del
receipt

✓ El movimiento aparece en el log de transacciones con tipo 'receipt'

### INV-02: Transformación (Cosecha Multi-Output)

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **executeTransformation(batchId, | batch_id, phase_id, | For each output: INSERT |
| phaseId, outputs\[\])** | array of {product_id, quantity, unit_id, grade} | inventory_item + INSERT inventory_transaction type='transformation_out'. Link all transactions via related_transaction_id chain. If waste: INSERT with type='waste'. Returns all new items. |

**Validación (Zod)**

// Output validation outputs.forEach(o => { const flow =
phase_product_flows.find( f => f.phase_id === phaseId && f.product_id
=== o.product_id && f.direction === 'out' ); if (!flow) throw
'Producto no configurado como output de esta fase'; // Yield check
(warning, not blocking) const expectedQty = inputQty \*
(flow.expected_yield_pct / 100); if (o.quantity < expectedQty \* 0.5)
warn('Yield muy bajo'); });

**Reglas de Negocio**

▸ La transformación consume el input y genera los outputs en una sola
transacción atómica

▸ Los outputs se determinan por phase_product_flows WHERE phase_id AND
direction='out'

▸ Cada output genera su propio inventory_item (nuevo lote de producto
cosechado)

▸ El waste es un output especial: no genera inventory_item útil pero sí
registra la cantidad perdida

▸ El yield real (output/input) se registra en
production_order_phase.yield_pct para comparar con el esperado

▸ Si la fase is_destructive=true: las plantas del batch se destruyen al
transformar (e.g. cosecha destructiva)

**Edge Cases**

⚠ Cosecha parcial (solo 50 de 100 plantas): batch.plant_count se reduce.
Las otras 50 siguen en la misma fase.

⚠ Output de un producto que no está configurado en phase_product_flows:
error estricto (no permitido, evita datos inconsistentes)

⚠ Yield real = 0% (todo waste): permitido pero alerta crítica al
supervisor y gerente

⚠ Transformación sin outputs (solo waste): permitido — registra solo
waste transactions

⚠ Transformación de batch con 0 plant_count restante: error 'Batch sin
plantas disponibles'

**Criterios de Aceptación**

✓ Al cosechar, los nuevos productos aparecen en inventario vinculados al
batch

✓ El yield real se muestra en el detalle de la orden comparado con el
esperado

✓ El waste se registra y es visible en el tab de costos del batch

✓ La timeline del batch muestra el evento de transformación con inputs y
outputs

### INV-03: Ejecutar Receta

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **scaleRecipe(recipeId, | recipe_id, | Returns array of {ingredient, |
| scaleFactor)** | scale_factor | scaled_qty, available_stock, sufficient: bool}. Pure calculation. |
| **executeRecipe(input)** | See executeRecipeSchema | INSERT recipe_execution. For each ingredient: INSERT inventory_transaction type='consumption'. For output: INSERT inventory_item + transaction type='recipe_output'. Atomic. Returns execution with transactions. |

**Reglas de Negocio**

▸ Cada ingrediente se toma de un inventory_item específico (seleccionado
por el usuario o auto-seleccionado FIFO por expiration_date)

▸ Si un ingrediente no tiene stock suficiente: scaleRecipe retorna
sufficient=false y el botón 'Ejecutar' se bloquea para ESE ingrediente
(puede seleccionar otro lote)

▸ El output de la receta genera un nuevo inventory_item del producto
resultado

▸ La receta NO modifica la receta original — solo crea un execution
log

**Edge Cases**

⚠ Ejecutar receta con ingrediente expirado: warning visible pero
permitido (el usuario decide)

⚠ scale_factor > 100: permitido pero warning 'Escala inusualmente
alta'

⚠ Receta con 0 ingredientes: error 'Receta vacía'

⚠ Dos usuarios ejecutan la misma receta simultáneamente consumiendo el
mismo lote: el segundo falla por stock insuficiente → retry con otro
lote disponible

**Criterios de Aceptación**

✓ Al escalar, cada ingrediente muestra cantidad necesaria vs stock
disponible

✓ Ingredientes sin stock se resaltan en rojo con cantidad faltante

✓ Al ejecutar, el stock se reduce y el producto resultado aparece en
inventario

✓ La execution queda vinculada al batch si se especificó

## Módulo: Calidad

### QUA-01: Ciclo Completo de Quality Test

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **createTest(input)** | See createTestSchema | INSERT quality_test status='pending'. Returns test. |
| **recordResults(input)** | See recordResultsSchema | INSERT quality_test_results (one per parameter). UPDATE quality_test status='completed', overall_passed. If !passed: INSERT alert type='quality_failed'. Returns test with results. |

**Reglas de Negocio**

▸ overall_passed se calcula automáticamente: true solo si TODOS los
parámetros con thresholds están dentro de rango

▸ Parámetros sin thresholds (informational): no afectan overall_passed

▸ Si overall_passed=false: se genera alerta automática de tipo
'quality_failed' vinculada al batch

▸ El certificado del lab (PDF) se sube a bucket 'quality-certificates'

▸ Un batch puede tener múltiples tests (uno por fase, o retests)

**Edge Cases**

⚠ Registrar resultados de un test ya completado: error 409 'Test ya
tiene resultados'

⚠ Test de un batch completado/cancelado: permitido (el test de calidad
puede ser posterior al cierre)

⚠ Todos los parámetros sin thresholds: overall_passed = true (no hay
nada que fallar)

⚠ Valor numérico como string ('12.5' vs 12.5): el schema acepta
string, la comparación con thresholds parsea a float

**Criterios de Aceptación**

✓ Al crear test, aparece en la lista de pendientes con días de espera

✓ Al registrar resultados, cada parámetro muestra verde/rojo según
thresholds

✓ Si falla, la alerta aparece en el centro de alertas y en el batch
detail

✓ El historial de calidad muestra tendencias por cultivar a lo largo del
tiempo

## Módulo: Operaciones

### OPS-01: Monitoreo Ambiental y Alertas

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **ingestReading(input)** | See sensorReadingSchema | INSERT environmental_reading. If value outside optimal range for zone's cultivar: INSERT alert type='env_out_of_range'. Broadcast via Supabase Realtime channel 'env:{zone_id}'. |
| **getZoneConditions(zoneId)** | zone_id | Returns latest reading per parameter for the zone + optimal ranges from the primary cultivar in that zone. |
| **acknowledgeAlert(alertId)** | alert_id | UPDATE alert acknowledged_at, acknowledged_by. Removes from 'pending' count. |
| **resolveAlert(alertId, | alert_id, resolution | UPDATE alert resolved_at, |
| resolution)** | text | resolved_by, resolution_notes. |

**Reglas de Negocio**

▸ ingestReading se llama desde API Route /api/webhooks/iot (recibe POST
de sensores o integraciones)

▸ El rango óptimo se determina por: cultivar principal en la zona →
optimal_conditions JSON → parámetro

▸ Si no hay cultivar en la zona (vacía): no se generan alertas de
env_out_of_range

▸ Alertas se agrupan: si ya existe una alerta activa del mismo tipo para
la misma zona, no se crea duplicada (debounce 30min)

▸ Severidad automática: 5-10% fuera de rango = 'warning', >10% =
'critical'

**Edge Cases**

⚠ Sensor envía lectura con timestamp futuro: rechazar con error 422

⚠ Sensor envía lectura duplicada (mismo sensor, mismo timestamp):
ignorar silenciosamente (idempotent)

⚠ Zona sin sensor configurado recibe lectura: error 404 'Sensor no
encontrado'

⚠ 100+ lecturas por segundo (sensor rápido): el endpoint debe ser
idempotent y rápido (<100ms). Batch inserts si es necesario.

⚠ Cultivar en zona cambia de fase con diferentes optimal_conditions por
fase: v1 usa las mismas condiciones globales del cultivar. v2 podría
tener condiciones por fase.

**Criterios de Aceptación**

✓ El panel ambiental muestra un dial por parámetro por zona con color
verde/amarillo/rojo

✓ Las alertas se generan automáticamente cuando los valores salen del
rango óptimo

✓ Las alertas no se duplican dentro de una ventana de 30 minutos

✓ El supervisor puede reconocer y resolver alertas desde el centro de
alertas

### OPS-02: Costos Overhead y COGS

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **registerOverhead(input)** | facility_id, zone_id?, cost_type, amount, currency, period_start, period_end, allocation_basis | INSERT overhead_cost. Returns cost. |
| **calculateBatchCOGS(batchId)** | batch_id | Aggregates: direct_materials (SUM inventory_transactions.cost_total WHERE batch_id AND type IN ('consumption')), labor (SUM activities.duration_minutes \* operator_rate), overhead (allocated portion). Returns breakdown: {direct, labor, overhead, total, per_plant, per_gram}. |
| **allocateOverhead(overheadCostId)** | overhead_cost_id | Calculates allocation per batch based on allocation_basis ('area_m2', 'plant_count', 'duration_days'). Returns array of {batch_id, allocated_amount}. |

**Reglas de Negocio**

▸ direct_materials = SUM de cost_total de inventory_transactions de tipo
'consumption' vinculadas al batch

▸ labor = SUM de (activity.duration_minutes / 60) \* (user.hourly_rate
or default_rate) para todas las actividades del batch

▸ overhead = SUM de allocaciones de overhead_costs proporcionales al
batch según allocation_basis

▸ per_gram solo se calcula si el batch tiene output de transformación
con peso en gramos

▸ COGS se recalcula on-demand (no cached) para reflejar siempre el
último estado de transacciones

**Edge Cases**

⚠ Batch sin actividades ni transacciones: COGS = \$0 + overhead
proporcional

⚠ Overhead con allocation_basis='area_m2' pero la zona no tiene
area_m2 configurada: excluir esa zona de la asignación y warning

⚠ Batch completado hace 6 meses: COGS aún se calcula correctamente
(datos inmutables)

⚠ Moneda del overhead != moneda de la empresa: v1 asume misma moneda. v2
con conversión.

⚠ per_gram con batch que no tiene output en gramos (e.g. solo plantas
vivas): campo = null, no 0

**Criterios de Aceptación**

✓ El COGS del batch muestra desglose claro: materiales directos, labor,
overhead

✓ La comparación costo real vs estimado de la orden está visible

✓ El costo por planta y por gramo se calculan dinámicamente

✓ Los overhead costs se distribuyen proporcionalmente y es visible qué
porcentaje asumió cada batch

## Módulo: Configuración

### CFG-01: Gestión de Crop Types y Fases

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **createCropType(input)** | See createCropTypeSchema | INSERT crop_type. Returns crop_type. |
| **createPhase(input)** | See createPhaseSchema | INSERT production_phase. Validates sort_order uniqueness within crop_type. Returns phase. |
| **reorderPhases(cropTypeId, | crop_type_id, ordered | UPDATE sort_order for each |
| phaseIds\[\])** | array of phase IDs | phase to match new order. Atomic. Validates no duplicates. |
| **setPhaseProductFlow(phaseId, | phase_id, array of | DELETE existing flows for |
| flows\[\])** | {direction, role, product_id?, category_id?, expected_yield_pct?} | phase. INSERT new flows. Atomic. Returns flows. |

**Reglas de Negocio**

▸ Al eliminar un crop_type: soft delete (is_active=false). No se
eliminan datos vinculados.

▸ Al reordenar fases: verificar que no hay production_orders activas
usando ese crop_type. Si hay: warning 'Hay X órdenes activas. Reordenar
no afecta órdenes existentes.'

▸ phase_product_flows son la fuente de verdad para transformaciones.
Cada fase debe tener al menos 1 flow de tipo 'in' y 1 de tipo 'out'
para ser parte de una cadena de producción válida.

▸ Fases sin flows son válidas (fases que no transforman producto, e.g.
'vegetative' solo consume inputs sin generar output diferente).

**Edge Cases**

⚠ Eliminar fase que está en uso por un batch activo: soft delete +
warning

⚠ Crear fase con sort_order duplicado: auto-increment para resolver o
error

⚠ Phase flow con expected_yield_pct > 100%: permitido (la fase genera
más output que input, e.g. clonación)

⚠ Phase flow sin product_id ni category_id: error, al menos uno debe
estar definido

**Criterios de Aceptación**

✓ Admin puede crear crop_type con N fases ordenables por drag-and-drop

✓ Cada fase muestra sus phase_product_flows con inputs y outputs

✓ La cadena input→output→input entre fases consecutivas se valida
visualmente

✓ Los cambios de configuración no afectan batches ya creados

### CFG-02: Gestión de Usuarios

**Server Actions**

| **Action** | **Input** | **Output / Side Effects** |
| --- | --- | --- |
| **inviteUser(email, role, | email, role, | INSERT user in Supabase Auth with |
| facilityId)** | facility_id | app_metadata {role, company_id, facility_id}. Send invite email. Returns user. |
| **updateUserRole(userId, | user_id, role | UPDATE |
| newRole)** |  | auth.users.raw_app_meta_data.role. Force token refresh. Returns user. |
| **deactivateUser(userId)** | user_id | UPDATE is_active=false. Revoke sessions. User can no longer login. Does NOT delete data. |

**Reglas de Negocio**

▸ Roles válidos: 'operator', 'supervisor', 'manager', 'admin',
'viewer'

▸ Un company solo puede tener 1-3 admins (configurable)

▸ Al cambiar rol: el token JWT actual sigue válido hasta expiración (1h
default). El nuevo rol aplica al siguiente refresh.

▸ Un admin no puede degradarse a sí mismo si es el último admin de la
company

**Edge Cases**

⚠ Invitar email que ya existe en otro company: error 'Email ya
registrado en otra organización'

⚠ Invitar email que ya existe en la misma company: error 'Usuario ya
existe' con link al perfil

⚠ Deactivar usuario con actividades asignadas pendientes: warning 'X
actividades serán reasignadas'

⚠ Último admin intenta deactivarse: error 'No puedes desactivar el
último administrador'

**Criterios de Aceptación**

✓ Admin invita usuario por email y este recibe link de registro

✓ Al cambiar rol, los permisos se actualizan en el siguiente login

✓ Usuario desactivado no puede acceder y sus actividades se reasignan

## API Routes: Webhooks y Cron Jobs

| **Endpoint** | **Method** | **Descripción** | **Detalle** | **Notas** |
| --- | --- | --- | --- | --- |
| **/api/webhooks/iot** | **POST** | Recibe lecturas de sensores IoT | Body: {sensor_serial, parameter, value, unit, timestamp}. Auth: API key en header X-API-Key (almacenada en env). Valida sensor_serial existe → mapea a sensor_id → llama ingestReading(). Response: 201 ok o 422 invalid. | Rate limit: 100 req/min per sensor. Idempotent by (sensor_id, timestamp). |
| **/api/webhooks/supabase** | **POST** | Recibe Supabase Database Webhooks | Para triggers que no se pueden hacer con RLS/triggers SQL: e.g. enviar push notification cuando se crea una alerta. Auth: webhook secret. | Verificar signature de Supabase en headers. |
| **/api/cron/overdue-check** | **GET** | Marca actividades vencidas | Ejecuta cada 1h (Vercel Cron). SELECT scheduled_activities WHERE planned_date \< NOW() AND status='pending' → UPDATE status='overdue'. Genera alerts. Auth: CRON_SECRET en query param. | Vercel Cron: cron expression en vercel.json |
| **/api/cron/stock-alerts** | **GET** | Genera alertas de stock bajo | Ejecuta cada 6h. SELECT products WHERE SUM(inventory_items.quantity_available) \< product.min_stock_threshold → INSERT alert type='low_stock'. Auth: CRON_SECRET. | Solo genera alerta si no hay una activa del mismo producto. |
| **/api/cron/expiration-check** | **GET** | Alerta de productos próximos a vencer | Ejecuta diariamente. SELECT inventory_items WHERE expiration_date BETWEEN NOW() AND NOW()+7days → INSERT alert type='expiring_soon'. Auth: CRON_SECRET. | Agrupa: '5 lotes expiran esta semana' no '1 lote expira mañana' × 5. |

## Vercel Cron Config

// vercel.json { \"crons\": [ { \"path\":
\"/api/cron/overdue-check?secret=CRON_SECRET\", \"schedule\": \"0 \* \*
\* \*\" }, { \"path\": \"/api/cron/stock-alerts?secret=CRON_SECRET\",
\"schedule\": \"0 \*/6 \* \* \*\" }, { \"path\":
\"/api/cron/expiration-check?secret=CRON_SECRET\", \"schedule\": \"0 6
\* \* \*\" } ] }

## Convenciones de Código

## Server Actions

```typescript
// lib/actions/batch.actions.ts 'use server'; import { createClient }
from '@/lib/supabase/server'; import { splitBatchSchema } from
'@/lib/validations/batch.schema'; import { revalidatePath } from
'next/cache'; export async function splitBatch(formData: FormData) {
const supabase = await createClient(); const { data: { user } } = await
supabase.auth.getUser(); if (!user) throw new Error('Unauthorized');
const role = user.app_metadata.role; if (\!['supervisor', 'manager',
'admin'].includes(role)) throw new Error('Forbidden: role ' +
role); const input = splitBatchSchema.parse({ batch_id:
formData.get('batch_id'), split_count:
Number(formData.get('split_count')), target_zone_id:
formData.get('target_zone_id'), reason: formData.get('reason'), });
// Business logic here via Drizzle\... revalidatePath('/batches');
return { success: true, childBatch }; }
```

## Naming Conventions

| **Contexto** | **Convención y Ejemplos** |
| --- | --- |
| **Archivos** | kebab-case: batch-detail.tsx, order.schema.ts, use-batch.ts |
| **Componentes** | PascalCase: BatchDetail, OrderWizard, StatCard |
| **Server Actions** | camelCase verbo + sustantivo: createOrder, splitBatch, executeActivity |
| **Zod schemas** | camelCase + Schema: createBatchSchema, executeActivitySchema |
| **DB tables** | snake_case plural: batches, inventory_items, production_orders |
| **DB columns** | snake_case: plant_count, created_at, company_id |
| **Drizzle schema** | camelCase: batches, inventoryItems (auto-mapped from snake) |
| **CSS/Tailwind** | Brand tokens: brand, brand-light, brand-dark, surface, border |
| **Routes** | kebab-case: /batches/\[id\]/split, /activities/\[id\]/execute |
| **Environment** | SCREAMING_SNAKE: NEXT_PUBLIC_SUPABASE_URL, CRON_SECRET |

## Error Handling Pattern

```typescript
// lib/utils/errors.ts export class AppError extends Error {
constructor( message: string, public code: 'VALIDATION' |
'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INTERNAL', public
status: number = 500, public details?: Record<string, any> ) {
super(message); } } // Usage in Server Actions: throw new
AppError('Batch ya completado', 'CONFLICT', 409); throw new
AppError('Stock insuficiente', 'VALIDATION', 422, { product:
'Fertilizante NPK', available: 5, requested: 10 }); // Client-side
handling: const [error, setError] = useState<string | null>(null);
const result = await splitBatch(formData); if (result.error) { if
(result.error.code === 'CONFLICT')
toast.warning(result.error.message); else
toast.error(result.error.message); }
```

## Optimistic Updates Pattern

```typescript
// Para acciones frecuentes (completar actividad): const queryClient =
useQueryClient(); async function completeActivity(id: string) { // 1.
Optimistic update queryClient.setQueryData(['activities',
'today'], (old) => old.map(a => a.id === id ? { \...a, status:
'completed' } : a) ); // 2. Server call try { await
executeActivity(formData); } catch (error) { // 3. Rollback on failure
queryClient.invalidateQueries(['activities', 'today']);
toast.error('Error al completar actividad'); } } // Para modo offline:
la mutación se encola en Dexie // y el optimistic update se aplica
igualmente. // Al reconectar, sync queue procesa y confirma o rollback.

```