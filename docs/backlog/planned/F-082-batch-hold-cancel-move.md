# F-082: Hold, Cancel y Zone Change de Batch

## Overview

Implementa tres acciones del ciclo de vida del batch documentadas en BAT-F01 de los user flows pero que aun no tienen UI ni Server Actions: poner en hold (pausar), cancelar, y cambiar de zona sin avance de fase. Actualmente el batch detail tiene acciones de avanzar fase y split, pero no soporta estas operaciones de gestion que son necesarias para manejar problemas sanitarios, resultados de calidad pendientes, y reubicacion logistica. El hold suspende las actividades programadas y las reactiva al resumir. La cancelacion es irreversible. El zone change es un movimiento fisico sin cambio de estado productivo.

## User Personas

- **Supervisor**: Pone batches en hold por problemas operativos, resume hold cuando se resuelve, cambia zona para optimizar espacio. Caso mas comun.
- **Gerente (Manager)**: Hold, resume, cancel y zone change. Cancela batches que no son viables.
- **Admin**: Acceso completo. Cancela batches en situaciones excepcionales.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-082-001 | Poner batch en hold con razon obligatoria | M | P0 | Planned |
| US-082-002 | Resumir batch desde hold | S | P0 | Planned |
| US-082-003 | Cancelar batch con confirmacion | M | P1 | Planned |
| US-082-004 | Cambiar zona de batch sin avance de fase | S | P1 | Planned |

---

# US-082-001: Poner batch en hold con razon obligatoria

## User Story

**As a** supervisor,
**I want** poner un batch en hold con una razon obligatoria cuando hay un problema que impide continuar la produccion normal,
**So that** el batch quede pausado, las actividades programadas se suspendan, y el equipo sepa por que se detuvo.

## Acceptance Criteria

### Scenario 1: Poner batch activo en hold
- **Given** el supervisor esta en el detalle del batch LOT-GELATO-001 con status='active' en fase "Floracion"
- **When** hace clic en "Pausar" en el action bar, ingresa razon "Resultado de calidad pendiente — posible contaminacion por E. coli, esperando retest del laboratorio"
- **Then** el batch status cambia a 'on_hold', se muestra badge "En pausa" en el header, un toast confirma "Batch pausado: LOT-GELATO-001", y la razon se registra en el timeline del batch

### Scenario 2: Actividades programadas se suspenden
- **Given** LOT-GELATO-001 tiene 5 scheduled_activities con status='pending' para los proximos 7 dias
- **When** el supervisor pone el batch en hold
- **Then** las 5 scheduled_activities cambian status de 'pending' a 'skipped' con nota "Suspendida por hold del batch", y ya no aparecen en el dashboard del operador

### Scenario 3: Razon obligatoria para hold
- **Given** el supervisor esta en el Dialog de hold
- **When** intenta confirmar sin ingresar razon
- **Then** el sistema muestra error "La razon es obligatoria para pausar un batch" y bloquea la confirmacion

### Scenario 4: No se puede poner en hold un batch completado o cancelado
- **Given** el batch LOT-OLD-001 tiene status='completed'
- **When** el supervisor ve el detalle de este batch
- **Then** la accion "Pausar" no aparece en el action bar (solo disponible para batches 'active' o 'phase_transition')

### Scenario 5: Batch en phase_transition se puede poner en hold
- **Given** LOT-GELATO-001 esta en status='phase_transition' (avanzando de fase)
- **When** el supervisor hace clic en "Pausar" e ingresa razon "Problema con HVAC en zona destino, esperar reparacion"
- **Then** el batch cambia a 'on_hold' y el avance de fase queda interrumpido hasta que se resuma

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['supervisor', 'manager', 'admin'])
- [ ] Scheduled activities suspendidas atomicamente
- [ ] Razon registrada y visible en timeline del batch
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `holdBatch(data)` en `src/lib/actions/batches.ts`
- **Zod Schema**: `holdBatchSchema` en `src/lib/schemas/batch.ts`
  - batchId: UUID required
  - reason: string min(10) max(500)
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT batch FOR UPDATE, validate status IN ('active', 'phase_transition')
  2. UPDATE batches SET status='on_hold', updated_at=now()
  3. UPDATE scheduled_activities SET status='skipped' WHERE batch_id=batchId AND status='pending'
  4. Opcionalmente: INSERT evento en un campo JSONB de timeline o log table (si existe)
- **Revalidation**: `revalidatePath('/batches')` + `revalidatePath('/batches/[id]')` + `revalidatePath('/activities')`
- **Previous status tracking**: Guardar el status previo (active o phase_transition) para poder restaurarlo al resumir. Se puede usar un campo JSONB en metadata del batch o inferir que siempre vuelve a 'active'

## UI/UX Notes
- Boton "Pausar" en el action bar inferior del batch detail, con icono de pausa (Lucide `pause-circle`)
- Dialog de confirmacion con textarea para razon
- Badge "En pausa" color amber/warning en el header del batch
- El stepper de fases muestra indicador visual de pausa (icono o color diferente en la fase actual)
- Las actividades suspendidas se muestran con estilo muted en la tab de actividades del batch

## Dependencies
- F-017 (detalle de batch con action bar)
- F-020 (scheduled activities que se suspenden)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-082-002: Resumir batch desde hold

## User Story

**As a** supervisor,
**I want** resumir un batch que estaba en hold cuando el problema se resuelve,
**So that** el batch vuelva a estado activo y las actividades se reprogramen para continuar la produccion.

## Acceptance Criteria

### Scenario 1: Resumir batch en hold
- **Given** LOT-GELATO-001 esta en status='on_hold' desde hace 3 dias, con razon "Resultado de calidad pendiente"
- **When** el supervisor hace clic en "Reanudar" e ingresa nota "Retest del laboratorio confirmo resultado negativo para E. coli. Se puede continuar."
- **Then** el batch status cambia a 'active', se muestra badge "Activo" en el header, toast confirma "Batch reanudado: LOT-GELATO-001", y la nota de reanudacion se registra en el timeline

### Scenario 2: Actividades se reprograman al resumir
- **Given** LOT-GELATO-001 tenia 5 scheduled_activities que fueron suspendidas (status='skipped') al entrar en hold
- **When** el supervisor reanuda el batch
- **Then** se generan nuevas scheduled_activities para las mismas actividades, con planned_date ajustadas desde hoy en adelante, manteniendo los mismos intervalos relativos entre ellas

### Scenario 3: Solo batches en hold se pueden resumir
- **Given** LOT-GELATO-002 tiene status='active'
- **When** el supervisor ve el detalle de este batch
- **Then** la accion "Reanudar" no aparece (solo aparece "Pausar")

### Scenario 4: Resumir sin nota es valido
- **Given** LOT-GELATO-001 esta en hold
- **When** el supervisor hace clic en "Reanudar" sin ingresar nota adicional
- **Then** el batch se reanuda correctamente — la nota es opcional (a diferencia del hold, donde la razon es obligatoria)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Nuevas scheduled_activities generadas con fechas recalculadas
- [ ] Nota de reanudacion registrada en timeline
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `resumeBatch(data)` en `src/lib/actions/batches.ts`
- **Zod Schema**: `resumeBatchSchema` en `src/lib/schemas/batch.ts`
  - batchId: UUID required
  - note: string max(500) optional
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT batch FOR UPDATE, validate status='on_hold'
  2. UPDATE batches SET status='active', updated_at=now()
  3. Recalcular scheduled_activities: buscar las que fueron suspendidas (status='skipped' con nota de hold), y generar nuevas con planned_date recalculadas desde hoy
- **Reprogramacion**: Las actividades suspendidas NO se reactivan (status='skipped' es final). Se crean NUEVAS scheduled_activities con los mismos templates, ajustando planned_date. El offset se calcula como: dias_transcurridos_en_hold se suman a cada planned_date original
- **Revalidation**: `revalidatePath('/batches')` + `revalidatePath('/batches/[id]')` + `revalidatePath('/activities')`

## UI/UX Notes
- Boton "Reanudar" en el action bar, solo visible cuando batch status='on_hold', icono play-circle (Lucide)
- Dialog simple con textarea opcional para nota de reanudacion
- Placeholder: "Describa por que se reanuda (opcional)..."
- Boton "Reanudar batch" con estilo primary

## Dependencies
- US-082-001 (hold que se va a resumir)
- F-020 (scheduled activities que se reprograman)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-082-003: Cancelar batch con confirmacion

## User Story

**As a** manager,
**I want** cancelar un batch que ya no es viable con confirmacion explicita y razon obligatoria,
**So that** el batch quede registrado como cancelado con trazabilidad completa de por que se decidio, sin posibilidad de revertir la decision.

## Acceptance Criteria

### Scenario 1: Cancelar batch activo
- **Given** el manager esta en el detalle del batch LOT-GELATO-003 con status='active', 30 plantas en fase "Vegetativo"
- **When** hace clic en "Cancelar batch", ingresa razon "Contaminacion por pythium confirmada en 100% de las plantas. No es viable continuar.", y confirma escribiendo el codigo del batch
- **Then** el batch status cambia a 'cancelled', se muestra badge "Cancelado" en el header, toast confirma "Batch cancelado: LOT-GELATO-003", y la razon se registra en el timeline

### Scenario 2: Actividades pendientes se cancelan
- **Given** LOT-GELATO-003 tiene 8 scheduled_activities con status='pending'
- **When** el manager cancela el batch
- **Then** las 8 scheduled_activities cambian a status='skipped' con nota "Batch cancelado"

### Scenario 3: Confirmacion con codigo del batch
- **Given** el manager esta en el Dialog de cancelacion de LOT-GELATO-003
- **When** ingresa la razon pero escribe "LOT-GELATO-001" en el campo de confirmacion (codigo incorrecto)
- **Then** el boton "Cancelar batch" permanece deshabilitado. Solo se habilita cuando escribe exactamente "LOT-GELATO-003"

### Scenario 4: Cancelacion es irreversible
- **Given** LOT-GELATO-003 tiene status='cancelled'
- **When** el manager ve el detalle del batch
- **Then** no aparece ninguna accion en el action bar (ni pausar, ni avanzar, ni resumir). El batch es de solo lectura con banner "Este batch fue cancelado el [fecha]. Razon: [razon]"

### Scenario 5: No se puede cancelar batch completado
- **Given** LOT-OLD-001 tiene status='completed'
- **When** el manager ve el detalle
- **Then** la accion "Cancelar" no aparece — solo batches con status 'active', 'phase_transition' u 'on_hold' se pueden cancelar

### Scenario 6: Cancelar batch en hold
- **Given** LOT-GELATO-002 esta en status='on_hold'
- **When** el manager decide cancelar (la situacion que causo el hold es irrecuperable)
- **Then** el batch cambia directamente de 'on_hold' a 'cancelled' sin pasar por 'active'

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Confirmacion con codigo del batch implementada
- [ ] Irreversibilidad garantizada (no hay accion de "des-cancelar")
- [ ] Scheduled activities canceladas atomicamente
- [ ] Impacto en production_order evaluado (si todos los batches cancelados, orden tambien se cancela)
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `cancelBatch(data)` en `src/lib/actions/batches.ts`
- **Zod Schema**: `cancelBatchSchema` en `src/lib/schemas/batch.ts`
  - batchId: UUID required
  - reason: string min(10) max(500)
  - confirmCode: string — must match batch.code exactamente
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction atomica**: Dentro de `db.transaction()`:
  1. SELECT batch FOR UPDATE, validate status IN ('active', 'phase_transition', 'on_hold')
  2. Validate confirmCode === batch.code
  3. UPDATE batches SET status='cancelled', updated_at=now()
  4. UPDATE scheduled_activities SET status='skipped' WHERE batch_id AND status IN ('pending', 'overdue')
  5. Evaluar production_order: si TODOS los batches de la orden estan cancelled o completed, actualizar orden status
- **Production order impact**: Si la orden solo tenia este batch y se cancela, la orden pasa a 'cancelled'. Si tenia multiples batches, la orden se mantiene hasta que todos se resuelvan
- **Revalidation**: `revalidatePath('/batches')` + `revalidatePath('/batches/[id]')` + `revalidatePath('/orders')`

## UI/UX Notes
- Boton "Cancelar batch" en el action bar con estilo secondary + clases de error (texto rojo, sin variant destructive)
- Dialog de cancelacion con warning prominente: "Esta accion es irreversible. El batch no podra reactivarse."
- Textarea para razon obligatoria
- Campo de confirmacion: "Escriba [BATCH_CODE] para confirmar" — input que debe coincidir exactamente
- Boton "Cancelar batch" deshabilitado hasta que razon tenga >= 10 chars Y confirmCode coincida
- Banner en batch detail cuando status='cancelled': fondo rojo suave, icono de alerta, fecha y razon

## Dependencies
- F-017 (detalle de batch con action bar)
- F-015 (lista de ordenes — status de orden puede cambiar)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-082-004: Cambiar zona de batch sin avance de fase

## User Story

**As a** supervisor,
**I want** mover un batch a otra zona sin cambiar su fase actual,
**So that** pueda reubicar batches por razones logisticas (mantenimiento de zona, optimizacion de espacio, problemas ambientales) sin alterar el estado productivo.

## Acceptance Criteria

### Scenario 1: Mover batch a otra zona
- **Given** LOT-GELATO-001 esta en "Sala Vegetativo A" en fase "Vegetativo"
- **When** el supervisor hace clic en "Cambiar zona", selecciona "Sala Vegetativo B" como destino
- **Then** el batch.zone_id se actualiza a Sala Vegetativo B, la fase permanece en "Vegetativo", toast confirma "Batch reubicado a Sala Vegetativo B", y el cambio se registra en el timeline

### Scenario 2: Validar capacidad de zona destino
- **Given** "Sala Vegetativo B" tiene capacidad para 100 plantas y actualmente tiene 90 plantas en batches activos
- **When** el supervisor intenta mover LOT-GELATO-001 (30 plantas) a esa zona
- **Then** el sistema muestra warning "La zona destino quedaria al 120% de capacidad (120/100 plantas). Desea continuar?" con opcion de confirmar o cancelar

### Scenario 3: No se puede mover a zona de la misma zona
- **Given** LOT-GELATO-001 esta en "Sala Vegetativo A"
- **When** el supervisor selecciona "Sala Vegetativo A" como destino
- **Then** el sistema muestra error "El batch ya esta en esta zona" y bloquea la accion

### Scenario 4: Mover batch en hold es permitido
- **Given** LOT-GELATO-001 esta en status='on_hold' en "Sala Vegetativo A"
- **When** el supervisor cambia la zona a "Cuarentena" (zona de proposito especial)
- **Then** el cambio se ejecuta correctamente — el hold no impide cambio de zona

### Scenario 5: Zonas inactivas no aparecen como destino
- **Given** la zona "Sala Temporal" tiene status='inactive'
- **When** el supervisor abre el selector de zona destino
- **Then** "Sala Temporal" no aparece como opcion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['supervisor', 'manager', 'admin'])
- [ ] Validacion de capacidad con warning (no bloqueo duro)
- [ ] Cambio registrado en timeline del batch
- [ ] Plant_positions actualizadas si aplica
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `changeBatchZone(data)` en `src/lib/actions/batches.ts`
- **Zod Schema**: `changeBatchZoneSchema` en `src/lib/schemas/batch.ts`
  - batchId: UUID required
  - destinationZoneId: UUID required, != current zone_id
  - forceOverCapacity: boolean optional (default false) — permite override del warning de capacidad
- **Auth**: `requireAuth(['supervisor', 'manager', 'admin'])`
- **Transaction**: Dentro de `db.transaction()`:
  1. SELECT batch FOR UPDATE, validate status NOT IN ('completed', 'cancelled')
  2. Validate destination zone exists, is active, is in same facility
  3. Check capacity: SELECT SUM(plant_count) FROM batches WHERE zone_id=destino AND status='active'
  4. Si over capacity AND NOT forceOverCapacity: return warning (no error)
  5. UPDATE batches SET zone_id=destinationZoneId
  6. Si existen plant_positions del batch en zona origen: UPDATE zone_id a nueva zona (o limpiar y reasignar)
- **Diferencia con avance de fase**: advancePhase tambien cambia zona cuando `requires_zone_change=true`, pero lo hace como parte del avance de fase. Esta accion cambia SOLO la zona, sin tocar current_phase_id
- **Revalidation**: `revalidatePath('/batches')` + `revalidatePath('/batches/[id]')` + `revalidatePath('/areas')`

## UI/UX Notes
- Boton "Cambiar zona" en el action bar del batch detail, icono map-pin (Lucide)
- Dialog con selector de zona: dropdown agrupado por facility con zonas activas
- La zona actual se muestra deshabilitada en el dropdown
- Warning de capacidad: banner amarillo dentro del Dialog con texto y botones "Continuar de todas formas" / "Cancelar"
- Si la facility solo tiene 1 zona activa: el boton "Cambiar zona" se oculta

## Dependencies
- F-017 (detalle de batch con action bar)
- F-041 (mapa de facility — refleja la nueva ubicacion)

## Estimation
- **Size**: S
- **Complexity**: Low
