# F-030: Recetas / BOM (INV-03)

## Overview

Gestion completa de recetas (formulas, BOM) para preparaciones como soluciones nutritivas, mezclas de sustratos y otros compuestos. Incluye lista de recetas, detalle con ingredientes, y ejecucion con escalado por factor, validacion de stock, seleccion de lotes especificos y confirmacion atomica. Cada ejecucion genera recipe_execution y las correspondientes inventory_transactions de consumo y produccion del output.

## User Personas

- **Operador**: Ejecuta recetas pre-configuradas escalando cantidades segun necesidad (pantalla inv-execute-recipe).
- **Supervisor**: Ejecuta recetas, revisa disponibilidad de ingredientes, gestiona recetas existentes.
- **Gerente**: Crea y configura recetas, analiza costos de preparaciones.
- **Admin**: Acceso completo a gestion de recetas.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-030-001 | Lista de recetas | S | P0 | Planned |
| US-030-002 | Detalle de receta con ingredientes | S | P0 | Planned |
| US-030-003 | Escalar receta con validacion de stock | M | P0 | Planned |
| US-030-004 | Ejecutar receta (transaccion atomica) | L | P0 | Planned |
| US-030-005 | CRUD de recetas | M | P1 | Planned |

---

# US-030-001: Lista de recetas

## User Story

**As a** supervisor,
**I want** ver una lista de todas las recetas activas con su nombre, producto output, cantidad base y numero de ingredientes,
**So that** pueda seleccionar rapidamente la receta correcta para preparar.

## Acceptance Criteria

### Scenario 1: Visualizacion de recetas activas
- **Given** existen 8 recetas activas en el sistema
- **When** el supervisor accede a la pantalla inv-recipes
- **Then** se muestran cards con: nombre, producto output (nombre + SKU), base_quantity con unidad, count de ingredientes, badge "Activa"

### Scenario 2: Busqueda de receta
- **Given** existen recetas "Solucion Nutritiva Veg", "Solucion Nutritiva Flor", "Mezcla Sustrato Base"
- **When** el supervisor busca "nutritiva"
- **Then** se filtran las 2 recetas que contienen "nutritiva" en el nombre

### Scenario 3: Sin recetas configuradas
- **Given** no existen recetas en el sistema
- **When** el supervisor accede a inv-recipes
- **Then** se muestra empty state "No hay recetas configuradas" con CTA "Crear receta" (visible solo para manager/admin)

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified

## Technical Notes
- Pantalla: `inv-recipes`
- Query: `recipes WHERE is_active = true` con JOIN a `products` (output_product_id)
- Count de ingredientes calculado desde items JSONB array length
- RLS: recipes filtradas por company_id

## UI/UX Notes
- Cards con layout: nombre bold, producto output en secondary text, base quantity en DM Mono
- Badge "Activa" en verde. Tap en card -> detalle/ejecucion
- Boton "Crear receta" (solo manager/admin) como FAB o header action

## Dependencies
- F-027 (Catalogo de productos) para productos de output e ingredientes

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-030-002: Detalle de receta con ingredientes

## User Story

**As a** supervisor,
**I want** ver el detalle de una receta con la lista completa de ingredientes, cantidades y unidades,
**So that** pueda verificar la formulacion antes de ejecutar y planificar la disponibilidad de insumos.

## Acceptance Criteria

### Scenario 1: Detalle completo de receta
- **Given** la receta "Solucion Nutritiva Veg" tiene 5 ingredientes
- **When** el supervisor hace tap en la receta
- **Then** se muestra: nombre, producto output, base_quantity ("para 1000L"), y tabla de ingredientes con producto, cantidad, unidad por cada uno
- **And** cada ingrediente muestra el stock actual disponible

### Scenario 2: Ingrediente sin stock
- **Given** un ingrediente de la receta tiene 0 unidades disponibles
- **When** el supervisor ve el detalle
- **Then** el ingrediente se resalta en rojo con icono de alerta y texto "Sin stock"

### Scenario 3: Preview de escalado
- **Given** la receta tiene base_quantity = 1000L
- **When** el supervisor ve la base quantity
- **Then** se muestra un input rapido "Calcular para: [___] L" que muestra preview de cantidades escaladas sin ejecutar

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified

## Technical Notes
- Query: `recipes` WHERE id = :id, items JSONB con JOIN a `products` para nombres
- Stock actual: query adicional a `inventory_items` GROUP BY product_id para cada ingrediente
- Preview de escalado: calculo client-side, no server action

## UI/UX Notes
- Tabla de ingredientes: producto, cantidad (DM Mono), unidad, stock disponible
- Stock insuficiente: fila en rojo con icono AlertTriangle
- Boton "Ejecutar Receta" prominente en la parte inferior

## Dependencies
- US-030-001 (Lista de recetas)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-030-003: Escalar receta con validacion de stock

## User Story

**As a** operador,
**I want** escalar una receta por un factor y ver inmediatamente si hay stock suficiente de cada ingrediente,
**So that** pueda ajustar la cantidad a preparar segun la disponibilidad real de insumos.

## Acceptance Criteria

### Scenario 1: Escalado con stock suficiente
- **Given** la receta "Sol. Nutritiva Veg" tiene base 1000L, el operador quiere preparar 500L
- **When** ingresa scale_factor = 0.5 (o cantidad deseada = 500L)
- **Then** cada ingrediente muestra: cantidad escalada, stock disponible, indicador "Suficiente" en verde
- **And** el boton "Ejecutar" esta habilitado

### Scenario 2: Escalado con stock insuficiente parcial
- **Given** 4 de 5 ingredientes tienen stock suficiente, pero Ca(NO3)2 necesita 84g y solo hay 50g
- **When** se calcula el escalado
- **Then** Ca(NO3)2 se muestra en rojo: "Necesita: 84g | Disponible: 50g | Faltante: 34g"
- **And** el boton "Ejecutar" esta disabled para ESE ingrediente pero muestra opcion de seleccionar otro lote

### Scenario 3: Factor de escala inusualmente alto
- **Given** el operador ingresa scale_factor > 100
- **When** se calcula el escalado
- **Then** se muestra warning "Escala inusualmente alta (x100). Verificar cantidad."
- **And** permite continuar si el operador confirma

### Scenario 4: Seleccion de lotes especificos
- **Given** un ingrediente tiene 3 lotes disponibles con diferentes fechas de vencimiento
- **When** el operador expande la fila del ingrediente
- **Then** puede seleccionar de que lote especifico tomar la cantidad
- **And** por defecto se auto-selecciona FIFO (por expiration_date ascendente)

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Calculo de escalado correcto con decimales

## Technical Notes
- Server Action: `scaleRecipe(recipeId, scaleFactor)` - calculo puro, no modifica DB
- Retorna array de {ingredient, scaled_qty, available_stock, sufficient: bool}
- Auto-seleccion FIFO: ORDER BY expiration_date ASC NULLS LAST
- Zod: scale_factor positive, max 1000

## UI/UX Notes
- Input de cantidad deseada (no factor directo) que calcula el factor automaticamente
- Tabla de ingredientes actualiza en tiempo real al cambiar cantidad
- Indicador por ingrediente: check verde (suficiente), x rojo (insuficiente)
- Expandir fila para ver lotes y seleccionar manualmente
- Warning en banner amarillo para escalas > 100

## Dependencies
- US-030-002 (Detalle de receta)
- inventory_items con stock actual

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-030-004: Ejecutar receta (transaccion atomica)

## User Story

**As a** operador,
**I want** confirmar la ejecucion de una receta escalada generando automaticamente las transacciones de consumo de ingredientes y la creacion del producto resultado,
**So that** el inventario se actualice correctamente en una sola operacion atomica.

## Acceptance Criteria

### Scenario 1: Ejecucion exitosa
- **Given** el operador escalo la receta a 500L y todos los ingredientes tienen stock
- **When** confirma la ejecucion seleccionando zona y (opcionalmente) batch
- **Then** se crea una recipe_execution con recipe_id, scale_factor, output quantities
- **And** se crean N inventory_transactions tipo 'consumption' (una por ingrediente)
- **And** se crea 1 inventory_transaction tipo 'recipe_output' + nuevo inventory_item del producto resultado
- **And** todo en transaccion atomica: si uno falla, rollback total
- **And** se muestra toast "Receta ejecutada: 500L de Sol. Nutritiva Veg"

### Scenario 2: Conflicto de stock concurrente
- **Given** dos operadores intentan ejecutar la misma receta consumiendo el mismo lote simultaneamente
- **When** el segundo operador confirma despues del primero
- **Then** el segundo recibe error "Stock insuficiente de [ingrediente]. El lote fue consumido por otra operacion."
- **And** se sugiere seleccionar otro lote disponible (retry sin perder datos del formulario)

### Scenario 3: Receta con ingrediente expirado
- **Given** el lote auto-seleccionado (FIFO) de un ingrediente tiene expiration_date < hoy
- **When** se muestra el resumen de ejecucion
- **Then** se muestra warning "Lote [X] de [ingrediente] esta vencido. Usar de todos modos?"
- **And** permite continuar si el operador confirma (decision del usuario)

### Scenario 4: Vincular ejecucion a batch
- **Given** el operador prepara solucion nutritiva para el batch LOT-001
- **When** selecciona batch_id = LOT-001 en el formulario
- **Then** la recipe_execution y las transactions quedan vinculadas al batch
- **And** aparecen en el tab Inventario del detalle del batch

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: atomicidad verificada (all-or-nothing)
- [ ] Acceptance criteria verified
- [ ] Validacion Zod client y server (executeRecipeSchema)

## Technical Notes
- Pantalla: `inv-execute-recipe`
- Server Action: `executeRecipe(input)` en `lib/actions/inventory.actions.ts`
- Zod schema: `executeRecipeSchema` (ya definido en docs/alquemist-features.md)
- Transaccion atomica via Drizzle db.transaction():
  1. INSERT recipe_execution
  2. Por cada ingrediente: INSERT inventory_transaction tipo 'consumption', UPDATE inventory_item.quantity_available
  3. INSERT inventory_item del output, INSERT inventory_transaction tipo 'recipe_output'
- Rollback si cualquier paso falla
- batch_id opcional: si se provee, las transactions llevan batch_id
- revalidatePath('/inventory')

## UI/UX Notes
- Pantalla de confirmacion con resumen: ingredientes a consumir, lotes seleccionados, output esperado
- Boton "Ejecutar Receta" verde, 56px height, prominente
- Loading state durante ejecucion (puede tomar 1-2s por la transaccion)
- Resultado: toast de exito con link al inventory_item creado

## Dependencies
- US-030-003 (Escalar receta)
- F-027 (Productos) para output product
- F-028 (Recepciones) para inventory_items de ingredientes

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-030-005: CRUD de recetas

## User Story

**As a** gerente,
**I want** crear, editar y desactivar recetas definiendo el producto de salida, cantidad base y lista de ingredientes,
**So that** el equipo operativo pueda ejecutar preparaciones estandarizadas y reproducibles.

## Acceptance Criteria

### Scenario 1: Crear receta nueva
- **Given** el gerente accede a "Nueva Receta"
- **When** completa: nombre="Sol. Nutritiva Floración", output=producto "Sol-Flor-1000L", base_quantity=1000, base_unit=L, y agrega 6 ingredientes con cantidades y unidades
- **Then** la receta se crea exitosamente y aparece en la lista
- **And** los items se guardan como JSONB array en el campo items

### Scenario 2: Receta sin ingredientes
- **Given** el gerente intenta crear una receta
- **When** no agrega ningun ingrediente y presiona guardar
- **Then** se muestra error "Una receta debe tener al menos 1 ingrediente"

### Scenario 3: Editar receta existente
- **Given** la receta "Sol. Nutritiva Veg" existe con 5 ingredientes
- **When** el gerente agrega un 6to ingrediente y cambia la cantidad del 2do
- **Then** la receta se actualiza exitosamente
- **And** las recipe_executions previas no se afectan (mantienen su snapshot)

### Scenario 4: Desactivar receta
- **Given** la receta ya no se usa
- **When** el gerente la desactiva
- **Then** is_active = false, no aparece en selectores de ejecucion
- **And** las executions historicas siguen visibles

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Validacion Zod para estructura de items

## Technical Notes
- Server Actions: `createRecipe(input)`, `updateRecipe(id, input)`, `deactivateRecipe(id)`
- Zod schema para receta: name required, output_product_id uuid, base_quantity positive, items array min(1) con {product_id, quantity, unit_id}
- items como JSONB en tabla recipes
- Solo manager y admin pueden crear/editar

## UI/UX Notes
- Formulario: nombre, producto output (search), base quantity + unit
- Tabla editable de ingredientes: producto (search), cantidad, unidad, boton + y x
- Drag to reorder ingredientes
- Preview: como se veria la receta al ejecutar

## Dependencies
- US-030-001 (Lista de recetas)
- F-027 (Catalogo de productos)

## Estimation
- **Size**: M
- **Complexity**: Medium
