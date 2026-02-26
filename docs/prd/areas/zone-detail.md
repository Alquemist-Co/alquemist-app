# Detalle de Zona

## Metadata

- **Ruta**: `/areas/zones/[id]`
- **Roles con acceso**: admin (lectura completa + editar zona), manager (lectura completa + editar zona), supervisor (lectura completa), operator (lectura completa), viewer (lectura completa)
- **Tipo componente**: Mixto (Server Component para carga inicial, Client Components para secciones interactivas)
- **Edge Functions**: Ninguna — lecturas cross-domain via PostgREST

## Objetivo

Mostrar una vista consolidada de toda la información relevante de una zona específica: datos generales, estructuras físicas, posiciones de plantas (si aplica y si la empresa tiene habilitada la feature), batch activo en la zona, sensores asignados y últimas lecturas ambientales. Esta página es el punto central para entender el estado actual de un espacio de cultivo.

Es una página de **lectura predominante** con datos provenientes de múltiples dominios (Áreas, Nexo, Operaciones, Inventario). La edición de la zona se puede iniciar desde aquí pero se realiza vía el dialog de edición del PRD 15.

Usuarios principales: supervisores y managers que monitorean el estado de las zonas.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                      |
| ---------------------- | ----------- | -------------------------------------------------------------------------- |
| zones                  | R           | Datos generales de la zona                                                 |
| zone_structures        | R           | Estructuras físicas de la zona                                             |
| plant_positions        | R           | Posiciones individuales de plantas (opcional, controlada por feature flag) |
| facilities             | R           | Nombre y tipo de la facility padre                                         |
| batches                | R           | Batch activo en la zona (status='active', zone_id=esta zona)               |
| cultivars              | R           | Nombre del cultivar del batch activo                                       |
| production_phases      | R           | Nombre de la fase actual del batch activo                                  |
| sensors                | R           | Sensores asignados a la zona                                               |
| environmental_readings | R           | Últimas lecturas de cada parámetro por sensor                              |

## ENUMs utilizados

| ENUM             | Valores                                                                                   | Tabla.campo                      |
| ---------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| zone_purpose     | propagation \| vegetation \| flowering \| drying \| processing \| storage \| multipurpose | zones.purpose                    |
| zone_environment | indoor_controlled \| greenhouse \| tunnel \| open_field                                   | zones.environment                |
| zone_status      | active \| maintenance \| inactive                                                         | zones.status                     |
| structure_type   | mobile_rack \| fixed_rack \| rolling_bench \| row \| bed \| trellis_row \| nft_channel    | zone_structures.type             |
| position_status  | empty \| planted \| harvested \| maintenance                                              | plant_positions.status           |
| batch_status     | active \| phase_transition \| completed \| cancelled \| on_hold                           | batches.status                   |
| sensor_type      | temperature \| humidity \| co2 \| light \| ec \| ph \| soil_moisture \| vpd               | sensors.type                     |
| env_parameter    | temperature \| humidity \| co2 \| light_ppfd \| ec \| ph \| vpd                           | environmental_readings.parameter |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Breadcrumb (Áreas > Zonas > {nombre}) + título "{nombre}" + badges de propósito, ambiente y estado + botón "Editar zona" (variant="outline", solo admin/manager, abre dialog de PRD 15)
- **Grid de secciones** — Layout responsive con secciones en cards
  - **Sección 1: Información General** — Card
    - Instalación: nombre de facility con link
    - Propósito: badge con label en español
    - Ambiente: badge
    - Estado: badge (active/maintenance/inactive)
    - Área de piso: `area_m2` m²
    - Altura: `height_m` m (si existe)
    - Área de cultivo efectiva: `effective_growing_area_m2` m² (read-only, calculado)
    - Capacidad de plantas: `plant_capacity` (read-only, calculado)
    - Configuración climática: lista de parámetros objetivo de `climate_config` (si existe)
  - **Sección 2: Estructuras** — Card
    - Tabla de `zone_structures`:
      - Columnas: Nombre, Tipo (badge), Dimensiones (L×A), Niveles, Posiciones/nivel, Capacidad total, Móvil (badge)
    - Si no hay estructuras: "Zona sin estructuras internas — capacidad basada en área de piso"
  - **Sección 3: Posiciones de Plantas** — Card (visible solo si `companies.settings.features_enabled.positions` es true o si hay posiciones creadas)
    - Vista de grid visual (opcional) o tabla:
      - Columnas: Label, Estructura, Nivel, Índice, Estado (badge con color: empty=gris, planted=verde, harvested=amarillo, maintenance=rojo), Batch (código si planted)
    - Resumen: "{n} plantadas / {m} vacías / {o} total" — barra de ocupación visual
    - Si no hay posiciones: "Sin posiciones individuales para esta zona"
  - **Sección 4: Batch Activo** — Card (prominente si hay batch)
    - Si hay batch activo en la zona:
      - Código del batch (link a `/production/batches/{id}`)
      - Cultivar: nombre
      - Fase actual: nombre de production_phase (badge)
      - Plantas: plant_count
      - Fecha inicio: start_date
      - Fecha esperada fin: expected_end_date
      - Estado: badge (active/phase_transition/on_hold)
    - Si no hay batch activo: "No hay batch activo en esta zona"
  - **Sección 5: Sensores** — Card
    - Tabla de sensores asignados:
      - Columnas: Tipo (badge con icono por tipo), Modelo, Serial, Última calibración, Estado (activo/inactivo)
    - Si no hay sensores: "No hay sensores asignados a esta zona"
  - **Sección 6: Lecturas Ambientales** — Card
    - Panel de tarjetas (una por parámetro monitoreado):
      - Parámetro: icono + nombre (ej: 🌡️ Temperatura)
      - Último valor: "24.5°C" con timestamp relativo ("hace 5 min")
      - Rango óptimo (si hay batch activo con cultivar.optimal_conditions): "Óptimo: 20-26°C"
      - Indicador visual: verde si dentro de rango, amarillo si cerca del límite, rojo si fuera de rango
    - Si no hay lecturas: "Sin lecturas ambientales recientes"
    - Link a `/operations/environmental?zone={id}` para ver series temporales completas

**Responsive**: Secciones apiladas en una columna en móvil. Grid de 2 columnas en desktop (info general + batch lado a lado, estructuras + sensores, posiciones + lecturas).

## Requisitos funcionales

- **RF-01**: Al cargar la página, obtener datos de la zona via Server Component: `supabase.from('zones').select('*, facility:facilities(name, type), structures:zone_structures(*)').eq('id', zoneId).single()`
- **RF-02**: Obtener batch activo: `supabase.from('batches').select('*, cultivar:cultivars(name), phase:production_phases(name)').eq('zone_id', zoneId).eq('status', 'active').maybeSingle()`
- **RF-03**: Obtener sensores: `supabase.from('sensors').select('*').eq('zone_id', zoneId).eq('is_active', true).order('type')`
- **RF-04**: Obtener últimas lecturas ambientales por parámetro: por cada sensor activo, obtener la lectura más reciente de cada parámetro
- **RF-05**: Si la empresa tiene feature flag de posiciones habilitado (o hay posiciones creadas), obtener posiciones: `supabase.from('plant_positions').select('*, structure:zone_structures(name), batch:batches(code)').eq('zone_id', zoneId).order('position_index')`
- **RF-06**: Comparar lecturas ambientales contra `cultivar.optimal_conditions` del batch activo (si existe) para determinar estado visual (verde/amarillo/rojo)
- **RF-07**: El botón "Editar zona" abre el mismo dialog de edición del PRD 15, pasándole los datos de la zona actual
- **RF-08**: Si la zona no existe o no es accesible (RLS), mostrar 404: "Zona no encontrada"
- **RF-09**: Las secciones cargan independientemente — si una sección falla, las demás siguen visibles con un mensaje de error localizado

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — zone hereda aislamiento vía `facility_id → facilities.company_id`
- **RNF-02**: Esta página es **read-heavy** con datos cross-domain — las queries deben ser optimizadas con selects específicos (no `select(*)` innecesarios)
- **RNF-03**: Las lecturas ambientales se refrescan cada 60 segundos vía polling (o Supabase Realtime si hay sensores activos)
- **RNF-04**: La sección de posiciones puede tener muchos registros — usar virtualización o paginación si > 100 posiciones
- **RNF-05**: El feature flag de posiciones se lee de `companies.settings` — si no está definido, la sección se oculta por defecto

## Flujos principales

### Happy path — Ver zona con batch activo y sensores

1. Usuario navega a `/areas/zones/{id}` (desde listado de zonas o desde un link de batch)
2. Server Component carga datos de zona, batch activo, sensores, lecturas
3. Sección "Información General" muestra datos de la zona
4. Sección "Estructuras" muestra tabla con 3 racks móviles
5. Sección "Batch Activo" muestra LOT-GELATO-260301 en fase floración, 42 plantas
6. Sección "Sensores" muestra 2 sensores (temperatura + humedad)
7. Sección "Lecturas" muestra: Temperatura 24.5°C (verde, óptimo 20-26°C), Humedad 55% (verde, óptimo 40-60%)

### Zona sin batch activo

1. Navega al detalle de una zona vacía
2. Sección "Batch Activo" muestra: "No hay batch activo en esta zona"
3. Las lecturas ambientales no muestran comparación con rango óptimo (no hay cultivar de referencia)

### Zona con posiciones de plantas

1. Navega a zona con feature de posiciones habilitado
2. Sección "Posiciones" muestra grid: 96 posiciones, 42 plantadas (verde), 12 cosechadas (amarillo), 42 vacías (gris)
3. Barra de ocupación: "42/96 (43.8%)"

### Zona en mantenimiento

1. Navega a zona con status='maintenance'
2. Badge amarillo "Mantenimiento" en el header
3. No debería tener batch activo
4. Sensores pueden seguir reportando lecturas

### Lectura ambiental fuera de rango

1. Temperatura reportada: 28.5°C
2. Rango óptimo del cultivar: 20-26°C
3. Indicador rojo en la tarjeta de temperatura
4. Tooltip: "Fuera de rango óptimo (20-26°C)"

### Navegar a edición

1. Admin/manager click "Editar zona"
2. Se abre el dialog de edición del PRD 15 con datos pre-cargados
3. Tras guardar, la página se refresca con datos actualizados

## Estados y validaciones

### Estados de UI — Página

| Estado        | Descripción                                                             |
| ------------- | ----------------------------------------------------------------------- |
| loading       | Skeleton de secciones mientras cargan                                   |
| loaded        | Todas las secciones con datos                                           |
| partial-error | Alguna sección falló — muestra error localizado, el resto funciona      |
| not-found     | Zona no encontrada o no accesible — pantalla 404                        |
| error         | Error general al cargar — "Error al cargar la zona. Intenta nuevamente" |

### Estados de lecturas ambientales

| Estado       | Color          | Descripción                                                 |
| ------------ | -------------- | ----------------------------------------------------------- |
| in-range     | verde          | Lectura dentro del rango óptimo del cultivar                |
| near-limit   | amarillo       | Lectura dentro del 10% del límite del rango                 |
| out-of-range | rojo           | Lectura fuera del rango óptimo                              |
| no-reference | gris           | Sin batch activo o cultivar sin optimal_conditions definido |
| stale        | gris con icono | Última lectura hace más de 15 minutos                       |

### Errores esperados

| Escenario               | Mensaje al usuario                                             |
| ----------------------- | -------------------------------------------------------------- |
| Zona no encontrada      | "Zona no encontrada" (pantalla 404)                            |
| Error cargando batch    | "Error al cargar batch activo" (mensaje localizado en sección) |
| Error cargando sensores | "Error al cargar sensores" (mensaje localizado)                |
| Error cargando lecturas | "Error al cargar lecturas ambientales" (mensaje localizado)    |
| Error de red general    | "Error de conexión. Intenta nuevamente" (toast)                |

## Dependencias

- **Páginas relacionadas**:
  - `/areas/zones` — listado de zonas, botón "Ver detalle" lleva aquí (PRD 15)
  - `/production/batches/[id]` — link desde el batch activo (Fase 4)
  - `/operations/environmental?zone={id}` — link para ver series temporales (Fase 6)
  - `/operations/sensors` — gestión de sensores (Fase 6)
- **Feature flags**: `companies.settings.features_enabled.positions` — controla visibilidad de la sección de posiciones
- **Supabase client**: PostgREST para lecturas cross-domain
- **React Query**: Cache keys `['zone-detail', zoneId]`, `['zone-batch', zoneId]`, `['zone-sensors', zoneId]`, `['zone-readings', zoneId]`
- **Supabase Realtime** (opcional): Suscripción a `environmental_readings` para actualización en tiempo real de lecturas
