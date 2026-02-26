# Detalle de Batch de Producción

## Metadata

- **Ruta**: `/production/batches/[id]`
- **Roles con acceso**: admin (lectura + todas las acciones), manager (lectura + todas las acciones), supervisor (lectura + transición de fase + split), operator (lectura + registrar datos), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para datos base, Client Components para acciones, timeline y tabs interactivos)
- **Edge Functions**: `transition-phase` — avanza el batch a la siguiente fase; `split-batch` — separa plantas en un batch hijo; `merge-batch` — reunifica batches; `execute-harvest` — cosecha multi-output con transformación de inventario

## Objetivo

**Centro del sistema.** El batch es el nexo que conecta los 9 dominios de Alquemist. Esta página es el punto de operación principal donde supervisores y managers monitorean y gestionan la producción activa de un lote.

Desde aquí se ejecutan las operaciones críticas del ciclo productivo:
- **Transición de fase**: mover el batch a la siguiente fase (ej: vegetativo → floración)
- **Split**: separar plantas problemáticas en un batch hijo para tratamiento independiente (Flujo 4)
- **Merge**: reunificar batches hijos recuperados con el batch padre
- **Cosecha**: operación multi-output que destruye input y genera productos nuevos (Flujo 3)
- **Monitoreo**: ver actividades ejecutadas, transacciones de inventario, tests de calidad y documentos regulatorios

El batch no se crea ni edita desde esta página — se crea al aprobar una orden (PRD 23) y sus datos base son inmutables. Las operaciones cambian su estado, fase y contenido.

Usuarios principales: supervisores que gestionan la producción diaria, managers que monitorean progreso y costos.

## Tablas del modelo involucradas

| Tabla                    | Operaciones | Notas                                                                                       |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------- |
| batches                  | R/W         | Lectura detalle + update via Edge Functions (fase, status, zone, yields). RLS Pattern 2     |
| batch_lineage            | R/W         | Historial de splits/merges. Write via Edge Functions                                        |
| cultivars                | R           | Datos del cultivar (nombre, optimal_conditions, phase_durations)                            |
| crop_types               | R           | Tipo de cultivo                                                                             |
| production_phases        | R           | Fases del cultivar, sort_order, nombres                                                     |
| phase_product_flows      | R           | Yields esperados por fase del cultivar                                                      |
| production_orders        | R           | Orden que generó el batch (link)                                                            |
| production_order_phases  | R           | Progreso de fases de la orden                                                               |
| zones                    | R           | Zona actual y zonas disponibles para transición                                             |
| facilities               | R           | Facility de la zona                                                                         |
| products                 | R           | Producto actual del batch y productos de transformación                                     |
| units_of_measure         | R           | Unidades                                                                                    |
| users                    | R           | Responsables de actividades y operaciones                                                   |
| scheduled_activities     | R           | Actividades programadas del batch                                                           |
| activities               | R           | Actividades ejecutadas del batch                                                            |
| activity_resources       | R           | Recursos consumidos por actividad                                                           |
| activity_observations    | R           | Observaciones de campo por actividad                                                        |
| inventory_transactions   | R           | Transacciones de inventario del batch (costos, consumos, transformaciones)                  |
| inventory_items          | R           | Items de inventario relacionados                                                            |
| quality_tests            | R           | Tests de calidad del batch                                                                  |
| quality_test_results     | R           | Resultados de tests                                                                         |
| regulatory_documents     | R           | Documentos regulatorios del batch                                                           |
| sensors                  | R           | Sensores en la zona del batch                                                               |
| environmental_readings   | R           | Lecturas ambientales de la zona                                                             |

## ENUMs utilizados

| ENUM               | Valores                                                         | Tabla.campo                       |
| ------------------ | --------------------------------------------------------------- | --------------------------------- |
| batch_status       | active \| phase_transition \| completed \| cancelled \| on_hold | batches.status                    |
| lineage_operation  | split \| merge                                                  | batch_lineage.operation           |
| order_phase_status | pending \| ready \| in_progress \| completed \| skipped         | production_order_phases.status    |
| order_status       | draft \| approved \| in_progress \| completed \| cancelled      | production_orders.status          |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Producción > Batches > {code})
  - Título: código del batch (ej: LOT-GELATO-260301)
  - Badges: status (con color), fase actual, zona actual
  - Subtítulo: cultivar name + crop_type name
  - Acciones en header (según status y rol):
    - Status=active, admin/manager/supervisor: botón "Transición de fase" (variant="primary") + dropdown "Más acciones" (Split, Poner en espera, Cancelar)
    - Status=active + fase=cosecha, admin/manager/supervisor: botón "Ejecutar cosecha" (variant="primary") — reemplaza "Transición de fase" porque la cosecha tiene flujo especial
    - Status=phase_transition: badge informativo "En transición — esperando confirmación"
    - Status=on_hold, admin/manager: botón "Reactivar" (variant="primary")
    - Status=completed/cancelled: sin acciones
- **Sección: Información general** — Card con datos principales
  - Cultivar (con código)
  - Fase actual (badge) + zona actual
  - Plantas: {plant_count} (área: {area_m2} m² si aplica)
  - Producto actual
  - Fecha inicio → fecha fin esperada
  - Días en producción (calculado)
  - Orden de producción (link a `/production/orders/{orderId}`)
  - Batch padre (link, si es resultado de split)
  - Costo acumulado (formateado con moneda, oculto si `features_enabled.cost_tracking = false`)
  - Yield húmedo / seco (si aplica, post-cosecha)
- **Sección: Timeline de fases** — Componente visual tipo stepper
  - Muestra todas las fases desde la orden de producción
  - Cada fase: nombre, status badge, fechas planificadas vs reales, yield% real vs esperado
  - Fase actual highlighted
  - Progreso visual: barra de progreso general
- **Sección: Tabs de detalle** — Tabs para organizar información cross-domain
  - **Tab: Actividades** — Actividades programadas y ejecutadas
    - Sub-tab "Programadas": tabla de scheduled_activities con status, fecha, template
    - Sub-tab "Ejecutadas": tabla de activities con fecha, tipo, duración, operario, observaciones (count)
    - Paginación por sub-tab
  - **Tab: Inventario** — Transacciones de inventario del batch
    - Tabla de inventory_transactions filtrada por batch_id
    - Columnas: Fecha, Tipo (badge), Producto, Cantidad, Unidad, Costo, Actividad (link), Usuario
    - Tipos con badge de color: receipt=verde, consumption=naranja, application=azul, transformation_out=rojo, transformation_in=verde, waste=gris, adjustment=amarillo
    - Resumen de costos al inicio: costo directo total (sum transaction costs) + costo overhead (si feature flag)
  - **Tab: Calidad** — Tests de calidad
    - Tabla de quality_tests del batch
    - Columnas: Tipo, Fase, Lab, Fecha muestra, Fecha resultado, Status (badge), Resultado (pass/fail badge)
    - Click en test expande para ver quality_test_results individuales
  - **Tab: Regulatorio** — Documentos regulatorios
    - Lista de regulatory_documents donde batch_id = este batch
    - Columnas: Tipo documento, Número, Fecha emisión, Fecha vencimiento, Status (badge), Archivo (link descarga)
    - Indicador de compliance: documentos requeridos vs capturados (usa product_regulatory_requirements del producto actual)
  - **Tab: Genealogía** — Split/merge history
    - Tabla de batch_lineage (tanto como parent como child)
    - Columnas: Operación (split/merge badge), Batch origen, Batch destino, Cantidad, Razón, Realizado por, Fecha
    - Links a batches relacionados
    - Árbol visual de genealogía si hay múltiples niveles
  - **Tab: Ambiente** — Condiciones ambientales de la zona
    - Gráficos de environmental_readings de la zona actual (últimas 24h, 7d, 30d)
    - Parámetros: temperatura, humedad, CO2, luz, VPD
    - Comparación con optimal_conditions del cultivar (líneas de referencia en gráficos)
    - Lista de sensores activos en la zona
- **Dialog: Transición de fase** — Modal para avanzar a siguiente fase
  - Info: fase actual → siguiente fase (auto-determinada por sort_order)
  - Select: Nueva zona (opt, pre-llenada si la order_phase tiene zone_id asignada)
  - Input: Cantidad de plantas/producto que pasan (req, default=plant_count actual)
  - Input: Notas (opt)
  - Botón "Confirmar transición" (variant="primary")
- **Dialog: Split de batch** — Modal para separar plantas
  - Info: batch actual con plant_count
  - Input: Cantidad a separar (req, number, max=plant_count-1, min=1)
  - Select: Zona destino para batch hijo (opt, default=misma zona)
  - Input: Razón del split (req, textarea) — ej: "10 plantas con deficiencia de Ca"
  - Botón "Separar plantas" (variant="primary")
- **Dialog: Merge de batches** — Modal para reunificar
  - Select: Batch a reunificar (lista de batches hijos de este padre, o este batch es hijo y se muestra el padre)
  - Info: datos del batch seleccionado (plantas, fase, zona)
  - Validación: ambos batches deben estar en la misma fase
  - Input: Razón del merge (req, textarea)
  - Botón "Reunificar batches" (variant="primary")
- **Dialog: Ejecutar cosecha** — Modal multi-step para cosecha (Flujo 3)
  - **Paso 1: Datos de cosecha**
    - Input: Peso húmedo total (req, number, kg)
    - Input: Peso trim húmedo (opt, number, kg)
    - Input: Peso desperdicio (opt, number, kg)
    - Select: Zona destino (req) — zona de secado
    - Input: Notas (opt)
  - **Paso 2: Confirmar**
    - Resumen de outputs que se generarán:
      - Producto primario: WET-{CULTIVAR} — {peso_húmedo} kg
      - Producto secundario: TRIM-WET-{CULTIVAR} — {peso_trim} kg (si aplica)
      - Desperdicio: {peso_desperdicio} kg
    - Input: Plantas cosechadas (default=plant_count, editable para cosecha parcial)
    - Checkbox: "Confirmo los datos de cosecha"
    - Botón "Ejecutar cosecha" (variant="primary")
- **Dialog: Poner en espera / Reactivar** — Modal simple
  - Input: Razón (req para poner en espera)
  - Botón "Poner en espera" / "Reactivar"
- **Dialog: Cancelar batch** — Modal con advertencia
  - Advertencia: "Cancelar el batch es irreversible. Las actividades programadas se cancelarán."
  - Input: Razón (req)
  - Botón "Cancelar batch" (variant="destructive")

**Responsive**: Layout de información general en una columna en móvil. Tabs con scroll horizontal. Timeline vertical en móvil. Dialogs full-screen en móvil.

## Requisitos funcionales

### Lectura

- **RF-01**: Al cargar la página, obtener el batch completo via Server Component:
  ```
  supabase.from('batches')
    .select(`
      *,
      cultivar:cultivars(id, name, code, crop_type:crop_types(id, name), optimal_conditions, phase_durations),
      phase:production_phases!current_phase_id(id, name, sort_order),
      zone:zones(id, name, facility:facilities(id, name)),
      product:products!current_product_id(id, name, sku),
      order:production_orders(id, code, status, priority, planned_start_date, planned_end_date),
      parent:batches!parent_batch_id(id, code, status),
      source_item:inventory_items!source_inventory_item_id(id, batch_number, product:products(name))
    `)
    .eq('id', batchId)
    .single()
  ```
- **RF-02**: Cargar fases de la orden asociada (para timeline):
  ```
  supabase.from('production_order_phases')
    .select('*, phase:production_phases(id, name, sort_order), zone:zones(id, name)')
    .eq('order_id', batch.production_order_id)
    .order('sort_order')
  ```
- **RF-03**: Cargar datos de cada tab bajo demanda (lazy loading al activar el tab):
  - **Actividades programadas**: `supabase.from('scheduled_activities').select('*, template:activity_templates(name, code, activity_type:activity_types(name))').eq('batch_id', batchId).order('planned_date')` con paginación
  - **Actividades ejecutadas**: `supabase.from('activities').select('*, template:activity_templates(name), type:activity_types(name), user:users!performed_by(full_name), phase:production_phases(name), observations:activity_observations(count)').eq('batch_id', batchId).order('performed_at', { ascending: false })` con paginación
  - **Transacciones de inventario**: `supabase.from('inventory_transactions').select('*, item:inventory_items(batch_number, product:products(name, sku)), unit:units_of_measure(code), user:users(full_name), activity:activities(id)').eq('batch_id', batchId).order('timestamp', { ascending: false })` con paginación
  - **Tests de calidad**: `supabase.from('quality_tests').select('*, phase:production_phases(name), results:quality_test_results(*)').eq('batch_id', batchId).order('sample_date', { ascending: false })`
  - **Documentos regulatorios**: `supabase.from('regulatory_documents').select('*, doc_type:regulatory_doc_types(name, code, category)').eq('batch_id', batchId).order('issue_date', { ascending: false })`
  - **Genealogía**: `supabase.from('batch_lineage').select('*, parent:batches!parent_batch_id(id, code, status, plant_count), child:batches!child_batch_id(id, code, status, plant_count), unit:units_of_measure(code), user:users!performed_by(full_name)').or('parent_batch_id.eq.${batchId},child_batch_id.eq.${batchId}').order('performed_at', { ascending: false })`
  - **Ambiente**: `supabase.from('environmental_readings').select('*').eq('zone_id', batch.zone_id).gte('timestamp', since).order('timestamp')` + `supabase.from('sensors').select('*').eq('zone_id', batch.zone_id).eq('is_active', true)`

### Transición de fase

- **RF-04**: Al confirmar transición, invocar Edge Function `transition-phase`:
  ```
  POST /functions/v1/transition-phase
  {
    batch_id: UUID,
    new_zone_id: UUID | null,
    quantity: number,
    notes: string | null
  }
  ```
  La Edge Function ejecuta transaccionalmente:
  1. Validar que el batch está en status=active
  2. Determinar siguiente fase via `production_order_phases` (siguiente sort_order con status != skipped)
  3. Actualizar `batches`: current_phase_id → nueva fase, zone_id → new_zone_id (si se provee), status='active' (de vuelta si estaba en phase_transition)
  4. Actualizar `production_order_phases` de la fase anterior: status='completed', actual_end_date=today, output_quantity=quantity
  5. Actualizar `production_order_phases` de la nueva fase: status='in_progress', actual_start_date=today, input_quantity=quantity
  6. Si es la última fase y se completa → batch status='completed', order status='completed'
  7. Retorna: `{ new_phase_name, batch_status }`
- **RF-05**: Tras transición exitosa, toast "Batch avanzó a fase {nombre}" + invalidar caches
- **RF-06**: La siguiente fase se determina automáticamente — no es seleccionable por el usuario

### Split de batch

- **RF-07**: Al confirmar split, invocar Edge Function `split-batch`:
  ```
  POST /functions/v1/split-batch
  {
    parent_batch_id: UUID,
    quantity: number,
    zone_id: UUID | null,
    reason: string
  }
  ```
  La Edge Function ejecuta transaccionalmente:
  1. Validar que el batch padre está en status=active
  2. Validar que quantity < parent.plant_count
  3. Crear nuevo batch hijo: cultivar_id, current_phase_id, zone_id (heredado o nuevo), parent_batch_id, production_order_id (heredado), status='active', code="{parent_code}-{letter}" (ej: LOT-001-B), plant_count=quantity
  4. Actualizar batch padre: plant_count -= quantity
  5. Crear registro en batch_lineage: operation='split', parent, child, quantity, reason, user
  6. Retorna: `{ child_batch_id, child_batch_code }`
- **RF-08**: Tras split exitoso, toast "Batch {child_code} creado con {N} plantas" + opción de navegar al nuevo batch

### Merge de batches

- **RF-09**: Al confirmar merge, invocar Edge Function `merge-batch`:
  ```
  POST /functions/v1/merge-batch
  {
    parent_batch_id: UUID,
    child_batch_id: UUID,
    reason: string
  }
  ```
  La Edge Function ejecuta transaccionalmente:
  1. Validar que ambos batches están en status=active y en la misma current_phase_id
  2. Actualizar batch padre: plant_count += child.plant_count
  3. Actualizar batch hijo: status='completed'
  4. Crear registro en batch_lineage: operation='merge', parent, child, quantity=child.plant_count, reason, user
  5. Retorna: `{ merged_plant_count }`
- **RF-10**: Tras merge exitoso, toast "Batch {child_code} reunificado. Total: {N} plantas"

### Cosecha (execute-harvest)

- **RF-11**: Al confirmar cosecha, invocar Edge Function `execute-harvest`:
  ```
  POST /functions/v1/execute-harvest
  {
    batch_id: UUID,
    wet_weight_kg: number,
    trim_weight_kg: number | null,
    waste_weight_kg: number | null,
    destination_zone_id: UUID,
    plants_harvested: number,
    notes: string | null
  }
  ```
  La Edge Function ejecuta transaccionalmente (Flujo 3):
  1. Validar que el batch está en fase de cosecha (via phase_product_flows del cultivar)
  2. Crear inventory_transaction type='transformation_out' para el producto actual del batch
  3. Crear nuevo inventory_item + transaction type='transformation_in' para producto primario (flor húmeda)
  4. Si trim_weight_kg > 0: crear inventory_item + transaction para producto secundario (trim)
  5. Si waste_weight_kg > 0: crear transaction type='waste'
  6. Actualizar batch: yield_wet_kg, current_phase_id → siguiente fase (secado), zone_id → destination_zone_id, current_product_id → producto húmedo
  7. Actualizar production_order_phase de cosecha: status='completed', output_quantity, yield_pct
  8. Crear quality_test con status='pending' si el cultivar lo requiere
  9. Retorna: `{ items_created, next_phase_name, quality_test_id }`
- **RF-12**: Tras cosecha exitosa, toast "Cosecha registrada: {peso}kg. Batch avanzó a {fase}" + invalidar caches

### Poner en espera / Reactivar

- **RF-13**: Poner en espera: `supabase.from('batches').update({ status: 'on_hold' }).eq('id', batchId)`. Solo admin/manager. Registrar razón en notas o campo adicional
- **RF-14**: Reactivar: `supabase.from('batches').update({ status: 'active' }).eq('id', batchId)`. Solo admin/manager

### Cancelar batch

- **RF-15**: Cancelar: `supabase.from('batches').update({ status: 'cancelled' }).eq('id', batchId)`. Solo admin/manager. Las scheduled_activities pendientes se marcan como skipped (via trigger o en la misma operación)

### Datos calculados

- **RF-16**: Días en producción: `Math.ceil((today - start_date) / (1000 * 60 * 60 * 24))`
- **RF-17**: Costo acumulado: se lee de `batches.total_cost` (calculado por trigger `trg_batch_cost_update`)
- **RF-18**: Progreso de fases: basado en production_order_phases del order asociado
- **RF-19**: Compliance regulatorio: comparar `product_regulatory_requirements` del producto actual con `regulatory_documents` existentes del batch

### Navegación

- **RF-20**: Click en orden navega a `/production/orders/{orderId}` (PRD 23)
- **RF-21**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-22**: Click en batch padre/hijo navega a `/production/batches/{batchId}` (recursivo)
- **RF-23**: Botón "Volver a batches" navega a `/production/batches` (PRD 24)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — batch hereda aislamiento vía `zone_id → facilities.company_id`. Se usa `get_my_zone_ids()` para queries
- **RNF-02**: Todas las operaciones de escritura se ejecutan via Edge Functions transaccionales — nunca operaciones parciales
- **RNF-03**: Los tabs se cargan bajo demanda (lazy loading) para no sobrecargar la carga inicial
- **RNF-04**: Las transacciones de inventario son append-only — nunca se editan ni borran desde esta página
- **RNF-05**: El costo acumulado se oculta si la empresa no tiene `features_enabled.cost_tracking`
- **RNF-06**: Los gráficos ambientales requieren aggregation server-side para periodos largos (>24h: promedios por hora; >7d: promedios por 4h)
- **RNF-07**: La genealogía de batches se consulta solo para el nivel inmediato (parent/children) — no recursivo profundo
- **RNF-08**: Paginación server-side en todas las tablas de tabs (20 items por página default)

## Flujos principales

### Happy path — Transición de fase (vegetativo → floración)

1. Supervisor navega a `/production/batches/LOT-GELATO-260301` (status=active, fase=vegetativo)
2. Header muestra: badge verde "Activo", badge "Vegetativo", badge "Sala Veg A"
3. Timeline: Germinación ✓ → Propagación ✓ → **Vegetativo** (actual) → Floración → Cosecha → Secado → Empaque
4. Click "Transición de fase" → dialog muestra: "Vegetativo → Floración"
5. Selecciona zona: "Sala Floración A"
6. Plantas: 42 (default)
7. Click "Confirmar transición" → botón loading
8. Edge Function actualiza fase → toast "Batch avanzó a fase Floración"
9. Página se actualiza: badge "Floración", badge "Sala Floración A", timeline avanza

### Split de batch (Flujo 4)

1. Supervisor detecta 8 plantas con deficiencia severa
2. Click dropdown "Más acciones" → "Split"
3. Dialog: batch actual tiene 42 plantas
4. Cantidad a separar: 8
5. Zona destino: "Sala Veg A" (misma)
6. Razón: "8 plantas con deficiencia severa de calcio, requieren tratamiento intensivo"
7. Click "Separar plantas" → botón loading
8. Edge Function crea LOT-GELATO-260301-B con 8 plantas
9. Toast: "Batch LOT-GELATO-260301-B creado con 8 plantas"
10. Página se actualiza: plant_count=34. Tab Genealogía muestra el split

### Cosecha multi-output (Flujo 3)

1. Batch en fase cosecha, 42 plantas
2. Click "Ejecutar cosecha" → dialog multi-step
3. Paso 1: peso húmedo=21kg, trim=8.4kg, desperdicio=12kg, zona destino="Sala Secado"
4. Paso 2: confirma outputs: WET-GELATO 21kg, TRIM-WET-GELATO 8.4kg, waste 12kg. Plantas: 42
5. Click "Ejecutar cosecha" → botón loading
6. Edge Function crea items de inventario, transactions, avanza fase a secado
7. Toast: "Cosecha registrada: 21kg flor húmeda. Batch avanzó a Secado"
8. Página: fase=secado, zona=Sala Secado, yield_wet_kg=21, tab Inventario muestra transacciones

### Merge de batches recuperados

1. Supervisor navega al batch padre LOT-GELATO-260301 (34 plantas, floración)
2. Tab Genealogía muestra: split → LOT-GELATO-260301-B (8 plantas, floración, recovered)
3. Click dropdown → "Merge"
4. Dialog: selecciona LOT-GELATO-260301-B para reunificar
5. Validación: ambos en fase floración ✓
6. Razón: "Plantas recuperadas, tratamiento exitoso"
7. Click "Reunificar" → Edge Function → plant_count=42 de nuevo
8. Toast: "Batch LOT-GELATO-260301-B reunificado. Total: 42 plantas"

### Ver actividades y transacciones

1. Click tab "Actividades" → sub-tab "Ejecutadas"
2. Tabla: FERT-VEG-S1 (día 35, 30min, operario Juan, 2 obs), MONITOR-FITOSAN (día 38, 60min, agr. María, 3 obs)
3. Click tab "Inventario"
4. Tabla: consumption Ca(NO₃)₂ -168g $12, consumption KNO₃ -85g $8, application Acaricida -400mL $25...
5. Resumen: costo directo total $1,245

### Ver calidad y regulatorio

1. Click tab "Calidad"
2. Tabla: potency test (cosecha, ChemHistory Labs, pending), contaminants test (secado, completed, pass ✓)
3. Click en potency test → expande: THC 23.5% (pass), CBD 0.8%, Limonene 12mg/g
4. Click tab "Regulatorio"
5. Tabla: CoA (pending), Ficha técnica (valid ✓), Certificado orgánico (valid, vence en 30d ⚠️)
6. Compliance: 2 de 3 documentos capturados (67%)

### Vista solo lectura (operator/viewer)

1. Navega al detalle del batch
2. Ve toda la información, tabs, timeline
3. No ve botones de acción (transición, split, merge, cosecha)
4. Puede navegar a orden, zonas, batches relacionados

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                          |
| ------- | ------------------------------------------------------------------------------------ |
| loading | Skeleton de header y secciones                                                       |
| loaded  | Todas las secciones con datos, tabs lazy-loaded                                      |
| error   | Error al cargar — "Error al cargar el batch. Intenta nuevamente" + botón reintentar  |
| 404     | Batch no encontrado — "Batch no encontrado" + link a volver al listado               |

### Estados de UI — Dialogs de acción

| Estado     | Descripción                                         |
| ---------- | --------------------------------------------------- |
| idle       | Campos listos, validaciones activas                 |
| submitting | Botón loading, campos disabled                      |
| success    | Dialog cierra, toast éxito, página se actualiza     |
| error      | Toast error, dialog permanece abierto               |

### Validaciones de dialogs

**Transición de fase:**
```
new_zone_id: z.string().uuid().optional().nullable()
quantity: z.number().int().positive('Debe ser mayor a 0').max(batch.plant_count)
notes: z.string().max(2000).optional().or(z.literal(''))
```

**Split:**
```
quantity: z.number().int().positive('Debe ser al menos 1 planta').max(batch.plant_count - 1, 'Debe quedar al menos 1 planta en el batch original')
zone_id: z.string().uuid().optional().nullable()
reason: z.string().min(1, 'La razón es requerida').max(2000)
```

**Merge:**
```
child_batch_id: z.string().uuid('Selecciona un batch para reunificar')
reason: z.string().min(1, 'La razón es requerida').max(2000)
```

**Cosecha:**
```
wet_weight_kg: z.number().positive('El peso debe ser mayor a 0')
trim_weight_kg: z.number().nonnegative().optional().nullable()
waste_weight_kg: z.number().nonnegative().optional().nullable()
destination_zone_id: z.string().uuid('Selecciona una zona destino')
plants_harvested: z.number().int().positive().max(batch.plant_count)
notes: z.string().max(2000).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                              | Mensaje al usuario                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| Batch no encontrado                    | "Batch no encontrado" (page-level 404)                                            |
| Batch no activo para transición        | "El batch debe estar activo para cambiar de fase" (toast)                         |
| No hay siguiente fase                  | "El batch está en la última fase. Use cosecha o complete manualmente" (toast)     |
| Split: cantidad >= plant_count         | "Debe quedar al menos 1 planta en el batch original" (inline)                    |
| Split: batch no activo                 | "Solo se pueden separar batches activos" (toast)                                  |
| Merge: fases diferentes                | "Los batches deben estar en la misma fase para reunificarse" (toast)              |
| Merge: batch no activo                 | "Ambos batches deben estar activos" (toast)                                       |
| Cosecha: batch no en fase de cosecha   | "El batch no está en fase de cosecha" (toast)                                     |
| Cosecha: peso <= 0                     | "El peso debe ser mayor a 0" (inline)                                             |
| Error en Edge Function                 | "Error al ejecutar la operación. Intenta nuevamente" (toast)                      |
| Permiso denegado (RLS)                 | "No tienes permisos para ejecutar esta acción" (toast)                            |
| Error de red                           | "Error de conexión. Intenta nuevamente" (toast)                                   |

## Dependencias

- **Páginas relacionadas**:
  - `/production/orders/[id]` — detalle de la orden que generó el batch (PRD 23)
  - `/production/batches` — listado de batches (PRD 24)
  - `/production/batches/[id]` — detalle de batch padre/hijo (recursivo)
  - `/areas/zones/[id]` — detalle de zona actual (PRD 16)
  - `/activities/*` — páginas de actividades (Fase 5)
  - `/quality/*` — páginas de calidad (Fase 5)
  - `/regulatory/*` — páginas de regulatorio (Fase 5)
- **Edge Functions**:
  - `transition-phase` — transición de fase transaccional
  - `split-batch` — separación de batch con trazabilidad
  - `merge-batch` — reunificación de batches
  - `execute-harvest` — cosecha multi-output con transformación de inventario
- **Funciones SQL**:
  - `transition_batch_phase(batch_id, new_zone_id, quantity)` — lógica atómica
  - `split_batch(parent_id, quantity, zone_id, reason)` — lógica atómica
  - `merge_batches(parent_id, child_id, reason)` — lógica atómica
  - `execute_harvest(batch_id, wet_kg, trim_kg, waste_kg, zone_id, plants)` — lógica atómica
  - `check_batch_compliance(batch_id)` — verificación regulatoria
  - `calculate_batch_cogs(batch_id)` — costo total incluyendo overhead
- **Settings**: `companies.settings.features_enabled.cost_tracking` — controla visibilidad de costos
- **Supabase client**: PostgREST para lecturas + Edge Functions para operaciones
- **React Query**: Cache keys `['batches', batchId]`, `['batch-phases', orderId]`, `['batch-activities', batchId]`, `['batch-transactions', batchId]`, `['batch-quality-tests', batchId]`, `['batch-regulatory-docs', batchId]`, `['batch-lineage', batchId]`, `['zone-environment', zoneId]`
