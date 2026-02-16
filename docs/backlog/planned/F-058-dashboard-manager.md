# F-058: Dashboard Gerente

## Overview

Dashboard estrategico para el gerente que muestra KPIs de produccion, rendimiento y costos. Incluye 4 stat cards principales (ordenes activas, batches en produccion, yield promedio, COGS/gramo), grafico de yield real vs esperado por orden, panel de ordenes en progreso con barra de avance, mini-panel de costos con distribucion y acciones rapidas. Permite al gerente tomar decisiones basadas en datos de produccion en tiempo real.

## User Personas

- **Gerente**: Crea ordenes de produccion, analiza rendimientos y controla costos. Usa laptop y tablet. Prioriza analitica y control financiero.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-058-001 | Header con selector de periodo y facility | S | P0 | Planned |
| US-058-002 | KPIs principales con tendencias | M | P0 | Planned |
| US-058-003 | Grafico de rendimiento yield real vs esperado | M | P0 | Planned |
| US-058-004 | Panel de ordenes en progreso | M | P1 | Planned |
| US-058-005 | Mini-panel de costos con distribucion | M | P1 | Planned |
| US-058-006 | Acciones rapidas del gerente | S | P1 | Planned |

---

# US-058-001: Header con selector de periodo y facility

## User Story

**As a** gerente,
**I want** ver el titulo "Produccion" con selectores de periodo (mes/trimestre/ano) y facility,
**So that** pueda analizar los datos de produccion en el rango temporal y ubicacion que necesito.

## Acceptance Criteria

### Scenario 1: Header con selectores
- **Given** el gerente accede al dashboard
- **When** la pagina carga
- **Then** ve el titulo "Produccion", un selector de periodo con opciones "Mes", "Trimestre" y "Ano" (default: Mes actual), y un selector de facility

### Scenario 2: Cambiar periodo actualiza datos
- **Given** el gerente esta viendo datos del mes actual
- **When** cambia el selector a "Trimestre"
- **Then** todos los KPIs, graficos y paneles se actualizan para reflejar los datos del trimestre actual

### Scenario 3: Periodo sin datos
- **Given** el gerente selecciona un periodo donde no hay ordenes ni batches
- **When** los datos se cargan
- **Then** los KPIs muestran "0" o "N/A" y los graficos muestran empty state con mensaje "Sin datos para este periodo"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Selectores de periodo y facility almacenados en Zustand store
- Queries se re-ejecutan al cambiar filtros via TanStack Query invalidation
- Pantalla: `dash-manager`

## UI/UX Notes
- Titulo DM Sans Bold 28px
- Selectores: chips toggle o segmented control para periodo, dropdown para facility
- Transicion suave al cambiar periodo (skeleton loaders durante carga)

## Dependencies
- Requiere `production_orders`, `batches`, `facilities` con datos (Fases 0-2)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-058-002: KPIs principales con tendencias

## User Story

**As a** gerente,
**I want** ver 4 KPIs principales con valores actuales y flechas de tendencia vs periodo anterior,
**So that** identifique rapidamente si la produccion mejora o empeora en metricas clave.

## Acceptance Criteria

### Scenario 1: KPIs con datos y tendencia positiva
- **Given** hay 5 ordenes activas, 12 batches, yield promedio 87% y COGS $2.3/gramo
- **When** el gerente accede al dashboard
- **Then** ve 4 stat cards grandes con: "Ordenes activas: 5" con mini sparkline, "Batches: 12", "Yield: 87%" con comparacion vs esperado, "COGS: $2.3/g" con tendencia

### Scenario 2: Tendencia negativa
- **Given** el yield promedio actual es 75% pero el periodo anterior fue 85%
- **When** el gerente ve la stat card de yield
- **Then** muestra una flecha roja hacia abajo con "-10 pts" indicando la disminucion

### Scenario 3: Sin periodo anterior para comparar
- **Given** es el primer mes de operacion y no hay datos historicos
- **When** el gerente ve los KPIs
- **Then** los valores se muestran sin flecha de tendencia y sin comparacion

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Ordenes activas: `COUNT(production_orders WHERE status IN ('approved','in_progress'))`
- Batches: `COUNT(batches WHERE status='active')`
- Yield: `AVG(production_order_phases.yield_pct WHERE yield_pct IS NOT NULL)`
- COGS: `calculateBatchCOGS` aggregado / total gramos producidos
- Tendencia: comparar con misma query del periodo anterior
- Pantalla: `dash-manager`

## UI/UX Notes
- Stat cards mas grandes que las del operador: numero en DM Mono 32px Bold
- Flecha tendencia: 16px, verde arriba (mejora) o rojo abajo (empeora)
- Mini sparkline dentro de la card: 40px height, ultimos 6 periodos
- Grid 2x2 en mobile, 4 columnas en desktop

## Dependencies
- Requiere `production_orders`, `production_order_phases` con yields (Fases 1-2)
- Requiere `calculateBatchCOGS` Server Action (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-058-003: Grafico de rendimiento yield real vs esperado

## User Story

**As a** gerente,
**I want** ver un grafico de barras comparando el yield real vs esperado por cada orden activa,
**So that** identifique ordenes con rendimiento inferior y tome acciones correctivas.

## Acceptance Criteria

### Scenario 1: Grafico con datos de ordenes
- **Given** hay 4 ordenes activas con yields registrados
- **When** el gerente accede al dashboard
- **Then** ve un bar chart con una barra verde (#005E42) para yield real y una barra outline lime (#ECF7A3) para yield esperado, por cada orden

### Scenario 2: Hover muestra detalle
- **Given** el gerente ve el grafico de rendimiento
- **When** pasa el cursor sobre una barra (desktop) o la toca (mobile)
- **Then** un tooltip muestra: codigo de orden, cultivar, yield real %, yield esperado %, diferencia

### Scenario 3: Orden sin yield registrado
- **Given** una orden activa aun no tiene fases completadas con yield
- **When** el gerente ve el grafico
- **Then** esa orden muestra solo la barra de yield esperado con la real en 0% y un label "Sin datos"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Yield real: `production_order_phases.yield_pct` promediado por orden
- Yield esperado: `phase_product_flows.expected_yield_pct` encadenado por fases de la orden
- Componente: Recharts `BarChart` con dos series
- Pantalla: `dash-manager`

## UI/UX Notes
- Chart: fondo transparente, ejes en #D4DDD6, labels DM Mono 10px
- Barras: fill #005E42 (real), stroke #ECF7A3 con fill transparente (esperado)
- Tooltip: card flotante con shadow, DM Mono para numeros
- Responsive: horizontal scroll en mobile si hay muchas ordenes

## Dependencies
- Requiere modulo de Ordenes con yield cascade (Fase 1)
- Requiere `production_order_phases` con datos reales (Fases 1-2)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-058-004: Panel de ordenes en progreso

## User Story

**As a** gerente,
**I want** ver una lista de ordenes en progreso con codigo, cultivar, barra de avance, fase actual y dias restantes,
**So that** pueda monitorear el estado de cada orden y detectar retrasos.

## Acceptance Criteria

### Scenario 1: Ordenes ordenadas por prioridad
- **Given** hay 5 ordenes en progreso con diferentes prioridades
- **When** el gerente accede al dashboard
- **Then** ve cards de orden ordenadas por prioridad (urgent primero), cada una con: codigo, cultivar, barra de progreso (% fases completadas), fase actual badge, dias restantes

### Scenario 2: Tap en orden navega a detalle
- **Given** el gerente ve una order card
- **When** la toca
- **Then** navega a `order-detail` con yield waterfall y fase progress

### Scenario 3: Orden con retraso
- **Given** una orden tiene planned_end_date vencida pero no esta completada
- **When** el gerente ve la lista
- **Then** esa order card muestra badge "Retrasada" en rojo y los dias restantes como negativos "(-3 dias)"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `production_orders WHERE status IN ('approved','in_progress') JOIN production_order_phases ORDER BY priority DESC`
- Progreso: `COUNT(phases WHERE status='completed') / COUNT(total phases) * 100`
- Dias restantes: `planned_end_date - today`
- Pantalla: `dash-manager`

## UI/UX Notes
- Card: codigo en DM Mono 14px, cultivar en DM Sans 16px SemiBold
- Progress bar: 6px height, brand color
- Priority badge: urgent=rojo, high=naranja, normal=gris, low=gris claro
- Max 5 ordenes visibles, link "Ver todas" al final

## Dependencies
- Requiere modulo de Ordenes completo (Fase 1)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-058-005: Mini-panel de costos con distribucion

## User Story

**As a** gerente,
**I want** ver un resumen visual de la distribucion de costos (insumos directos, labor, overhead) y el total COGS del periodo,
**So that** entienda la estructura de costos y detecte categorias que necesiten optimizacion.

## Acceptance Criteria

### Scenario 1: Panel de costos con datos
- **Given** hay batches con costos registrados en el periodo
- **When** el gerente accede al dashboard
- **Then** ve un donut chart con 3 segmentos (insumos directos, labor, overhead), total COGS en el centro, y una tabla con porcentaje por categoria

### Scenario 2: Comparacion vs presupuesto
- **Given** los costos del periodo son $5,000 y el presupuesto era $4,500
- **When** el gerente ve el panel
- **Then** muestra indicador visual "111% del presupuesto" en rojo con la diferencia

### Scenario 3: Sin costos registrados
- **Given** no hay costos en el periodo seleccionado
- **When** el gerente ve el panel
- **Then** el donut chart muestra empty state con "Sin datos de costos" y CTA "Registrar costo overhead"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Insumos directos: `SUM(inventory_transactions.cost_total WHERE type='consumption')`
- Labor: `SUM(activities.duration_minutes / 60 * hourly_rate)`
- Overhead: `SUM(overhead_costs.amount WHERE period overlaps)`
- Server Action: `calculateBatchCOGS` aggregado por periodo
- Componente: Recharts `PieChart` o custom SVG donut
- Pantalla: `dash-manager`

## UI/UX Notes
- Donut chart: 160px diametro, 3 colores (brand, brand-light, border)
- Total en DM Mono Bold 24px centrado en el donut
- Tabla debajo: 3 filas con label + monto + porcentaje
- Responsive: donut arriba, tabla abajo en mobile

## Dependencies
- Requiere modulo de Inventario con costos (Fase 2)
- Requiere overhead costs (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-058-006: Acciones rapidas del gerente

## User Story

**As a** gerente,
**I want** tener botones de acceso rapido a "Nueva orden", "Exportar reporte" y "Ver proyecciones",
**So that** pueda iniciar acciones estrategicas sin navegar por el menu.

## Acceptance Criteria

### Scenario 1: Acciones visibles
- **Given** el gerente accede al dashboard
- **When** scrollea a la seccion de acciones rapidas
- **Then** ve 3 botones: "Nueva orden" (navega a order-create), "Exportar reporte" (genera descarga) y "Ver proyecciones" (navega a area-occupancy)

### Scenario 2: Nueva orden desde dashboard
- **Given** el gerente toca "Nueva orden"
- **When** la navegacion se ejecuta
- **Then** abre el wizard de creacion de orden `order-create` con el cultivar preseleccionado si hay uno solo activo

### Scenario 3: Exportar reporte
- **Given** el gerente toca "Exportar reporte"
- **When** se inicia la descarga
- **Then** genera un CSV con los KPIs y ordenes del periodo seleccionado, muestra toast "Reporte descargado" al completar

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- "Nueva orden": `router.push('/orders/new')`
- "Exportar reporte": Server Action que genera CSV con datos agregados del dashboard
- "Ver proyecciones": `router.push('/areas/occupancy')`
- Pantalla: `dash-manager`

## UI/UX Notes
- 3 botones secundarios en fila horizontal
- Icono Lucide + label: PlusCircle (nueva orden), Download (exportar), TrendingUp (proyecciones)

## Dependencies
- Requiere modulo de Ordenes (Fase 1)
- Requiere modulo de Areas con ocupacion (Fase 3)

## Estimation
- **Size**: S
- **Complexity**: Low
