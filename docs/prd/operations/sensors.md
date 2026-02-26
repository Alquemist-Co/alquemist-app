# Gestión de Sensores

## Metadata

- **Ruta**: `/operations/sensors`
- **Roles con acceso**: admin (CRUD completo), manager (CRUD completo), supervisor (lectura + editar estado activo/inactivo), operator (solo lectura), viewer (solo lectura)
- **Tipo componente**: Mixto (Server Component para listado, Client Component para formularios CRUD y filtros)
- **Edge Functions**: Ninguna — operaciones CRUD directas via PostgREST

## Objetivo

Catálogo de sensores IoT instalados en las zonas. Permite registrar nuevos sensores, asignarlos a zonas, registrar calibraciones, y activar/desactivar sensores. Cada sensor genera lecturas ambientales que se muestran en el monitor ambiental (PRD 34).

Desde aquí también se puede ver un resumen del estado de cada sensor: última lectura, tiempo desde la última lectura (para detectar sensores desconectados), y fecha de última calibración.

Usuarios principales: managers de operaciones que configuran sensores, supervisores que verifican estado.

## Tablas del modelo involucradas

| Tabla                  | Operaciones | Notas                                                                    |
| ---------------------- | ----------- | ------------------------------------------------------------------------ |
| sensors                | R/W         | CRUD completo. RLS via zone → facility → company                        |
| zones                  | R           | Zonas disponibles para asignación de sensores                            |
| facilities             | R           | Facilities para filtro                                                   |
| environmental_readings | R           | Última lectura del sensor (para mostrar estado de conectividad)          |

## ENUMs utilizados

| ENUM        | Valores                                                                      | Tabla.campo  |
| ----------- | ---------------------------------------------------------------------------- | ------------ |
| sensor_type | temperature \| humidity \| co2 \| light \| ec \| ph \| soil_moisture \| vpd | sensors.type |

## Layout y componentes principales

Página dentro del layout de dashboard con sidebar.

- **Header de página** — Título "Sensores"
  - Subtítulo: "{n} sensores registrados"
  - Botón "Nuevo sensor" (variant="primary") — solo admin/manager
- **Barra de KPIs** — Row de cards compactas:
  - Activos: {n} (verde)
  - Inactivos: {n} (gris)
  - Sin señal (>30 min): {n} (rojo — sensores activos sin lectura reciente)
  - Calibración vencida (>90 días): {n} (amarillo)
- **Barra de filtros** — Row de filtros:
  - Select: Facility (todas por default)
  - Select: Zona (todas, filtrado por facility)
  - Select: Tipo de sensor (todos)
  - Select: Estado (todos, activo, inactivo)
  - Search: Buscar por marca/modelo, serial
  - Botón "Limpiar filtros"
- **Tabla principal** — Tabla paginada
  - Columnas:
    - Tipo (badge con color por sensor_type: temp=rojo, humidity=azul, co2=verde, light=amarillo, ec=naranja, ph=morado, soil_moisture=marrón, vpd=cyan)
    - Marca/Modelo (brand_model)
    - Serial (serial_number)
    - Zona (zone.name — link)
    - Facility (zone.facility.name)
    - Estado (badge: activo=verde, inactivo=gris)
    - Última lectura (timestamp relative: "Hace 2 min", "Hace 1h", o "Sin señal" en rojo si >30 min)
    - Última calibración (fecha, badge amarillo si > 90 días)
    - Acciones: "Editar" (admin/manager), "Activar/Desactivar" (admin/manager/supervisor)
  - Ordenamiento: por zona + tipo (default)
  - Paginación: 20 items por página
- **Dialog: Nuevo sensor / Editar sensor** — Modal
  - Select: Tipo de sensor (req) — dropdown con íconos por tipo
  - Select: Zona (req) — dropdown filtrado por facility, muestra facility > zona
  - Input: Marca/Modelo (opt) — text
  - Input: Número de serie (opt) — text
  - DatePicker: Fecha de calibración (opt) — última calibración
  - Checkbox: Activo (default=true)
  - Botón "Guardar" (variant="primary")
- **Dialog: Confirmar desactivación** — Modal simple
  - "¿Desactivar sensor {brand_model} ({serial})? Las lecturas de este sensor dejarán de registrarse."
  - Botón "Desactivar" (variant="destructive")

**Responsive**: Tabla con scroll horizontal en móvil. KPIs en 2×2 grid. Dialog full-screen en móvil.

## Requisitos funcionales

### Carga de datos

- **RF-01**: Query principal:
  ```
  supabase.from('sensors')
    .select(`
      *,
      zone:zones(id, name, facility:facilities(id, name))
    `, { count: 'exact' })
    .order('zone_id')
    .order('type')
    .range(offset, offset + pageSize - 1)
  ```
- **RF-02**: Para cada sensor, obtener la última lectura para mostrar estado de conectividad:
  ```
  -- Opción A: query separada por sensor_id (N+1, pero con límite de página es aceptable)
  supabase.from('environmental_readings')
    .select('timestamp')
    .eq('sensor_id', sensorId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  -- Opción B: RPC que retorna última lectura por sensor en batch
  supabase.rpc('get_sensors_last_reading', { p_sensor_ids: sensorIds })
  ```
- **RF-03**: KPIs:
  ```
  -- Activos
  supabase.from('sensors').select('id', { count: 'exact', head: true }).eq('is_active', true)
  -- Inactivos
  supabase.from('sensors').select('id', { count: 'exact', head: true }).eq('is_active', false)
  -- Sin señal y Calibración vencida se calculan client-side con los datos de la tabla + últimas lecturas
  ```

### Crear sensor

- **RF-04**: Al crear:
  ```
  supabase.from('sensors')
    .insert({
      zone_id,
      type,
      brand_model,
      serial_number,
      calibration_date,
      is_active: true
    })
    .select()
    .single()
  ```
- **RF-05**: Toast: "Sensor registrado exitosamente"
- **RF-06**: Invalidar cache de tabla y KPIs

### Editar sensor

- **RF-07**: Al editar:
  ```
  supabase.from('sensors')
    .update({ zone_id, type, brand_model, serial_number, calibration_date, is_active })
    .eq('id', sensorId)
  ```
- **RF-08**: Toast: "Sensor actualizado"

### Activar/Desactivar

- **RF-09**: Toggle rápido (sin abrir dialog de edición completo):
  ```
  supabase.from('sensors')
    .update({ is_active: !currentState })
    .eq('id', sensorId)
  ```
- **RF-10**: Si se desactiva, dialog de confirmación primero (RF: sensor deja de registrar lecturas)
- **RF-11**: Si se activa, update directo con toast "Sensor activado"

### Eliminar sensor

- **RF-12**: Solo admin puede eliminar. Solo si no tiene lecturas asociadas (o con confirmación fuerte):
  ```
  supabase.from('sensors').delete().eq('id', sensorId)
  ```
- **RF-13**: Si tiene lecturas: "Este sensor tiene {n} lecturas registradas. ¿Eliminar de todos modos? Las lecturas históricas se conservarán." (el FK es nullable o se maneja con SET NULL)
- **RF-14**: Alternativa preferida: desactivar en lugar de eliminar para preservar trazabilidad

### Navegación

- **RF-15**: Click en zona navega a `/areas/zones/{zoneId}` (PRD 16)
- **RF-16**: Link "Ver monitor ambiental" → `/operations/environmental` (PRD 34) con zona pre-seleccionada

## Requisitos no funcionales

- **RNF-01**: RLS Pattern 2 — sensors hereda aislamiento via zone_id → facility → company_id
- **RNF-02**: Paginación server-side (20 items por página)
- **RNF-03**: El estado "Sin señal" se determina client-side comparando timestamp de última lectura con now() - 30 min
- **RNF-04**: La calibración "vencida" se determina client-side: calibration_date + 90 días < today
- **RNF-05**: Los sensores desactivados no son consultados por el pg_cron `check_env_readings` ni por la Edge Function `ingest-reading`

## Flujos principales

### Happy path — Registrar nuevo sensor

1. Manager navega a `/operations/sensors`
2. KPIs: 12 activos, 2 inactivos, 0 sin señal, 1 calibración vencida
3. Click "Nuevo sensor"
4. Dialog: Tipo=temperature, Zona=Sala Floración A (Invernadero Principal), Marca=Trolmaster HCS-1, Serial=TM-HCS1-0042, Calibración=25/02/2026, Activo=✓
5. Click "Guardar" → toast "Sensor registrado exitosamente"
6. Tabla se actualiza con nuevo sensor. KPIs: 13 activos
7. El sensor empieza a recibir lecturas via `ingest-reading` (configuración del hardware es externa al sistema)

### Detectar sensor desconectado

1. Supervisor ve KPIs: 1 sensor sin señal (rojo)
2. Filtra: sin señal → tabla muestra 1 sensor: Trolmaster EC-01 en Sala Secado, última lectura hace 3h
3. Verifica físicamente el sensor → estaba desconectado de la red
4. Reconecta → en minutos la última lectura se actualiza → badge "Sin señal" desaparece

### Calibración vencida

1. KPIs muestran 1 calibración vencida (amarillo)
2. Filtra por calibración vencida → sensor de pH, última calibración hace 120 días
3. Programa calibración del sensor
4. Después de calibrar, edita el sensor: Fecha calibración=25/02/2026
5. Badge amarillo desaparece

### Desactivar sensor para mantenimiento

1. Manager selecciona sensor de CO₂ → "Desactivar"
2. Dialog: "¿Desactivar? Las lecturas dejarán de registrarse"
3. Confirma → sensor inactivo (gris), no genera más lecturas ni alertas
4. Tras reparación → "Activar" → sensor vuelve a registrar

## Estados y validaciones

### Estados de UI — Página

| Estado  | Descripción                                                     |
| ------- | --------------------------------------------------------------- |
| loading | Skeleton de KPIs y tabla                                        |
| loaded  | KPIs y tabla con datos                                          |
| empty   | "No hay sensores registrados. Agrega tu primer sensor."         |
| error   | "Error al cargar sensores. Intenta nuevamente" + reintentar     |

### Estados de UI — Dialog

| Estado     | Descripción                                    |
| ---------- | ---------------------------------------------- |
| idle       | Campos listos                                  |
| submitting | Botón loading, campos disabled                 |
| success    | Dialog cierra, toast éxito, tabla se actualiza |
| error      | Toast error, dialog permanece                  |

### Validaciones Zod — Sensor

```
type: z.enum(['temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd'], { message: 'Selecciona un tipo de sensor' })
zone_id: z.string().uuid('Selecciona una zona')
brand_model: z.string().max(200).optional().or(z.literal(''))
serial_number: z.string().max(100).optional().or(z.literal(''))
calibration_date: z.string().optional().or(z.literal(''))
is_active: z.boolean().default(true)
```

### Errores esperados

| Escenario                     | Mensaje al usuario                                            |
| ----------------------------- | ------------------------------------------------------------- |
| Sin sensores                  | "No hay sensores registrados" (empty)                         |
| Zona no seleccionada          | "Selecciona una zona" (inline)                                |
| Tipo no seleccionado          | "Selecciona un tipo de sensor" (inline)                       |
| Error creando sensor          | "Error al registrar el sensor" (toast)                        |
| Error eliminando              | "Error al eliminar el sensor" (toast)                         |
| Sensor con lecturas           | "Este sensor tiene lecturas. ¿Eliminar de todos modos?"       |
| Error de red                  | "Error de conexión. Intenta nuevamente" (toast)               |

## Dependencias

- **Páginas relacionadas**:
  - `/operations/environmental` — monitor ambiental que consume lecturas (PRD 34)
  - `/operations/alerts` — alertas de env_out_of_range referenciadas por sensor (PRD 33)
  - `/areas/zones/[id]` — detalle de zona con sensores (PRD 16)
- **Edge Function**: `ingest-reading` — recibe datos de sensores (configurada en hardware, no en esta UI)
- **pg_cron**: `check_env_readings` — verifica lecturas de sensores activos contra óptimos
- **Supabase client**: PostgREST para CRUD
- **SQL Function** (opcional): `get_sensors_last_reading(sensor_ids UUID[])` — retorna última lectura por sensor en batch
- **React Query**: Cache keys `['sensors', { filters, page }]`, `['sensor-counts']`
