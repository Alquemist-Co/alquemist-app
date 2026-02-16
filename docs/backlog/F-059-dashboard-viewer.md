# F-059: Dashboard Viewer

## Overview

Dashboard de solo lectura para inversionistas, auditores y consultores. Muestra KPIs agregados de produccion, estado simplificado de ordenes y un indicador de calidad (pass rate). No incluye acciones, ni drill-down a costos detallados, ni posibilidad de modificar datos. Toda la informacion es de alto nivel y orientada a transparencia.

## User Personas

- **Viewer**: Inversionista, auditor o consultor que necesita ver el estado general de la produccion sin acceder a detalles operativos ni financieros granulares. Usa cualquier dispositivo.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-059-001 | Header read-only con periodo y facility | S | P1 | Planned |
| US-059-002 | KPIs de produccion read-only | M | P1 | Planned |
| US-059-003 | Estado de produccion simplificado | M | P1 | Planned |

---

# US-059-001: Header read-only con periodo y facility

## User Story

**As a** viewer,
**I want** ver el titulo "Resumen de Produccion" con periodo y facility preseleccionados,
**So that** tenga contexto del alcance de los datos que estoy consultando.

## Acceptance Criteria

### Scenario 1: Header con datos
- **Given** el viewer accede al dashboard
- **When** la pagina carga
- **Then** ve el titulo "Resumen de Produccion", el periodo actual (mes por defecto) y la facility principal de la empresa

### Scenario 2: Cambiar periodo
- **Given** el viewer quiere ver datos de otro trimestre
- **When** cambia el selector de periodo
- **Then** los datos se actualizan pero no hay opciones de accion ni edicion en la pagina

### Scenario 3: Viewer sin acceso a facility especifica
- **Given** un viewer con acceso a todas las facilities
- **When** accede al dashboard
- **Then** ve datos agregados de todas las facilities con opcion de filtrar por cada una

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Reutilizar componente de header del dashboard gerente con flag `readOnly=true`
- Pantalla: `dash-viewer`
- RLS policies aseguran que el viewer solo ve datos de su company_id

## UI/UX Notes
- Mismo layout que dash-manager pero sin botones de accion
- Selectores funcionales pero sin CTAs ni FABs
- Titulo DM Sans Bold 28px

## Dependencies
- Requiere dashboard gerente como base visual (F-058)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-059-002: KPIs de produccion read-only

## User Story

**As a** viewer,
**I want** ver KPIs agregados de produccion (ordenes activas, batches, yield promedio) sin informacion de costos detallada,
**So that** pueda evaluar el estado general de la operacion sin acceder a datos financieros sensibles.

## Acceptance Criteria

### Scenario 1: KPIs visibles sin drill-down
- **Given** el viewer accede al dashboard
- **When** la pagina carga
- **Then** ve stat cards con: ordenes activas, batches en produccion, yield promedio y quality pass rate, pero sin acceso a COGS ni costos detallados

### Scenario 2: Tap en KPI no navega
- **Given** el viewer ve las stat cards
- **When** toca una stat card
- **Then** no ocurre navegacion ni se muestra detalle adicional (las cards no son clickeables)

### Scenario 3: Datos limitados disponibles
- **Given** hay pocas ordenes en el periodo y el yield no es calculable
- **When** el viewer ve los KPIs
- **Then** los valores muestran "N/A" donde no hay datos suficientes para calcular

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Mismas queries que dash-manager excepto COGS: se reemplaza por quality pass rate
- Quality pass rate: `COUNT(quality_tests WHERE overall_pass=true) / COUNT(quality_tests) * 100`
- Stat cards sin `onClick` handler ni cursor pointer
- Pantalla: `dash-viewer`

## UI/UX Notes
- Stat cards sin hover effect ni cursor pointer
- Sin flechas de tendencia (informacion simplificada)
- Numeros en DM Mono 24px (mas pequeno que gerente)
- Layout: fila de 4 en desktop, 2x2 en mobile

## Dependencies
- Requiere componente `StatCard` (Fase 0)
- Requiere datos de ordenes y calidad (Fases 1-2)

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-059-003: Estado de produccion simplificado

## User Story

**As a** viewer,
**I want** ver una tabla simplificada con el estado de las ordenes de produccion y una barra de rendimiento general,
**So that** pueda entender el progreso general de la operacion de un vistazo.

## Acceptance Criteria

### Scenario 1: Tabla de ordenes con estado
- **Given** hay 6 ordenes activas en el sistema
- **When** el viewer accede al dashboard
- **Then** ve una tabla con columnas: codigo, cultivar, estado (badge), progreso (barra %), y fecha estimada de finalizacion

### Scenario 2: Barra de rendimiento general
- **Given** hay datos de yield en las ordenes completadas del periodo
- **When** el viewer ve la seccion de rendimiento
- **Then** ve una barra horizontal que muestra el yield promedio general vs el esperado, con label "Rendimiento: 85% (Esperado: 90%)"

### Scenario 3: Sin ordenes en el periodo
- **Given** no hay ordenes activas ni completadas en el periodo seleccionado
- **When** el viewer accede
- **Then** ve empty state "Sin ordenes de produccion en este periodo" sin CTAs de accion

### Scenario 4: Sin links a acciones
- **Given** el viewer ve la tabla de ordenes
- **When** toca una fila de la tabla
- **Then** no ocurre navegacion al detalle de la orden (el viewer no tiene acceso a `order-detail` completo ni a costos)

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `production_orders JOIN production_order_phases` con datos agregados
- Tabla sin links ni acciones
- Barra de rendimiento: calculo de `AVG(production_order_phases.yield_pct)` vs `AVG(phase_product_flows.expected_yield_pct)`
- Pantalla: `dash-viewer`

## UI/UX Notes
- Tabla responsive: collapsa a cards en mobile
- Status badges: draft=gris, approved=info, in_progress=brand, completed=success, cancelled=error
- Progress bar: 6px height, brand color
- Sin hover effects clickeables, cursor default

## Dependencies
- Requiere modulo de Ordenes con datos (Fase 1)
- Requiere quality tests con resultados (Fase 2)

## Estimation
- **Size**: M
- **Complexity**: Low
