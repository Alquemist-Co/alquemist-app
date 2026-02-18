# F-057: Dashboard Supervisor

## Overview

Dashboard orientado a supervision que proporciona vision global del estado de zonas, equipo y actividades. Incluye stats strip con batches activos, actividades hoy/completadas/vencidas, grid de zonas con health indicator y sparklines ambientales, panel de equipo con progreso de operadores, timeline de actividades por hora y quick actions. Permite al supervisor detectar desviaciones y tomar acciones correctivas rapidamente.

## User Personas

- **Supervisor**: Gestiona 2-5 zonas con 10-20 batches. Necesita visibilidad del estado global de su area y del avance de su equipo de operadores. Usa tablet y celular.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-057-001 | Header con titulo, stats de zonas y filtro por facility | S | P0 | Planned |
| US-057-002 | Stats strip de supervision | S | P0 | Planned |
| US-057-003 | Grid de zonas con health indicator y sparklines | L | P0 | Planned |
| US-057-004 | Panel de equipo con progreso de operadores | M | P1 | Planned |
| US-057-005 | Timeline de actividades por hora | M | P1 | Planned |
| US-057-006 | Quick actions del supervisor | S | P1 | Planned |

---

# US-057-001: Header con titulo, stats de zonas y filtro por facility

## User Story

**As a** supervisor,
**I want** ver el titulo "Supervision" con un resumen de zonas activas y total de batches, y poder filtrar por facility,
**So that** tenga contexto global inmediato de mi area de responsabilidad.

## Acceptance Criteria

### Scenario 1: Header con datos
- **Given** el supervisor tiene 4 zonas activas y 15 batches activos
- **When** accede al dashboard
- **Then** ve "Supervision" como titulo, "4 zonas activas - 15 batches" como subtitulo, y un dropdown de facility si la empresa tiene multiples

### Scenario 2: Filtrar por facility
- **Given** la empresa tiene 2 facilities y el supervisor cambia el dropdown
- **When** selecciona "Invernadero Sur"
- **Then** todos los datos del dashboard se actualizan para mostrar solo la informacion de esa facility

### Scenario 3: Empresa con una sola facility
- **Given** la empresa tiene solo 1 facility
- **When** el supervisor accede al dashboard
- **Then** el dropdown de facility no se muestra y los datos reflejan la unica facility disponible

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Queries: `COUNT(zones WHERE status='active')`, `COUNT(batches WHERE status='active')`
- Filtro de facility almacenado en Zustand store para persistir durante la sesion
- Pantalla: `dash-supervisor`

## UI/UX Notes
- Titulo DM Sans Bold 28px, subtitulo 14px text-secondary
- Dropdown: componente `Select` con search integrado si hay 5+ facilities

## Dependencies
- Requiere `zones`, `batches`, `facilities` con datos (Fases 0-1)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-057-002: Stats strip de supervision

## User Story

**As a** supervisor,
**I want** ver 4 indicadores clave: batches activos, actividades de hoy, completadas y vencidas,
**So that** identifique rapidamente si el dia va segun lo planificado o si hay retrasos.

## Acceptance Criteria

### Scenario 1: Stats con datos normales
- **Given** hay 12 batches activos, 24 actividades hoy, 18 completadas y 2 vencidas
- **When** el supervisor accede al dashboard
- **Then** ve 4 stat cards con colores semanticos: batches (brand), hoy (info), completadas (success), vencidas (error)

### Scenario 2: Tap en stat filtra contenido
- **Given** el supervisor toca la stat "Vencidas: 2"
- **When** la interfaz responde
- **Then** la seccion de actividades debajo se filtra para mostrar solo las vencidas y la stat card muestra estado seleccionado

### Scenario 3: Zero vencidas
- **Given** no hay actividades vencidas
- **When** el supervisor accede al dashboard
- **Then** la stat "Vencidas: 0" se muestra en verde en lugar de rojo, indicando buen estado

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Aggregations: `COUNT(batches WHERE status='active')`, `COUNT(scheduled_activities WHERE planned_date=today)`, filtrado por `completed` y `overdue`
- Componente `StatCard` reutilizable
- Pantalla: `dash-supervisor`

## UI/UX Notes
- 4 cards en fila, horizontal scroll en mobile
- Numero en DM Mono 24px Bold, label overline 11px
- Border-left 4px con color semantico

## Dependencies
- Requiere componente `StatCard` (Fase 0)
- Requiere datos de actividades y batches (Fases 1-3)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-057-003: Grid de zonas con health indicator y sparklines

## User Story

**As a** supervisor,
**I want** ver un grid con cards por cada zona asignada mostrando nombre, health indicator, conteo de batches, fase dominante y sparkline de condiciones ambientales,
**So that** detecte rapidamente zonas con problemas ambientales o de produccion.

## Acceptance Criteria

### Scenario 1: Grid con zonas saludables
- **Given** el supervisor tiene 4 zonas y todas estan dentro de rangos optimos
- **When** accede al dashboard
- **Then** ve 4 zone cards con indicador verde, nombre, conteo de batches, fase dominante y sparkline de temperatura/humedad de las ultimas 12h

### Scenario 2: Zona con alerta ambiental
- **Given** la zona "Sala Floracion A" tiene una alerta de temperatura fuera de rango
- **When** el supervisor ve el grid
- **Then** esa zone card muestra indicador rojo, el sparkline de temperatura resalta el punto fuera de rango, y un badge "1 alerta" visible

### Scenario 3: Tap en zona navega a detalle
- **Given** el supervisor ve una zone card
- **When** la toca
- **Then** navega a `area-zone-detail` con datos completos de clima, batches y estructuras

### Scenario 4: Zona sin sensores
- **Given** una zona no tiene sensores configurados
- **When** el supervisor ve el grid
- **Then** la zone card muestra el health indicator en gris con label "Sin sensores" en lugar de sparklines

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `zones JOIN batches (count, phase) JOIN environmental_readings (ultimas 12h) JOIN alerts (count activas)`
- Health indicator: verde si 0 alertas activas, amarillo si alertas warning, rojo si alertas critical
- Sparkline: componente SVG lightweight con datos de `environmental_readings` ultimas 12h, parametros temp y HR
- Recharts `Sparkline` o SVG custom para minimo bundle size
- Pantalla: `dash-supervisor`

## UI/UX Notes
- Grid 2 columnas en mobile, 3-4 en desktop
- Zone card: Card component con padding 16px, border-radius 16px
- Health indicator: circulo 12px en esquina superior derecha
- Sparkline: height 40px, stroke 1.5px brand color, sin ejes ni labels
- Fase dominante como badge coloreado

## Dependencies
- Requiere modulo de Areas (Fase 3)
- Requiere monitoreo ambiental con sensores (Fase 3)
- Requiere sistema de alertas (Fase 3)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-057-004: Panel de equipo con progreso de operadores

## User Story

**As a** supervisor,
**I want** ver una lista de mis operadores asignados con su progreso de tareas del dia,
**So that** identifique operadores sobrecargados, atrasados o que necesiten apoyo.

## Acceptance Criteria

### Scenario 1: Panel con operadores activos
- **Given** el supervisor tiene 5 operadores en sus zonas
- **When** accede al dashboard
- **Then** ve una lista con cada operador: avatar/iniciales, nombre, barra de progreso (ej: "2/6 completadas") y status indicator (activo si ultima actividad < 2h)

### Scenario 2: Tap en operador muestra sus actividades
- **Given** el supervisor ve al operador "Juan Perez" con 2/6 completadas
- **When** toca su fila
- **Then** ve una expansion o navegacion a las actividades del dia de ese operador con detalle de cuales estan pendientes, completadas y vencidas

### Scenario 3: Operador sin actividades
- **Given** un operador no tiene actividades programadas para hoy
- **When** el supervisor ve el panel
- **Then** ese operador muestra "Sin actividades hoy" en text-secondary y la barra de progreso esta vacia

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `users WHERE role='operator' AND assigned_facility_id IN (supervisor facilities)` + `scheduled_activities WHERE assigned_to=operator AND planned_date=today GROUP BY status`
- Status "activo": `users.last_login_at > NOW() - 2h` o ultima actividad completada < 2h
- Pantalla: `dash-supervisor`

## UI/UX Notes
- Lista con height 64px por operador
- Avatar: circulo 40px con iniciales si no hay foto
- Barra de progreso: 6px height, brand color fill
- Texto "2/6" en DM Mono 14px al lado de la barra

## Dependencies
- Requiere tabla `users` con operadores asignados a facilities
- Requiere `scheduled_activities` con datos (Fase 1)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-057-005: Timeline de actividades por hora

## User Story

**As a** supervisor,
**I want** ver una timeline cronologica horizontal con las actividades del dia distribuidas por hora,
**So that** detecte vacios y sobrecargas en la programacion del equipo.

## Acceptance Criteria

### Scenario 1: Timeline con actividades distribuidas
- **Given** hay 24 actividades programadas entre 6:00 y 18:00
- **When** el supervisor accede al dashboard
- **Then** ve un eje horizontal con horas del dia y bloques coloreados por estado (pendiente, completada, vencida) posicionados en su hora planificada

### Scenario 2: Detectar hora sobrecargada
- **Given** hay 8 actividades programadas entre 10:00 y 11:00
- **When** el supervisor revisa la timeline
- **Then** el slot de 10:00-11:00 muestra un indicador visual de sobrecarga (stack de bloques o badge con conteo) diferenciado del resto

### Scenario 3: Timeline con actividades completadas y pendientes
- **Given** son las 14:00 y hay actividades completadas por la manana y pendientes por la tarde
- **When** el supervisor ve la timeline
- **Then** las actividades pasadas completadas se muestran en verde muted, las pendientes futuras en brand color, y las vencidas (pasadas sin completar) en rojo

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `scheduled_activities WHERE planned_date=today GROUP BY HOUR(planned_date)`
- Componente `Timeline` horizontal con scroll
- Pantalla: `dash-supervisor`

## UI/UX Notes
- Timeline: horizontal scroll, height 120px
- Cada hora: slot de ancho fijo con bloques apilados si multiples
- Colores: completada=success muted, pendiente=brand, vencida=error
- Hora actual marcada con linea vertical pulsante
- Scroll automatico para centrar la hora actual

## Dependencies
- Requiere `scheduled_activities` con datos (Fase 1)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-057-006: Quick actions del supervisor

## User Story

**As a** supervisor,
**I want** tener acceso rapido a las acciones mas frecuentes: reprogramar actividad, crear observacion y split batch,
**So that** pueda tomar acciones correctivas sin navegar por multiples pantallas.

## Acceptance Criteria

### Scenario 1: Quick actions visibles
- **Given** el supervisor accede al dashboard
- **When** scrollea a la seccion de quick actions
- **Then** ve una fila horizontal de 3 botones: "Reprogramar actividad", "Crear observacion" y "Split batch"

### Scenario 2: Reprogramar actividad
- **Given** el supervisor toca "Reprogramar actividad"
- **When** se abre el flujo
- **Then** ve un selector de actividad pendiente seguido de un date picker para asignar nueva fecha

### Scenario 3: Quick action no disponible por permisos
- **Given** un supervisor con permisos limitados que no puede hacer split de batch
- **When** accede al dashboard
- **Then** el boton "Split batch" no aparece en la fila de quick actions

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Cada quick action abre un bottom sheet o navega a la pantalla correspondiente
- Reprogramar: Server Action `rescheduleActivity(id, newDate)`
- Permisos: verificar `user.permissions` para determinar acciones visibles
- Pantalla: `dash-supervisor`

## UI/UX Notes
- Botones secundarios en fila horizontal, icono + label
- Scroll horizontal si no caben en pantalla
- Iconos Lucide: Calendar (reprogramar), Eye (observacion), GitBranch (split)

## Dependencies
- Requiere Server Actions de actividades y batches (Fases 1-2)

## Estimation
- **Size**: S
- **Complexity**: Low
