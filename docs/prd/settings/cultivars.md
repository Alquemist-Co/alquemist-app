# Cultivares y Flujos de Producción

## Metadata

- **Ruta**: `/settings/cultivars`
- **Roles con acceso**: admin, manager (lectura y escritura), supervisor, operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado master, Client Component para formularios, detalle y phase_product_flows)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Permitir configurar las variedades específicas (cultivares) dentro de cada tipo de cultivo, incluyendo características de rendimiento, ciclo, perfil objetivo y condiciones óptimas. La sección más crítica es la configuración de **phase_product_flows**: por cada fase del crop_type, definir qué entra (inputs) y qué sale (outputs) con rendimientos específicos del cultivar. Estos flows son la ÚNICA fuente de verdad para transformaciones de inventario y cálculos de yield en cascada.

Esta es la página más compleja de la Fase 2 — combina datos del cultivar con la configuración detallada de transformaciones por fase.

Usuarios principales: admin y manager durante la configuración del sistema productivo.

## Tablas del modelo involucradas

| Tabla               | Operaciones | Notas                                                                                                           |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| cultivars           | R/W         | CRUD completo. Campos JSONB estructurados. Soft-delete via is_active. RLS Pattern 1 + Pattern 3                 |
| phase_product_flows | R/W         | CRUD de flows por cultivar y fase. Definen inputs/outputs de cada fase                                          |
| crop_types          | R           | Referencia para filtrar cultivares por tipo de cultivo y cargar fases disponibles                               |
| production_phases   | R           | Fases del crop_type para mostrar en el detalle de flows                                                         |
| products            | R           | Referencia para seleccionar productos en flows (puede estar vacío en Fase 2 — se permite usar solo category_id) |
| resource_categories | R           | Referencia para seleccionar categorías en flows cuando no hay producto específico                               |
| units_of_measure    | R           | Referencia para seleccionar unidades en flows                                                                   |

## ENUMs utilizados

| ENUM           | Valores                                    | Tabla.campo                                                 |
| -------------- | ------------------------------------------ | ----------------------------------------------------------- |
| crop_category  | annual \| perennial \| biennial            | crop_types.category (read, para mostrar info del crop_type) |
| flow_direction | input \| output                            | phase_product_flows.direction                               |
| product_role   | primary \| secondary \| byproduct \| waste | phase_product_flows.product_role                            |
| lot_tracking   | required \| optional \| none               | resource_categories.default_lot_tracking (read, contexto)   |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Patrón master-detail con secciones extensas en el detail.

- **Header de página** — Título "Cultivares" + breadcrumb (Settings > Cultivares)
- **Filtro de Crop Type** — Select prominente: filtrar cultivares por tipo de cultivo. Obligatorio seleccionar uno antes de ver cultivares
- **Botón "Nuevo cultivar"** (variant="primary") — visible solo cuando hay crop_type seleccionado

### Panel Master — Lista de Cultivares (del crop_type seleccionado)

- **Listado** — Cards o tabla con:
  - Código, Nombre, Breeder (si existe), Ciclo total (días), Yield esperado por planta (g), Estado (Activo/Inactivo)
  - Badge si tiene flows configurados ("Flows: {N} fases") o "Sin flows configurados" (warning)
  - Click → selecciona y muestra detalle
  - Acciones: Editar, Duplicar (copiar cultivar + flows), Desactivar

### Panel Detail — Cultivar Seleccionado

Organizado en secciones colapsables:

#### Sección 1: Datos Generales (read-only summary + botón editar)

- Código, nombre, breeder, genetics, ciclo total, yield/planta, dry ratio, quality grade
- Notas

#### Sección 2: Duración por Fase (phase_durations JSONB)

- Tabla derivada de las production_phases del crop_type:
  - Columnas: Fase (nombre), Duración por defecto (de production_phases.default_duration_days), Duración cultivar (editable, de phase_durations JSONB)
  - Input numérico por fase para override de duración
  - Total calculado: suma de duraciones = default_cycle_days
- Botón "Guardar duraciones"

#### Sección 3: Perfil Objetivo (target_profile JSONB)

- Tabla key-value editable:
  - Campos dinámicos: key (texto libre) + value (texto libre)
  - Ejemplos: THC: "20-25%", CBD: "<1%", Terpenos principales: "Limonene, Caryophyllene"
  - Botón "Agregar parámetro" + botón "Eliminar" por fila
- Botón "Guardar perfil"

#### Sección 4: Condiciones Óptimas (optimal_conditions JSONB)

- Tabla key-value editable con ranges:
  - Campos dinámicos: key (texto) + min (número) + max (número) + unidad (texto)
  - Ejemplos: Temperatura: 20-26 °C, Humedad: 40-60 %RH, EC: 1.2-2.4 mS/cm
  - Botón "Agregar condición" + botón "Eliminar" por fila
- Botón "Guardar condiciones"

#### Sección 5: Flujos de Producción por Fase (phase_product_flows) — LA SECCIÓN CRÍTICA

- **Tabs o acordeón por fase** — Una sección por cada production_phase del crop_type, en orden de sort_order
- **Por cada fase**:
  - Header: nombre de la fase + badges (is_transformation, is_destructive)
  - **Sub-sección Inputs** (direction = 'input'):
    - Tabla con columnas: Rol (badge), Producto o Categoría, Yield (%), Cantidad por input, Unidad, Requerido, Acciones
    - Botón "Agregar input"
  - **Sub-sección Outputs** (direction = 'output'):
    - Misma estructura que inputs
    - Botón "Agregar output"
  - Cada fila de flow es editable inline:
    - Select: product_role — primary / secondary / byproduct / waste
    - Select: Producto (opt) — búsqueda en products con autocomplete. Puede estar vacío si no se han creado productos aún
    - Select: Categoría (opt) — de resource_categories. Se usa cuando el producto específico no existe aún
    - Input numérico: expected_yield_pct (opt) — porcentaje de rendimiento
    - Input numérico: expected_quantity_per_input (opt) — cantidad esperada por unidad de input
    - Select: Unidad (opt) — de units_of_measure
    - Toggle: Requerido (is_required) — default true
    - Input numérico: sort_order
    - Input: Notas (opt)
    - Acciones: Eliminar fila
  - **Validación**: exactamente uno de product_id o product_category_id debe estar presente (o ambos pueden ser null para registro incompleto marcado visualmente)
- **Botón "Copiar flujos de otro cultivar"** — Acción global para la sección de flows:
  - Select: cultivar origen (del mismo crop_type, excluyendo el actual)
  - Confirmar → copia todos los phase_product_flows del cultivar seleccionado al actual
  - Warning si el cultivar actual ya tiene flows: "Esto reemplazará los flows existentes. ¿Continuar?"

### Dialog: Nuevo/Editar Cultivar

- Select: Tipo de cultivo (pre-llenado del filtro activo, read-only)
- Input: Código (req) — ej: "GELATO-41"
- Input: Nombre (req) — ej: "Gelato #41"
- Input: Breeder (opt) — ej: "Seed Junky Genetics"
- Input: Genetics (opt) — ej: "Sunset Sherbet × Thin Mint GSC"
- Input numérico: Ciclo total (días, opt) — se calcula automáticamente de phase_durations si están configuradas
- Input numérico: Yield esperado por planta (g, opt)
- Input numérico: Ratio seco/húmedo (decimal, opt) — ej: 0.25
- Input: Quality grade (opt) — ej: "Premium Indoor"
- Input numérico: Densidad plantas/m2 (opt)
- Textarea: Notas (opt)
- Botón "Guardar"

**Responsive**: En móvil, master y detail se apilan. Secciones de detail son acordeones. Tabla de flows scrollable horizontal.

## Requisitos funcionales

### Cultivares

- **RF-01**: Al cargar, mostrar select de crop_type. Sin selección, mostrar: "Selecciona un tipo de cultivo para ver sus cultivares"
- **RF-02**: Al seleccionar crop_type, cargar cultivares: `supabase.from('cultivars').select('*').eq('crop_type_id', id).order('name')`
- **RF-03**: CRUD estándar para cultivars con validación Zod
- **RF-04**: El código debe ser único globalmente en la empresa (UNIQUE constraint en la tabla)
- **RF-05**: Soft-delete: `is_active = false`. Warning si hay production_orders o batches activos que referencien este cultivar
- **RF-06**: Al crear un cultivar, seleccionarlo automáticamente y mostrar el panel detail vacío listo para configurar
- **RF-07**: `default_cycle_days` se calcula automáticamente como suma de `phase_durations` cuando estas se configuran. Si no hay phase_durations, es editable manualmente

### Duración por Fase (phase_durations JSONB)

- **RF-08**: Al seleccionar un cultivar, cargar las production_phases del crop_type padre y mostrar tabla de duraciones
- **RF-09**: Cada fase muestra: nombre, duración por defecto (de production_phases), y duración del cultivar (de phase_durations JSONB, editable)
- **RF-10**: Si phase_durations no tiene valor para una fase, mostrar el default de production_phases como placeholder
- **RF-11**: Al guardar duraciones, actualizar `cultivars.phase_durations` JSONB y recalcular `default_cycle_days`

### Perfil Objetivo y Condiciones Óptimas

- **RF-12**: target_profile es un JSONB key-value libre. La UI presenta una tabla editable donde el usuario agrega/elimina pares key-value
- **RF-13**: optimal_conditions es un JSONB con estructura de ranges. La UI presenta tabla con key, min, max, unit
- **RF-14**: Ambos JSONB se guardan como parte del update del cultivar

### Phase Product Flows (SECCIÓN CRÍTICA)

- **RF-15**: Al seleccionar un cultivar, cargar todos sus flows: `supabase.from('phase_product_flows').select('*, product:products(name, sku), category:resource_categories(name), unit:units_of_measure(code, name)').eq('cultivar_id', id).order('phase_id, direction, sort_order')`
- **RF-16**: Agrupar flows por fase (usando production_phases del crop_type) y dentro de cada fase, separar inputs y outputs por direction
- **RF-17**: CRUD inline de flows: crear, editar y eliminar filas directamente en la tabla por fase
- **RF-18**: Al crear un flow, `cultivar_id` y `phase_id` se inyectan automáticamente según el cultivar seleccionado y la fase de la sección
- **RF-19**: Validar que al menos uno de `product_id` o `product_category_id` esté presente. Si ambos son null, marcar la fila con warning visual "Producto o categoría requerido"
- **RF-20**: Si `product_id` está seleccionado, `product_category_id` se limpia (y viceversa). Son mutuamente excluyentes pero al menos uno debe estar presente
- **RF-21**: Los selects de productos y categorías usan búsqueda/autocomplete para escalar a catálogos grandes
- **RF-22**: El select de productos puede estar vacío si no se han creado productos aún (Fase 3). En ese caso, mostrar mensaje: "Los productos se configuran en Inventario > Productos. Puedes usar categorías mientras tanto"
- **RF-23**: **Copiar flujos de otro cultivar**:
  1. Click "Copiar flujos de otro cultivar"
  2. Select muestra cultivares del mismo crop_type (excluyendo el actual)
  3. Si el cultivar actual ya tiene flows, warning: "Esto eliminará los {N} flows existentes y los reemplazará con los del cultivar seleccionado. ¿Continuar?"
  4. Al confirmar: DELETE flows actuales → INSERT copia de flows del origen (con nuevo cultivar_id)
  5. Recargar lista de flows
- **RF-24**: Al eliminar un flow, confirmación simple: "¿Eliminar este flow?"

### Duplicar Cultivar

- **RF-25**: Acción "Duplicar" en la lista de cultivares:
  1. Crea copia del cultivar con código modificado (agrega sufijo "-COPY")
  2. Copia todos los phase_product_flows del original al nuevo cultivar
  3. Selecciona el nuevo cultivar automáticamente
  4. Dialog de edición se abre para ajustar código y nombre

### General

- **RF-26**: Roles no-admin/manager ven todo como read-only
- **RF-27**: company_id inyectado por RLS — nunca enviado desde el cliente
- **RF-28**: Tras cualquier operación CRUD, invalidar queries: `['cultivars', cropTypeId]`, `['phase-product-flows', cultivarId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id en crop_types → cultivars hereda via FK, Pattern 2). phase_product_flows hereda via cultivar_id → crop_type → company_id
- **RNF-02**: La carga de flows puede ser pesada si hay muchas fases × muchos flows. Usar React Query con staleTime apropiado
- **RNF-03**: Los selects de productos/categorías/unidades se cachean globalmente — no se refetch en cada cambio de fase
- **RNF-04**: La operación de "Copiar flujos" debe ser atómica: si falla el INSERT de algún flow, revertir el DELETE
- **RNF-05**: Validación de unicidad de código de cultivar se hace server-side (UNIQUE constraint) con error user-friendly
- **RNF-06**: Los flows con product_id o category_id pendiente se guardan pero se marcan visualmente como "incompletos" — no bloquean el guardado

## Flujos principales

### Happy path — Crear cultivar con flows

1. Admin navega a `/settings/cultivars`, selecciona crop_type "Cannabis"
2. Click "Nuevo cultivar" → dialog se abre con crop_type pre-llenado
3. Llena: código "GELATO-41", nombre "Gelato #41", breeder, genetics, yield, ratio
4. Guardar → cultivar creado → seleccionado → panel detail vacío
5. En sección "Duración por Fase": ajusta duración de cada fase
6. En sección "Perfil Objetivo": agrega THC, CBD, terpenos
7. En sección "Condiciones Óptimas": agrega temperatura, humedad, EC
8. En sección "Flujos de Producción":
   - Fase Germinación: agrega input (primary, categoría "Semillas") y output (primary, categoría "Plántulas", yield 90%)
   - Fase Floración: agrega input y output con productos específicos si existen
   - Repite para todas las fases

### Copiar flows de otro cultivar

1. Admin crea nuevo cultivar "Blue Dream" del mismo crop_type "Cannabis"
2. En sección de flows, click "Copiar flujos de otro cultivar"
3. Selecciona "Gelato #41" como origen
4. Confirma → todos los flows de Gelato se copian a Blue Dream
5. Ajusta yields y productos específicos de Blue Dream

### Crear flow con solo categoría (sin producto)

1. En Fase 2, no hay productos creados aún
2. Admin agrega flow: direction=input, role=primary, product_id=null, category_id="Material Vegetal"
3. Warning visual: "Producto específico pendiente — se puede asignar cuando existan productos en el catálogo"
4. El flow se guarda correctamente con solo category_id

### Duplicar cultivar

1. Admin click "Duplicar" en cultivar "Gelato #41"
2. Se crea "GELATO-41-COPY" con todos los datos y flows copiados
3. Dialog de edición se abre → admin cambia código a "GELATO-41-OUTDOOR" y nombre
4. Guardar → cultivar duplicado listo con flows heredados

### Desactivar cultivar con batches activos

1. Admin intenta desactivar cultivar "Gelato #41"
2. Warning: "Este cultivar tiene 2 batches activos y 1 orden en progreso. Desactivarlo impedirá crear nuevas órdenes. Los batches activos no se verán afectados. ¿Continuar?"
3. Admin confirma → cultivar desactivado

## Estados y validaciones

### Estados de UI — Master

| Estado       | Descripción                                                             |
| ------------ | ----------------------------------------------------------------------- |
| no-crop-type | Sin crop_type seleccionado — "Selecciona un tipo de cultivo"            |
| loading      | Skeleton de lista                                                       |
| loaded       | Lista de cultivares del crop_type seleccionado                          |
| empty        | Sin cultivares — "No hay cultivares para {crop_type}. Crea el primero." |
| selected     | Un cultivar seleccionado, panel detail visible                          |

### Estados de UI — Detail

| Estado      | Descripción                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| loading     | Skeleton de secciones                                                        |
| loaded      | Todas las secciones visibles con datos                                       |
| saving      | Indicador de guardado en la sección activa                                   |
| flows-empty | Sin flows configurados — "Configura los flujos de producción para cada fase" |

### Validaciones Zod — Cultivar

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
crop_type_id: z.string().uuid('Tipo de cultivo requerido')
breeder: z.string().max(200).optional().or(z.literal(''))
genetics: z.string().max(200).optional().or(z.literal(''))
default_cycle_days: z.number().int().positive().nullable().optional()
expected_yield_per_plant_g: z.number().positive().nullable().optional()
expected_dry_ratio: z.number().min(0).max(1).nullable().optional()
quality_grade: z.string().max(100).optional().or(z.literal(''))
density_plants_per_m2: z.number().positive().nullable().optional()
notes: z.string().optional().or(z.literal(''))
phase_durations: z.record(z.string(), z.number().int().positive()).optional()
target_profile: z.record(z.string(), z.string()).optional()
optimal_conditions: z.record(z.string(), z.object({
  min: z.number().nullable().optional(),
  max: z.number().nullable().optional(),
  unit: z.string().optional(),
})).optional()
```

### Validaciones Zod — Phase Product Flow

```
cultivar_id: z.string().uuid()
phase_id: z.string().uuid()
direction: z.enum(['input', 'output'], { message: 'Selecciona dirección' })
product_role: z.enum(['primary', 'secondary', 'byproduct', 'waste'], { message: 'Selecciona un rol' })
product_id: z.string().uuid().nullable().optional()
product_category_id: z.string().uuid().nullable().optional()
expected_yield_pct: z.number().min(0).max(100).nullable().optional()
expected_quantity_per_input: z.number().positive().nullable().optional()
unit_id: z.string().uuid().nullable().optional()
is_required: z.boolean().default(true)
sort_order: z.number().int().min(0).default(0)
notes: z.string().optional().or(z.literal(''))
```

Con refinamiento: al menos uno de `product_id` o `product_category_id` debe estar presente (soft warning, no blocking).

### Errores esperados

| Escenario                         | Mensaje al usuario                                                           |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Código duplicado (cultivar)       | "Ya existe un cultivar con este código" (inline)                             |
| Yield fuera de rango              | "El porcentaje debe estar entre 0 y 100" (inline)                            |
| Dry ratio fuera de rango          | "El ratio debe estar entre 0 y 1" (inline)                                   |
| Flow sin producto ni categoría    | "Asigna un producto o categoría a este flow" (warning visual, no bloqueante) |
| Copiar flows — cultivar sin flows | "El cultivar seleccionado no tiene flows configurados" (toast)               |
| Error al copiar flows             | "Error al copiar flujos. Los flows anteriores se mantienen" (toast)          |
| Error de red                      | "Error de conexión. Intenta nuevamente" (toast)                              |
| Permiso denegado                  | "No tienes permisos para modificar cultivares" (toast)                       |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/crop-types` (Fase 2) — crop_types y production_phases deben existir primero
  - `/settings/catalog` (Fase 2) — resource_categories y units_of_measure usadas en flows
  - `/inventory/products` (Fase 3) — products referenciados en flows (pueden no existir aún)
  - `/settings/activity-templates` (Fase 2) — templates referencian fases que vienen del crop_type del cultivar
  - `/production/orders` (Fase 4) — órdenes seleccionan cultivar y usan sus flows para cálculo de yields
- **React Query**: Cache keys `['cultivars', cropTypeId]`, `['phase-product-flows', cultivarId]`, `['products']` (global), `['resource-categories']` (global), `['units-of-measure']` (global)
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para CRUD

## Implementation Notes

- **Implemented**: 2026-02-26
- **Migration**: `supabase/migrations/00000000000005_cultivars.sql` — flow_direction + product_role ENUMs, cultivars (Pattern 2 RLS via crop_type_id), phase_product_flows (Pattern 2 nested RLS via cultivar_id → crop_types). product_id FK to products deferred to Phase 3
- **Schemas**: `packages/schemas/src/cultivars.ts` — cultivarSchema (no code regex constraint — codes can be uppercase like GELATO-41), phaseProductFlowSchema
- **Page**: `app/(dashboard)/settings/cultivars/page.tsx` — Server Component, parallel fetch of crop types, cultivars, phases, flows, categories, units. JSONB fields cast to typed Records
- **Client**: `components/settings/cultivars-client.tsx` — master-detail with crop type filter select
- **Master panel**: Card-based cultivar list with flow count badges, inline edit/duplicate/deactivate
- **Detail panel**: 5 collapsible sections (general info, phase durations, target profile, optimal conditions, phase product flows)
- **Phase durations**: Editable table derived from production_phases with cultivar override values stored in phase_durations JSONB. Auto-computes total cycle days
- **Target profile**: Key-value editor, stored as JSONB Record<string, string>
- **Optimal conditions**: Key-min-max-unit editor, stored as JSONB Record<string, {min, max, unit}>
- **Phase product flows**: Grouped by phase with expandable accordions. Inputs/outputs separated by direction. Inline editing for role, category, yield%, qty/input, unit, is_required. Warning indicator when product_id and product_category_id are both null
- **Copy flows**: Dialog selects source cultivar, fetches flows, deletes existing + inserts copies. Warning if replacing existing flows
- **Duplicate cultivar**: Creates copy with "-COPY" suffix code, copies all flows
- **Products**: product_id FK deferred since products table doesn't exist yet. Message shown: "Los productos se configuran en Inventario > Productos. Puedes usar categorías mientras tanto"
- **Cache invalidation**: Uses router.refresh() to re-trigger Server Component
- **Drag-and-drop for flows**: Not implemented — flows use inline editing and delete/re-add pattern
