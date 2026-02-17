# F-089: Hardening IoT Webhook

## Overview

Fortalece el endpoint `/api/webhooks/iot` existente (F-045) con rate limiting, idempotencia, validacion avanzada de payloads, y soporte para ingestion por lotes. El webhook actual acepta readings individuales con autenticacion por API key y genera alertas por parametros fuera de rango, pero carece de proteccion contra abuso, duplicados, y datos malformados mas alla de la validacion basica de Zod.

## User Personas

- **Admin**: Monitorea salud del endpoint (rate limit hits, errores de validacion).
- **Supervisor**: Se beneficia indirectamente al recibir datos ambientales limpios y confiables.
- **Integracion IoT**: Dispositivos y gateways que envian datos al webhook necesitan feedback claro sobre errores y soporte para batch ingestion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-089-001 | Rate limiting por API key | M | P0 | Planned |
| US-089-002 | Validacion avanzada y idempotencia | M | P0 | Planned |
| US-089-003 | Ingestion por lotes (batch endpoint) | M | P1 | Planned |

---

# US-089-001: Rate limiting por API key

## User Story

**As a** admin,
**I want** que el webhook IoT rechace solicitudes que excedan un limite de tasa por API key,
**So that** el sistema este protegido contra abuso, sensores defectuosos que envian en bucle, o ataques de denegacion de servicio.

## Acceptance Criteria

### Scenario 1: Solicitudes dentro del limite
- **Given** el API key "sensor-gw-01" tiene un limite de 100 requests/minuto
- **When** el gateway envia 80 readings en 1 minuto
- **Then** todas las solicitudes retornan 201 Created normalmente
- **And** el header `X-RateLimit-Remaining` indica las solicitudes restantes

### Scenario 2: Solicitudes que exceden el limite
- **Given** el API key "sensor-gw-01" ha consumido sus 100 requests del minuto actual
- **When** el gateway envia una solicitud adicional
- **Then** el endpoint retorna 429 Too Many Requests
- **And** el body incluye `{ "error": "Rate limit exceeded", "retryAfter": 42 }` con los segundos restantes
- **And** el header `Retry-After` indica cuando puede reintentar

### Scenario 3: Reset del contador por ventana de tiempo
- **Given** el API key "sensor-gw-01" alcanzo su limite a las 14:00:45
- **When** pasa 1 minuto y el gateway envia una nueva solicitud a las 14:01:46
- **Then** la solicitud se procesa normalmente con el contador reseteado a 1/100

### Scenario 4: API keys independientes
- **Given** existen 2 API keys activas: "sensor-gw-01" y "sensor-gw-02"
- **When** "sensor-gw-01" alcanza su limite
- **Then** "sensor-gw-02" puede seguir enviando solicitudes sin restriccion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Rate limiting funcional con ventana deslizante de 1 minuto
- [ ] Headers de rate limit en todas las respuestas (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)
- [ ] Criterios de aceptacion verificados
- [ ] Sin impacto en latencia del happy path (<5ms overhead)

## Technical Notes
- **Implementacion**: `Map<string, { count: number; resetAt: number }>` en memoria del proceso (Vercel serverless). Alternativa si se necesita distribuido: Vercel KV (`@vercel/kv`) con INCR + EXPIRE
- **Ubicacion**: Guard al inicio de `POST()` en `src/app/api/webhooks/iot/route.ts`, antes de parsear el body
- **Configuracion**: `RATE_LIMIT_PER_MINUTE=100` como constante (o env var)
- **Logging**: Registrar rate limit hits para monitoreo (console.warn con API key ofuscada)

## UI/UX Notes
- No aplica directamente — endpoint de API

## Dependencies
- F-045 (webhook IoT existente que se hardena)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-089-002: Validacion avanzada y idempotencia

## User Story

**As a** admin,
**I want** que el webhook rechace datos con timestamps futuros, valores fisicamente imposibles, y detecte readings duplicados,
**So that** la base de datos de lecturas ambientales sea confiable y libre de datos espurios o duplicados.

## Acceptance Criteria

### Scenario 1: Rechazar timestamp futuro
- **Given** la hora actual del servidor es 2026-02-17T14:00:00Z
- **When** un sensor envia una lectura con timestamp 2026-02-18T10:00:00Z (1 dia en el futuro)
- **Then** el endpoint retorna 422 con `{ "error": "Timestamp is in the future", "maxDrift": "5m" }`
- **And** la lectura NO se inserta en environmental_readings

### Scenario 2: Aceptar timestamp con drift menor a 5 minutos
- **Given** la hora actual es 14:00:00Z
- **When** un sensor envia con timestamp 14:04:30Z (4.5 minutos adelantado)
- **Then** la lectura se acepta normalmente (tolerancia de clock drift)

### Scenario 3: Rechazar valor fuera de rango fisico
- **Given** el parametro es "temperature" con rango fisico valido de -40C a 80C
- **When** un sensor envia temperature=500
- **Then** el endpoint retorna 422 con `{ "error": "Value out of physical range", "parameter": "temperature", "validRange": [-40, 80] }`

### Scenario 4: Detectar reading duplicado (idempotencia)
- **Given** el sensor "SENS-001" ya envio una lectura de temperature=25.3 con timestamp 14:00:00Z
- **When** el mismo sensor envia otra lectura de temperature=25.3 con el mismo timestamp (retry de gateway)
- **Then** el endpoint retorna 200 OK (no 201) con `{ "status": "duplicate", "message": "Reading already recorded" }`
- **And** no se inserta un registro duplicado en environmental_readings

### Scenario 5: Misma hora pero diferente parametro no es duplicado
- **Given** el sensor "SENS-001" envio temperature=25.3 a las 14:00:00Z
- **When** el mismo sensor envia humidity=65 con timestamp 14:00:00Z
- **Then** la lectura se procesa normalmente como nuevo registro (201 Created)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion de timestamp con tolerancia configurable
- [ ] Rangos fisicos definidos por tipo de parametro
- [ ] Deduplicacion por (sensor_id, parameter, timestamp)
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Rangos fisicos**: Mapa constante `PHYSICAL_RANGES: Record<string, { min: number; max: number }>` — temperature [-40, 80], humidity [0, 100], co2 [0, 5000], vpd [0, 10], light_intensity [0, 200000], ph [0, 14], ec [0, 20]
- **Drift tolerance**: `MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000` (5 minutos)
- **Deduplicacion**: Query `SELECT 1 FROM environmental_readings WHERE sensor_id AND parameter AND timestamp LIMIT 1` antes de INSERT. Alternativamente, UNIQUE constraint en DB `(sensor_id, parameter, timestamp)`
- **Orden de validaciones**: Rate limit → Auth → Parse JSON → Zod schema → Timestamp check → Physical range → Sensor lookup → Dedup check → INSERT

## UI/UX Notes
- No aplica — endpoint de API
- Los errores 422 deben incluir detail suficiente para que el equipo de IoT diagnostique problemas

## Dependencies
- F-045 (webhook existente)
- US-089-001 (rate limiting ejecuta primero en la cadena)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-089-003: Ingestion por lotes (batch endpoint)

## User Story

**As a** admin,
**I want** que el webhook acepte multiples readings en un solo request HTTP,
**So that** los gateways IoT puedan enviar datos acumulados de forma eficiente, reduciendo overhead de red y mejorando throughput.

## Acceptance Criteria

### Scenario 1: Enviar lote de readings exitosamente
- **Given** un gateway tiene 10 readings acumulados de 3 sensores diferentes
- **When** envia un POST con `{ "readings": [...10 items...] }` al mismo endpoint
- **Then** todas las readings se procesan y retorna 207 Multi-Status con resumen:
```json
{
  "total": 10,
  "created": 8,
  "duplicates": 1,
  "errors": 1,
  "details": [
    { "index": 4, "status": "duplicate" },
    { "index": 7, "status": "error", "error": "Value out of physical range" }
  ]
}
```

### Scenario 2: Lote con algunos errores no bloquea los validos
- **Given** un lote de 5 readings donde la #3 tiene timestamp futuro
- **When** se envia el lote
- **Then** readings 1, 2, 4, 5 se insertan normalmente
- **And** reading 3 se reporta como error en el response
- **And** el status HTTP es 207 (no 422)

### Scenario 3: Limite maximo de readings por lote
- **Given** el limite maximo por lote es 100 readings
- **When** un gateway envia un lote con 150 readings
- **Then** el endpoint retorna 422 con `{ "error": "Batch too large", "maxBatchSize": 100 }`
- **And** ninguna reading se procesa

### Scenario 4: Retrocompatibilidad con single reading
- **Given** un sensor legacy envia un reading individual (formato actual sin wrapper `readings`)
- **When** el webhook recibe el payload
- **Then** se procesa normalmente como un solo reading (retorna 201 como antes)

### Scenario 5: Rate limiting cuenta cada reading del lote
- **Given** el limite es 100 requests/minuto y el gateway ya consumio 95
- **When** envia un lote de 10 readings
- **Then** se procesan las primeras 5 readings (hasta el limite)
- **And** retorna 207 con las 5 restantes marcadas como `"rate_limited"`

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Formato single reading sigue funcionando (retrocompatible)
- [ ] Formato batch con array de readings funcional
- [ ] Criterios de aceptacion verificados
- [ ] Performance: lote de 100 readings se procesa en <2 segundos

## Technical Notes
- **Detection**: Si body tiene campo `readings` (array) → modo batch. Si no → modo single (legacy)
- **Zod schema batch**: `z.object({ readings: z.array(iotReadingSchema).min(1).max(100) })`
- **Processing**: Iterar readings con Promise.allSettled o INSERT batch con CTE. Cada reading pasa por las mismas validaciones (timestamp, range, dedup)
- **Alertas**: Generar alertas solo para la PRIMERA reading out-of-range de cada (zone, parameter) en el lote (evitar spam de alertas)
- **Transaction**: No usar transaccion para el lote completo — readings validas se insertan independientemente de las invalidas

## UI/UX Notes
- No aplica — endpoint de API
- Documentar formato batch en README o doc interno para equipo IoT

## Dependencies
- US-089-001 (rate limiting)
- US-089-002 (validacion avanzada y dedup)

## Estimation
- **Size**: M
- **Complexity**: High
