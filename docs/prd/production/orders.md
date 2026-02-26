# Órdenes de Producción

## Metadata

- **Ruta**: `/production/orders`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (lectura + crear borradores), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formulario de creación)
- **Edge Functions**: `calculate-order-yields` — calcula el rendimiento esperado en cascada desde entry hasta exit phase usando phase_product_flows del cultivar

## Objetivo

Gestionar las órdenes de producción: crear, listar y filtrar órdenes que definen qué se va a producir. Cada orden selecciona un cultivar, un rango de fases (entry_phase → exit_phase) y una cantidad inicial. El sistema genera automáticamente las `production_order_phases` siguiendo la cadena `depends_on_phase_id` y calcula el rendimiento esperado en cascada usando `phase_product_flows` del cultivar.

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
| batches                 | R           | Referencia: link al batch generado (si la orden está aprobada)                          |

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
  - Columnas: Código (order code), Cultivar (cultivar.name), Fases (entry_phase.name → exit_phase.name), Cantidad inicial + unidad, Output esperado, Prioridad (badge con color), Estado (badge con color), Fecha inicio plan, Responsable, Batch (link al batch si existe), Acciones
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
    - "Editar" → abre formulario de edición (solo si status = draft, solo admin/manager/supervisor)
    - "Cancelar" → cambia status con confirmación (solo si status = draft, solo admin/manager)
  - Paginación server-side (20 por página)
  - Ordenamiento por fecha planificada de inicio (más reciente primero)
  - Click en fila → navega a `/production/orders/{id}`
- **Formulario: Crear/Editar orden** — Página dedicada o modal amplio
  - **Sección 1: Datos básicos**
    - Código: auto-generado, read-only (formato: OP-{YYYY}-{NNN})
    - Select: Cultivar (req) — cultivars activos agrupados por crop_type
    - Select: Prioridad (req, default: normal)
    - DatePicker: Fecha planificada de inicio (req)
    - Select: Responsable (opt) — usuarios admin/manager/supervisor de la empresa
    - Input: Notas (opt, textarea)
  - **Sección 2: Rango de fases** (aparece después de seleccionar cultivar)
    - Al seleccionar cultivar, se cargan las production_phases del crop_type
    - Select: Fase de entrada (req) — solo fases con `can_be_entry_point = true` o la primera fase (sort_order=1)
    - Select: Fase de salida (req) — solo fases con `can_be_exit_point = true` o la última fase, y que vengan después de la entry_phase en la cadena depends_on
    - **Vista de fases seleccionadas** (read-only, auto-generada):
      - Lista visual (stepper/timeline) de las fases desde entry hasta exit, generadas siguiendo `depends_on_phase_id`
      - Cada fase muestra: nombre, duración planificada (days), zona asignada (editable)
      - Para cada fase, editar: `planned_duration_days` (override del default), `zone_id` (opt)
  - **Sección 3: Material de entrada**
    - Input: Cantidad inicial (req, number) — semillas, esquejes, kg, etc.
    - Select: Unidad (req) — units_of_measure
    - Select: Producto inicial (opt) — products (filtrado por cultivar si aplica)
    - Select: Zona inicial (opt) — zones activas
  - **Sección 4: Rendimiento esperado** (read-only, calculado)
    - Al completar secciones 2 y 3, el sistema calcula en cascada:
      - Invoca Edge Function `calculate-order-yields` o función SQL `calculate_cascade_yields`
      - Muestra tabla de rendimiento por fase: fase → input → yield% → output → producto
      - **Output final esperado**: cantidad + producto final + unidad
      - Fecha planificada de fin (calculada desde duraciones de fases)
    - Botón "Recalcular" (si se cambian cantidades o fases)
  - Botón "Guardar como borrador" (variant="outline")
  - Botón "Guardar" (variant="primary") — guarda en status=draft

**Responsive**: Tabla de listado con scroll horizontal. Formulario apilado verticalmente en móvil.

## Requisitos funcionales

### Listado

- **RF-01**: Al cargar la página, obtener órdenes via Server Component: `supabase.from('production_orders').select('*, cultivar:cultivars(name, code), entry_phase:production_phases!entry_phase_id(name), exit_phase:production_phases!exit_phase_id(name), unit:units_of_measure(code), assigned:users(full_name), batch:batches(id, code)').order('planned_start_date', { ascending: false })` con paginación
- **RF-02**: Filtros se aplican como query params en la URL para deep-linking
- **RF-03**: Filtro de búsqueda: `.or('code.ilike.%term%,notes.ilike.%term%')`
- **RF-04**: Los filtros de estado, prioridad y cultivar se aplican con `.eq()`

### Creación

- **RF-05**: El `code` se genera automáticamente server-side al insertar: formato `OP-{YYYY}-{NNN}` con contador secuencial por empresa por año
- **RF-06**: Al seleccionar un cultivar, cargar sus production_phases (del crop_type): `supabase.from('production_phases').select('*').eq('crop_type_id', cultivar.crop_type_id).eq('is_active', true).order('sort_order')`
- **RF-07**: El select de entry_phase muestra solo fases con `can_be_entry_point = true` más la primera fase (sort_order más bajo)
- **RF-08**: El select de exit_phase muestra solo fases con `can_be_exit_point = true` más la última fase, filtrando las que vienen DESPUÉS de la entry_phase seleccionada en la cadena `depends_on_phase_id`
- **RF-09**: Al seleccionar entry y exit, generar la lista de `production_order_phases` siguiendo la cadena `depends_on_phase_id` desde entry hasta exit. Cada phase tiene `planned_duration_days` tomado de `cultivar.phase_durations[phase.code]` o `production_phases.default_duration_days`
- **RF-10**: Calcular `planned_end_date` sumando las duraciones de todas las fases desde `planned_start_date`
- **RF-11**: Calcular rendimiento en cascada invocando Edge Function `calculate-order-yields`:
  ```
  POST /functions/v1/calculate-order-yields
  {
    cultivar_id: UUID,
    entry_phase_id: UUID,
    exit_phase_id: UUID,
    initial_quantity: number,
    initial_unit_id: UUID
  }
  ```
  Retorna: array de `{phase_id, phase_name, input_qty, yield_pct, output_qty, output_product_id, output_product_name, output_unit}` + total final
- **RF-12**: El cálculo en cascada usa `phase_product_flows` del cultivar: por cada fase, busca el flow con direction='input' y direction='output', aplica `expected_yield_pct` y/o `expected_quantity_per_input`
- **RF-13**: Mostrar resultado del cálculo en la sección "Rendimiento esperado" con tabla de fases
- **RF-14**: Al guardar, insertar en `production_orders` (status=draft) + insertar todas las `production_order_phases` con sort_order secuencial y status=pending
- **RF-15**: `company_id` NO se envía desde el cliente — RLS lo inyecta
- **RF-16**: Solo se puede editar una orden en status=draft. En otros status, el formulario es read-only
- **RF-17**: Cancelar orden: `production_orders.update({ status: 'cancelled' })` con confirmación. Solo si status=draft. Solo admin/manager
- **RF-18**: Validar campos con Zod antes de enviar
- **RF-19**: Tras operación exitosa, invalidar caches: `['production-orders']`, `['production-orders', orderId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) + Pattern 3 (admin/manager/supervisor para escritura)
- **RNF-02**: El `code` es generado server-side — nunca desde el cliente
- **RNF-03**: El cálculo de yields se ejecuta server-side (Edge Function o SQL function) — el frontend solo muestra el resultado
- **RNF-04**: La generación de order_phases sigue la cadena `depends_on_phase_id`, soportando tanto flujo lineal como bifurcaciones (ej: madre bifurca desde vegetativo)
- **RNF-05**: Paginación server-side para el listado principal
- **RNF-06**: Los selects de cultivar, fases y productos se encadenan — cada uno depende de la selección anterior

## Flujos principales

### Happy path — Crear orden full-cycle desde semilla

1. Manager navega a `/production/orders`
2. Click "Nueva orden" → formulario
3. Selecciona cultivar: "Gelato #41" → se cargan 8 fases de cannabis
4. Entry phase: "Germinación" (sort_order=1, can_be_entry_point o primera)
5. Exit phase: "Empaque" (sort_order=7, última)
6. Vista de fases muestra stepper: Germinación (7d) → Propagación (14d) → Vegetativo (28d) → Floración (63d) → Cosecha (1d) → Secado (14d) → Empaque (1d)
7. Cantidad inicial: 50, Unidad: semillas, Producto: SEM-GELATO-FEM
8. Sistema calcula yields en cascada: 50 → 45 (90%) → 43 (95%) → 42 (98%) → 21kg húmedo → 5.25kg seco → 4.2kg premium + 1.05kg trim
9. Output esperado: ~4.2 kg DRY-GELATO-PREMIUM
10. Fecha fin calculada: inicio + 128 días
11. Click "Guardar" → orden OP-2026-001 creada en status=draft → toast "Orden creada"

### Crear orden desde esquejes (entry_phase flexible)

1. Selecciona cultivar: "Gelato #41"
2. Entry phase: "Propagación" (can_be_entry_point=true)
3. Exit phase: "Empaque"
4. Fases generadas: Propagación → Vegetativo → Floración → Cosecha → Secado → Empaque (sin germinación)
5. Cantidad: 100 esquejes, Producto: CLONE-GELATO
6. Yields calculados desde propagación: 100 → 92 (yield diferente) → ...

### Crear orden de planta madre (exit_phase = madre)

1. Selecciona cultivar: "Gelato #41"
2. Entry phase: "Germinación"
3. Exit phase: "Madre" (bifurcación desde vegetativo)
4. Fases generadas: Germinación → Propagación → Vegetativo → Madre
5. Cantidad: 5 semillas (se seleccionará la mejor planta)

### Crear orden de procesador (fases finales)

1. Selecciona cultivar: "Gelato #41"
2. Entry phase: "Secado" (can_be_entry_point=true)
3. Exit phase: "Empaque"
4. Fases generadas: Secado → Empaque
5. Cantidad: 21 kg, Producto: WET-GELATO (flor húmeda)

### Editar orden borrador

1. Click "Editar" en orden con status=draft
2. Modifica cultivar, fases, cantidades
3. Rendimiento se recalcula
4. Guardar actualiza order + regenera order_phases

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

Con refinamiento: `exit_phase_id` debe ser alcanzable desde `entry_phase_id` siguiendo la cadena `depends_on_phase_id`.

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
- **Edge Function**: `calculate-order-yields` — cálculo en cascada de rendimientos
- **Función SQL**: `calculate_cascade_yields(cultivar_id, entry_phase_id, exit_phase_id, initial_qty)` — lógica del cálculo
- **Supabase client**: PostgREST para CRUD + Edge Function para yields
- **React Query**: Cache keys `['production-orders']`, `['production-orders', orderId]`, `['cultivar-phases', cultivarId]`
