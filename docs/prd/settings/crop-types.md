# Tipos de Cultivo y Fases de Producción

## Metadata

- **Ruta**: `/settings/crop-types`
- **Roles con acceso**: admin, manager (lectura y escritura), supervisor, operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado master, Client Component para formularios y detalle de fases)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Permitir configurar los tipos de cultivo de la empresa y sus fases de producción. Cada crop_type define un ciclo productivo con fases configurables que determinan cómo se mueve un batch a través del sistema. Las fases soportan secuencia lineal, bifurcaciones (ej: fase "madre" bifurca desde "vegetativo"), y flags que controlan transformación, destrucción, cambio de zona, entry/exit points para órdenes parciales.

Esta configuración es prerequisito para crear cultivares, órdenes de producción y schedules de cultivo.

Usuarios principales: admin y manager durante la configuración del sistema productivo.

## Tablas del modelo involucradas

| Tabla             | Operaciones | Notas                                                                                                                     |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| crop_types        | R/W         | CRUD completo. Soft-delete via is_active. RLS Pattern 1 + Pattern 3                                                       |
| production_phases | R/W         | CRUD completo vinculado al crop_type seleccionado. Sorteable. Flags configurables. depends_on_phase_id para bifurcaciones |

## ENUMs utilizados

| ENUM          | Valores                         | Tabla.campo         |
| ------------- | ------------------------------- | ------------------- |
| crop_category | annual \| perennial \| biennial | crop_types.category |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Patrón master-detail.

- **Header de página** — Título "Tipos de Cultivo" + breadcrumb (Settings > Tipos de Cultivo) + botón "Nuevo tipo de cultivo" (variant="primary")

### Panel Master — Lista de Crop Types

- **Listado** — Cards o tabla con:
  - Icono (si existe), Nombre, Código, Nombre científico (si existe), Categoría (badge: annual/perennial/biennial), Marco regulatorio (si existe), Cantidad de fases configuradas, Estado (Activo/Inactivo)
  - Click en un crop_type → selecciona y muestra detalle de fases
  - Acciones: Editar (dialog), Desactivar/Reactivar
- **Toggle** — Mostrar/ocultar inactivos

### Panel Detail — Fases de Producción (del crop_type seleccionado)

- **Header de sección** — Nombre del crop_type seleccionado + botón "Nueva fase" (variant="outline")
- **Lista sorteable** (drag-and-drop para reordenar sort_order) — Cada fase muestra:
  - Indicador de sort_order (número o drag handle)
  - Nombre y código
  - Duración por defecto (días, si aplica. "Indefinida" si null)
  - Badges de flags activos:
    - "Transforma" (is_transformation = true)
    - "Destructiva" (is_destructive = true)
    - "Cambio de zona" (requires_zone_change = true)
    - "Opcional" (can_skip = true)
    - "Entry point" (can_be_entry_point = true)
    - "Exit point" (can_be_exit_point = true)
  - Dependencia visual: si depends_on_phase_id está seteado, mostrar flecha/línea desde la fase dependiente con label "Bifurca desde: {nombre fase}"
  - Acciones: Editar (inline expand o dialog), Eliminar (solo si no hay cultivars que la referencien)
- **Estado vacío** — "Configura las fases del ciclo productivo para {nombre crop_type}"
- **Diagrama visual** (opcional) — Representación visual del flujo de fases: lineal con bifurcaciones marcadas

### Dialog: Nuevo/Editar Crop Type

- Input: Código (req) — ej: "cannabis", "blueberry"
- Input: Nombre (req) — ej: "Cannabis Medicinal"
- Input: Nombre científico (opt) — ej: "Cannabis sativa L."
- Select: Categoría (req) — annual / perennial / biennial
- Input: Marco regulatorio (opt) — ej: "Resolución 227/2022"
- Input: Icono (opt)
- Botón "Guardar"

### Dialog/Inline: Nueva/Editar Fase

- Input: Código (req) — ej: "germination", "flowering"
- Input: Nombre (req) — ej: "Germinación", "Floración"
- Input numérico: Duración por defecto (días, opt) — null para fases indefinidas (ej: madre)
- Input: Icono (opt)
- Input: Color (opt)
- Select: Depende de fase (opt) — lista de otras fases del mismo crop_type. Define bifurcación
- **Fieldset de flags** (checkboxes):
  - Es transformación (is_transformation) — "El producto cambia de estado en esta fase"
  - Es destructiva (is_destructive) — "El input se destruye (ej: cosecha). Si false, el input se preserva (ej: madre produce clones)"
  - Requiere cambio de zona (requires_zone_change) — "El batch debe moverse a otra zona"
  - Se puede saltar (can_skip) — "Fase opcional en órdenes de producción"
  - Puede ser punto de entrada (can_be_entry_point) — "Permite iniciar una orden desde esta fase (ej: comprar esquejes = empezar en propagación)"
  - Puede ser punto de salida (can_be_exit_point) — "Permite terminar una orden en esta fase (ej: vender sin empacar)"
- Botón "Guardar"

**Responsive**: En móvil, master y detail se apilan verticalmente. Lista de fases es scrollable vertical sin drag-and-drop (reordenar via botones arriba/abajo).

## Requisitos funcionales

### Crop Types

- **RF-01**: Al cargar, obtener lista de crop types: `supabase.from('crop_types').select('*, phases:production_phases(count)').order('name')`
- **RF-02**: Al seleccionar un crop_type, cargar sus fases: `supabase.from('production_phases').select('*').eq('crop_type_id', id).order('sort_order')`
- **RF-03**: CRUD estándar para crop_types con validación Zod
- **RF-04**: El código debe ser único dentro de la empresa (case-insensitive)
- **RF-05**: Soft-delete: `is_active = false`. No se puede desactivar si hay cultivars activos que lo referencien — mostrar warning con opción de forzar
- **RF-06**: Al crear un nuevo crop_type, seleccionarlo automáticamente y mostrar el panel de fases vacío

### Fases de Producción

- **RF-07**: CRUD de fases vinculadas al crop_type seleccionado. Al crear, `crop_type_id` se inyecta automáticamente
- **RF-08**: El sort_order se gestiona via drag-and-drop. Al soltar, actualizar sort_order de todas las fases afectadas en una sola operación batch
- **RF-09**: El código de fase debe ser único dentro del crop_type
- **RF-10**: `depends_on_phase_id` solo puede apuntar a otra fase del mismo crop_type. No puede apuntar a sí misma. No se permiten ciclos (validar que la cadena de dependencias no forme un loop)
- **RF-11**: Si `depends_on_phase_id` está seteado, la fase es una bifurcación: existe en paralelo a la cadena lineal principal. Mostrar esto visualmente
- **RF-12**: `is_destructive` solo tiene sentido si `is_transformation = true`. Si is_transformation es false, is_destructive se deshabilita y se setea a false automáticamente
- **RF-13**: Al eliminar una fase, verificar que:
  - No hay cultivars con phase_product_flows que la referencien
  - No hay otras fases con depends_on_phase_id apuntando a ella
  - No hay activity_template_phases que la referencien
  - Si hay referencias, mostrar error: "No se puede eliminar: esta fase está en uso por {N} cultivares y {M} templates"
- **RF-14**: Al agregar la primera fase, sort_order = 1. Las siguientes incrementan
- **RF-15**: Al reordenar fases, las dependencias (depends_on_phase_id) se mantienen — solo cambia sort_order

### General

- **RF-16**: Roles no-admin/manager ven todo como read-only
- **RF-17**: company_id inyectado por RLS — nunca enviado desde el cliente
- **RF-18**: Tras cualquier operación CRUD, invalidar queries: `['crop-types']`, `['production-phases', cropTypeId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id en crop_types) + Pattern 3 (write admin/manager). production_phases hereda aislamiento via FK a crop_types (Pattern 2)
- **RNF-02**: El drag-and-drop para reordenar fases usa optimistic update — el UI refleja el cambio inmediatamente y revierte si el save falla
- **RNF-03**: Validación de ciclos en depends_on_phase_id se hace client-side para UX inmediato y server-side como constraint
- **RNF-04**: La carga de fases del crop_type seleccionado es instantánea si ya están en cache (React Query staleTime)
- **RNF-05**: El panel de detalle muestra un skeleton mientras carga fases de un crop_type recién seleccionado

## Flujos principales

### Happy path — Crear crop_type con fases

1. Admin navega a `/settings/crop-types`
2. Click "Nuevo tipo de cultivo" → dialog se abre
3. Llena código "cannabis", nombre "Cannabis Medicinal", categoría "annual"
4. Guardar → crop_type creado → seleccionado automáticamente → panel detail vacío
5. Click "Nueva fase" → dialog/inline se abre
6. Crea fase "germinación": code=germination, duration=7, is_transformation=true, is_destructive=true
7. Repite para propagación, vegetativo, floración, cosecha, secado, empaque
8. Opcionalmente crea fase "madre": depends_on_phase=vegetativo, is_transformation=true, is_destructive=false, duration=null

### Reordenar fases

1. Admin arrastra la fase "secado" de posición 6 a posición 5
2. Optimistic update: UI se actualiza inmediatamente
3. Batch update de sort_order en el servidor
4. Si falla, revert al orden anterior con toast de error

### Crear bifurcación (fase madre)

1. Admin click "Nueva fase" → llena código "madre", nombre "Planta Madre"
2. Selecciona "Depende de: Vegetativo" → UI muestra indicador visual de bifurcación
3. Marca: is_transformation=true, is_destructive=false (la madre produce clones sin destruirse)
4. No marca can_skip (la fase madre NO es skippable si la orden la incluye)
5. Duración: vacía (indefinida — la madre vive hasta que se retire)
6. Guardar → fase aparece con indicador "Bifurca desde: Vegetativo"

### Desactivar crop_type con cultivars

1. Admin intenta desactivar crop_type "Cannabis"
2. Warning: "Este tipo de cultivo tiene 3 cultivares activos. Desactivarlo impedirá crear nuevas órdenes con estos cultivares. ¿Continuar?"
3. Admin confirma → crop_type desactivado → badge "Inactivo"

### Eliminar fase en uso

1. Admin intenta eliminar fase "floración" del crop_type Cannabis
2. Error: "No se puede eliminar: esta fase está en uso por 2 cultivares (Gelato, Blue Dream) y 5 templates de actividad"
3. La fase no se elimina

## Estados y validaciones

### Estados de UI — Master

| Estado   | Descripción                                                     |
| -------- | --------------------------------------------------------------- |
| loading  | Skeleton de lista                                               |
| loaded   | Lista de crop_types, uno seleccionado                           |
| empty    | Sin crop_types — "Crea tu primer tipo de cultivo para comenzar" |
| selected | Un crop_type seleccionado, panel detail visible                 |

### Estados de UI — Detail (Fases)

| Estado     | Descripción                                            |
| ---------- | ------------------------------------------------------ |
| loading    | Skeleton de fases                                      |
| loaded     | Lista de fases sorteable                               |
| empty      | Sin fases — "Configura las fases del ciclo productivo" |
| reordering | Drag-and-drop activo                                   |

### Validaciones Zod — Crop Type

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres').regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
scientific_name: z.string().max(200).optional().or(z.literal(''))
category: z.enum(['annual', 'perennial', 'biennial'], { message: 'Selecciona una categoría' })
regulatory_framework: z.string().max(200).optional().or(z.literal(''))
icon: z.string().max(50).optional().or(z.literal(''))
```

### Validaciones Zod — Fase de Producción

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres').regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
default_duration_days: z.number().int().positive('Debe ser mayor a 0').nullable().optional()
is_transformation: z.boolean().default(false)
is_destructive: z.boolean().default(false)
requires_zone_change: z.boolean().default(false)
can_skip: z.boolean().default(false)
can_be_entry_point: z.boolean().default(false)
can_be_exit_point: z.boolean().default(false)
depends_on_phase_id: z.string().uuid().nullable().optional()
icon: z.string().max(50).optional().or(z.literal(''))
color: z.string().max(20).optional().or(z.literal(''))
```

Con refinamiento: si `is_transformation = false`, entonces `is_destructive` debe ser `false`.

### Errores esperados

| Escenario                    | Mensaje al usuario                                                       |
| ---------------------------- | ------------------------------------------------------------------------ |
| Código duplicado (crop_type) | "Ya existe un tipo de cultivo con este código" (inline)                  |
| Código duplicado (fase)      | "Ya existe una fase con este código en este tipo de cultivo" (inline)    |
| Dependencia circular         | "No se puede crear dependencia circular entre fases" (inline)            |
| Auto-dependencia             | "Una fase no puede depender de sí misma" (inline)                        |
| Eliminar fase en uso         | "No se puede eliminar: esta fase está en uso por {N} cultivares" (toast) |
| Desactivar crop_type en uso  | Warning dialog con conteo de cultivars afectados                         |
| Error de red                 | "Error de conexión. Intenta nuevamente" (toast)                          |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/cultivars` (Fase 2) — cada cultivar referencia un crop_type y sus production_phases
  - `/settings/activity-templates` (Fase 2) — activity_template_phases referencia production_phases
  - `/settings/catalog` (Fase 2) — tipos de actividad se usan en templates pero no directamente aquí
  - `/production/orders` (Fase 4) — las órdenes seleccionan entry/exit phase de las production_phases
- **React Query**: Cache keys `['crop-types']`, `['production-phases', cropTypeId]`
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para CRUD

## Implementation Notes

- **Implemented**: 2026-02-26
- **Migration**: `supabase/migrations/00000000000004_crop_types.sql` — crop_category ENUM, crop_types (Pattern 1 RLS), production_phases (Pattern 2 FK-based RLS via crop_type_id subquery)
- **Schemas**: `packages/schemas/src/crop-types.ts` — cropTypeSchema, productionPhaseSchema with refinement (is_destructive requires is_transformation)
- **Page**: `app/(dashboard)/settings/crop-types/page.tsx` — Server Component, parallel fetch of crop types (with phase counts via join) and all phases
- **Client**: `components/settings/crop-types-client.tsx` — master-detail layout
- **Master panel**: Card-based crop type list with category badges, phase counts, inline edit/deactivate. Selected item highlighted with border
- **Detail panel**: Phases list with sort_order, flag badges (Transforma, Destructiva, Cambio de zona, Opcional, Entry, Exit), bifurcation indicator with GitBranch icon
- **Reordering**: Up/down arrow buttons (not drag-and-drop) for simplicity. Swaps sort_order values between adjacent phases
- **Phase dialog**: All 6 boolean flags as Switch toggles. is_destructive auto-disabled when is_transformation is off. depends_on_phase select with cycle prevention
- **Drag-and-drop**: Deferred — using up/down buttons for now. Can add DnD library later if needed
- **CRUD approach**: PostgREST via browser Supabase client. company_id auto-injected via DEFAULT for crop_types. production_phases uses crop_type_id FK
- **Cache invalidation**: Uses router.refresh() to re-trigger Server Component
