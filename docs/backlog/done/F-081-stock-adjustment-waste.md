# F-081: Ajuste de Stock y Registro de Waste

## Overview

Permite corregir discrepancias de inventario (ajustes positivos o negativos) y registrar merma o perdida de producto (waste). Ambas operaciones generan `inventory_transactions` inmutables con razon obligatoria para auditoria completa. Actualmente el sistema solo registra recepciones, consumos y transformaciones, pero no tiene UI para ajustes ni waste — dos tipos de transaccion ya definidos en el enum (`adjustment`, `waste`) pero sin Server Actions ni pantallas. Estas operaciones son criticas para mantener la integridad del inventario cuando hay diferencias entre el stock fisico y el registrado.

## User Personas

- **Admin**: Puede realizar ajustes de stock (positivos y negativos) y registrar waste. Acceso completo.
- **Gerente (Manager)**: Puede realizar ajustes de stock y registrar waste. Responsable de la precision del inventario.
- **Supervisor**: Solo puede registrar waste (merma operativa). No puede hacer ajustes, ya que estos implican correccion de registros que requiere autorizacion de nivel superior.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-081-001 | Ajuste de stock con razon obligatoria | M | P0 | Planned |
| US-081-002 | Registro de waste (merma) | M | P0 | Planned |
| US-081-003 | Filtro de ajustes y waste en log de movimientos | S | P1 | Planned |

---

# US-081-001: Ajuste de stock con razon obligatoria

## User Story

**As a** manager,
**I want** ajustar la cantidad de stock de un producto hacia arriba o hacia abajo con una razon obligatoria,
**So that** pueda corregir discrepancias entre el inventario fisico y el registrado sin perder trazabilidad.

## Acceptance Criteria

### Scenario 1: Ajuste positivo por conteo fisico
- **Given** el manager esta en /inventory/stock y el producto "Sustrato Coco 50L" tiene 20 unidades disponibles en "Almacen Principal"
- **When** selecciona el lote, elige "Ajustar", ingresa tipo "Positivo", cantidad=5, razon "Conteo fisico: 5 bolsas no registradas encontradas en estanteria B"
- **Then** el sistema crea una `inventory_transaction` type='adjustment' con quantity=5, el stock del lote sube a 25 unidades, y se muestra toast "Stock ajustado: +5 unidades de Sustrato Coco 50L"

### Scenario 2: Ajuste negativo por discrepancia
- **Given** el producto "Guantes Nitrilo L" tiene 100 pares en "Almacen Principal"
- **When** el manager selecciona "Ajustar", ingresa tipo "Negativo", cantidad=15, razon "Conteo fisico revelo faltante — posible uso no registrado en turno nocturno"
- **Then** el sistema crea una `inventory_transaction` type='adjustment' con quantity=15 (tipo negativo registrado internamente), el stock baja a 85 pares, y se muestra toast "Stock ajustado: -15 pares de Guantes Nitrilo L"

### Scenario 3: Razon obligatoria
- **Given** el manager esta en el Dialog de ajuste
- **When** ingresa cantidad=5 pero deja el campo de razon vacio e intenta confirmar
- **Then** el sistema muestra error inline "La razon es obligatoria para ajustes de inventario" y el boton "Confirmar ajuste" permanece deshabilitado

### Scenario 4: Ajuste negativo no puede exceder stock disponible
- **Given** el lote LOT-SUST-001 tiene 20 unidades disponibles
- **When** el manager intenta un ajuste negativo de 25 unidades
- **Then** el sistema muestra error inline "Cantidad excede el disponible (20 unidades)" y bloquea la operacion

### Scenario 5: Solo manager y admin pueden ajustar
- **Given** un supervisor esta logueado
- **When** navega a /inventory/stock y ve un lote
- **Then** la opcion "Ajustar" no aparece en las acciones del lote (solo ve "Registrar merma" y "Transferir")

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['manager', 'admin'])
- [ ] Validacion Zod compartida client/server
- [ ] Razon persistida en inventory_transactions.reason
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `adjustStock(data)` en `src/lib/actions/inventory.ts`
- **Zod Schema**: `adjustStockSchema` en `src/lib/schemas/inventory.ts`
  - inventoryItemId: UUID required
  - adjustmentType: enum('positive', 'negative')
  - quantity: number positive (siempre positivo, el type determina la direccion)
  - reason: string min(10) max(500) — obligatoria, minimo 10 caracteres para forzar descripcion util
- **Auth**: `requireAuth(['manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT inventory_item FOR UPDATE
  2. Para ajuste negativo: validate quantity <= quantity_available
  3. INSERT `inventory_transaction` type='adjustment', quantity=amount, reason=text
  4. UPDATE inventory_item: quantity_available += amount (positivo) o -= amount (negativo)
  5. Si quantity_available llega a 0: UPDATE lot_status='depleted'
- **inventory_transactions.quantity**: Siempre positivo. El campo `type='adjustment'` junto con el signo implicito (positivo=+, negativo=-) se determina segun la logica de negocio. Se puede agregar un campo `adjustment_direction` en el reason o en metadata
- **Revalidation**: `revalidatePath('/inventory/stock')` + `revalidatePath('/inventory/transactions')`

## UI/UX Notes
- Dialog (bottom sheet mobile / modal desktop) con titulo "Ajustar stock"
- Header muestra: producto nombre + SKU, lote, zona, cantidad actual
- Radio buttons o segmented control: "Aumentar" / "Reducir"
- Input de cantidad con unidad
- Textarea para razon (min 10 chars, placeholder "Describa la razon del ajuste...")
- Boton "Confirmar ajuste" con estilo primary
- La razon se muestra truncada en la lista de transacciones, completa en el detalle

## Dependencies
- F-026 (stock actual con vista de lotes)
- F-029 (log de movimientos)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-081-002: Registro de waste (merma)

## User Story

**As a** supervisor,
**I want** registrar merma de producto (danado, vencido, contaminado) con una razon obligatoria,
**So that** el inventario refleje las perdidas reales y se mantenga un registro de auditoria de cada merma.

## Acceptance Criteria

### Scenario 1: Registrar waste de producto danado
- **Given** el supervisor esta en /inventory/stock y ve el lote LOT-NPK-003 de "NPK 20-20-20" con 10kg disponibles en "Sala Vegetativo A"
- **When** selecciona "Registrar merma", ingresa cantidad=2kg, razon "Bolsa rota por manipulacion, producto contaminado con agua"
- **Then** el sistema crea una `inventory_transaction` type='waste' con quantity=2, reason registrada, el stock baja a 8kg, y se muestra toast "Merma registrada: 2 kg de NPK 20-20-20"

### Scenario 2: Waste vinculado a un batch
- **Given** el supervisor esta registrando merma de "Flor Humeda Gelato" que esta vinculada al batch LOT-GELATO-001
- **When** registra waste de 0.5kg con razon "Muestra contaminada descartada post-inspeccion"
- **Then** la `inventory_transaction` se crea con batch_id=LOT-GELATO-001, y el costo de la merma se refleja en el COGS del batch

### Scenario 3: Razon obligatoria para waste
- **Given** el supervisor esta en el Dialog de merma
- **When** ingresa cantidad=1kg pero deja el campo de razon vacio
- **Then** el sistema muestra error inline "La razon es obligatoria para registros de merma" y bloquea la confirmacion

### Scenario 4: Waste no puede exceder stock disponible
- **Given** el lote tiene 3kg disponibles
- **When** el supervisor intenta registrar waste de 5kg
- **Then** el sistema muestra error "Cantidad excede el disponible (3 kg)"

### Scenario 5: Supervisor puede registrar waste
- **Given** un supervisor esta logueado
- **When** navega a /inventory/stock y ve un lote activo
- **Then** la opcion "Registrar merma" aparece en las acciones del lote

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['supervisor', 'manager', 'admin'])
- [ ] Validacion Zod compartida client/server
- [ ] Razon persistida en inventory_transactions.reason
- [ ] batch_id opcional vinculado si el lote pertenece a un batch
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `registerWaste(data)` en `src/lib/actions/inventory.ts`
- **Zod Schema**: `registerWasteSchema` en `src/lib/schemas/inventory.ts`
  - inventoryItemId: UUID required
  - quantity: number positive, <= available
  - reason: string min(10) max(500) — obligatoria
  - batchId: UUID optional — si el producto esta vinculado a un batch, auto-detectar
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT inventory_item FOR UPDATE (con JOINs para obtener batch_id si existe)
  2. Validate quantity <= quantity_available
  3. INSERT `inventory_transaction` type='waste', quantity=amount, reason=text, batch_id si aplica, cost_total=quantity*cost_per_unit
  4. UPDATE inventory_item: quantity_available -= amount
  5. Si quantity_available llega a 0: UPDATE lot_status='depleted'
- **COGS impact**: Si la transaccion tiene batch_id y cost_per_unit, el cost_total de la merma se suma al COGS del batch como perdida directa
- **Revalidation**: `revalidatePath('/inventory/stock')` + `revalidatePath('/inventory/transactions')`

## UI/UX Notes
- Dialog (bottom sheet mobile / modal desktop) con titulo "Registrar merma"
- Header muestra: producto nombre + SKU, lote, zona, cantidad actual
- Input de cantidad con unidad (siempre negativo, no se muestra signo al usuario)
- Textarea para razon (min 10 chars, placeholder "Describa la causa de la merma...")
- Si el lote esta vinculado a un batch: mostrar badge "Vinculado a {batch_code}" para informar que el costo impactara el COGS
- Boton "Registrar merma" con estilo secondary + clases de error (texto rojo, borde warning)
- Icono de alerta en el boton para distinguirlo visualmente de una accion normal

## Dependencies
- F-026 (stock actual con vista de lotes)
- F-029 (log de movimientos)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-081-003: Filtro de ajustes y waste en log de movimientos

## User Story

**As a** manager,
**I want** filtrar el log de movimientos por tipo de transaccion (ajuste, merma) y ver la razon de cada uno,
**So that** pueda auditar los cambios al inventario y detectar patrones de perdida o discrepancia.

## Acceptance Criteria

### Scenario 1: Filtrar por tipo adjustment
- **Given** el manager esta en /inventory/transactions y existen transacciones de tipo receipt, consumption, adjustment y waste
- **When** selecciona filtro tipo="Ajuste"
- **Then** solo se muestran las transacciones type='adjustment', con la razon visible en cada fila (truncada a 80 chars con tooltip para ver completa)

### Scenario 2: Filtrar por tipo waste
- **Given** existen 5 transacciones de waste en el ultimo mes
- **When** el manager selecciona filtro tipo="Merma"
- **Then** se muestran las 5 transacciones de waste con fecha, producto, cantidad, zona, razon, y usuario que la registro

### Scenario 3: Ver razon completa en detalle de transaccion
- **Given** la transaccion WASTE-001 tiene razon "Bolsa de NPK 20-20-20 rota durante transporte interno, producto mezclado con agua y suelo, no apto para uso"
- **When** el manager hace clic en la transaccion
- **Then** ve el detalle completo con la razon sin truncar, el usuario que la registro, timestamp exacto, batch vinculado (si aplica), y costo de la perdida

### Scenario 4: Exportar ajustes y waste a CSV
- **Given** el manager tiene filtrado el log por tipo="Merma" y rango de fechas del ultimo mes
- **When** hace clic en "Exportar CSV"
- **Then** se descarga un CSV con todas las transacciones de waste del periodo, incluyendo la columna de razon completa

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Filtros de tipo 'adjustment' y 'waste' agregados al dropdown de tipo existente
- [ ] Columna de razon visible en tabla de transacciones
- [ ] Razon completa en vista de detalle
- [ ] Export CSV incluye columna de razon

## Technical Notes
- **Filtro existente**: La page /inventory/transactions ya tiene filtros por tipo de transaccion via `getTransactions(filters)`. Solo necesita agregar 'adjustment' y 'waste' como opciones en el dropdown si no estan
- **Columna razon**: Agregar columna `reason` a la tabla de transacciones, visible solo cuando hay contenido (la mayoria de transacciones no tienen reason)
- **Export CSV**: La funcion `exportTransactionsCSV()` ya existe — agregar el campo `reason` al output
- **Sin Server Action nueva**: Solo cambios de UI en componentes existentes de la pagina de transacciones

## UI/UX Notes
- La columna "Razon" en la tabla se muestra como texto truncado (80 chars) con tooltip
- Las filas de waste se marcan con borde izquierdo rojo o icono de warning para distinguirlas visualmente
- Las filas de ajuste positivo se marcan con color verde suave, ajuste negativo con color ambar
- El detalle de transaccion (al hacer clic) muestra la razon completa en seccion destacada

## Dependencies
- US-081-001 (ajustes generan transacciones)
- US-081-002 (waste genera transacciones)
- F-029 (log de movimientos existente)

## Estimation
- **Size**: S
- **Complexity**: Low
