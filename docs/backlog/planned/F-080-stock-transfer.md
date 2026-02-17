# F-080: Transferencia de Stock entre Zonas

## Overview

Permite transferir stock (lotes de inventario) de una zona a otra dentro de la misma facility. Actualmente el sistema registra recepciones, consumos y transformaciones, pero no tiene UI para mover stock entre zonas. La transferencia genera un par atomico de `inventory_transactions` (transfer_out + transfer_in) vinculados por `related_transaction_id`, manteniendo la trazabilidad completa del movimiento. Documentado como flujo INV-F05 en los user flows del proyecto.

## User Personas

- **Supervisor**: Ejecuta transferencias operativas (mover insumos a la zona donde se necesitan, reubicar producto cosechado). Caso mas comun.
- **Gerente (Manager)**: Transfiere stock por razones logisticas o de planificacion. Puede ver todas las zonas.
- **Admin**: Acceso completo a transferencias. Uso infrecuente, principalmente en situaciones excepcionales.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-080-001 | Seleccionar lote y cantidad a transferir | M | P0 | Planned |
| US-080-002 | Confirmacion con preview del movimiento | S | P0 | Planned |
| US-080-003 | Edge cases: lote parcial, lote agotado, validaciones | S | P1 | Planned |

---

# US-080-001: Seleccionar lote y cantidad a transferir

## User Story

**As a** supervisor,
**I want** seleccionar un lote de inventario y especificar cuanto quiero transferir a otra zona,
**So that** pueda mover insumos o productos a donde se necesitan sin acceso directo a la base de datos.

## Acceptance Criteria

### Scenario 1: Iniciar transferencia desde vista de stock
- **Given** el supervisor esta en /inventory/stock y ve el producto "Ca(NO3)2 25kg" con 3 lotes activos
- **When** hace clic en un lote especifico (LOT-CANO3-001, 15kg disponibles en "Almacen Principal") y selecciona "Transferir"
- **Then** se abre un Dialog con: producto y lote pre-seleccionados, cantidad disponible mostrada (15kg), input de cantidad a transferir, y selector de zona destino

### Scenario 2: Transferir cantidad parcial de un lote
- **Given** el Dialog de transferencia esta abierto para LOT-CANO3-001 (15kg disponibles en "Almacen Principal")
- **When** el supervisor ingresa cantidad=5kg y selecciona zona destino "Sala Vegetativo A"
- **Then** el campo cantidad se valida como correcto (5 <= 15), la zona destino se muestra con su nombre y facility, y el boton "Transferir" se habilita

### Scenario 3: Transferir lote completo
- **Given** el Dialog de transferencia esta abierto para LOT-CANO3-001 (15kg disponibles)
- **When** el supervisor hace clic en "Transferir todo" o ingresa la cantidad completa (15kg)
- **Then** el campo cantidad se llena con 15kg y se muestra indicador "Lote completo — se movera el lote entero a la zona destino"

### Scenario 4: Validar que no se puede transferir a la misma zona
- **Given** el lote LOT-CANO3-001 esta en "Almacen Principal"
- **When** el supervisor selecciona "Almacen Principal" como zona destino
- **Then** el sistema muestra error inline "No se puede transferir a la misma zona" y el boton "Transferir" se deshabilita

### Scenario 5: Validar cantidad maxima
- **Given** el lote LOT-CANO3-001 tiene 15kg disponibles
- **When** el supervisor ingresa cantidad=20kg
- **Then** el sistema muestra error inline "Cantidad excede el disponible (15 kg)" y el boton se deshabilita

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['supervisor', 'manager', 'admin'])
- [ ] Validacion Zod compartida client/server
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `transferStock(data)` en `src/lib/actions/inventory.ts`
- **Zod Schema**: `transferStockSchema` en `src/lib/schemas/inventory.ts`
  - inventoryItemId: UUID required
  - quantity: number positive, <= available quantity
  - destinationZoneId: UUID required, != source zone
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT inventory_item FOR UPDATE (lock row)
  2. Validate quantity <= quantity_available
  3. INSERT `inventory_transaction` type='transfer_out', zone_id=origen, quantity=amount
  4. INSERT `inventory_transaction` type='transfer_in', zone_id=destino, related_transaction_id=out.id
  5. UPDATE source inventory_item: quantity_available -= amount
  6. Si transferencia completa: UPDATE source inventory_item lot_status='depleted' si quantity_available=0
  7. Crear o actualizar inventory_item en zona destino (buscar item existente del mismo producto+lote o crear nuevo)
- **RLS**: inventory_transactions tipo C (company_id redundante con trigger)
- **Ruta**: Dialog accesible desde `/inventory/stock` via accion en cada lote

## UI/UX Notes
- Dialog (bottom sheet mobile / modal desktop) con titulo "Transferir stock"
- Header del dialog muestra: producto nombre + SKU, lote (batch_number), zona origen, cantidad disponible
- Input de cantidad con unidad al lado (kg, L, unidades)
- Boton "Transferir todo" como shortcut para llenar cantidad completa
- Selector de zona destino: dropdown con zonas de la facility agrupadas por proposito
- Zona origen deshabilitada en el dropdown (no seleccionable)

## Dependencies
- F-026 (stock actual con vista de lotes)
- F-029 (log de movimientos donde aparecera la transferencia)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-080-002: Confirmacion con preview del movimiento

## User Story

**As a** supervisor,
**I want** ver un resumen claro del movimiento antes de confirmar la transferencia,
**So that** pueda verificar que los datos son correctos y evitar errores costosos.

## Acceptance Criteria

### Scenario 1: Preview de transferencia parcial
- **Given** el supervisor ha ingresado: lote LOT-CANO3-001, cantidad 5kg, destino "Sala Vegetativo A"
- **When** hace clic en "Revisar transferencia"
- **Then** ve un panel de confirmacion con: producto (Ca(NO3)2), cantidad (5 kg), zona origen (Almacen Principal), zona destino (Sala Vegetativo A), stock restante en origen (10 kg), y un boton "Confirmar transferencia"

### Scenario 2: Confirmar transferencia exitosa
- **Given** el supervisor ve el preview de la transferencia
- **When** hace clic en "Confirmar transferencia"
- **Then** el sistema ejecuta la transferencia, muestra toast "Stock transferido: 5 kg de Ca(NO3)2 a Sala Vegetativo A", cierra el Dialog, y la vista de stock se actualiza mostrando el nuevo balance

### Scenario 3: Transferencia aparece en log de movimientos
- **Given** se acaba de confirmar una transferencia de 5kg de LOT-CANO3-001 a "Sala Vegetativo A"
- **When** el supervisor navega a /inventory/transactions
- **Then** ve dos transacciones vinculadas: una "transfer_out" de Almacen Principal (-5kg) y una "transfer_in" en Sala Vegetativo A (+5kg), ambas con el mismo timestamp y vinculadas visualmente

### Scenario 4: Error de concurrencia
- **Given** el supervisor ve el preview para transferir 15kg (lote completo)
- **When** otro usuario consumio 5kg de ese lote mientras el supervisor revisaba, y el supervisor hace clic en "Confirmar"
- **Then** el sistema detecta que solo quedan 10kg, muestra error "Stock insuficiente. Disponible actual: 10 kg", y permite ajustar la cantidad sin cerrar el Dialog

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Concurrency check implementado (SELECT FOR UPDATE)
- [ ] Toast de confirmacion con detalle del movimiento
- [ ] Revalidacion de la pagina de stock despues de transferir

## Technical Notes
- **Concurrency**: `SELECT ... FOR UPDATE` en la transaccion DB para evitar race conditions
- **Revalidation**: `revalidatePath('/inventory/stock')` + `revalidatePath('/inventory/transactions')` despues de transferir
- **Optimistic update**: No recomendado para transferencias — esperar confirmacion del server por la naturaleza critica de la operacion
- **Par de transacciones**: Las dos `inventory_transactions` (out + in) se vinculan via `related_transaction_id` para que el log las muestre como operacion unica

## UI/UX Notes
- Paso de confirmacion dentro del mismo Dialog (no nuevo Dialog)
- Layout de preview: dos columnas (Origen | Destino) con flecha entre ellas
- Boton "Confirmar transferencia" con estilo primary
- Boton "Volver" para editar los datos
- Loading state en el boton durante la ejecucion de la Server Action
- Mostrar el stock resultante en ambas zonas como preview

## Dependencies
- US-080-001

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-080-003: Edge cases: lote parcial, lote agotado, validaciones

## User Story

**As a** supervisor,
**I want** que el sistema maneje correctamente los edge cases de transferencia (lotes parciales, agotados, sin zonas disponibles),
**So that** no se produzcan inconsistencias en el inventario ni errores confusos.

## Acceptance Criteria

### Scenario 1: Transferencia parcial crea nuevo inventory_item en destino
- **Given** "Sala Vegetativo A" no tiene ningun lote del producto Ca(NO3)2
- **When** el supervisor transfiere 5kg de LOT-CANO3-001 desde Almacen Principal a Sala Vegetativo A
- **Then** se crea un nuevo `inventory_item` en Sala Vegetativo A con el mismo product_id, cost_per_unit heredado, source_type='transfer', y quantity_available=5kg

### Scenario 2: Transferencia completa marca lote origen como depleted
- **Given** LOT-CANO3-001 tiene exactamente 8kg disponibles en Almacen Principal
- **When** el supervisor transfiere 8kg (lote completo) a Sala Vegetativo A
- **Then** el inventory_item original queda con quantity_available=0 y lot_status='depleted', y el nuevo item en destino tiene quantity_available=8kg

### Scenario 3: No se puede transferir lote en cuarentena
- **Given** LOT-SAMPLE-001 tiene lot_status='quarantine'
- **When** el supervisor intenta iniciar una transferencia de este lote
- **Then** el boton "Transferir" esta deshabilitado con tooltip "Lote en cuarentena — no se puede transferir"

### Scenario 4: No se puede transferir lote agotado
- **Given** LOT-CANO3-002 tiene quantity_available=0 y lot_status='depleted'
- **When** el supervisor busca este lote en la vista de stock
- **Then** el lote no aparece en la lista de lotes transferibles (filtrado por quantity_available > 0)

### Scenario 5: Transferencia a zona inactiva bloqueada
- **Given** la zona "Bodega Temporal" tiene status='inactive'
- **When** el supervisor abre el selector de zona destino
- **Then** "Bodega Temporal" no aparece como opcion en el dropdown

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Lotes en quarantine y depleted excluidos de transferencia
- [ ] Zonas inactivas excluidas del selector de destino
- [ ] Cost_per_unit heredado correctamente al nuevo inventory_item

## Technical Notes
- **Nuevo inventory_item en destino**: Campos heredados del item origen: product_id, unit_id, batch_number, supplier_lot_number, cost_per_unit, expiration_date. Campos propios: zone_id=destino, quantity_available=cantidad transferida, source_type='transfer', lot_status='available'
- **Filtros de lotes**: Solo lotes con quantity_available > 0 AND lot_status IN ('available') son transferibles
- **Filtros de zonas**: Solo zonas con status='active' de la misma facility
- **Herencia de costos**: El cost_per_unit se copia del item origen, asegurando trazabilidad de costos post-transferencia

## UI/UX Notes
- Lotes con quantity_available=0 no se muestran en la lista
- Lotes en quarantine se muestran con badge "Cuarentena" pero boton de transferencia deshabilitado
- Si la facility solo tiene 1 zona, el boton "Transferir" no aparece (no hay destino posible)

## Dependencies
- US-080-001, US-080-002

## Estimation
- **Size**: S
- **Complexity**: Medium
