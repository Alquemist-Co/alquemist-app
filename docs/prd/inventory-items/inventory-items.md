# Stock de Inventario

## Metadata

- **Ruta**: `/inventory/items`
- **Roles con acceso**: admin (lectura + ajustes + transferencias + cambio lot_status), manager (lectura + ajustes + transferencias + cambio lot_status), supervisor (lectura + transferencias), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado con paginación, Client Component para formularios de ajuste, transferencia y filtros)
- **Edge Functions**: `adjust-inventory` — crea transacción de ajuste con razón; `transfer-inventory` — crea par transfer_out + transfer_in atómicamente

## Objetivo

Vista del stock actual de todos los lotes de inventario. Muestra cantidades disponibles, reservadas y comprometidas por producto, zona y lote. Permite realizar ajustes manuales (correcciones de inventario) y transferencias entre zonas.

Este es el punto de consulta para saber "¿cuánto tengo de qué, dónde?" y realizar operaciones de gestión de stock que no son resultado de actividades de producción. Las transacciones generadas por actividades (consumo, aplicación, transformación) se crean automáticamente desde la ejecución de actividades (PRD 27) — aquí solo se ven y se gestionan ajustes/transferencias manuales.

Usuarios principales: supervisores de almacén/inventario, managers de operaciones.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                                |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------ |
| inventory_items        | R/W         | Lectura de stock + Write via Edge Functions (ajustes, transferencias, lot_status)    |
| inventory_transactions | R/W         | Lectura de historial por lote. Write via Edge Functions (adjustment, transfer)        |
| products               | R           | Producto del lote (nombre, SKU, categoría)                                           |
| resource_categories    | R           | Categoría del producto (para filtros y agrupación)                                   |
| units_of_measure       | R           | Unidad del lote                                                                      |
| zones                  | R           | Zona de almacenamiento                                                               |
| facilities             | R           | Facility de la zona (para filtros)                                                   |
| batches                | R           | Batch asociado (si el lote está vinculado a producción)                              |
| suppliers              | R           | Proveedor original (via shipment_item → shipment → supplier)                        |
| shipment_items         | R           | Referencia al envío que originó el lote                                              |
| users                  | R           | Usuarios para auditoría                                                              |

## ENUMs utilizados

| ENUM             | Valores                                                                                                                                                                    | Tabla.campo                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| source_type      | purchase \| production \| transfer \| transformation                                                                                                                       | inventory_items.source_type |
| lot_status       | available \| quarantine \| expired \| depleted                                                                                                                             | inventory_items.lot_status  |
| transaction_type | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Stock de Inventario"
  - Subtítulo: "{n} lotes activos"
  - Botón "Ajustar inventario" (variant="outline") — admin/manager
  - Botón "Transferir" (variant="outline") — admin/manager/supervisor
- **Barra de KPIs** — Row de cards compactas:
  - Lotes activos: {n} (conteo de lot_status != depleted)
  - Productos distintos: {n} (conteo de product_id únicos)
  - En cuarentena: {n} (badge amarillo, lot_status=quarantine)
  - Expirados: {n} (badge rojo, lot_status=expired)
  - Valor total: ${sum(quantity_available × cost_per_unit)} (si cost_tracking habilitado)
- **Barra de filtros** — Row de filtros combinables:
  - Search: Buscar por producto (nombre/SKU), batch_number, supplier_lot_number
  - Select: Facility (todas)
  - Select: Zona (todas, filtrado por facility)
  - Select: Producto (todos — dropdown con búsqueda)
  - Select: Categoría de producto (todas — resource_categories)
  - Select: Estado del lote (todos, available, quarantine, expired, depleted — multi-select, default=available+quarantine)
  - Select: Origen (todos, purchase, production, transfer, transformation)
  - Toggle: "Mostrar agotados" (off por default — oculta lot_status=depleted)
  - Botón "Limpiar filtros"
- **Tabla principal** — Tabla paginada server-side
  - Columnas:
    - Producto (nombre + SKU, link a `/inventory/products`)
    - Categoría (resource_category.name, badge)
    - Lote (batch_number)
    - Zona (zone.name, link)
    - Facility
    - Disponible (quantity_available, formateado con unidad — highlight verde si > 0, gris si = 0)
    - Reservado (quantity_reserved, si > 0)
    - Comprometido (quantity_committed, si > 0)
    - Costo/u (cost_per_unit, formateado con moneda — oculto si cost_tracking=false)
    - Vencimiento (expiration_date — badge: verde si > 30d, amarillo si 1-30d, rojo si vencido, — si null)
    - Origen (source_type badge: purchase=azul, production=verde, transfer=naranja, transformation=morado)
    - Estado (lot_status badge: available=verde, quarantine=amarillo, expired=rojo, depleted=gris)
    - Acciones: "Ver historial" (expande), "Ajustar" (admin/manager), "Transferir" (admin/manager/supervisor), "Cambiar estado" (admin/manager)
  - Ordenamiento: por producto + zona (default), clickeable en columnas
  - Paginación: 20 items por página
- **Fila expandible — Historial del lote** — Al hacer click en "Ver historial":
  - Mini-tabla de inventory_transactions para este lote (últimas 10):
    - Columnas: Fecha, Tipo (badge con color), Cantidad (+/-), Saldo resultante, Batch, Actividad, Usuario, Razón
    - Link "Ver todas" → `/inventory/transactions?item_id={id}` (PRD 38)
  - Info del origen:
    - Si source_type=purchase: Proveedor, Envío (link), Lote proveedor
    - Si source_type=production/transformation: Batch origen (link)
  - Trazabilidad: link al shipment de origen si aplica
- **Vista agrupada** (toggle alternativo) — Agrupar por producto
  - Tabla agrupada: una fila por producto con totales:
    - Producto, Categoría, Qty total disponible (sum), Qty total reservada, #Lotes, Valor total
  - Expandible: muestra lotes individuales debajo
  - Útil para ver inventario consolidado sin detalle de lotes
- **Dialog: Ajustar inventario** — Modal
  - Select: Lote (req) — dropdown con búsqueda mostrando producto + batch_number + zona + qty disponible
  - Input: Cantidad de ajuste (req, number) — puede ser positivo (+) o negativo (-)
  - Display: Resultado: "{qty_available} + {ajuste} = {nuevo_saldo}" (pre-cálculo)
  - Textarea: Razón del ajuste (req) — "Conteo físico: encontrados 5 unidades adicionales"
  - Botón "Aplicar ajuste" (variant="primary")
- **Dialog: Transferir** — Modal
  - Select: Lote origen (req) — dropdown mostrando producto + batch_number + zona + qty disponible
  - Select: Zona destino (req) — dropdown filtrado por facility (excluye zona actual del lote)
  - Input: Cantidad a transferir (req, number, > 0, <= quantity_available del lote)
  - Textarea: Razón (opt)
  - Display: "Se transferirán {qty} {unit} de {producto} desde {zona_origen} a {zona_destino}"
  - Botón "Transferir" (variant="primary")
- **Dialog: Cambiar estado de lote** — Modal
  - Info del lote: producto, batch_number, zona, estado actual
  - Select: Nuevo estado (available, quarantine, expired) — excluye estado actual y depleted (depleted es automático)
  - Textarea: Razón (req)
  - Botón "Cambiar estado" (variant="primary")

**Responsive**: KPIs en 2 columnas en móvil. Tabla con scroll horizontal. Dialogs full-screen. Historial expandible full-width.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación server-side:
  ```
  supabase.from('inventory_items')
    .select(`
      *,
      product:products(id, name, sku, category:resource_categories(id, name)),
      unit:units_of_measure(id, code, name),
      zone:zones(id, name, facility:facilities(id, name)),
      shipment_item:shipment_items(supplier_lot_number, shipment:shipments(shipment_code, supplier:suppliers(name)))
    `, { count: 'exact' })
    .neq('lot_status', 'depleted')  // default: ocultar agotados
    .order('product_id')
    .order('zone_id')
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: KPIs con queries de conteo en paralelo:
  ```
  -- Lotes activos (no depleted)
  supabase.from('inventory_items').select('id', { count: 'exact', head: true }).neq('lot_status', 'depleted')
  -- Productos distintos
  supabase.from('inventory_items').select('product_id', { count: 'exact', head: true }).neq('lot_status', 'depleted')
  -- En cuarentena
  supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('lot_status', 'quarantine')
  -- Expirados
  supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('lot_status', 'expired')
  ```
  Valor total: se calcula client-side o via RPC.
- **RF-03**: Filtros se aplican como query params en la query principal
- **RF-04**: Vista agrupada requiere query diferente o procesamiento client-side

### Historial expandible

- **RF-05**: Al expandir un lote, cargar últimas 10 transacciones:
  ```
  supabase.from('inventory_transactions')
    .select(`
      *,
      unit:units_of_measure(code),
      batch:batches(code),
      activity:activities(id, template:activity_templates(name)),
      user:users!user_id(full_name)
    `)
    .eq('inventory_item_id', itemId)
    .order('timestamp', { ascending: false })
    .limit(10)
  ```

### Ajustar inventario

- **RF-06**: Al confirmar ajuste, invocar Edge Function `adjust-inventory`:
  ```
  POST /functions/v1/adjust-inventory
  {
    inventory_item_id: UUID,
    quantity: number,       // positivo para incrementar, negativo para decrementar
    reason: string          // requerido
  }
  ```
  La Edge Function:
  1. Validar que el lote existe y lot_status != depleted
  2. Si quantity < 0: validar que |quantity| <= quantity_available
  3. Crear `inventory_transaction`:
     - type='adjustment'
     - quantity=|quantity|
     - reason=reason
     - user_id=auth.uid()
     - timestamp=now()
  4. Trigger `trg_update_inventory_balance` actualiza quantity_available
  5. Si quantity_available llega a 0 y quantity_reserved = 0 y quantity_committed = 0 → lot_status='depleted'
  6. Retorna: `{ transaction_id, new_quantity_available }`
- **RF-07**: Toast: "Ajuste aplicado. Nuevo saldo: {qty} {unit}"
- **RF-08**: Invalidar caches de tabla y KPIs

### Transferir

- **RF-09**: Al confirmar transferencia, invocar Edge Function `transfer-inventory`:
  ```
  POST /functions/v1/transfer-inventory
  {
    inventory_item_id: UUID,    // lote origen
    destination_zone_id: UUID,  // zona destino
    quantity: number,           // cantidad a transferir (> 0)
    reason?: string
  }
  ```
  La Edge Function ejecuta transaccionalmente:
  1. Validar que quantity <= source_item.quantity_available
  2. Crear `inventory_transaction` type='transfer_out' en el lote origen:
     - quantity, zone_id=source_zone, user_id, timestamp
  3. Crear o encontrar `inventory_item` destino:
     - Si existe lote del mismo producto en zona destino (mismo batch_number, cost_per_unit): reusar
     - Si no existe: crear nuevo inventory_item con source_type='transfer'
  4. Crear `inventory_transaction` type='transfer_in' en el lote destino:
     - quantity, zone_id=dest_zone, related_transaction_id=transfer_out.id
  5. Trigger actualiza balances en ambos items
  6. Si source queda en 0 → lot_status='depleted'
  7. Retorna: `{ transfer_out_id, transfer_in_id, destination_item_id }`
- **RF-10**: Toast: "Transferencia completada. {qty} {unit} de {producto} → {zona_destino}"

### Cambiar estado de lote

- **RF-11**: Cambio de lot_status directo:
  ```
  supabase.from('inventory_items')
    .update({ lot_status: newStatus })
    .eq('id', itemId)
  ```
- **RF-12**: Transiciones válidas:
  - available → quarantine (material sospechoso)
  - available → expired (vencimiento manual)
  - quarantine → available (liberación tras inspección)
  - quarantine → expired (vencido durante cuarentena)
  - expired → available (extensión de vida útil aprobada — raro)
  - No se puede cambiar a/desde depleted manualmente (es automático)
- **RF-13**: Toast: "Estado del lote cambiado a {status}"

### Navegación

- **RF-14**: Click en producto navega a `/inventory/products` (PRD 17) con filtro
- **RF-15**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-16**: Click en "Ver todas" en historial navega a `/inventory/transactions?item_id={id}` (PRD 38)
- **RF-17**: Click en batch navega a `/production/batches/{batchId}` (PRD 25)
- **RF-18**: Click en envío navega a `/inventory/shipments/{shipmentId}` (PRD 20)

## Requisitos no funcionales

- **RNF-01**: RLS — inventory_items se filtra via zone_id → facility → company_id. Usa `get_my_zone_ids()` para queries
- **RNF-02**: Paginación server-side (20 items por página)
- **RNF-03**: Las operaciones de ajuste y transferencia son **transaccionales** via Edge Functions — nunca operaciones parciales
- **RNF-04**: Las transacciones de inventario son **inmutables append-only** — nunca se editan ni borran. Las correcciones se hacen con transacciones de tipo 'adjustment'
- **RNF-05**: El trigger `trg_update_inventory_balance` mantiene los saldos automáticamente — no se actualizan manualmente
- **RNF-06**: Los lotes agotados (depleted) se ocultan por default para mantener la tabla limpia
- **RNF-07**: El valor total de inventario solo se muestra si `features_enabled.cost_tracking` está habilitado
- **RNF-08**: Las transferencias pueden crear nuevos inventory_items (si no existe lote equivalente en destino) o acumular en existentes

## Flujos principales

### Happy path — Consultar stock

1. Supervisor navega a `/inventory/items`
2. KPIs: 45 lotes activos, 12 productos, 2 en cuarentena, 1 expirado, Valor: $125,000
3. Filtra: Facility=Invernadero Principal, Categoría=Fertilizantes
4. Tabla: Ca(NO₃)₂ LOT-01 (Sala Veg A, 4,832g available), KNO₃ LOT-03 (Almacén, 1,916g available)...
5. Expande Ca(NO₃)₂ LOT-01 → historial: 3 transacciones de application esta semana, saldo disminuyendo
6. Origen: Proveedor Agroquímicos SAS, Envío SHP-2026-0012

### Ajuste por conteo físico

1. Manager hace conteo físico y encuentra discrepancia: el sistema dice 4,832g de Ca(NO₃)₂ pero hay 5,000g
2. Click "Ajustar inventario"
3. Selecciona lote: Ca(NO₃)₂ LOT-01 (Sala Veg A)
4. Cantidad: +168 (positivo = incremento)
5. Preview: "4,832g + 168g = 5,000g"
6. Razón: "Conteo físico 25/02/2026 — diferencia favorable"
7. Click "Aplicar ajuste" → Edge Function crea transaction type='adjustment' → trigger actualiza balance
8. Toast: "Ajuste aplicado. Nuevo saldo: 5,000g"

### Transferencia entre zonas

1. Supervisor necesita mover fertilizante del almacén a la sala de vegetación
2. Click "Transferir"
3. Lote origen: KNO₃ LOT-03 (Almacén Central, 1,916g)
4. Zona destino: Sala Vegetativa A
5. Cantidad: 500g
6. Preview: "Se transferirán 500g de KNO₃ desde Almacén Central a Sala Vegetativa A"
7. Click "Transferir" → Edge Function crea par transfer_out + transfer_in
8. Toast: "Transferencia completada. 500g → Sala Vegetativa A"
9. Tabla actualizada: LOT-03 ahora tiene 1,416g; nuevo lote en Sala Veg A con 500g

### Liberar material de cuarentena

1. Filtro: Estado=quarantine → 2 lotes en cuarentena
2. Lote de semillas recibidas con resultado de inspección: laboratorio confirma que están limpias
3. Click "Cambiar estado" en el lote
4. Nuevo estado: available
5. Razón: "Laboratorio confirma ausencia de patógenos — ref Lab-2026-0089"
6. Toast: "Estado del lote cambiado a Disponible"

### Vista agrupada por producto

1. Toggle "Vista agrupada"
2. Tabla: Ca(NO₃)₂ (3 lotes, 12,500g total, $180 valor), KNO₃ (2 lotes, 3,800g total, $95)...
3. Expande Ca(NO₃)₂ → ve los 3 lotes individuales con sus zonas y cantidades

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                        |
| ------- | ------------------------------------------------------------------ |
| loading | Skeleton de KPIs y tabla                                           |
| loaded  | KPIs y tabla con datos                                             |
| empty   | "No hay lotes de inventario. Se crearán al confirmar envíos."      |
| error   | "Error al cargar el inventario. Intenta nuevamente" + reintentar   |

### Estados de UI — Dialogs

| Estado     | Descripción                                    |
| ---------- | ---------------------------------------------- |
| idle       | Campos listos                                  |
| submitting | Botón loading, campos disabled                 |
| success    | Dialog cierra, toast éxito, tabla actualizada  |
| error      | Toast error, dialog permanece                  |

### Validaciones Zod — Ajuste

```
inventory_item_id: z.string().uuid('Selecciona un lote')
quantity: z.number().refine(v => v !== 0, 'La cantidad no puede ser 0')
reason: z.string().min(1, 'La razón es requerida').max(2000)
```

Con refinamiento: si quantity < 0, |quantity| <= item.quantity_available ("No se puede ajustar más de lo disponible")

### Validaciones Zod — Transferencia

```
inventory_item_id: z.string().uuid('Selecciona un lote origen')
destination_zone_id: z.string().uuid('Selecciona una zona destino')
quantity: z.number().positive('La cantidad debe ser mayor a 0')
reason: z.string().max(2000).optional().or(z.literal(''))
```

Con refinamientos:
- quantity <= item.quantity_available ("No hay suficiente stock disponible")
- destination_zone_id != item.zone_id ("La zona destino debe ser diferente a la actual")

### Validaciones Zod — Cambiar estado

```
lot_status: z.enum(['available', 'quarantine', 'expired'], { message: 'Selecciona un estado' })
reason: z.string().min(1, 'La razón es requerida').max(2000)
```

### Errores esperados

| Escenario                              | Mensaje al usuario                                                  |
| -------------------------------------- | ------------------------------------------------------------------- |
| Sin lotes                              | "No hay lotes de inventario" (empty)                                |
| Ajuste excede disponible               | "No se puede ajustar más de lo disponible ({qty})" (inline)        |
| Transferencia excede disponible        | "No hay suficiente stock disponible ({qty})" (inline)               |
| Transferencia misma zona               | "La zona destino debe ser diferente a la actual" (inline)           |
| Razón vacía en ajuste                  | "La razón es requerida" (inline)                                    |
| Lote agotado                           | "Este lote está agotado. No se pueden realizar operaciones" (toast) |
| Error en Edge Function                 | "Error al ejecutar la operación. Intenta nuevamente" (toast)        |
| Error de red                           | "Error de conexión. Intenta nuevamente" (toast)                     |
| Permiso denegado                       | "No tienes permisos para esta acción" (toast)                       |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/transactions` — log de transacciones (PRD 38)
  - `/inventory/products` — catálogo de productos (PRD 17)
  - `/inventory/shipments/[id]` — envío que originó el lote (PRD 20)
  - `/production/batches/[id]` — batch asociado (PRD 25)
  - `/areas/zones/[id]` — zona de almacenamiento (PRD 16)
  - `/operations/costs` — valor de inventario para COGS (PRD 36)
- **Edge Functions**:
  - `adjust-inventory` — ajuste con razón
  - `transfer-inventory` — transferencia atómica (par transfer_out + transfer_in)
- **Triggers**: `trg_update_inventory_balance` — actualiza saldos automáticamente al crear transacciones
- **pg_cron**: `check_low_inventory` — genera alertas cuando stock cae bajo mínimo
- **Feature flag**: `companies.settings.features_enabled.cost_tracking` — controla visibilidad de costos/valor
- **Supabase client**: PostgREST para lecturas + Edge Functions para operaciones
- **React Query**: Cache keys `['inventory-items', { filters, page }]`, `['inventory-item-counts']`, `['inventory-item-history', itemId]`
