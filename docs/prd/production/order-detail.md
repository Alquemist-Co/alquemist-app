# Detalle de Orden de Producción

## Metadata

- **Ruta**: `/production/orders/[id]`
- **Roles con acceso**: admin (lectura + aprobar/cancelar), manager (lectura + aprobar/cancelar), supervisor (lectura + iniciar fases), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para datos de orden, Client Components para acciones y timeline interactivo)
- **Edge Functions**: `approve-production-order` — crea batch, genera scheduled_activities desde cultivation_schedule, actualiza status

## Objetivo

Página de detalle de una orden de producción. Muestra toda la información de la orden, el timeline visual de fases con su progreso, el rendimiento esperado vs real, y las acciones clave del ciclo de vida: **aprobar** (genera batch y programa actividades), **cancelar**, y navegar al batch generado.

La aprobación es la acción más importante — transforma una planificación (orden en borrador) en ejecución real (batch activo con actividades programadas). Implementa el paso 2 del Flujo 1 del data model.

Usuarios principales: managers que aprueban órdenes, supervisores que monitorean progreso de fases.

## Tablas del modelo involucradas

| Tabla                   | Operaciones | Notas                                                                                             |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| production_orders       | R/W         | Lectura de detalle + update status (aprobar/cancelar). RLS Pattern 1                              |
| production_order_phases | R/W         | Timeline de fases. Update de zone_id y dates durante ejecución                                    |
| cultivars               | R           | Nombre y datos del cultivar                                                                       |
| crop_types              | R           | Nombre del tipo de cultivo                                                                        |
| production_phases       | R           | Nombres de fases, sort_order                                                                      |
| phase_product_flows     | R           | Rendimiento esperado por fase del cultivar                                                        |
| products                | R           | Producto inicial y productos esperados por fase                                                   |
| units_of_measure        | R           | Unidades                                                                                          |
| zones                   | R           | Zonas asignadas por fase                                                                          |
| facilities              | R           | Facility de la zona (via zone)                                                                    |
| users                   | R           | Responsable asignado, usuario que aprobó                                                          |
| batches                 | R           | Batch generado al aprobar (link)                                                                  |
| cultivation_schedules   | R           | Para mostrar qué schedule se usará al aprobar                                                     |
| scheduled_activities    | R           | Actividades programadas del batch (post-aprobación)                                               |

## ENUMs utilizados

| ENUM               | Valores                                                    | Tabla.campo                    |
| ------------------ | ---------------------------------------------------------- | ------------------------------ |
| order_status       | draft \| approved \| in_progress \| completed \| cancelled | production_orders.status       |
| order_priority     | low \| normal \| high \| urgent                            | production_orders.priority     |
| order_phase_status | pending \| ready \| in_progress \| completed \| skipped    | production_order_phases.status |
| batch_status       | active \| phase_transition \| completed \| cancelled \| on_hold | batches.status             |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Producción > Órdenes > {code}) + badge de estado + badge de prioridad
  - Título: código de la orden (ej: OP-2026-001)
  - Subtítulo: cultivar name + crop_type name
  - Acciones en header (según status y rol):
    - Status=draft, admin/manager: botón "Aprobar orden" (variant="primary") + botón "Cancelar" (variant="destructive")
    - Status=draft, supervisor: sin acciones (solo lectura)
    - Status=approved/in_progress: botón "Cancelar" (variant="destructive", solo admin/manager, con advertencia si hay batch activo)
    - Status=completed/cancelled: sin acciones
- **Sección: Información general** — Card con datos principales
  - Cultivar (link a settings/cultivars si existe)
  - Fase de entrada → Fase de salida
  - Cantidad inicial + unidad + producto inicial
  - Output esperado + producto final
  - Fecha planificada inicio → fin
  - Prioridad (badge con color)
  - Responsable asignado
  - Notas
  - Batch generado (link a `/production/batches/{batchId}`, visible solo si existe)
  - Fechas de creación y última actualización
- **Sección: Timeline de fases** — Componente visual tipo stepper horizontal/vertical
  - Cada fase muestra:
    - Nombre de la fase
    - Badge de status (pending=gris, ready=azul, in_progress=amarillo, completed=verde, skipped=gris tachado)
    - Duración planificada (días)
    - Zona asignada (editable solo si status=draft via formulario en PRD 22)
    - Fechas planificadas (start → end)
    - Fechas reales (start → end), si aplica
    - Input/output quantities + yield% (si fase completada)
  - Indicador visual de fase actual (highlight)
  - Progreso general: X de Y fases completadas
- **Sección: Rendimiento esperado** — Tabla de cascada
  - Columnas: Fase, Input, Yield %, Output, Producto, Unidad
  - Fila final destacada: output total esperado
  - Si hay datos reales (fases completadas), mostrar columna adicional "Real" al lado de "Esperado"
  - Variación plan vs real con indicador visual (verde si yield real >= esperado, rojo si menor)
- **Sección: Batch generado** — Visible solo si la orden fue aprobada y tiene batch
  - Card con datos del batch: código, status, fase actual, zona actual, plantas, días en producción
  - Link "Ver detalle del batch" → `/production/batches/{batchId}` (PRD 25)
- **Sección: Actividades programadas** — Visible solo si la orden fue aprobada
  - Lista resumida de scheduled_activities del batch, agrupadas por fase
  - Columnas: Actividad, Fase, Fecha planificada, Status
  - Link "Ver todas las actividades" → futuro PRD de actividades (Fase 5)
- **Dialog: Confirmar aprobación** — Modal con resumen antes de aprobar
  - Resumen: cultivar, fases, cantidad, output esperado
  - Select: Cultivation schedule a usar (si hay múltiples para el cultivar)
  - Select: Zona inicial para el batch (req, pre-llenada si la orden tiene zone_id)
  - Checkbox: "Confirmo que los datos son correctos y deseo iniciar producción"
  - Botón "Aprobar y crear batch" (variant="primary")
- **Dialog: Confirmar cancelación** — Modal con advertencia
  - Si tiene batch activo: "Esta orden tiene un batch activo (LOT-XXX). ¿Cancelar la orden no cancela el batch automáticamente?"
  - Si no tiene batch: "¿Cancelar la orden OP-2026-001? Esta acción no se puede deshacer."
  - Botón "Cancelar orden" (variant="destructive")

**Responsive**: Layout de secciones apilado verticalmente. Timeline de fases horizontal con scroll en desktop, vertical en móvil. Tabla de rendimiento con scroll horizontal en móvil.

## Requisitos funcionales

### Lectura

- **RF-01**: Al cargar la página, obtener la orden completa via Server Component:
  ```
  supabase.from('production_orders')
    .select(`
      *,
      cultivar:cultivars(id, name, code, crop_type:crop_types(id, name)),
      entry_phase:production_phases!entry_phase_id(id, name, sort_order),
      exit_phase:production_phases!exit_phase_id(id, name, sort_order),
      initial_unit:units_of_measure!initial_unit_id(id, code, name),
      initial_product:products!initial_product_id(id, name, sku),
      expected_output_product:products!expected_output_product_id(id, name, sku),
      zone:zones(id, name, facility:facilities(id, name)),
      assigned_user:users!assigned_to(id, full_name),
      batch:batches(id, code, status, current_phase_id, zone_id, plant_count, start_date)
    `)
    .eq('id', orderId)
    .single()
  ```
- **RF-02**: Cargar las fases de la orden:
  ```
  supabase.from('production_order_phases')
    .select(`
      *,
      phase:production_phases(id, name, sort_order),
      zone:zones(id, name, facility:facilities(name)),
      batch:batches(id, code)
    `)
    .eq('order_id', orderId)
    .order('sort_order')
  ```
- **RF-03**: Si la orden tiene batch, cargar actividades programadas del batch (resumen):
  ```
  supabase.from('scheduled_activities')
    .select('id, planned_date, crop_day, status, template:activity_templates(name, code), phase:production_phases(name)')
    .eq('batch_id', batchId)
    .order('planned_date')
    .limit(20)
  ```
- **RF-04**: Si la orden no está aprobada, cargar cultivation_schedules disponibles para el cultivar (para el dialog de aprobación):
  ```
  supabase.from('cultivation_schedules')
    .select('id, name, total_days')
    .eq('cultivar_id', cultivarId)
    .eq('is_active', true)
  ```
- **RF-05**: Cargar rendimiento esperado en cascada: usar los datos de `phase_product_flows` del cultivar o invocar `calculate-order-yields` para visualizar la tabla de cascada

### Aprobación

- **RF-06**: Al aprobar, invocar Edge Function `approve-production-order`:
  ```
  POST /functions/v1/approve-production-order
  {
    order_id: UUID,
    zone_id: UUID,          // zona inicial para el batch
    schedule_id: UUID | null // cultivation_schedule a usar (opt)
  }
  ```
  La Edge Function ejecuta transaccionalmente:
  1. Validar que la orden está en status=draft
  2. Actualizar `production_orders.status` → 'approved'
  3. Crear `batches` con: cultivar_id, zone_id, current_phase_id=entry_phase, production_order_id, status='active', code auto-generado (LOT-{CULTIVAR}-{YYMMDD}), start_date=planned_start_date o today
  4. Si se provee schedule_id, generar `scheduled_activities` desde `cultivation_schedules.phase_config` para cada fase de la orden
  5. Actualizar `production_order_phases[0].status` → 'ready' (primera fase lista para iniciar)
  6. Actualizar `production_order_phases[0].batch_id` → nuevo batch
  7. Retorna: `{ batch_id, batch_code, scheduled_activities_count }`
- **RF-07**: Tras aprobación exitosa, mostrar toast "Orden aprobada. Batch {code} creado con {N} actividades programadas" + redirigir o actualizar la página
- **RF-08**: Tras aprobación, invalidar caches: `['production-orders', orderId]`, `['production-orders']`, `['batches']`

### Cancelación

- **RF-09**: Al cancelar, actualizar via PostgREST: `supabase.from('production_orders').update({ status: 'cancelled' }).eq('id', orderId)`
- **RF-10**: Solo se puede cancelar si status es draft, approved, o in_progress. Solo admin/manager
- **RF-11**: Si la orden tiene batch activo, la cancelación de la orden NO cancela el batch automáticamente — se muestra advertencia informativa. El batch se gestiona desde su propio detalle (PRD 25)
- **RF-12**: Tras cancelación, invalidar caches: `['production-orders', orderId]`, `['production-orders']`

### Navegación

- **RF-13**: Click en código de batch navega a `/production/batches/{batchId}` (PRD 25)
- **RF-14**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-15**: Botón "Volver a órdenes" navega a `/production/orders` (PRD 22)

### Datos calculados

- **RF-16**: Progreso de fases: `completedPhases / totalPhases * 100` como barra de progreso
- **RF-17**: Rendimiento real vs esperado por fase: comparar `production_order_phases.yield_pct` con `phase_product_flows.expected_yield_pct` del cultivar
- **RF-18**: Días transcurridos desde inicio: `Math.ceil((today - order.planned_start_date) / (1000 * 60 * 60 * 24))`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) + Pattern 3 (admin/manager para aprobar/cancelar)
- **RNF-02**: La aprobación ejecuta lógica compleja transaccional en Edge Function — nunca desde el cliente directamente
- **RNF-03**: El batch_code es generado server-side por la Edge Function
- **RNF-04**: Las scheduled_activities se generan atómicamente con la creación del batch — si falla la generación, no se crea el batch
- **RNF-05**: Si no hay cultivation_schedule para el cultivar, la orden se aprueba sin actividades programadas (solo se crea el batch)
- **RNF-06**: La página de detalle es read-only excepto por las acciones de aprobar/cancelar. La edición de datos de la orden se hace desde el formulario del listado (PRD 22, solo en status=draft)

## Flujos principales

### Happy path — Aprobar orden y crear batch

1. Manager navega a `/production/orders/OP-2026-001` (status=draft)
2. Revisa la información: Gelato #41, Germinación → Empaque, 50 semillas
3. Timeline muestra 7 fases: todas en status=pending
4. Tabla de rendimiento muestra cascada esperada: 50 → 45 → 43 → 42 → 21kg → 5.25kg → 4.2kg
5. Click "Aprobar orden" → dialog de confirmación
6. Selecciona cultivation schedule: "Plan Gelato Indoor 127 días"
7. Confirma zona inicial: "Sala Germinación"
8. Marca checkbox de confirmación
9. Click "Aprobar y crear batch" → botón loading
10. Edge Function crea batch LOT-GELATO-260301, programa 45 actividades
11. Toast: "Orden aprobada. Batch LOT-GELATO-260301 creado con 45 actividades programadas"
12. Página se actualiza: status=approved, sección de batch visible, timeline primera fase en status=ready

### Ver orden en progreso

1. Supervisor navega al detalle de una orden in_progress
2. Timeline muestra: Germinación (completed, 7d real) → Propagación (in_progress, día 8 de 14) → Vegetativo (pending) → ...
3. Tabla de rendimiento: fases completadas muestran datos reales al lado de esperados
4. Germinación: esperado 45 (90%) → real 47 (94%) → badge verde
5. Click en batch LOT-GELATO-260301 → navega al detalle del batch

### Ver orden completada

1. Manager navega al detalle de una orden completed
2. Todas las fases en status=completed (excepto las skipped)
3. Rendimiento final: output real vs esperado, con variación total
4. Batch en status=completed
5. Sin acciones disponibles

### Cancelar orden borrador

1. Admin click "Cancelar" en orden draft
2. Dialog: "¿Cancelar la orden OP-2026-001? Esta acción no se puede deshacer."
3. Confirma → status=cancelled → toast "Orden cancelada"

### Cancelar orden con batch activo

1. Manager click "Cancelar" en orden approved con batch activo
2. Dialog muestra advertencia: "Esta orden tiene un batch activo (LOT-GELATO-260301). Cancelar la orden no cancela el batch automáticamente. El batch se gestiona desde su página de detalle."
3. Confirma → orden status=cancelled → batch sigue activo

### Aprobar orden sin cultivation schedule

1. Manager aprueba orden de un cultivar sin schedule configurado
2. Edge Function crea batch pero sin scheduled_activities
3. Toast: "Orden aprobada. Batch LOT-XXX creado. No se programaron actividades (sin plan de cultivo configurado)"
4. La sección "Actividades programadas" muestra: "No hay actividades programadas. Configura un plan de cultivo en Settings > Cultivares"

### Vista solo lectura (operator/viewer)

1. Navega al detalle de una orden
2. Ve toda la información y timeline
3. No ve botones de aprobar/cancelar
4. Puede navegar al batch y a las zonas

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                          |
| ------- | ------------------------------------------------------------------------------------ |
| loading | Skeleton de secciones mientras carga                                                 |
| loaded  | Todas las secciones con datos                                                        |
| error   | Error al cargar — "Error al cargar la orden. Intenta nuevamente" + botón reintentar  |
| 404     | Orden no encontrada — "Orden no encontrada" + link a volver al listado               |

### Estados de UI — Dialog de aprobación

| Estado     | Descripción                                                          |
| ---------- | -------------------------------------------------------------------- |
| idle       | Campos listos, checkbox desmarcado, botón disabled                   |
| ready      | Checkbox marcado, zona seleccionada, botón enabled                   |
| submitting | Botón loading "Aprobando...", campos disabled                        |
| success    | Dialog cierra, toast éxito, página se actualiza                      |
| error      | Toast error, dialog permanece abierto para reintentar                |

### Estados de UI — Dialog de cancelación

| Estado     | Descripción                             |
| ---------- | --------------------------------------- |
| idle       | Botón "Cancelar orden" habilitado       |
| submitting | Botón loading, disabled                 |
| success    | Dialog cierra, toast éxito              |
| error      | Toast error, dialog permanece abierto   |

### Errores esperados

| Escenario                              | Mensaje al usuario                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Orden no encontrada                    | "Orden no encontrada" (page-level 404)                                                          |
| Orden ya aprobada (concurrent)         | "Esta orden ya fue aprobada" (toast)                                                            |
| Orden ya cancelada (concurrent)        | "Esta orden ya fue cancelada" (toast)                                                           |
| Sin zona para aprobar                  | "Selecciona una zona inicial para el batch" (inline en dialog)                                  |
| Error en Edge Function de aprobación   | "Error al aprobar la orden. Intenta nuevamente" (toast)                                         |
| Sin cultivation_schedule               | Aprobación exitosa pero con advertencia (ver RF-05/RNF-05)                                      |
| Permiso denegado (RLS)                 | "No tienes permisos para aprobar órdenes" (toast)                                               |
| Error de red                           | "Error de conexión. Intenta nuevamente" (toast)                                                 |

## Dependencias

- **Páginas relacionadas**:
  - `/production/orders` — listado de órdenes (PRD 22)
  - `/production/batches/[id]` — detalle del batch generado (PRD 25)
  - `/areas/zones/[id]` — detalle de zona asignada (PRD 16)
  - `/settings/cultivars` — cultivars y cultivation_schedules (Fase 2)
- **Edge Function**: `approve-production-order` — aprobación transaccional (crea batch + genera activities)
- **Función SQL**: `approve_production_order(order_id, zone_id, schedule_id)` — lógica atómica en Postgres
- **Supabase client**: PostgREST para lecturas + Edge Function para aprobación
- **React Query**: Cache keys `['production-orders', orderId]`, `['production-order-phases', orderId]`, `['batch-scheduled-activities', batchId]`, `['cultivation-schedules', cultivarId]`
