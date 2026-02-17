# F-015: Lista de Ordenes y Detalle con Yield Waterfall

## Overview

Pantallas de consulta y gestion de ordenes de produccion: lista con filtros, busqueda y vista kanban opcional para desktop, junto con el detalle de cada orden que incluye el progreso por fase, el diagrama yield waterfall (real vs esperado) y el link al batch vinculado. Estas pantallas son la principal herramienta de seguimiento del gerente y ofrecen visibilidad del estado de produccion.

## User Personas

- **Gerente**: Principal consumidor. Revisa ordenes, analiza rendimientos, y toma decisiones basandose en el yield waterfall.
- **Admin**: Mismos permisos que el gerente.
- **Supervisor**: Consulta ordenes en modo lectura para entender el plan de produccion.
- **Viewer**: Consulta en modo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-015-001 | Lista de ordenes con filtros y busqueda | M | P0 | Planned |
| US-015-002 | Vista kanban de ordenes por estado (desktop) | M | P2 | Planned |
| US-015-003 | Detalle de orden con progreso por fase | M | P0 | Planned |
| US-015-004 | Diagrama yield waterfall (real vs esperado) | L | P1 | Planned |

---

# US-015-001: Lista de ordenes con filtros y busqueda

## User Story

**As a** gerente,
**I want** ver una lista de todas las ordenes de produccion con filtros por estado, prioridad y cultivar, y una barra de busqueda por codigo,
**So that** pueda encontrar rapidamente cualquier orden y tener una vision general del pipeline de produccion.

## Acceptance Criteria

### Scenario 1: Ver lista de ordenes con datos clave
- **Given** existen 10 ordenes de produccion en el sistema
- **When** el gerente navega a la pantalla order-list
- **Then** se muestran cards/filas con: codigo, cultivar, barra de progreso (% fases completadas), fase actual, fechas (inicio planificado y fin estimado), prioridad badge, asignado a

### Scenario 2: Filtrar por estado
- **Given** hay ordenes en estados draft, in_progress y completed
- **When** el gerente selecciona el chip "En progreso"
- **Then** solo se muestran las ordenes con status='in_progress', el chip queda activo y se puede combinar con otros filtros

### Scenario 3: Buscar orden por codigo
- **Given** existe la orden OP-2026-003
- **When** el gerente escribe "003" en la barra de busqueda
- **Then** la lista filtra mostrando solo ordenes cuyo codigo contiene "003"

### Scenario 4: Lista vacia
- **Given** no existen ordenes de produccion
- **When** el gerente navega a la pantalla
- **Then** se muestra empty state "No hay ordenes de produccion. Crea la primera para planificar tu ciclo productivo." con CTA "Nueva orden"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Paginacion o virtual scrolling para listas > 50 items
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: filtros accesibles por teclado

## Technical Notes
- **Query**: production_orders JOIN production_order_phases (para calcular progreso), JOIN cultivars, filtrado por RLS (company_id)
- **Pantalla**: order-list
- Barra de progreso: COUNT(phases WHERE status='completed') / COUNT(total_phases) * 100

## UI/UX Notes
- Filtros como chips removibles en la parte superior: estado, prioridad, cultivar
- Search bar debajo de filtros
- Cards con: codigo (DM Mono), cultivar nombre, progress bar, fase actual badge, fecha inicio, prioridad badge
- Tap en card navega al detalle
- Skeleton loader replicando el layout de la lista

## Dependencies
- F-013, F-014 (ordenes deben existir)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-015-002: Vista kanban de ordenes por estado (desktop)

## User Story

**As a** gerente,
**I want** alternar entre vista lista y vista kanban (columnas por estado) en desktop, con la posibilidad de arrastrar ordenes entre columnas para cambiar su estado,
**So that** pueda visualizar el pipeline de produccion de forma mas intuitiva y gestionar el flujo de ordenes rapidamente.

## Acceptance Criteria

### Scenario 1: Mostrar kanban con columnas por estado
- **Given** el gerente esta en order-list en desktop (>= 1024px)
- **When** activa la vista kanban con el toggle de vista
- **Then** se muestran columnas: Draft, Aprobada, En Progreso, Completada, con las ordenes distribuidas en cada columna

### Scenario 2: Drag and drop de Draft a Aprobada
- **Given** hay una orden en la columna "Draft"
- **When** el gerente arrastra la card a la columna "Aprobada"
- **Then** se abre un modal de confirmacion de aprobacion (mismo flujo que F-014). Si confirma, la orden se mueve a la columna destino

### Scenario 3: Vista kanban no disponible en mobile
- **Given** el gerente esta en un dispositivo mobile (< 640px)
- **When** navega a order-list
- **Then** solo se muestra la vista lista; el toggle de vista kanban no esta visible

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Drag-and-drop funcional en desktop
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Solo transicion Draft -> Approved requiere confirmacion con validaciones completas (F-014)
- Otras transiciones de estado pueden no ser permitidas por drag (solo visual)
- **Pantalla**: order-list (modo kanban)

## UI/UX Notes
- Toggle icono lista/kanban en el header
- Columnas con scroll vertical independiente
- Cards compactas en kanban: codigo, cultivar, prioridad badge
- Count de ordenes en el header de cada columna

## Dependencies
- US-015-001

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-015-003: Detalle de orden con progreso por fase

## User Story

**As a** gerente,
**I want** ver el detalle completo de una orden de produccion incluyendo un stepper visual con el progreso de cada fase, fechas planificadas vs reales, y zona asignada,
**So that** pueda monitorear el avance de la produccion y detectar desviaciones del plan.

## Acceptance Criteria

### Scenario 1: Ver detalle completo de orden en progreso
- **Given** existe la orden OP-2026-001 en status='in_progress' con 5 fases, 2 completadas
- **When** el gerente navega al detalle de la orden
- **Then** se muestra: header con codigo, cultivar, status badge, prioridad, fechas, asignado a; stepper con 5 fases donde 2 estan verdes (completadas), 1 pulsando (actual), 2 en gris (futuras); y link al batch vinculado

### Scenario 2: Fase muestra datos reales vs planificados
- **Given** la fase "Vegetativo" tiene planned_start=Mar 8, actual_start=Mar 10 (2 dias de retraso)
- **When** el gerente expande la fase en el stepper
- **Then** se muestran: fecha plan vs real, duracion plan vs real, zona asignada, input_quantity, output_quantity (si completada), yield_pct (si completada)

### Scenario 3: Orden sin batch (aun en draft)
- **Given** la orden esta en status='draft' y no tiene batch
- **When** el gerente ve el detalle
- **Then** la seccion "Batch vinculado" muestra "El batch se creara al aprobar la orden" con botones "Aprobar" y "Rechazar"

### Scenario 4: Acciones de aprobacion visibles solo para roles autorizados
- **Given** un supervisor ve el detalle de una orden en draft
- **When** se renderiza la pantalla
- **Then** los botones "Aprobar" y "Rechazar" NO son visibles (supervisor solo tiene lectura en ordenes)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Responsive: stepper horizontal en desktop, vertical en mobile

## Technical Notes
- **Query**: production_orders JOIN production_order_phases JOIN production_phases JOIN cultivars JOIN batches (si existe)
- **Pantalla**: order-detail
- Acciones condicionadas por rol: solo manager y admin ven aprobar/rechazar
- **Tablas**: production_orders, production_order_phases

## UI/UX Notes
- Header con datos principales y status badge grande
- Phase stepper visual: circulos conectados por linea, coloreados por estado
- Expandir fase para ver detalles (fechas, zona, yield)
- Seccion "Batch vinculado" con card del batch y link
- Acciones en bottom bar contextual (solo para roles con permiso)

## Dependencies
- US-015-001, F-013, F-014

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-015-004: Diagrama yield waterfall (real vs esperado)

## User Story

**As a** gerente,
**I want** ver un diagrama waterfall que muestre el rendimiento esperado vs real en cada fase de la orden, con barras de color que indiquen si el yield esta dentro del rango aceptable,
**So that** pueda identificar rapidamente en que fase se produjo una perdida mayor a la esperada y tomar acciones correctivas.

## Acceptance Criteria

### Scenario 1: Waterfall con fases completadas muestra real vs esperado
- **Given** la orden tiene 3 fases completadas con yields reales registrados
- **When** el gerente ve la seccion yield waterfall en order-detail
- **Then** se muestra un diagrama con barras: input -> yield% -> output por fase, barra verde si yield >= esperado, barra roja si yield < 80% del esperado, barra amarilla si entre 80-99%

### Scenario 2: Fases futuras muestran solo valores esperados
- **Given** la orden tiene 5 fases, 2 completadas y 3 pendientes
- **When** el gerente ve el waterfall
- **Then** las fases completadas muestran barra real + linea de referencia esperada; las fases pendientes muestran solo la linea de referencia esperada en estilo outline

### Scenario 3: Orden sin phase_product_flows (yields no configurados)
- **Given** el cultivar no tiene phase_product_flows completos
- **When** el gerente ve el waterfall
- **Then** se muestra el diagrama con 100% yield esperado en cada fase (default) y un banner "Yields no configurados para este cultivar"

### Scenario 4: Hover/tap en barra muestra detalle
- **Given** el waterfall esta renderizado
- **When** el gerente hace hover (desktop) o tap (mobile) en una barra de fase
- **Then** se muestra tooltip con: nombre de fase, input real, output real, yield %, diferencia vs esperado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Chart responsive y legible en mobile
- [ ] Tests unitarios para calculo de yields
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Datos**: production_order_phases.yield_pct (real) vs phase_product_flows.expected_yield_pct (esperado)
- Si yield_pct no esta registrado aun (fase pendiente): mostrar solo esperado
- Usar Recharts BarChart con dos series: real y esperado
- **Pantalla**: order-detail, seccion yield waterfall

## UI/UX Notes
- Barras verticales o horizontales: fase en eje X, cantidad en eje Y
- Color de barra: verde (#059669) si yield >= esperado, amarillo (#D97706) si 80-99%, rojo (#DC2626) si < 80%
- Linea de referencia para el esperado (outline lime #ECF7A3)
- Numeros en DM Mono sobre cada barra
- Responsive: horizontal en desktop, vertical simplificado en mobile

## Dependencies
- US-015-003, F-011 (phase_product_flows), F-014 (batch con datos reales)

## Estimation
- **Size**: L
- **Complexity**: High
