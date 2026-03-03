# Detalle de Orden de Producción

## Metadata

- **Ruta**: `/production/orders/[id]`
- **Roles con acceso**: admin (lectura + editar/cancelar), manager (lectura + editar/cancelar), supervisor (lectura + editar/cancelar), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para datos de orden, Client Component para acciones y timeline)
- **SQL RPC**: `calculate_cascade_yields` — reutilizada de PRD 22 para mostrar tabla de rendimiento

## Objetivo

Página de detalle de una orden de producción. Muestra toda la información de la orden, el timeline visual de fases con su progreso, y el rendimiento esperado en cascada. Acciones disponibles: **editar** (navega al formulario, solo draft), **cancelar** (cambia status con confirmación).

> **Deferred to PRD 24**: La aprobación de órdenes (crea batch + programa actividades) se implementa en PRD 24 junto con la migración de la tabla `batches` y el Edge Function `approve-production-order`. Las secciones "Batch generado" y "Actividades programadas" se añadirán en ese PRD.

Usuarios principales: managers que revisan órdenes antes de aprobar, supervisores que monitorean estado.

## Tablas del modelo involucradas

| Tabla                   | Operaciones | Notas                                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------------------------- |
| production_orders       | R/W         | Lectura de detalle + update status (cancelar). RLS Pattern 1                 |
| production_order_phases | R           | Timeline de fases, datos de rendimiento por fase                             |
| cultivars               | R           | Nombre y datos del cultivar                                                  |
| crop_types              | R           | Nombre del tipo de cultivo                                                   |
| production_phases       | R           | Nombres de fases, sort_order                                                 |
| products                | R           | Producto inicial y productos esperados por fase                              |
| units_of_measure        | R           | Unidades                                                                     |
| zones                   | R           | Zonas asignadas por fase                                                     |
| users                   | R           | Responsable asignado                                                         |

## ENUMs utilizados

| ENUM               | Valores                                                    | Tabla.campo                    |
| ------------------ | ---------------------------------------------------------- | ------------------------------ |
| order_status       | draft \| approved \| in_progress \| completed \| cancelled | production_orders.status       |
| order_priority     | low \| normal \| high \| urgent                            | production_orders.priority     |
| order_phase_status | pending \| ready \| in_progress \| completed \| skipped    | production_order_phases.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Botón "Volver" + código de la orden + badge de estado + badge de prioridad
  - Título: código de la orden (ej: OP-2026-0001)
  - Subtítulo: cultivar name + crop_type name
  - Acciones en header (según status y rol):
    - Status=draft, admin/manager/supervisor: botón "Editar" (variant="outline", navega a `/production/orders/new?edit={id}`) + botón "Cancelar" (variant="destructive")
    - Status=draft: botón "Aprobar" disabled con tooltip "Próximamente en PRD 24"
    - Status=approved/in_progress/completed/cancelled: sin acciones de escritura
- **Sección: Información general** — Card con grid de datos principales
  - Cultivar + tipo de cultivo
  - Fase de entrada → Fase de salida
  - Cantidad inicial + unidad + producto inicial (si aplica)
  - Output esperado + unidad (si calculado)
  - Fecha planificada inicio → fin
  - Prioridad (badge con color)
  - Responsable asignado
  - Notas
  - Fechas de creación y última actualización
- **Sección: Timeline de fases** — Tabla vertical con indicadores visuales
  - Cada fase muestra:
    - Nombre de la fase
    - Badge de status (pending=gris, ready=azul, in_progress=amarillo, completed=verde, skipped=gris tachado)
    - Duración planificada (días)
    - Zona asignada (si tiene)
    - Fechas planificadas (start → end)
    - Input/output quantities + yield% (datos de la order_phase)
  - Progreso general: X de Y fases completadas (barra o texto)
- **Sección: Rendimiento esperado** — Tabla de cascada
  - Columnas: Fase, Entrada, Rend.%, Salida
  - Datos de `production_order_phases` (expected_input_qty, yield_pct, expected_output_qty)
  - Fila final destacada: output total esperado
- **Dialog: Confirmar cancelación** — AlertDialog
  - "¿Cancelar la orden {code}? Esta acción no se puede deshacer."
  - Botón "Cancelar orden" (variant="destructive")

**Responsive**: Layout de secciones apilado verticalmente. Tabla de rendimiento con scroll horizontal en móvil.

## Requisitos funcionales

### Lectura

- **RF-01**: Al cargar la página, obtener la orden completa via Server Component:
  ```
  supabase.from('production_orders')
    .select(`
      *,
      cultivar:cultivars(id, name, code, crop_type:crop_types(id, name)),
      entry_phase:production_phases!production_orders_entry_phase_id_fkey(id, name, sort_order),
      exit_phase:production_phases!production_orders_exit_phase_id_fkey(id, name, sort_order),
      initial_unit:units_of_measure!production_orders_initial_unit_id_fkey(id, code, name),
      initial_product:products!production_orders_initial_product_id_fkey(id, name, sku),
      output_unit:units_of_measure!production_orders_expected_output_unit_id_fkey(id, code),
      zone:zones(id, name),
      assigned_user:users!production_orders_assigned_to_fkey(id, full_name)
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
      zone:zones(id, name)
    `)
    .eq('order_id', orderId)
    .order('sort_order')
  ```
- **RF-03**: El rendimiento esperado se muestra directamente de `production_order_phases` (expected_input_qty, yield_pct, expected_output_qty) — no se necesita RPC adicional

### Cancelación

- **RF-04**: Al cancelar, actualizar via PostgREST: `supabase.from('production_orders').update({ status: 'cancelled' }).eq('id', orderId)`
- **RF-05**: Solo se puede cancelar si status es draft. Solo admin/manager/supervisor
- **RF-06**: Tras cancelación, router.refresh() para actualizar la página + toast "Orden cancelada"

### Navegación

- **RF-07**: Botón "Volver" navega a `/production/orders` (PRD 22)
- **RF-08**: Botón "Editar" navega a `/production/orders/new?edit={id}` (solo draft)
- **RF-09**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)

### Datos calculados

- **RF-10**: Progreso de fases: contar fases con status completed vs total, mostrar "X de Y fases completadas"
- **RF-11**: Días totales planificados: suma de `planned_duration_days` de todas las fases

### Deferred to PRD 24

- **RF-D1**: Botón "Aprobar orden" — crea batch via Edge Function `approve-production-order`
- **RF-D2**: Sección "Batch generado" — muestra datos del batch creado
- **RF-D3**: Sección "Actividades programadas" — lista de scheduled_activities del batch
- **RF-D4**: Cancelación con batch activo — advertencia informativa

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) para lectura. Pattern 3 (admin/manager/supervisor para cancelar)
- **RNF-02**: La página es read-only excepto por cancelar. La edición se hace desde el formulario en PRD 22 (`/orders/new?edit={id}`)
- **RNF-03**: Los datos de rendimiento ya están persistidos en `production_order_phases` — no se necesita recalcular

## Flujos principales

### Ver detalle de orden borrador

1. Manager navega a `/production/orders/{id}` desde el listado
2. Ve información general: OG Kush, Germinación → Secado/Curado, 100 g
3. Timeline muestra 5 fases: todas en status=pending
4. Tabla de rendimiento muestra cascada: 100 → 100 → 100 → 100 → 70 → 15.4 g
5. Acciones visibles: "Editar" + "Cancelar" + "Aprobar" (disabled)

### Editar orden desde detalle

1. En detalle de orden draft, click "Editar"
2. Navega a `/production/orders/new?edit={id}`
3. Modifica datos, guarda → vuelve al listado

### Cancelar orden borrador

1. Admin/manager/supervisor click "Cancelar" en orden draft
2. AlertDialog: "¿Cancelar la orden OP-2026-0001? Esta acción no se puede deshacer."
3. Confirma → status=cancelled → toast "Orden cancelada" → página se actualiza

### Vista solo lectura (operator/viewer)

1. Navega al detalle de una orden
2. Ve toda la información, timeline y rendimiento
3. No ve botones de editar/cancelar
4. Puede navegar a zonas asignadas

### Orden ya cancelada

1. Navega al detalle de una orden cancelled
2. Ve toda la información con badge "Cancelada" en rojo
3. Sin acciones disponibles
4. Timeline muestra fases con sus datos originales

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                          |
| ------- | ------------------------------------------------------------------------------------ |
| loaded  | Todas las secciones con datos (SSR, no hay loading state visible)                    |
| 404     | Orden no encontrada — redirect a `/production/orders`                                |

### Estados de UI — Dialog de cancelación

| Estado     | Descripción                             |
| ---------- | --------------------------------------- |
| idle       | Botón "Cancelar orden" habilitado       |
| submitting | Botón loading, disabled                 |
| success    | Dialog cierra, toast éxito              |
| error      | Toast error, dialog permanece abierto   |

### Errores esperados

| Escenario                              | Mensaje al usuario                                             |
| -------------------------------------- | -------------------------------------------------------------- |
| Orden no encontrada                    | Redirect a `/production/orders`                                |
| Error al cancelar                      | "Error al cancelar la orden." (toast)                          |
| Permiso denegado (RLS)                 | "Error al cancelar la orden." (toast, RLS blocks silently)     |
| Error de red                           | "Error al cancelar la orden." (toast)                          |

## Dependencias

- **Páginas relacionadas**:
  - `/production/orders` — listado de órdenes (PRD 22)
  - `/production/orders/new?edit={id}` — editar orden borrador (PRD 22)
  - `/areas/zones/[id]` — detalle de zona asignada (PRD 16)
- **Absorbe de PRD 24**: Aprobación (Edge Function + batch creation + UI) se implementará allí
- **Supabase client**: PostgREST para lectura + update de cancelación
- **Componentes compartidos**: Reutiliza `orderStatusLabels`, `orderStatusBadgeStyles`, `orderPriorityLabels`, `orderPriorityBadgeStyles` de `orders-shared.tsx`
