# F-045: Monitoreo Ambiental Real-Time

## Overview

Dashboard de monitoreo ambiental en tiempo real que muestra condiciones de todas las zonas monitoreadas con dials circulares por parametro (temperatura, humedad, CO2, VPD). Incluye refresh automatico por polling, API Route para ingestion de datos de sensores IoT, y Server Actions para consultar condiciones y generar alertas automaticas cuando los valores salen del rango optimo.

## User Personas

- **Supervisor**: Monitorea condiciones ambientales de sus zonas en tiempo real, detecta desviaciones rapidamente.
- **Gerente**: Tiene visibilidad global del estado ambiental de la operacion.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-045-001 | Dashboard de zonas con dials circulares | M | P0 | Planned |
| US-045-002 | Refresh automatico con polling | S | P0 | Planned |
| US-045-003 | API Route /api/webhooks/iot para ingestion | M | P0 | Planned |
| US-045-004 | Server Action ingestReading con generacion de alertas | M | P0 | Planned |
| US-045-005 | Server Action getZoneConditions | S | P1 | Planned |

---

# US-045-001: Dashboard de zonas con dials circulares

## User Story

**As a** supervisor,
**I want** ver un dashboard con cards por zona monitoreada, cada una con dials circulares para temperatura, humedad, CO2 y VPD,
**So that** pueda monitorear el estado ambiental de todas mis zonas de un vistazo.

## Acceptance Criteria

### Scenario 1: Dashboard con multiples zonas monitoreadas
- **Given** la facility tiene 4 zonas con sensores activos
- **When** el supervisor navega a la pantalla ops-env
- **Then** se muestra un grid de 4 cards, una por zona
- **And** cada card tiene: nombre de zona, 4 dials circulares (temp, HR, CO2, VPD)
- **And** cada dial muestra valor actual, color segun rango optimo (verde/amarillo/rojo)
- **And** tap en una card navega a area-zone-detail

### Scenario 2: Zona sin sensores
- **Given** una zona de la facility no tiene sensores configurados
- **When** se renderiza el dashboard
- **Then** esa zona NO se muestra en el grid (solo zonas con al menos 1 sensor activo)

### Scenario 3: Zona con lecturas parciales
- **Given** una zona tiene sensor de temperatura y humedad pero no de CO2 ni VPD
- **When** se renderiza su card
- **Then** los dials de temp y HR muestran valores actuales
- **And** los dials de CO2 y VPD muestran "N/A" con icono de sensor ausente

### Scenario 4: Todas las zonas en rango
- **Given** todas las lecturas de todas las zonas estan dentro del rango optimo
- **When** se renderiza el dashboard
- **Then** todos los dials estan en verde
- **And** se muestra un indicador global "Todas las zonas en rango" en el header

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Componente DialGauge reutilizable (compartido con F-042)
- [ ] Performance: dashboard renderiza < 1s con 10 zonas
- [ ] Accesibilidad: cada dial con aria-label descriptivo

## Technical Notes
- Pantalla: `ops-env`
- Reutiliza Server Action `getZoneConditions(zoneId)` por cada zona
- Query inicial: cargar todas las zonas con sensores activos, luego ultima lectura por parametro por zona
- Componente: `EnvDashboard` -> `ZoneEnvCard` -> `DialGauge`
- Reutiliza DialGauge de F-042

## UI/UX Notes
- Grid: 1 columna mobile, 2 columnas tablet, 3-4 columnas desktop
- Cards con border-radius 16px, padding 16px
- Dials: 80px diametro en card, 4 dials en grid 2x2 dentro de cada card
- Nombre de zona: DM Sans Bold 16px
- Subtitulo: ultimo update timestamp en DM Sans 11px text-secondary

## Dependencies
- F-046 (sensores deben estar configurados)
- F-042 (componente DialGauge compartido)
- Fase 0: schema DB (environmental_readings, sensors, zones, cultivars)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-045-002: Refresh automatico con polling

## User Story

**As a** supervisor,
**I want** que el dashboard ambiental se actualice automaticamente cada 30-60 segundos,
**So that** vea las condiciones mas recientes sin necesidad de refrescar manualmente la pagina.

## Acceptance Criteria

### Scenario 1: Polling actualiza valores
- **Given** el dashboard esta abierto con datos cargados
- **When** pasan 30 segundos
- **Then** se hace un refetch automatico de las lecturas mas recientes
- **And** los dials se actualizan con animacion suave (transicion de valor)
- **And** el timestamp de "ultima actualizacion" se actualiza

### Scenario 2: Valor cambia de rango durante polling
- **Given** la temperatura de una zona estaba en 25 C (en rango verde)
- **When** el polling trae una nueva lectura de 28 C (fuera de rango, amarillo)
- **Then** el dial transiciona de verde a amarillo con animacion
- **And** se muestra una notificacion sutil (dot indicator, no toast intrusivo)

### Scenario 3: Polling cuando la tab no esta activa
- **Given** el usuario cambia a otra pestana del navegador
- **When** la tab de ops-env no esta visible
- **Then** el polling se pausa para ahorrar recursos
- **And** al volver a la tab, se hace un refetch inmediato

### Scenario 4: Polling sin conexion
- **Given** el usuario pierde conexion a internet
- **When** llega el momento del siguiente polling
- **Then** el refetch falla silenciosamente
- **And** se muestra "Ultima actualizacion: hace X minutos" en amarillo
- **And** al recuperar conexion, se retoma el polling automaticamente

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Polling se pausa cuando la tab no esta activa
- [ ] No memory leaks al navegar fuera de la pantalla

## Technical Notes
- Implementar con TanStack Query `refetchInterval: 30000` (30s configurable)
- Usar `refetchIntervalInBackground: false` para pausar en tabs inactivas
- Animacion de transicion en DialGauge via CSS transition en el arco SVG
- Zustand store o config para intervalo de polling (30s supervisor, 60s gerente)

## UI/UX Notes
- Transicion de valor: ease-out 400ms
- Timestamp: "Actualizado hace 15s" en DM Sans 11px, se actualiza cada segundo
- Si datos > 5 min antiguos: timestamp en amarillo con icono warning
- Animacion sutil de "pulse" cuando un valor cambia

## Dependencies
- US-045-001 (dashboard de zonas)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-045-003: API Route /api/webhooks/iot para ingestion

## User Story

**As a** admin,
**I want** que exista un endpoint API que reciba lecturas de sensores IoT via POST,
**So that** los dispositivos de campo puedan enviar datos ambientales al sistema de forma automatica y segura.

## Acceptance Criteria

### Scenario 1: Lectura valida recibida correctamente
- **Given** un sensor con serial "TROL-001" esta registrado en la tabla sensors
- **When** se recibe POST a /api/webhooks/iot con body `{sensor_serial: "TROL-001", parameter: "temperature", value: 24.5, unit: "C", timestamp: "2026-02-16T10:30:00Z"}` y header `X-API-Key: valid-key`
- **Then** el endpoint retorna 201 Created
- **And** se inserta un registro en environmental_readings con sensor_id mapeado desde serial
- **And** se ejecuta la logica de alerta si el valor esta fuera de rango

### Scenario 2: API key invalida
- **Given** se recibe un POST con X-API-Key incorrecto
- **When** se procesa el request
- **Then** el endpoint retorna 401 Unauthorized
- **And** no se inserta ninguna lectura

### Scenario 3: Sensor serial no encontrado
- **Given** se recibe un POST con sensor_serial "UNKNOWN-999"
- **When** se busca el sensor en la tabla sensors
- **Then** el endpoint retorna 404 Not Found con mensaje "Sensor no encontrado"

### Scenario 4: Lectura duplicada (idempotencia)
- **Given** se recibe una lectura con sensor_serial "TROL-001" y timestamp "2026-02-16T10:30:00Z" que ya existe
- **When** se procesa el request
- **Then** el endpoint retorna 200 OK (no 201) sin insertar duplicado
- **And** la respuesta indica "Lectura ya registrada"

### Scenario 5: Timestamp futuro rechazado
- **Given** se recibe una lectura con timestamp 2 horas en el futuro
- **When** se valida el payload
- **Then** el endpoint retorna 422 Unprocessable Entity con mensaje "Timestamp no puede ser futuro"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Rate limiting configurado (100 req/min por sensor)
- [ ] Criterios de aceptacion verificados
- [ ] Endpoint documentado con payload de ejemplo

## Technical Notes
- Route: `app/api/webhooks/iot/route.ts`
- Auth: API key en header X-API-Key, validada contra env var `IOT_API_KEY`
- Payload validado con `sensorReadingSchema` de `area.schema.ts`
- Mapeo: `sensor_serial -> sensor_id` via `SELECT id, zone_id FROM sensors WHERE serial_number = :serial AND is_active = true`
- Idempotencia: `SELECT COUNT(*) FROM environmental_readings WHERE sensor_id = :id AND timestamp = :ts`
- Llama a Server Action `ingestReading()` para logica de negocio
- Rate limit: implementar con Vercel KV o in-memory counter por API key

## UI/UX Notes
- No aplica (endpoint API sin UI)

## Dependencies
- F-046 (sensores registrados en DB)
- Fase 0: schema DB (sensors, environmental_readings)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-045-004: Server Action ingestReading con generacion de alertas

## User Story

**As a** supervisor,
**I want** que cada lectura de sensor se compare automaticamente contra el rango optimo del cultivar en la zona y genere alertas cuando los valores se desvian,
**So that** el sistema me notifique proactivamente de condiciones ambientales problematicas.

## Acceptance Criteria

### Scenario 1: Lectura dentro de rango — sin alerta
- **Given** la zona tiene cultivar Gelato con temp optima 20-26 C
- **When** se ingesta una lectura de temperatura de 24 C
- **Then** se inserta el registro en environmental_readings
- **And** NO se genera alerta
- **And** se emite broadcast via Supabase Realtime canal `env:{zone_id}`

### Scenario 2: Lectura fuera de rango — alerta warning
- **Given** la zona tiene cultivar Gelato con temp optima 20-26 C
- **When** se ingesta una lectura de temperatura de 27.5 C (desviacion 5.7%)
- **Then** se inserta el registro en environmental_readings
- **And** se genera alerta: type='env_out_of_range', severity='warning', message='Temperatura 27.5 C excede rango optimo (20-26 C) en {zona}'

### Scenario 3: Lectura critica fuera de rango — alerta critical
- **Given** la zona tiene cultivar con temp optima 20-26 C
- **When** se ingesta una lectura de 30 C (desviacion > 10%)
- **Then** se genera alerta con severity='critical'

### Scenario 4: Debounce de alertas — no duplicar en 30 minutos
- **Given** ya existe una alerta activa type='env_out_of_range' para esta zona y parametro creada hace 15 minutos
- **When** se ingesta otra lectura fuera de rango
- **Then** NO se crea una nueva alerta (debounce 30 min)
- **And** el registro de lectura si se inserta normalmente

### Scenario 5: Zona sin cultivar — sin comparacion
- **Given** la zona no tiene batches activos (sin cultivar para comparar)
- **When** se ingesta una lectura
- **Then** se inserta el registro pero NO se evalua contra rango optimo
- **And** NO se genera alerta

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Logica de severidad probada: < 5% ok, 5-10% warning, > 10% critical
- [ ] Debounce de 30 min probado

## Technical Notes
- Server Action: `ingestReading(input: SensorReadingSchema)` en `lib/actions/operations.actions.ts`
- Logica:
  1. INSERT en environmental_readings
  2. Determinar cultivar principal: `SELECT c.optimal_conditions FROM batches b JOIN cultivars c ON b.cultivar_id = c.id WHERE b.zone_id = :zoneId AND b.status = 'active' ORDER BY b.plant_count DESC LIMIT 1`
  3. Comparar valor vs rango optimo del parametro
  4. Calcular desviacion: `abs(value - nearest_bound) / range_width * 100`
  5. Si desviacion > 5%: check debounce `SELECT COUNT(*) FROM alerts WHERE entity_type = 'sensor' AND entity_id = :sensorId AND type = 'env_out_of_range' AND triggered_at > NOW() - INTERVAL '30 minutes' AND resolved_at IS NULL`
  6. Si no hay alerta reciente: INSERT alert
  7. Broadcast via Supabase Realtime `env:{zone_id}`
- Zod schema: `sensorReadingSchema`

## UI/UX Notes
- No aplica directamente (backend), pero las alertas generadas se muestran en F-047 (Centro de alertas) y en el dashboard

## Dependencies
- US-045-003 (API Route que llama a esta action)
- F-047 (centro de alertas consume las alertas generadas)
- Fase 0: schema DB (environmental_readings, alerts, sensors, cultivars)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-045-005: Server Action getZoneConditions

## User Story

**As a** supervisor,
**I want** consultar las condiciones ambientales actuales de una zona con su comparacion contra rangos optimos,
**So that** la UI pueda renderizar dials con estado correcto sin logica duplicada en el frontend.

## Acceptance Criteria

### Scenario 1: Zona con lecturas y cultivar
- **Given** la zona tiene lecturas recientes de temp, HR, CO2, VPD y un cultivar con optimal_conditions
- **When** se llama a getZoneConditions(zoneId)
- **Then** retorna un array de parametros, cada uno con: parameter, value, unit, timestamp, optimal_min, optimal_max, status ('ok' | 'warning' | 'critical')

### Scenario 2: Zona sin cultivar
- **Given** la zona no tiene batches activos
- **When** se llama a getZoneConditions(zoneId)
- **Then** retorna los valores actuales con optimal_min = null, optimal_max = null, status = 'neutral'

### Scenario 3: Zona sin lecturas recientes
- **Given** la zona tiene sensores pero la ultima lectura es de hace 2 horas
- **When** se llama a getZoneConditions(zoneId)
- **Then** retorna los ultimos valores disponibles con un flag `stale: true` y `lastReadingAt` con el timestamp

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Type-safe: retorna tipo `ZoneCondition[]` definido en types

## Technical Notes
- Server Action: `getZoneConditions(zoneId: string)` en `lib/actions/operations.actions.ts`
- Query: `SELECT DISTINCT ON (parameter) * FROM environmental_readings WHERE zone_id = :zoneId ORDER BY parameter, timestamp DESC`
- Cultivar principal: query derivada de batch con mas plantas en la zona
- Return type: `{ parameter: string, value: number, unit: string, timestamp: string, optimal_min: number | null, optimal_max: number | null, status: 'ok' | 'warning' | 'critical' | 'neutral', stale: boolean, lastReadingAt: string }`
- Threshold para stale: > 30 minutos sin lectura

## UI/UX Notes
- No aplica (Server Action consumida por componentes de F-042 y F-045)

## Dependencies
- Fase 0: schema DB (environmental_readings, sensors, cultivars, batches)

## Estimation
- **Size**: S
- **Complexity**: Low
