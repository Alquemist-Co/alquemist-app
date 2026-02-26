# Catálogo de Productos

## Metadata

- **Ruta**: `/inventory/products`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (solo lectura), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para dialog/página de creación/edición)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Gestionar el catálogo maestro de productos de la empresa: insumos, materiales vegetales, productos intermedios, productos finales y cualquier otro recurso trazable. Cada producto define su unidad de medida, categoría, tipo de adquisición, seguimiento de lote, y opcionalmente sus requerimientos regulatorios (sección inline de `product_regulatory_requirements`).

Los productos son referenciados desde prácticamente todo el sistema: phase_product_flows, inventory_items, activity_template_resources, shipment_items, recipes. Es la tabla de catálogo más importante del dominio de inventario.

Usuarios principales: admin y manager que configuran los recursos del sistema.

## Tablas del modelo involucradas

| Tabla                           | Operaciones | Notas                                                                                                                          |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| products                        | R/W         | CRUD completo. RLS Pattern 1 (company_id implícito via category). Soft delete via is_active                                    |
| product_regulatory_requirements | R/W         | Nested CRUD: sección inline dentro del editor de producto. Permite crear/editar/eliminar requerimientos regulatorios asociados |
| resource_categories             | R           | Select para asignar categoría al producto                                                                                      |
| units_of_measure                | R           | Select para asignar unidad de medida por defecto                                                                               |
| cultivars                       | R           | Select para vincular producto vegetal con variedad (optional)                                                                  |
| suppliers                       | R           | Select para asignar proveedor preferido (optional)                                                                             |
| regulatory_doc_types            | R           | Select para agregar requerimiento regulatorio (en la sección inline)                                                           |

## ENUMs utilizados

| ENUM                     | Valores                                             | Tabla.campo                                      |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------ |
| product_procurement_type | purchased \| produced \| both                       | products.procurement_type                        |
| product_lot_tracking     | required \| optional \| none                        | products.lot_tracking                            |
| compliance_scope         | per_batch \| per_lot \| per_product \| per_facility | product_regulatory_requirements.applies_to_scope |
| compliance_frequency     | once \| per_production \| annual \| per_shipment    | product_regulatory_requirements.frequency        |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Productos" + breadcrumb (Inventario > Productos) + botón "Nuevo producto" (variant="primary", visible solo para admin/manager)
- **Barra de filtros** — Inline
  - Input: Buscar por nombre o SKU
  - Select: Categoría (Todas / lista de resource_categories activas)
  - Select: Tipo de adquisición (Todos / Comprado / Producido / Ambos)
  - Select: Estado (Todos / Activos / Inactivos)
- **Tabla de productos** — Server Component con datos paginados
  - Columnas: SKU, Nombre, Categoría (nombre de resource_category), Unidad (code de unit_of_measure), Tipo adquisición (badge), Seguimiento de lote (badge), Proveedor preferido (nombre o "—"), Precio (formateado con moneda), Estado (badge), Acciones
  - Acciones por fila (dropdown menu, solo admin/manager):
    - "Editar" → abre página/dialog de edición con sección regulatoria
    - "Desactivar" / "Reactivar" → toggle is_active con confirmación
  - Paginación server-side (20 por página)
  - Ordenamiento por nombre (default) o por SKU
- **Dialog/Página: Crear/Editar producto** — Modal amplio o página dedicada (dado la cantidad de campos)
  - **Sección 1: Datos Básicos**
    - Input: SKU (req, unique) — código del producto
    - Input: Nombre (req)
    - Select: Categoría (req) — lista de resource_categories activas, agrupadas por parent
    - Select: Unidad de medida por defecto (req) — lista de units_of_measure activas
    - Select: Cultivar (opt) — solo para productos vegetales, filtra por cultivars activos
    - Select: Tipo de adquisición (req) — purchased / produced / both con labels:
      - purchased → "Comprado"
      - produced → "Producido"
      - both → "Comprado y Producido"
    - Select: Seguimiento de lote (req) — required / optional / none con labels:
      - required → "Requerido"
      - optional → "Opcional"
      - none → "Sin seguimiento"
  - **Sección 2: Propiedades Adicionales**
    - Input: Vida útil (opt, number, días) — shelf_life_days
    - Input: PHI — Periodo de carencia (opt, number, días) — phi_days
    - Input: REI — Periodo de reentrada (opt, number, horas) — rei_hours
    - Input: Rendimiento por defecto % (opt, number) — default_yield_pct
    - Input: Densidad g/mL (opt, number) — density_g_per_ml
    - Input: Propiedades de conversión (opt, JSONB) — conversion_properties (campo JSON editor simple)
  - **Sección 3: Precio y Proveedor**
    - Input: Precio por defecto (opt, number)
    - Select: Moneda del precio (opt) — COP, USD, etc.
    - Select: Proveedor preferido (opt) — lista de suppliers activos
  - **Sección 4: Requerimientos Regulatorios** (nested CRUD)
    - Toggle: "Este producto requiere documentación regulatoria" → muestra/oculta la sección
    - Tabla inline de `product_regulatory_requirements`:
      - Columnas: Tipo de documento (nombre del regulatory_doc_type), Obligatorio (badge Sí/No), Alcance (badge), Frecuencia (badge), Notas, Acciones
      - Botón "Agregar requerimiento" → fila inline o mini-dialog:
        - Select: Tipo de documento (req) — regulatory_doc_types activos de la empresa
        - Toggle: Obligatorio (default true)
        - Select: Alcance — per_batch / per_lot / per_product / per_facility con labels:
          - per_batch → "Por batch"
          - per_lot → "Por lote"
          - per_product → "Por producto"
          - per_facility → "Por instalación"
        - Select: Frecuencia — once / per_production / annual / per_shipment con labels:
          - once → "Una vez"
          - per_production → "Por producción"
          - annual → "Anual"
          - per_shipment → "Por envío"
        - Input: Notas (opt)
      - Acciones por fila: Editar, Eliminar (con confirmación)
    - Los requerimientos se guardan por separado en `product_regulatory_requirements` con product_id = este producto
  - Botón "Guardar producto" (variant="primary")

**Responsive**: Tabla de listado con scroll horizontal. Dialog/página de edición apilado verticalmente en móvil.

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener productos via Server Component: `supabase.from('products').select('*, category:resource_categories(name, icon), unit:units_of_measure(code, name), cultivar:cultivars(name), supplier:suppliers(name)').eq('is_active', true).order('name')` con paginación
- **RF-02**: Filtros se aplican como query params en la URL para deep-linking
- **RF-03**: Filtro de búsqueda: `.or('name.ilike.%term%,sku.ilike.%term%')`
- **RF-04**: Filtro de categoría: `.eq('category_id', categoryId)`
- **RF-05**: Filtro de tipo de adquisición: `.eq('procurement_type', type)`
- **RF-06**: Al crear producto, ejecutar INSERT en products. Luego, si hay requerimientos regulatorios, ejecutar INSERT en batch para `product_regulatory_requirements`
- **RF-07**: El campo `requires_regulatory_docs` se setea a `true` automáticamente si hay al menos un requerimiento regulatorio, `false` si se eliminan todos
- **RF-08**: Al editar, obtener datos del producto + sus requerimientos: `supabase.from('products').select('*, requirements:product_regulatory_requirements(*, doc_type:regulatory_doc_types(name, code))').eq('id', productId).single()`
- **RF-09**: Los requerimientos regulatorios se pueden agregar, editar y eliminar independientemente del save del producto principal. Cada operación es un INSERT/UPDATE/DELETE individual en `product_regulatory_requirements`
- **RF-10**: Validar que el SKU sea único dentro de la empresa antes de guardar. Mostrar error inline si duplicado
- **RF-11**: El select de cultivar solo se muestra si la categoría seleccionada es de tipo "material vegetal" (is_transformable=true en resource_category)
- **RF-12**: Desactivar producto: `products.update({ is_active: false })` con confirmación
- **RF-13**: Si el producto está referenciado en phase_product_flows activos, mostrar advertencia al desactivar
- **RF-14**: Validar campos con Zod antes de enviar
- **RF-15**: Tras operación exitosa, invalidar caches: `['products']` y `['products', productId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id implícito via resource_categories.company_id o directo si products tiene company_id) + Pattern 3 (admin/manager) para escritura
- **RNF-02**: Soft delete: `is_active = false`. Nunca borrado físico
- **RNF-03**: El SKU es único por empresa — constraint en base de datos
- **RNF-04**: Paginación server-side para el listado principal
- **RNF-05**: La sección de requerimientos regulatorios es un nested CRUD — cada operación es independiente
- **RNF-06**: Los selects de categoría, unidad, cultivar y proveedor se cargan una sola vez al abrir el dialog (no en cada keystroke)
- **RNF-07**: El campo `conversion_properties` JSONB se edita como texto formateado (JSON) — no como formulario estructurado

## Flujos principales

### Happy path — Crear producto simple (sin regulatorio)

1. Admin/manager navega a `/inventory/products`
2. Click "Nuevo producto" → se abre dialog/página
3. Llena SKU, nombre, categoría, unidad, tipo adquisición, seguimiento de lote
4. Opcionalmente llena propiedades adicionales, precio, proveedor
5. Toggle "Requiere documentación regulatoria" queda off
6. Click "Guardar producto" → validación Zod pasa → botón loading
7. Insert exitoso → redirige/cierra → toast "Producto creado"

### Happy path — Crear producto con requerimientos regulatorios

1. Mismos pasos 1-4 que arriba
2. Activa toggle "Requiere documentación regulatoria"
3. Click "Agregar requerimiento" → selecciona tipo doc (ej: CoA), alcance=per_batch, frecuencia=per_production, obligatorio=sí
4. Click "Agregar requerimiento" → otro tipo doc (ej: Ficha técnica), alcance=per_product, frecuencia=once
5. Click "Guardar producto" → inserta producto + 2 requerimientos → toast éxito
6. El campo `requires_regulatory_docs` se setea a true

### Editar producto existente

1. Admin/manager click "Editar" en un producto
2. Dialog/página con datos pre-llenados incluyendo tabla de requerimientos
3. Modifica nombre, agrega un nuevo requerimiento regulatorio
4. Click "Guardar" → actualiza producto + inserta nuevo requerimiento

### Producto vegetal vinculado a cultivar

1. Al seleccionar una categoría con `is_transformable=true` (ej: "Material Vegetal")
2. Aparece el select de cultivar
3. Se selecciona el cultivar correspondiente (ej: "Gelato #41")
4. Se guarda con el vínculo `cultivar_id`

### Desactivar producto con advertencia

1. Admin click "Desactivar" en un producto
2. Sistema verifica si está referenciado en phase_product_flows activos
3. Si sí: "Este producto está referenciado en flujos de producción activos. ¿Desactivar de todos modos?"
4. Confirma → update is_active=false → toast "Producto desactivado"

### Vista solo lectura (supervisor/operator/viewer)

1. Navega a `/inventory/products`
2. Ve la tabla sin botón "Nuevo producto" y sin acciones de edición
3. Puede filtrar y buscar

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                       |
| -------------- | ----------------------------------------------------------------- |
| loading        | Skeleton de tabla mientras carga                                  |
| loaded         | Tabla con datos, filtros activos                                  |
| empty          | Sin productos — "No hay productos registrados. Crea el primero."  |
| empty-filtered | Sin resultados para filtros — "No se encontraron productos"       |
| error          | Error al cargar — "Error al cargar productos. Intenta nuevamente" |

### Estados de UI — Dialog/Página de Edición

| Estado     | Descripción                                                 |
| ---------- | ----------------------------------------------------------- |
| idle       | Campos listos (vacíos para crear, pre-llenados para editar) |
| submitting | Botón loading, campos read-only                             |
| success    | Redirige/cierra, toast éxito                                |
| error      | Toast error, formulario re-habilitado                       |

### Validaciones Zod — Producto

```
sku: z.string().min(1, 'El SKU es requerido').max(50, 'Máximo 50 caracteres').regex(/^[A-Z0-9\-]+$/, 'Solo letras mayúsculas, números y guiones')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
category_id: z.string().uuid('Selecciona una categoría')
default_unit_id: z.string().uuid('Selecciona una unidad de medida')
cultivar_id: z.string().uuid().optional().nullable()
procurement_type: z.enum(['purchased', 'produced', 'both'], { message: 'Selecciona un tipo de adquisición' })
lot_tracking: z.enum(['required', 'optional', 'none'], { message: 'Selecciona seguimiento de lote' })
shelf_life_days: z.number().int().positive('Debe ser mayor a 0').optional().nullable()
phi_days: z.number().int().nonnegative('Debe ser 0 o mayor').optional().nullable()
rei_hours: z.number().int().nonnegative('Debe ser 0 o mayor').optional().nullable()
default_yield_pct: z.number().min(0).max(100, 'Máximo 100%').optional().nullable()
density_g_per_ml: z.number().positive('Debe ser mayor a 0').optional().nullable()
default_price: z.number().nonnegative('No puede ser negativo').optional().nullable()
price_currency: z.string().length(3).optional().nullable()
preferred_supplier_id: z.string().uuid().optional().nullable()
```

### Validaciones Zod — Requerimiento regulatorio

```
doc_type_id: z.string().uuid('Selecciona un tipo de documento')
is_mandatory: z.boolean().default(true)
applies_to_scope: z.enum(['per_batch', 'per_lot', 'per_product', 'per_facility'], { message: 'Selecciona un alcance' })
frequency: z.enum(['once', 'per_production', 'annual', 'per_shipment'], { message: 'Selecciona una frecuencia' })
notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal(''))
```

### Errores esperados

| Escenario                                   | Mensaje al usuario                                    |
| ------------------------------------------- | ----------------------------------------------------- |
| SKU vacío                                   | "El SKU es requerido" (inline)                        |
| SKU formato inválido                        | "Solo letras mayúsculas, números y guiones" (inline)  |
| SKU duplicado                               | "Ya existe un producto con este SKU" (inline)         |
| Nombre vacío                                | "El nombre es requerido" (inline)                     |
| Categoría no seleccionada                   | "Selecciona una categoría" (inline)                   |
| Unidad no seleccionada                      | "Selecciona una unidad de medida" (inline)            |
| Doc type no seleccionado (en requerimiento) | "Selecciona un tipo de documento" (inline)            |
| Error de red                                | "Error de conexión. Intenta nuevamente" (toast)       |
| Permiso denegado (RLS)                      | "No tienes permisos para modificar productos" (toast) |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/catalog` — resource_categories y units_of_measure deben existir (Fase 2)
  - `/settings/cultivars` — cultivars deben existir para productos vegetales (Fase 2)
  - `/settings/regulatory-config` — regulatory_doc_types deben existir para requerimientos (Fase 2)
  - `/inventory/suppliers` — suppliers deben existir para proveedor preferido (Fase 3)
  - `/inventory/shipments` — shipment_items referencian productos
  - `/inventory/recipes` — recipe items referencian productos
- **Supabase client**: PostgREST para CRUD
- **React Query**: Cache keys `['products']`, `['products', productId]`, `['product-requirements', productId]` para invalidación
