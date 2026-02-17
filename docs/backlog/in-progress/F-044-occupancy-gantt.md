# F-044: Ocupacion Planificada (Timeline Gantt)

## Overview

Pantalla tipo Gantt que muestra la ocupacion temporal de zonas por batches. Cada barra representa un batch en una zona con su duracion planificada por fase. Permite detectar solapamientos, planificar rotaciones y proyectar disponibilidad de zonas en las proximas 4-8 semanas basandose en ordenes activas.

## User Personas

- **Supervisor**: Detecta conflictos de espacio entre batches, planifica movimientos de zona.
- **Gerente**: Planifica rotaciones, decide cuando iniciar nuevas ordenes segun disponibilidad de zonas.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-044-001 | Timeline Gantt de ocupacion por zona | L | P0 | Planned |
| US-044-002 | Proyeccion de disponibilidad futura | M | P1 | Planned |
| US-044-003 | Interaccion con barras del Gantt | S | P2 | Planned |

---

# US-044-001: Timeline Gantt de ocupacion por zona

## User Story

**As a** gerente,
**I want** ver un diagrama Gantt que muestre los batches en cada zona con sus duraciones planificadas,
**So that** pueda detectar solapamientos de espacio y planificar la rotacion de cultivos.

## Acceptance Criteria

### Scenario 1: Gantt con multiples zonas y batches
- **Given** la facility tiene 6 zonas y 8 batches activos distribuidos en 4 zonas
- **When** se renderiza la pantalla area-occupancy
- **Then** se muestra un Gantt con: eje Y = zonas (filas), eje X = tiempo (semanas)
- **And** cada batch se muestra como barra horizontal con color por fase actual
- **And** la barra muestra el codigo del batch, cultivar, y fecha inicio-fin
- **And** las zonas sin batches muestran fila vacia (disponible)

### Scenario 2: Solapamiento de batches en zona
- **Given** dos batches estan planificados para la misma zona en periodos solapados
- **When** se renderiza el Gantt
- **Then** las barras solapadas se apilan verticalmente dentro de la fila de la zona
- **And** se muestra un indicador de warning "Solapamiento" en la zona afectada

### Scenario 3: Navegacion temporal
- **Given** el Gantt muestra las proximas 8 semanas
- **When** el usuario hace scroll horizontal o usa controles de navegacion
- **Then** puede ver periodos pasados (ultimas 4 semanas) y futuros (hasta 12 semanas)
- **And** la semana actual se resalta con linea vertical roja (hoy)

### Scenario 4: Facility sin batches activos
- **Given** la facility no tiene batches activos ni ordenes planificadas
- **When** se renderiza el Gantt
- **Then** se muestra el grid temporal con todas las zonas vacias
- **And** un empty state overlay indica "No hay ocupacion planificada — crea una orden para comenzar"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Performance: renderizado < 1s con 20 zonas y 50 batches
- [ ] Responsive: scroll horizontal funcional en mobile
- [ ] Accesibilidad: tabla accesible alternativa para screen readers

## Technical Notes
- Pantalla: `area-occupancy`
- Query principal:
  ```sql
  SELECT b.id, b.code, b.zone_id, b.start_date, b.expected_end_date, b.status,
         c.name as cultivar_name, pp.name as phase_name, pp.color
  FROM batches b
  JOIN cultivars c ON b.cultivar_id = c.id
  JOIN production_phases pp ON b.current_phase_id = pp.id
  WHERE b.zone_id IN (SELECT id FROM zones WHERE facility_id = :facilityId)
  AND b.status IN ('active', 'phase_transition')
  ```
- Tambien incluir datos de production_order_phases para duracion planificada por fase
- Componente Gantt custom con SVG o libreria ligera (no Recharts, que es para charts de datos)
- Zustand store para controlar rango temporal visible

## UI/UX Notes
- Filas de 48px height por zona
- Barras con border-radius: 8px, padding: 4px 8px
- Color de barra por fase del batch (mismos colores que phase badges)
- Linea vertical roja punteada para "hoy"
- Headers de semana en DM Mono 11px
- Nombres de zona en DM Sans Bold 14px, sticky left
- Mobile: zoom pinch-to-zoom, scroll horizontal natural

## Dependencies
- F-041 (selector de facility)
- Fase 1: F-016/F-017 (batches con datos de zona y fechas)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-044-002: Proyeccion de disponibilidad futura

## User Story

**As a** gerente,
**I want** ver una proyeccion de que zonas estaran disponibles en las proximas 4-8 semanas,
**So that** pueda decidir cuando iniciar nuevas ordenes de produccion basandome en la disponibilidad real de espacio.

## Acceptance Criteria

### Scenario 1: Proyeccion basada en ordenes activas
- **Given** hay 3 ordenes activas con fechas de finalizacion planificadas en las proximas 6 semanas
- **When** se muestra la seccion de proyeccion
- **Then** se listan las zonas con su fecha estimada de liberacion
- **And** se indica la capacidad que se liberara (plantas)
- **And** se ordena cronologicamente: primero las que se liberan antes

### Scenario 2: Sin ordenes proximas a finalizar
- **Given** todos los batches activos tienen expected_end_date > 8 semanas
- **When** se muestra la proyeccion
- **Then** se indica "No se proyectan liberaciones en las proximas 8 semanas"
- **And** se muestran las zonas actualmente disponibles (sin batches)

### Scenario 3: Zona con multiples batches que finalizan en distintas fechas
- **Given** la zona tiene 2 batches: uno termina en 2 semanas y otro en 5 semanas
- **When** se muestra la proyeccion
- **Then** se indica liberacion parcial en 2 semanas (capacidad del primer batch)
- **And** liberacion total en 5 semanas

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Pantalla: `area-occupancy`
- Calculo: para cada zona, proyectar fecha de fin del ultimo batch activo basado en expected_end_date o calculado desde fases restantes * duracion default
- Si no hay expected_end_date: estimar desde `SUM(remaining_phases.default_duration_days)`

## UI/UX Notes
- Seccion debajo del Gantt con cards por zona
- Card: nombre zona, fecha liberacion estimada, capacidad liberada, badge de confianza (alta si tiene fechas reales, baja si es estimacion)
- Timeline visual simplificado: linea con puntos en fechas de liberacion

## Dependencies
- US-044-001 (Gantt como base)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-044-003: Interaccion con barras del Gantt

## User Story

**As a** supervisor,
**I want** poder hacer tap en una barra del Gantt para ver detalles del batch y navegar a su detalle,
**So that** pueda investigar rapidamente batches que ocupan una zona sin salir del contexto del timeline.

## Acceptance Criteria

### Scenario 1: Tap en barra muestra resumen
- **Given** el Gantt muestra el batch LOT-001 en Sala Floracion A
- **When** el usuario hace tap en la barra de LOT-001
- **Then** se muestra un tooltip (desktop) o bottom sheet (mobile) con: codigo, cultivar, fase, plant_count, dias restantes estimados, zona
- **And** boton "Ver detalle" navega a batch-detail

### Scenario 2: Hover muestra preview rapido (desktop)
- **Given** el usuario esta en desktop
- **When** hace hover sobre una barra del Gantt
- **Then** se muestra tooltip con: codigo, cultivar, fecha inicio-fin, fase actual
- **And** el tooltip desaparece al mover el mouse fuera

### Scenario 3: Barra de batch completado
- **Given** un batch con status 'completed' aparece en el rango temporal visible
- **When** el usuario hace tap en su barra
- **Then** se muestra la misma info pero con badge "Completado"
- **And** la barra se renderiza con opacidad reducida y patron rayado

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Componente: `GanttBar` con `onClick` y `onHover` handlers
- Tooltip component reutilizable de `components/ui/`
- Navegacion via Next.js router.push

## UI/UX Notes
- Tooltip: max-width 280px, border-radius 12px, shadow sutil
- Mobile: bottom sheet con mas espacio
- Datos en formato compacto: DM Mono para numeros, DM Sans para labels

## Dependencies
- US-044-001 (Gantt base)

## Estimation
- **Size**: S
- **Complexity**: Low
