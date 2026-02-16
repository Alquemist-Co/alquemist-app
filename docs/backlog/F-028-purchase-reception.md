# F-028: Recepcion de Compras (INV-01)

## Overview

Formulario de recepcion de insumos comprados que crea nuevos lotes (inventory_items) y registra transacciones inmutables tipo 'receipt'. Soporta recepcion individual y en batch (multiples productos de la misma orden de compra). Incluye auto-calculo de fecha de vencimiento basado en shelf_life_days del producto, y validacion de existencia del producto en catalogo.

## User Personas

- **Supervisor**: Recibe compras en la operacion diaria, registra lotes con proveedor y costo.
- **Gerente**: Recibe compras de alto valor, revisa costos unitarios y asigna zonas de almacenamiento.
- **Admin**: Acceso completo a recepcion, puede recibir en cualquier zona.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-028-001 | Recepcion individual de producto | M | P0 | Planned |
| US-028-002 | Recepcion en batch (multiples productos) | L | P0 | Planned |
| US-028-003 | Auto-calculo de fecha de vencimiento | S | P1 | Planned |

---

# US-028-001: Recepcion individual de producto

## User Story

**As a** supervisor,
**I want** registrar la recepcion de un producto comprado indicando cantidad, proveedor, lote, costo y zona de almacenamiento,
**So that** el stock se actualice inmediatamente y quede trazabilidad completa del ingreso.

## Acceptance Criteria

### Scenario 1: Recepcion exitosa
- **Given** el supervisor accede a la pantalla inv-receive
- **When** selecciona producto="Ca(NO3)2 25kg", cantidad=25, unidad=kg, proveedor="AgroInsumos", lote_proveedor="LOT-2026-001", costo_unitario=12000, zona="Bodega Principal" y confirma
- **Then** se crea un nuevo inventory_item con los datos ingresados
- **And** se crea una inventory_transaction tipo 'receipt' con contexto completo
- **And** el stock del producto se actualiza inmediatamente en inv-stock
- **And** se muestra toast "Recepcion registrada exitosamente"

### Scenario 2: Producto no existe en catalogo
- **Given** el supervisor intenta buscar un producto que no existe
- **When** no encuentra resultados en el selector de productos
- **Then** se muestra mensaje "Producto no encontrado" con link "Crear producto primero" que navega a inv-products

### Scenario 3: Costo unitario cero (donacion)
- **Given** el supervisor recibe una muestra gratuita
- **When** ingresa cost_per_unit = 0
- **Then** se muestra warning "Costo $0 - Confirmar que es donacion o muestra gratuita?"
- **And** permite continuar con la recepcion si confirma

### Scenario 4: Zona sin proposito 'storage'
- **Given** la zona seleccionada tiene purpose = 'flowering' (no storage)
- **When** el supervisor selecciona esa zona para almacenamiento
- **Then** se muestra warning "Esta zona no esta designada como almacenamiento" en amarillo
- **And** permite continuar (no bloquea)

### Scenario 5: Cantidad negativa o cero
- **Given** el supervisor llena el formulario
- **When** ingresa cantidad = 0 o cantidad negativa
- **Then** el campo muestra error de validacion Zod "La cantidad debe ser mayor a 0"
- **And** el boton "Recibir" permanece disabled

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: recepcion crea item + transaction
- [ ] Acceptance criteria verified
- [ ] Validacion Zod client y server
- [ ] Accessibility: teclado numerico para cantidades

## Technical Notes
- Pantalla: `inv-receive`
- Server Action: `receiveItem(input)` en `lib/actions/inventory.actions.ts`
- Zod schema: `receiveItemSchema` (ya definido en docs/alquemist-features.md)
- INSERT inventory_item con source_type='purchase', lot_status='available'
- INSERT inventory_transaction tipo='receipt' con zone_id, user_id, cost_per_unit, cost_total
- Si producto tiene shelf_life_days y no se provee expiration_date: auto-calcular
- Conversion de unidad si el producto se recibe en unidad diferente a default_unit_id (via conversion_factor)

## UI/UX Notes
- Producto: dropdown con search integrado (busca por SKU y nombre)
- Proveedor: dropdown con search, pre-selecciona preferred_supplier_id del producto
- Costo: input numerico con inputMode='decimal', moneda de la company
- Zona: dropdown filtrado por facility del usuario
- Fecha vencimiento: date picker, pre-llenado si shelf_life_days existe
- Boton "Recibir" verde, 48px height

## Dependencies
- F-027 (Catalogo de productos) para que existan productos
- Zonas configuradas (Fase 0/3)
- Proveedores configurados

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-028-002: Recepcion en batch (multiples productos)

## User Story

**As a** gerente,
**I want** recibir multiples productos de una misma compra en una sola operacion,
**So that** pueda registrar toda una orden de compra de forma eficiente sin repetir datos comunes (proveedor, fecha).

## Acceptance Criteria

### Scenario 1: Recepcion batch exitosa
- **Given** el gerente accede a inv-receive y selecciona modo "Recepcion multiple"
- **When** agrega 3 lineas de productos con sus cantidades, costos y zonas, y confirma
- **Then** se crean 3 inventory_items y 3 inventory_transactions en una transaccion atomica
- **And** el stock de los 3 productos se actualiza
- **And** se muestra resumen "3 productos recibidos exitosamente"

### Scenario 2: Fallo en una linea del batch
- **Given** el gerente configura 3 lineas de recepcion, pero la linea 2 tiene un producto inexistente
- **When** intenta confirmar la recepcion batch
- **Then** se hace rollback de TODA la operacion (transaccion atomica)
- **And** se muestra error indicando la linea que fallo: "Linea 2: Producto no encontrado"
- **And** las lineas correctas no se persisten

### Scenario 3: Agregar y eliminar lineas
- **Given** el gerente esta en modo recepcion multiple con 2 lineas
- **When** agrega una tercera linea con boton "+" y elimina la primera con boton "x"
- **Then** quedan 2 lineas activas, numeradas correctamente
- **And** la validacion se ejecuta solo sobre las lineas activas

### Scenario 4: Campos comunes compartidos
- **Given** el gerente inicia recepcion multiple
- **When** selecciona proveedor "AgroInsumos" y zona "Bodega Principal" en la cabecera
- **Then** todas las lineas heredan proveedor y zona como valores por defecto
- **And** cada linea puede override proveedor y zona individualmente

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: transaccion atomica (all-or-nothing)
- [ ] Acceptance criteria verified
- [ ] Rendimiento: soporta hasta 20 lineas sin lag

## Technical Notes
- Server Action: `receiveBulk(items[])` en `lib/actions/inventory.actions.ts`
- Transaccion atomica via Drizzle `db.transaction()`
- Zod schema: array de `receiveItemSchema` con min(1)
- Rollback completo si cualquier linea falla
- Returns array de inventory_items creados

## UI/UX Notes
- Toggle "Individual" / "Multiple" en la parte superior del form
- Tabla editable de lineas: producto, cantidad, unidad, costo, zona, vencimiento
- Cabecera compartida: proveedor, fecha de recepcion
- Boton "+" para agregar linea, "x" para eliminar
- Resumen antes de confirmar: total items, costo total
- Mobile: lineas como cards apiladas (no tabla)

## Dependencies
- US-028-001 (Recepcion individual) como base

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-028-003: Auto-calculo de fecha de vencimiento

## User Story

**As a** supervisor,
**I want** que la fecha de vencimiento se calcule automaticamente basada en el shelf_life_days del producto,
**So that** no tenga que calcular manualmente la fecha y se reduzcan errores de registro.

## Acceptance Criteria

### Scenario 1: Auto-calculo con shelf_life
- **Given** el producto "Solucion Nutritiva A" tiene shelf_life_days = 90
- **When** el supervisor selecciona este producto en el formulario de recepcion
- **Then** el campo fecha de vencimiento se pre-llena automaticamente con hoy + 90 dias
- **And** el campo es editable para override manual

### Scenario 2: Producto sin shelf_life
- **Given** el producto "Maceta Plastica" no tiene shelf_life_days configurado
- **When** el supervisor selecciona este producto
- **Then** el campo fecha de vencimiento queda vacio (opcional)
- **And** no se muestra calculo automatico

### Scenario 3: Override manual
- **Given** el campo fecha de vencimiento se auto-lleno con 2026-05-17 (hoy + 90 dias)
- **When** el supervisor cambia la fecha a 2026-04-15 (fecha de la etiqueta del proveedor)
- **Then** se guarda la fecha manual ingresada, no la calculada
- **And** no se muestra warning si la fecha es anterior a la calculada

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified

## Technical Notes
- Logica client-side: al seleccionar producto, si product.shelf_life_days existe, calcular fecha = today + shelf_life_days
- El campo expiration_date del formulario acepta override
- Server-side: si expiration_date no viene y product.shelf_life_days existe, calcular automaticamente

## UI/UX Notes
- Label del campo: "Fecha de vencimiento (auto-calculado desde shelf life)"
- Indicador visual de que fue auto-calculado (icono de calculadora o texto helper)
- Date picker nativo para seleccion manual

## Dependencies
- US-028-001 (Recepcion individual)
- shelf_life_days configurado en productos (F-027)

## Estimation
- **Size**: S
- **Complexity**: Low
