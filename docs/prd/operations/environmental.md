# Monitor Ambiental

## Metadata

- **Ruta**: `/operations/environmental`
- **Roles con acceso**: admin (lectura completa), manager (lectura completa), supervisor (lectura completa), operator (lectura — solo zonas de sus facilities), viewer (solo lectura)
- **Tipo componente**: Client Component (gráficos interactivos con series temporales, Realtime para últimas lecturas, selección de zona/parámetro dinámica)
- **Edge Functions**: Ninguna — lecturas solo lectura via PostgREST. La ingesta se hace via `ingest-reading` (invocada por sensores, no por esta UI)

## Objetivo

Dashboard de monitoreo ambiental que muestra lecturas en tiempo real y series temporales de sensores por zona. Permite a supervisores y managers ver las condiciones actuales (temperatura, humedad, CO2, luz, EC, pH, VPD) y compararlas con los rangos óptimos del cultivar del batch activo en cada zona.

Los gráficos muestran tendencias históricas (últimas 24h, 7 días, 30 días) con líneas de referencia de los rangos óptimos. Las zonas con lecturas fuera de rango se destacan visualmente para acción inmediata.

Usuarios principales: supervisores de cultivo que monitorean condiciones, managers de operaciones.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                                     |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------- |
| environmental_readings | R           | Series temporales de lecturas. RLS via zone_id → facility → company. Particionada por mes |
| sensors                | R           | Sensores activos por zona (tipo, marca, estado, última calibración)                       |
| zones                  | R           | Zonas disponibles para monitoreo                                                          |
| facilities             | R           | Facilities para filtro                                                                    |
| batches                | R           | Batch activo en cada zona (para obtener cultivar y condiciones óptimas)                   |
| cultivars              | R           | optimal_conditions JSONB del cultivar (rangos ideales por parámetro)                      |

## ENUMs utilizados

| ENUM          | Valores                                                     | Tabla.campo                      |
| ------------- | ----------------------------------------------------------- | -------------------------------- |
| sensor_type   | temperature \| humidity \| co2 \| light \| ec \| ph \| soil_moisture \| vpd | sensors.type        |
| env_parameter | temperature \| humidity \| co2 \| light_ppfd \| ec \| ph \| vpd            | environmental_readings.parameter |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Monitor Ambiental"
  - Subtítulo: "Condiciones en tiempo real"
- **Barra de selección** — Controls principales:
  - Select: Facility (req — default=primera facility)
  - Select: Zona (req — default=primera zona de la facility seleccionada, filtrado por facility)
  - Select: Periodo (24h | 7d | 30d — default=24h)
  - Toggle: "Comparar con óptimo" (on por default) — muestra/oculta líneas de referencia del cultivar
- **Sección: Estado actual** — Row de cards con últimas lecturas de la zona seleccionada
  - Una card por parámetro disponible (según sensores activos en la zona):
    - **Temperatura**: valor actual + unidad (ej: "24.5 °C"), tendencia (flecha ↑↓→), rango óptimo (20-26°C)
    - **Humedad**: valor actual (ej: "55 %RH"), tendencia, rango óptimo
    - **CO₂**: valor actual (ej: "1200 ppm"), tendencia, rango óptimo
    - **Luz PPFD**: valor actual (ej: "800 µmol/m²/s"), tendencia, rango óptimo
    - **EC**: valor actual (ej: "1.8 mS/cm"), tendencia, rango óptimo
    - **pH**: valor actual (ej: "5.9"), tendencia, rango óptimo
    - **VPD**: valor actual (ej: "1.2 kPa"), tendencia, rango óptimo
  - Color de la card según estado:
    - Dentro de rango óptimo: fondo verde claro, valor verde
    - Cercano al límite (±10% del rango): fondo amarillo claro, valor amarillo
    - Fuera de rango: fondo rojo claro, valor rojo, ícono alerta
  - Si no hay lecturas recientes (>30 min): card gris con "Sin datos recientes"
  - Info del batch activo: "Batch {code} · {cultivar} · Fase {phase}" (si hay batch activo en la zona)
- **Sección: Gráficos de series temporales** — Grid de gráficos (2 columnas desktop, 1 en móvil)
  - Un gráfico por parámetro con datos en el periodo seleccionado:
    - Eje X: tiempo (formato según periodo: horas para 24h, días para 7d/30d)
    - Eje Y: valor del parámetro
    - Línea principal: lecturas del sensor (color azul)
    - Bandas de referencia: rango óptimo del cultivar (área verde semi-transparente)
    - Líneas de umbral: min/max del rango óptimo (líneas punteadas verdes)
    - Puntos fuera de rango: marcados con punto rojo
    - Tooltip al hover: valor exacto, timestamp, sensor, estado (dentro/fuera de rango)
  - **Aggregation por periodo**:
    - 24h: datos raw (cada lectura, típicamente cada 5 min)
    - 7d: promedios por hora
    - 30d: promedios por 4 horas
  - Si múltiples sensores del mismo tipo en la zona: se muestra promedio con banda min-max
- **Sección: Sensores de la zona** — Card compacta debajo de los gráficos
  - Tabla de sensores activos en la zona seleccionada:
    - Columnas: Tipo (badge), Marca/Modelo, Serial, Última lectura (timestamp), Última calibración, Status (activo/inactivo badge)
  - Link "Gestionar sensores" → `/operations/sensors` (PRD 35)
- **Sección: Vista multi-zona** — Toggle alternativo a la vista por zona
  - Tabla resumen de todas las zonas con batch activo:
    - Columnas: Zona, Facility, Batch activo, Cultivar, Temp, Humedad, CO₂, Luz, EC, pH, VPD
    - Cada celda: valor actual + indicador color (verde/amarillo/rojo)
    - Click en fila → selecciona esa zona en la vista principal
  - Permite identificar rápidamente qué zonas tienen problemas

**Responsive**: Cards de estado actual en 2 columnas (4 en desktop). Gráficos full-width en una columna. Tabla multi-zona con scroll horizontal.

## Requisitos funcionales

### Carga de datos — Estado actual

- **RF-01**: Obtener última lectura por parámetro para la zona seleccionada:
  ```
  -- Para cada parámetro, obtener la lectura más reciente
  supabase.from('environmental_readings')
    .select('parameter, value, unit, timestamp, sensor_id')
    .eq('zone_id', zoneId)
    .gte('timestamp', thirtyMinutesAgo)
    .order('timestamp', { ascending: false })
  ```
  Agrupar client-side por parámetro y tomar la más reciente de cada uno.
- **RF-02**: Obtener condiciones óptimas del cultivar del batch activo en la zona:
  ```
  supabase.from('batches')
    .select('id, code, cultivar:cultivars(name, optimal_conditions), phase:production_phases!current_phase_id(name)')
    .eq('zone_id', zoneId)
    .eq('status', 'active')
    .limit(1)
    .single()
  ```
  `optimal_conditions` es JSONB: `{ temp: "20-26", RH: "40-60", CO2: "800-1500", PPFD: "600-1000", EC: "1.2-2.4", pH: "5.5-6.5", VPD: "0.8-1.4" }`
- **RF-03**: Parsear `optimal_conditions` para extraer min/max por parámetro

### Carga de datos — Series temporales

- **RF-04**: Query de series temporales según periodo:
  ```
  -- 24h: datos raw
  supabase.from('environmental_readings')
    .select('parameter, value, unit, timestamp')
    .eq('zone_id', zoneId)
    .gte('timestamp', twentyFourHoursAgo)
    .order('timestamp')

  -- 7d/30d: requiere aggregation server-side
  -- Opción A: SQL function que retorna promedios por hora/4h
  -- Opción B: RPC call
  supabase.rpc('get_env_readings_aggregated', {
    p_zone_id: zoneId,
    p_period: '7d',  // o '30d'
    p_interval: '1 hour'  // o '4 hours'
  })
  ```
- **RF-05**: Para periodos largos (7d, 30d), usar aggregation server-side para reducir volumen de datos:
  - 7d: agrupar por hora → ~168 puntos por parámetro
  - 30d: agrupar por 4 horas → ~180 puntos por parámetro

### Realtime

- **RF-06**: Suscribirse a nuevas lecturas de la zona seleccionada:
  ```
  supabase.channel(`env-readings-${zoneId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'environmental_readings',
      filter: `zone_id=eq.${zoneId}`
    }, (payload) => {
      // Actualizar card de estado actual
      // Agregar punto al gráfico de 24h
    })
    .subscribe()
  ```
- **RF-07**: Al cambiar de zona, desuscribirse del canal anterior y suscribirse al nuevo

### Sensores

- **RF-08**: Cargar sensores de la zona:
  ```
  supabase.from('sensors')
    .select('id, type, brand_model, serial_number, calibration_date, is_active')
    .eq('zone_id', zoneId)
    .order('type')
  ```

### Vista multi-zona

- **RF-09**: Cargar resumen de todas las zonas con batch activo:
  ```
  supabase.from('zones')
    .select(`
      id, name,
      facility:facilities(id, name),
      batches!inner(id, code, status, cultivar:cultivars(name, optimal_conditions))
    `)
    .eq('batches.status', 'active')
  ```
  Para cada zona, obtener la última lectura de cada parámetro (similar a RF-01 pero en bulk).
- **RF-10**: La vista multi-zona se carga bajo demanda al activar el toggle

### Comparación con óptimo

- **RF-11**: Cuando "Comparar con óptimo" está activo:
  - Cards de estado muestran rango óptimo bajo el valor actual
  - Gráficos muestran banda verde del rango óptimo
  - Valores fuera de rango se marcan en rojo
- **RF-12**: Si no hay batch activo en la zona (o no hay optimal_conditions): ocultar comparación, mostrar solo datos raw

### Navegación

- **RF-13**: Click en "Gestionar sensores" navega a `/operations/sensors` (PRD 35) con filtro de zona
- **RF-14**: Click en batch code navega a `/production/batches/{batchId}` (PRD 25)
- **RF-15**: Click en zona en vista multi-zona selecciona esa zona en la vista principal

## Requisitos no funcionales

- **RNF-01**: RLS — environmental_readings se filtra via zone_id → facility → company_id
- **RNF-02**: La tabla `environmental_readings` está particionada por mes — las queries deben incluir filtro de timestamp para aprovechar partition pruning
- **RNF-03**: Aggregation server-side obligatoria para periodos > 24h — no traer datos raw al cliente para 7d/30d (puede ser > 100k registros)
- **RNF-04**: Los gráficos usan Recharts (ya instalado) con rendering eficiente para ~500 puntos máximo por gráfico
- **RNF-05**: Supabase Realtime para actualizaciones en vivo — polling como fallback si Realtime falla
- **RNF-06**: Las cards de estado se actualizan cada vez que llega una nueva lectura (via Realtime), no con polling
- **RNF-07**: La función SQL de aggregation debe usar índice `idx_readings_zone_param_timestamp` para queries eficientes
- **RNF-08**: Retención: datos raw 6 meses. Después aggregados a promedios horarios

## Flujos principales

### Happy path — Monitorear zona en tiempo real

1. Supervisor navega a `/operations/environmental`
2. Selecciona: Facility=Invernadero Principal, Zona=Sala Floración A, Periodo=24h
3. Cards de estado: Temp=24.5°C (verde, óptimo 20-26), Humedad=55% (verde, óptimo 40-60), CO₂=1200ppm (verde), Luz=800 µmol (verde), EC=1.8 (verde), pH=5.9 (verde)
4. Batch activo: LOT-GELATO-260301 · Gelato #41 · Floración
5. Gráficos: 6 charts con tendencias de las últimas 24h. Todos dentro de las bandas verdes
6. Mientras observa, llega nueva lectura de temperatura: 24.7°C → card se actualiza, nuevo punto aparece en el gráfico

### Detectar problema ambiental

1. Supervisor ve Temperatura=28.5°C (rojo, fuera de rango 20-26°C) ↑ tendencia ascendente
2. Gráfico de temperatura muestra ascenso progresivo en las últimas 2h con puntos rojos
3. Las demás cards están en verde
4. Navega al batch (click en LOT-GELATO-260301) para verificar si hay alertas asociadas
5. Contacta a mantenimiento para revisar el HVAC

### Vista 7 días

1. Manager selecciona Periodo=7d
2. Gráficos muestran promedios horarios de la última semana
3. Identifica un patrón: temperatura sube > 26°C cada día entre 14h-17h
4. Esto indica que la ventilación no alcanza en las horas de mayor calor
5. Usa esta información para planificar mejora de infraestructura

### Vista multi-zona

1. Manager activa "Vista multi-zona"
2. Tabla resumen muestra 8 zonas con batch activo
3. Sala Floración A: todo verde
4. Sala Vegetativa B: Humedad en amarillo (38%, óptimo 40-60%)
5. Sala Secado: Temp en rojo (32°C, óptimo 18-22°C)
6. Click en Sala Secado → cambia a vista por zona → ve gráficos detallados

### Zona sin sensores

1. Selecciona zona "Open Field A"
2. Sección sensores: vacía — "No hay sensores configurados en esta zona"
3. Cards de estado: todas gris "Sin datos"
4. Link: "Agregar sensores" → `/operations/sensors`

## Estados y validaciones

### Estados de UI — Página

| Estado     | Descripción                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| loading    | Skeleton de cards y gráficos                                                 |
| loaded     | Cards con datos, gráficos renderizados, Realtime activo                      |
| no-sensors | "No hay sensores en esta zona. Configura sensores para ver datos."           |
| no-data    | Sensores existen pero sin lecturas recientes — "Sin datos en el periodo"     |
| error      | "Error al cargar datos ambientales. Intenta nuevamente" + reintentar         |

### Estados de UI — Cards de estado

| Estado   | Descripción                                                   |
| -------- | ------------------------------------------------------------- |
| in-range | Fondo verde, valor verde — dentro del óptimo                  |
| near     | Fondo amarillo, valor amarillo — cercano al límite (±10%)     |
| out      | Fondo rojo, valor rojo, ícono alerta — fuera de rango         |
| stale    | Fondo gris — sin lectura en > 30 min                          |

### Errores esperados

| Escenario                             | Mensaje al usuario                                                |
| ------------------------------------- | ----------------------------------------------------------------- |
| Zona sin sensores                     | "No hay sensores en esta zona" (empty state con link a sensores)  |
| Sin lecturas en periodo               | "Sin datos en el periodo seleccionado"                            |
| Sin batch activo (sin óptimos)        | "No hay batch activo en esta zona — comparación no disponible"    |
| Error cargando series                 | "Error al cargar datos históricos. Intenta nuevamente" (toast)    |
| Realtime desconectado                 | Banner: "Datos en tiempo real no disponibles. Reconectando..."    |
| Error de red                          | "Error de conexión. Intenta nuevamente" (toast)                   |

## Dependencias

- **Páginas relacionadas**:
  - `/operations/sensors` — gestión de sensores (PRD 35)
  - `/operations/alerts` — alertas ambientales (PRD 33)
  - `/production/batches/[id]` — batch activo en la zona, tab ambiente (PRD 25)
  - `/areas/zones/[id]` — detalle de zona (PRD 16)
- **Edge Function**: `ingest-reading` — recibe datos de sensores (no invocada desde esta UI, pero genera los datos que aquí se muestran)
- **pg_cron**: `check_env_readings` (cada 15 min) — compara lecturas con óptimos y genera alertas
- **SQL Function**: `get_env_readings_aggregated(zone_id, period, interval)` — aggregation server-side para periodos largos
- **Supabase Realtime**: Canal `env-readings-{zoneId}` para nuevas lecturas
- **Supabase client**: PostgREST para lecturas históricas + RPC para aggregation
- **Recharts**: Librería de gráficos (ya instalada en el proyecto)
- **React Query**: Cache keys `['env-readings-current', zoneId]`, `['env-readings-series', zoneId, period]`, `['zone-sensors', zoneId]`, `['zone-active-batch', zoneId]`
