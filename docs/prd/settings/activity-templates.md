# Templates de Actividad y Planes de Cultivo

## Metadata

- **Ruta**: `/settings/activity-templates`
- **Roles con acceso**: admin, manager (lectura y escritura), supervisor (solo lectura), operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listados, Client Component para formularios complejos)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Permitir configurar las "recetas" de actividades reutilizables (templates) y los planes maestros de cultivo (cultivation_schedules) que automatizan la programación de actividades al crear un batch. Los templates definen qué recursos se necesitan (con 5 modos de escalado), qué pasos de verificación son obligatorios (checklist), y a qué fases de producción aplican. Los planes de cultivo combinan cultivar + fases + templates + duraciones para generar automáticamente un calendario de actividades.

Usuarios principales: admin y manager (diseño de procesos), supervisor (consulta de recetas).

## Tablas del modelo involucradas

| Tabla                       | Operaciones | Notas                                                                   |
| --------------------------- | ----------- | ----------------------------------------------------------------------- |
| activity_templates          | R/W         | CRUD completo. Soft-delete via is_active. RLS Pattern 1 + Pattern 3     |
| activity_template_phases    | R/W         | Tabla de unión template↔fases. UNIQUE(template_id, phase_id)            |
| activity_template_resources | R/W         | Recursos planeados por template con quantity_basis                      |
| activity_template_checklist | R/W         | Pasos de verificación sorteables con flags is_critical y requires_photo |
| cultivation_schedules       | R/W         | Planes maestros de cultivo. phase_config JSONB                          |
| activity_types              | R           | Referencia para clasificación de primer nivel                           |
| production_phases           | R           | Referencia para seleccionar fases aplicables                            |
| crop_types                  | R           | Referencia para filtrar fases por crop_type                             |
| cultivars                   | R           | Referencia para crear cultivation_schedules                             |
| products                    | R           | Referencia para seleccionar productos en recursos del template          |
| units_of_measure            | R           | Referencia implícita via products.default_unit_id                       |

## ENUMs utilizados

| ENUM               | Valores                                                    | Tabla.campo                                |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| activity_frequency | daily \| weekly \| biweekly \| once \| on_demand           | activity_templates.frequency               |
| quantity_basis     | fixed \| per_plant \| per_m2 \| per_zone \| per_L_solution | activity_template_resources.quantity_basis |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Estructura en 2 tabs principales.

- **Header de página** — Título "Templates de Actividad" + breadcrumb (Settings > Templates)
- **Tabs** — 2 tabs:
  - "Templates" — CRUD de activity_templates con sub-secciones
  - "Planes de Cultivo" — CRUD de cultivation_schedules
- Tab seleccionado en query param `?tab=templates|schedules`

### Tab 1: Templates de Actividad

- **Barra de filtros**:
  - Select: Filtrar por tipo de actividad (activity_types)
  - Select: Filtrar por frecuencia
  - Select: Filtrar por crop_type (muestra templates que aplican a fases de ese crop_type)
  - Toggle: Mostrar inactivos
- **Botón "Nuevo template"** (variant="primary")
- **Listado de templates** — Cards o tabla:
  - Código, Nombre, Tipo de actividad (badge), Frecuencia (badge), Duración estimada (min), Fases aplicables (badges), Recursos ({N}), Checklist ({N} pasos), Estado, Acciones
  - Click → expande detalle inline o navega a vista detalle
  - Acciones: Editar, Duplicar, Desactivar

#### Detalle de Template (inline expandible o panel lateral)

Organizado en sub-secciones:

**Sub-sección A: Datos Generales** (formulario principal)

- Input: Código (req) — ej: "FERT-VEG-S1"
- Select: Tipo de actividad (req) — de activity_types
- Input: Nombre (req) — ej: "Fertirrigación Vegetativa Semana 1-2"
- Select: Frecuencia (req) — daily / weekly / biweekly / once / on_demand
- Input numérico: Duración estimada (minutos, req)
- Input numérico: Día trigger desde (opt) — día mínimo del ciclo para programar
- Input numérico: Día trigger hasta (opt) — día máximo
- Select: Depende de template (opt) — otro template que debe completarse primero
- Select: Dispara cambio de fase (opt) — production_phase a la que avanza el batch al completar
- Toggle: Dispara transformación (triggers_transformation) — "Al completar, genera transformation_out/in en inventario"
- Textarea: Metadata JSONB (opt) — key-value para configuración adicional: {EC_target, pH_target, temp_range}

**Sub-sección B: Fases Aplicables** (multi-select)

- Select de crop_type para filtrar fases disponibles
- Multi-select checklist de production_phases: marcar las fases donde este template aplica
- Al guardar, se crean/eliminan registros en activity_template_phases
- Mostrar badges de fases seleccionadas

**Sub-sección C: Recursos** (tabla editable)

- Tabla con columnas: Producto, Cantidad, Modo de Escalado (quantity_basis), Opcional, Orden, Notas, Acciones
- Botón "Agregar recurso"
- Por cada recurso:
  - Select: Producto (req) — búsqueda en products
  - Input numérico: Cantidad (req) — valor base
  - Select: Modo de escalado (req):
    - **fixed**: Cantidad fija sin importar contexto
    - **per_plant**: Cantidad × número de plantas del batch
    - **per_m2**: Cantidad × área del batch/zona
    - **per_zone**: Cantidad × número de zonas
    - **per_L_solution**: Cantidad × volumen de solución preparada
  - Toggle: Opcional (is_optional)
  - Input numérico: sort_order
  - Input: Notas (opt)
  - Acción: Eliminar

**Sub-sección D: Checklist** (lista sorteable)

- Lista drag-and-drop de pasos de verificación
- Botón "Agregar paso"
- Por cada paso:
  - Input: Instrucción (req) — ej: "Verificar EC del drenaje"
  - Toggle: Crítico (is_critical) — "Bloquea completar actividad si no se cumple"
  - Toggle: Requiere foto (requires_photo) — "El operario debe adjuntar foto para completar este paso"
  - Input: Valor esperado (opt) — ej: "5.8-6.2"
  - Input: Tolerancia (opt) — ej: "±0.2"
  - Acción: Eliminar

### Tab 2: Planes de Cultivo (Cultivation Schedules)

- **Botón "Nuevo plan"** (variant="primary")
- **Listado de planes** — Tabla:
  - Nombre, Cultivar (nombre), Total días, Fases configuradas ({N}), Estado, Acciones
  - Acciones: Editar, Duplicar, Desactivar

#### Creación/Edición de Plan de Cultivo

1. **Paso 1: Datos básicos**
   - Input: Nombre (req) — ej: "Plan Gelato Indoor 127 días"
   - Select: Cultivar (req) — al seleccionar, carga las production_phases del crop_type del cultivar
   - Input numérico: Total días (auto-calculado de duraciones por fase)

2. **Paso 2: Configuración por fase** — Por cada production_phase del crop_type:
   - Header: nombre de la fase
   - Input numérico: Duración (días) — pre-llenado desde cultivar.phase_durations o production_phases.default_duration_days
   - Multi-select: Templates asignados — de activity_templates que aplican a esta fase (filtrado por activity_template_phases)
   - Por cada template asignado, mostrar: nombre, frecuencia, recursos

3. **Vista resumen**: Timeline visual mostrando fases con duraciones y templates asignados por fase

4. Al guardar, se construye el JSONB `phase_config`: `[{phase_id, duration_days, templates: [{template_id, ...}]}]`

**Responsive**: Tabs horizontales → select en móvil. Tablas con scroll horizontal. Checklist sorteable via botones arriba/abajo en móvil.

## Requisitos funcionales

### Templates de Actividad

- **RF-01**: Cargar templates: `supabase.from('activity_templates').select('*, activity_type:activity_types(name), phases:activity_template_phases(phase:production_phases(name, crop_type_id)), resources:activity_template_resources(count), checklist:activity_template_checklist(count)').order('code')`
- **RF-02**: CRUD de templates con validación Zod. Código único por empresa
- **RF-03**: Soft-delete via is_active. Warning si hay scheduled_activities futuras que usen este template
- **RF-04**: Al crear template, las sub-secciones (fases, recursos, checklist) se configuran DESPUÉS de guardar los datos generales — el template debe existir primero para crear registros hijo
- **RF-05**: Fases aplicables: al cambiar crop_type en el filtro de fases, cargar production_phases correspondientes. Multi-select crea/elimina activity_template_phases
- **RF-06**: Recursos: CRUD inline. Al crear, `template_id` se inyecta automáticamente. Product select usa búsqueda con autocomplete
- **RF-07**: Los 5 modos de `quantity_basis` se explican con tooltip en el select:
  - fixed: "Cantidad exacta sin escalar"
  - per_plant: "Se multiplica por número de plantas del batch"
  - per_m2: "Se multiplica por metros cuadrados de la zona"
  - per_zone: "Se multiplica por número de zonas"
  - per_L_solution: "Se multiplica por litros de solución a preparar"
- **RF-08**: Checklist: CRUD inline sorteable. `step_order` se gestiona via drag-and-drop. Ítems con `is_critical = true` se marcan visualmente (ej: borde rojo, icono de alerta)
- **RF-09**: `triggers_phase_change_id` y `triggers_transformation` son campos avanzados — mostrar en sección colapsable "Configuración avanzada"
- **RF-10**: `depends_on_template_id` establece dependencia secuencial: el template B no se programa hasta que A se complete. Select muestra otros templates de la misma empresa
- **RF-11**: Duplicar template: copia datos generales + fases + recursos + checklist. Código con sufijo "-COPY"

### Planes de Cultivo

- **RF-12**: Cargar planes: `supabase.from('cultivation_schedules').select('*, cultivar:cultivars(name, crop_type:crop_types(name))').order('name')`
- **RF-13**: Al seleccionar cultivar en el formulario de plan, cargar sus production_phases y phase_durations
- **RF-14**: Por cada fase, pre-llenar duración desde cultivar.phase_durations → production_phases.default_duration_days (cascada)
- **RF-15**: El multi-select de templates por fase muestra solo templates que aplican a esa fase (verificado via activity_template_phases)
- **RF-16**: Total días se calcula automáticamente como suma de duraciones de todas las fases del plan
- **RF-17**: Al guardar, serializar en `phase_config` JSONB: `[{phase_id, duration_days, templates: [{template_id}]}]`
- **RF-18**: Soft-delete via is_active. Warning si hay batches activos que usen este schedule

### General

- **RF-19**: Roles no-admin/manager ven todo como read-only. Supervisores pueden consultar templates para entender los procesos
- **RF-20**: company_id inyectado por RLS — nunca enviado desde el cliente
- **RF-21**: Tras cualquier operación CRUD, invalidar queries relevantes

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id via activity_types o directo) + Pattern 3 (write admin/manager). Sub-tablas heredan aislamiento via FK al template (Pattern 2)
- **RNF-02**: El drag-and-drop del checklist usa optimistic update
- **RNF-03**: Los selects de productos, fases y tipos de actividad se cachean globalmente
- **RNF-04**: La creación de un template con todas sus sub-entidades no requiere Edge Function — se crean secuencialmente (template → fases → recursos → checklist). Si algún paso falla, el template queda creado parcialmente y el usuario puede completar las secciones faltantes
- **RNF-05**: El JSONB phase_config de cultivation_schedules se valida client-side para garantizar estructura consistente

## Flujos principales

### Happy path — Crear template completo

1. Admin navega a `/settings/activity-templates?tab=templates`
2. Click "Nuevo template" → formulario de datos generales
3. Llena: código "FERT-VEG-S1", tipo "Fertirrigación", nombre, frecuencia "daily", duración 30min
4. Guardar datos generales → template creado
5. Sub-sección "Fases Aplicables": selecciona crop_type "Cannabis", marca fases "Vegetativo" y "Floración"
6. Sub-sección "Recursos": agrega Ca(NO₃)₂ con quantity=0.8, basis=per_L_solution; agrega Agua con quantity=5, basis=per_plant
7. Sub-sección "Checklist": agrega "Verificar EC del drenaje" (is_critical=true, expected_value="5.8-6.2"), "Verificar pH" (is_critical=true), "Registrar volumen total" (requires_photo=false)
8. Template completo y listo para usar en planes de cultivo

### Crear plan de cultivo

1. Admin navega a tab "Planes de Cultivo"
2. Click "Nuevo plan" → formulario
3. Selecciona cultivar "Gelato #41" → fases se cargan automáticamente
4. Por cada fase: ajusta duración, selecciona templates aplicables
   - Germinación (7 días): "Riego inicial", "Monitoreo germinación"
   - Vegetativo (28 días): "Fertirrigación Veg S1", "Fertirrigación Veg S2", "Poda apical"
   - Floración (63 días): "Fertirrigación Flo", "Monitoreo tricomas"
   - etc.
5. Guardar → plan creado con phase_config JSONB completo
6. Total días se muestra: 127

### Editar recursos de un template

1. Admin selecciona template "FERT-VEG-S1" → expande detalle
2. En sub-sección "Recursos", click "Agregar recurso"
3. Selecciona producto "MgSO₄", cantidad 0.3, basis "per_L_solution"
4. Guardar → recurso agregado a la lista

### Reordenar checklist

1. Admin arrastra paso "Registrar volumen" de posición 3 a posición 1
2. Optimistic update: UI refleja nuevo orden
3. Batch update de step_order en servidor

### Duplicar template

1. Admin click "Duplicar" en template "FERT-VEG-S1"
2. Nuevo template "FERT-VEG-S1-COPY" creado con todos los datos, fases, recursos y checklist
3. Dialog de edición se abre → admin cambia código y nombre
4. Guardar

## Estados y validaciones

### Estados de UI — Templates

| Estado  | Descripción                                             |
| ------- | ------------------------------------------------------- |
| loading | Skeleton de listado                                     |
| loaded  | Lista de templates con filtros aplicados                |
| empty   | Sin templates — "Crea tu primer template de actividad"  |
| detail  | Template expandido/seleccionado mostrando sub-secciones |

### Estados de UI — Planes de Cultivo

| Estado  | Descripción                                          |
| ------- | ---------------------------------------------------- |
| loading | Skeleton                                             |
| loaded  | Lista de planes                                      |
| empty   | Sin planes — "Crea tu primer plan de cultivo"        |
| editing | Formulario de creación/edición con fases y templates |

### Validaciones Zod — Template (Datos Generales)

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres')
activity_type_id: z.string().uuid('Selecciona un tipo de actividad')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
frequency: z.enum(['daily', 'weekly', 'biweekly', 'once', 'on_demand'], { message: 'Selecciona una frecuencia' })
estimated_duration_min: z.number().int().positive('Debe ser mayor a 0')
trigger_day_from: z.number().int().min(0).nullable().optional()
trigger_day_to: z.number().int().min(0).nullable().optional()
depends_on_template_id: z.string().uuid().nullable().optional()
triggers_phase_change_id: z.string().uuid().nullable().optional()
triggers_transformation: z.boolean().default(false)
metadata: z.record(z.string(), z.unknown()).optional()
```

Con refinamiento: `trigger_day_to` debe ser ≥ `trigger_day_from` si ambos están presentes.

### Validaciones Zod — Recurso del Template

```
product_id: z.string().uuid('Selecciona un producto')
quantity: z.number().positive('La cantidad debe ser mayor a 0')
quantity_basis: z.enum(['fixed', 'per_plant', 'per_m2', 'per_zone', 'per_L_solution'], { message: 'Selecciona un modo de escalado' })
is_optional: z.boolean().default(false)
sort_order: z.number().int().min(0).default(0)
notes: z.string().optional().or(z.literal(''))
```

### Validaciones Zod — Paso de Checklist

```
instruction: z.string().min(1, 'La instrucción es requerida').max(500, 'Máximo 500 caracteres')
is_critical: z.boolean().default(false)
requires_photo: z.boolean().default(false)
expected_value: z.string().max(100).optional().or(z.literal(''))
tolerance: z.string().max(50).optional().or(z.literal(''))
```

### Validaciones Zod — Plan de Cultivo

```
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
cultivar_id: z.string().uuid('Selecciona un cultivar')
total_days: z.number().int().positive()
phase_config: z.array(z.object({
  phase_id: z.string().uuid(),
  duration_days: z.number().int().positive('Duración debe ser mayor a 0'),
  templates: z.array(z.object({
    template_id: z.string().uuid(),
  })),
})).min(1, 'Configura al menos una fase')
```

### Errores esperados

| Escenario                         | Mensaje al usuario                                            |
| --------------------------------- | ------------------------------------------------------------- |
| Código duplicado (template)       | "Ya existe un template con este código" (inline)              |
| Recurso sin producto              | "Selecciona un producto" (inline)                             |
| Checklist sin instrucción         | "La instrucción es requerida" (inline)                        |
| Plan sin fases                    | "Configura al menos una fase" (inline)                        |
| Duración ≤ 0                      | "La duración debe ser mayor a 0" (inline)                     |
| trigger_day_to < trigger_day_from | "El día final debe ser mayor o igual al día inicial" (inline) |
| Error de red                      | "Error de conexión. Intenta nuevamente" (toast)               |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/catalog` (Fase 2) — activity_types usados como clasificación
  - `/settings/crop-types` (Fase 2) — production_phases referenciadas en template_phases y schedules
  - `/settings/cultivars` (Fase 2) — cultivars seleccionados para crear cultivation_schedules
  - `/inventory/products` (Fase 3) — products referenciados en template_resources
  - `/activities/schedule` (Fase 5) — scheduled_activities generadas desde cultivation_schedules
  - `/activities/execute/[id]` (Fase 5) — activities ejecutadas usando template como receta
- **React Query**: Cache keys `['activity-templates']`, `['template-phases', templateId]`, `['template-resources', templateId]`, `['template-checklist', templateId]`, `['cultivation-schedules']`
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para CRUD

## Implementation Notes

- **Implemented**: 2026-02-26
- **Migration**: `supabase/migrations/00000000000006_activity_templates.sql` — activity_frequency + quantity_basis ENUMs. 5 tables: activity_templates (Pattern 1), activity_template_phases (junction), activity_template_resources, activity_template_checklist (Pattern 2), cultivation_schedules (Pattern 1). product_id FK in resources deferred to Phase 3
- **Schemas**: `packages/schemas/src/activity-templates.ts` — activityTemplateSchema (with trigger_day_to >= trigger_day_from refinement), templateResourceSchema, templateChecklistSchema, cultivationScheduleSchema
- **Page**: `app/(dashboard)/settings/activity-templates/page.tsx` — Server Component, parallel fetch of 9 datasets. JSONB fields cast to typed Records
- **Client**: `components/settings/activity-templates-client.tsx` — 2 tabs via shadcn Tabs with URL param sync
- **Tab 1 — Templates**: Filterable list (by type, frequency, crop_type, inactive toggle). Cards with expandable detail showing 3 sub-sections: phases (toggle buttons per crop_type), resources (inline CRUD with quantity_basis select), checklist (sorteable via up/down buttons, inline editing with critical/photo toggles)
- **Tab 2 — Cultivation Schedules**: Card list with cultivar name, total days, phase count. Create/edit dialog with cultivar select → auto-loads phases → duration inputs + template toggle buttons per phase → serializes to phase_config JSONB
- **Advanced config**: Collapsible section in template dialog for trigger_day_from/to, depends_on_template_id, triggers_phase_change_id, triggers_transformation
- **Duplicate**: Copies template + phases + resources + checklist with "-COPY" code suffix
- **Products**: product_id FK deferred since products table doesn't exist yet. Resources stored without product_id, warning icon shown
- **Metadata JSONB**: Template metadata field not exposed in UI (advanced users can edit via API). Stored as Json type
- **Cache invalidation**: Uses router.refresh() to re-trigger Server Component
