# Calendario de Actividades

## Metadata

- **Ruta**: `/activities/schedule`
- **Roles con acceso**: admin (lectura + re-programar + skip), manager (lectura + re-programar + skip), supervisor (lectura + re-programar + skip), operator (lectura — solo sus actividades asignadas), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para carga inicial de scheduled_activities, Client Component para calendario interactivo y filtros)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Vista calendario que muestra las actividades programadas de todos los batches activos. Es el punto de entrada para que supervisores y managers vean qué hay que hacer, cuándo, y en qué estado se encuentra cada actividad.

Los operarios ven solo las actividades asignadas a sus zonas/batches. Desde aquí se puede re-programar una actividad (cambiar fecha), marcarla como skipped, o navegar a la ejecución.

Usuarios principales: supervisores que planifican el día, managers que monitorean compliance de cronograma.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                            |
| ---------------------- | ----------- | -------------------------------------------------------------------------------- |
| scheduled_activities   | R/W         | Lectura para calendario, Write para re-programar (planned_date) y skip (status)  |
| activity_templates     | R           | Nombre y código del template, frecuencia, duración estimada                      |
| activity_types         | R           | Nombre del tipo de actividad (para filtros y display)                            |
| batches                | R           | Código, status, plant_count del batch asociado                                   |
| production_phases      | R           | Nombre de la fase actual del batch                                               |
| zones                  | R           | Nombre de la zona del batch                                                      |
| facilities             | R           | Nombre de la facility (para filtros)                                             |
| cultivars              | R           | Nombre del cultivar (para filtros)                                               |
| activities             | R           | Si completed_activity_id no es null, la actividad ya fue ejecutada (link)        |
| users                  | R           | Para filtro de asignación (operarios en la zona del batch)                       |

## ENUMs utilizados

| ENUM                      | Valores                                             | Tabla.campo                 |
| ------------------------- | --------------------------------------------------- | --------------------------- |
| scheduled_activity_status | pending \| completed \| skipped \| overdue          | scheduled_activities.status |
| activity_frequency        | daily \| weekly \| biweekly \| once \| on_demand     | activity_templates.frequency |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Calendario de Actividades" + badge con conteo de pendientes del día
  - Botón "Vista Calendario" / "Vista Lista" (toggle)
- **Barra de filtros** — Row de filtros combinables:
  - Select: Facility (todas por default)
  - Select: Zona (todas por default, filtrado por facility)
  - Select: Batch (todos por default, filtrado por zona)
  - Select: Tipo de actividad (todos por default)
  - Select: Status (pending, completed, skipped, overdue — multi-select, default=pending+overdue)
  - DatePicker rango: Fecha desde/hasta (default=semana actual)
  - Botón "Limpiar filtros"
- **Vista Calendario** (default) — Calendario semanal/mensual
  - Vista semanal por default (7 columnas = L-D)
  - Cada celda muestra mini-cards de actividades programadas para ese día
  - Mini-card: template name (truncado), batch code (badge), status badge (color)
    - pending: fondo blanco, borde izquierdo azul
    - overdue: fondo rojo claro, borde izquierdo rojo
    - completed: fondo verde claro, borde izquierdo verde
    - skipped: fondo gris claro, borde izquierdo gris, texto tachado
  - Navegación: flechas ← → para semana/mes anterior/siguiente + botón "Hoy"
  - Toggle: vista semanal / mensual
  - Click en celda de día → expande lista completa de ese día debajo del calendario
  - Click en mini-card → abre panel lateral con detalle
- **Vista Lista** (alternativa) — Tabla paginada
  - Columnas: Fecha, Día cultivo, Template (nombre + código), Tipo actividad, Batch (código + badge status), Fase, Zona, Status (badge), Duración est., Acciones
  - Ordenamiento por fecha (ascendente por default)
  - Paginación server-side (20 items por página)
- **Panel lateral de detalle** — Slide-over al hacer click en una actividad
  - Template: nombre, código, frecuencia, duración estimada
  - Batch: código (link), cultivar, fase, zona
  - Fecha planificada, día del cultivo
  - Status (badge con color)
  - Snapshot del template (recursos planificados, checklist items count)
  - Si completed_activity_id → link "Ver ejecución" → `/activities/history` (con filtro)
  - Acciones (según status y rol):
    - Status=pending/overdue + admin/manager/supervisor:
      - Botón "Ejecutar" → navega a `/activities/execute/{id}`
      - Botón "Re-programar" → abre DatePicker inline para nueva fecha
      - Botón "Omitir" → dialog confirmación → status='skipped'
    - Status=completed: solo lectura con link a ejecución
    - Status=skipped: solo lectura
- **Dialog: Confirmar omisión** — Modal simple
  - "¿Omitir actividad {template_name} del batch {batch_code}?"
  - Input: Razón (opt, textarea)
  - Botón "Omitir actividad" (variant="destructive")
- **Resumen del día** (visible en ambas vistas) — Card compacta en la parte superior
  - Hoy: {n} pendientes, {n} completadas, {n} vencidas, {n} omitidas
  - Esta semana: mismos conteos

**Responsive**: Calendario en móvil muestra vista de 3 días (scrollable) o lista. Panel lateral se convierte en modal full-screen. Filtros colapsables.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Carga inicial Server Component:
  ```
  supabase.from('scheduled_activities')
    .select(`
      *,
      template:activity_templates(id, name, code, frequency, estimated_duration_min,
        activity_type:activity_types(id, name)
      ),
      batch:batches(id, code, status, plant_count,
        cultivar:cultivars(id, name, code),
        phase:production_phases!current_phase_id(id, name),
        zone:zones(id, name, facility:facilities(id, name))
      ),
      phase:production_phases(id, name),
      completed_activity:activities!completed_activity_id(id, performed_at)
    `)
    .gte('planned_date', startDate)
    .lte('planned_date', endDate)
    .order('planned_date')
  ```
- **RF-02**: Filtros se aplican client-side para el rango ya cargado; si se cambia rango de fechas, nueva query
- **RF-03**: El conteo de resumen del día se calcula de las actividades cargadas
- **RF-04**: Para operarios (role=operator), filtrar automáticamente por batches cuya zona pertenece a facilities asignadas al usuario (via users.facility_id o permissions JSONB)

### Re-programar

- **RF-05**: Al seleccionar nueva fecha en el DatePicker del panel lateral:
  ```
  supabase.from('scheduled_activities')
    .update({ planned_date: newDate })
    .eq('id', activityId)
  ```
- **RF-06**: Solo se puede re-programar si status='pending' o status='overdue'
- **RF-07**: La nueva fecha no puede ser anterior a hoy
- **RF-08**: Tras re-programar, toast "Actividad re-programada al {fecha}" + actualizar calendario

### Omitir actividad

- **RF-09**: Al confirmar omisión:
  ```
  supabase.from('scheduled_activities')
    .update({ status: 'skipped' })
    .eq('id', activityId)
  ```
- **RF-10**: Solo se puede omitir si status='pending' o status='overdue'
- **RF-11**: Tras omitir, toast "Actividad omitida" + actualizar calendario

### Navegación

- **RF-12**: Click "Ejecutar" navega a `/activities/execute/{scheduled_activity_id}` (PRD 27)
- **RF-13**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-14**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-15**: Click "Ver ejecución" navega a detalle de la actividad ejecutada

### Detección de overdue

- **RF-16**: Las actividades con status='overdue' se identifican por el pg_cron job `check_overdue_activities` (que se ejecuta cada hora). En el frontend, también se marca visualmente si `status='pending' AND planned_date < today` — doble verificación client-side para UX inmediata
- **RF-17**: Las actividades overdue aparecen al tope del día con indicador visual prominente (borde rojo, ícono de alerta)

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — scheduled_activities hereda aislamiento vía `batch_id → batches.zone_id → zones.facility_id → facilities.company_id`
- **RNF-02**: La query principal incluye rango de fechas para no cargar todo el historial — window de ±2 semanas para calendario
- **RNF-03**: El template_snapshot almacenado en scheduled_activities se usa para mostrar recursos y checklist — no se consultan las tablas de template en tiempo real (evita inconsistencias si el template cambia)
- **RNF-04**: El calendario se renderiza client-side con datos pre-cargados del Server Component — no hace queries por cada cambio de vista semanal/mensual dentro del rango cargado
- **RNF-05**: Paginación server-side en vista lista (20 items por página)
- **RNF-06**: Los filtros de facility/zona/batch son cascada: seleccionar facility filtra zonas disponibles, seleccionar zona filtra batches

## Flujos principales

### Happy path — Ver semana y ejecutar actividad

1. Supervisor navega a `/activities/schedule`
2. Calendario muestra semana actual: lunes a domingo
3. Resumen: Hoy: 5 pendientes, 0 completadas, 2 vencidas
4. Martes muestra 3 mini-cards: FERT-VEG-S1 (LOT-001, pending), MONITOR-MIPE (LOT-002, pending), FERT-FLO-S3 (LOT-003, overdue-rojo)
5. Click en FERT-VEG-S1 → panel lateral muestra detalle: Fertirrigación Vegetativa Sem 1-2, LOT-001, 42 plantas, Sala Veg A, día 35
6. Click "Ejecutar" → navega a `/activities/execute/{id}`

### Re-programar actividad pendiente

1. Supervisor ve que FERT-FLO-S3 del miércoles no puede ejecutarse ese día (mantenimiento de equipo)
2. Click en actividad → panel lateral
3. Click "Re-programar" → DatePicker aparece
4. Selecciona jueves → confirma
5. Toast: "Actividad re-programada al jueves 27/02"
6. Mini-card se mueve del miércoles al jueves en el calendario

### Omitir actividad

1. Manager decide que una actividad de monitoreo adicional no es necesaria
2. Click en actividad → panel lateral
3. Click "Omitir" → dialog: "¿Omitir MONITOR-EXTRA del batch LOT-005?"
4. Confirma → toast "Actividad omitida"
5. Mini-card aparece gris con texto tachado

### Filtrar por zona

1. Supervisor quiere ver solo actividades de Sala Floración A
2. Selecciona Facility: "Invernadero Principal" → Select Zona ahora muestra solo zonas del invernadero
3. Selecciona Zona: "Sala Floración A"
4. Calendario se filtra mostrando solo actividades de batches en esa zona

### Vista operario

1. Operario navega a `/activities/schedule`
2. Solo ve actividades de batches en zonas de sus facilities asignadas
3. Ve botón "Ejecutar" en actividades pendientes
4. No ve botón "Re-programar" ni "Omitir"

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                                 |
| ------- | --------------------------------------------------------------------------- |
| loading | Skeleton del calendario y filtros                                           |
| loaded  | Calendario con actividades, filtros activos                                 |
| empty   | "No hay actividades programadas para el rango seleccionado" + ajustar rango |
| error   | "Error al cargar el calendario. Intenta nuevamente" + botón reintentar      |

### Estados de UI — Panel lateral

| Estado     | Descripción                                           |
| ---------- | ----------------------------------------------------- |
| idle       | Datos de actividad, acciones disponibles              |
| saving     | Re-programar o skip en progreso — botón loading       |
| success    | Panel se actualiza, toast éxito                       |
| error      | Toast error, panel permanece                          |

### Validaciones

**Re-programar:**
```
new_planned_date: z.string().min(1, 'Selecciona una fecha').refine(
  (date) => new Date(date) >= today,
  'La fecha no puede ser anterior a hoy'
)
```

**Omitir:**
```
reason: z.string().max(2000).optional().or(z.literal(''))
```

### Errores esperados

| Escenario                              | Mensaje al usuario                                           |
| -------------------------------------- | ------------------------------------------------------------ |
| Sin actividades en rango               | "No hay actividades programadas para este periodo" (empty)   |
| Re-programar fecha pasada              | "La fecha no puede ser anterior a hoy" (inline)              |
| Re-programar actividad ya completada   | "No se puede re-programar una actividad completada" (toast)  |
| Omitir actividad ya completada         | "No se puede omitir una actividad completada" (toast)        |
| Error de red                           | "Error de conexión. Intenta nuevamente" (toast)              |
| Permiso denegado (RLS)                 | "No tienes permisos para esta acción" (toast)                |

## Dependencias

- **Páginas relacionadas**:
  - `/activities/execute/[id]` — ejecución de actividad (PRD 27)
  - `/activities/history` — historial de ejecuciones (PRD 28)
  - `/production/batches/[id]` — detalle de batch (PRD 25)
  - `/areas/zones/[id]` — detalle de zona (PRD 16)
  - `/settings/activity-templates` — templates que generan las actividades (PRD 12)
- **pg_cron jobs**: `check_overdue_activities` — marca actividades como overdue cada hora
- **Supabase client**: PostgREST para lecturas y updates directos
- **React Query**: Cache keys `['scheduled-activities', { start, end, filters }]`, `['scheduled-activities', activityId]`
