# Log de Transacciones de Inventario

## Metadata

- **Ruta**: `/inventory/transactions`
- **Roles con acceso**: admin (lectura completa + exportar), manager (lectura completa + exportar), supervisor (lectura completa), operator (lectura — solo transacciones de sus zonas), viewer (solo lectura)
- **Tipo componente**: Server Component (listado read-only con paginación server-side, Client Component para filtros y detalle expandible)
- **Edge Functions**: Ninguna — esta página es **100% lectura**. Las transacciones se crean desde otros módulos (actividades, envíos, ajustes, transferencias, cosechas, recetas)

## Objetivo

Log inmutable y append-only de todas las transacciones de inventario. Registro de auditoría completo que muestra cada movimiento de stock: recepciones, consumos, aplicaciones, transferencias, transformaciones, ajustes, desperdicios, reservas y liberaciones.

Nunca se editan ni eliminan transacciones. Las correcciones se reflejan como nuevas transacciones de tipo 'adjustment'. El estado actual del inventario se reconstruye desde este log.

Esta página es la fuente de verdad para trazabilidad, análisis de costos por batch/fase/zona, y auditoría regulatoria. Permite filtrar por cualquier dimensión (batch, zona, producto, tipo, fase, usuario, periodo) y exportar a CSV.

Usuarios principales: managers para análisis de costos y auditoría, supervisores para verificar operaciones.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                            |
| ---------------------- | ----------- | -------------------------------------------------------------------------------- |
| inventory_transactions | R           | Log inmutable. Solo lectura en esta UI. RLS via zone_id → facility → company     |
| inventory_items        | R           | Lote asociado (batch_number, producto)                                           |
| products               | R           | Producto del lote (nombre, SKU)                                                  |
| resource_categories    | R           | Categoría del producto (para filtros)                                            |
| units_of_measure       | R           | Unidad de la transacción                                                         |
| zones                  | R           | Zona donde ocurrió la transacción                                                |
| facilities             | R           | Facility (para filtros)                                                          |
| batches                | R           | Batch asociado (si aplica)                                                       |
| production_phases      | R           | Fase de producción al momento de la transacción                                  |
| activities             | R           | Actividad que generó la transacción (si aplica)                                  |
| activity_templates     | R           | Nombre del template de actividad                                                 |
| recipe_executions      | R           | Receta ejecutada (si aplica)                                                     |
| users                  | R           | Quién ejecutó la transacción                                                     |

## ENUMs utilizados

| ENUM             | Valores                                                                                                                                                                    | Tabla.campo                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| transaction_type | receipt \| consumption \| application \| transfer_out \| transfer_in \| transformation_out \| transformation_in \| adjustment \| waste \| return \| reservation \| release | inventory_transactions.type |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Transacciones de Inventario"
  - Subtítulo: "{n} transacciones" (total filtrado)
  - Badge: "Registro inmutable — las transacciones no se pueden editar ni eliminar"
  - Botón "Exportar CSV" (variant="outline") — admin/manager
- **Barra de KPIs** — Row de cards con métricas del periodo filtrado:
  - Entradas: {n} transacciones (receipt + transfer_in + transformation_in) — valor total $
  - Salidas: {n} transacciones (consumption + application + transfer_out + transformation_out + waste) — valor total $
  - Ajustes: {n} transacciones — neto ±$
  - Costo total periodo: ${sum(cost_total)} (si cost_tracking habilitado)
- **Barra de filtros** — Row de filtros combinables:
  - Search: Buscar por producto, lote batch_number, batch code
  - Select: Tipo de transacción (multi-select con categorías):
    - Entradas: receipt, transfer_in, transformation_in
    - Salidas: consumption, application, transfer_out, transformation_out, waste, return
    - Ajustes: adjustment
    - Reservas: reservation, release
  - Select: Facility (todas)
  - Select: Zona (todas, filtrado por facility)
  - Select: Producto (todos — dropdown con búsqueda)
  - Select: Batch (todos — dropdown con búsqueda)
  - Select: Fase (todas)
  - Select: Usuario (todos — solo visible para admin/manager)
  - DatePicker rango: Fecha desde/hasta (default=último mes)
  - Botón "Limpiar filtros"
- **Tabla principal** — Tabla paginada server-side
  - Columnas:
    - Fecha (timestamp, formateada con hora)
    - Tipo (badge con color y signo):
      - receipt: verde "+", transfer_in: verde "↓", transformation_in: verde "⟲"
      - consumption: naranja "−", application: azul "−", waste: gris "−", return: morado "−"
      - transfer_out: naranja "↑", transformation_out: rojo "⟲"
      - adjustment: amarillo "±"
      - reservation: cyan "◇", release: cyan "◆"
    - Producto (nombre + SKU)
    - Lote (batch_number del inventory_item)
    - Cantidad (formateada con signo + unidad):
      - Entradas: +{qty} (verde)
      - Salidas: -{qty} (rojo)
      - Ajustes: ±{qty} (amarillo)
    - Zona (zone.name)
    - Batch (batch.code, link — si aplica, o "—")
    - Fase (phase.name — si aplica, o "—")
    - Actividad (template.name — si aplica, o "—")
    - Costo (cost_total, formateado — oculto si cost_tracking=false)
    - Usuario (user.full_name)
    - Razón (reason — solo para adjustment y waste, tooltip si largo)
  - Ordenamiento: por timestamp descendente (default), clickeable en columnas
  - Paginación: 20 items por página
  - Click en fila → expande con más detalles
- **Fila expandible — Detalle de transacción** — Al hacer click en una fila:
  - Todos los campos de la transacción sin truncar
  - **Transacción relacionada**: si related_transaction_id no es null, muestra:
    - Para transfer_out → link al transfer_in correspondiente
    - Para transformation_out → link al transformation_in (con producto resultante)
    - Para transformation_in → link al transformation_out (producto consumido)
  - **Lote de destino**: si target_item_id no es null, muestra el lote creado
  - **Contexto de actividad**: si activity_id, muestra tipo + template + batch + duración
  - **Contexto de receta**: si recipe_execution_id, muestra nombre de receta
  - **Razón completa**: para adjustments y waste
  - **Datos de costo**: cost_per_unit × quantity = cost_total
- **Vista resumen** (toggle alternativo) — Agrupación analítica
  - Agrupar por: Producto | Tipo | Batch | Zona | Fase | Usuario — select
  - Tabla agrupada con totales:
    - Si agrupado por Producto: Producto, Qty total entradas, Qty total salidas, Qty neto, Costo total
    - Si agrupado por Tipo: Tipo, #Transacciones, Qty total, Costo total
    - Si agrupado por Batch: Batch, #Transacciones, Costo directo total
    - Si agrupado por Zona: Zona, #Entradas, #Salidas, Qty neto
  - Gráfico de barras del resumen seleccionado

**Responsive**: Tabla con scroll horizontal en móvil. KPIs en 2 columnas. Filtros colapsables. Detalle expandible full-width.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación server-side:
  ```
  supabase.from('inventory_transactions')
    .select(`
      *,
      item:inventory_items(id, batch_number, product:products(id, name, sku, category:resource_categories(name))),
      unit:units_of_measure(id, code, name),
      zone:zones(id, name, facility:facilities(id, name)),
      batch:batches(id, code),
      phase:production_phases(id, name),
      activity:activities(id, template:activity_templates(name, code)),
      user:users!user_id(id, full_name),
      related:inventory_transactions!related_transaction_id(id, type, inventory_item_id)
    `, { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: Filtros se aplican como query params: `.eq('type', type)`, `.eq('batch_id', batchId)`, `.gte('timestamp', startDate)`, etc.
- **RF-03**: Si se llega con query param `item_id`, filtrar automáticamente: `.eq('inventory_item_id', itemId)` — viene de "Ver todas" en PRD 37
- **RF-04**: KPIs del periodo filtrado:
  ```
  -- Entradas
  supabase.from('inventory_transactions')
    .select('cost_total')
    .in('type', ['receipt', 'transfer_in', 'transformation_in'])
    .gte('timestamp', startDate).lte('timestamp', endDate)
  -- Salidas (similar)
  -- Ajustes (similar)
  ```
  Sumar client-side.
- **RF-05**: Para operarios, filtrar por zonas accesibles (via RLS automático)

### Detalle expandible

- **RF-06**: Al expandir, no se necesita query adicional — toda la info está en la query principal (incluyendo related transaction). Si se necesita más detalle del related:
  ```
  supabase.from('inventory_transactions')
    .select('*, item:inventory_items(batch_number, product:products(name))')
    .eq('id', relatedTransactionId)
    .single()
  ```

### Trazabilidad de pares

- **RF-07**: Para transacciones con related_transaction_id:
  - Mostrar badge "Par" con link a la transacción relacionada
  - transfer_out ↔ transfer_in: "Transferencia desde {zona} → {zona}"
  - transformation_out ↔ transformation_in: "Transformación: {producto_input} → {producto_output}"
- **RF-08**: Para transacciones con target_item_id:
  - Link al lote creado: "Lote creado: {batch_number} en {zona}"

### Exportar CSV

- **RF-09**: Exportar genera CSV con todas las transacciones filtradas (sin paginación):
  - Columnas: Fecha, Tipo, Producto, SKU, Lote, Cantidad, Unidad, Zona, Batch, Fase, Actividad, Costo unitario, Costo total, Usuario, Razón
- **RF-10**: Solo admin y manager pueden exportar
- **RF-11**: Si hay más de 10,000 registros, generar server-side (Server Action o API route) para evitar timeout. Advertir al usuario: "Exportando {n} registros. Esto puede tomar un momento."
- **RF-12**: Nombre del archivo: `transacciones-inventario-{fecha_inicio}-{fecha_fin}.csv`

### Vista resumen

- **RF-13**: La agrupación se calcula client-side con los datos filtrados (si el volumen lo permite) o via RPC server-side:
  ```
  supabase.rpc('summarize_inventory_transactions', {
    p_group_by: 'product',  // o 'type', 'batch', 'zone', 'phase', 'user'
    p_start_date: startDate,
    p_end_date: endDate,
    p_zone_id: zoneId  // filtro opcional
  })
  ```
- **RF-14**: El gráfico de barras se renderiza con Recharts a partir de los datos agrupados

### Navegación

- **RF-15**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-16**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-17**: Click en lote navega a `/inventory/items` con filtro por item_id (PRD 37)
- **RF-18**: Click en actividad navega a `/activities/history` con filtro (PRD 28)
- **RF-19**: Click en transacción relacionada scrollea/resalta la fila de la transacción par

## Requisitos no funcionales

- **RNF-01**: RLS — inventory_transactions se filtra via zone_id → facility → company_id. Usa `get_my_zone_ids()`
- **RNF-02**: Paginación server-side obligatoria (20 items por página) — el log puede tener cientos de miles de registros
- **RNF-03**: Las transacciones son **100% inmutables** — esta página NUNCA permite editar, eliminar o modificar transacciones
- **RNF-04**: El detalle expandible usa datos de la query principal — no genera queries adicionales a menos que se necesite el related transaction completo
- **RNF-05**: El CSV se genera server-side para grandes volúmenes (> 1000 registros)
- **RNF-06**: Índices compuestos optimizan las queries más comunes:
  - `(batch_id, type, timestamp)` — costos por batch
  - `(zone_id, timestamp)` — movimientos por zona
  - `(inventory_item_id, timestamp)` — historial de un lote
- **RNF-07**: La vista resumen puede requerir RPC server-side para agrupaciones sobre grandes volúmenes — no traer todas las transacciones al cliente
- **RNF-08**: Los valores de costo solo se muestran si `features_enabled.cost_tracking` está habilitado

## Flujos principales

### Happy path — Revisar transacciones del día

1. Supervisor navega a `/inventory/transactions`
2. Filtro: hoy
3. KPIs: 8 entradas ($2,400), 12 salidas ($1,800), 1 ajuste (+$50), Costo periodo: $4,250
4. Tabla: última transacción arriba
   - 14:30 — application — Ca(NO₃)₂ — LOT-01 — -168g — Sala Veg A — LOT-GELATO-260301 — Vegetativo — FERT-VEG-S1 — $12.00 — Juan Pérez
   - 14:30 — application — KNO₃ — LOT-03 — -84g — Sala Veg A — LOT-GELATO-260301 — Vegetativo — FERT-VEG-S1 — $8.00 — Juan Pérez
5. Expande la primera → ve: sin transacción relacionada, actividad FERT-VEG-S1 (30 min), costo: $0.07/g × 168g = $12.00

### Filtrar por batch para análisis de costos

1. Manager filtra: Batch=LOT-GELATO-260301, Tipo=todos
2. Tabla: todas las transacciones del batch desde su creación
3. Vista resumen → Agrupar por: Tipo
   - consumption: 45 transacciones, $580
   - application: 30 transacciones, $420
   - transformation_out: 1, $0
   - transformation_in: 2, $0
   - waste: 2, $15
4. Total costos directos del batch: $1,015

### Ver transformación de cosecha

1. Filtra: Tipo=transformation_out+transformation_in, Batch=LOT-GELATO-260301
2. Ve 3 transacciones:
   - transformation_out: FLO-GELATO — -42 plantas — badge "Par"
   - transformation_in: WET-GELATO — +21kg — badge "Par"
   - transformation_in: TRIM-WET-GELATO — +8.4kg — badge "Par"
3. Expande transformation_out → Related: "Transformación → WET-GELATO (21kg)"
4. Trazabilidad completa del flujo de cosecha

### Ver transferencia entre zonas

1. Filtra: Tipo=transfer_out+transfer_in
2. Ve pares de transacciones:
   - transfer_out: KNO₃ LOT-03 — -500g — Almacén Central — badge "Par"
   - transfer_in: KNO₃ LOT-03-T1 — +500g — Sala Veg A — badge "Par"
3. Expande transfer_out → Related: "Transferencia → Sala Veg A (500g)"

### Exportar para auditoría

1. Manager selecciona rango: mes completo de febrero 2026
2. Filtra por Facility: Invernadero Principal
3. Click "Exportar CSV"
4. Se descarga: `transacciones-inventario-2026-02-01-2026-02-28.csv`
5. 342 transacciones exportadas para reporting externo

### Llegar desde PRD 37 (Stock de Inventario)

1. En `/inventory/items`, supervisor expande lote Ca(NO₃)₂ LOT-01
2. Ve mini-historial con 10 últimas transacciones
3. Click "Ver todas" → navega a `/inventory/transactions?item_id={id}`
4. Filtro item_id pre-aplicado → ve TODAS las transacciones de ese lote desde su recepción

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                 |
| ------- | --------------------------------------------------------------------------- |
| loading | Skeleton de KPIs, filtros y tabla                                           |
| loaded  | KPIs, filtros y tabla con datos                                             |
| empty   | "No se encontraron transacciones con los filtros seleccionados" + limpiar   |
| error   | "Error al cargar las transacciones. Intenta nuevamente" + reintentar        |

### Estados de UI — Fila expandible

| Estado  | Descripción                                                |
| ------- | ---------------------------------------------------------- |
| closed  | Solo fila resumida                                         |
| open    | Fila expandida con detalle completo                        |

### Estados de UI — Exportar

| Estado     | Descripción                                             |
| ---------- | ------------------------------------------------------- |
| idle       | Botón "Exportar CSV" habilitado                         |
| exporting  | Botón loading "Exportando..."                           |
| success    | Archivo se descarga, toast "CSV exportado"              |
| error      | Toast "Error al exportar. Intenta nuevamente"           |

### Errores esperados

| Escenario                           | Mensaje al usuario                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Sin transacciones                   | "No se encontraron transacciones con estos filtros" (empty)            |
| Error de carga                      | "Error al cargar las transacciones" (error state)                      |
| Error exportando                    | "Error al exportar. Intenta nuevamente" (toast)                        |
| Demasiados registros para CSV       | "Exportando {n} registros. Esto puede tomar un momento." (info toast)  |
| Error cargando resumen              | "Error al calcular el resumen" (toast)                                 |
| Error de red                        | "Error de conexión. Intenta nuevamente" (toast)                        |

## Dependencias

- **Páginas relacionadas**:
  - `/inventory/items` — stock actual por lote (PRD 37) — link bidireccional
  - `/inventory/products` — catálogo de productos (PRD 17)
  - `/inventory/shipments/[id]` — envíos que generan recepciones (PRD 20)
  - `/inventory/recipes` — recetas que generan transformaciones (PRD 21)
  - `/production/batches/[id]` — batch, tab inventario (PRD 25)
  - `/activities/history` — actividades que generan consumos/aplicaciones (PRD 28)
  - `/operations/costs` — COGS que incluye costos de transacciones (PRD 36)
- **Otros módulos que crean transacciones** (write-side):
  - PRD 20 (confirm-shipment-receipt): type='receipt'
  - PRD 21 (execute-recipe): type='transformation_out' + 'transformation_in'
  - PRD 25 (execute-harvest): type='transformation_out' + 'transformation_in' + 'waste'
  - PRD 27 (execute-activity): type='consumption', 'application'
  - PRD 37 (adjust/transfer): type='adjustment', 'transfer_out', 'transfer_in'
- **SQL Function** (opcional): `summarize_inventory_transactions(group_by, start, end, zone_id?)` — agrupación server-side
- **Supabase client**: PostgREST para lecturas con paginación
- **Recharts**: Gráfico de resumen agrupado
- **React Query**: Cache keys `['inventory-transactions', { filters, page }]`, `['transaction-kpis', { filters }]`, `['transaction-summary', { groupBy, filters }]`
