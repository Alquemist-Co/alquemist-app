# F-034: Split de Batch (BAT-02)

## Overview

Wizard de 3 pasos para separar parte de un batch en un batch hijo manteniendo trazabilidad completa via batch_lineage. El batch hijo hereda cultivar, fase actual y orden de produccion, y recibe un codigo derivado del padre. Incluye merge de batches hijos para reunificar lotes previamente separados. Es fundamental para el manejo de contingencias (plantas enfermas, deficiencias, retrasos) sin perder trazabilidad.

## User Personas

- **Supervisor**: Ejecuta splits cuando detecta plantas con problemas que requieren tratamiento diferenciado.
- **Gerente**: Aprueba splits, revisa genealogia, decide sobre merges. Analiza impacto en costos.
- **Admin**: Acceso completo a split y merge.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-034-001 | Wizard de split de batch (3 pasos) | L | P0 | Planned |
| US-034-002 | Codigo derivado y herencia de propiedades | S | P0 | Planned |
| US-034-003 | Merge de batches hijos | M | P1 | Planned |
| US-034-004 | Validaciones y edge cases de split | S | P0 | Planned |

---

# US-034-001: Wizard de split de batch (3 pasos)

## User Story

**As a** supervisor,
**I want** separar un grupo de plantas de un batch en un nuevo batch hijo usando un wizard de 3 pasos (cantidad, zona/razon, confirmar),
**So that** pueda dar tratamiento diferenciado a plantas con problemas sin afectar el resto del lote.

## Acceptance Criteria

### Scenario 1: Split exitoso completo
- **Given** el batch LOT-001 tiene 42 plantas activas en fase vegetativo
- **When** el supervisor ejecuta el wizard: Paso 1 = 8 plantas, Paso 2 = zona "Sala Cuarentena" + razon "8 plantas con deficiencia Ca severa", Paso 3 = confirma
- **Then** se crea batch hijo LOT-001-A con plant_count=8
- **And** LOT-001 se actualiza a plant_count=34
- **And** se crea batch_lineage con operation='split', quantity_transferred=8, reason registrada
- **And** LOT-001-A hereda: cultivar_id, current_phase_id, production_order_id
- **And** se muestra toast "Split completado: LOT-001-A creado con 8 plantas"

### Scenario 2: Paso 1 - Seleccion de cantidad con slider
- **Given** LOT-001 tiene 42 plantas
- **When** el supervisor esta en el Paso 1
- **Then** ve un slider + input numerico mostrando "X de 42 plantas"
- **And** el maximo permitido es 41 (no puede splitear el 100%)
- **And** el minimo es 1

### Scenario 3: Paso 2 - Zona y razon obligatorias
- **Given** el supervisor pasa al Paso 2
- **When** no selecciona zona o no escribe razon
- **Then** el boton "Siguiente" esta disabled
- **And** se muestra indicacion de campos requeridos

### Scenario 4: Paso 3 - Preview y confirmacion
- **Given** el supervisor pasa al Paso 3
- **When** ve el resumen de confirmacion
- **Then** se muestra: "Separar 8 plantas de LOT-001 en LOT-001-A. Destino: Sala Cuarentena. Razon: [texto]"
- **And** el boton "Confirmar Split" es de estilo warning (no destructivo pero impactante)

### Scenario 5: Cancelar wizard
- **Given** el supervisor esta en cualquier paso del wizard
- **When** presiona "Cancelar" o el boton back
- **Then** se muestra confirmacion "Descartar split?" y al confirmar, no se realiza ninguna operacion

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: split crea batch hijo + lineage + actualiza parent
- [ ] Acceptance criteria verified
- [ ] Validacion Zod client y server (splitBatchSchema)

## Technical Notes
- Pantalla: `batch-split`
- Server Action: `splitBatch(batchId, splitCount, targetZoneId, reason)` en `lib/actions/batch.actions.ts`
- Zod schema: `splitBatchSchema` (ya definido en docs/alquemist-features.md)
- Transaccion atomica:
  1. Validar split_count < batch.plant_count
  2. INSERT batch hijo con datos heredados + nuevo codigo + target_zone_id + plant_count=split_count
  3. UPDATE batch padre: plant_count -= split_count
  4. INSERT batch_lineage: operation='split', parent_batch_id, child_batch_id, quantity_transferred, reason, performed_by
- Si hay cultivation_schedule: generar scheduled_activities para el batch hijo
- Las actividades pendientes del parent NO se duplican
- revalidatePath('/batches')

## UI/UX Notes
- Wizard de 3 pasos con progress stepper visible
- Paso 1: slider + input numerico, muestra "X de Y plantas"
- Paso 2: zona (dropdown), razon (textarea, min 5 chars)
- Paso 3: resumen con preview del codigo generado del hijo
- Boton "Confirmar Split" en naranja/warning, no verde
- Auto-save de cada paso en Zustand para no perder datos si el usuario navega

## Dependencies
- F-016/F-017 (Batches) de Fase 1
- Zonas configuradas

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-034-002: Codigo derivado y herencia de propiedades

## User Story

**As a** supervisor,
**I want** que el batch hijo generado por split tenga un codigo derivado del padre y herede las propiedades clave,
**So that** la relacion padre-hijo sea evidente visualmente y el batch hijo pueda operar independientemente.

## Acceptance Criteria

### Scenario 1: Generacion de codigo derivado
- **Given** el batch padre es LOT-001
- **When** se crea el primer batch hijo por split
- **Then** el hijo recibe codigo LOT-001-A
- **And** un segundo hijo recibiria LOT-001-B (secuencial por letra)

### Scenario 2: Split de un batch que ya es hijo
- **Given** LOT-001-A es un batch hijo previamente creado por split
- **When** se hace split de LOT-001-A
- **Then** el nuevo batch recibe codigo LOT-001-A-1 (numero, no letra, para segundo nivel)
- **And** el arbol genealogico crece: LOT-001 -> LOT-001-A -> LOT-001-A-1

### Scenario 3: Herencia de propiedades
- **Given** LOT-001 tiene cultivar=Gelato, phase=vegetativo, order=OP-2026-001, schedule=Plan Gelato
- **When** se crea el batch hijo LOT-001-A
- **Then** LOT-001-A hereda: cultivar_id, current_phase_id, production_order_id
- **And** LOT-001-A tiene parent_batch_id = LOT-001
- **And** LOT-001-A tiene su propia zona (puede ser diferente a la del padre)

### Scenario 4: Costos no redistribuidos
- **Given** LOT-001 tiene $500.000 en costos acumulados al momento del split
- **When** se crea LOT-001-A
- **Then** LOT-001 mantiene sus $500.000 (no se redistribuyen)
- **And** LOT-001-A comienza con $0 en costos propios
- **And** cada batch acumula costos independientemente desde el momento del split

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Codigos derivados unicos y consistentes

## Technical Notes
- Generacion de codigo: {parent_code}-{letter} para primer nivel, {parent_code}-{number} para niveles subsiguientes
- Query de secuencia: COUNT(batches WHERE parent_batch_id = :parentId) para determinar siguiente letra/numero
- Herencia: copiar cultivar_id, current_phase_id, production_order_id del padre
- parent_batch_id = id del padre
- Costos: total_cost del hijo inicia en 0, se acumula con nuevas transactions

## UI/UX Notes
- Preview del codigo generado en el Paso 3 del wizard
- Badge visual en lista de batches indicando si es hijo (icono de branch)
- En batch-list: mostrar referencia al padre con link navegable

## Dependencies
- US-034-001 (Wizard de split)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-034-003: Merge de batches hijos

## User Story

**As a** gerente,
**I want** reunificar batches hijos del mismo padre que estan en la misma fase,
**So that** pueda consolidar lotes que fueron separados temporalmente y ya no necesitan tratamiento diferenciado.

## Acceptance Criteria

### Scenario 1: Merge exitoso
- **Given** LOT-001-A (8 plantas) y LOT-001-B (6 plantas) son hijos de LOT-001, ambos en fase vegetativo
- **When** el gerente selecciona ambos batches para merge
- **Then** se crea batch consolidado (o se absorben en el padre) con plant_count = 14
- **And** se crean registros de batch_lineage con operation='merge' para cada batch absorbido
- **And** los batches absorbidos cambian a status='completed' o se marcan como merged

### Scenario 2: Merge de batches en fases diferentes
- **Given** LOT-001-A esta en fase vegetativo y LOT-001-B esta en fase floracion
- **When** el gerente intenta merge
- **Then** se muestra error "Solo se pueden unificar batches que esten en la misma fase"
- **And** la operacion se bloquea

### Scenario 3: Merge de batches de padres diferentes
- **Given** LOT-001-A es hijo de LOT-001 y LOT-002-A es hijo de LOT-002
- **When** el gerente intenta merge de LOT-001-A con LOT-002-A
- **Then** se muestra error "Solo se pueden unificar batches del mismo padre"
- **And** la operacion se bloquea

### Scenario 4: Merge con confirmacion de cantidades
- **Given** el gerente selecciona 2 batches para merge
- **When** ve la pantalla de confirmacion
- **Then** se muestra resumen: batches a unificar, plant_count total, batch destino
- **And** requiere confirmacion explicita

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration test: merge actualiza lineage y counts
- [ ] Acceptance criteria verified

## Technical Notes
- Server Action: `mergeBatches(batchIds[], targetBatchId)` en `lib/actions/batch.actions.ts`
- Validaciones:
  1. Todos los batches deben tener el mismo parent_batch_id
  2. Todos deben estar en la misma current_phase_id
  3. Todos deben tener status='active'
- Transaccion atomica:
  1. UPDATE target_batch: plant_count += SUM(merged batches plant_count)
  2. Por cada batch merged: INSERT batch_lineage operation='merge', UPDATE batch status='completed'
- El batch destino puede ser el padre original o uno de los hijos

## UI/UX Notes
- Acceso desde batch-split o batch-detail
- Selector multiple de batches hijos elegibles (mismo padre, misma fase)
- Confirmacion: lista de batches seleccionados con cantidades, flecha hacia batch destino
- Solo visible para batches que tengan hijos activos en la misma fase

## Dependencies
- US-034-001 (Wizard de split) para que existan batches hijos

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-034-004: Validaciones y edge cases de split

## User Story

**As a** supervisor,
**I want** que el sistema valide correctamente todos los edge cases de split (batch completado, plant_count minimo, actividades en ejecucion),
**So that** no se produzcan splits invalidos que corrompan datos de produccion.

## Acceptance Criteria

### Scenario 1: Split de batch completado o cancelado
- **Given** LOT-002 tiene status = 'completed'
- **When** el supervisor intenta hacer split
- **Then** se muestra error "No se puede splitear un batch completado"
- **And** la accion se bloquea

### Scenario 2: Split de batch on_hold
- **Given** LOT-003 tiene status = 'on_hold'
- **When** el supervisor intenta hacer split
- **Then** se permite el split (separar plantas enfermas puede ser la razon del hold)
- **And** se muestra nota informativa "Este batch esta en pausa"

### Scenario 3: Split con plant_count = plant_count - 1
- **Given** LOT-001 tiene 42 plantas y el supervisor quiere splitear 41
- **When** ingresa split_count = 41
- **Then** se muestra warning "El batch padre quedara con solo 1 planta. Continuar?"
- **And** permite continuar si confirma

### Scenario 4: Split con actividad en ejecucion offline
- **Given** un operador esta ejecutando una actividad offline para LOT-001
- **When** el supervisor intenta split simultaneamente
- **Then** si la actividad aun no se sincronizo: el split procede normalmente
- **And** cuando la actividad se sincronice, se acepta pero se marca como 'late_phase' si aplica

### Scenario 5: Split de batch sin plantas
- **Given** LOT-004 tiene plant_count = 0 (error de datos o cosecha completa)
- **When** el supervisor intenta split
- **Then** se muestra error "No hay plantas disponibles para separar"
- **And** la accion se bloquea

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests para cada edge case
- [ ] Acceptance criteria verified
- [ ] Mensajes de error claros y accionables

## Technical Notes
- Validaciones server-side en splitBatch():
  1. batch.status NOT IN ('completed', 'cancelled'): error 400
  2. split_count > 0 AND split_count < batch.plant_count: error Zod
  3. batch.plant_count > 0: error 400
- Warning client-side (no bloquean):
  1. split_count > plant_count * 0.9: "Batch padre quedara con pocas plantas"
  2. batch.status == 'on_hold': nota informativa
- Concurrent split protection: optimistic locking via updated_at check

## UI/UX Notes
- Errores bloqueantes: modal con mensaje claro y boton "Entendido"
- Warnings no bloqueantes: banner amarillo en el wizard con texto explicativo
- Todos los mensajes en espanol, sin jerga tecnica

## Dependencies
- US-034-001 (Wizard de split)

## Estimation
- **Size**: S
- **Complexity**: Medium
