# Detalle de Documento Regulatorio

## Metadata

- **Ruta**: `/regulatory/documents/[id]`
- **Roles con acceso**: admin (lectura + editar + verificar + revocar + superseder), manager (lectura + editar + verificar), supervisor (lectura + editar draft), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Component para formulario dinámico de edición)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Ver y editar un documento regulatorio individual con su formulario dinámico de campos específicos al tipo de documento. Permite actualizar datos, subir/reemplazar el archivo adjunto, verificar el documento, revocarlo, o supersedearlo con una nueva versión.

El formulario se genera dinámicamente basándose en el schema `required_fields` del `regulatory_doc_types` — cada tipo de documento tiene sus propios campos sin necesidad de código custom.

Usuarios principales: supervisores de calidad/regulatorio para actualizar documentos, managers para verificar y aprobar.

## Tablas del modelo involucradas

| Tabla                | Operaciones | Notas                                                                         |
| -------------------- | ----------- | ----------------------------------------------------------------------------- |
| regulatory_documents | R/W         | Lectura + update de datos, status, archivo, verificación                      |
| regulatory_doc_types | R           | Tipo de documento: schema de campos, categoría, vigencia, autoridad           |
| batches              | R           | Batch vinculado (si aplica)                                                   |
| products             | R           | Producto vinculado (si aplica)                                                |
| inventory_items      | R           | Lote vinculado (si aplica)                                                    |
| facilities           | R           | Facility vinculada (si aplica)                                                |
| shipments            | R           | Envío vinculado (si aplica)                                                   |
| quality_tests        | R           | Test de calidad vinculado (si aplica)                                         |
| users                | R           | Creado por, verificado por                                                    |

## ENUMs utilizados

| ENUM         | Valores                                                              | Tabla.campo                   |
| ------------ | -------------------------------------------------------------------- | ----------------------------- |
| doc_status   | draft \| valid \| expired \| revoked \| superseded                   | regulatory_documents.status   |
| doc_category | quality \| transport \| compliance \| origin \| safety \| commercial | regulatory_doc_types.category |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Regulatorio > Documentos > {doc_type.name} - {document_number})
  - Título: "{doc_type.name}" (ej: "Certificado de Análisis")
  - Subtítulo: Documento #{document_number} · Categoría: {category badge}
  - Badges: status (draft=gris, valid=verde, expired=rojo, revoked=naranja, superseded=azul)
  - Badge vencimiento (si aplica):
    - > 30 días: "Vigente hasta {expiry_date}" (verde)
    - 1-30 días: "Vence en {n} días" (amarillo)
    - Vencido: "Vencido desde {expiry_date}" (rojo)
    - Sin vencimiento: "No expira"
  - Acciones (según status y rol):
    - Status=draft, admin/manager/supervisor:
      - Botón "Publicar" (variant="primary") — cambia status a 'valid' (requiere archivo adjunto)
    - Status=valid, admin/manager:
      - Botón "Verificar" (variant="outline") → marca verified_by + verified_at
      - Botón "Revocar" (variant="destructive") → dialog confirmación
      - Botón "Superseder" → dialog para crear nueva versión
    - Status=expired, admin/manager:
      - Botón "Renovar" → crea nuevo documento del mismo tipo pre-llenado
    - Status=revoked/superseded: sin acciones (read-only)
- **Sección: Información general** — Card
  - Tipo de documento (read-only, con descripción del doc_type)
  - Categoría (badge)
  - Número de documento (editable si draft/valid)
  - Fecha de emisión (editable si draft)
  - Fecha de vencimiento (auto-calculada, read-only)
  - Autoridad emisora (read-only, del doc_type.issuing_authority)
  - Creado por: {nombre} el {fecha}
  - Verificado por: {nombre} el {fecha} (o "No verificado")
  - Notas (editable si draft/valid)
  - Botón "Guardar cambios" (si hay cambios)
- **Sección: Datos del documento** — Card con formulario dinámico
  - Los campos se generan desde `regulatory_doc_types.required_fields`:
    - type='text': Input text
    - type='textarea': Textarea
    - type='date': DatePicker
    - type='number': Input number
    - type='boolean': Checkbox con label
    - type='select': Select con options del schema
  - Campos con required=true: marcados con asterisco
  - **Modo edición** (status = draft o valid): campos editables
  - **Modo lectura** (status = expired/revoked/superseded): campos read-only
  - Valores almacenados en `field_data` JSONB
  - Botón "Guardar datos" (si hay cambios)
- **Sección: Vinculación** — Card
  - Muestra las entidades vinculadas (con links de navegación):
    - Batch: {code} (link a `/production/batches/{id}`)
    - Producto: {name} (link a `/inventory/products`)
    - Facility: {name} (link a `/areas/facilities`)
    - Envío: {code} (link a `/inventory/shipments/{id}`)
    - Lote inventario: {batch_number} (link futuro a inventario)
    - Test de calidad: {test_type} (link a `/quality/tests/{id}`)
  - Editable si draft/valid: selects para cambiar/agregar vinculaciones
- **Sección: Archivo adjunto** — Card
  - Si tiene archivo:
    - Preview del archivo (PDF viewer inline o thumbnail para imagen)
    - Info: nombre, tamaño, tipo MIME
    - Botón "Descargar" → URL firmada + descarga
    - Botón "Reemplazar archivo" (si editable) → file picker
  - Si no tiene archivo:
    - Zona drag & drop + botón "Subir archivo"
    - Formatos: PDF, JPEG, PNG (max 10MB)
- **Sección: Historial de versiones** — Card (visible si tiene superseded_by_id o es superseded_by de otro)
  - Tabla de versiones del documento (todos los docs del mismo tipo para la misma entidad):
    - Columnas: Versión (#), Número, Fecha emisión, Fecha vencimiento, Status, Archivo
    - La versión actual highlighted
    - Links a otras versiones
  - Ejemplo: CoA v1 (superseded) → CoA v2 (superseded) → CoA v3 (valid)
- **Dialog: Revocar documento** — Modal
  - "¿Revocar el documento {doc_type.name} #{document_number}?"
  - "Un documento revocado no puede ser reactivado. Si necesita reemplazarlo, use 'Superseder'."
  - Textarea: Razón de revocación (req)
  - Botón "Revocar documento" (variant="destructive")
- **Dialog: Superseder documento** — Modal
  - "Se creará una nueva versión de {doc_type.name}."
  - "El documento actual se marcará como 'Superseeded' y se vinculará a la nueva versión."
  - Opciones:
    - "Crear nueva versión vacía" — crea draft del mismo tipo con mismas vinculaciones
    - "Crear nueva versión pre-llenada" — copia field_data del documento actual
  - Botón "Crear nueva versión" (variant="primary")
- **Dialog: Renovar documento** — Modal (similar a superseder pero para docs expirados)
  - "El documento {doc_type.name} ha expirado. ¿Crear renovación?"
  - Pre-llena con datos del doc actual, nueva issue_date=hoy, nueva expiry_date calculada
  - Botón "Renovar" (variant="primary")

**Responsive**: Secciones apiladas. Preview de PDF no se muestra en móvil (solo botón descargar). Formulario dinámico full-width. Dialogs full-screen.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Cargar documento completo:
  ```
  supabase.from('regulatory_documents')
    .select(`
      *,
      doc_type:regulatory_doc_types(*),
      batch:batches(id, code, status, cultivar:cultivars(name)),
      product:products(id, name, sku),
      facility:facilities(id, name),
      shipment:shipments(id, shipment_code),
      inventory_item:inventory_items(id, batch_number),
      quality_test:quality_tests(id, test_type, status),
      verified_user:users!verified_by(full_name),
      created_user:users!created_by(full_name),
      superseded_by:regulatory_documents!superseded_by_id(id, document_number, status, issue_date)
    `)
    .eq('id', documentId)
    .single()
  ```
- **RF-02**: Cargar historial de versiones (docs del mismo tipo y misma entidad):
  ```
  supabase.from('regulatory_documents')
    .select('id, document_number, issue_date, expiry_date, status, file_path')
    .eq('doc_type_id', doc.doc_type_id)
    .eq('batch_id', doc.batch_id)  // o product_id, facility_id, etc. según vinculación
    .order('issue_date', { ascending: false })
  ```
- **RF-03**: Si el documento no existe o no es accesible (RLS), mostrar 404

### Edición de datos

- **RF-04**: Actualizar información general:
  ```
  supabase.from('regulatory_documents')
    .update({ document_number, notes })
    .eq('id', documentId)
  ```
- **RF-05**: Actualizar campos dinámicos (field_data):
  ```
  supabase.from('regulatory_documents')
    .update({ field_data: updatedFieldData })
    .eq('id', documentId)
  ```
- **RF-06**: Actualizar vinculaciones:
  ```
  supabase.from('regulatory_documents')
    .update({ batch_id, product_id, facility_id, shipment_id, inventory_item_id, quality_test_id })
    .eq('id', documentId)
  ```
- **RF-07**: Solo se puede editar si status='draft' o 'valid'. Los docs expired/revoked/superseded son read-only

### Archivo adjunto

- **RF-08**: Subir/reemplazar archivo:
  1. Upload a Storage: `regulatory-documents/{company_id}/{doc_type_code}/{document_id}.{ext}`
  2. Si había archivo previo, eliminar el anterior del Storage
  3. Update: `{ file_path, file_name, file_size_bytes, file_mime_type }`
- **RF-09**: Descargar archivo: generar signed URL (3600s) y abrir en nueva pestaña
- **RF-10**: Preview inline: para PDFs usar viewer embebido, para imágenes mostrar en `<img>` con zoom

### Cambios de status

- **RF-11**: Publicar (draft → valid):
  - Requiere: file_path no null (debe tener archivo adjunto)
  - Requiere: todos los campos required del schema deben tener valor
  - `update({ status: 'valid' }).eq('id', documentId)`
- **RF-12**: Verificar:
  - `update({ verified_by: auth.uid(), verified_at: now() }).eq('id', documentId)`
  - Solo admin/manager
- **RF-13**: Revocar (valid → revoked):
  - `update({ status: 'revoked' }).eq('id', documentId)`
  - Solo admin/manager. Requiere razón (almacenada en notes o campo dedicado)
- **RF-14**: Superseder:
  1. Crear nuevo documento del mismo tipo con mismas vinculaciones:
     ```
     supabase.from('regulatory_documents')
       .insert({
         doc_type_id: doc.doc_type_id,
         batch_id: doc.batch_id,
         product_id: doc.product_id,
         ...vinculaciones,
         field_data: copyData ? doc.field_data : {},
         issue_date: today,
         expiry_date: calculateExpiry(today, doc_type.valid_for_days),
         status: 'draft'
       })
       .select().single()
     ```
  2. Actualizar documento actual: `{ status: 'superseded', superseded_by_id: newDoc.id }`
  3. Navegar al nuevo documento
- **RF-15**: Renovar (expired → crea nuevo):
  - Similar a superseder pero partiendo de un doc expirado
  - Pre-llena field_data del doc anterior
  - No cambia status del doc actual (ya está expired)

### Navegación

- **RF-16**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-17**: Click en envío navega a `/inventory/shipments/{shipmentId}` (PRD 20)
- **RF-18**: Click en test de calidad navega a `/quality/tests/{testId}` (PRD 30)
- **RF-19**: Click en versión anterior/siguiente navega al detalle de esa versión
- **RF-20**: Botón "Volver a documentos" navega a `/regulatory/documents` (PRD 31)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 — regulatory_documents tiene company_id directo
- **RNF-02**: El formulario dinámico se genera completamente desde el schema JSONB — no requiere código custom por tipo de documento
- **RNF-03**: Los archivos se almacenan con aislamiento por company_id en Supabase Storage
- **RNF-04**: La preview de PDF usa un viewer embebido ligero — no se carga la librería si no hay PDF
- **RNF-05**: El historial de versiones se consulta solo cuando hay superseded_by_id o cuando se detectan múltiples docs del mismo tipo para la misma entidad — no se carga siempre
- **RNF-06**: Los cambios de status son operaciones simples (no transaccionales) excepto superseder que crea+actualiza en secuencia
- **RNF-07**: Las URLs firmadas de descarga expiran en 1 hora (3600s)

## Flujos principales

### Happy path — Editar y completar borrador

1. Supervisor navega a `/regulatory/documents/{id}` — CoA en status draft
2. Header: "Certificado de Análisis" · #— · Categoría: quality · draft (gris)
3. Actualiza: Número=CHL-2026-0445
4. Campos dinámicos: lab_name="ChemHistory Labs", analysis_date="25/02/2026", THC%=23.5, approval_status="approved"
5. Sube PDF del certificado → archivo aparece en preview
6. Click "Publicar" → validaciones pasan → status='valid'
7. Header cambia: valid (verde), "Vigente hasta 25/02/2027"

### Verificar documento

1. Manager navega al detalle de un CoA con status=valid
2. Revisa datos, abre PDF
3. Click "Verificar" → badge "Verificado por María García el 25/02/2026"
4. Toast: "Documento verificado"

### Revocar documento defectuoso

1. Se descubre que un certificado tiene datos incorrectos
2. Admin navega al detalle → click "Revocar"
3. Dialog: "¿Revocar el CoA #CHL-2026-0445?"
4. Razón: "Datos de análisis incorrectos — el laboratorio emitió corrección"
5. Confirma → status='revoked' (naranja). Documento read-only
6. Click "Superseder" en la misma página → crea nueva versión draft
7. Navega al nuevo documento para cargar datos corregidos

### Renovar certificado expirado

1. Manager ve en el listado que el certificado orgánico expiró
2. Navega al detalle → banner rojo "Vencido desde 15/02/2026"
3. Click "Renovar"
4. Dialog: pre-llena datos del doc anterior, issue_date=hoy, expiry_date=25/02/2027
5. Confirma → crea nuevo draft vinculado al mismo batch
6. Navega al nuevo documento → sube el certificado renovado → publica

### Ver historial de versiones

1. Navega a un CoA que fue superseeded
2. Sección "Historial de versiones": v1 (superseded, 01/01/2026) → v2 (superseded, 15/01/2026) → v3 (valid, 25/02/2026)
3. Click en v1 → navega al detalle de v1 para consulta

### Documento sin vencimiento

1. Navega a un "Certificado de Proveedor" — doc_type sin valid_for_days
2. Fecha vencimiento: "No expira"
3. El documento permanece valid indefinidamente (no es afectado por expire_documents pg_cron)

## Estados y validaciones

### Estados de UI — Página

| Estado    | Descripción                                                           |
| --------- | --------------------------------------------------------------------- |
| loading   | Skeleton de secciones                                                 |
| loaded    | Documento con datos, formulario editable o read-only según status     |
| not-found | Documento no encontrado — 404                                         |
| error     | "Error al cargar el documento. Intenta nuevamente" + reintentar       |

### Estados de UI — Edición

| Estado     | Descripción                                                |
| ---------- | ---------------------------------------------------------- |
| idle       | Sin cambios pendientes                                     |
| dirty      | Cambios sin guardar — indicador visual                     |
| saving     | Guardando cambios — botón loading                          |
| saved      | Toast éxito, indicador limpio                              |
| error      | Toast error, cambios se mantienen para reintentar          |

### Estados de UI — Upload de archivo

| Estado     | Descripción                                      |
| ---------- | ------------------------------------------------ |
| empty      | Sin archivo — zona drag & drop                   |
| uploading  | Progreso de upload                               |
| uploaded   | Preview + info del archivo                       |
| error      | Error de upload — reintentar                     |

### Validaciones Zod — Editar documento

```
document_number: z.string().max(100).optional().or(z.literal(''))
notes: z.string().max(2000).optional().or(z.literal(''))
```

### Validaciones de campos dinámicos (field_data)

Se generan dinámicamente desde el schema `required_fields`:
```
// Para cada campo en doc_type.required_fields.fields:
if (field.required && field.type === 'text') → z.string().min(1, `${field.label} es requerido`)
if (field.required && field.type === 'number') → z.number({ message: `${field.label} debe ser numérico` })
if (field.required && field.type === 'date') → z.string().min(1, `${field.label} es requerida`)
if (field.required && field.type === 'select') → z.enum(field.options, { message: `Selecciona ${field.label}` })
if (field.required && field.type === 'boolean') → z.boolean()
// Campos no required: .optional().nullable()
```

### Validaciones de publicar (draft → valid)

- Archivo adjunto requerido: file_path no debe ser null
- Todos los campos required del schema deben tener valor en field_data
- issue_date debe estar presente

### Errores esperados

| Escenario                             | Mensaje al usuario                                                    |
| ------------------------------------- | --------------------------------------------------------------------- |
| Documento no encontrado               | "Documento no encontrado" (404)                                       |
| Campo dinámico requerido vacío        | "{label} es requerido" (inline)                                       |
| Publicar sin archivo                  | "Se requiere un archivo adjunto para publicar el documento" (toast)   |
| Publicar sin campos requeridos        | "Completa los campos obligatorios antes de publicar" (toast)          |
| Error subiendo archivo                | "Error al subir el archivo. Intenta nuevamente" (toast)               |
| Error guardando cambios               | "Error al guardar. Intenta nuevamente" (toast)                        |
| Error revocando                       | "Error al revocar el documento" (toast)                               |
| Error creando nueva versión           | "Error al crear nueva versión" (toast)                                |
| Archivo demasiado grande              | "El archivo no puede superar 10MB" (inline)                           |
| Formato no soportado                  | "Formato no soportado. Usa PDF, JPEG o PNG" (inline)                  |
| Error de red                          | "Error de conexión. Intenta nuevamente" (toast)                       |

## Dependencias

- **Páginas relacionadas**:
  - `/regulatory/documents` — listado de documentos (PRD 31)
  - `/production/batches/[id]` — detalle de batch, tab regulatorio (PRD 25)
  - `/inventory/shipments/[id]` — documentos del envío (PRD 20)
  - `/quality/tests/[id]` — test de calidad vinculado (PRD 30)
  - `/settings/regulatory-config` — configuración de tipos de documento (PRD 13)
- **Supabase Storage**: Bucket `regulatory-documents/{company_id}/{doc_type_code}/` para archivos
- **Supabase client**: PostgREST para CRUD directo
- **React Query**: Cache keys `['regulatory-documents', documentId]`, `['regulatory-doc-versions', { docTypeId, entityId }]`, `['regulatory-documents']` (invalidar lista al cambiar status)
