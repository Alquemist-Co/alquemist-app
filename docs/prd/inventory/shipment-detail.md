# Detalle de Envío

## Metadata

- **Ruta**: `/inventory/shipments/[id]`
- **Roles con acceso**: admin (todas las acciones), manager (todas las acciones), supervisor (lectura + inspección + confirmar recepción), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Components para formularios de inspección y confirmación)
- **Edge Functions**: `confirm-shipment-receipt` — confirma recepción, crea inventory_items e inventory_transactions transaccionalmente

## Objetivo

Gestionar el flujo completo de recepción de un envío: visualizar las líneas del envío, inspeccionar cada línea (registrar cantidad recibida, rechazada, resultado y notas), verificar/cargar documentos requeridos, y confirmar la recepción que genera los lotes de inventario.

Esta es la página más compleja de la Fase 3 porque implementa el **Flujo 7** del data model: recepción con trazabilidad de transporte. El flujo es multi-paso: (1) revisar líneas, (2) inspeccionar cada línea, (3) verificar documentos requeridos, (4) confirmar recepción → crear inventory_items + inventory_transactions transaccionalmente.

Usuarios principales: supervisores que reciben material, managers que supervisan logística.

## Tablas del modelo involucradas

| Tabla                     | Operaciones | Notas                                                                                                             |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| shipments                 | R/W         | Leer datos del envío, actualizar status (received→inspecting→accepted/partial/rejected)                           |
| shipment_items            | R/W         | Leer líneas, escribir: received_quantity, rejected_quantity, inspection_result, inspection_notes, inspection_data |
| suppliers                 | R           | Nombre del proveedor                                                                                              |
| facilities                | R           | Nombre de facility destino                                                                                        |
| products                  | R           | Nombre y datos de cada producto de las líneas                                                                     |
| units_of_measure          | R           | Unidades de cada línea                                                                                            |
| zones                     | R           | Zona destino de cada línea                                                                                        |
| shipment_doc_requirements | R           | Documentos requeridos para los productos del envío                                                                |
| regulatory_doc_types      | R           | Tipos de documentos para mostrar nombre/descripción                                                               |
| regulatory_documents      | R/W         | Documentos regulatorios cargados para este envío. Leer existentes, crear nuevos                                   |
| inventory_items           | W           | Creados al confirmar recepción (via Edge Function)                                                                |
| inventory_transactions    | W           | Creadas al confirmar recepción: type='receipt' por cada línea aceptada (via Edge Function)                        |

## ENUMs utilizados

| ENUM                      | Valores                                                                                                                                                                    | Tabla.campo                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| shipment_status           | scheduled \| in_transit \| received \| inspecting \| accepted \| partial_accepted \| rejected \| cancelled                                                                 | shipments.status                                                               |
| inspection_result         | accepted \| accepted_with_observations \| rejected \| quarantine                                                                                                           | shipment_items.inspection_result                                               |
| shipment_direction        | inbound \| outbound                                                                                                                                                        | shipments.type                                                                 |
| source_type               | purchase \| production \| transfer \| transformation                                                                                                                       | inventory_items.source_type (se usa 'purchase' para items de shipment inbound) |
| lot_status                | available \| quarantine \| expired \| depleted                                                                                                                             | inventory_items.lot_status                                                     |
| transaction_type          | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type (se usa 'receipt' y opcionalmente 'waste')         |
| shipment_doc_applies_when | always \| interstate \| international \| regulated_material                                                                                                                | shipment_doc_requirements.applies_when                                         |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Inventario > Envíos > {shipment_code}) + título "{shipment_code}" + badges de tipo (Entrada/Salida) y estado + botones de acción según estado actual
- **Barra de progreso** — Stepper horizontal que muestra el progreso del flujo:
  - Paso 1: "Recibido" (check si status >= received)
  - Paso 2: "Inspeccionado" (check si todas las líneas tienen inspection_result)
  - Paso 3: "Documentos" (check si todos los docs mandatorios están cargados)
  - Paso 4: "Confirmado" (check si status = accepted | partial_accepted | rejected)

- **Sección 1: Información del Envío** — Card (read-only, datos del PRD 19)
  - Código: shipment_code
  - Tipo: inbound/outbound
  - Proveedor: supplier.name (si inbound)
  - Origen: origin_name + origin_address
  - Facility destino: facility.name
  - Transporte: carrier_name, carrier_vehicle, carrier_driver, carrier_contact
  - Fechas: despacho, estimada llegada, real llegada
  - Condiciones: datos de transport_conditions
  - Referencia OC: purchase_order_ref
  - Recibido por: received_by (nombre de usuario)
  - Notas

- **Sección 2: Líneas del Envío / Inspección** — Card principal
  - Tabla de `shipment_items`:
    - Columnas: #, Producto (nombre + SKU), Cantidad esperada, Cantidad recibida (editable si en inspección), Cantidad rechazada (editable), Unidad, Lote proveedor, Costo/u, Zona destino, Resultado inspección (select editable), Notas inspección (textarea), Acciones
    - **Modo lectura** (status = scheduled | in_transit | accepted | partial_accepted | rejected | cancelled):
      - Columnas de inspección muestran valores registrados (o "Pendiente" si vacíos)
    - **Modo inspección** (status = received | inspecting):
      - Columnas de inspección son editables
      - `received_quantity` default = `expected_quantity`
      - `rejected_quantity` default = 0
      - Select `inspection_result` con labels en español:
        - accepted → "Aceptado"
        - accepted_with_observations → "Aceptado con observaciones"
        - rejected → "Rechazado"
        - quarantine → "Cuarentena"
      - Textarea `inspection_notes` — observaciones de inspección
      - Botón "Guardar inspección" por línea o botón global "Guardar todas las inspecciones"
    - **Resumen de inspección** (debajo de la tabla):
      - Total esperado vs total recibido vs total rechazado
      - Líneas aceptadas / con observaciones / rechazadas / en cuarentena / pendientes
    - **Datos de inspección extendidos** (JSONB `inspection_data`, expandible por línea):
      - Campos dinámicos según tipo de producto (ej: para semillas: seed_coat_intact, viable_count, damaged_count)

- **Sección 3: Documentos Requeridos** — Card
  - Tabla de documentos requeridos (derivada de `shipment_doc_requirements` para los productos del envío):
    - Columnas: Tipo de documento (doc_type.name), Producto/Categoría, Obligatorio (badge), Aplica cuando (badge), Estado (badge: Cargado ✅ / Pendiente ⚠️ / No aplica)
    - Para cada documento requerido:
      - Si ya existe un `regulatory_document` con `shipment_id=este envío` y `doc_type_id` correspondiente → "Cargado" con link al documento
      - Si no existe y es obligatorio → "Pendiente" con botón "Cargar documento"
      - Si no existe y es opcional → "No aplica" o "Pendiente (opcional)"
  - **Botón "Cargar documento"** → abre dialog:
    - Select: Tipo de documento (pre-seleccionado)
    - Formulario dinámico basado en `regulatory_doc_types.required_fields` (campos generados desde el JSON schema)
    - Input file: Adjunto (PDF, imagen) → sube a Supabase Storage `shipment-documents/{company_id}/{shipment_id}/`
    - Input: Número de documento (opt)
    - DatePicker: Fecha de emisión (req)
    - Botón "Guardar documento"
  - **Compliance status**: badge global — "Documentos completos" (verde) | "Documentos pendientes: {n}" (amarillo) | "Documentos faltantes obligatorios: {n}" (rojo)

- **Sección 4: Confirmar Recepción** — Card (visible solo si status = received o inspecting)
  - Resumen pre-confirmación:
    - Líneas inspeccionadas: {n} de {total}
    - Líneas aceptadas: {n}
    - Líneas rechazadas: {n}
    - Documentos obligatorios: {cumplidos} de {total}
  - **Advertencias** (si aplican):
    - "Hay {n} líneas sin inspeccionar" (warning si hay pendientes)
    - "Faltan {n} documentos obligatorios" (warning si modo regulatorio != 'none'; error si modo = 'strict')
  - **Botón "Confirmar recepción"** (variant="primary", destructive=true):
    - Habilitado solo si todas las líneas tienen inspection_result
    - Si `company.settings.regulatory_mode === 'strict'` y faltan docs obligatorios → botón deshabilitado
    - Si `company.settings.regulatory_mode === 'standard'` y faltan docs → botón habilitado con advertencia
    - Si `company.settings.regulatory_mode === 'none'` → no verifica docs
  - **Dialog de confirmación**: "¿Confirmar recepción del envío {code}? Esto creará {n} lotes de inventario. Esta acción no se puede deshacer."

**Responsive**: Tabla de líneas con scroll horizontal. Secciones apiladas en móvil. Formularios de inspección full-width.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Al cargar la página, obtener datos completos del envío: `supabase.from('shipments').select('*, supplier:suppliers(name), facility:facilities(name), received_by_user:users!received_by(full_name), inspected_by_user:users!inspected_by(full_name)').eq('id', shipmentId).single()`
- **RF-02**: Obtener líneas: `supabase.from('shipment_items').select('*, product:products(name, sku, shelf_life_days), unit:units_of_measure(code, name), zone:zones(name), inventory_item:inventory_items(id, batch_number)').eq('shipment_id', shipmentId).order('sort_order')`
- **RF-03**: Obtener documentos requeridos: consultar `shipment_doc_requirements` para cada product_id o category_id de los items del envío
- **RF-04**: Obtener documentos cargados: `supabase.from('regulatory_documents').select('*, doc_type:regulatory_doc_types(name, code)').eq('shipment_id', shipmentId)`
- **RF-05**: Si el envío no existe o no es accesible (RLS), mostrar 404

### Inspección

- **RF-06**: Al empezar a editar campos de inspección por primera vez, el status del envío cambia automáticamente de `received` a `inspecting`: `shipments.update({ status: 'inspecting', inspected_by: auth.uid(), inspected_at: now() })`
- **RF-07**: Guardar inspección de una línea: `shipment_items.update({ received_quantity, rejected_quantity, inspection_result, inspection_notes, inspection_data }).eq('id', itemId)`
- **RF-08**: Validar que `received_quantity + rejected_quantity <= expected_quantity` — si la suma es menor, la diferencia se documenta en notas
- **RF-09**: Validar que `received_quantity >= 0` y `rejected_quantity >= 0`
- **RF-10**: Si `inspection_result = 'rejected'`, `received_quantity` debe ser 0 y `rejected_quantity` = `expected_quantity`
- **RF-11**: Si `inspection_result = 'quarantine'`, el inventory_item creado tendrá `lot_status = 'quarantine'` en lugar de 'available'
- **RF-12**: "Guardar todas las inspecciones" ejecuta batch update para todas las líneas modificadas

### Documentos

- **RF-13**: Al cargar documento regulatorio, crear `regulatory_document` con: doc_type_id, shipment_id=este envío, company_id (via RLS), issue_date, document_number, field_data (según schema del doc_type), status='valid'
- **RF-14**: El archivo adjunto se sube a Supabase Storage bucket `shipment-documents/{company_id}/{shipment_id}/{doc_id}.{ext}`
- **RF-15**: Los campos dinámicos del formulario se generan desde `regulatory_doc_types.required_fields`: cada field define key, label, type (text|textarea|date|number|boolean|select), required, options (para select), placeholder, help_text
- **RF-16**: Auto-calcular `expiry_date` si el doc_type tiene `valid_for_days`: `issue_date + valid_for_days`

### Confirmación de recepción

- **RF-17**: El botón "Confirmar recepción" invoca la Edge Function `confirm-shipment-receipt`:
  ```
  POST /functions/v1/confirm-shipment-receipt
  {
    shipment_id: UUID
  }
  ```
- **RF-18**: La Edge Function ejecuta en transacción atómica:
  1. Verificar que el shipment está en status `received` o `inspecting`
  2. Verificar que todas las líneas tienen `inspection_result`
  3. Si `company.settings.regulatory_mode === 'strict'`, verificar docs obligatorios completos
  4. Por cada línea con `inspection_result` != 'rejected':
     a. Crear `inventory_item`:
     - product_id = item.product_id
     - zone_id = item.destination_zone_id
     - quantity_available = item.received_quantity
     - unit_id = item.unit_id
     - batch_number = auto-generado o supplier_lot_number
     - supplier_lot_number = item.supplier_lot_number
     - cost_per_unit = item.cost_per_unit
     - expiration_date = item.expiration_date (o calculado desde product.shelf_life_days)
     - source_type = 'purchase'
     - lot_status = 'quarantine' si inspection_result='quarantine', 'available' si 'accepted' o 'accepted_with_observations'
     - shipment_item_id = item.id
       b. Crear `inventory_transaction`:
     - type = 'receipt'
     - inventory_item_id = nuevo item
     - quantity = received_quantity
     - unit_id = item.unit_id
     - zone_id = item.destination_zone_id
     - cost_per_unit = item.cost_per_unit
     - cost_total = cost_per_unit × received_quantity
     - user_id = usuario actual
     - timestamp = now()
       c. Actualizar `shipment_items`: inventory_item_id = nuevo item, transaction_id = nueva transacción
  5. Por cada línea con `inspection_result` = 'rejected' (y rejected_quantity > 0):
     a. Opcionalmente crear `inventory_transaction` type='waste' o 'return'
  6. Determinar status final del shipment:
     - Si todas las líneas = 'accepted' o 'accepted_with_observations' → status = 'accepted'
     - Si hay mix de accepted y rejected → status = 'partial_accepted'
     - Si todas = 'rejected' → status = 'rejected'
  7. Actualizar `shipments.status` al valor determinado
  8. Si faltan docs obligatorios → crear `alert` type='regulatory_missing'
- **RF-19**: Tras confirmación exitosa, invalidar caches: `['shipments']`, `['shipments', shipmentId]`, `['inventory-items']`, `['inventory-transactions']`
- **RF-20**: Mostrar resumen post-confirmación: "Recepción confirmada. {n} lotes de inventario creados. Status: {status final}"

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo en shipments) para lectura y escritura + herencia para shipment_items
- **RNF-02**: La confirmación de recepción es **transaccional** — si falla cualquier paso, todo se revierte. Implementada como función SQL `security definer` invocada por la Edge Function
- **RNF-03**: No hay rollback de confirmación — una vez confirmado, los inventory_items y transactions son permanentes. Ajustes posteriores se hacen con transacciones de tipo 'adjustment' o 'return'
- **RNF-04**: Los documentos regulatorios subidos se almacenan en Supabase Storage con aislamiento por company_id
- **RNF-05**: El formulario dinámico de documentos se genera desde el schema JSONB de `regulatory_doc_types.required_fields` — no requiere código custom por tipo de documento
- **RNF-06**: El comportamiento de bloqueo por documentos faltantes depende de `company.settings.regulatory_mode`:
  - `strict`: bloquea confirmación si faltan docs obligatorios
  - `standard`: permite pero muestra advertencia
  - `none`: no verifica documentos

## Flujos principales

### Happy path — Recepción completa (Flujo 7 del data model)

1. Supervisor navega a `/inventory/shipments/{id}` de un envío con status=received
2. Stepper muestra: Recibido ✅ | Inspeccionado ○ | Documentos ○ | Confirmado ○
3. **Inspección**: por cada línea, registra:
   - Línea 1: SEM-GELATO-FEM, esperado=100, recibido=98, rechazado=2, resultado=accepted_with_observations, notas="3 esquejes con raíz dañada, 2 con signos de deshidratación"
4. Click "Guardar inspección" → status cambia a `inspecting`
5. Stepper actualiza: Recibido ✅ | Inspeccionado ✅ | Documentos ○ | Confirmado ○
6. **Documentos**: ve documentos requeridos:
   - Guía ICA: Pendiente → click "Cargar documento" → llena formulario dinámico + sube PDF → "Cargado ✅"
   - Certificado de origen: click "Cargar" → llena + sube → "Cargado ✅"
   - Factura: click "Cargar" → llena + sube → "Cargado ✅"
7. Compliance: "Documentos completos" (verde)
8. Stepper: Recibido ✅ | Inspeccionado ✅ | Documentos ✅ | Confirmado ○
9. **Confirmar recepción**: click "Confirmar recepción"
10. Dialog: "¿Confirmar? Se crearán 1 lotes de inventario."
11. Confirma → Edge Function ejecuta → inventory_item creado (98 semillas, status=available, trazable al envío)
12. Toast: "Recepción confirmada. 1 lote creado. Status: Aceptado parcial"
13. Stepper: todos ✅. Envío status=partial_accepted (porque hubo rechazados)

### Recepción con material en cuarentena

1. Inspector detecta posible contaminación en una línea
2. Marca inspection_result = 'quarantine'
3. Al confirmar, el inventory_item se crea con lot_status='quarantine'
4. El material no está disponible para uso hasta que se libere manualmente (cambio de lot_status a 'available')

### Rechazo total

1. Inspector marca todas las líneas como 'rejected'
2. Confirma recepción
3. No se crean inventory_items (o solo transactions de waste/return)
4. Shipment status = 'rejected'

### Modo regulatorio estricto — bloqueo por docs faltantes

1. Company tiene regulatory_mode = 'strict'
2. Inspector completa inspección de todas las líneas
3. Falta un documento obligatorio (Guía ICA)
4. Botón "Confirmar recepción" deshabilitado
5. Mensaje: "No se puede confirmar: falta documento obligatorio 'Guía ICA'"
6. Inspector carga el documento → botón se habilita

### Modo regulatorio estándar — advertencia sin bloqueo

1. Company tiene regulatory_mode = 'standard'
2. Falta un documento obligatorio
3. Botón "Confirmar recepción" habilitado pero con advertencia: "Falta 1 documento obligatorio. ¿Confirmar de todos modos?"
4. Al confirmar, se genera alert type='regulatory_missing'

### Ver envío ya confirmado (lectura)

1. Navega al detalle de un envío con status=accepted
2. Todos los campos de inspección son read-only
3. Sección de documentos muestra docs cargados
4. Sección "Confirmar recepción" no se muestra
5. Se puede ver el inventory_item creado (link desde cada línea)

## Estados y validaciones

### Estados de UI — Página

| Estado    | Descripción                                  |
| --------- | -------------------------------------------- |
| loading   | Skeleton de secciones                        |
| loaded    | Datos completos, modo según status del envío |
| not-found | Envío no encontrado — 404                    |
| error     | Error general — "Error al cargar el envío"   |

### Estados del envío (máquina de estados completa)

| Estado actual    | Acciones disponibles en esta página          | Siguiente estado                                 |
| ---------------- | -------------------------------------------- | ------------------------------------------------ |
| scheduled        | Solo lectura. Redirigir a edición (PRD 19)   | —                                                |
| in_transit       | Solo lectura                                 | —                                                |
| received         | Inspeccionar líneas, cargar docs, confirmar  | → inspecting (auto), → accepted/partial/rejected |
| inspecting       | Continuar inspección, cargar docs, confirmar | → accepted/partial/rejected                      |
| accepted         | Solo lectura                                 | — (terminal)                                     |
| partial_accepted | Solo lectura                                 | — (terminal)                                     |
| rejected         | Solo lectura                                 | — (terminal)                                     |
| cancelled        | Solo lectura                                 | — (terminal)                                     |

### Estados de UI — Inspección de línea

| Estado    | Descripción                                                                       |
| --------- | --------------------------------------------------------------------------------- |
| pending   | Sin inspection_result — campos editables                                          |
| inspected | Con inspection_result — campos muestran valores, editables si status = inspecting |
| saving    | Guardando inspección de esta línea                                                |

### Estados de UI — Confirmación

| Estado        | Descripción                                                       |
| ------------- | ----------------------------------------------------------------- |
| not-ready     | No todas las líneas inspeccionadas — botón deshabilitado          |
| blocked       | Modo strict + docs faltantes — botón deshabilitado con mensaje    |
| ready-warning | Modo standard + docs faltantes — botón habilitado con advertencia |
| ready         | Todo completo — botón habilitado                                  |
| confirming    | Edge Function en ejecución — botón loading                        |
| confirmed     | Exitoso — toast + resumen                                         |
| error         | Error en Edge Function — toast error                              |

### Validaciones Zod — Inspección de línea

```
received_quantity: z.number().nonnegative('No puede ser negativo')
rejected_quantity: z.number().nonnegative('No puede ser negativo')
inspection_result: z.enum(['accepted', 'accepted_with_observations', 'rejected', 'quarantine'], { message: 'Selecciona un resultado' })
inspection_notes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal(''))
inspection_data: z.record(z.unknown()).optional().nullable()
```

Con refinamientos:

- `received_quantity + rejected_quantity <= expected_quantity` (mensaje: "La suma no puede superar la cantidad esperada")
- Si `inspection_result === 'rejected'`: `received_quantity` debe ser 0
- Si `inspection_result !== 'rejected'`: `received_quantity` debe ser > 0

### Validaciones Zod — Documento regulatorio

```
doc_type_id: z.string().uuid()
document_number: z.string().max(100).optional().or(z.literal(''))
issue_date: z.string().min(1, 'La fecha de emisión es requerida')
field_data: z.record(z.unknown()).default({})
```

Los campos adicionales dentro de `field_data` se validan dinámicamente según el schema `required_fields` del doc_type.

### Errores esperados

| Escenario                                | Mensaje al usuario                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| Envío no encontrado                      | "Envío no encontrado" (404)                                               |
| Cantidad recibida negativa               | "No puede ser negativo" (inline)                                          |
| Suma > esperada                          | "La suma no puede superar la cantidad esperada" (inline)                  |
| Resultado no seleccionado                | "Selecciona un resultado" (inline)                                        |
| Recibido=0 pero resultado no es rejected | "Cantidad recibida debe ser mayor a 0 si no es rechazado" (inline)        |
| Docs faltantes (strict)                  | "No se puede confirmar: faltan documentos obligatorios: {lista}" (inline) |
| Líneas sin inspeccionar                  | "Hay {n} líneas sin inspeccionar" (inline)                                |
| Error en Edge Function                   | "Error al confirmar recepción. Intenta nuevamente" (toast)                |
| Shipment ya confirmado                   | "Este envío ya fue confirmado" (toast, si se intenta doble-click)         |
| Error subiendo archivo                   | "Error al subir el archivo. Intenta nuevamente" (toast)                   |
| Error de red                             | "Error de conexión. Intenta nuevamente" (toast)                           |
| Permiso denegado                         | "No tienes permisos para confirmar envíos" (toast)                        |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/shipments` — listado de envíos, creación (PRD 19)
  - `/inventory/items` — inventory_items creados visibles aquí (Fase 7)
  - `/inventory/transactions` — transactions creadas visibles aquí (Fase 7)
  - `/regulatory/documents` — documentos cargados también visibles en módulo regulatorio (Fase 5)
  - `/settings/regulatory-config` — shipment_doc_requirements y regulatory_doc_types (Fase 2)
  - `/settings/company` — regulatory_mode controla comportamiento de bloqueo (Fase 2)
- **Edge Function**: `confirm-shipment-receipt` — orquesta la confirmación transaccional
- **Supabase Storage**: Bucket `shipment-documents/{company_id}/{shipment_id}/` para archivos adjuntos
- **Supabase client**: PostgREST para lecturas y escrituras de inspección + Edge Function para confirmación
- **React Query**: Cache keys `['shipments', shipmentId]`, `['shipment-items', shipmentId]`, `['shipment-docs', shipmentId]`, `['inventory-items']`, `['inventory-transactions']`
