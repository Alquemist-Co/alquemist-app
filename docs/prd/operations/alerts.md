# Alertas Operativas

## Metadata

- **Ruta**: `/operations/alerts`
- **Roles con acceso**: admin (lectura + acknowledge + resolve + eliminar), manager (lectura + acknowledge + resolve), supervisor (lectura + acknowledge + resolve), operator (lectura — solo alertas de sus zonas), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado inicial, Client Component para filtros interactivos, acknowledge/resolve en tiempo real, y suscripción Realtime)
- **Edge Functions**: Ninguna — las alertas se crean via pg_cron jobs y Edge Functions de otros módulos. Acknowledge/resolve via PostgREST directo

## Objetivo

Centro de alertas del sistema. Muestra todas las alertas activas y resueltas, permitiendo a supervisores y managers ver rápidamente qué requiere atención: actividades vencidas, inventario bajo, batches estancados, lecturas ambientales fuera de rango, documentos por vencer, calidad fallida, plagas detectadas, etc.

Las alertas se generan automáticamente por pg_cron jobs y Edge Functions de otros módulos. Desde esta página el usuario las reconoce (acknowledge) y las marca como resueltas (resolve). También puede navegar directamente a la entidad relacionada para tomar acción.

La página se actualiza en tiempo real via Supabase Realtime — nuevas alertas aparecen sin refresh.

Usuarios principales: supervisores que gestionan el día a día, managers que monitorean la operación.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                                    |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| alerts                 | R/W         | Lectura de alertas + Write acknowledge/resolve. RLS via company_id directo               |
| batches                | R           | Contexto del batch referenciado (código, cultivar, fase)                                 |
| zones                  | R           | Zona referenciada para alertas ambientales                                               |
| facilities             | R           | Facility para filtros                                                                    |
| sensors                | R           | Sensor referenciado en alertas env_out_of_range                                          |
| scheduled_activities   | R           | Actividad vencida referenciada                                                           |
| inventory_items        | R           | Item de inventario referenciado en low_inventory                                         |
| regulatory_documents   | R           | Documento referenciado en regulatory_expiring/missing                                    |
| quality_tests          | R           | Test referenciado en quality_failed                                                      |
| activity_observations  | R           | Observación referenciada en pest_detected/phi_violation                                  |
| users                  | R           | acknowledged_by (nombre del usuario)                                                     |

## ENUMs utilizados

| ENUM           | Valores                                                                                                                                                                                                 | Tabla.campo     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| alert_type     | overdue_activity \| low_inventory \| stale_batch \| expiring_item \| env_out_of_range \| order_delayed \| quality_failed \| regulatory_expiring \| regulatory_missing \| pest_detected \| phi_violation | alerts.type     |
| alert_severity | info \| warning \| high \| critical                                                                                                                                                                     | alerts.severity |
| alert_status   | pending \| acknowledged \| resolved                                                                                                                                                                     | alerts.status   |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Alertas"
  - Subtítulo: "{n} alertas pendientes" (conteo de status=pending)
  - Toggle: "Mostrar resueltas" (off por default — solo muestra pending + acknowledged)
- **Barra de KPIs** — Row de cards de severidad:
  - Críticas: {n} (badge rojo, pulso animado si > 0)
  - Altas: {n} (badge naranja)
  - Advertencias: {n} (badge amarillo)
  - Informativas: {n} (badge azul)
  - Total pendientes: {n} | Reconocidas: {n}
- **Barra de filtros** — Row de filtros combinables:
  - Select: Severidad (todas, critical, high, warning, info — multi-select)
  - Select: Tipo (todas, agrupadas por categoría):
    - Producción: overdue_activity, stale_batch, order_delayed
    - Inventario: low_inventory, expiring_item
    - Ambiente: env_out_of_range
    - Calidad: quality_failed
    - Regulatorio: regulatory_expiring, regulatory_missing
    - Campo: pest_detected, phi_violation
  - Select: Status (pending, acknowledged, resolved — default=pending+acknowledged)
  - Select: Facility (todas)
  - DatePicker rango: Fecha desde/hasta (default=última semana)
  - Botón "Limpiar filtros"
- **Lista de alertas** — Cards agrupadas por severidad (critical primero)
  - Cada card de alerta:
    - Barra lateral de color por severidad (rojo/naranja/amarillo/azul)
    - Ícono por tipo de alerta (campana, termómetro, hoja, tubo de ensayo, documento, etc.)
    - **Título**: alert.title (ej: "Temperatura fuera de rango")
    - **Mensaje**: alert.message (ej: "Temperatura 28.5°C excede rango óptimo (20-26°C) en Sala Floración A")
    - **Badges**: tipo (badge), severidad (badge con color), status (badge)
    - **Contexto**: entity_type + link a la entidad:
      - entity_type='batch' → "Batch: LOT-001" (link a `/production/batches/{id}`)
      - entity_type='sensor' → "Sensor: Trolmaster HCS-1 (Sala Floración A)" (link a `/operations/sensors`)
      - entity_type='scheduled_activity' → "Actividad: FERT-VEG-S1" (link a `/activities/schedule`)
      - entity_type='inventory_item' → "Inventario: Ca(NO₃)₂ LOT-03" (link a `/inventory/items`)
      - entity_type='regulatory_document' → "Documento: CoA #CHL-2026-0445" (link a `/regulatory/documents/{id}`)
      - entity_type='activity_observation' → "Observación: Ácaro rojo en LOT-002" (link a `/activities/history`)
    - **Timestamp**: "Hace 15 min" / "Hace 2h" / "25/02/2026 14:30" (relative si < 24h)
    - **Acciones** (según status y rol):
      - Status=pending: botón "Reconocer" (icon check) + botón "Resolver" (icon check-circle)
      - Status=acknowledged: info "Reconocida por {nombre} hace {time}" + botón "Resolver"
      - Status=resolved: info "Resuelta el {fecha}" (solo lectura)
  - Paginación: 20 alertas por página, scroll infinito o paginación clásica
  - Nuevas alertas (via Realtime) aparecen al tope con animación de entrada
- **Acciones masivas** (visible si hay alertas seleccionadas):
  - Checkbox en cada card para seleccionar
  - Botón "Reconocer seleccionadas" (acknowledge múltiples)
  - Botón "Resolver seleccionadas" (resolve múltiples)
- **Panel de alerta expandido** — Al hacer click en una card se expande in-place:
  - Mensaje completo (sin truncar)
  - Datos adicionales del entity referenciado:
    - Para env_out_of_range: última lectura, rango óptimo del cultivar, gráfico mini de últimas 2h
    - Para overdue_activity: template, batch, fecha planificada, días de retraso
    - Para low_inventory: producto, stock actual, consumo promedio diario
    - Para regulatory_expiring: tipo doc, fecha vencimiento, días restantes
    - Para quality_failed: tipo test, batch, parámetros fallidos
    - Para pest_detected: agente, severidad, batch, zona
  - Historial de la alerta: creada → reconocida (por quién, cuándo) → resuelta (cuándo)

**Responsive**: Cards en una columna en móvil. KPIs en 2×2 grid. Panel expandido full-width. Acciones masivas con checkbox.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal con paginación:
  ```
  supabase.from('alerts')
    .select(`
      *,
      acknowledged_user:users!acknowledged_by(full_name)
    `, { count: 'exact' })
    .in('status', selectedStatuses)
    .order('severity_order')  // custom: critical=1, high=2, warning=3, info=4
    .order('triggered_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  ```
  Nota: el ordenamiento por severidad requiere un campo calculado o ordenar client-side después de cargar. Alternativa: `.order('triggered_at', { ascending: false })` y agrupar client-side por severidad.
- **RF-02**: KPIs con queries de conteo en paralelo:
  ```
  -- Por severidad (solo pending + acknowledged)
  supabase.from('alerts').select('id', { count: 'exact', head: true })
    .eq('severity', 'critical').in('status', ['pending', 'acknowledged'])
  // ... repetir para high, warning, info
  ```
- **RF-03**: Filtros se aplican como query params: `.eq('type', type)`, `.eq('severity', severity)`, `.gte('triggered_at', startDate)`

### Realtime

- **RF-04**: Suscribirse a nuevas alertas via Supabase Realtime:
  ```
  supabase.channel('alerts')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `company_id=eq.${companyId}`
    }, (payload) => {
      // Agregar nueva alerta al tope de la lista
      // Actualizar KPIs
      // Si severity=critical → notificación visual prominente (shake/flash)
    })
    .subscribe()
  ```
- **RF-05**: También suscribirse a UPDATE (para ver en tiempo real si otro usuario reconoce/resuelve):
  ```
  supabase.channel('alerts-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'alerts',
      filter: `company_id=eq.${companyId}`
    }, handler)
    .subscribe()
  ```

### Acknowledge

- **RF-06**: Al reconocer una alerta:
  ```
  supabase.from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: auth.uid(),
      acknowledged_at: new Date().toISOString()
    })
    .eq('id', alertId)
    .eq('status', 'pending')  // Solo si está pending
  ```
- **RF-07**: Toast: "Alerta reconocida" + card se actualiza in-place
- **RF-08**: Acknowledge masivo: ejecuta update para cada alerta seleccionada

### Resolve

- **RF-09**: Al resolver una alerta:
  ```
  supabase.from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString()
    })
    .eq('id', alertId)
    .in('status', ['pending', 'acknowledged'])
  ```
- **RF-10**: Toast: "Alerta resuelta" + si toggle "Mostrar resueltas" está off, la card se desvanece
- **RF-11**: Resolve masivo: ejecuta update para cada alerta seleccionada

### Contexto expandido

- **RF-12**: Al expandir una alerta, cargar datos de la entidad referenciada según entity_type:
  - `batch`: `supabase.from('batches').select('code, status, cultivar:cultivars(name), phase:production_phases!current_phase_id(name), zone:zones(name)').eq('id', entity_id)`
  - `sensor`: `supabase.from('sensors').select('type, brand_model, serial_number, zone:zones(name)').eq('id', entity_id)` + últimas lecturas
  - `scheduled_activity`: `supabase.from('scheduled_activities').select('planned_date, template:activity_templates(name, code), batch:batches(code)').eq('id', entity_id)`
  - `inventory_item`: `supabase.from('inventory_items').select('batch_number, quantity_available, product:products(name, sku), unit:units_of_measure(code)').eq('id', entity_id)`
  - `regulatory_document`: `supabase.from('regulatory_documents').select('document_number, expiry_date, status, doc_type:regulatory_doc_types(name)').eq('id', entity_id)`
  - `activity_observation`: `supabase.from('activity_observations').select('type, severity, description, agent:phytosanitary_agents(common_name), activity:activities(batch:batches(code))').eq('id', entity_id)`
- **RF-13**: Para env_out_of_range, cargar mini-gráfico:
  ```
  supabase.from('environmental_readings')
    .select('value, timestamp')
    .eq('zone_id', zoneId)
    .eq('parameter', parameter)
    .gte('timestamp', twoHoursAgo)
    .order('timestamp')
  ```

### Navegación

- **RF-14**: Click en link de entidad navega a la página correspondiente:
  - batch → `/production/batches/{id}` (PRD 25)
  - sensor → `/operations/sensors` (PRD 35) con filtro
  - scheduled_activity → `/activities/schedule` (PRD 26)
  - inventory_item → `/inventory/items` (PRD 37, Fase 7)
  - regulatory_document → `/regulatory/documents/{id}` (PRD 32)
  - activity_observation → `/activities/history` (PRD 28) con filtro

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 1 — alerts tiene company_id directo para aislamiento
- **RNF-02**: Supabase Realtime para nuevas alertas y updates — la página es "viva" sin necesidad de polling
- **RNF-03**: Las alertas son creadas por pg_cron y Edge Functions — nunca se crean desde esta UI
- **RNF-04**: Paginación server-side (20 alertas por página)
- **RNF-05**: Las alertas críticas deben tener indicador visual prominente (pulso animado, color fuerte) para captar atención inmediata
- **RNF-06**: El contexto expandido se carga bajo demanda (lazy) — no en la query principal
- **RNF-07**: Para operarios, filtrar alertas por zonas de sus facilities asignadas (via alert → entity → zone → facility)
- **RNF-08**: Las alertas nunca se eliminan — solo se resuelven. Historial completo para auditoría

## Flujos principales

### Happy path — Gestionar alertas del día

1. Supervisor navega a `/operations/alerts`
2. KPIs: 1 crítica (rojo pulsante), 3 altas, 5 advertencias, 2 informativas
3. Alerta crítica al tope: "Temperatura fuera de rango" — Sensor Trolmaster en Sala Floración A — 28.5°C (rango: 20-26°C)
4. Click para expandir → ve mini-gráfico de las últimas 2h mostrando ascenso progresivo
5. Click "Reconocer" → va a ajustar el HVAC
6. Vuelve → click "Resolver" → alerta se resuelve
7. KPIs se actualizan: 0 críticas

### Nueva alerta en tiempo real

1. Supervisor tiene la página abierta
2. pg_cron `check_overdue_activities` detecta actividad vencida
3. Nueva alerta aparece al tope con animación de entrada: "Actividad vencida: FERT-VEG-S1 del batch LOT-001 (planificada ayer)"
4. KPIs se incrementan automáticamente
5. Supervisor reconoce → navega a `/activities/schedule` para re-programar

### Acknowledge masivo

1. Manager ve 5 alertas de tipo "low_inventory" (severity=warning) acumuladas
2. Selecciona las 5 con checkboxes
3. Click "Reconocer seleccionadas" → todas pasan a acknowledged
4. Revisa el inventario más tarde → selecciona las 5 → "Resolver seleccionadas"

### Filtrar por tipo

1. Manager quiere ver solo alertas regulatorias
2. Filtra Tipo: regulatory_expiring + regulatory_missing
3. Ve 2 alertas: un CoA por vencer en 15 días, un permiso faltante para envío
4. Navega a cada documento para tomar acción

### Vista operario

1. Operario navega a `/operations/alerts`
2. Solo ve alertas relacionadas a zonas de sus facilities asignadas
3. No puede resolver — solo reconocer y ver contexto
4. Las alertas le ayudan a priorizar su trabajo del día

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                          |
| ------- | -------------------------------------------------------------------- |
| loading | Skeleton de KPIs y lista                                             |
| loaded  | KPIs y lista con datos, Realtime activo                              |
| empty   | "No hay alertas pendientes. Todo en orden." (estado positivo)        |
| error   | "Error al cargar las alertas. Intenta nuevamente" + reintentar       |

### Estados de UI — Alerta individual

| Estado       | Descripción                                            |
| ------------ | ------------------------------------------------------ |
| pending      | Barra lateral intensa, acciones acknowledge + resolve  |
| acknowledged | Barra lateral atenuada, acción resolve                 |
| resolved     | Barra lateral gris, solo lectura                       |
| updating     | Botón loading mientras se ejecuta acknowledge/resolve  |

### Errores esperados

| Escenario                           | Mensaje al usuario                                                 |
| ----------------------------------- | ------------------------------------------------------------------ |
| Sin alertas                         | "No hay alertas pendientes. Todo en orden." (empty positivo)       |
| Error reconociendo                  | "Error al reconocer la alerta. Intenta nuevamente" (toast)         |
| Error resolviendo                   | "Error al resolver la alerta. Intenta nuevamente" (toast)          |
| Alerta ya reconocida por otro       | "Esta alerta ya fue reconocida por {nombre}" (toast info)          |
| Alerta ya resuelta                  | "Esta alerta ya fue resuelta" (toast info)                         |
| Error Realtime (desconexión)        | Banner: "Conexión en tiempo real perdida. Reconectando..."         |
| Error cargando contexto expandido   | "Error al cargar detalles de la alerta" (inline)                   |
| Error de red                        | "Error de conexión. Intenta nuevamente" (toast)                    |

## Dependencias

- **Páginas relacionadas**:
  - `/production/batches/[id]` — detalle de batch referenciado (PRD 25)
  - `/activities/schedule` — actividades vencidas (PRD 26)
  - `/inventory/items` — inventario bajo (PRD 37, Fase 7)
  - `/regulatory/documents/[id]` — documentos por vencer/faltantes (PRD 32)
  - `/quality/tests/[id]` — tests fallidos (PRD 30)
  - `/operations/sensors` — sensores fuera de rango (PRD 35)
  - `/operations/environmental` — lecturas ambientales (PRD 34)
- **pg_cron jobs** (generan alertas):
  - `check_overdue_activities` — cada hora
  - `check_low_inventory` — diario 7:00 AM
  - `check_stale_batches` — diario 8:00 AM
  - `check_env_readings` — cada 15 min
  - `check_expiring_documents` — diario 6:00 AM
- **Supabase Realtime**: Canal `alerts` para INSERT + UPDATE en tiempo real
- **Supabase client**: PostgREST para lecturas y updates (acknowledge/resolve)
- **React Query**: Cache keys `['alerts', { filters, page }]`, `['alert-counts']`, `['alert-entity', entityType, entityId]`
