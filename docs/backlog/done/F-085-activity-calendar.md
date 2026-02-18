# F-085: Calendario de Actividades (Supervisor)

## Overview

Proporciona a supervisores y gerentes una vista de calendario semanal y mensual de todas las actividades programadas, con capacidad de reprogramar arrastrando actividades entre dias (desktop) o via bottom sheet (mobile). Actualmente el sistema solo ofrece una lista plana de actividades del dia (F-021), sin vision temporal extendida. Este feature implementa el flujo ACT-F04 del documento de flujos: vista semanal con grid dias x batches, drag-and-drop para reprogramar, y filtros por zona/status/tipo.

El calendario es la herramienta principal del supervisor para planificar y redistribuir carga de trabajo del equipo operativo.

## User Personas

- **Supervisor**: Planifica y reprograma actividades del equipo. Usa el calendario diariamente para distribuir carga de trabajo y reaccionar a imprevistos. Acceso completo de lectura y escritura.
- **Gerente (Manager)**: Consulta el calendario para entender el estado operativo y la carga de trabajo. Puede reprogramar actividades.
- **Viewer**: Consulta el calendario en modo solo lectura. No puede reprogramar.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-085-001 | Vista semanal del calendario | M | P0 | Planned |
| US-085-002 | Vista mensual del calendario | M | P1 | Planned |
| US-085-003 | Reprogramar actividad (drag desktop / tap mobile) | M | P0 | Planned |
| US-085-004 | Filtros y navegacion temporal | S | P1 | Planned |

---

# US-085-001: Vista semanal del calendario

## User Story

**As a** supervisor,
**I want** ver un calendario semanal con las actividades programadas organizadas por dia y batch,
**So that** pueda tener una vision clara de la carga de trabajo de la semana y detectar dias sobrecargados o vacios.

## Acceptance Criteria

### Scenario 1: Visualizar semana actual con actividades
- **Given** existen 12 scheduled_activities para la semana actual distribuidas en 3 batches
- **When** el supervisor navega a /activities/calendar
- **Then** ve un grid semanal: 7 columnas (Lun-Dom) con fechas, filas por batch. Cada celda contiene cards de actividades programadas para ese dia+batch. Las cards muestran nombre del template (truncado), badge de status (pending/overdue/completed/skipped), y borde de color por tipo de actividad.

### Scenario 2: Actividades coloreadas por tipo
- **Given** hay actividades de tipo "Fertirrigacion" (verde), "Poda" (naranja), "Cosecha" (rojo) en la semana
- **When** el supervisor ve el calendario
- **Then** cada card tiene un borde izquierdo coloreado segun el tipo de actividad, usando la misma logica de color que F-021 (normalized name to CSS border class)

### Scenario 3: Semana sin actividades
- **Given** no hay actividades programadas para la semana seleccionada
- **When** el supervisor ve el calendario
- **Then** ve un empty state centrado: "No hay actividades programadas esta semana" con sugerencia de navegar a otras semanas

### Scenario 4: Indicadores de sobrecarga
- **Given** un dia tiene mas de 8 actividades para un batch
- **When** el supervisor ve ese dia
- **Then** se muestran las primeras 3-4 cards y un indicador "+5 mas" que al tocar expande la celda o abre un listado completo

### Scenario 5: Actividades overdue resaltadas
- **Given** hay 2 actividades con status='overdue' (fecha pasada, no completadas)
- **When** el supervisor ve el calendario
- **Then** las cards overdue tienen fondo rojo tenue y badge "Vencida" para llamar la atencion inmediata

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Grid semanal responsive: scroll horizontal en mobile, grid completo en desktop
- [ ] Server Action para query de actividades por rango de fechas
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: navegacion por teclado, aria-labels en celdas, contraste AA

## Technical Notes
- **Server Action**: `getCalendarActivities(startDate, endDate, filters)` en `src/lib/actions/calendar.ts` — query scheduled_activities con JOINs a batches (code, cultivar), activity_templates (name, activity_type), zones (name). Filtro por company_id via RLS + facility_id del usuario.
- **Query**: `SELECT sa.*, b.code as batch_code, b.cultivar_id, at.name as template_name, at.activity_type_id, aty.name as type_name FROM scheduled_activities sa JOIN batches b ON sa.batch_id = b.id JOIN activity_templates at ON sa.template_id = at.id JOIN activity_types aty ON at.activity_type_id = aty.id WHERE sa.planned_date BETWEEN $start AND $end ORDER BY sa.planned_date, b.code`
- **Ruta**: `/activities/calendar` — Server Component wrapper + Client Component para el calendario interactivo
- **Color mapping**: Reutilizar la logica de F-021 (`getActivityColor(typeName)`) para consistency
- **Layout**: Desktop: grid completo visible. Mobile: columnas de dias con scroll horizontal, fila de batches con scroll vertical. Considerar que el grid puede ser grande.

## UI/UX Notes
- Header: nombre del mes + ano, botones de navegacion (< semana anterior | Hoy | semana siguiente >)
- Columnas: una por dia (Lun-Dom), header con nombre del dia + fecha (ej: "Lun 23")
- Filas: una por batch activo que tiene actividades en la semana. Header de fila con batch code + cultivar badge
- Celdas: 0-N cards de actividades. Card minimal: borde color izquierdo, nombre truncado (1 linea), badge status
- Dia actual resaltado con fondo sutil
- Desktop: ancho minimo de celda 120px, altura auto segun contenido
- Mobile: scroll horizontal con snap por dia, o vista de 3 dias visibles

## Dependencies
- F-020 (scheduled_activities generadas desde schedules)
- F-021 (color mapping por tipo de actividad)
- F-004 (auth y middleware — role-based access)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-085-002: Vista mensual del calendario

## User Story

**As a** supervisor,
**I want** ver un calendario mensual con indicadores de densidad de actividades por dia,
**So that** pueda planificar a mediano plazo e identificar semanas con alta o baja carga de trabajo.

## Acceptance Criteria

### Scenario 1: Visualizar mes actual con densidad de actividades
- **Given** existen 45 scheduled_activities distribuidas a lo largo del mes
- **When** el supervisor cambia a vista mensual
- **Then** ve un grid de calendario mensual clasico (7 columnas x 4-6 filas). Cada celda muestra la fecha y un indicador de densidad: dot indicators coloreados (1-3 dots segun cantidad de actividades) o un numero total.

### Scenario 2: Tap en dia para ver detalle
- **Given** el dia 15 tiene 8 actividades programadas
- **When** el supervisor toca la celda del dia 15
- **Then** se abre un popover (desktop) o bottom sheet (mobile) con la lista de actividades de ese dia: template name, batch code, status badge. Cada item es tappable para navegar al detalle.

### Scenario 3: Indicadores de status por dia
- **Given** el dia 10 tiene 3 actividades completadas, 2 pendientes y 1 overdue
- **When** el supervisor ve la celda del dia 10
- **Then** los dots de densidad reflejan los status: dots verdes (completed), grises (pending), rojos (overdue). O un mini summary: "3/6 completadas"

### Scenario 4: Navegacion entre meses
- **Given** el supervisor esta viendo febrero 2026
- **When** toca la flecha "siguiente mes"
- **Then** el calendario cambia a marzo 2026 con sus actividades cargadas. La transicion es fluida sin flash de contenido.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Vista mensual con indicadores de densidad por dia
- [ ] Popover/bottom sheet con lista de actividades al tocar un dia
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: navegacion por teclado entre celdas, screen reader anuncia conteo de actividades

## Technical Notes
- **Query**: Reutilizar `getCalendarActivities(startDate, endDate, filters)` con rango de mes completo. Agrupar client-side por fecha.
- **Optimizacion**: Para la vista mensual, solo se necesita COUNT agrupado por dia y status. Considerar una query liviana: `SELECT planned_date, status, COUNT(*) FROM scheduled_activities WHERE planned_date BETWEEN $start AND $end GROUP BY planned_date, status`
- **Componente**: `MonthlyCalendar` en `src/components/activities/monthly-calendar.tsx`
- **Switch de vista**: Toggle en el header del calendario para cambiar entre Weekly y Monthly

## UI/UX Notes
- Grid clasico de calendario: 7 columnas (Lun-Dom), 4-6 filas segun mes
- Celda: numero de fecha (top-left), dots o badges de densidad (center/bottom)
- Dia actual: fondo accent sutil. Dias fuera del mes: texto muted
- Dias sin actividades: celda vacia (solo numero)
- Dias con actividades overdue: borde o fondo rojo tenue
- Toggle Weekly/Monthly: segmented control en el header (tabs con iconos CalendarDays / Calendar de Lucide)

## Dependencies
- US-085-001 (comparten la misma ruta y Server Action base)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-085-003: Reprogramar actividad (drag desktop / tap mobile)

## User Story

**As a** supervisor,
**I want** reprogramar una actividad arrastrando su card a otro dia (desktop) o seleccionando nueva fecha desde un bottom sheet (mobile),
**So that** pueda redistribuir carga de trabajo y reaccionar rapidamente a imprevistos sin salir del calendario.

## Acceptance Criteria

### Scenario 1: Drag-and-drop en desktop (vista semanal)
- **Given** el supervisor ve el calendario semanal en desktop y hay una actividad "Poda" programada para martes en LOT-001
- **When** arrastra la card de "Poda" del martes al jueves
- **Then** la actividad se mueve visualmente al jueves, se muestra un toast "Actividad reprogramada al jueves 25", y se actualiza `scheduled_activity.planned_date` en el servidor

### Scenario 2: Reprogramar via bottom sheet en mobile
- **Given** el supervisor ve el calendario en mobile y toca una actividad "Fertirrigacion" programada para lunes
- **When** se abre un bottom sheet con opciones: "Ver detalle", "Reprogramar", "Cancelar actividad"
- **Then** al tocar "Reprogramar" se muestra un date picker. Al seleccionar una nueva fecha y confirmar, la actividad se reprograma y el bottom sheet se cierra con toast de confirmacion.

### Scenario 3: No se puede reprogramar actividad completada
- **Given** una actividad tiene status='completed'
- **When** el supervisor intenta arrastrarla (desktop) o tocar "Reprogramar" (mobile)
- **Then** desktop: la card no es draggable (cursor normal, sin efecto). Mobile: la opcion "Reprogramar" no aparece en el bottom sheet.

### Scenario 4: Reprogramar a fecha pasada muestra warning
- **Given** el supervisor arrastra una actividad al dia de ayer
- **When** suelta la card en la celda de ayer
- **Then** el sistema muestra un dialog de confirmacion: "La fecha seleccionada ya paso. La actividad se marcara como vencida. Continuar?" con botones "Cancelar" y "Reprogramar de todas formas".

### Scenario 5: Reprogramar actividad skipped no es posible
- **Given** una actividad tiene status='skipped'
- **When** el supervisor intenta reprogramarla
- **Then** la accion no esta disponible. Desktop: card no draggable. Mobile: opcion no visible.

### Scenario 6: Log de reprogramacion
- **Given** el supervisor reprograma "Poda" de martes a jueves
- **When** la reprogramacion se completa
- **Then** se registra metadata en la scheduled_activity: `rescheduled_from` (fecha original), `rescheduled_by` (usuario), `rescheduled_at` (timestamp). Esta info es consultable en el detalle de la actividad.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Drag-and-drop funcional en desktop (vista semanal)
- [ ] Bottom sheet con date picker funcional en mobile
- [ ] Server Action con validacion de status (solo pending/overdue reprogramables)
- [ ] Log de reprogramacion registrado
- [ ] Criterios de aceptacion verificados
- [ ] Update optimista con rollback en caso de error

## Technical Notes
- **Server Action**: `rescheduleActivity(id, newDate)` en `src/lib/actions/calendar.ts` con `requireAuth(['supervisor', 'admin'])`. Valida que status IN ('pending', 'overdue'). UPDATE `scheduled_activities SET planned_date = newDate`. Si newDate < today, UPDATE status='overdue'.
- **Drag-and-drop**: Usar HTML5 Drag and Drop API nativo (no libreria externa). `draggable` attribute en cards, `onDragStart`/`onDragOver`/`onDrop` en celdas. Data transfer: `scheduledActivityId` + `newDate`.
- **Update optimista**: TanStack Query `onMutate` para mover la card inmediatamente, `onError` para revertir, `onSettled` para refetch.
- **Schema**: Agregar columnas opcionales a `scheduled_activities`: `rescheduled_from DATE`, `rescheduled_by UUID REFERENCES users(id)`, `rescheduled_at TIMESTAMPTZ`. Nullable — solo se llenan al reprogramar.
- **Mobile bottom sheet**: Reutilizar Dialog existente como bottom sheet. Date picker: `<input type="date">` nativo o componente custom.

## UI/UX Notes
- Desktop: cursor `grab` en cards draggable, `grabbing` durante drag. Ghost image de la card durante drag. Celda destino resaltada con borde dashed al hacer hover.
- Mobile: tap en card abre bottom sheet con 3 opciones: "Ver detalle" (navega), "Reprogramar" (date picker inline), "Cancelar actividad" (confirmacion)
- Feedback visual inmediato: la card se mueve al soltar (optimista), loading spinner sutil en la card si el server tarda
- Toast de confirmacion: "Poda reprogramada: Mar 23 → Jue 25"

## Dependencies
- US-085-001 (vista semanal donde se ejecuta el drag)
- F-002 (Dialog component para bottom sheet mobile)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-085-004: Filtros y navegacion temporal

## User Story

**As a** supervisor,
**I want** filtrar las actividades del calendario por zona, status y tipo de actividad, y navegar entre semanas/meses,
**So that** pueda enfocarme en un subconjunto relevante de actividades y no perderme en el volumen total.

## Acceptance Criteria

### Scenario 1: Filtrar por zona
- **Given** hay actividades en 4 zonas: Propagacion, Veg-1, Flor-1, Secado
- **When** el supervisor selecciona zona "Flor-1" en el filtro
- **Then** el calendario solo muestra actividades de batches que estan en Flor-1. Las demas zonas desaparecen del grid. Un badge indica "Filtro activo: Flor-1"

### Scenario 2: Filtrar por status
- **Given** hay actividades pending, completed, overdue y skipped
- **When** el supervisor selecciona status "overdue" en el filtro
- **Then** solo se muestran actividades con status='overdue'. Util para identificar rapidamente actividades vencidas.

### Scenario 3: Filtrar por tipo de actividad
- **Given** hay actividades de tipo Fertirrigacion, Poda, Cosecha, Trasplante
- **When** el supervisor selecciona tipo "Fertirrigacion"
- **Then** solo se muestran actividades cuyo template tiene activity_type='Fertirrigacion'

### Scenario 4: Combinar filtros
- **Given** el supervisor tiene filtro zona="Flor-1" activo
- **When** adicionalmente filtra por tipo="Poda"
- **Then** solo se muestran actividades de Poda en batches de Flor-1. Los filtros se combinan con AND.

### Scenario 5: Limpiar filtros
- **Given** hay 2 filtros activos (zona + tipo)
- **When** el supervisor toca "Limpiar filtros"
- **Then** todos los filtros se desactivan, el calendario vuelve a mostrar todas las actividades. El badge de filtro activo desaparece.

### Scenario 6: Navegacion semanal con botones y teclado
- **Given** el supervisor esta viendo la semana del 17-23 Feb 2026
- **When** toca la flecha derecha (o presiona tecla derecha en desktop)
- **Then** el calendario navega a la semana 24 Feb - 2 Mar 2026. El boton "Hoy" permite volver rapidamente a la semana actual.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Filtros por zona, status y tipo de actividad funcionales
- [ ] Filtros combinables con AND
- [ ] Navegacion temporal (semanas y meses) con boton "Hoy"
- [ ] Criterios de aceptacion verificados
- [ ] Filtros persisten en URL query params para shareability

## Technical Notes
- **URL params**: Los filtros se almacenan en query params: `?zone=uuid&status=overdue&type=uuid&view=weekly&date=2026-02-17`. Esto permite compartir una vista filtrada via URL y mantener estado al navegar.
- **Filtros client-side vs server-side**: El filtrado se hace server-side para no traer datos innecesarios. Los query params se pasan a `getCalendarActivities()`.
- **Componente**: `CalendarFilters` en `src/components/activities/calendar-filters.tsx` — barra de filtros con selects nativos o dropdowns
- **Datos para filtros**: Las opciones de zona y tipo se cargan una vez al montar (Server Component puede pasar como props). Status es una lista fija (pending, completed, overdue, skipped).
- **Navegacion**: `useSearchParams` + `router.replace` para cambiar la fecha sin perder filtros. Funciones helper: `getWeekStart(date)`, `getMonthStart(date)`, `addWeeks(date, n)`, `addMonths(date, n)`.

## UI/UX Notes
- Barra de filtros debajo del header de navegacion temporal, encima del grid
- 3 select dropdowns en linea: Zona (placeholder "Todas las zonas"), Status (placeholder "Todos los status"), Tipo (placeholder "Todos los tipos")
- Boton "Limpiar" visible solo cuando hay filtros activos
- Badge pill en cada filtro activo mostrando la seleccion
- Mobile: filtros colapsables bajo un boton "Filtros" con icono Filter de Lucide + badge con count de filtros activos
- Navegacion temporal: flechas < > a los lados del titulo de semana/mes, boton "Hoy" centrado

## Dependencies
- US-085-001 (vista semanal que recibe los filtros)
- US-085-002 (vista mensual que recibe los filtros)

## Estimation
- **Size**: S
- **Complexity**: Medium
