# F-042: Detalle de Zona con Clima Actual y Batches

## Overview

Pantalla de detalle de una zona individual que muestra informacion completa: datos generales, condiciones ambientales actuales con dials/gauges comparados contra rangos optimos del cultivar, lista de batches presentes, estructuras fisicas e historial ambiental de 7 dias. Es el centro de operaciones para el supervisor que monitorea sus zonas.

## User Personas

- **Supervisor**: Monitorea condiciones ambientales, revisa batches en zona, detecta desviaciones rapido.
- **Gerente**: Consulta estado de zonas especificas, evalua historial ambiental.
- **Operador**: Consulta en que zona estan sus batches y las condiciones actuales.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-042-001 | Header con datos de zona | S | P1 | Planned |
| US-042-002 | Dials de clima actual vs rango optimo | M | P0 | Planned |
| US-042-003 | Lista de batches en zona y estructuras | M | P1 | Planned |
| US-042-004 | Historial ambiental 7 dias | M | P1 | Planned |

---

# US-042-001: Header con datos de zona

## User Story

**As a** supervisor,
**I want** ver los datos principales de una zona en el header de la pantalla de detalle,
**So that** tenga contexto inmediato sobre el tipo de zona, su capacidad y estado.

## Acceptance Criteria

### Scenario 1: Header completo con todos los datos
- **Given** el usuario navega al detalle de la zona "Sala Floracion A" con purpose=flowering, environment=indoor_controlled, area=80m2, capacidad=720 plantas, status=active
- **When** se renderiza la pantalla area-zone-detail
- **Then** se muestra: nombre "Sala Floracion A", badge de purpose "Floracion" con color morado, badge de environment "Indoor", area "80 m2", capacidad "720 plantas (efectiva) / 720 (total)", status badge verde "Activa"

### Scenario 2: Zona en mantenimiento
- **Given** la zona tiene status = 'maintenance'
- **When** se renderiza el header
- **Then** se muestra badge "Mantenimiento" en color warning
- **And** un banner informativo indica "Zona en mantenimiento — no disponible para nuevos batches"

### Scenario 3: Zona sin area ni capacidad configurada
- **Given** la zona no tiene area_m2 ni plant_capacity definidos
- **When** se renderiza el header
- **Then** se muestran como "Sin configurar" en texto secondary
- **And** si el rol es admin, se muestra link "Configurar" para editar

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Badges accesibles con aria-label

## Technical Notes
- Pantalla: `area-zone-detail`
- Server Component: `SELECT * FROM zones WHERE id = :zoneId` con RLS Tipo B
- Capacidad efectiva: si hay zone_structures, `SUM(max_positions)`, sino `area_m2 * density`

## UI/UX Notes
- Header hero con fondo sutil gradiente del color de purpose
- Nombre en DM Sans Bold 24px, badges inline, datos en DM Mono 14px
- Mobile: stack vertical, Desktop: datos en fila horizontal

## Dependencies
- F-041 (navegacion desde grid de zonas)
- Fase 0: schema DB (zones, zone_structures)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-042-002: Dials de clima actual vs rango optimo

## User Story

**As a** supervisor,
**I want** ver dials circulares que muestren temperatura, humedad relativa, CO2 y VPD actuales de la zona comparados contra el rango optimo del cultivar principal,
**So that** pueda detectar inmediatamente si alguna condicion ambiental esta fuera de rango.

## Acceptance Criteria

### Scenario 1: Todos los parametros en rango
- **Given** la zona tiene sensor de temperatura con lectura 24.5 C y el cultivar principal tiene optimal_conditions temp_min=20, temp_max=26
- **When** se renderizan los dials
- **Then** el dial de temperatura muestra "24.5 C" centrado, con arco en verde (en rango)
- **And** el rango optimo se indica como banda verde en el arco del dial
- **And** se muestra un dial por parametro: temperatura, humedad, CO2, VPD

### Scenario 2: Parametro fuera de rango (warning)
- **Given** la humedad es 35% y el rango optimo es 40-60%
- **When** se renderiza el dial de humedad
- **Then** el dial muestra "35%" con arco en amarillo (warning — desviacion 5-10%)
- **And** el numero se muestra en color warning
- **And** se indica "Bajo rango" como subtexto

### Scenario 3: Parametro critico fuera de rango
- **Given** la temperatura es 32 C y el rango optimo es 20-26 C (desviacion > 10%)
- **When** se renderiza el dial de temperatura
- **Then** el dial muestra "32 C" con arco en rojo (critical)
- **And** el numero se muestra en color error pulsante
- **And** se indica "CRITICO — sobre rango" como subtexto

### Scenario 4: Zona sin lecturas de sensores
- **Given** la zona no tiene sensores configurados o no hay lecturas recientes (> 30 min)
- **When** se renderizan los dials
- **Then** se muestran dials vacios con "Sin datos" y icono de sensor desconectado
- **And** se indica la hora de la ultima lectura disponible o "Nunca" si no hay historial

### Scenario 5: Zona sin cultivar (vacia)
- **Given** la zona no tiene batches activos y por tanto no tiene cultivar principal
- **When** se renderizan los dials
- **Then** se muestran los valores actuales sin comparacion de rango optimo
- **And** los arcos se muestran en color neutro (gris)
- **And** se indica "Sin cultivar — rangos optimos no disponibles"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Componente DialGauge reutilizable creado
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: cada dial tiene aria-label con valor y estado
- [ ] Performance: renderizado SVG < 100ms por dial

## Technical Notes
- Pantalla: `area-zone-detail`
- Server Action: `getZoneConditions(zoneId)` — retorna ultima lectura por parametro + rangos optimos del cultivar principal
- Query: `SELECT DISTINCT ON (parameter) * FROM environmental_readings WHERE zone_id = :zoneId ORDER BY parameter, timestamp DESC`
- Cultivar principal: batch con mas plantas en la zona, su cultivar.optimal_conditions
- Zod schema: `sensorReadingSchema` de `area.schema.ts`
- Componente SVG custom: `DialGauge` en `components/data/`
- Logica de colores: `|valor - rango| / rango * 100` -> < 5% verde, 5-10% warning, > 10% critical

## UI/UX Notes
- Dials circulares estilo editorial: arco 270 grados con ticks radiantes
- Numero central en DM Mono Bold 20px
- Label debajo en DM Sans 11px overline
- Layout: 2x2 grid en mobile, 4 en fila en desktop
- Animacion: valor entra con transicion ease-out 400ms

## Dependencies
- US-042-001 (header de zona)
- F-046 (sensores deben existir para tener lecturas)
- Fase 0: schema DB (environmental_readings, sensors, cultivars)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-042-003: Lista de batches en zona y estructuras

## User Story

**As a** supervisor,
**I want** ver la lista de batches actualmente en la zona y las estructuras fisicas,
**So that** sepa que lotes estan en produccion en este espacio y como esta configurada la infraestructura.

## Acceptance Criteria

### Scenario 1: Zona con batches activos
- **Given** la zona tiene 3 batches activos con distintas fases
- **When** se renderiza la seccion de batches
- **Then** se muestra una lista de cards con: codigo del batch (monospace), cultivar, fase actual (badge coloreado), plant_count, dias en fase
- **And** tap en un batch navega a batch-detail

### Scenario 2: Zona sin batches
- **Given** la zona no tiene batches activos
- **When** se renderiza la seccion de batches
- **Then** se muestra empty state "No hay batches en esta zona"
- **And** para supervisor/gerente se muestra CTA "Ver batches disponibles para mover"

### Scenario 3: Zona con estructuras
- **Given** la zona tiene 3 zone_structures tipo mobile_rack con 4 niveles cada una
- **When** se renderiza la seccion de estructuras
- **Then** se muestra una tabla con: nombre, tipo, dimensiones, niveles, capacidad (max_positions)
- **And** cada estructura es expandible para ver detalle de niveles

### Scenario 4: Zona sin estructuras
- **Given** la zona es de tipo open_field sin zone_structures
- **When** se renderiza la seccion de estructuras
- **Then** la seccion no se muestra (no hay tabla vacia)

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Navegacion a batch-detail funcional

## Technical Notes
- Pantalla: `area-zone-detail`
- Queries:
  - `SELECT * FROM batches WHERE zone_id = :zoneId AND status = 'active'`
  - `SELECT * FROM zone_structures WHERE zone_id = :zoneId`
- RLS: batches Tipo C (via zone -> facility -> company), zone_structures Tipo B

## UI/UX Notes
- Batches: cards tipo ListItem con barra izquierda coloreada por fase
- Estructuras: tabla colapsable, solo se muestra si existen
- Mobile: full-width cards, Desktop: 2 columnas lado a lado (batches | estructuras)

## Dependencies
- US-042-001 (header de zona)
- Fase 1: F-016/F-017 (batches existen)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-042-004: Historial ambiental 7 dias

## User Story

**As a** supervisor,
**I want** ver un grafico de lineas con el historial de temperatura, humedad y CO2 de los ultimos 7 dias,
**So that** pueda detectar tendencias y patrones ambientales, y verificar si hubo periodos fuera de rango.

## Acceptance Criteria

### Scenario 1: Historial con datos completos
- **Given** la zona tiene lecturas de temperatura, humedad y CO2 de los ultimos 7 dias
- **When** se renderiza el grafico de historial
- **Then** se muestra un grafico de lineas con eje X = tiempo (7 dias), eje Y = valor
- **And** cada parametro tiene su propia linea con color distintivo
- **And** el rango optimo del cultivar se muestra como banda sombreada verde
- **And** los puntos fuera de rango se resaltan con dot rojo

### Scenario 2: Seleccion de parametro individual
- **Given** el grafico muestra 3 parametros simultaneamente
- **When** el usuario hace tap en la leyenda de "Humedad"
- **Then** solo se muestra la linea de humedad con mas detalle
- **And** las otras lineas se ocultan o reducen opacidad

### Scenario 3: Sin datos historicos suficientes
- **Given** la zona tiene lecturas solo de las ultimas 12 horas
- **When** se renderiza el historial
- **Then** se muestra el grafico solo con los datos disponibles
- **And** se indica "Datos disponibles: ultimas 12 horas" como subtitulo

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Chart lazy loaded para performance
- [ ] Accesibilidad: tabla de datos alternativa accesible por screen reader

## Technical Notes
- Pantalla: `area-zone-detail`
- Query: `SELECT * FROM environmental_readings WHERE zone_id = :zoneId AND timestamp >= NOW() - INTERVAL '7 days' ORDER BY timestamp`
- Agrupacion: promediar por hora para reducir puntos (max ~168 puntos por parametro)
- Chart library: Recharts con `LineChart`, `Area` para banda optima
- Lazy loading del chart via `dynamic()` de Next.js

## UI/UX Notes
- Chart con fondo transparente sobre surface
- Ejes en #D4DDD6, labels en DM Mono 10px
- Lineas: temperatura=#DC2626, humedad=#0891B2, CO2=#5A6B5E
- Banda optima: fill verde con opacidad 10%
- Tooltip al hover con valor exacto + timestamp

## Dependencies
- US-042-002 (dials de clima, comparten datos de sensores)
- F-046 (sensores configurados)

## Estimation
- **Size**: M
- **Complexity**: Medium
