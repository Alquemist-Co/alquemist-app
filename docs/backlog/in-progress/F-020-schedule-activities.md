# F-020: Programar Actividades desde Schedule

## Overview

Automatiza la generacion de actividades programadas (scheduled_activities) a partir de los cultivation_schedules cuando se crea un batch o se avanza de fase. Tambien permite reprogramar y cancelar actividades individuales. La asignacion automatica de operador se basa en la zona del batch. Este feature es el puente entre la planificacion (templates + schedules) y la ejecucion diaria del operador.

## User Personas

- **Supervisor**: Reprograma actividades, cancela las innecesarias, revisa la carga de trabajo del equipo.
- **Gerente**: Configura cultivation_schedules y revisa la programacion global.
- **Admin**: Acceso completo.
- **Operador**: Consumidor final de las actividades programadas (las ve en su dashboard y act-today).

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-020-001 | Generar actividades al crear batch o avanzar fase | L | P0 | Planned |
| US-020-002 | Reprogramar actividad individual (cambiar fecha) | S | P0 | Planned |
| US-020-003 | Cancelar actividad programada con razon | S | P1 | Planned |
| US-020-004 | Asignacion automatica de operador por zona | M | P1 | Planned |

---

# US-020-001: Generar actividades al crear batch o avanzar fase

## User Story

**As a** supervisor,
**I want** que el sistema genere automaticamente las actividades programadas de la nueva fase cuando un batch se crea (al aprobar orden) o avanza de fase, basandose en el cultivation_schedule del cultivar,
**So that** el equipo de operaciones tenga su agenda lista sin necesidad de programar manualmente cada actividad.

## Acceptance Criteria

### Scenario 1: Generar actividades al aprobar orden y crear batch
- **Given** el cultivar Gelato tiene un cultivation_schedule con 3 templates para la fase Germinacion: Riego diario (daily), Inspeccion (daily), Medicion temp sustrato (weekly)
- **When** se aprueba la orden y se crea el batch con fase inicial=Germinacion
- **Then** el sistema genera scheduled_activities: 7 de Riego (1 por dia), 7 de Inspeccion (1 por dia), 1 de Medicion temp (1 por semana), cada una con planned_date calculada desde batch.start_date + schedule.start_day, status='pending'

### Scenario 2: Generar actividades al avanzar de fase
- **Given** el batch LOT-001 avanza de Vegetativo a Floracion, y el schedule tiene 2 templates para Floracion
- **When** se ejecuta advancePhase
- **Then** se llama generateScheduledActivities(batchId, newPhaseId) que genera las actividades de Floracion con planned_dates calculadas desde la fecha de inicio de la nueva fase

### Scenario 3: Cultivar sin cultivation_schedule
- **Given** el cultivar no tiene cultivation_schedule activo
- **When** se crea el batch o se avanza de fase
- **Then** no se generan actividades automaticas. La fase opera con actividades ad-hoc manuales solamente. No se muestra error.

### Scenario 4: Actividades recurrentes (daily) generan multiples registros
- **Given** un template con frecuencia=daily y la fase dura 28 dias
- **When** se generan actividades
- **Then** se crean 28 scheduled_activities (una por dia) con planned_dates consecutivas

### Scenario 5: Snapshot del template al programar
- **Given** se generan scheduled_activities a partir de un template
- **When** las actividades se crean
- **Then** cada scheduled_activity guarda un template_snapshot JSONB con los recursos, checklist y metadata vigentes al momento de programar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para generacion con diferentes frecuencias
- [ ] Snapshot de template verificado
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `generateScheduledActivities(batchId, phaseId)` en `lib/actions/activity.actions.ts`
  - Lee cultivation_schedule del cultivar del batch
  - Para cada template en phase_config de la fase actual: genera N scheduled_activities segun frecuencia
  - planned_date = batch.phase_start_date + schedule.start_day (para cada recurrencia)
  - template_snapshot = JSON del template actual (recursos, checklist, metadata)
  - assigned_to = operador de la zona (ver US-020-004)
- **Tablas**: cultivation_schedules, scheduled_activities, activity_template_phases
- Se llama desde `approveOrder` (F-014) y desde `advancePhase` (F-018)
- **Frecuencias**: daily (1 por dia), weekly (1 por semana), biweekly (1 cada 2 semanas), once (1 sola vez), on_demand (no genera automatico)

## UI/UX Notes
- Las actividades generadas aparecen automaticamente en act-today del operador asignado
- No hay pantalla dedicada para esta accion; es un side-effect de aprobar orden y avanzar fase
- Toast informativo: "X actividades programadas para fase Floracion"

## Dependencies
- F-014 (approveOrder), F-018 (advancePhase), F-019 (templates existentes)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-020-002: Reprogramar actividad individual (cambiar fecha)

## User Story

**As a** supervisor,
**I want** reprogramar una actividad individual cambiando su fecha planificada,
**So that** pueda ajustar la agenda del equipo cuando surgen imprevistos como clima adverso, falta de insumos o cambios de prioridad.

## Acceptance Criteria

### Scenario 1: Reprogramar actividad a fecha futura
- **Given** existe una scheduled_activity para manana con status='pending'
- **When** el supervisor cambia la fecha a pasado manana
- **Then** el sistema actualiza planned_date, registra log de reprogramacion, y la actividad aparece en la nueva fecha en act-today

### Scenario 2: Reprogramar actividad a fecha pasada
- **Given** el supervisor intenta mover una actividad a una fecha ya pasada
- **When** selecciona una fecha anterior a hoy
- **Then** el sistema muestra error "No se puede reprogramar a una fecha pasada"

### Scenario 3: Reprogramar actividad ya completada
- **Given** la actividad tiene status='completed'
- **When** el supervisor intenta reprogramar
- **Then** el sistema muestra error "No se puede reprogramar una actividad ya completada"

### Scenario 4: Actividad reprogramada a hoy pasa a visible inmediatamente
- **Given** el operador tiene su lista de actividades de hoy abierta
- **When** el supervisor reprograma una actividad de manana a hoy
- **Then** la actividad aparece en la lista del operador sin necesidad de refresh manual (via invalidacion de cache TanStack Query)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `rescheduleActivity(scheduledActivityId, newDate)` en `lib/actions/activity.actions.ts`
  - Validar status IN ('pending', 'overdue')
  - UPDATE planned_date
  - Si new_date < today: marcar como 'overdue'
  - Registrar log de reprogramacion (nota en metadata o campo adicional)
- Cache invalidation via revalidatePath o TanStack Query invalidation

## UI/UX Notes
- Selector de fecha en modal al hacer clic "Reprogramar" en la card de actividad
- Desktop: drag-and-drop en calendario (act-calendar) para cambiar fecha
- Toast: "Actividad reprogramada al {fecha}"

## Dependencies
- US-020-001

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-020-003: Cancelar actividad programada con razon

## User Story

**As a** supervisor,
**I want** cancelar una actividad programada proporcionando una razon obligatoria,
**So that** quede registro de por que se cancelo y el operador no la vea en su lista de pendientes.

## Acceptance Criteria

### Scenario 1: Cancelar actividad con razon
- **Given** existe una scheduled_activity en status='pending'
- **When** el supervisor cancela con razon "Batch movido a otra zona, actividad ya no aplica"
- **Then** el sistema actualiza status='cancelled', guarda la razon, y la actividad desaparece de la lista de pendientes del operador

### Scenario 2: Cancelar sin razon
- **Given** el supervisor intenta cancelar una actividad
- **When** confirma sin escribir razon
- **Then** el boton "Confirmar" permanece deshabilitado y se muestra "La razon es obligatoria"

### Scenario 3: Cancelar actividad ya completada
- **Given** la actividad tiene status='completed'
- **When** el supervisor intenta cancelar
- **Then** el sistema muestra error "No se puede cancelar una actividad ya completada"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `cancelScheduledActivity(id, reason)` — UPDATE status='cancelled', registrar razon
- No genera transacciones de inventario
- **Tablas**: scheduled_activities

## UI/UX Notes
- Boton "Cancelar" en la card de actividad o en acciones contextuales
- Modal con textarea para razon (min 5 caracteres)
- Toast: "Actividad cancelada"

## Dependencies
- US-020-001

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-020-004: Asignacion automatica de operador por zona

## User Story

**As a** supervisor,
**I want** que las actividades se asignen automaticamente al operador responsable de la zona del batch, o por round-robin si hay multiples operadores,
**So that** cada operador vea en su dashboard solo las actividades que le corresponden sin necesidad de asignacion manual.

## Acceptance Criteria

### Scenario 1: Asignacion al unico operador de la zona
- **Given** la zona "Sala Floracion A" tiene 1 operador asignado: Carlos
- **When** se generan scheduled_activities para un batch en esa zona
- **Then** todas las actividades se asignan a Carlos (assigned_to = Carlos.id)

### Scenario 2: Round-robin con multiples operadores
- **Given** la zona tiene 3 operadores: Carlos, Maria, Juan
- **When** se generan 9 actividades
- **Then** se distribuyen equitativamente: Carlos(3), Maria(3), Juan(3) por round-robin

### Scenario 3: Zona sin operador asignado
- **Given** la zona no tiene ningun operador asignado
- **When** se generan actividades
- **Then** las actividades se crean con assigned_to=NULL y se muestra warning al supervisor "X actividades sin operador asignado en zona {nombre}. Asigna operadores a esta zona."

### Scenario 4: Operador desactivado tiene actividades asignadas
- **Given** Carlos tiene 5 actividades pendientes y se desactiva su cuenta
- **When** se detecta la desactivacion
- **Then** las actividades pendientes de Carlos se quedan sin asignar (assigned_to=NULL) y el supervisor recibe notificacion para reasignarlas

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para logica de asignacion
- [ ] Round-robin verificado con multiples operadores
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Asignacion: query users WHERE role='operator' AND assigned_facility_id includes la facility de la zona AND is_active=true
- Round-robin: para N actividades y M operadores, actividad[i].assigned_to = operadores[i % M]
- Si no hay operadores: assigned_to = NULL, generar warning
- Se ejecuta dentro de `generateScheduledActivities`

## UI/UX Notes
- No hay pantalla dedicada; la asignacion es automatica
- El supervisor puede reasignar manualmente desde act-calendar o desde la card de actividad
- Warning visible en dashboard supervisor si hay actividades sin asignar

## Dependencies
- US-020-001
- Usuarios con rol operador configurados (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium
