# F-035: Genealogia Visual de Batch

## Overview

Visualizacion de la genealogia completa de un batch: arbol genealogico interactivo tipo tree diagram que muestra splits y merges como ramas y convergencias, y tabla cronologica de todas las operaciones de lineage. Permite navegar visualmente la historia de un lote desde su origen hasta sus derivados, manteniendo trazabilidad completa para auditorias y analisis de produccion.

## User Personas

- **Supervisor**: Revisa el historial de splits/merges para entender la historia de un batch y sus derivados.
- **Gerente**: Analiza la genealogia completa para auditorias de trazabilidad y reportes regulatorios.
- **Viewer**: Consulta read-only de la genealogia para reportes e inspecciones.
- **Admin**: Acceso completo con capacidad de ver toda la cadena genealogica.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-035-001 | Arbol genealogico visual | M | P0 | Planned |
| US-035-002 | Tabla cronologica de operaciones | S | P0 | Planned |
| US-035-003 | Navegacion interactiva entre nodos | S | P1 | Planned |

---

# US-035-001: Arbol genealogico visual

## User Story

**As a** gerente,
**I want** ver un diagrama de arbol visual que muestre la genealogia completa de un batch con splits como ramas y merges como convergencias,
**So that** pueda entender de un vistazo toda la historia de derivaciones del lote para trazabilidad y auditorias.

## Acceptance Criteria

### Scenario 1: Arbol con splits simples
- **Given** LOT-001 tuvo 2 splits: LOT-001-A (8 plantas) y LOT-001-B (6 plantas)
- **When** el gerente accede a batch-genealogy de LOT-001
- **Then** se muestra un arbol con LOT-001 como raiz y dos ramas: LOT-001-A y LOT-001-B
- **And** cada nodo muestra: codigo, plant_count, status (badge coloreado)
- **And** las lineas de conexion indican la operacion (split)

### Scenario 2: Arbol con splits anidados
- **Given** LOT-001 -> LOT-001-A -> LOT-001-A-1 (arbol de 3 niveles)
- **When** el gerente ve la genealogia
- **Then** el arbol muestra los 3 niveles correctamente con lineas de conexion
- **And** el layout se ajusta automaticamente al tamano del arbol

### Scenario 3: Arbol con merge
- **Given** LOT-001-A y LOT-001-B se reunificaron (merge) en LOT-001
- **When** el gerente ve la genealogia
- **Then** se muestran las lineas de LOT-001-A y LOT-001-B convergiendo hacia LOT-001
- **And** la operacion de merge se indica visualmente (flechas convergentes)

### Scenario 4: Batch sin genealogia
- **Given** LOT-002 nunca fue spliteado ni es hijo de un split
- **When** el gerente accede a batch-genealogy de LOT-002
- **Then** se muestra el nodo unico de LOT-002 con mensaje "Este batch no tiene historial de splits ni merges"

### Scenario 5: Arbol grande (muchos niveles)
- **Given** un batch tiene mas de 10 nodos en su arbol genealogico
- **When** el gerente ve la genealogia
- **Then** el arbol es scrollable horizontalmente y verticalmente
- **And** se puede hacer zoom in/out con gestos (pinch) o controles

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Diagram responsive y navegable
- [ ] Accesible con aria-labels en nodos

## Technical Notes
- Pantalla: `batch-genealogy`
- Query recursiva: `batch_lineage` con CTE recursivo para obtener todo el arbol desde cualquier nodo
  ```sql
  WITH RECURSIVE tree AS (
    SELECT * FROM batch_lineage WHERE parent_batch_id = :rootId OR child_batch_id = :rootId
    UNION
    SELECT bl.* FROM batch_lineage bl JOIN tree t ON bl.parent_batch_id = t.child_batch_id
  )
  ```
- Encontrar la raiz: navegar parent_batch_id hasta encontrar un batch sin parent
- SVG custom para el diagrama (no Recharts - diagrama de arbol custom)
- Alternativa: usar libreria como react-d3-tree o custom SVG
- Datos del nodo: batch code, plant_count, status, current_phase
- Datos de la arista: operation (split/merge), quantity, performed_at, reason

## UI/UX Notes
- Layout tipo arbol vertical (raiz arriba) o horizontal (raiz izquierda)
- Nodos como cards mini: codigo (DM Mono bold), plant_count, status badge
- Color de nodo por status: active=verde, completed=gris, on_hold=amarillo, cancelled=rojo
- Lineas de conexion: solidas para split, punteadas para merge
- Zoom/pan via gestos en mobile, scroll en desktop
- Tap en nodo -> navega al detalle del batch

## Dependencies
- F-034 (Split de batch) para que existan registros de lineage
- F-016/F-017 (Batches) de Fase 1

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-035-002: Tabla cronologica de operaciones

## User Story

**As a** supervisor,
**I want** ver una tabla cronologica con todas las operaciones de split y merge de un batch,
**So that** pueda revisar el historial detallado con fechas, cantidades, razones y responsables.

## Acceptance Criteria

### Scenario 1: Tabla con operaciones
- **Given** LOT-001 tiene 3 operaciones de lineage: 2 splits y 1 merge
- **When** el supervisor accede a la seccion de tabla en batch-genealogy
- **Then** se muestra tabla con columnas: fecha, operacion (split/merge badge), batch origen, batch destino, cantidad transferida, razon, responsable
- **And** se ordena por performed_at DESC (mas recientes primero)

### Scenario 2: Detalle de operacion
- **Given** la tabla muestra una operacion de split
- **When** el supervisor hace tap en la fila
- **Then** se expande o muestra panel con detalle completo: razon (texto completo), codigo del batch hijo creado, link al batch hijo, usuario que ejecuto, timestamp exacto

### Scenario 3: Sin operaciones
- **Given** LOT-002 no tiene registros en batch_lineage
- **When** el supervisor ve la tabla
- **Then** se muestra empty state "No hay operaciones de split o merge para este batch"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified

## Technical Notes
- Query: `batch_lineage WHERE parent_batch_id = :id OR child_batch_id = :id` JOIN `batches`, `users` ORDER BY performed_at DESC
- Buscar en ambas direcciones (como parent y como child) para mostrar historial completo
- Si el batch actual es hijo: mostrar la operacion de split que lo creo

## UI/UX Notes
- Tabla debajo del arbol visual, o en tab separada "Historial"
- Badge de operacion: "Split" en naranja, "Merge" en azul
- Cantidad en DM Mono
- Razon truncada en tabla, completa en detalle expandido
- Responsable: nombre completo con avatar mini

## Dependencies
- US-035-001 (Arbol genealogico) para compartir pantalla
- F-034 (Split/Merge) para datos de lineage

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-035-003: Navegacion interactiva entre nodos

## User Story

**As a** gerente,
**I want** hacer tap en cualquier nodo del arbol genealogico y navegar directamente al detalle de ese batch,
**So that** pueda inspeccionar rapidamente cualquier batch derivado sin perder el contexto genealogico.

## Acceptance Criteria

### Scenario 1: Tap en nodo navega a detalle
- **Given** el arbol muestra LOT-001 con hijos LOT-001-A y LOT-001-B
- **When** el gerente hace tap en el nodo LOT-001-A
- **Then** navega a la pantalla batch-detail de LOT-001-A
- **And** desde ahi puede acceder a la genealogia de LOT-001-A

### Scenario 2: Breadcrumb de genealogia
- **Given** el gerente navego desde genealogia de LOT-001 al detalle de LOT-001-A
- **When** ve la barra de navegacion
- **Then** los breadcrumbs muestran: Batches > LOT-001 > Genealogia > LOT-001-A

### Scenario 3: Tooltip en hover/long-press
- **Given** el arbol muestra multiples nodos
- **When** el gerente hace hover (desktop) o long-press (mobile) en un nodo
- **Then** se muestra tooltip con info adicional: cultivar, fase actual, dias en produccion, zona
- **And** el tooltip tiene link "Ver detalle" y "Ver genealogia"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Navegacion fluida entre genealogia y detalle

## Technical Notes
- Links via Next.js Link component para navegacion client-side
- Tooltip custom con datos pre-fetched del nodo
- Breadcrumbs dinamicos basados en la ruta de navegacion
- Pre-fetch de datos de nodos vecinos para navegacion rapida

## UI/UX Notes
- Nodos del arbol como elementos clickables con hover state
- Tooltip: card flotante con info basica del batch
- Transicion suave al navegar entre nodos
- Boton "Volver a genealogia" visible en batch-detail cuando se llego desde genealogia

## Dependencies
- US-035-001 (Arbol genealogico)
- Pantalla batch-detail (Fase 1)

## Estimation
- **Size**: S
- **Complexity**: Medium
