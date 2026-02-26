# Catálogos Base

## Metadata

- **Ruta**: `/settings/catalog`
- **Roles con acceso**: admin, manager (lectura y escritura), supervisor, operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listados, Client Component para formularios en dialogs)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Centralizar la gestión de tres catálogos base independientes que sirven como referencia para el resto del sistema: categorías de recursos (jerarquía para clasificar productos e inventario), unidades de medida (con conversiones intra-dimensión), y tipos de actividad (clasificación de primer nivel para agrupación y reporting). Estos catálogos deben existir antes de crear productos, templates de actividad o configurar flujos de producción.

Usuarios principales: admin y manager durante la configuración inicial del sistema.

## Tablas del modelo involucradas

| Tabla               | Operaciones | Notas                                                                                                                  |
| ------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| resource_categories | R/W         | CRUD completo. Jerarquía con parent_id. Soft-delete via is_active. RLS Pattern 1 + Pattern 3                           |
| units_of_measure    | R/W         | CRUD completo. Agrupadas por dimension ENUM. Conversiones via base_unit_id + to_base_factor. RLS Pattern 1 + Pattern 3 |
| activity_types      | R/W         | CRUD completo. Lista plana simple. Soft-delete via is_active. RLS Pattern 1 + Pattern 3                                |

## ENUMs utilizados

| ENUM           | Valores                                                            | Tabla.campo                              |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| lot_tracking   | required \| optional \| none                                       | resource_categories.default_lot_tracking |
| unit_dimension | mass \| volume \| count \| area \| energy \| time \| concentration | units_of_measure.dimension               |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Estructura en 3 tabs independientes.

- **Header de página** — Título "Catálogos" + breadcrumb (Settings > Catálogos)
- **Tabs** — 3 tabs horizontales:
  - "Categorías de Recursos"
  - "Unidades de Medida"
  - "Tipos de Actividad"
- Tab seleccionado se refleja en query param `?tab=categories|units|activity-types` para deep-linking

### Tab 1: Categorías de Recursos

- **Botón "Nueva categoría"** (variant="primary") — visible solo para admin/manager
- **Vista de árbol jerárquico** — Renderiza categorías con indentación por nivel (parent_id)
  - Nivel 0: categorías raíz (sin parent_id)
  - Nivel 1+: subcategorías indentadas con línea visual de jerarquía
  - Cada nodo muestra: icono (si existe), nombre, código, badges de flags (Consumible / Depreciable / Transformable), badge lot_tracking, estado (Activo/Inactivo)
  - Nodos expandibles/colapsables si tienen hijos
  - Acciones por nodo (inline icons): Editar, Agregar subcategoría, Desactivar/Reactivar
- **Dialog: Nueva/Editar categoría** — Modal
  - Select: Categoría padre (opt) — tree select o select plano con indentación
  - Input: Código (req, uppercase sugerido)
  - Input: Nombre (req)
  - Input: Icono (opt) — selección de icono o texto libre
  - Input: Color (opt) — color picker
  - Toggle: Es consumible (is_consumable) — "Se agota con el uso (insumos, EPP)"
  - Toggle: Es depreciable (is_depreciable) — "Equipos con vida útil"
  - Toggle: Es transformable (is_transformable) — "Material vegetal que cambia de estado"
  - Select: Tracking de lotes (default_lot_tracking) — required / optional / none
  - Botón "Guardar" (variant="primary")

### Tab 2: Unidades de Medida

- **Botón "Nueva unidad"** (variant="primary") — visible solo para admin/manager
- **Listado agrupado por dimensión** — Secciones colapsables por dimensión ENUM
  - Cada sección: header con nombre de dimensión (Masa, Volumen, Conteo, Área, Energía, Tiempo, Concentración)
  - Dentro de cada sección: tabla con columnas: Código, Nombre, Unidad base, Factor de conversión
  - La unidad base de cada dimensión tiene factor=1 y se marca visualmente (badge "Base")
  - Acciones por fila: Editar, Eliminar (solo si no es unidad base y no está en uso)
- **Dialog: Nueva/Editar unidad** — Modal
  - Select: Dimensión (req) — mass / volume / count / area / energy / time / concentration
  - Input: Código (req) — ej: "kg", "mL", "und"
  - Input: Nombre (req) — ej: "Kilogramo", "Mililitro", "Unidad"
  - Select: Unidad base (opt) — lista de unidades existentes de la misma dimensión. Si no se selecciona, esta ES la unidad base
  - Input numérico: Factor de conversión a base (req si hay unidad base) — ej: 1000 para kg→g
  - Botón "Guardar" (variant="primary")

### Tab 3: Tipos de Actividad

- **Botón "Nuevo tipo"** (variant="primary") — visible solo para admin/manager
- **Tabla simple** — Columnas: Nombre, Categoría (opt), Estado (Activo/Inactivo), Acciones
  - Acciones por fila: Editar, Desactivar/Reactivar
  - Sin paginación (se esperan ~15-30 registros)
- **Dialog: Nuevo/Editar tipo** — Modal
  - Input: Nombre (req)
  - Input: Categoría (opt) — texto libre para agrupación
  - Botón "Guardar" (variant="primary")

**Responsive**: Tabs horizontales se convierten en select en móvil. Tabla con scroll horizontal. Tree view colapsado por defecto en móvil.

## Requisitos funcionales

### Generales

- **RF-01**: La página carga con el tab indicado en query param `?tab=`. Default: categories
- **RF-02**: Cambiar de tab actualiza el query param sin recargar la página
- **RF-03**: Roles no-admin/manager ven los catálogos como read-only (sin botones de acción, sin dialogs)
- **RF-04**: Soft-delete en todas las tablas: `is_active = false` en vez de DELETE físico
- **RF-05**: Al desactivar un registro, mostrar confirmación: "¿Desactivar {nombre}? Los registros existentes que usan esta referencia no se verán afectados"
- **RF-06**: Registros inactivos se muestran con opacidad reducida y badge "Inactivo". Toggle para mostrar/ocultar inactivos

### Categorías de Recursos

- **RF-07**: Cargar árbol completo: `supabase.from('resource_categories').select('*').order('name')` — el árbol se construye client-side desde parent_id
- **RF-08**: Al crear subcategoría, el parent_id se pre-llena con la categoría desde donde se clickeó "Agregar subcategoría"
- **RF-09**: Al crear categoría raíz, parent_id es null
- **RF-10**: Validar que el código sea único dentro de la empresa (case-insensitive)
- **RF-11**: Al desactivar una categoría padre, NO desactivar automáticamente las hijas — mostrar warning si tiene subcategorías activas
- **RF-12**: Los flags (is_consumable, is_depreciable, is_transformable) son independientes entre sí — una categoría puede tener cualquier combinación
- **RF-13**: El default_lot_tracking define el valor por defecto que heredarán los productos creados en esta categoría

### Unidades de Medida

- **RF-14**: Cargar todas las unidades: `supabase.from('units_of_measure').select('*').order('dimension, name')` — agrupar client-side por dimension
- **RF-15**: Al crear una unidad, si es la primera de su dimensión, se convierte automáticamente en unidad base (base_unit_id = null, to_base_factor = 1)
- **RF-16**: Si ya existen unidades en la dimensión seleccionada, el campo "Unidad base" se pre-llena con la unidad base existente y el factor de conversión es obligatorio
- **RF-17**: Validar que el factor de conversión sea un número positivo mayor que 0
- **RF-18**: No se puede eliminar una unidad base si tiene otras unidades que dependen de ella (base_unit_id apunta a ella)
- **RF-19**: No se puede eliminar una unidad que esté en uso por productos (FK products.default_unit_id) — mostrar error con contexto

### Tipos de Actividad

- **RF-20**: Cargar tipos: `supabase.from('activity_types').select('*').order('name')`
- **RF-21**: CRUD simple: crear, editar nombre y categoría, desactivar/reactivar
- **RF-22**: No se puede desactivar un tipo que esté en uso por templates activos — mostrar warning con opción de forzar (solo desactiva el tipo, no los templates)

### Todas las tablas

- **RF-23**: Tras cualquier operación CRUD exitosa, invalidar query cache correspondiente y mostrar toast de éxito
- **RF-24**: company_id se inyecta automáticamente por RLS — nunca se envía desde el cliente en operaciones de escritura

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id) para lectura + Pattern 3 (admin/manager) para escritura en las 3 tablas
- **RNF-02**: El árbol de categorías se renderiza eficientemente — no re-renderizar todo el árbol al expandir/colapsar un nodo
- **RNF-03**: Las unidades de medida no tienen company_id en el modelo — son globales o por empresa según implementación. Si son globales, las seed data iniciales incluyen unidades comunes (g, kg, mL, L, und)
- **RNF-04**: Validaciones de unicidad (código de categoría) se hacen client-side como UX y server-side como constraint
- **RNF-05**: Los 3 tabs comparten la misma ruta y se cargan lazily — solo el tab activo fetch data

## Flujos principales

### Happy path — Crear categoría raíz

1. Admin navega a `/settings/catalog?tab=categories`
2. Click "Nueva categoría" → dialog se abre con parent_id vacío
3. Llena código "NUTRIENT", nombre "Nutrientes", marca is_consumable=true, lot_tracking=optional
4. Click "Guardar" → validación Zod pasa → `resource_categories.insert()`
5. Dialog se cierra → toast "Categoría creada" → árbol se actualiza

### Crear subcategoría

1. En el nodo "Nutrientes", click icono "Agregar subcategoría"
2. Dialog se abre con parent_id pre-llenado = id de "Nutrientes"
3. Llena código "NUTRIENT_SALT", nombre "Sales Nutrientes"
4. Click "Guardar" → nueva categoría aparece indentada bajo "Nutrientes"

### Crear unidad de medida

1. Admin navega a tab "Unidades de Medida"
2. Click "Nueva unidad" → dialog se abre
3. Selecciona dimensión "mass" → campo base_unit muestra "Gramo (g)" como base existente
4. Llena código "kg", nombre "Kilogramo", factor=1000
5. Click "Guardar" → unidad aparece en sección "Masa" con badge "×1000 → g"

### Crear primera unidad de una dimensión

1. Click "Nueva unidad" → selecciona dimensión "concentration"
2. No hay unidades previas en esta dimensión → campo base_unit se oculta
3. Llena código "ppm", nombre "Partes por millón"
4. Al guardar, se crea como unidad base (to_base_factor=1)

### Desactivar categoría con hijos

1. Admin intenta desactivar categoría "Nutrientes" que tiene subcategorías activas
2. Warning: "Esta categoría tiene 3 subcategorías activas. Desactivarla no afectará las subcategorías. ¿Continuar?"
3. Admin confirma → categoría padre se desactiva → subcategorías siguen activas

### Vista read-only (operator)

1. Operator navega a `/settings/catalog`
2. Ve los 3 tabs con datos pero sin botones de acción
3. No puede crear, editar ni desactivar

## Estados y validaciones

### Estados de UI — Por Tab

| Estado  | Descripción                                                        |
| ------- | ------------------------------------------------------------------ |
| loading | Skeleton mientras carga datos del tab                              |
| loaded  | Datos visibles, acciones disponibles (según rol)                   |
| empty   | Sin registros — "No hay categorías configuradas. Crea la primera." |
| error   | Error al cargar — "Error al cargar catálogos. Intenta nuevamente"  |

### Estados de UI — Dialogs

| Estado     | Descripción                                   |
| ---------- | --------------------------------------------- |
| idle       | Campos vacíos (nuevo) o pre-llenados (editar) |
| submitting | Botón loading, campos read-only               |
| success    | Dialog se cierra, toast éxito                 |
| error      | Error inline o toast según tipo               |

### Validaciones Zod — Categoría de Recurso

```
parent_id: z.string().uuid().nullable().optional()
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres').regex(/^[A-Z0-9_]+$/, 'Solo letras mayúsculas, números y guión bajo')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
icon: z.string().max(50).optional().or(z.literal(''))
color: z.string().max(20).optional().or(z.literal(''))
is_consumable: z.boolean().default(false)
is_depreciable: z.boolean().default(false)
is_transformable: z.boolean().default(false)
default_lot_tracking: z.enum(['required', 'optional', 'none'], { message: 'Selecciona un modo de tracking' })
```

### Validaciones Zod — Unidad de Medida

```
code: z.string().min(1, 'El código es requerido').max(20, 'Máximo 20 caracteres')
name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres')
dimension: z.enum(['mass', 'volume', 'count', 'area', 'energy', 'time', 'concentration'], { message: 'Selecciona una dimensión' })
base_unit_id: z.string().uuid().nullable().optional()
to_base_factor: z.number().positive('El factor debe ser positivo').default(1)
```

### Validaciones Zod — Tipo de Actividad

```
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
category: z.string().max(100).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                             | Mensaje al usuario                                                        |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Código duplicado (categoría)          | "Ya existe una categoría con este código" (inline)                        |
| Código duplicado (unidad)             | "Ya existe una unidad con este código" (inline)                           |
| Nombre duplicado (tipo actividad)     | "Ya existe un tipo de actividad con este nombre" (inline)                 |
| Factor de conversión ≤ 0              | "El factor debe ser positivo" (inline)                                    |
| Eliminar unidad base con dependientes | "No se puede eliminar: otras unidades dependen de esta como base" (toast) |
| Eliminar unidad en uso                | "No se puede eliminar: esta unidad está asignada a {N} productos" (toast) |
| Error de red                          | "Error de conexión. Intenta nuevamente" (toast)                           |
| Permiso denegado                      | "No tienes permisos para modificar catálogos" (toast)                     |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/products` (Fase 3) — usa resource_categories para clasificar productos y units_of_measure para unidades
  - `/settings/activity-templates` (Fase 2) — usa activity_types como clasificación de primer nivel
  - `/settings/cultivars` (Fase 2) — phase_product_flows referencia units_of_measure y resource_categories
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para CRUD
- **React Query**: Cache keys `['resource-categories']`, `['units-of-measure']`, `['activity-types']`
- **Seed data**: Se recomienda proveer seed data inicial para unidades comunes (g, kg, L, mL, und) al crear una empresa
