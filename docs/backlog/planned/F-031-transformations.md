# F-031: Transformaciones / Cosecha Multi-Output (INV-02)

## Overview

Ejecucion de transformaciones de produccion que consumen inputs y generan multiples outputs segun las reglas de phase_product_flows. Cubre cosechas multi-output (flor humeda + trim + waste), procesamiento post-cosecha, y cualquier fase de transformacion. Incluye waste tracking, calculo de yield real vs esperado, registro en production_order_phase, y manejo transaccional atomico. Es la operacion mas compleja del modulo de inventario.

## User Personas

- **Supervisor**: Ejecuta transformaciones, registra outputs reales de cosecha, documenta waste.
- **Gerente**: Revisa yields de transformacion, compara real vs esperado, analiza eficiencia.
- **Admin**: Acceso completo, puede ejecutar y corregir transformaciones.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-031-001 | Ejecutar transformacion con outputs configurados | L | P0 | Planned |
| US-031-002 | Registro de waste y yields | M | P0 | Planned |
| US-031-003 | Comparacion yield real vs esperado | S | P1 | Planned |

---

# US-031-001: Ejecutar transformacion con outputs configurados

## User Story

**As a** supervisor,
**I want** ejecutar una transformacion de batch que consume el input actual y genera multiples outputs segun los phase_product_flows configurados,
**So that** los nuevos productos (flor humeda, trim, etc.) se registren en inventario con trazabilidad completa al batch de origen.

## Acceptance Criteria

### Scenario 1: Cosecha multi-output exitosa
- **Given** el batch LOT-001 esta en fase "cosecha" con 42 plantas y phase_product_flows define 3 outputs: flor humeda (primary), trim humedo (secondary), tallos/raices (waste)
- **When** el supervisor ejecuta la transformacion ingresando: flor humeda=21kg, trim=8.4kg, waste=50kg
- **Then** se crea inventory_transaction tipo 'transformation_out' consumiendo el input
- **And** se crean nuevos inventory_items para flor humeda y trim, cada uno con su transaction tipo 'transformation_in'
- **And** se crea transaction tipo 'waste' para tallos/raices
- **And** todas las transactions se vinculan via related_transaction_id
- **And** todo en transaccion atomica

### Scenario 2: Producto no configurado como output
- **Given** phase_product_flows para cosecha define solo flor humeda, trim y waste
- **When** el supervisor intenta agregar un output de un producto no configurado
- **Then** se muestra error "Producto no configurado como output de esta fase"
- **And** no permite agregar ese output

### Scenario 3: Cosecha parcial (solo parte de las plantas)
- **Given** LOT-001 tiene 42 plantas y el supervisor cosecha solo 20
- **When** ejecuta la transformacion para 20 plantas
- **Then** batch.plant_count se reduce a 22
- **And** las 22 plantas restantes siguen en la misma fase
- **And** los outputs se generan proporcionalmente a las 20 plantas cosechadas

### Scenario 4: Batch sin plantas disponibles
- **Given** LOT-001 tiene plant_count = 0 (ya cosechado completamente)
- **When** el supervisor intenta ejecutar transformacion
- **Then** se muestra error "Batch sin plantas disponibles para transformar"
- **And** la accion se bloquea

### Scenario 5: Fase destructiva
- **Given** la fase de cosecha tiene is_destructive = true
- **When** se ejecuta la transformacion completa (todas las plantas)
- **Then** se muestra warning "Esta operacion es destructiva. Las plantas del batch seran marcadas como cosechadas."
- **And** al confirmar, plant_positions (si existen) pasan a status='harvested'

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: atomicidad y vinculacion de transactions
- [ ] Acceptance criteria verified
- [ ] yield_pct calculado y registrado en production_order_phase

## Technical Notes
- Server Action: `executeTransformation(batchId, phaseId, outputs[])` en `lib/actions/inventory.actions.ts`
- Outputs: array de {product_id, quantity, unit_id, grade?}
- Validacion contra phase_product_flows: cada output.product_id debe existir como flow con direction='out' para la phase_id
- Transaccion atomica:
  1. INSERT inventory_transaction tipo 'transformation_out' (consume input)
  2. Por cada output valido: INSERT inventory_item + INSERT inventory_transaction tipo 'transformation_in'
  3. Para waste: INSERT inventory_transaction tipo 'waste' (sin inventory_item destino)
  4. UPDATE batch: plant_count si cosecha parcial, current_product_id si cambia
  5. UPDATE production_order_phase: input_quantity, output_quantity, yield_pct
- related_transaction_id vincula out -> in
- Yield real: sum(outputs primary) / input * 100

## UI/UX Notes
- Formulario pre-llenado con outputs esperados desde phase_product_flows
- Cada output como fila editable: producto (fijo del flow), cantidad (input numerico), unidad, grade (si aplica)
- Waste como seccion separada con campo reason obligatorio
- Resumen pre-confirmacion: inputs consumidos, outputs a generar, yield calculado
- Warning visual para fases destructivas
- Boton confirmar rojo/warning para operaciones destructivas

## Dependencies
- F-016/F-017 (Batches) de Fase 1 para batch existente
- Configuracion de phase_product_flows (Fase 0)
- F-026 (Stock actual) para visualizar nuevos items

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-031-002: Registro de waste y yields

## User Story

**As a** gerente,
**I want** que cada transformacion registre el waste (desperdicio) y calcule el yield real automaticamente,
**So that** pueda rastrear la eficiencia de cada cosecha y detectar perdidas anormales.

## Acceptance Criteria

### Scenario 1: Waste registrado correctamente
- **Given** una transformacion genera 21kg flor humeda + 8.4kg trim + 50kg waste
- **When** se completa la transformacion
- **Then** el waste se registra como inventory_transaction tipo 'waste' con reason obligatorio
- **And** el waste es visible en el tab Inventario del detalle del batch
- **And** no genera inventory_item util (solo registro de perdida)

### Scenario 2: Yield cero (todo waste)
- **Given** una cosecha resulta en 0kg de producto util y 30kg de waste
- **When** se ejecuta con todos los outputs en 0 y waste > 0
- **Then** se genera alerta critica tipo 'quality_failed' vinculada al batch
- **And** la alerta se envia al supervisor y gerente
- **And** yield_pct se registra como 0% en production_order_phase

### Scenario 3: Transformacion sin waste
- **Given** una fase de empaque transforma 4.2kg seco en 150 frascos sin desperdicio
- **When** se ejecuta con waste = 0
- **Then** no se genera transaction de waste
- **And** el yield se calcula normalmente sin waste en la formula

### Scenario 4: Yield muy bajo genera alerta
- **Given** phase_product_flows define expected_yield_pct = 90% para flor humeda
- **When** la transformacion resulta en yield real < 50% del esperado
- **Then** se muestra warning en la UI "Yield muy bajo: X% (esperado: Y%)"
- **And** no bloquea la operacion (es warning, no error)

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Alerta automatica para yield critico

## Technical Notes
- Waste transaction: type='waste', reason TEXT obligatorio, sin target_item_id
- yield_pct = (sum_output_primary / input_quantity) * 100
- Si yield_pct < 50% de expected_yield_pct: INSERT alert type='quality_failed', severity='critical'
- UPDATE production_order_phase.yield_pct con valor real calculado
- El waste se suma al costo del batch como perdida

## UI/UX Notes
- Seccion "Desperdicio" separada visualmente con fondo warning sutil
- Campo reason para waste: textarea obligatoria con placeholder "Describa el desperdicio..."
- Indicador de yield en tiempo real al ingresar cantidades: gauge o barra con comparacion vs esperado
- Color: verde si yield >= esperado, amarillo si 50-100% del esperado, rojo si < 50%

## Dependencies
- US-031-001 (Ejecutar transformacion)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-031-003: Comparacion yield real vs esperado

## User Story

**As a** gerente,
**I want** ver en el detalle de la orden de produccion la comparacion del yield real vs el esperado para cada fase de transformacion,
**So that** pueda identificar fases con bajo rendimiento y tomar acciones correctivas.

## Acceptance Criteria

### Scenario 1: Yield waterfall con datos reales
- **Given** la orden OP-2026-001 tiene 3 fases de transformacion completadas con yields registrados
- **When** el gerente ve el detalle de la orden (order-detail)
- **Then** el diagrama yield waterfall muestra barras dobles por fase: barra verde para yield real, barra outline lime para yield esperado
- **And** se muestra el porcentaje de desviacion por fase

### Scenario 2: Fase sin transformacion ejecutada
- **Given** una fase de la orden aun no tiene yield registrado
- **When** el gerente ve el waterfall
- **Then** la fase muestra solo la barra esperada (outline) y texto "Pendiente"

### Scenario 3: Yield significativamente diferente al esperado
- **Given** la fase de cosecha tiene expected_yield_pct = 90% y yield real = 65%
- **When** se muestra en el waterfall
- **Then** la barra real se muestra en rojo (< 80% del esperado)
- **And** se muestra tooltip "Rendimiento 28% por debajo del esperado"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Chart accesible con aria-labels

## Technical Notes
- Datos: production_order_phases.yield_pct (real) vs phase_product_flows.expected_yield_pct (esperado)
- Recharts BarChart con barras agrupadas
- Lazy loading del componente de chart
- Se integra en la pantalla order-detail existente (tab o seccion)

## UI/UX Notes
- Barras dobles: verde solido (#005E42) para real, outline lime (#ECF7A3) para esperado
- Barra roja si yield real < 80% del esperado
- Tooltip con detalles: input qty, output qty, yield %, desviacion
- Responsive: horizontal en desktop, vertical en mobile

## Dependencies
- US-031-001 (Ejecutar transformacion para generar yields)
- Modulo de ordenes (Fase 1) para pantalla order-detail

## Estimation
- **Size**: S
- **Complexity**: Medium
