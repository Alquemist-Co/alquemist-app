# Envíos

## Metadata

- **Ruta**: `/inventory/shipments`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (lectura + crear + cambiar estado), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formulario de creación/edición)
- **Edge Functions**: Ninguna en esta página — CRUD via PostgREST. La confirmación de recepción se maneja en PRD 20 via Edge Function `confirm-shipment-receipt`

## Objetivo

Gestionar los envíos (shipments) de material entrante y saliente: crear nuevos envíos, asignar items (líneas de productos), registrar información de transporte, y gestionar el flujo de estados. Cada envío tiene un `shipment_code` auto-generado y una máquina de estados con 8 status posibles.

Esta página cubre la **lista** y **creación/edición** de envíos. La inspección detallada, carga de documentos y confirmación de recepción se manejan en la página de detalle (PRD 20).

Los envíos son el punto de entrada de material al sistema de inventario. Al confirmar recepción (PRD 20), se crean `inventory_items` e `inventory_transactions`.

Usuarios principales: supervisores que registran envíos entrantes, managers que gestionan logística.

## Tablas del modelo involucradas

| Tabla                     | Operaciones | Notas                                                                          |
| ------------------------- | ----------- | ------------------------------------------------------------------------------ |
| shipments                 | R/W         | CRUD completo. RLS Pattern 1 (company_id directo). shipment_code auto-generado |
| shipment_items            | R/W         | Líneas del envío — nested CRUD inline                                          |
| suppliers                 | R           | Select para proveedor en envíos inbound                                        |
| facilities                | R           | Select para destination_facility_id                                            |
| products                  | R           | Select para producto de cada línea                                             |
| units_of_measure          | R           | Select para unidad de cada línea                                               |
| zones                     | R           | Select para destination_zone_id de cada línea                                  |
| shipment_doc_requirements | R           | Consultar documentos requeridos para los productos del envío (informativo)     |

## ENUMs utilizados

| ENUM               | Valores                                                                                                    | Tabla.campo      |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| shipment_direction | inbound \| outbound                                                                                        | shipments.type   |
| shipment_status    | scheduled \| in_transit \| received \| inspecting \| accepted \| partial_accepted \| rejected \| cancelled | shipments.status |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Envíos" + breadcrumb (Inventario > Envíos) + botón "Nuevo envío" (variant="primary", visible para admin/manager/supervisor)
- **Tabs** — Inbound / Outbound (filtra por `shipments.type`)
- **Barra de filtros** — Inline
  - Select: Estado (Todos / scheduled / in_transit / received / inspecting / accepted / partial_accepted / rejected / cancelled) con labels en español:
    - scheduled → "Programado"
    - in_transit → "En tránsito"
    - received → "Recibido"
    - inspecting → "En inspección"
    - accepted → "Aceptado"
    - partial_accepted → "Aceptado parcial"
    - rejected → "Rechazado"
    - cancelled → "Cancelado"
  - Select: Proveedor (Todos / lista de suppliers activos) — solo visible en tab Inbound
  - Select: Facility destino (Todas / lista de facilities)
  - Input: Buscar por código de envío o referencia de orden de compra
  - DateRange: Rango de fechas (estimated_arrival_date o actual_arrival_date)
- **Tabla de envíos** — Server Component con datos paginados
  - Columnas: Código (shipment_code), Tipo (badge: Entrada/Salida), Proveedor/Destino (supplier.name o origin_name), Facility destino, Fecha estimada, Fecha real llegada, Items (count), Estado (badge con color por status), Acciones
  - Colores de badge de estado:
    - scheduled → gris
    - in_transit → azul
    - received → amarillo
    - inspecting → naranja
    - accepted → verde
    - partial_accepted → verde claro
    - rejected → rojo
    - cancelled → gris oscuro
  - Acciones por fila (dropdown menu):
    - "Ver detalle" → navega a `/inventory/shipments/{id}` (PRD 20)
    - "Editar" → abre formulario de edición (solo si status = scheduled o in_transit, solo admin/manager/supervisor)
    - "Cancelar" → cambia status a cancelled con confirmación (solo si status = scheduled o in_transit)
  - Paginación server-side (20 por página)
  - Ordenamiento por fecha estimada de llegada (más reciente primero)
  - Click en fila → navega a `/inventory/shipments/{id}`
- **Formulario: Crear/Editar envío** — Página o modal amplio
  - **Sección 1: Datos del envío**
    - Código: auto-generado, read-only (formato: SHP-{YYYY}-{NNNN})
    - Select: Tipo (req) — inbound / outbound con labels:
      - inbound → "Entrada (compra/recepción)"
      - outbound → "Salida (venta/envío)"
    - Select: Proveedor (req para inbound, oculto en outbound) — suppliers activos
    - Input: Origen (opt para inbound si se quiere override; req para outbound) — origin_name
    - Input: Dirección de origen (opt) — origin_address
    - Select: Facility destino (req) — facilities activas
    - Input: Referencia orden de compra (opt) — purchase_order_ref
  - **Sección 2: Transporte**
    - Input: Nombre transportista (opt) — carrier_name
    - Input: Vehículo / placa (opt) — carrier_vehicle
    - Input: Conductor (opt) — carrier_driver
    - Input: Contacto conductor (opt) — carrier_contact
    - DateTimePicker: Fecha despacho (opt) — dispatch_date
    - DateTimePicker: Fecha estimada llegada (opt) — estimated_arrival_date
    - **Sub-sección: Condiciones de transporte** (JSONB `transport_conditions`)
      - Toggle: Temperatura controlada
      - Input: Rango de temperatura (°C) — si toggle activo
      - Input: Tipo de empaque
      - Input: Duración estimada (horas)
      - Input: Distancia (km)
      - Toggle: Cadena de frío mantenida
  - **Sección 3: Items del envío** (nested CRUD)
    - Tabla inline editable de `shipment_items`:
      - Columnas: Producto (select), Cantidad esperada (number), Unidad (select), Lote proveedor (input, opt), Costo/unidad (number, opt), Zona destino (select, opt), Acciones
      - Botón "Agregar línea"
      - Cada fila: Select producto (req), Input cantidad esperada (req), Select unidad (req, default: product.default_unit_id), Input supplier_lot_number (opt), Input cost_per_unit (opt), Select zona destino (opt, filtrado por facility destino), botón eliminar
    - Al menos 1 línea requerida
    - **Info de documentos requeridos** (read-only, debajo de la tabla): basado en `shipment_doc_requirements` para los productos agregados. Muestra: "Documentos requeridos para este envío: Guía ICA (obligatorio), Certificado de origen (obligatorio), Factura (obligatorio)". Esta info es informativa — los documentos se gestionan en PRD 20.
  - Input: Notas (opt, textarea)
  - Botón "Guardar envío" (variant="primary")

**Responsive**: Tabla de listado con scroll horizontal. Formulario apilado verticalmente en móvil.

## Requisitos funcionales

### Listado

- **RF-01**: Al cargar la página, obtener envíos via Server Component: `supabase.from('shipments').select('*, supplier:suppliers(name), facility:facilities(name), items:shipment_items(count)').eq('type', 'inbound').order('estimated_arrival_date', { ascending: false })` con paginación
- **RF-02**: Tabs Inbound/Outbound filtran por `shipments.type`
- **RF-03**: Filtros se aplican como query params en la URL para deep-linking
- **RF-04**: Filtro de búsqueda: `.or('shipment_code.ilike.%term%,purchase_order_ref.ilike.%term%')`
- **RF-05**: Filtro de estado: `.eq('status', statusValue)`
- **RF-06**: Filtro de proveedor: `.eq('supplier_id', supplierId)`
- **RF-07**: Filtro de fecha: `.gte('estimated_arrival_date', startDate).lte('estimated_arrival_date', endDate)`

### Creación/Edición

- **RF-08**: El `shipment_code` se genera automáticamente en el servidor al insertar (trigger o default value): formato `SHP-{YYYY}-{NNNN}` con contador secuencial por empresa por año
- **RF-09**: Al crear envío, insertar en shipments con status='scheduled'. Luego insertar shipment_items con el shipment_id retornado
- **RF-10**: El `company_id` NO se envía desde el cliente — RLS lo inyecta automáticamente
- **RF-11**: Para envíos inbound, el proveedor es requerido. Para outbound, origin_name es requerido
- **RF-12**: Al agregar items, el select de unidad se pre-selecciona con `product.default_unit_id`
- **RF-13**: El select de zona destino de cada item se filtra por la facility destino seleccionada en el envío
- **RF-14**: Consultar `shipment_doc_requirements` para los productos de los items y mostrar documentos requeridos como info (no bloquea la creación)
- **RF-15**: Solo se puede editar un envío en status `scheduled` o `in_transit`. En otros status, el formulario es read-only
- **RF-16**: Cancelar envío: `shipments.update({ status: 'cancelled' })` con dialog de confirmación. Solo si status = scheduled o in_transit

### Máquina de estados

- **RF-17**: Transiciones de estado permitidas:
  - `scheduled` → `in_transit` | `cancelled`
  - `in_transit` → `received` | `cancelled`
  - `received` → `inspecting` (automático al empezar inspección en PRD 20)
  - `inspecting` → `accepted` | `partial_accepted` | `rejected` (resultado de inspección en PRD 20)
  - No hay transiciones desde `accepted`, `partial_accepted`, `rejected` o `cancelled` (estados terminales)
- **RF-18**: Desde esta página solo se pueden hacer transiciones: scheduled→in_transit (botón "Marcar en tránsito") e in_transit→received (botón "Marcar recibido"). Las demás transiciones ocurren en PRD 20
- **RF-19**: Al marcar como "Recibido", solicitar opcionalmente `actual_arrival_date` y `received_by`
- **RF-20**: Validar campos con Zod antes de enviar
- **RF-21**: Tras operación exitosa, invalidar caches: `['shipments']`, `['shipments', shipmentId]`

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 (company_id directo) para lectura y escritura + Pattern 3 (admin/manager/supervisor) para escritura
- **RNF-02**: El `shipment_code` es generado server-side — nunca desde el cliente (previene colisiones y manipulación)
- **RNF-03**: Los items del envío se guardan en `shipment_items`, no como JSONB (a diferencia de recipes.items), porque cada item tiene su propio ciclo de vida (inspección, inventory_item creado, etc.)
- **RNF-04**: El JSONB `transport_conditions` tiene schema flexible — campos vacíos se omiten
- **RNF-05**: Paginación server-side para el listado principal
- **RNF-06**: Soft delete no aplica a shipments — se usa status='cancelled' en su lugar

## Flujos principales

### Happy path — Crear envío inbound

1. Supervisor navega a `/inventory/shipments`
2. Click "Nuevo envío" → se abre formulario
3. Selecciona tipo=inbound, proveedor="Banco Genético XYZ", facility destino="Invernadero Principal"
4. Llena datos de transporte: transportista, vehículo, fecha estimada llegada
5. Agrega items:
   - SEM-GELATO-FEM, 100 semillas, lote proveedor="BG-2026-089", $2.50/u, zona="Almacén Semillas"
6. La sección informativa muestra: "Docs requeridos: Guía ICA, Certificado de origen genético, Factura"
7. Click "Guardar envío" → insert shipment (status=scheduled) + insert shipment_item → toast "Envío SHP-2026-0015 creado"

### Marcar en tránsito

1. Envío con status=scheduled visible en la tabla
2. Click "Marcar en tránsito" en dropdown de acciones
3. Status cambia a `in_transit` → badge azul → toast "Envío marcado como en tránsito"

### Marcar recibido

1. Envío con status=in_transit
2. Click "Marcar recibido" en dropdown de acciones
3. Mini-dialog solicita: fecha real de llegada (default: ahora), recibido por (default: usuario actual)
4. Confirma → status=received → badge amarillo → toast "Envío recibido"
5. Siguiente paso: ir a detalle (PRD 20) para inspección

### Cancelar envío

1. Envío con status=scheduled o in_transit
2. Click "Cancelar" → dialog: "¿Cancelar el envío SHP-2026-0015? Esta acción no se puede deshacer."
3. Confirma → status=cancelled → badge gris oscuro

### Filtrar envíos por estado

1. Tab "Inbound" seleccionado
2. Selecciona estado "En inspección"
3. Tabla muestra solo envíos inbound en inspección
4. URL actualizada: `/inventory/shipments?type=inbound&status=inspecting`

### Crear envío outbound

1. Selecciona tipo=outbound
2. El campo de proveedor se oculta
3. Se requiere origin_name (de dónde sale)
4. Facility destino puede ser la misma o diferente
5. Resto del flujo igual

### Vista solo lectura (operator/viewer)

1. Navega a `/inventory/shipments`
2. Ve la tabla sin botón "Nuevo envío" y sin acciones de edición/cancelación
3. Click en fila navega al detalle (PRD 20)

## Estados y validaciones

### Estados de UI — Listado

| Estado         | Descripción                                                    |
| -------------- | -------------------------------------------------------------- |
| loading        | Skeleton de tabla mientras carga                               |
| loaded         | Tabla con datos, tabs y filtros activos                        |
| empty          | Sin envíos — "No hay envíos registrados. Crea el primero."     |
| empty-filtered | Sin resultados — "No se encontraron envíos"                    |
| error          | Error al cargar — "Error al cargar envíos. Intenta nuevamente" |

### Estados de UI — Formulario

| Estado     | Descripción                           |
| ---------- | ------------------------------------- |
| idle       | Campos listos                         |
| submitting | Botón loading, campos read-only       |
| success    | Redirige/cierra, toast éxito          |
| error      | Toast error, formulario re-habilitado |

### Máquina de estados del envío (diagrama)

```
scheduled ──→ in_transit ──→ received ──→ inspecting ──→ accepted
    │              │                          │       ├──→ partial_accepted
    │              │                          │       └──→ rejected
    └──→ cancelled ←┘
```

### Validaciones Zod — Envío

```
type: z.enum(['inbound', 'outbound'], { message: 'Selecciona un tipo' })
supplier_id: z.string().uuid('Selecciona un proveedor').optional().nullable()
origin_name: z.string().max(300).optional().or(z.literal(''))
origin_address: z.string().max(500).optional().or(z.literal(''))
destination_facility_id: z.string().uuid('Selecciona una instalación destino')
carrier_name: z.string().max(200).optional().or(z.literal(''))
carrier_vehicle: z.string().max(200).optional().or(z.literal(''))
carrier_driver: z.string().max(200).optional().or(z.literal(''))
carrier_contact: z.string().max(50).optional().or(z.literal(''))
dispatch_date: z.string().datetime().optional().nullable()
estimated_arrival_date: z.string().datetime().optional().nullable()
transport_conditions: z.object({
  temperature_controlled: z.boolean().optional(),
  temperature_range_c: z.string().max(50).optional().or(z.literal('')),
  packaging_type: z.string().max(200).optional().or(z.literal('')),
  duration_hours: z.number().nonnegative().optional().nullable(),
  distance_km: z.number().nonnegative().optional().nullable(),
  cold_chain_maintained: z.boolean().optional(),
}).optional().nullable()
purchase_order_ref: z.string().max(100).optional().or(z.literal(''))
notes: z.string().max(2000).optional().or(z.literal(''))
```

Con refinamiento: si `type === 'inbound'`, `supplier_id` es requerido. Si `type === 'outbound'`, `origin_name` es requerido.

### Validaciones Zod — Item del envío

```
product_id: z.string().uuid('Selecciona un producto')
expected_quantity: z.number().positive('La cantidad debe ser mayor a 0')
unit_id: z.string().uuid('Selecciona una unidad')
supplier_lot_number: z.string().max(100).optional().or(z.literal(''))
supplier_batch_ref: z.string().max(100).optional().or(z.literal(''))
cost_per_unit: z.number().nonnegative('No puede ser negativo').optional().nullable()
destination_zone_id: z.string().uuid().optional().nullable()
```

### Errores esperados

| Escenario                                | Mensaje al usuario                                         |
| ---------------------------------------- | ---------------------------------------------------------- |
| Tipo no seleccionado                     | "Selecciona un tipo" (inline)                              |
| Proveedor requerido (inbound)            | "Selecciona un proveedor" (inline)                         |
| Facility destino no seleccionada         | "Selecciona una instalación destino" (inline)              |
| Sin items                                | "Agrega al menos una línea al envío" (inline)              |
| Producto no seleccionado (en item)       | "Selecciona un producto" (inline)                          |
| Cantidad <= 0 (en item)                  | "La cantidad debe ser mayor a 0" (inline)                  |
| Intentar editar envío en estado terminal | "No se puede editar un envío en estado {status}" (toast)   |
| Intentar cancelar envío ya procesado     | "No se puede cancelar un envío en estado {status}" (toast) |
| Error de red                             | "Error de conexión. Intenta nuevamente" (toast)            |
| Permiso denegado (RLS)                   | "No tienes permisos para modificar envíos" (toast)         |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/shipments/[id]` — detalle del envío con inspección y confirmación (PRD 20)
  - `/inventory/suppliers` — proveedores deben existir para envíos inbound (PRD 18)
  - `/areas/facilities` — facilities deben existir para destino (PRD 14)
  - `/areas/zones` — zonas para destino de items (PRD 15)
  - `/inventory/products` — productos para items del envío (PRD 17)
  - `/settings/regulatory-config` — shipment_doc_requirements para info de docs requeridos (Fase 2)
- **Supabase client**: PostgREST para CRUD
- **React Query**: Cache keys `['shipments']`, `['shipments', shipmentId]` para invalidación
