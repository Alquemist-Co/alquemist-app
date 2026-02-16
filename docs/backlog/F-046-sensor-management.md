# F-046: Gestion de Sensores

## Overview

Pantalla CRUD para administrar los sensores IoT instalados en las zonas de la facility. Permite registrar sensores con su zona, tipo, marca/modelo, serial y fecha de calibracion. Incluye indicadores de estado (activo/inactivo) y alertas de calibracion vencida. Es requisito previo para el monitoreo ambiental (F-045).

## User Personas

- **Admin**: Configura sensores, registra nuevos dispositivos, actualiza calibraciones.
- **Supervisor**: Consulta sensores de sus zonas, reporta problemas.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-046-001 | Lista de sensores con indicadores de estado | S | P0 | Planned |
| US-046-002 | Crear y editar sensor | M | P0 | Planned |
| US-046-003 | Indicador de calibracion vencida | S | P1 | Planned |

---

# US-046-001: Lista de sensores con indicadores de estado

## User Story

**As a** admin,
**I want** ver una lista de todos los sensores registrados con su zona, tipo, serial, estado de calibracion y estado activo,
**So that** pueda gestionar el inventario de dispositivos IoT de la operacion.

## Acceptance Criteria

### Scenario 1: Lista con multiples sensores
- **Given** la facility tiene 12 sensores distribuidos en 4 zonas
- **When** el admin navega a la pantalla ops-sensors
- **Then** se muestra una tabla con columnas: zona, tipo, marca/modelo, serial, fecha calibracion, estado activo
- **And** los sensores se agrupan o pueden filtrarse por zona
- **And** cada fila muestra un indicador de estado: verde (activo y calibrado), amarillo (calibracion vencida), gris (inactivo)

### Scenario 2: Filtrar por zona
- **Given** la lista muestra 12 sensores de 4 zonas
- **When** el admin selecciona filtro zona = "Sala Floracion A"
- **Then** solo se muestran los sensores de esa zona

### Scenario 3: Sin sensores registrados
- **Given** la facility no tiene sensores
- **When** el admin navega a ops-sensors
- **Then** se muestra empty state "No hay sensores registrados"
- **And** CTA "Registrar sensor" abre el formulario de creacion

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Tabla responsive: cards en mobile, tabla en desktop
- [ ] Accesibilidad: tabla con headers, sortable columns con aria-sort

## Technical Notes
- Pantalla: `ops-sensors`
- Query: `SELECT s.*, z.name as zone_name FROM sensors s JOIN zones z ON s.zone_id = z.id WHERE z.facility_id IN (SELECT id FROM facilities WHERE company_id = auth.company_id())`
- RLS: sensors tiene company_id? No directamente — hereda via zone -> facility -> company. Aplicar RLS Tipo B adaptada.
- Componente: `SensorList` con `DataTable` de `components/ui/`

## UI/UX Notes
- Desktop: tabla con columnas sorteable
- Mobile: cards con info principal (zona, tipo, serial, estado)
- Indicador de estado: dot coloreado 8px + tooltip con detalle
- Badge de tipo: temperature, humidity, co2, etc.
- Serial en DM Mono

## Dependencies
- Fase 0: schema DB (sensors, zones)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-046-002: Crear y editar sensor

## User Story

**As a** admin,
**I want** registrar un nuevo sensor o editar uno existente con sus datos de zona, tipo, dispositivo y calibracion,
**So that** el sistema pueda recibir y procesar lecturas de ese sensor correctamente.

## Acceptance Criteria

### Scenario 1: Crear sensor con datos completos
- **Given** el admin esta en la pantalla ops-sensors
- **When** hace click en "Registrar sensor" y llena: zona = "Sala Floracion A", tipo = "temperature", marca/modelo = "Trolmaster HCS-1", serial = "TROL-FA-001", fecha calibracion = 2026-01-15
- **Then** se crea el sensor con is_active = true
- **And** aparece en la lista con indicador verde
- **And** se muestra toast "Sensor registrado correctamente"

### Scenario 2: Crear sensor con serial duplicado
- **Given** ya existe un sensor con serial "TROL-FA-001"
- **When** el admin intenta crear otro sensor con el mismo serial
- **Then** se muestra error de validacion "Ya existe un sensor con este serial"
- **And** el formulario no se envia

### Scenario 3: Editar sensor — cambiar zona
- **Given** existe un sensor en "Sala Floracion A"
- **When** el admin edita el sensor y cambia la zona a "Sala Secado"
- **Then** se actualiza el sensor
- **And** las futuras lecturas de ese sensor se asociaran a la nueva zona

### Scenario 4: Desactivar sensor
- **Given** un sensor activo esta dando lecturas erroneas
- **When** el admin edita el sensor y desmarca is_active
- **Then** el sensor pasa a estado inactivo
- **And** no se procesaran lecturas futuras de ese serial en el endpoint IoT
- **And** el indicador cambia a gris en la lista

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Validacion Zod en client y server
- [ ] Accesibilidad: formulario con labels, error messages accesibles

## Technical Notes
- Pantalla: `ops-sensors` (dialog/modal para crear/editar)
- Server Actions:
  - `createSensor(input)`: INSERT en sensors
  - `updateSensor(id, input)`: UPDATE en sensors
- Zod schema: `createSensorSchema` en `lib/validations/operations.schema.ts`:
  ```typescript
  z.object({
    zone_id: z.string().uuid(),
    type: z.enum(['temperature', 'humidity', 'co2', 'light', 'ec', 'ph', 'soil_moisture', 'vpd']),
    brand_model: z.string().max(200).optional(),
    serial_number: z.string().max(100),
    calibration_date: z.string().date().optional(),
    is_active: z.boolean().default(true),
  })
  ```
- Roles permitidos: solo admin (RLS + middleware check)
- Unicidad de serial: validar server-side antes de INSERT

## UI/UX Notes
- Modal con form: 480px max-width en desktop, fullscreen en mobile
- Zona: dropdown con search
- Tipo: radio buttons con icono por tipo
- Fecha calibracion: date picker
- Boton guardar: primary, disabled hasta que el form sea valido

## Dependencies
- US-046-001 (lista de sensores)
- Fase 0: schema DB (sensors)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-046-003: Indicador de calibracion vencida

## User Story

**As a** admin,
**I want** ver un indicador visual claro cuando la calibracion de un sensor esta vencida,
**So that** pueda programar recalibraciones y mantener la precision de las lecturas.

## Acceptance Criteria

### Scenario 1: Calibracion vigente
- **Given** un sensor tiene calibration_date = hace 60 dias y el umbral es 90 dias
- **When** se renderiza en la lista
- **Then** el indicador de calibracion es verde
- **And** se muestra "Calibrado: {fecha}" en el detalle

### Scenario 2: Calibracion proxima a vencer
- **Given** un sensor tiene calibration_date = hace 80 dias (umbral 90)
- **When** se renderiza en la lista
- **Then** el indicador es amarillo con tooltip "Calibracion vence en 10 dias"

### Scenario 3: Calibracion vencida
- **Given** un sensor tiene calibration_date = hace 120 dias (umbral 90)
- **When** se renderiza en la lista
- **Then** el indicador es rojo con badge "Vencida"
- **And** se muestra alerta en la fila: "Calibracion vencida hace 30 dias"

### Scenario 4: Sin fecha de calibracion
- **Given** un sensor no tiene calibration_date (null)
- **When** se renderiza
- **Then** se muestra "Sin calibracion" en gris con icono de advertencia

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Umbral de calibracion configurable (default 90 dias)

## Technical Notes
- Logica client-side: `daysSinceCalibration = daysBetween(calibration_date, today)`
- Umbrales: < 80% del limite = verde, 80-100% = amarillo, > 100% = rojo
- Default limite: 90 dias (configurable por tipo de sensor en futuras versiones)
- No requiere Server Action adicional, solo logica de presentacion

## UI/UX Notes
- Dot indicator en la lista: 8px circulo coloreado
- Tooltip al hover con dias restantes o vencidos
- Badge "Vencida" en rojo para calibraciones expiradas
- Icono de reloj con warning para proximas a vencer

## Dependencies
- US-046-001 (lista de sensores)

## Estimation
- **Size**: S
- **Complexity**: Low
