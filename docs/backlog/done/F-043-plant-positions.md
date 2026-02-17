# F-043: Posiciones de Planta (Grid Visual)

## Overview

Pantalla que muestra una representacion tipo grid de las posiciones individuales de planta dentro de una zona. Cada celda corresponde a una posicion fisica y se colorea segun su estado (vacia, plantada, cosechada, mantenimiento). Incluye estadisticas de ocupacion. Solo aplica a zonas que requieren trazabilidad por planta individual (regulacion cannabis medicinal, investigacion).

## User Personas

- **Supervisor**: Visualiza ocupacion de posiciones, identifica espacios disponibles, asigna batches a posiciones.
- **Gerente**: Evalua uso del espacio, planifica rotaciones.
- **Admin**: Configura posiciones y estructuras.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-043-001 | Grid visual de posiciones coloreadas por estado | M | P0 | Planned |
| US-043-002 | Stats de ocupacion de posiciones | S | P1 | Planned |
| US-043-003 | Detalle de posicion individual | S | P2 | Planned |

---

# US-043-001: Grid visual de posiciones coloreadas por estado

## User Story

**As a** supervisor,
**I want** ver un grid visual donde cada celda represente una posicion de planta coloreada por su estado,
**So that** pueda identificar de un vistazo cuantas posiciones estan ocupadas, vacias o en mantenimiento en la zona.

## Acceptance Criteria

### Scenario 1: Grid con posiciones en distintos estados
- **Given** la zona "Sala Floracion A" tiene 120 posiciones: 90 plantadas, 20 vacias, 5 cosechadas, 5 en mantenimiento
- **When** se renderiza la pantalla area-positions
- **Then** se muestra un grid de 120 celdas coloreadas: verde=plantada, gris=vacia, naranja=cosechada, rojo=mantenimiento
- **And** las celdas plantadas muestran el codigo del batch en texto pequeno
- **And** el grid respeta la distribucion por estructura/nivel si existen zone_structures

### Scenario 2: Tap en posicion plantada muestra info del batch
- **Given** la posicion A1-L2-P05 tiene status 'planted' y current_batch_id = LOT-001
- **When** el usuario hace tap en la celda
- **Then** se muestra un tooltip o bottom sheet con: label de posicion, batch code, cultivar, fase actual, dias en posicion
- **And** un boton "Ver batch" navega a batch-detail

### Scenario 3: Zona sin posiciones configuradas
- **Given** la zona es open_field y no tiene plant_positions registradas
- **When** el usuario navega a area-positions
- **Then** se muestra empty state "Esta zona no tiene posiciones individuales configuradas"
- **And** para admin se muestra CTA "Configurar posiciones"
- **And** se explica que zonas de campo abierto operan a nivel de batch, no de posicion

### Scenario 4: Grid con estructuras multinivel
- **Given** la zona tiene 3 racks con 4 niveles cada uno y 10 posiciones por nivel
- **When** se renderiza el grid
- **Then** se agrupan las posiciones por estructura y nivel
- **And** se muestra un selector de nivel o tabs por estructura
- **And** el label de cada posicion indica estructura-nivel-posicion (ej: "R1-L3-P07")

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Performance: renderizado < 500ms con 500 posiciones
- [ ] Accesibilidad: cada celda tiene aria-label con estado y batch
- [ ] Responsive: scroll horizontal en mobile si el grid es ancho

## Technical Notes
- Pantalla: `area-positions`
- Query: `SELECT pp.*, b.code as batch_code, c.name as cultivar_name FROM plant_positions pp LEFT JOIN batches b ON pp.current_batch_id = b.id LEFT JOIN cultivars c ON b.cultivar_id = c.id WHERE pp.zone_id = :zoneId ORDER BY pp.structure_id, pp.level_number, pp.position_index`
- RLS Tipo B (via zone -> facility -> company)
- Componente: `PositionGrid` con `PositionCell`
- Virtual scrolling si > 200 posiciones visibles (react-window o similar)

## UI/UX Notes
- Celdas cuadradas de 32x32px (mobile) o 40x40px (desktop)
- Colores: empty=#D4DDD6, planted=#059669, harvested=#D97706, maintenance=#DC2626
- Border-radius: 4px por celda
- Gap: 2px entre celdas
- Texto de batch code: DM Mono 8px, truncado con ellipsis si no cabe
- Agrupacion por estructura con header de nombre

## Dependencies
- F-042 (navegacion desde detalle de zona)
- Fase 0: schema DB (plant_positions, zone_structures)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-043-002: Stats de ocupacion de posiciones

## User Story

**As a** gerente,
**I want** ver un resumen de estadisticas de ocupacion de las posiciones de la zona,
**So that** pueda evaluar rapidamente el uso del espacio sin contar posiciones manualmente.

## Acceptance Criteria

### Scenario 1: Stats completas con porcentajes
- **Given** la zona tiene 120 posiciones: 90 plantadas, 20 vacias, 5 cosechadas, 5 en mantenimiento
- **When** se renderizan las stats
- **Then** se muestran stat cards: "Total: 120", "Ocupadas: 90 (75%)", "Vacias: 20 (16.7%)", "Mantenimiento: 5 (4.2%)"
- **And** una progress bar muestra la ocupacion global (75%)

### Scenario 2: Todas las posiciones vacias
- **Given** la zona tiene 120 posiciones todas con status 'empty'
- **When** se renderizan las stats
- **Then** "Ocupadas: 0 (0%)", "Vacias: 120 (100%)"
- **And** la progress bar esta en 0% con color gris

### Scenario 3: Ocupacion completa
- **Given** la zona tiene 120 posiciones todas con status 'planted'
- **When** se renderizan las stats
- **Then** "Ocupadas: 120 (100%)"
- **And** la progress bar esta al 100% con color success

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Pantalla: `area-positions`
- Query: `SELECT status, COUNT(*) FROM plant_positions WHERE zone_id = :zoneId GROUP BY status`
- Reutiliza componente StatCard

## UI/UX Notes
- Strip horizontal de stat cards sobre el grid
- Progress bar debajo de los stats
- Numeros en DM Mono Bold, labels en DM Sans 11px overline

## Dependencies
- US-043-001 (grid de posiciones)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-043-003: Detalle de posicion individual

## User Story

**As a** supervisor,
**I want** ver el detalle completo de una posicion de planta al hacer tap en ella,
**So that** pueda consultar que batch la ocupa, desde cuando, y realizar acciones como marcarla en mantenimiento.

## Acceptance Criteria

### Scenario 1: Posicion plantada con batch
- **Given** la posicion A1-L2-P05 tiene status 'planted', current_batch_id = LOT-001
- **When** el usuario hace tap en la celda
- **Then** se abre un bottom sheet (mobile) o panel lateral (desktop) con: label, estructura, nivel, estado, batch code, cultivar, fase, fecha de asignacion
- **And** boton "Ver batch" navega a batch-detail
- **And** boton "Marcar mantenimiento" cambia el status (solo supervisor+)

### Scenario 2: Posicion vacia
- **Given** la posicion tiene status 'empty' y current_batch_id = null
- **When** el usuario hace tap
- **Then** se muestra: label, estructura, nivel, estado "Vacia"
- **And** se muestra la fecha desde que esta vacia (ultima modificacion)

### Scenario 3: Marcar posicion en mantenimiento
- **Given** el supervisor selecciona una posicion plantada
- **When** hace tap en "Marcar mantenimiento"
- **Then** se muestra confirmacion "Marcar posicion A1-L2-P05 como mantenimiento. El batch LOT-001 no se vera afectado."
- **And** al confirmar, el status cambia a 'maintenance' y la celda se actualiza en el grid

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: bottom sheet con focus trap

## Technical Notes
- Pantalla: `area-positions` (bottom sheet / panel)
- Server Action: `updatePositionStatus(positionId, newStatus)` — solo supervisor, manager, admin
- Zod validation: `z.object({ position_id: z.string().uuid(), status: z.enum(['empty', 'planted', 'harvested', 'maintenance']) })`

## UI/UX Notes
- Mobile: bottom sheet deslizable, Desktop: panel lateral derecho
- Max-width: 360px
- Datos en formato label-value pairs

## Dependencies
- US-043-001 (grid de posiciones)

## Estimation
- **Size**: S
- **Complexity**: Low
