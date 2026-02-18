# F-070: CRUD de Facilities

## Overview

Permite al administrador crear, editar, listar y desactivar instalaciones (facilities) desde la UI. Actualmente la tabla `facilities` existe en el schema con datos insertados via seed SQL, pero no hay pantalla de administracion. Este CRUD es prerrequisito para que el sistema sea self-service: sin el, agregar una nueva facility requiere acceso directo a la base de datos.

## User Personas

- **Admin**: Crea y gestiona facilities (invernaderos, bodegas, campos). Unico rol con acceso de escritura.
- **Gerente / Supervisor**: Consulta la lista de facilities para entender la infraestructura disponible. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-070-001 | Lista de facilities con stats derivados | S | P0 | Done |
| US-070-002 | Crear y editar facility | M | P0 | Done |
| US-070-003 | Desactivar facility con validacion de zonas activas | S | P1 | Done |

---

# US-070-001: Lista de facilities con stats derivados

## User Story

**As a** admin,
**I want** ver una lista de todas las facilities de mi empresa con sus datos principales y metricas derivadas de zonas,
**So that** pueda tener una vision general de la infraestructura disponible y navegar a la gestion de cada una.

## Acceptance Criteria

### Scenario 1: Visualizar lista de facilities con metricas
- **Given** existen 2 facilities en la empresa: "Invernadero Principal" (3 zonas, 200 plantas capacity) y "Bodega Norte" (1 zona, 0 plantas)
- **When** el admin navega a /settings/facilities
- **Then** ve una lista de cards con: nombre, tipo (badge), direccion (truncada), area total (m2), area de cultivo efectiva (Sigma zonas), capacidad total de plantas (Sigma zonas), count de zonas activas, y status badge (activa/inactiva)

### Scenario 2: Lista vacia con empty state
- **Given** la empresa no tiene facilities registradas
- **When** el admin navega a /settings/facilities
- **Then** ve un empty state con mensaje "No hay instalaciones configuradas" y CTA "Crear primera instalacion"

### Scenario 3: Filtro de facilities inactivas
- **Given** existen 3 facilities, 1 de ellas con is_active=false
- **When** el admin activa el toggle "Mostrar inactivas"
- **Then** la facility inactiva aparece en la lista con estilo muted (opacity reducida) y badge "Inactiva"

### Scenario 4: Campos calculados reflejan datos reales
- **Given** "Invernadero Principal" tiene zonas con area_m2 = 40, 50, 30 y plant_capacity = 200, 100, 150
- **When** el admin ve la card de esta facility
- **Then** total_growing_area_m2 muestra "120 m2" y total_plant_capacity muestra "450 plantas", calculados como suma de las zonas activas

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin']) para escritura, lectura abierta a roles autenticados
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getFacilities()` en `src/lib/actions/facilities.ts` — query con LEFT JOIN a zones para calcular sumas agregadas
- **Query**: `SELECT f.*, COUNT(z.id) as zone_count, SUM(z.effective_growing_area_m2) as total_growing, SUM(z.plant_capacity) as total_capacity FROM facilities f LEFT JOIN zones z ON z.facility_id = f.id AND z.status = 'active' WHERE f.company_id = auth.company_id() GROUP BY f.id`
- **RLS**: Tipo A (company_id directo)
- **Ruta**: `/settings/facilities` — Server Component que llama a `getFacilities()` + Client Component para lista con filtro

## UI/UX Notes
- Cards en grid responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
- Cada card muestra: nombre (bold), tipo badge (coloreado por tipo), direccion (1 linea truncada), grid de 4 metricas (area total, area cultivo, capacidad plantas, zonas)
- Boton "Nueva instalacion" en header, permission-gated a admin
- Toggle "Mostrar inactivas" en la parte superior

## Dependencies
- F-003 (schema de DB con tabla facilities)
- F-004 (auth y middleware)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-070-002: Crear y editar facility

## User Story

**As a** admin,
**I want** crear nuevas facilities y editar las existentes con sus datos completos,
**So that** pueda registrar invernaderos, bodegas, campos y otras instalaciones sin necesidad de acceso directo a la base de datos.

## Acceptance Criteria

### Scenario 1: Crear facility con datos minimos
- **Given** el admin esta en /settings/facilities
- **When** hace clic en "Nueva instalacion" y completa: nombre "Invernadero Sur", tipo "greenhouse", area 500 m2, direccion "Km 5 via rural"
- **Then** el sistema crea la facility, muestra toast "Instalacion creada", y la facility aparece en la lista con zone_count=0 y capacidad=0

### Scenario 2: Crear facility con coordenadas opcionales
- **Given** el admin esta creando una nueva facility
- **When** completa los datos base e ingresa latitud 4.7110 y longitud -74.0721
- **Then** la facility se crea con las coordenadas almacenadas, visibles en el detalle

### Scenario 3: Editar facility existente
- **Given** existe "Invernadero Principal" con tipo "greenhouse"
- **When** el admin cambia el tipo a "vertical_farm" y actualiza el area a 300 m2
- **Then** los cambios se guardan, la card se actualiza, y un toast confirma "Instalacion actualizada"

### Scenario 4: Nombre duplicado en la misma empresa
- **Given** ya existe una facility con nombre "Invernadero Principal" en la empresa
- **When** el admin intenta crear otra facility con el mismo nombre
- **Then** el sistema muestra error "Ya existe una instalacion con este nombre" y no crea el registro

### Scenario 5: Validacion de campos obligatorios
- **Given** el admin abre el formulario de nueva facility
- **When** intenta guardar sin completar nombre, tipo o direccion
- **Then** el sistema muestra errores de validacion inline en cada campo faltante y el boton guardar permanece deshabilitado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createFacility(data)`, `updateFacility(id, data)` en `src/lib/actions/facilities.ts`
- **Zod Schema**: `facilitySchema` en `src/lib/schemas/facility.ts`
  - name: string min(2) max(100)
  - type: enum (indoor_warehouse, greenhouse, tunnel, open_field, vertical_farm)
  - total_footprint_m2: number positive
  - address: string min(5)
  - latitude: number optional, range -90 to 90
  - longitude: number optional, range -180 to 180
- **Auth**: `requireAuth(['admin'])` en ambas actions
- **RLS**: Tipo A — el trigger auto-popula company_id desde auth.company_id()

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Selector de tipo con radio buttons con icono por tipo (o select nativo)
- Campos de coordenadas en seccion colapsable "Ubicacion (opcional)"
- Boton submit: "Crear instalacion" / "Guardar cambios" segun contexto

## Dependencies
- US-070-001 (lista donde aparece la nueva facility)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-070-003: Desactivar facility con validacion de zonas activas

## User Story

**As a** admin,
**I want** poder desactivar una facility que ya no se usa, con validacion que me advierta si tiene zonas activas vinculadas,
**So that** pueda retirar instalaciones obsoletas sin perder datos historicos ni afectar operaciones en curso.

## Acceptance Criteria

### Scenario 1: Desactivar facility sin zonas activas
- **Given** "Bodega Sur" tiene 0 zonas activas (todas inactivas o ninguna)
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** la facility se marca is_active=false, desaparece de la lista principal, y aparece solo con el toggle "Mostrar inactivas"

### Scenario 2: Desactivar facility con zonas activas y batches
- **Given** "Invernadero Principal" tiene 3 zonas activas con 2 batches en progreso
- **When** el admin intenta desactivar la facility
- **Then** el sistema muestra warning "Esta instalacion tiene 3 zonas activas y 2 batches en progreso. Desactivar no afecta operaciones existentes pero impedira crear nuevas zonas, batches u ordenes aqui." y requiere confirmacion explicita con boton "Desactivar de todas formas"

### Scenario 3: Reactivar facility previamente desactivada
- **Given** "Bodega Sur" esta inactiva y visible en la lista con toggle "Mostrar inactivas"
- **When** el admin hace clic en "Reactivar"
- **Then** la facility vuelve a is_active=true y aparece en la lista principal

### Scenario 4: Facility inactiva no aparece en selectores
- **Given** "Bodega Sur" esta inactiva
- **When** un admin o gerente crea una nueva zona o batch y ve el selector de facility
- **Then** "Bodega Sur" no aparece como opcion en el dropdown de facilities

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion de dependencias (zonas, batches) antes de desactivar

## Technical Notes
- **Server Actions**: `deactivateFacility(id)`, `reactivateFacility(id)` en `src/lib/actions/facilities.ts`
- Antes de desactivar: query para contar zonas activas, batches activos (via zones), ordenes activas
- `deactivateFacility` solo hace UPDATE is_active=false, no cascade a zonas ni batches
- Queries de selectores deben filtrar `WHERE is_active = true`

## UI/UX Notes
- Boton "Desactivar" con estilo secondary + clases de error (no existe variant destructive)
- Modal de confirmacion con conteo de entidades afectadas en lista
- Boton "Reactivar" visible solo en modo "Mostrar inactivas"

## Dependencies
- US-070-001, US-070-002

## Estimation
- **Size**: S
- **Complexity**: Medium
