# F-021: Lista de Actividades de Hoy

## Overview

La pantalla de actividades de hoy es la principal herramienta del operador. Presenta una timeline visual por hora con las actividades del dia, coloreadas por tipo, con quick-complete (swipe) para actividades rutinarias. Las actividades vencidas aparecen en una seccion sticky al tope para asegurar visibilidad. Filtros permiten ver pendientes, completadas o todas.

## User Personas

- **Operador**: Principal usuario. Ve sus actividades del dia, las completa en orden, usa quick-complete para tareas rutinarias.
- **Supervisor**: Revisa las actividades de todos los operadores de sus zonas para monitorear avance.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-021-001 | Timeline visual de actividades del dia | M | P0 | Done |
| US-021-002 | Activity cards con datos y color-coding por tipo | M | P0 | Done |
| US-021-003 | Quick-complete (swipe) para actividades rutinarias | M | P1 | Deferred |
| US-021-004 | Seccion sticky de actividades vencidas | S | P0 | Done |
| US-021-005 | Filtros: pendientes, completadas, todas | S | P1 | Done |

---

# US-021-001: Timeline visual de actividades del dia

## User Story

**As a** operador,
**I want** ver mis actividades del dia organizadas en una timeline visual por hora, con las actividades posicionadas en su hora planificada,
**So that** pueda planificar mi jornada de trabajo y saber que debo hacer en cada momento.

## Acceptance Criteria

### Scenario 1: Ver timeline con actividades distribuidas por hora
- **Given** el operador tiene 6 actividades para hoy: 2 a las 7am, 1 a las 9am, 2 a las 11am, 1 a las 3pm
- **When** navega a la pantalla act-today
- **Then** se muestra una timeline vertical con eje de horas, y las cards posicionadas en su hora planificada. Las horas sin actividades muestran espacio vacio

### Scenario 2: Dia sin actividades
- **Given** el operador no tiene actividades programadas para hoy
- **When** navega a act-today
- **Then** se muestra empty state "No hay actividades para hoy. Disfruta el descanso." o "Consulta con tu supervisor si necesitas tareas adicionales."

### Scenario 3: Header contextual con resumen del dia
- **Given** el operador tiene 8 actividades: 5 pendientes, 3 completadas
- **When** se renderiza la pantalla
- **Then** el header muestra: fecha actual, total "8 actividades", filtro rapido: "Pendientes (5)" | "Completadas (3)" | "Todas (8)"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Timeline responsive en mobile
- [ ] Criterios de aceptacion verificados
- [ ] Skeleton loader para carga

## Technical Notes
- **Query**: scheduled_activities WHERE planned_date=today AND assigned_to=currentUser, JOIN activity_templates, batches, zones
- Ordenar por hora planificada (extraer de planned_date o campo adicional planned_time)
- **Pantalla**: act-today
- Pull-to-refresh para sincronizar nuevas actividades asignadas

## UI/UX Notes
- Eje vertical con horas del dia (6am a 8pm)
- Cards posicionadas junto a su hora
- Actividades completadas: checkmark + estilo muted (opacity reducida)
- Pendientes: coloreadas por tipo
- Pull-to-refresh disponible
- Scroll a la hora actual al cargar

## Dependencies
- F-020 (actividades programadas existentes)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-021-002: Activity cards con datos y color-coding por tipo

## User Story

**As a** operador,
**I want** que cada actividad se muestre como una card con titulo, batch, zona, hora, y una barra de color a la izquierda que identifique el tipo de actividad visualmente,
**So that** pueda distinguir rapidamente entre fertirrigacion, poda, cosecha y otras actividades de un vistazo.

## Acceptance Criteria

### Scenario 1: Card muestra todos los datos relevantes
- **Given** existe una actividad programada de Fertirrigacion para batch LOT-001 a las 9am
- **When** se renderiza en la timeline
- **Then** la card muestra: barra izquierda verde (fertirrigacion), titulo "Fertirrigacion — LOT-001", subtitulo "Sala Veg A | 9:00 AM", badge de estado "Pendiente", chevron derecho para navegar al detalle

### Scenario 2: Color-coding por tipo de actividad
- **Given** existen actividades de diferentes tipos
- **When** se renderizan las cards
- **Then** cada tipo tiene un color distinto: fertirrigacion=verde, poda=naranja, cosecha=rojo, trasplante=azul, inspeccion=cyan, fumigacion=morado

### Scenario 3: Tap en card navega a ejecutar actividad
- **Given** la card de una actividad pendiente esta visible
- **When** el operador hace tap en la card
- **Then** navega a la pantalla act-execute para esa actividad

### Scenario 4: Card de actividad completada
- **Given** una actividad fue completada a las 10:15am
- **When** se renderiza en la timeline
- **Then** la card muestra checkmark, estilo muted, duracion registrada "32 min", y el texto cambia de "Pendiente" a "Completada 10:15"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Componente ActivityCard reutilizable
- [ ] Colores definidos por tipo de actividad
- [ ] Criterios de aceptacion verificados
- [ ] Touch target minimo 44px

## Technical Notes
- Componente reutilizable: `<ActivityCard>` usado en act-today, batch-detail tab actividades, dashboard
- Color-coding definido como constante/config: ACTIVITY_COLORS = {fertigation: '#059669', pruning: '#D97706', harvest: '#DC2626', ...}
- **Pantalla**: act-today, reutilizable

## UI/UX Notes
- Barra izquierda de 4px con color del tipo
- Titulo: tipo + batch code (DM Sans SemiBold 16px)
- Subtitulo: zona + hora (DM Sans Regular 12px, color secondary)
- Badge de estado a la derecha
- Chevron para indicar navegacion
- Height: 64-72px segun contenido

## Dependencies
- US-021-001

## Estimation
- **Size**: M
- **Complexity**: Low

---

# US-021-003: Quick-complete (swipe) para actividades rutinarias

## User Story

**As a** operador,
**I want** completar rapidamente una actividad rutinaria deslizando la card hacia la derecha, usando los valores por defecto del template,
**So that** pueda marcar como completadas las actividades repetitivas (como riego diario) sin tener que pasar por todo el formulario de ejecucion.

## Acceptance Criteria

### Scenario 1: Swipe derecha completa actividad con valores default
- **Given** una actividad de Riego diario con template que tiene recursos y checklist pre-definidos
- **When** el operador desliza la card hacia la derecha
- **Then** la actividad se completa con los valores por defecto del template_snapshot: recursos con quantity_actual = quantity_planned, checklist items todos completados, duracion = estimated_duration_min. Toast: "Actividad completada. Deshacer (5s)"

### Scenario 2: Undo disponible por 5 segundos
- **Given** el operador acaba de quick-complete una actividad
- **When** hace clic en "Deshacer" dentro de 5 segundos
- **Then** la actividad vuelve a status='pending' y los recursos/transacciones generados se revierten

### Scenario 3: Actividad con items criticos no permite quick-complete
- **Given** la actividad tiene checklist items con is_critical=true que requieren valor medido
- **When** el operador intenta swipe
- **Then** la animacion de swipe se bloquea y se muestra tooltip "Esta actividad requiere verificacion manual. Tap para ejecutar."

### Scenario 4: Quick-complete offline
- **Given** el operador no tiene conexion
- **When** hace swipe para completar
- **Then** la actividad se marca como completada localmente (Dexie), la card se actualiza visualmente, y la mutacion se encola en syncQueue para sincronizar al reconectar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Gesto swipe funcional en touch y mouse
- [ ] Undo funcional con timer de 5 segundos
- [ ] Bloqueo para actividades con items criticos
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Quick-complete llama a `executeActivity` con payload auto-generado desde template_snapshot
- Actividades con items is_critical=true y expected_value: NO elegibles para quick-complete
- Undo: no enviar al server hasta que pasen 5s. Si undo: cancelar la mutacion. Si no undo: ejecutar Server Action
- Offline: encolar en syncQueue de Dexie
- **Genera**: INSERT activities, activity_resources, inventory_transactions (consumo)

## UI/UX Notes
- Animacion de swipe: background verde se revela al deslizar, con checkmark
- Threshold: 50% del ancho de la card para activar
- Feedback haptico (si disponible en el dispositivo)
- Toast con boton "Deshacer" con countdown visual de 5s
- Cards no elegibles: sin animacion de swipe, tooltip explicativo

## Dependencies
- US-021-002, F-022 (executeActivity como Server Action)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-021-004: Seccion sticky de actividades vencidas

## User Story

**As a** operador,
**I want** ver las actividades vencidas en una seccion fija (sticky) en la parte superior de la pantalla que permanezca visible al hacer scroll,
**So that** nunca olvide que tiene tareas atrasadas que requieren atencion inmediata.

## Acceptance Criteria

### Scenario 1: Actividades vencidas visibles en sticky
- **Given** el operador tiene 2 actividades de ayer con status='overdue'
- **When** navega a act-today
- **Then** se muestra una seccion sticky en el tope con fondo warning (amarillo/naranja) mostrando: "2 actividades vencidas" con cards compactas de las actividades atrasadas. La seccion permanece visible al hacer scroll

### Scenario 2: Sin actividades vencidas no muestra seccion
- **Given** todas las actividades estan al dia
- **When** se renderiza la pantalla
- **Then** no aparece la seccion sticky y la timeline empieza directamente

### Scenario 3: Completar actividad vencida la remueve del sticky
- **Given** hay 2 actividades en el sticky de vencidas
- **When** el operador completa una de ellas
- **Then** se remueve del sticky, quedando solo 1. Si se completan todas, la seccion desaparece

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Sticky funcional con scroll
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Query**: scheduled_activities WHERE assigned_to=currentUser AND planned_date < today AND status='overdue'
- Seccion sticky: CSS position:sticky con z-index alto
- Actualizar en tiempo real al completar actividades

## UI/UX Notes
- Background: warning color (#D97706) con opacidad baja
- Borde pulsante para llamar atencion
- Cards compactas: solo titulo, batch y fecha vencida
- Boton "Ver todas" si hay mas de 3 vencidas
- Tap en card navega a act-execute

## Dependencies
- US-021-001, US-021-002

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-021-005: Filtros: pendientes, completadas, todas

## User Story

**As a** operador,
**I want** filtrar mis actividades del dia entre pendientes, completadas y todas,
**So that** pueda enfocarme en lo que falta o revisar lo que ya complete.

## Acceptance Criteria

### Scenario 1: Filtro pendientes (default)
- **Given** el operador tiene 5 pendientes y 3 completadas
- **When** navega a act-today (default) o selecciona "Pendientes"
- **Then** se muestran solo las 5 actividades pendientes + las vencidas

### Scenario 2: Filtro completadas
- **Given** hay actividades completadas hoy
- **When** selecciona "Completadas"
- **Then** se muestran solo las actividades completadas con hora de completitud

### Scenario 3: Filtro todas
- **Given** hay actividades en multiples estados
- **When** selecciona "Todas"
- **Then** se muestran todas las actividades del dia en orden cronologico, con estado visual diferenciado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Filtro por defecto: "Pendientes"
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Filtro client-side (los datos ya estan cargados para la timeline)
- Default: pendientes + overdue
- Badge de count en cada filtro

## UI/UX Notes
- Pills/chips en el header: "Pendientes (5)" | "Completadas (3)" | "Todas (8)"
- Counts actualizados dinamicamente al completar actividades
- Filtro activo resaltado con brand color

## Dependencies
- US-021-001

## Estimation
- **Size**: S
- **Complexity**: Low
