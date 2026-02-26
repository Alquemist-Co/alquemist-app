# Documentos Regulatorios

## Metadata

- **Ruta**: `/regulatory/documents`
- **Roles con acceso**: admin (lectura + crear + editar + revocar), manager (lectura + crear + editar), supervisor (lectura + crear), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado con paginación, Client Component para formulario de creación y filtros)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Gestión centralizada de todos los documentos regulatorios de la empresa: certificados de análisis, fichas técnicas, guías de transporte, certificados orgánicos, permisos fitosanitarios, etc.

La página muestra el estado de compliance: documentos válidos, por vencer, vencidos, y faltantes. Permite crear nuevos documentos, vincularlos a batches/productos/facilities/envíos, y mantener el registro regulatorio actualizado.

El sistema marca automáticamente como expirados los documentos vencidos (pg_cron `expire_documents`) y genera alertas para documentos próximos a vencer (pg_cron `check_expiring_documents`).

Usuarios principales: supervisores de calidad/regulatorio, managers de compliance.

## Tablas del modelo involucradas

| Tabla                           | Operaciones | Notas                                                                    |
| ------------------------------- | ----------- | ------------------------------------------------------------------------ |
| regulatory_documents            | R/W         | CRUD principal. RLS via company_id directo                               |
| regulatory_doc_types            | R           | Tipos de documento con schema de campos dinámicos (required_fields)      |
| batches                         | R           | Batches para vincular (código, cultivar)                                 |
| products                        | R           | Productos para vincular                                                  |
| inventory_items                 | R           | Lotes para vincular                                                      |
| facilities                      | R           | Facilities para vincular                                                 |
| shipments                       | R           | Envíos para vincular                                                     |
| quality_tests                   | R           | Tests de calidad para vincular (CoA)                                     |
| product_regulatory_requirements | R           | Requerimientos para mostrar compliance por producto                      |
| users                           | R           | Creado por, verificado por                                               |

## ENUMs utilizados

| ENUM         | Valores                                                                      | Tabla.campo                    |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------ |
| doc_status   | draft \| valid \| expired \| revoked \| superseded                           | regulatory_documents.status    |
| doc_category | quality \| transport \| compliance \| origin \| safety \| commercial         | regulatory_doc_types.category  |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Documentos Regulatorios"
  - Subtítulo: "{n} documentos" (total filtrado)
  - Botón "Nuevo documento" (variant="primary") — solo admin/manager/supervisor
- **Barra de KPIs** — Row de cards con métricas de compliance:
  - Válidos: {n} (badge verde)
  - Por vencer (30 días): {n} (badge amarillo)
  - Vencidos: {n} (badge rojo)
  - Borradores: {n} (badge gris)
  - Compliance general: {válidos / (válidos + vencidos + faltantes)} % — gauge visual
- **Barra de filtros** — Row de filtros combinables:
  - Search: Buscar por tipo de documento, número, batch code, producto
  - Select: Status (todos, draft, valid, expired, revoked, superseded — multi-select)
  - Select: Categoría (quality, transport, compliance, origin, safety, commercial)
  - Select: Tipo de documento (de regulatory_doc_types activos)
  - Select: Vinculado a (batch, producto, facility, envío, lote — para filtrar por tipo de vínculo)
  - DatePicker rango: Fecha vencimiento desde/hasta (para encontrar docs por vencer)
  - Botón "Limpiar filtros"
- **Tabla principal** — Tabla paginada server-side
  - Columnas:
    - Tipo de documento (doc_type.name + badge categoría)
    - Número (document_number)
    - Vinculado a (batch code / producto name / facility name / shipment code — según FKs)
    - Fecha emisión (issue_date)
    - Fecha vencimiento (expiry_date, con badge visual):
      - Sin vencimiento: "No expira"
      - > 30 días: texto normal
      - 1-30 días: texto amarillo + ícono warning
      - Vencido: texto rojo + ícono alerta
    - Status (badge: draft=gris, valid=verde, expired=rojo, revoked=naranja, superseded=azul)
    - Archivo (ícono de clip si tiene file_path, click para descargar)
    - Verificado (✓ si verified_by no es null, con tooltip del nombre)
    - Acciones: "Ver detalle" → navega a `/regulatory/documents/{id}` (PRD 32)
  - Ordenamiento: por fecha emisión descendente (default), clickeable en columnas
  - Paginación: 20 items por página
  - Click en fila → navega a `/regulatory/documents/{id}`
- **Dialog: Nuevo documento** — Modal de creación (paso 1)
  - Select: Tipo de documento (req) — dropdown de regulatory_doc_types activos, agrupados por categoría
  - Al seleccionar tipo, se muestra: descripción, categoría, vigencia ({valid_for_days} días o "No expira"), autoridad emisora
  - Botón "Siguiente" → paso 2
- **Dialog: Nuevo documento — Paso 2** — Datos y campos dinámicos
  - Input: Número de documento (opt)
  - DatePicker: Fecha de emisión (req, default=hoy)
  - Display: Fecha vencimiento (auto-calculada: issue_date + doc_type.valid_for_days, o "No expira")
  - **Vinculación** (al menos una recomendada):
    - Select: Batch (opt — dropdown con búsqueda)
    - Select: Producto (opt — dropdown con búsqueda)
    - Select: Facility (opt — dropdown)
    - Select: Envío (opt — dropdown con búsqueda)
    - Select: Lote de inventario (opt — dropdown con búsqueda)
    - Select: Test de calidad (opt — dropdown)
  - **Campos dinámicos** — Generados desde doc_type.required_fields JSONB:
    - type='text': Input text
    - type='textarea': Textarea
    - type='date': DatePicker
    - type='number': Input number
    - type='boolean': Checkbox
    - type='select': Select con options definidas en el schema
    - Campos con required=true: marcados con asterisco, validados antes de guardar
  - Input file: Adjunto (opt, PDF/imagen) → sube a Supabase Storage
  - Textarea: Notas (opt)
  - Botón "Crear documento" (variant="primary")
  - Al crear, status='draft' si no se adjunta archivo, status='valid' si se adjunta y es completo

**Responsive**: KPIs en 2 columnas en móvil. Tabla con scroll horizontal. Dialog multi-step full-screen en móvil.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación server-side:
  ```
  supabase.from('regulatory_documents')
    .select(`
      *,
      doc_type:regulatory_doc_types(id, name, code, category, valid_for_days, issuing_authority),
      batch:batches(id, code),
      product:products(id, name, sku),
      facility:facilities(id, name),
      shipment:shipments(id, shipment_code),
      inventory_item:inventory_items(id, batch_number),
      quality_test:quality_tests(id, test_type),
      verified_user:users!verified_by(full_name),
      created_user:users!created_by(full_name)
    `, { count: 'exact' })
    .order('issue_date', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: KPIs se calculan con queries agregadas en paralelo:
  ```
  -- Válidos
  supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'valid')
  -- Por vencer (30 días)
  supabase.from('regulatory_documents').select('id', { count: 'exact', head: true })
    .eq('status', 'valid').lte('expiry_date', today_plus_30).gte('expiry_date', today)
  -- Vencidos
  supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'expired')
  -- Borradores
  supabase.from('regulatory_documents').select('id', { count: 'exact', head: true }).eq('status', 'draft')
  ```
- **RF-03**: Filtros se aplican como query params en la query principal
- **RF-04**: Cargar regulatory_doc_types activos para el dialog de creación:
  ```
  supabase.from('regulatory_doc_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  ```

### Crear documento

- **RF-05**: Al crear:
  ```
  supabase.from('regulatory_documents')
    .insert({
      doc_type_id,
      document_number,
      issue_date,
      expiry_date,  // auto-calculado: issue_date + doc_type.valid_for_days
      status: hasFile ? 'valid' : 'draft',
      field_data,
      file_path,
      file_name,
      file_size_bytes,
      file_mime_type,
      batch_id,
      product_id,
      facility_id,
      shipment_id,
      inventory_item_id,
      quality_test_id,
      notes
    })
    .select()
    .single()
  ```
- **RF-06**: Auto-calcular expiry_date: si doc_type.valid_for_days no es null, expiry_date = issue_date + valid_for_days
- **RF-07**: Subir archivo a Storage: `regulatory-documents/{company_id}/{doc_type_code}/{document_id}.{ext}`
- **RF-08**: Los campos dinámicos se validan contra el schema required_fields del doc_type: campos con required=true deben tener valor
- **RF-09**: Tras crear, toast "Documento creado exitosamente" + opción de navegar al detalle o crear otro
- **RF-10**: Invalidar caches de KPIs y tabla

### Descarga de archivos

- **RF-11**: Click en ícono de archivo genera URL firmada temporalmente:
  ```
  supabase.storage.from('regulatory-documents').createSignedUrl(file_path, 3600)
  ```
- **RF-12**: Se abre en nueva pestaña o descarga directa según mime_type

### Navegación

- **RF-13**: Click en fila o "Ver detalle" navega a `/regulatory/documents/{id}` (PRD 32)
- **RF-14**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-15**: Click en producto navega a `/inventory/products` (PRD 17) con filtro
- **RF-16**: Click en envío navega a `/inventory/shipments/{id}` (PRD 20)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 — regulatory_documents tiene company_id directo para aislamiento
- **RNF-02**: Paginación server-side (20 items por página)
- **RNF-03**: Las KPIs se calculan en paralelo para no bloquear el rendering
- **RNF-04**: El formulario dinámico de campos se genera client-side desde el schema JSONB — no requiere código custom por tipo de documento
- **RNF-05**: Los archivos se almacenan en Supabase Storage con aislamiento por company_id
- **RNF-06**: El pg_cron `expire_documents` ejecuta diariamente a las 6:00 AM: `UPDATE status='expired' WHERE expiry_date < TODAY AND status='valid'`
- **RNF-07**: El pg_cron `check_expiring_documents` genera alertas type='regulatory_expiring' para docs que vencen en los próximos 30 días

## Flujos principales

### Happy path — Crear certificado de análisis

1. Supervisor navega a `/regulatory/documents`
2. KPIs: 24 válidos, 3 por vencer, 1 vencido, 2 borradores. Compliance: 89%
3. Click "Nuevo documento"
4. Paso 1: Tipo = "Certificado de Análisis (CoA)" → categoría: quality, vigencia: 365 días, autoridad: Lab acreditado
5. Click "Siguiente"
6. Paso 2: Número=CHL-2026-0445, Fecha emisión=25/02/2026, Fecha vencimiento=25/02/2027 (auto)
7. Vinculado a: Batch=LOT-GELATO-260301
8. Campos dinámicos: Nombre lab="ChemHistory Labs", Fecha análisis=25/02/2026, THC%=23.5, Estado=approved
9. Sube PDF del certificado
10. Click "Crear documento" → status='valid'
11. Toast: "Documento creado exitosamente"
12. Tabla se actualiza con el nuevo documento

### Ver documentos por vencer

1. Manager filtra: Status=valid, Fecha vencimiento=hoy a hoy+30
2. Tabla muestra 3 documentos que vencen pronto
3. Cada uno con fecha vencimiento en amarillo con ícono warning
4. Click en uno → navega a detalle para renovar/superseder

### Documento vencido automáticamente

1. El pg_cron `expire_documents` marcó un certificado orgánico como expired
2. Aparece en KPIs: 2 vencidos (rojo)
3. El pg_cron `check_expiring_documents` generó alerta type='regulatory_expiring' 30 días antes
4. Manager crea nuevo documento del mismo tipo → vincula al mismo batch
5. En el detalle del documento viejo (PRD 32), marca como superseded y vincula al nuevo

### Crear documento para envío

1. Al preparar envío outbound, necesita Guía ICA
2. Click "Nuevo documento" → Tipo "Guía de Movilización ICA"
3. Vinculado a: Envío=SHP-2026-0015
4. Campos dinámicos: Número guía, Ruta, Producto, Cantidad, Destino
5. Sube PDF
6. Documento aparece también en el detalle del envío (PRD 20)

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                |
| ------- | -------------------------------------------------------------------------- |
| loading | Skeleton de KPIs, filtros y tabla                                          |
| loaded  | KPIs, filtros y tabla con datos                                            |
| empty   | "No se encontraron documentos regulatorios" + limpiar filtros              |
| error   | "Error al cargar los documentos. Intenta nuevamente" + reintentar          |

### Estados de UI — Dialog de creación

| Estado     | Descripción                                        |
| ---------- | -------------------------------------------------- |
| step1      | Selección de tipo de documento                     |
| step2      | Formulario de datos + campos dinámicos             |
| uploading  | Subiendo archivo al Storage                        |
| submitting | Creando registro en DB                             |
| success    | Dialog cierra, toast éxito, tabla se actualiza     |
| error      | Toast error, dialog permanece abierto              |

### Validaciones Zod — Crear documento

```
doc_type_id: z.string().uuid('Selecciona un tipo de documento')
document_number: z.string().max(100).optional().or(z.literal(''))
issue_date: z.string().min(1, 'La fecha de emisión es requerida')
field_data: z.record(z.unknown()).default({})
notes: z.string().max(2000).optional().or(z.literal(''))
```

Los campos dinámicos dentro de `field_data` se validan según el schema `required_fields` del doc_type:
- Campos con required=true deben tener valor no vacío
- Campos type='number' deben ser numéricos
- Campos type='date' deben ser fechas válidas
- Campos type='select' deben ser una de las options definidas

### Errores esperados

| Escenario                            | Mensaje al usuario                                                |
| ------------------------------------ | ----------------------------------------------------------------- |
| Sin resultados                       | "No se encontraron documentos con estos filtros" (empty)          |
| Tipo no seleccionado                 | "Selecciona un tipo de documento" (inline)                        |
| Fecha emisión vacía                  | "La fecha de emisión es requerida" (inline)                       |
| Campo dinámico requerido vacío       | "{label} es requerido" (inline)                                   |
| Error subiendo archivo               | "Error al subir el archivo. Intenta nuevamente" (toast)           |
| Error creando documento              | "Error al crear el documento. Intenta nuevamente" (toast)         |
| Error de red                         | "Error de conexión. Intenta nuevamente" (toast)                   |

## Dependencias

- **Páginas relacionadas**:
  - `/regulatory/documents/[id]` — detalle del documento (PRD 32)
  - `/production/batches/[id]` — detalle de batch, tab regulatorio (PRD 25)
  - `/inventory/shipments/[id]` — documentos del envío (PRD 20)
  - `/quality/tests/[id]` — CoA vinculado al test (PRD 30)
  - `/settings/regulatory-config` — tipos de documento y requerimientos (PRD 13)
- **pg_cron jobs**: `expire_documents` (diario), `check_expiring_documents` (diario)
- **Supabase Storage**: Bucket `regulatory-documents/{company_id}/{doc_type_code}/` para archivos
- **Supabase client**: PostgREST para CRUD + queries de conteo
- **React Query**: Cache keys `['regulatory-documents', { filters, page }]`, `['regulatory-doc-counts']`
