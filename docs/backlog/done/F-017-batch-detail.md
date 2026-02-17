# F-017: Detalle de Batch con Tabs

## Overview

El detalle de batch es la pantalla mas rica en informacion del sistema. Muestra un header hero con los datos principales del lote, un phase stepper visual que indica el progreso por fases, y 5 tabs de contenido (Timeline, Actividades, Inventario, Costos, Calidad) con lazy loading independiente. Es la pantalla central donde convergen todos los dominios del sistema.

## User Personas

- **Operador**: Consulta el contexto de sus batches: fase actual, actividades pendientes, timeline.
- **Supervisor**: Principal usuario. Revisa el estado integral del batch para tomar decisiones operativas.
- **Gerente**: Analiza costos, yields y calidad del batch.
- **Admin**: Acceso completo.
- **Viewer**: Consulta en modo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-017-001 | Header hero con datos principales del batch | M | P0 | Planned |
| US-017-002 | Phase stepper visual interactivo | M | P0 | Planned |
| US-017-003 | Tab Timeline con cronologia de eventos | L | P0 | Planned |
| US-017-004 | Tab Actividades con lista pendientes/completadas | M | P1 | Planned |
| US-017-005 | Tab Inventario con transacciones del batch | M | P1 | Planned |
| US-017-006 | Tabs Costos y Calidad (vistas basicas) | M | P2 | Planned |

---

# US-017-001: Header hero con datos principales del batch

## User Story

**As a** supervisor,
**I want** ver un header prominente con el codigo del batch, cultivar, zona actual, cantidad de plantas, status y fase actual,
**So that** tenga el contexto completo del lote visible en todo momento al analizar sus tabs de contenido.

## Acceptance Criteria

### Scenario 1: Header muestra todos los datos principales
- **Given** el usuario navega al detalle del batch LOT-001
- **When** se renderiza la pantalla batch-detail
- **Then** el header muestra: codigo "LOT-001" en DM Mono Bold 24px, cultivar "Gelato #41", zona "Sala Floracion A", plant_count "42 plantas", status badge "Activo" en verde, fase actual "Floracion" como badge con color de fase

### Scenario 2: Quick actions visibles segun rol y estado
- **Given** el supervisor ve el detalle de un batch activo
- **When** se renderiza el bottom bar de acciones
- **Then** se muestran botones contextuales: "Avanzar fase", "Registrar observacion", "Split batch", "Crear test de calidad" — solo visibles para roles con permiso

### Scenario 3: Batch completado muestra header diferente
- **Given** el batch tiene status='completed'
- **When** se renderiza el header
- **Then** el status badge muestra "Completado" en gris, los quick actions de avanzar fase y split no estan disponibles, y el header tiene un estilo muted

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Header responsive: compacto en mobile, expandido en desktop
- [ ] Quick actions condicionadas por rol
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Query**: batches JOIN cultivars, zones, production_phases (current)
- **Pantalla**: batch-detail
- Quick actions: verificar rol del usuario via middleware claims

## UI/UX Notes
- Codigo grande en DM Mono Bold 24px, fondo con gradiente sutil del color de fase
- Datos secundarios en fila: cultivar | zona | plantas | dias
- Status badge prominente
- Bottom bar fija con acciones contextuales (scroll no la oculta)

## Dependencies
- F-016 (lista de batches para navegar al detalle)
- F-014 (batch creado)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-017-002: Phase stepper visual interactivo

## User Story

**As a** supervisor,
**I want** ver un stepper horizontal que muestre todas las fases del batch con estado visual (completada, actual, futura) y poder tap en una fase para filtrar el contenido de los tabs,
**So that** pueda entender rapidamente el progreso del batch y explorar datos especificos de cada fase.

## Acceptance Criteria

### Scenario 1: Stepper muestra estado de cada fase
- **Given** el batch LOT-001 tiene 7 fases, 3 completadas, 1 actual (Floracion), 3 futuras
- **When** se renderiza el stepper
- **Then** las fases completadas aparecen con circulo verde lleno + checkmark, la fase actual tiene animacion pulsing con color de fase, las futuras son outline gris

### Scenario 2: Tap en fase filtra contenido de tabs
- **Given** el stepper esta visible y el usuario esta en el tab Timeline
- **When** hace tap en la fase "Vegetativo" (completada)
- **Then** los tabs debajo filtran su contenido a solo datos de la fase Vegetativo: timeline muestra solo eventos de esa fase, actividades solo de esa fase, inventario solo transacciones de esa fase

### Scenario 3: Fase skipped muestra indicador especial
- **Given** una fase del batch tiene status='skipped' (fue omitida en la orden)
- **When** se renderiza el stepper
- **Then** la fase aparece con estilo especial: circulo vacio con linea diagonal, label "Omitida", no es clickeable para filtrar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Stepper responsive: horizontal con scroll en mobile, expandido en desktop
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: navegable por teclado

## Technical Notes
- **Datos**: production_order_phases (si viene de orden) o production_phases del crop_type
- Estado de cada fase derivado de: production_order_phase.status o comparacion con batch.current_phase_id
- Filtrado por fase: pasar phase_id como filtro a los queries de cada tab
- **Pantalla**: batch-detail, componente ProgressStepper reutilizable

## UI/UX Notes
- Stepper horizontal: circulos conectados por linea
- Colores: verde (#059669) completada, color de fase para actual (pulsing), gris (#D4DDD6) futuras
- Scroll horizontal en mobile si hay muchas fases
- Tap en fase = filtro activo, segundo tap = quitar filtro

## Dependencies
- US-017-001, F-011 (fases del crop_type)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-017-003: Tab Timeline con cronologia de eventos

## User Story

**As a** supervisor,
**I want** ver una cronologia vertical con todos los eventos del batch ordenados temporalmente (cambios de fase, actividades, transacciones, alertas, tests de calidad),
**So that** pueda reconstruir la historia completa del lote y entender que paso en cada momento.

## Acceptance Criteria

### Scenario 1: Timeline muestra eventos de multiples dominios
- **Given** el batch LOT-001 tiene actividades completadas, transacciones de inventario, una alerta y un cambio de fase
- **When** el usuario selecciona el tab Timeline
- **Then** se muestran los eventos en orden cronologico descendente: cada evento con timestamp, tipo icon, descripcion, actor. Tipos diferenciados por color: fase (verde), actividad (naranja), transaccion (morado), alerta (amarillo/rojo), calidad (cyan)

### Scenario 2: Expandir evento para ver detalle
- **Given** la timeline muestra un evento de actividad
- **When** el usuario hace tap en el evento
- **Then** se expande mostrando detalles adicionales: recursos consumidos, checklist completados, duracion, operador

### Scenario 3: Filtrar timeline por tipo de evento
- **Given** la timeline tiene 50+ eventos
- **When** el usuario activa los checkboxes de filtro seleccionando solo "Actividades" y "Alertas"
- **Then** solo se muestran eventos de esos tipos, ocultando transacciones, fases y calidad

### Scenario 4: Timeline vacia para batch recien creado
- **Given** el batch fue creado hace 1 minuto y no tiene eventos
- **When** el usuario ve el tab Timeline
- **Then** se muestra un solo evento "Batch creado" con timestamp de creacion y el usuario que aprobo la orden

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Query UNION eficiente para multiples tablas
- [ ] Lazy loading del tab
- [ ] Criterios de aceptacion verificados
- [ ] Virtual scrolling para timelines largas

## Technical Notes
- **Query**: UNION de activities, inventory_transactions, alerts, quality_tests WHERE batch_id, ordenado por timestamp DESC
- Lazy loading: los datos del tab se cargan solo cuando se selecciona (TanStack Query con enabled)
- **Pantalla**: batch-detail tab Timeline, batch-timeline (vista expandida)
- Componente Timeline reutilizable con slots para diferentes tipos de evento

## UI/UX Notes
- Linea vertical a la izquierda con puntos por evento
- Cada evento: icono tipo (color diferenciado), timestamp (DM Mono), titulo, subtitulo con actor
- Expandible: tap para ver detalles
- Filtros como checkboxes en header del tab
- Scroll infinito o virtual scrolling

## Dependencies
- US-017-001, US-017-002
- F-014 (batch con datos), F-022 (actividades ejecutadas generan eventos)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-017-004: Tab Actividades con lista pendientes/completadas

## User Story

**As a** supervisor,
**I want** ver las actividades del batch divididas en pendientes y completadas, con filtro rapido para cada estado,
**So that** pueda saber que trabajo queda por hacer y revisar lo ya ejecutado para este lote.

## Acceptance Criteria

### Scenario 1: Ver actividades pendientes y completadas
- **Given** el batch tiene 5 actividades completadas y 3 pendientes
- **When** el usuario selecciona el tab Actividades
- **Then** se muestran las 3 pendientes primero (ordenadas por fecha planificada), luego las 5 completadas. Cada card muestra: tipo, operador, fecha, duracion (si completada), estado badge

### Scenario 2: Filtrar solo pendientes
- **Given** el tab Actividades esta visible
- **When** el usuario selecciona el filtro "Pendientes"
- **Then** solo se muestran las actividades con status='pending' o 'overdue'

### Scenario 3: Actividades vencidas resaltadas
- **Given** hay 2 actividades con status='overdue'
- **When** se renderiza el tab
- **Then** las vencidas aparecen con borde rojo y badge "Vencida" en la parte superior de la lista

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Lazy loading del tab
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Query**: activities + scheduled_activities WHERE batch_id
- Filtro: todas / pendientes / completadas / vencidas
- **Pantalla**: batch-detail tab Actividades

## UI/UX Notes
- Filtro rapido como pills en header del tab
- Activity cards reutilizables (mismo componente que act-today)
- Tap en actividad navega a act-execute (si pendiente) o detalle (si completada)

## Dependencies
- US-017-001
- F-020, F-022 (actividades programadas y ejecutadas)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-017-005: Tab Inventario con transacciones del batch

## User Story

**As a** supervisor,
**I want** ver todas las transacciones de inventario del batch agrupadas por tipo (consumos, transformaciones, waste),
**So that** pueda entender que recursos se consumieron y que productos se generaron en este lote.

## Acceptance Criteria

### Scenario 1: Ver transacciones agrupadas por tipo
- **Given** el batch tiene 20 transacciones de consumo, 3 de transformacion y 1 de waste
- **When** el usuario selecciona el tab Inventario
- **Then** se muestra una tabla/lista con: tipo badge (coloreado), producto, cantidad (+/-), costo, operador, timestamp. Agrupable por tipo o por fase

### Scenario 2: Filtrar por tipo de transaccion
- **Given** el tab muestra todas las transacciones
- **When** el usuario filtra por "Solo consumos"
- **Then** se muestran solo las transacciones con type='consumption' o 'application'

### Scenario 3: Tab sin transacciones
- **Given** el batch fue recien creado y no tiene transacciones
- **When** el usuario selecciona el tab Inventario
- **Then** se muestra empty state "Sin movimientos de inventario para este batch"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Lazy loading del tab
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Query**: inventory_transactions WHERE batch_id, ORDER BY timestamp DESC
- **Pantalla**: batch-detail tab Inventario

## UI/UX Notes
- Tabla scrollable con iconos de tipo coloreados
- Cantidades positivas en verde, negativas en rojo, en DM Mono
- Costos en DM Mono
- Toggle agrupacion: por tipo / por fase

## Dependencies
- US-017-001
- F-022 (actividades generan transacciones)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-017-006: Tabs Costos y Calidad (vistas basicas)

## User Story

**As a** gerente,
**I want** ver un resumen basico de costos y calidad en los tabs correspondientes del detalle del batch,
**So that** tenga visibilidad temprana de estas dimensiones aunque las funcionalidades completas se desarrollen en fases posteriores.

## Acceptance Criteria

### Scenario 1: Tab Costos muestra resumen basico
- **Given** el batch tiene transacciones con cost_total registrado
- **When** el usuario selecciona el tab Costos
- **Then** se muestra: costo total (SUM cost_total de transacciones), costo por planta (total / plant_count), desglose simple por categoria de recurso

### Scenario 2: Tab Calidad muestra tests vinculados
- **Given** el batch tiene 1 quality_test en status='completed'
- **When** el usuario selecciona el tab Calidad
- **Then** se muestra card del test con: tipo, lab, fecha, overall_pass badge (pass/fail). Tap navega al detalle del test

### Scenario 3: Tab sin datos muestra placeholder
- **Given** el batch no tiene costos ni tests de calidad
- **When** el usuario selecciona cada tab
- **Then** Costos muestra "Sin costos registrados"; Calidad muestra "Sin tests de calidad"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Lazy loading de cada tab
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Costos: SUM(inventory_transactions.cost_total WHERE batch_id) — no incluye overhead en Fase 1
- Calidad: quality_tests WHERE batch_id — vista basica de lista
- Estas vistas se enriqueceran en Fase 2 (inventario/calidad completo) y Fase 3 (overhead/COGS)
- **Pantalla**: batch-detail tabs Costos y Calidad

## UI/UX Notes
- Tab Costos: stat card grande con costo total + costo/planta + tabla simple por categoria
- Tab Calidad: cards de tests con status badge
- Estilo minimalista — se enriquecera en fases posteriores

## Dependencies
- US-017-001

## Estimation
- **Size**: M
- **Complexity**: Low
