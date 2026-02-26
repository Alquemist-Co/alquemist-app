# Configuración Regulatoria

## Metadata

- **Ruta**: `/settings/regulatory-config`
- **Roles con acceso**: admin (lectura y escritura), manager (lectura y escritura), supervisor, operator, viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listados, Client Component para formularios y form builder)
- **Edge Functions**: Ninguna — CRUD via PostgREST

## Objetivo

Permitir configurar el marco regulatorio de la empresa: qué tipos de documentos existen (con campos dinámicos definidos por el admin), qué documentos requiere cada producto o categoría de productos, y qué documentos se necesitan para el transporte de materiales. Esta configuración es prerequisito para que el módulo regulatorio opere — sin tipos de documento configurados, no se pueden capturar documentos regulatorios.

Visible solo si el feature `regulatory` está habilitado en la configuración de empresa (settings.features_enabled.regulatory = true).

Usuarios principales: admin y manager responsables del compliance regulatorio.

## Tablas del modelo involucradas

| Tabla                           | Operaciones | Notas                                                                                                                                                |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| regulatory_doc_types            | R/W         | CRUD completo. Incluye required_fields JSONB con schema de campos dinámicos. Soft-delete via is_active. RLS Pattern 1 + Pattern 3                    |
| product_regulatory_requirements | R/W         | CRUD completo. Vincula doc_type a product_id o category_id. CHECK: exactamente uno de product_id, category_id no es null                             |
| shipment_doc_requirements       | R/W         | CRUD completo. Vincula doc_type a product_id o category_id para contexto de transporte. CHECK: exactamente uno de product_id, category_id no es null |
| products                        | R           | Referencia para seleccionar productos en requirements (puede estar vacío en Fase 2)                                                                  |
| resource_categories             | R           | Referencia para seleccionar categorías en requirements                                                                                               |

## ENUMs utilizados

| ENUM                      | Valores                                                              | Tabla.campo                                      |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| doc_category              | quality \| transport \| compliance \| origin \| safety \| commercial | regulatory_doc_types.category                    |
| compliance_scope          | per_batch \| per_lot \| per_product \| per_facility                  | product_regulatory_requirements.applies_to_scope |
| compliance_frequency      | once \| per_production \| annual \| per_shipment                     | product_regulatory_requirements.frequency        |
| shipment_doc_applies_when | always \| interstate \| international \| regulated_material          | shipment_doc_requirements.applies_when           |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar. Estructura en 3 tabs.

- **Header de página** — Título "Configuración Regulatoria" + breadcrumb (Settings > Regulatorio)
- **Banner** (si feature disabled) — "El módulo regulatorio está deshabilitado. Actívalo en Configuración de Empresa"
- **Tabs** — 3 tabs:
  - "Tipos de Documento"
  - "Requisitos por Producto"
  - "Requisitos de Envío"
- Tab seleccionado en query param `?tab=doc-types|product-reqs|shipment-reqs`

### Tab 1: Tipos de Documento (regulatory_doc_types)

- **Botón "Nuevo tipo de documento"** (variant="primary")
- **Listado** — Tabla o cards:
  - Código, Nombre, Categoría (badge con color por doc_category), Vigencia (días o "No vence"), Autoridad emisora, Campos requeridos ({N}), Estado, Acciones
  - Acciones: Editar, Ver campos, Duplicar, Desactivar
- **Dialog: Nuevo/Editar Tipo de Documento** — Modal amplio
  - Input: Código (req) — ej: "COA", "SDS", "PHYTO"
  - Input: Nombre (req) — ej: "Certificado de Análisis (CoA)"
  - Textarea: Descripción (opt) — para qué sirve y cuándo se requiere
  - Select: Categoría (req) — quality / transport / compliance / origin / safety / commercial
  - Input numérico: Vigencia en días (opt) — null = no vence
  - Input: Autoridad emisora (opt) — ej: "ICA", "INVIMA", "Lab acreditado"
  - Input numérico: sort_order
  - **Sección "Campos del Formulario" (Form Builder)** — La parte más compleja:
    - Lista sorteable de campos dinámicos que definen el schema (required_fields JSONB)
    - Botón "Agregar campo"
    - Por cada campo:
      - Input: Key (req, slug) — identificador interno, ej: "lab_name"
      - Input: Etiqueta (req) — ej: "Nombre del laboratorio"
      - Select: Tipo de campo (req):
        - **text**: Texto corto (input)
        - **textarea**: Texto largo (textarea)
        - **date**: Fecha (date picker)
        - **number**: Numérico (input number)
        - **boolean**: Sí/No (checkbox)
        - **select**: Selección de opciones (dropdown)
      - Toggle: Requerido (required) — obligatorio al capturar documento
      - Input: Placeholder (opt) — texto de ayuda dentro del campo
      - Input: Texto de ayuda (opt) — descripción debajo del campo
      - **Condicional si tipo = "select"**: Lista de opciones
        - Inputs dinámicos para agregar/eliminar opciones
      - Drag handle para reordenar
      - Botón eliminar campo
  - Botón "Guardar"

### Tab 2: Requisitos por Producto (product_regulatory_requirements)

- **Botón "Nuevo requisito"** (variant="primary")
- **Listado** — Tabla agrupable por producto/categoría:
  - Producto o Categoría (nombre), Tipo de documento (nombre), Obligatorio (badge: Sí/No), Alcance (badge: per_batch/per_lot/per_product/per_facility), Frecuencia (badge), Notas, Acciones
  - Acciones: Editar, Eliminar
  - Filtro: por producto o categoría
- **Dialog: Nuevo/Editar Requisito** — Modal
  - Radio: Nivel de aplicación
    - "Producto específico" → Select de productos (con búsqueda)
    - "Categoría de productos" → Select de resource_categories. "Los productos de esta categoría heredan este requisito"
  - Select: Tipo de documento (req) — de regulatory_doc_types activos
  - Toggle: Obligatorio (is_mandatory) — default true. "Si es false, el documento es recomendado pero no bloqueante"
  - Select: Alcance (req):
    - per_batch: "Un documento por cada batch"
    - per_lot: "Un documento por cada lote de inventario"
    - per_product: "Un documento por producto (genérico)"
    - per_facility: "Un documento por instalación"
  - Select: Frecuencia (req):
    - once: "Una vez (no expira)"
    - per_production: "Cada ciclo de producción"
    - annual: "Renovación anual"
    - per_shipment: "Cada envío"
  - Textarea: Notas (opt) — ej: "Requerido para exportación a EU"
  - Input numérico: sort_order
  - Botón "Guardar"

### Tab 3: Requisitos de Envío (shipment_doc_requirements)

- **Botón "Nuevo requisito"** (variant="primary")
- **Listado** — Tabla:
  - Producto o Categoría, Tipo de documento, Obligatorio (badge), Aplica cuando (badge), Notas, Acciones
  - Acciones: Editar, Eliminar
- **Dialog: Nuevo/Editar Requisito de Envío** — Modal
  - Radio: Nivel de aplicación
    - "Producto específico" → Select de productos
    - "Categoría de productos" → Select de resource_categories
  - Select: Tipo de documento (req) — de regulatory_doc_types activos
  - Toggle: Obligatorio (is_mandatory) — default true
  - Select: Aplica cuando (req):
    - always: "Siempre, en cualquier envío"
    - interstate: "Solo envíos entre departamentos/estados"
    - international: "Solo envíos internacionales"
    - regulated_material: "Solo para material regulado"
  - Textarea: Notas (opt) — ej: "Requerido por ICA para movilización de material vegetal"
  - Input numérico: sort_order
  - Botón "Guardar"

**Responsive**: Tabs horizontales → select en móvil. Form builder scroll vertical. Dialogs full-screen en móvil.

## Requisitos funcionales

### Tipos de Documento

- **RF-01**: Cargar tipos: `supabase.from('regulatory_doc_types').select('*').order('sort_order, name')`
- **RF-02**: CRUD con validación Zod. Código único por empresa
- **RF-03**: Soft-delete via is_active. Warning si hay product_regulatory_requirements o shipment_doc_requirements que referencien este tipo
- **RF-04**: El form builder para required_fields genera un JSONB con estructura: `{"fields": [{key, label, type, required, options?, placeholder?, help_text?}]}`
- **RF-05**: Keys de campos deben ser únicas dentro del mismo doc_type. Formato slug (lowercase, sin espacios, snake_case)
- **RF-06**: Para campos tipo "select", al menos 2 opciones son requeridas
- **RF-07**: El form builder soporta reordenar campos via drag-and-drop
- **RF-08**: Preview del formulario: mostrar cómo se verá el formulario resultante para el operario que capture el documento
- **RF-09**: Al editar un doc_type que ya tiene documentos capturados (regulatory_documents), Warning: "Modificar los campos puede afectar la visualización de {N} documentos existentes"
- **RF-10**: Duplicar tipo: copia datos generales + required_fields. Código con sufijo "-COPY"

### Requisitos por Producto

- **RF-11**: Cargar requisitos: `supabase.from('product_regulatory_requirements').select('*, doc_type:regulatory_doc_types(name, code), product:products(name, sku), category:resource_categories(name)').order('sort_order')`
- **RF-12**: CRUD con validación. CHECK constraint: exactamente uno de product_id o category_id debe ser NOT NULL
- **RF-13**: En el dialog, al seleccionar "Producto específico" se limpia category_id (y viceversa)
- **RF-14**: Si no hay productos creados aún (Fase 3), el select de productos muestra "Sin productos configurados — usa categorías de recursos". Solo el select de categorías está disponible
- **RF-15**: Evitar duplicados: no se puede crear dos requisitos con la misma combinación de (product_id o category_id) + doc_type_id + applies_to_scope
- **RF-16**: Los requisitos a nivel categoría se heredan a todos los productos de esa categoría — mostrar nota informativa en el UI

### Requisitos de Envío

- **RF-17**: Cargar requisitos: `supabase.from('shipment_doc_requirements').select('*, doc_type:regulatory_doc_types(name, code), product:products(name, sku), category:resource_categories(name)').order('sort_order')`
- **RF-18**: CRUD con validación. Mismo CHECK constraint que product_regulatory_requirements
- **RF-19**: `applies_when` determina cuándo se exige el documento:
  - always: en cualquier envío que incluya este producto/categoría
  - interstate: solo si el envío cruza límites departamentales/estatales
  - international: solo si el envío es internacional
  - regulated_material: solo si el producto/categoría está marcado como material regulado
- **RF-20**: Mismas reglas de producto vs categoría que RF-12 a RF-16

### General

- **RF-21**: Si `settings.features_enabled.regulatory = false`, la página muestra banner informativo y los datos son read-only (no se pueden crear/editar)
- **RF-22**: Roles no-admin/manager ven todo como read-only
- **RF-23**: company_id inyectado por RLS — nunca enviado desde el cliente
- **RF-24**: Tras cualquier operación CRUD, invalidar queries relevantes

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id) para lectura + Pattern 3 (admin/manager) para escritura en las 3 tablas
- **RNF-02**: El form builder de required_fields no ejecuta código dinámico — solo genera estructura declarativa (JSONB schema)
- **RNF-03**: Los documentos existentes (regulatory_documents) NO se modifican al cambiar el schema del doc_type — los datos históricos preservan su estructura original
- **RNF-04**: El preview del formulario es visual-only — no guarda datos
- **RNF-05**: Los selects de productos y categorías se cachean globalmente
- **RNF-06**: La validación del CHECK constraint (product_id XOR category_id) se aplica tanto client-side como server-side

## Flujos principales

### Happy path — Crear tipo de documento con campos

1. Admin navega a `/settings/regulatory-config?tab=doc-types`
2. Click "Nuevo tipo de documento" → dialog amplio
3. Llena: código "COA", nombre "Certificado de Análisis", categoría "quality", vigencia 365, autoridad "Lab acreditado"
4. En sección "Campos del Formulario":
   - Agrega campo: key="lab_name", label="Nombre del laboratorio", type=text, required=true
   - Agrega campo: key="sample_date", label="Fecha de muestreo", type=date, required=true
   - Agrega campo: key="analysis_type", label="Tipo de análisis", type=select, required=true, options=["Potencia", "Contaminantes", "Residuos", "Completo"]
   - Agrega campo: key="overall_pass", label="¿Resultado aprobado?", type=boolean, required=true
   - Agrega campo: key="observations", label="Observaciones", type=textarea, required=false
5. Preview muestra el formulario resultante
6. Guardar → tipo de documento creado con required_fields JSONB

### Crear requisito por producto

1. Admin navega a tab "Requisitos por Producto"
2. Click "Nuevo requisito" → dialog
3. Selecciona "Categoría de productos" → elige "Material Vegetal"
4. Selecciona tipo de documento "Certificado de Análisis (CoA)"
5. Obligatorio: true, Alcance: per_batch, Frecuencia: per_production
6. Notas: "Requerido para cada batch de producción"
7. Guardar → requisito creado. Todos los productos de categoría "Material Vegetal" heredan este requisito

### Crear requisito de envío

1. Admin navega a tab "Requisitos de Envío"
2. Click "Nuevo requisito" → dialog
3. Selecciona "Categoría de productos" → elige "Material Vegetal"
4. Selecciona tipo de documento "Guía ICA"
5. Obligatorio: true, Aplica cuando: always
6. Notas: "Requerido por ICA para movilización de material vegetal"
7. Guardar → requisito creado

### Editar campos de un tipo de documento existente

1. Admin edita tipo de documento "CoA" que ya tiene 5 documentos capturados
2. Warning: "Modificar los campos puede afectar la visualización de 5 documentos existentes"
3. Admin agrega nuevo campo "moisture_pct" (tipo number) — los documentos existentes no tendrán este campo
4. Guardar → campo agregado. Documentos existentes muestran el campo nuevo como vacío

### Feature regulatorio deshabilitado

1. Usuario navega a `/settings/regulatory-config`
2. Banner: "El módulo regulatorio está deshabilitado. Actívalo en Configuración de Empresa"
3. Los datos existentes son visibles pero no se pueden crear/editar
4. Link a `/settings/company` para activar

## Estados y validaciones

### Estados de UI — Por Tab

| Estado   | Descripción                                                        |
| -------- | ------------------------------------------------------------------ |
| loading  | Skeleton de listado                                                |
| loaded   | Datos visibles con acciones disponibles                            |
| empty    | Sin registros — mensaje contextual por tab                         |
| disabled | Feature regulatorio deshabilitado — banner visible, todo read-only |

### Estados de UI — Form Builder

| Estado  | Descripción                            |
| ------- | -------------------------------------- |
| editing | Campos editables, drag-and-drop activo |
| preview | Vista previa del formulario resultante |
| saving  | Guardando, deshabilitado               |

### Validaciones Zod — Tipo de Documento

```
code: z.string().min(1, 'El código es requerido').max(50, 'Máximo 50 caracteres').regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guión bajo')
name: z.string().min(1, 'El nombre es requerido').max(200, 'Máximo 200 caracteres')
description: z.string().max(1000).optional().or(z.literal(''))
category: z.enum(['quality', 'transport', 'compliance', 'origin', 'safety', 'commercial'], { message: 'Selecciona una categoría' })
valid_for_days: z.number().int().positive('Debe ser mayor a 0').nullable().optional()
issuing_authority: z.string().max(200).optional().or(z.literal(''))
sort_order: z.number().int().min(0).default(0)
required_fields: z.object({
  fields: z.array(z.object({
    key: z.string().min(1).regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guión bajo'),
    label: z.string().min(1, 'La etiqueta es requerida'),
    type: z.enum(['text', 'textarea', 'date', 'number', 'boolean', 'select']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    help_text: z.string().optional(),
  })),
})
```

Con refinemientos:

- Keys únicas dentro del array de fields
- Si type = "select", options debe tener al menos 2 elementos

### Validaciones Zod — Requisito por Producto

```
product_id: z.string().uuid().nullable().optional()
category_id: z.string().uuid().nullable().optional()
doc_type_id: z.string().uuid('Selecciona un tipo de documento')
is_mandatory: z.boolean().default(true)
applies_to_scope: z.enum(['per_batch', 'per_lot', 'per_product', 'per_facility'], { message: 'Selecciona un alcance' })
frequency: z.enum(['once', 'per_production', 'annual', 'per_shipment'], { message: 'Selecciona una frecuencia' })
notes: z.string().max(500).optional().or(z.literal(''))
sort_order: z.number().int().min(0).default(0)
```

Con refinamiento: exactamente uno de product_id o category_id debe ser NOT NULL.

### Validaciones Zod — Requisito de Envío

```
product_id: z.string().uuid().nullable().optional()
category_id: z.string().uuid().nullable().optional()
doc_type_id: z.string().uuid('Selecciona un tipo de documento')
is_mandatory: z.boolean().default(true)
applies_when: z.enum(['always', 'interstate', 'international', 'regulated_material'], { message: 'Selecciona cuándo aplica' })
notes: z.string().max(500).optional().or(z.literal(''))
sort_order: z.number().int().min(0).default(0)
```

Con refinamiento: exactamente uno de product_id o category_id debe ser NOT NULL.

### Errores esperados

| Escenario                         | Mensaje al usuario                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| Código duplicado (doc_type)       | "Ya existe un tipo de documento con este código" (inline)                                       |
| Key duplicada en fields           | "Ya existe un campo con esta key" (inline en form builder)                                      |
| Select sin opciones suficientes   | "Los campos tipo 'select' necesitan al menos 2 opciones" (inline)                               |
| Producto y categoría ambos vacíos | "Selecciona un producto o una categoría" (inline)                                               |
| Producto y categoría ambos llenos | "Selecciona solo un producto O una categoría, no ambos" (inline)                                |
| Requisito duplicado               | "Ya existe un requisito de este tipo para este producto/categoría con el mismo alcance" (toast) |
| Desactivar doc_type en uso        | Warning con conteo de requisitos que lo referencian                                             |
| Error de red                      | "Error de conexión. Intenta nuevamente" (toast)                                                 |

## Dependencias

- **Páginas relacionadas**:
  - `/settings/company` (Fase 2) — controla si el feature regulatory está habilitado
  - `/settings/catalog` (Fase 2) — resource_categories usadas como referencia en requirements
  - `/inventory/products` (Fase 3) — products usados como referencia (pueden no existir aún)
  - `/regulatory/documents` (Fase 5) — los documentos capturados usan los doc_types aquí configurados
  - `/regulatory/document-detail/[id]` (Fase 5) — el formulario dinámico se genera desde required_fields
  - `/inventory/shipments` (Fase 3) — los envíos consultan shipment_doc_requirements para verificar compliance
- **React Query**: Cache keys `['regulatory-doc-types']`, `['product-regulatory-requirements']`, `['shipment-doc-requirements']`
- **Supabase client**: `src/lib/supabase/browser.ts` — PostgREST para CRUD
- **Feature flag**: `company.settings.features_enabled.regulatory` — si false, página en modo read-only con banner
