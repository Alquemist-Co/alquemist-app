# Historial de Actividades

## Metadata

- **Ruta**: `/activities/history`
- **Roles con acceso**: admin (lectura completa), manager (lectura completa), supervisor (lectura completa), operator (lectura — solo sus actividades ejecutadas), viewer (solo lectura)
- **Tipo componente**: Server Component (listado read-only con paginación server-side, Client Component para filtros y detalle expandible)
- **Edge Functions**: Ninguna — operaciones de solo lectura via PostgREST

## Objetivo

Historial de todas las actividades ejecutadas. Permite buscar, filtrar y revisar en detalle qué se hizo, cuándo, quién lo hizo, qué recursos consumió, y qué observaciones se registraron.

Es el registro de auditoría operativa del sistema — todo lo que se ejecutó queda aquí con trazabilidad completa. Los managers usan esta vista para análisis retrospectivo, supervisores para verificar que todo se ejecutó correctamente.

Usuarios principales: managers para análisis y reporting, supervisores para auditoría operativa.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                              |
| ---------------------- | ----------- | ------------------------------------------------------------------ |
| activities             | R           | Actividades ejecutadas con todos sus datos                         |
| activity_resources     | R           | Recursos consumidos por actividad (expand on detail)               |
| activity_observations  | R           | Observaciones registradas (expand on detail)                       |
| activity_types         | R           | Tipo de actividad (para filtros y display)                         |
| activity_templates     | R           | Template usado (nombre, código)                                    |
| batches                | R           | Batch asociado (código, status)                                    |
| cultivars              | R           | Cultivar del batch (para filtros)                                  |
| production_phases      | R           | Fase en que se ejecutó                                             |
| zones                  | R           | Zona de ejecución                                                  |
| facilities             | R           | Facility de la zona (para filtros)                                 |
| products               | R           | Productos de los recursos consumidos                               |
| inventory_items        | R           | Lotes usados en los recursos                                       |
| units_of_measure       | R           | Unidades                                                           |
| users                  | R           | Quién ejecutó (performed_by)                                       |
| phytosanitary_agents   | R           | Agentes identificados en observaciones                             |
| attachments            | R           | Fotos adjuntas a actividades y observaciones                       |

## ENUMs utilizados

| ENUM                 | Valores                                                                  | Tabla.campo                    |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| activity_status      | in_progress \| completed \| cancelled                                    | activities.status              |
| observation_type     | pest \| disease \| deficiency \| environmental \| general \| measurement | activity_observations.type     |
| observation_severity | info \| low \| medium \| high \| critical                                | activity_observations.severity |
| plant_part           | root \| stem \| leaf \| flower \| fruit \| whole_plant                   | activity_observations.plant_part |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Historial de Actividades"
  - Subtítulo: "{n} actividades registradas" (total filtrado)
- **Barra de filtros** — Row de filtros combinables:
  - Search: Buscar por nombre de template, código de batch, o nombre de operario
  - Select: Facility (todas por default)
  - Select: Zona (todas, filtrado por facility)
  - Select: Batch (todos, filtrado por zona)
  - Select: Tipo de actividad (todos)
  - Select: Cultivar (todos)
  - Select: Fase (todas)
  - DatePicker rango: Fecha desde/hasta (default=último mes)
  - Select: Operario (todos — solo visible para admin/manager/supervisor)
  - Botón "Limpiar filtros"
  - Botón "Exportar CSV" (admin/manager)
- **Tabla principal** — Tabla paginada server-side
  - Columnas:
    - Fecha (performed_at, formateada)
    - Día cultivo (crop_day)
    - Tipo (activity_type.name, badge con color)
    - Template (nombre + código)
    - Batch (código con link, badge status)
    - Fase (production_phase.name)
    - Zona (zone.name)
    - Operario (user.full_name)
    - Duración (duration_minutes + "min")
    - Recursos (count de activity_resources)
    - Observaciones (count de activity_observations — badge rojo si severity >= high)
    - Status (badge: completed=verde, cancelled=gris)
  - Ordenamiento: por fecha descendente (default), clickeable en columnas
  - Paginación: 20 items por página, navegación de páginas
- **Fila expandible / Panel de detalle** — Al hacer click en una fila:
  - **Sección: Datos generales**
    - Toda la info del header + measurement_data formateado (pH, EC, volumen, etc.)
    - Notas generales
  - **Sección: Recursos consumidos**
    - Tabla: Producto, Cantidad planificada, Cantidad real, Unidad, Lote (batch_number), Costo
    - Total costo recursos
  - **Sección: Checklist** (si existe en measurement_data o campo dedicado)
    - Lista de items con ✓/✗ y valores registrados
  - **Sección: Observaciones** (si existen)
    - Por cada observación:
      - Tipo (badge) + Agente (si aplica) + Parte de planta + Severidad (badge color)
      - Incidencia: {valor} {unidad} | Muestra: {n} plantas | Afectadas: {n}
      - Descripción + Acción tomada
      - Fotos (thumbnail grid, click para ampliar)
  - **Sección: Fotos generales** (si existen, fuera de observaciones)
    - Grid de fotos adjuntas a la actividad

**Responsive**: Tabla con scroll horizontal en móvil. Detalle expandible se muestra debajo de la fila (accordion). Filtros colapsables.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación server-side:
  ```
  supabase.from('activities')
    .select(`
      *,
      type:activity_types(id, name),
      template:activity_templates(id, name, code),
      batch:batches(id, code, status,
        cultivar:cultivars(id, name),
        phase:production_phases!current_phase_id(name)
      ),
      phase:production_phases(id, name),
      zone:zones(id, name, facility:facilities(id, name)),
      user:users!performed_by(id, full_name),
      resources:activity_resources(count),
      observations:activity_observations(count)
    `, { count: 'exact' })
    .order('performed_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: Los filtros se aplican como query params: `.eq('zone_id', zoneId)`, `.gte('performed_at', startDate)`, `.ilike('batch.code', search)`, etc.
- **RF-03**: Para operarios, filtrar automáticamente: `.eq('performed_by', currentUserId)`
- **RF-04**: El conteo total se usa para mostrar "{n} actividades registradas" y paginación

### Detalle expandible

- **RF-05**: Al expandir una fila, cargar datos completos:
  ```
  supabase.from('activity_resources')
    .select(`
      *,
      product:products(name, sku),
      item:inventory_items(batch_number),
      unit:units_of_measure(code, name)
    `)
    .eq('activity_id', activityId)
    .order('sort_order')
  ```
- **RF-06**: Cargar observaciones:
  ```
  supabase.from('activity_observations')
    .select(`
      *,
      agent:phytosanitary_agents(common_name, scientific_name)
    `)
    .eq('activity_id', activityId)
  ```
- **RF-07**: Cargar fotos:
  ```
  supabase.from('attachments')
    .select('*')
    .eq('entity_type', 'activity')
    .eq('entity_id', activityId)
  ```

### Exportar CSV

- **RF-08**: Exportar genera un CSV con todas las actividades filtradas (sin paginación):
  - Columnas: Fecha, Día, Tipo, Template, Batch, Cultivar, Fase, Zona, Operario, Duración, #Recursos, #Observaciones, Status, Notas
- **RF-09**: Solo admin y manager pueden exportar
- **RF-10**: Si hay más de 5000 registros, exportar en chunks o advertir al usuario

### Navegación

- **RF-11**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-12**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-13**: Click en foto abre lightbox/modal con zoom

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — activities hereda aislamiento vía batch_id → batches.zone_id → facilities.company_id
- **RNF-02**: Paginación server-side obligatoria (20 items por página) — el historial puede tener miles de registros
- **RNF-03**: Las actividades son **inmutables** — no se editan ni borran desde esta página
- **RNF-04**: El detalle expandible carga datos bajo demanda (lazy) — no se incluyen en la query principal
- **RNF-05**: El CSV se genera server-side (Server Action o API route) para manejar grandes volúmenes sin cargar al cliente
- **RNF-06**: Índice compuesto en activities(batch_id, phase_id, performed_at) optimiza las queries más comunes

## Flujos principales

### Happy path — Revisar actividades del día

1. Supervisor navega a `/activities/history`
2. Filtro de fecha: hoy
3. Tabla: 8 actividades ejecutadas hoy
4. Ordena por hora (performed_at desc): la más reciente arriba
5. Expande FERT-VEG-S1 de LOT-001 → ve recursos (Ca(NO₃)₂ 170g, KNO₃ 84g), checklist (4/4 ✓), 0 observaciones

### Buscar actividad con observaciones críticas

1. Manager busca en el search: "LOT-002"
2. Filtro tipo: MIPE
3. Tabla muestra 5 actividades MIPE del LOT-002
4. Ve que la del día 38 tiene badge rojo en observaciones (severity=high)
5. Expande → observación: "Ácaro rojo (Tetranychus urticae), 15 individuos, severity=high, 3 plantas afectadas"
6. Ve las fotos → identifica el problema
7. Click en batch LOT-002 → navega al detalle del batch para tomar acción

### Exportar reporte mensual

1. Manager selecciona rango: 01/02/2026 — 28/02/2026
2. Filtra por facility: "Invernadero Principal"
3. Click "Exportar CSV"
4. Se descarga archivo con todas las actividades del mes en esa facility
5. Lo usa para reporting operativo

### Vista operario

1. Operario navega a `/activities/history`
2. Solo ve sus actividades ejecutadas (filtro automático por performed_by)
3. Puede revisar lo que hizo, expandir detalles, ver fotos
4. No ve filtro de operario (no aplica)
5. No ve botón exportar CSV

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                              |
| ------- | ------------------------------------------------------------------------ |
| loading | Skeleton de tabla y filtros                                              |
| loaded  | Tabla con datos, filtros activos                                         |
| empty   | "No se encontraron actividades con los filtros seleccionados" + limpiar  |
| error   | "Error al cargar el historial. Intenta nuevamente" + botón reintentar    |

### Estados de UI — Fila expandible

| Estado  | Descripción                                                |
| ------- | ---------------------------------------------------------- |
| closed  | Solo fila resumida visible                                 |
| loading | Fila expandida con skeleton mientras carga detalle         |
| open    | Fila expandida con todos los datos                         |
| error   | Fila expandida con mensaje de error + reintentar           |

### Errores esperados

| Escenario                     | Mensaje al usuario                                                  |
| ----------------------------- | ------------------------------------------------------------------- |
| Sin resultados                | "No se encontraron actividades con estos filtros" (empty state)     |
| Error de carga                | "Error al cargar el historial" (error state)                        |
| Error cargando detalle        | "Error al cargar el detalle de la actividad" (inline)               |
| Error exportando CSV          | "Error al exportar. Intenta nuevamente" (toast)                     |
| Demasiados registros para CSV | "Hay más de 5000 registros. Ajusta los filtros para exportar"       |
| Error de red                  | "Error de conexión. Intenta nuevamente" (toast)                     |

## Dependencias

- **Páginas relacionadas**:
  - `/activities/schedule` — calendario de actividades programadas (PRD 26)
  - `/activities/execute/[id]` — ejecución que genera estos registros (PRD 27)
  - `/production/batches/[id]` — detalle de batch, tab actividades (PRD 25)
  - `/areas/zones/[id]` — detalle de zona (PRD 16)
- **Supabase client**: PostgREST para lecturas con paginación server-side
- **React Query**: Cache keys `['activities', { filters, page }]`, `['activity-detail', activityId]`
