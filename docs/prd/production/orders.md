# Órdenes de Producción

## Metadata

- **Ruta**: `/production/orders`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (lectura + crear borradores), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formulario de creación)
- **SQL RPC**: `calculate_cascade_yields(cultivar_id, entry_phase_id, exit_phase_id, initial_qty)` — SECURITY DEFINER function que calcula rendimiento en cascada

## Objetivo

Gestionar las órdenes de producción: crear, listar y filtrar órdenes que definen qué se va a producir. Cada orden selecciona un cultivar, un rango de fases (entry_phase → exit_phase) y una cantidad inicial. El sistema genera las `production_order_phases` para todas las fases entre entry y exit (por `sort_order`) y calcula el rendimiento esperado en cascada via SQL RPC `calculate_cascade_yields` usando `phase_product_flows` del cultivar.

El modelo de entry/exit points permite que viveros, procesadores y cultivadores full-cycle operen sobre el mismo sistema: un vivero selecciona germinación→propagación, un procesador secado→empaque, un full-cycle germinación→empaque.

La aprobación de la orden y generación del batch se manejan en la página de detalle (PRD 23).

Usuarios principales: managers que planifican producción, supervisores que crean borradores.

## Tablas del modelo involucradas

| Tabla                   | Operaciones | Notas                                                                                   |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------- |
| production_orders       | R/W         | CRUD completo. RLS Pattern 1 (company_id directo). code auto-generado                   |
| production_order_phases | R/W         | Generadas automáticamente al crear/editar la orden, siguiendo cadena depends_on         |
| cultivars               | R           | Select para elegir cultivar. Carga phase_durations y datos de yield                     |
| crop_types              | R           | Referencia: nombre del tipo de cultivo asociado al cultivar                             |
| production_phases       | R           | Fases del crop_type del cultivar — para selects entry/exit y generación de order_phases |
| phase_product_flows     | R           | Yields por fase del cultivar — para cálculo en cascada                                  |
| products                | R           | Producto inicial y producto final esperado                                              |
| units_of_measure        | R           | Unidad de la cantidad inicial                                                           |
| zones                   | R           | Select para zona inicial asignada                                                       |
| users                   | R           | Select para asignar responsable                                                         |
| batches                 | R           | (PRD 24) Referencia futura: link al batch generado tras aprobación                      |

## ENUMs utilizados

| ENUM               | Valores                                                    | Tabla.campo                    |
| ------------------ | ---------------------------------------------------------- | ------------------------------ |
| order_status       | draft \| approved \| in_progress \| completed \| cancelled | production_orders.status       |
| order_priority     | low \| normal \| high \| urgent                            | production_orders.priority     |
| order_phase_status | pending \| ready \| in_progress \| completed \| skipped    | production_order_phases.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Órdenes de Producción" + breadcrumb (Producción > Órdenes) + botón "Nueva orden" (variant="primary", visible para admin/manager/supervisor)
- **Barra de filtros** — Inline
  - Select: Estado (Todos / draft / approved / in_progress / completed / cancelled) con labels en español:
    - draft → "Borrador"
    - approved → "Aprobada"
    - in_progress → "En progreso"
    - completed → "Completada"
    - cancelled → "Cancelada"
  - Select: Prioridad (Todas / low / normal / high / urgent) con labels:
    - low → "Baja"
    - normal → "Normal"
    - high → "Alta"
    - urgent → "Urgente"
  - Select: Cultivar (Todos / lista de cultivars activos)
  - Input: Buscar por código o notas
  - DateRange: Rango de fecha planificada de inicio
- **Tabla de órdenes** — Server Component con datos paginados
  - Columnas: Código (order code), Cultivar (cultivar.name + crop_type), Fases (entry_phase.name → exit_phase.name), Cantidad inicial + unidad, Output esperado, Prioridad (badge con color), Estado (badge con color), Fecha inicio plan, Responsable (assigned_to), Acciones
  - Colores de badge de estado:
    - draft → gris
    - approved → azul
    - in_progress → amarillo
    - completed → verde
    - cancelled → rojo
  - Colores de badge de prioridad:
    - low → gris
    - normal → azul
    - high → naranja
    - urgent → rojo
  - Acciones por fila (dropdown menu):
    - "Ver detalle" → navega a `/production/orders/{id}` (PRD 23)
    - "Editar" → navega a `/production/orders/new?edit={id}` (solo si status = draft, solo admin/manager/supervisor)
    - "Cancelar orden" → cambia status con AlertDialog de confirmación (solo si status = draft, solo admin/manager/supervisor)
  - Paginación server-side (20 por página)
  - Ordenamiento por `created_at DESC`
  - Click en fila → navega a `/production/orders/{id}`
- **Formulario: Crear/Editar orden** — Página dedicada en `/production/orders/new` (edición via `?edit={id}`)
  - **Sección 1: Datos básicos**
    - Código: auto-generado server-side por trigger (formato: OP-{YYYY}-{NNNN}), no visible en formulario
    - Select: Cultivar (req) — cultivars activos agrupados por crop_type
    - Select: Prioridad (req, default: normal)
    - DatePicker: Fecha planificada de inicio (req)
    - Select: Responsable (opt) — usuarios admin/manager/supervisor de la empresa
    - Input: Notas (opt, textarea)
  - **Sección 2: Rango de fases** (aparece después de seleccionar cultivar)
    - Al seleccionar cultivar, se cargan las production_phases del crop_type
    - Select: Fase de entrada (req) — solo fases con `can_be_entry_point = true` o la primera fase (sort_order=1)
    - Select: Fase de salida (req) — solo fases con `can_be_exit_point = true` o la última fase, y que vengan después de la entry_phase por `sort_order`
    - **Vista de fases seleccionadas** (tabla editable, auto-generada):
      - Tabla de fases desde entry hasta exit, generadas filtrando por `sort_order` entre entry y exit
      - Columnas: Fase (nombre), Duración (días, editable input), Zona (editable select)
      - Muestra resumen: total fases, total días, fecha fin estimada
  - **Sección 3: Material de entrada**
    - Input: Cantidad inicial (req, number) — semillas, esquejes, kg, etc.
    - Select: Unidad (req) — units_of_measure
    - Select: Producto inicial (opt) — products (filtrado por cultivar si aplica)
    - Select: Zona inicial (opt) — zones activas
  - **Sección 4: Rendimiento esperado** (read-only, calculado)
    - Requiere cultivar, fases de entrada/salida, y cantidad inicial > 0 para habilitar cálculo
    - Botón "Calcular" / "Recalcular" invoca `supabase.rpc('calculate_cascade_yields', {...})`
    - Muestra tabla de rendimiento por fase: Fase → Entrada → Rend.% → Salida
    - Card resaltada con **producción final esperada**: cantidad + unidad
    - Fecha planificada de fin: calculada desde duraciones de fases
  - Botón "Cancelar" (variant="outline") → vuelve al listado
  - Botón "Crear orden" / "Guardar cambios" (variant="primary") — guarda en status=draft

**Responsive**: Tabla de listado con scroll horizontal. Formulario apilado verticalmente en móvil.

## Requisitos funcionales

### Listado

- **RF-01**: Al cargar la página, obtener órdenes via Server Component: `supabase.from('production_orders').select('*, cultivar:cultivars(id, name, crop_type_id, crop_type:crop_types(name)), entry_phase:production_phases!entry_phase_id(id, name), exit_phase:production_phases!exit_phase_id(id, name), initial_unit:units_of_measure!initial_unit_id(id, code), output_unit:units_of_measure!expected_output_unit_id(id, code), assigned_user:users!assigned_to(id, full_name)').order('created_at', { ascending: false })` con paginación (20 por página)
- **RF-02**: Filtros se aplican como query params en la URL para deep-linking
- **RF-03**: Filtro de búsqueda: `.or('code.ilike.%term%,notes.ilike.%term%')`
- **RF-04**: Los filtros de estado, prioridad y cultivar se aplican con `.eq()`

### Creación

- **RF-05**: El `code` se genera automáticamente server-side al insertar: formato `OP-{YYYY}-{NNN}` con contador secuencial por empresa por año
- **RF-06**: Al seleccionar un cultivar, cargar sus production_phases (del crop_type): `supabase.from('production_phases').select('*').eq('crop_type_id', cultivar.crop_type_id).eq('is_active', true).order('sort_order')`
- **RF-07**: El select de entry_phase muestra solo fases con `can_be_entry_point = true` más la primera fase (sort_order más bajo)
- **RF-08**: El select de exit_phase muestra solo fases con `can_be_exit_point = true` más la última fase, filtrando las que vienen DESPUÉS de la entry_phase por `sort_order`
- **RF-09**: Al seleccionar entry y exit, generar la lista de fases filtrando por `sort_order` entre entry y exit (inclusive). Cada phase tiene `planned_duration_days` pre-llenado desde `production_phases.default_duration_days`, editable por el usuario
- **RF-10**: Calcular `planned_end_date` sumando las duraciones de todas las fases desde `planned_start_date`
- **RF-11**: Calcular rendimiento en cascada invocando SQL RPC:
  ```
  supabase.rpc('calculate_cascade_yields', {
    p_cultivar_id: UUID,
    p_entry_phase_id: UUID,
    p_exit_phase_id: UUID,
    p_initial_quantity: number
  })
  ```
  Retorna JSONB: `{ phases: [{phase_id, phase_name, sort_order, default_duration_days, input_qty, yield_pct, output_qty, output_product_id}], final_output_qty, final_output_product_id }`
- **RF-12**: El cálculo en cascada usa `phase_product_flows` del cultivar: por cada fase, busca el flow con `direction='output'` y `product_role='primary'`, aplica `expected_yield_pct`. Si no hay datos de yield, pasa al 100%
- **RF-13**: Mostrar resultado del cálculo en la sección "Rendimiento esperado" con tabla (Fase, Entrada, Rend.%, Salida) y card con producción final
- **RF-14**: Al guardar, insertar en `production_orders` (status=draft) + insertar todas las `production_order_phases` con sort_order secuencial y status=pending
- **RF-15**: `company_id` NO se envía desde el cliente — RLS lo inyecta
- **RF-16**: Solo se puede editar una orden en status=draft. En otros status, el formulario es read-only
- **RF-17**: Cancelar orden: `production_orders.update({ status: 'cancelled' })` con AlertDialog de confirmación. Solo si status=draft. Admin/manager/supervisor
- **RF-18**: Validar campos con Zod antes de enviar
- **RF-19**: Tras operación exitosa, invalidar caches: `['production-orders']`, `['production-orders', orderId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) + Pattern 3 (admin/manager/supervisor para escritura)
- **RNF-02**: El `code` es generado server-side — nunca desde el cliente
- **RNF-03**: El cálculo de yields se ejecuta server-side via SQL RPC `calculate_cascade_yields` (SECURITY DEFINER) — el frontend solo muestra el resultado
- **RNF-04**: La generación de order_phases filtra por `sort_order` entre entry y exit phase (inclusive), soportando rangos parciales (ej: solo cosecha→secado)
- **RNF-05**: Paginación server-side para el listado principal
- **RNF-06**: Los selects de cultivar, fases y productos se encadenan — cada uno depende de la selección anterior

## Flujos principales

### Happy path — Crear orden full-cycle desde semilla

1. Manager navega a `/production/orders`
2. Click "Nueva orden" → formulario
3. Selecciona cultivar: "Gelato #41" → se cargan 8 fases de cannabis
4. Entry phase: "Germinación" (sort_order=1, can_be_entry_point)
5. Exit phase: "Secado/Curado" (sort_order=5, can_be_exit_point)
6. Tabla de fases muestra: Germinación (7d) → Vegetativo (28d) → Floración (63d) → Cosecha (3d) → Secado/Curado (21d)
7. Cantidad inicial: 100, Unidad: g
8. Click "Calcular" → RPC calcula yields: 100 → 100 (100%) → 100 (100%) → 100 (100%) → 70 (70%) → 15.4g (22%)
9. Output esperado: 15.4 g
10. Fecha fin calculada: inicio + 122 días
11. Click "Crear orden" → orden OP-2026-0001 creada en status=draft → toast "Orden creada" → redirect al listado

### Crear orden parcial (procesador — fases finales)

1. Selecciona cultivar: "OG Kush"
2. Entry phase: "Cosecha"
3. Exit phase: "Secado/Curado"
4. Fases generadas: Cosecha (3d) → Secado/Curado (21d)
5. Cantidad: 200 g
6. Yields: 200 → 140 (70%) → 30.8 (22%)
7. Útil para procesadores que reciben material húmedo

### Editar orden borrador

1. Click "Editar" en dropdown de acciones → navega a `/production/orders/new?edit={id}`
2. Formulario pre-llenado con datos existentes (solo draft)
3. Modifica cultivar, fases, cantidades, recalcula yields
4. "Guardar cambios" → actualiza order, elimina phases existentes, re-inserta con nuevos datos

### Cancelar orden borrador

1. Admin/manager click "Cancelar" en orden draft
2. Dialog: "¿Cancelar la orden OP-2026-001? No se podrá reactivar."
3. Confirma → status=cancelled

### Vista solo lectura (operator/viewer)

1. Ve la tabla sin botón "Nueva orden"
2. Click en fila navega al detalle (PRD 23)
3. No hay acciones de edición

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                     |
| -------------- | --------------------------------------------------------------- |
| loading        | Skeleton de tabla mientras carga                                |
| loaded         | Tabla con datos, filtros activos                                |
| empty          | Sin órdenes — "No hay órdenes de producción. Crea la primera."  |
| empty-filtered | Sin resultados — "No se encontraron órdenes"                    |
| error          | Error al cargar — "Error al cargar órdenes. Intenta nuevamente" |

### Estados de UI — Formulario

| Estado      | Descripción                                                      |
| ----------- | ---------------------------------------------------------------- |
| idle        | Campos listos                                                    |
| calculating | Calculando yields en cascada (loading en sección de rendimiento) |
| calculated  | Yields mostrados, listo para guardar                             |
| submitting  | Botón loading, campos read-only                                  |
| success     | Redirige, toast éxito                                            |
| error       | Toast error, formulario re-habilitado                            |

### Validaciones Zod — Orden

```
cultivar_id: z.string().uuid('Selecciona un cultivar')
entry_phase_id: z.string().uuid('Selecciona una fase de entrada')
exit_phase_id: z.string().uuid('Selecciona una fase de salida')
initial_quantity: z.number().positive('La cantidad debe ser mayor a 0')
initial_unit_id: z.string().uuid('Selecciona una unidad')
initial_product_id: z.string().uuid().optional().nullable()
zone_id: z.string().uuid().optional().nullable()
planned_start_date: z.string().min(1, 'La fecha de inicio es requerida')
priority: z.enum(['low', 'normal', 'high', 'urgent'], { message: 'Selecciona una prioridad' }).default('normal')
assigned_to: z.string().uuid().optional().nullable()
notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal(''))
```

Exit phase filtrada client-side: solo fases con `sort_order >= entry_phase.sort_order` del mismo `crop_type_id`.

### Validaciones Zod — Phase override (por cada fase)

```
planned_duration_days: z.number().int().positive('Debe ser mayor a 0').optional().nullable()
zone_id: z.string().uuid().optional().nullable()
```

### Errores esperados

| Escenario                       | Mensaje al usuario                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Cultivar no seleccionado        | "Selecciona un cultivar" (inline)                                                                     |
| Fase de entrada no seleccionada | "Selecciona una fase de entrada" (inline)                                                             |
| Fase de salida no seleccionada  | "Selecciona una fase de salida" (inline)                                                              |
| Exit no alcanzable desde entry  | "La fase de salida no es alcanzable desde la fase de entrada" (inline)                                |
| Cantidad <= 0                   | "La cantidad debe ser mayor a 0" (inline)                                                             |
| Fecha inicio vacía              | "La fecha de inicio es requerida" (inline)                                                            |
| Error cálculo yields            | "Error al calcular rendimiento. Verifica que el cultivar tenga flows configurados" (toast)            |
| Sin phase_product_flows         | "El cultivar no tiene flujos de producto configurados. Configúralos en Settings > Cultivares" (toast) |
| Error de red                    | "Error de conexión. Intenta nuevamente" (toast)                                                       |
| Permiso denegado                | "No tienes permisos para crear órdenes" (toast)                                                       |

## Dependencias

- **Páginas relacionadas**:
  - `/production/orders/[id]` — detalle de orden: aprobar, cancelar, ver batch (PRD 23)
  - `/production/batches` — batches generados desde órdenes aprobadas (PRD 24)
  - `/settings/cultivars` — cultivars con phase_product_flows deben existir (Fase 2)
  - `/settings/crop-types` — production_phases deben existir (Fase 2)
  - `/areas/zones` — zonas para asignación (Fase 3)
  - `/inventory/products` — productos para material de entrada/salida (Fase 3)
- **SQL RPC**: `calculate_cascade_yields(p_cultivar_id, p_entry_phase_id, p_exit_phase_id, p_initial_quantity)` — SECURITY DEFINER, cálculo en cascada de rendimientos
- **SQL Trigger**: `generate_order_code()` — auto-genera `OP-{YYYY}-{NNNN}` por empresa/año
- **Supabase client**: PostgREST para CRUD + RPC para yields
