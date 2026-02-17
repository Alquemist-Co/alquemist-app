# F-018: Avanzar Fase de Batch

## Overview

Permite avanzar un batch a la siguiente fase de su ciclo productivo. Incluye validaciones criticas: la fase destino debe ser la siguiente en sort_order, si la fase requiere cambio de zona el selector es obligatorio, y si hay actividades pendientes se muestra un warning. Al avanzar, se generan automaticamente las actividades programadas de la nueva fase si existe un cultivation_schedule. Al llegar a la exit_phase, el batch se completa.

## User Personas

- **Supervisor**: Principal usuario. Avanza batches de fase basandose en evaluacion de campo.
- **Gerente**: Puede avanzar fases con autoridad.
- **Admin**: Acceso completo.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-018-001 | Avanzar batch a la siguiente fase | L | P0 | Done |
| US-018-002 | Cambio de zona obligatorio al avanzar fase | M | P0 | Done |
| US-018-003 | Warning de actividades pendientes al avanzar | S | P1 | Done |
| US-018-004 | Completar batch al llegar a exit_phase | M | P1 | Done |

---

# US-018-001: Avanzar batch a la siguiente fase

## User Story

**As a** supervisor,
**I want** avanzar un batch a la siguiente fase de produccion con un solo clic de confirmacion,
**So that** el ciclo productivo avance y las actividades de la nueva fase se generen automaticamente.

## Acceptance Criteria

### Scenario 1: Avance exitoso a la siguiente fase
- **Given** el batch LOT-001 esta en fase "Vegetativo" (sort_order=3) y la siguiente fase es "Floracion" (sort_order=4)
- **When** el supervisor hace clic en "Avanzar fase" y confirma
- **Then** el sistema: (1) UPDATE batch.current_phase_id a Floracion, (2) INSERT timeline event "Avance de fase: Vegetativo -> Floracion", (3) UPDATE production_order_phase Vegetativo status='completed', (4) UPDATE production_order_phase Floracion status='in_progress', (5) genera scheduled_activities de Floracion si hay cultivation_schedule

### Scenario 2: Intentar saltar una fase no skippable
- **Given** el batch esta en fase 2 y la fase 3 NO tiene can_skip=true
- **When** el supervisor intenta avanzar a la fase 4 directamente
- **Then** el sistema retorna error "Solo se puede avanzar a la fase siguiente (Fase 3: Vegetativo). No se pueden saltar fases."

### Scenario 3: Saltar fase skippable
- **Given** entre la fase actual y la siguiente hay una fase con can_skip=true que fue excluida en la orden
- **When** el supervisor avanza
- **Then** la fase skippable se marca como 'skipped' en el stepper y el batch avanza a la primera fase no-skipped siguiente, registrando el skip en la timeline

### Scenario 4: Operador no puede avanzar fase directamente
- **Given** un operador ve el detalle de un batch activo
- **When** intenta avanzar la fase
- **Then** el boton "Avanzar fase" no es visible para el rol operador (solo supervisor, manager, admin)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para todas las validaciones
- [ ] Generacion de scheduled_activities verificada
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `advancePhase(batchId, targetZoneId?, notes?)` en `lib/actions/batch.actions.ts`
- **Zod Schema**: `advancePhaseSchema` — batch_id requerido, target_zone_id opcional, notes opcional
- **Validaciones server-side**:
  - Solo avanzar a la siguiente fase en sort_order (no saltar, excepto can_skip=true)
  - Si fase actual is_destructive=true: no se puede retroceder
  - Verificar batch.status='active' (no completed, cancelled, on_hold)
- **Side effects**: INSERT timeline event, UPDATE order_phases, genera scheduled_activities via `generateScheduledActivities(batchId, newPhaseId)`
- **Tablas**: batches, production_order_phases, scheduled_activities, activities (timeline)

## UI/UX Notes
- Boton "Avanzar fase" en quick actions del batch-detail
- Modal de confirmacion: "Avanzar LOT-001 de Vegetativo a Floracion?"
- Campo de notas opcional en el modal
- Tras avanzar: stepper se actualiza con animacion, toast de confirmacion

## Dependencies
- F-014 (batch creado), F-011 (fases configuradas)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-018-002: Cambio de zona obligatorio al avanzar fase

## User Story

**As a** supervisor,
**I want** que el sistema me obligue a seleccionar una zona destino cuando la nueva fase requiere cambio de zona (requires_zone_change=true),
**So that** el batch siempre tenga una ubicacion fisica correcta registrada y el equipo sepa donde mover las plantas.

## Acceptance Criteria

### Scenario 1: Fase requiere zona y selector aparece
- **Given** la fase "Floracion" tiene requires_zone_change=true
- **When** el supervisor inicia el avance de fase
- **Then** el modal de confirmacion incluye un selector de zona obligatorio (no puede confirmar sin seleccionar zona), filtrado por purpose compatible con la fase

### Scenario 2: Fase no requiere zona y el campo no aparece
- **Given** la fase siguiente NO tiene requires_zone_change=true
- **When** el supervisor inicia el avance
- **Then** el modal de confirmacion NO muestra selector de zona; el batch mantiene su zona actual

### Scenario 3: Zona seleccionada sin capacidad
- **Given** la zona "Sala Floracion" tiene capacidad para 20 plantas y el batch tiene 42
- **When** el supervisor selecciona esa zona
- **Then** el sistema muestra error "Sala Floracion tiene capacidad para 20 plantas. El batch requiere 42. Capacidad insuficiente." y bloquea la confirmacion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion de capacidad de zona
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Validacion en `advancePhase`: si next_phase.requires_zone_change && !targetZoneId → error
- UPDATE batches SET zone_id=targetZoneId al avanzar
- Query de capacidad: zones.plant_capacity - SUM(batches.plant_count WHERE zone_id AND status='active')

## UI/UX Notes
- Selector de zona como dropdown con search, mostrando nombre + capacidad disponible
- Zona actual marcada como "(actual)" en el dropdown
- Zonas sin capacidad suficiente deshabilitadas con tooltip explicativo

## Dependencies
- US-018-001
- Zonas configuradas (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-018-003: Warning de actividades pendientes al avanzar

## User Story

**As a** supervisor,
**I want** ver un warning cuando intento avanzar de fase y hay actividades pendientes no ejecutadas en la fase actual,
**So that** pueda decidir conscientemente si avanzar de fase dejando trabajo sin completar.

## Acceptance Criteria

### Scenario 1: Warning muestra actividades pendientes
- **Given** el batch LOT-001 en fase "Vegetativo" tiene 3 scheduled_activities con status='pending'
- **When** el supervisor inicia el avance de fase
- **Then** el modal muestra warning: "3 actividades pendientes no se ejecutaran al avanzar: Fertirrigacion (Mar 5), Poda apical (Mar 6), Medicion pH (Mar 7). Continuar?"

### Scenario 2: Sin actividades pendientes no muestra warning
- **Given** todas las actividades de la fase actual estan completadas o canceladas
- **When** el supervisor inicia el avance
- **Then** el modal NO muestra el warning de actividades pendientes

### Scenario 3: Avanzar con actividades pendientes las marca como skipped
- **Given** hay 3 actividades pendientes y el supervisor confirma el avance
- **When** se ejecuta advancePhase
- **Then** las 3 actividades pendientes se actualizan a status='skipped' y se registra en la timeline

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Status 'skipped' para actividades no ejecutadas
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Query: COUNT(scheduled_activities WHERE batch_id AND phase_id=current AND status='pending')
- Al avanzar: UPDATE scheduled_activities SET status='skipped' WHERE batch_id AND phase_id=old_phase AND status IN ('pending', 'overdue')
- **Pantalla**: modal de advancePhase en batch-detail

## UI/UX Notes
- Warning en banner amarillo dentro del modal de avance
- Lista de actividades pendientes con nombre y fecha
- Boton de confirmacion cambia texto a "Avanzar de todas formas"

## Dependencies
- US-018-001, F-020 (actividades programadas)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-018-004: Completar batch al llegar a exit_phase

## User Story

**As a** supervisor,
**I want** que el batch se complete automaticamente cuando avanza mas alla de la exit_phase definida en la orden,
**So that** el ciclo productivo se cierre correctamente y la orden pueda evaluarse como completada.

## Acceptance Criteria

### Scenario 1: Batch se completa al avanzar de la exit_phase
- **Given** el batch LOT-001 esta en la exit_phase "Empaque" (ultima fase de su orden)
- **When** el supervisor ejecuta "Completar fase final" (o la actividad con triggers_phase_change completa la ultima fase)
- **Then** el sistema: (1) marca batch.status='completed', (2) production_order_phase de Empaque status='completed', (3) evalua si la production_order completa (todas sus fases completadas -> order.status='completed'), (4) registra evento "Batch completado" en timeline

### Scenario 2: Batch no se completa si no esta en exit_phase
- **Given** el batch esta en una fase intermedia
- **When** se avanza a la siguiente fase
- **Then** el batch permanece en status='active' con la nueva current_phase_id

### Scenario 3: Orden se completa cuando todos sus batches completan
- **Given** la orden tiene 1 solo batch y este se completa
- **When** el batch pasa a status='completed'
- **Then** la orden automaticamente pasa a status='completed' con registro de fechas reales

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests para completitud de batch y orden
- [ ] Criterios de aceptacion verificados

## Technical Notes
- En `advancePhase`: si current_phase == exit_phase de la orden, batch.status='completed'
- Evaluar orden: si todos los batches de la orden estan completed -> order.status='completed'
- Registrar actual_end_date en la ultima production_order_phase
- **Tablas**: batches, production_orders, production_order_phases

## UI/UX Notes
- Boton cambia de "Avanzar fase" a "Completar batch" cuando esta en la exit_phase
- Modal de confirmacion especial: "Este es la fase final. Al completar, el batch se cerrara. Continuar?"
- Celebracion sutil: toast con checkmark verde "Batch LOT-001 completado exitosamente"

## Dependencies
- US-018-001, F-014

## Estimation
- **Size**: M
- **Complexity**: Medium
