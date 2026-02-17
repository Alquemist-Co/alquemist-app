# F-016: Lista de Batches con Filtros y Vistas

## Overview

La lista de batches es una de las pantallas mas visitadas del sistema. Muestra todos los lotes de produccion activos con filtros por estado, fase, zona y cultivar, con opciones de vista lista y grid. Cada batch card muestra el codigo, fase actual como badge, plant_count, progress bar del avance por fases, y un indicador de salud basado en alertas activas. Es la puerta de entrada al detalle de batch.

## User Personas

- **Operador**: Consulta batches asignados a su zona para ver contexto de sus actividades.
- **Supervisor**: Principal usuario. Gestiona batches de sus zonas, filtra por fase y estado.
- **Gerente**: Revisa todos los batches con vision global, analiza progreso.
- **Admin**: Acceso completo.
- **Viewer**: Consulta en modo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-016-001 | Lista de batches con cards y datos clave | M | P0 | Planned |
| US-016-002 | Filtros combinables (estado, fase, zona, cultivar) | M | P0 | Planned |
| US-016-003 | Selector de vista lista/grid y sorting | S | P1 | Planned |

---

# US-016-001: Lista de batches con cards y datos clave

## User Story

**As a** supervisor,
**I want** ver una lista de batches con cards que muestren codigo, cultivar, fase actual, zona, cantidad de plantas, progreso y salud de cada lote,
**So that** pueda tener una vision rapida del estado de produccion de mis zonas.

## Acceptance Criteria

### Scenario 1: Ver lista de batches con datos completos
- **Given** existen 15 batches activos en el sistema
- **When** el supervisor navega a la pantalla batch-list
- **Then** se muestran cards con: codigo en DM Mono bold, cultivar name, fase actual como badge coloreado, zona, plant_count, dias en produccion, mini progress bar (fases completadas / total), health indicator (verde/amarillo/rojo segun alertas)

### Scenario 2: Health indicator basado en alertas
- **Given** el batch LOT-001 tiene 2 alertas activas de severidad 'warning' y LOT-002 tiene 1 alerta 'critical'
- **When** se renderiza la lista
- **Then** LOT-001 muestra indicador amarillo, LOT-002 muestra indicador rojo, y batches sin alertas muestran indicador verde

### Scenario 3: Lista vacia
- **Given** no existen batches en el sistema
- **When** el usuario navega a batch-list
- **Then** se muestra empty state con ilustracion de planta germinando: "No hay batches activos. Crea una orden de produccion para comenzar." con CTA "Ir a Ordenes"

### Scenario 4: Tap en card navega al detalle
- **Given** la lista muestra batches
- **When** el usuario hace tap en la card de LOT-001
- **Then** navega a batch-detail del batch LOT-001

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Virtual scrolling para listas > 50 items
- [ ] Criterios de aceptacion verificados
- [ ] Skeleton loader replicando layout de cards

## Technical Notes
- **Query**: batches JOIN cultivars, production_phases (current), zones, LEFT JOIN alerts (para health indicator)
- **Pantalla**: batch-list
- Health indicator: COUNT(alerts WHERE entity_type='batch' AND entity_id=batch.id AND resolved_at IS NULL) — 0=verde, warning=amarillo, critical=rojo
- Progress bar: basada en production_order_phases si existe orden, o posicion relativa de current_phase en total fases del crop_type

## UI/UX Notes
- Cards con barra de color izquierda (color de la fase actual)
- Codigo en DM Mono Bold, cultivar en DM Sans
- Fase actual como badge con color semantico
- Mini progress bar debajo del contenido principal
- Health indicator como dot coloreado en esquina superior derecha
- Swipe left en mobile: acciones rapidas (ver, crear observacion)

## Dependencies
- F-014 (batches deben existir)
- F-011 (fases configuradas)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-016-002: Filtros combinables (estado, fase, zona, cultivar)

## User Story

**As a** supervisor,
**I want** filtrar la lista de batches por estado, fase actual, zona y cultivar, combinando multiples filtros simultaneamente,
**So that** pueda encontrar rapidamente los batches que me interesan entre potencialmente cientos de lotes.

## Acceptance Criteria

### Scenario 1: Filtrar por estado
- **Given** existen batches con status active, completed y on_hold
- **When** el supervisor selecciona el chip "Activos"
- **Then** solo se muestran batches con status='active'

### Scenario 2: Combinar multiples filtros
- **Given** existen batches de multiples cultivares en varias zonas
- **When** el supervisor selecciona estado="Activo" + zona="Sala Floracion" + cultivar="Gelato"
- **Then** se muestran solo los batches que cumplen los 3 criterios simultaneamente

### Scenario 3: Buscar por codigo de batch
- **Given** existen 50 batches
- **When** el supervisor escribe "LOT-001" en la barra de busqueda
- **Then** se filtran los batches cuyo codigo contiene "LOT-001"

### Scenario 4: Remover filtro individual
- **Given** hay 2 filtros activos: estado="Activo" y zona="Sala Floracion"
- **When** el supervisor hace clic en la "x" del chip zona
- **Then** se remueve solo el filtro de zona, manteniendo el filtro de estado activo, y la lista se actualiza

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Filtros persistentes en URL (query params) para compartir
- [ ] Criterios de aceptacion verificados
- [ ] Filtros accesibles por teclado

## Technical Notes
- Filtros como query params en la URL para deep linking: `/batches?status=active&zone_id=xxx`
- Dropdowns de fase filtrados por crop_type si hay un cultivar seleccionado
- Zustand store para estado de filtros con sync a URL

## UI/UX Notes
- Barra de filtros con chips removibles en la parte superior
- Search bar para codigo de batch
- Cada chip muestra label + "x" para remover
- Dropdown de opciones con search integrado para listas largas (zonas, cultivares)
- Badge con count de resultados: "12 batches"

## Dependencies
- US-016-001

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-016-003: Selector de vista lista/grid y sorting

## User Story

**As a** supervisor,
**I want** alternar entre vista lista (default mobile) y vista grid (default desktop), y ordenar los batches por diferentes criterios,
**So that** pueda elegir la presentacion mas comoda segun mi dispositivo y encontrar batches rapidamente segun mi necesidad.

## Acceptance Criteria

### Scenario 1: Vista grid en desktop
- **Given** el supervisor esta en desktop (>= 1024px) con vista grid por default
- **When** se carga la pantalla
- **Then** las batch cards se muestran en grid de 2-3 columnas con mas informacion visible por card

### Scenario 2: Toggle entre vista lista y grid
- **Given** el supervisor esta en vista grid
- **When** hace clic en el icono de vista lista
- **Then** la vista cambia a lista vertical con cards compactas, y la preferencia se persiste en localStorage

### Scenario 3: Ordenar por diferentes criterios
- **Given** la lista de batches esta visible
- **When** el supervisor selecciona "Ordenar por: Fase"
- **Then** los batches se agrupan y ordenan por fase actual (sort_order), y el selector muestra la opcion activa

### Scenario 4: Sorting se mantiene al filtrar
- **Given** el supervisor tiene sorting por "Zona" activo
- **When** aplica un filtro adicional de estado="Activo"
- **Then** los resultados filtrados mantienen el ordenamiento por zona

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Preferencia de vista persistida en localStorage
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Opciones de sorting: mas recientes (default), codigo A-Z, fase (sort_order), zona, cultivar
- Vista preferida almacenada en localStorage: `batch-list-view-mode`
- Sorting sticky al scrollear

## UI/UX Notes
- Toggle icons: lista (filas) y grid (cuadricula) en el header junto al sorting
- Dropdown de sorting con opciones claras
- En vista grid: cards mas grandes con mas datos. En lista: cards compactas una debajo de otra
- Mobile siempre en vista lista

## Dependencies
- US-016-001

## Estimation
- **Size**: S
- **Complexity**: Low
