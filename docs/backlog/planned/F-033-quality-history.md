# F-033: Historial de Calidad y Tendencias

## Overview

Vista historica de todos los tests de calidad completados con filtros avanzados y grafico de tendencias por parametro por cultivar. Permite identificar patrones de mejora o degradacion en la calidad a lo largo del tiempo y comparar batches del mismo cultivar. Es la herramienta analitica principal del modulo de calidad.

## User Personas

- **Gerente**: Analiza tendencias de calidad por cultivar para decisiones estrategicas de produccion.
- **Supervisor**: Revisa historial de tests para comparar resultados entre batches.
- **Viewer**: Consulta read-only de historial y tendencias para reportes.
- **Admin**: Acceso completo al historial.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-033-001 | Tabla de historial de tests con filtros | M | P0 | Planned |
| US-033-002 | Grafico de tendencias por parametro y cultivar | M | P1 | Planned |

---

# US-033-001: Tabla de historial de tests con filtros

## User Story

**As a** gerente,
**I want** ver una tabla con todos los tests de calidad completados y poder filtrar por batch, cultivar, tipo de test, estado y rango de fechas,
**So that** pueda revisar el historial completo de analisis y encontrar tests especificos para auditorias o comparaciones.

## Acceptance Criteria

### Scenario 1: Visualizacion del historial completo
- **Given** existen 50 tests de calidad con diferentes estados
- **When** el gerente accede a la pantalla qual-history
- **Then** se muestra una tabla con columnas: batch code, tipo de test, lab, fecha muestra, fecha resultado, overall pass (badge verde/rojo)
- **And** se ordenan por fecha de resultado DESC (mas recientes primero)

### Scenario 2: Filtrar por cultivar y tipo
- **Given** el historial tiene tests de cultivares Gelato, Blue Dream y OG Kush
- **When** el gerente filtra por cultivar = "Gelato" y tipo = "potency"
- **Then** solo se muestran tests de potencia para batches del cultivar Gelato
- **And** los filtros se muestran como chips removibles

### Scenario 3: Filtrar por estado
- **Given** existen tests con status: completed, failed, rejected
- **When** el gerente filtra por estado = "failed"
- **Then** solo se muestran tests donde overall_pass = false
- **And** se resalta el count de tests fallidos

### Scenario 4: Detalle de test desde historial
- **Given** la tabla muestra un test completado
- **When** el gerente hace tap en la fila
- **Then** se navega al detalle del test mostrando todos los parametros, valores, thresholds, pass/fail por parametro
- **And** incluye link al batch y link al certificado si existe

### Scenario 5: Sin tests en historial
- **Given** no se han completado tests de calidad
- **When** el gerente accede a qual-history
- **Then** se muestra empty state "No hay tests completados" con CTA "Ver tests pendientes" que navega a qual-pending

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Paginacion o virtual scrolling para historiales grandes

## Technical Notes
- Pantalla: `qual-history`
- Query: `quality_tests` JOIN `quality_test_results`, `batches`, `cultivars` WHERE status IN ('completed', 'failed', 'rejected')
- Filtros server-side: batch_id, cultivar_id (via batch -> cultivar), test_type, overall_pass, date range
- Paginacion cursor-based por result_date
- TanStack Query para cache

## UI/UX Notes
- Desktop: tabla completa con todas las columnas. Mobile: cards con info esencial
- Overall pass badge: check verde = paso, x rojo = fallo, guion gris = pendiente
- Filtros: chips para batch, cultivar (dropdown), tipo, estado, rango fechas (presets + custom)
- Tap en fila -> detalle del test en panel lateral o pagina nueva

## Dependencies
- F-032 (Tests de calidad) para que existan tests completados

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-033-002: Grafico de tendencias por parametro y cultivar

## User Story

**As a** gerente,
**I want** ver un grafico de tendencias que muestre la evolucion de parametros de calidad clave (ej: THC%, humedad%) a lo largo de batches del mismo cultivar,
**So that** pueda identificar mejoras o degradaciones en la calidad y correlacionar con cambios en procesos de produccion.

## Acceptance Criteria

### Scenario 1: Tendencia de THC por cultivar
- **Given** existen 10 tests de potencia para el cultivar Gelato en los ultimos 6 meses
- **When** el gerente selecciona cultivar = "Gelato" y parametro = "THC"
- **Then** se muestra un grafico de linea con eje X = fecha (o batch code) y eje Y = valor de THC (%)
- **And** se muestra una linea de tendencia (promedio movil) para identificar la direccion

### Scenario 2: Comparacion con thresholds
- **Given** el parametro THC tiene min_threshold = 18% y max_threshold = 30%
- **When** se muestra el grafico
- **Then** se dibuja una banda horizontal sombreada entre 18% y 30% representando el rango aceptable
- **And** los puntos fuera de la banda se resaltan en rojo

### Scenario 3: Cultivar sin tests suficientes
- **Given** el cultivar "Blue Dream" solo tiene 1 test de calidad
- **When** el gerente selecciona ese cultivar para tendencias
- **Then** se muestra un solo punto en el grafico con mensaje "Se necesitan al menos 3 tests para mostrar tendencia"
- **And** no se dibuja linea de tendencia

### Scenario 4: Multiples parametros
- **Given** el gerente quiere comparar THC y CBD del mismo cultivar
- **When** selecciona ambos parametros
- **Then** se muestran ambas lineas en el mismo grafico con colores distintos y leyenda
- **And** cada parametro tiene su propia escala si las unidades son diferentes

### Scenario 5: Sin datos para el parametro seleccionado
- **Given** no hay resultados del parametro "Brix" para el cultivar seleccionado
- **When** el gerente selecciona parametro = "Brix"
- **Then** se muestra empty state en el area del grafico "No hay datos de Brix para este cultivar"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Chart accesible con aria-labels
- [ ] Lazy loading del componente chart

## Technical Notes
- Query: `quality_test_results` JOIN `quality_tests` JOIN `batches` WHERE cultivar_id = :id AND parameter = :param ORDER BY test.sample_date ASC
- Datos agregados por test/batch, agrupados por cultivar
- Recharts LineChart con referenceArea para banda de thresholds
- Linea de tendencia: promedio movil de 3 puntos (SMA)
- Lazy loading del chart component
- Parametros disponibles: extraidos con SELECT DISTINCT parameter FROM quality_test_results WHERE cultivar_id

## UI/UX Notes
- Selectores: cultivar (dropdown), parametro (dropdown con opciones dinamicas)
- Grafico debajo de la tabla de historial, o en tab separada "Tendencias"
- Linea principal en #005E42, linea de tendencia en #ECF7A3
- Banda de threshold sombreada en verde claro translucido
- Puntos fuera de rango con marker rojo
- Tooltip: fecha, batch code, valor, resultado pass/fail
- Responsive: grafico full-width, scrollable horizontalmente en mobile si necesario

## Dependencies
- US-033-001 (Tabla de historial)
- Multiples tests completados para tener datos de tendencia

## Estimation
- **Size**: M
- **Complexity**: Medium
