# F-071: CRUD de Zonas

## Overview

Permite al administrador y gerente crear, editar, listar y desactivar zonas (zones) y sus estructuras internas (zone_structures) desde la UI. Actualmente las tablas `zones` y `zone_structures` existen en el schema con datos insertados via seed SQL, pero no hay pantalla de administracion dedicada. Las zonas son la unidad operativa principal del sistema: es donde viven los batches, se ejecutan actividades y se registran lecturas ambientales. Sin este CRUD, agregar o modificar zonas requiere acceso directo a la base de datos.

## User Personas

- **Admin**: Crea, edita y desactiva zonas y sus estructuras. Acceso completo de escritura.
- **Gerente (Manager)**: Crea y edita zonas y estructuras dentro de sus facilities asignadas. Acceso de escritura.
- **Supervisor**: Consulta la lista de zonas para planificacion operativa. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-071-001 | Lista de zonas con filtros por facility y status | S | P0 | Planned |
| US-071-002 | Crear y editar zona | M | P0 | Planned |
| US-071-003 | Gestionar estructuras de zona (sub-CRUD) | M | P1 | Planned |
| US-071-004 | Desactivar zona con validacion de batches activos | S | P1 | Planned |

---

# US-071-001: Lista de zonas con filtros por facility y status

## User Story

**As a** admin o gerente,
**I want** ver una lista de todas las zonas con filtros por facility y status, mostrando metricas clave,
**So that** pueda tener una vision general del espacio operativo disponible y navegar a la gestion de cada zona.

## Acceptance Criteria

### Scenario 1: Visualizar lista de zonas con metricas
- **Given** existen 5 zonas repartidas en 2 facilities: "Invernadero Principal" (3 zonas) y "Bodega Norte" (2 zonas)
- **When** el admin navega a /settings/zones
- **Then** ve una lista de cards con: nombre, facility (badge), proposito (badge coloreado), environment (badge), area_m2, plant_capacity calculada, count de estructuras, y status badge (active/maintenance/inactive)

### Scenario 2: Filtrar por facility
- **Given** existen zonas en "Invernadero Principal" y "Bodega Norte"
- **When** el admin selecciona "Invernadero Principal" en el filtro de facility
- **Then** solo se muestran las 3 zonas de esa facility y el contador refleja "3 zonas"

### Scenario 3: Filtrar por status
- **Given** existen zonas con status active, maintenance e inactive
- **When** el admin selecciona el filtro "Mantenimiento"
- **Then** solo se muestran las zonas con status='maintenance'

### Scenario 4: Lista vacia con empty state
- **Given** la empresa no tiene zonas registradas (o la facility seleccionada no tiene zonas)
- **When** el admin navega a /settings/zones
- **Then** ve un empty state con mensaje "No hay zonas configuradas" y CTA "Crear primera zona"

### Scenario 5: Zonas inactivas con toggle
- **Given** existen 5 zonas, 1 de ellas con status='inactive'
- **When** el admin activa el toggle "Mostrar inactivas"
- **Then** la zona inactiva aparece en la lista con estilo muted (opacity reducida) y badge "Inactiva"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin', 'manager']) para escritura, lectura abierta a roles autenticados
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getZones(filters)` en `src/lib/actions/zones.ts` — query con LEFT JOIN a zone_structures para calcular capacidad agregada y count de estructuras
- **Query**: `SELECT z.*, f.name as facility_name, COUNT(zs.id) as structure_count, SUM(zs.max_positions) as total_positions FROM zones z JOIN facilities f ON f.id = z.facility_id LEFT JOIN zone_structures zs ON zs.zone_id = z.id WHERE f.company_id = $companyId GROUP BY z.id, f.name`
- **RLS**: Tipo B (via facility -> company)
- **Ruta**: `/settings/zones` — Server Component que llama a `getZones()` + Client Component para lista con filtros
- **Filtros**: facility_id (select), status (select/tabs), toggle mostrar inactivas

## UI/UX Notes
- Cards en grid responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
- Cada card muestra: nombre (bold), facility name (secondary text), proposito badge (coloreado por tipo), environment badge, grid de metricas (area, capacidad, estructuras), status badge
- Boton "Nueva zona" en header, permission-gated a admin y manager
- Filtros en barra superior: select facility + select/tabs status

## Dependencies
- F-003 (schema de DB con tablas zones y zone_structures)
- F-004 (auth y middleware)
- F-070 (CRUD de facilities — necesario para selector de facility)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-071-002: Crear y editar zona

## User Story

**As a** admin o gerente,
**I want** crear nuevas zonas y editar las existentes con sus datos completos,
**So that** pueda registrar salas, lotes, naves y otros espacios operativos sin necesidad de acceso directo a la base de datos.

## Acceptance Criteria

### Scenario 1: Crear zona con datos completos
- **Given** el admin esta en /settings/zones y existe al menos 1 facility activa
- **When** hace clic en "Nueva zona" y completa: nombre "Sala Vegetativo B", facility "Invernadero Principal", proposito "vegetation", environment "indoor_controlled", area 60 m2, height 3.5 m
- **Then** el sistema crea la zona con status='active', muestra toast "Zona creada", y la zona aparece en la lista

### Scenario 2: Crear zona con climate_config opcional
- **Given** el admin esta creando una nueva zona indoor
- **When** completa los datos base e ingresa configuracion climatica: temp 22-26C, HR 50-65%, CO2 800-1200 ppm, fotoperiodo 18/6
- **Then** la zona se crea con climate_config JSONB almacenado, visible en el detalle

### Scenario 3: Editar zona existente
- **Given** existe "Sala Vegetativo A" con proposito "vegetation"
- **When** el admin cambia el proposito a "multipurpose" y actualiza el area a 80 m2
- **Then** los cambios se guardan, la card se actualiza, y un toast confirma "Zona actualizada"

### Scenario 4: Nombre duplicado en la misma facility
- **Given** ya existe una zona "Sala A" en "Invernadero Principal"
- **When** el admin intenta crear otra zona con nombre "Sala A" en la misma facility
- **Then** el sistema muestra error "Ya existe una zona con este nombre en esta instalacion" y no crea el registro

### Scenario 5: Validacion de campos obligatorios
- **Given** el admin abre el formulario de nueva zona
- **When** intenta guardar sin completar nombre, facility, proposito o area
- **Then** el sistema muestra errores de validacion inline en cada campo faltante

### Scenario 6: Solo facilities activas en selector
- **Given** existen 3 facilities, 1 de ellas inactiva
- **When** el admin abre el formulario de nueva zona
- **Then** el selector de facility solo muestra las 2 facilities activas

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createZone(data)`, `updateZone(id, data)` en `src/lib/actions/zones.ts`
- **Zod Schema**: `zoneSchema` en `src/lib/schemas/zone.ts`
  - name: string min(2) max(100)
  - facility_id: uuid
  - purpose: enum (propagation, vegetation, flowering, drying, processing, storage, multipurpose)
  - environment: enum (indoor_controlled, greenhouse, tunnel, open_field)
  - area_m2: number positive
  - height_m: number positive optional
  - climate_config: object optional (temp_min, temp_max, rh_min, rh_max, co2_min, co2_max, photoperiod)
- **Auth**: `requireAuth(['admin', 'manager'])` en ambas actions
- **RLS**: Tipo B — validar que facility pertenece a la company del usuario
- **Unique constraint**: (facility_id, name) — validar en server action antes de insert

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Selector de facility como select nativo
- Proposito y environment como select nativos con labels descriptivos
- Seccion colapsable "Configuracion climatica (opcional)" con campos de rango (min/max)
- Boton submit: "Crear zona" / "Guardar cambios" segun contexto

## Dependencies
- US-071-001 (lista donde aparece la nueva zona)
- F-070 (facilities CRUD — para obtener lista de facilities activas)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-071-003: Gestionar estructuras de zona (sub-CRUD)

## User Story

**As a** admin o gerente,
**I want** agregar, editar y eliminar estructuras fisicas (racks, mesas, hileras) dentro de una zona,
**So that** pueda configurar la capacidad real de cada zona basada en su infraestructura interna y calcular posiciones de planta automaticamente.

## Acceptance Criteria

### Scenario 1: Ver estructuras de una zona
- **Given** "Sala Vegetativo A" tiene 3 estructuras: "Rack A1" (mobile_rack, 4 niveles, 20 pos/nivel), "Rack A2" (mobile_rack, 4 niveles, 20 pos/nivel), "Mesa B1" (rolling_bench, 1 nivel, 50 pos)
- **When** el admin navega al detalle o edicion de la zona
- **Then** ve una lista de estructuras con: nombre, tipo (badge), dimensiones (L x W), niveles, posiciones por nivel, max_positions calculado, y si es movil

### Scenario 2: Agregar estructura a una zona
- **Given** el admin esta viendo las estructuras de "Sala Vegetativo A"
- **When** hace clic en "Agregar estructura" y completa: nombre "Rack A3", tipo "mobile_rack", largo 2.4 m, ancho 1.2 m, movil si, 4 niveles, 20 posiciones por nivel, espaciado 15 cm, maceta 3.5 L
- **Then** la estructura se crea con max_positions=80 (4x20), la capacidad total de la zona se recalcula, y un toast confirma "Estructura agregada"

### Scenario 3: Editar estructura existente
- **Given** "Rack A1" tiene 4 niveles con 20 posiciones por nivel (max_positions=80)
- **When** el admin cambia a 5 niveles con 24 posiciones por nivel
- **Then** max_positions se recalcula a 120, la capacidad total de la zona se actualiza, y un toast confirma "Estructura actualizada"

### Scenario 4: Eliminar estructura sin posiciones asignadas
- **Given** "Mesa B1" no tiene plant_positions con status='planted'
- **When** el admin hace clic en "Eliminar" y confirma
- **Then** la estructura se elimina, la capacidad total de la zona se recalcula, y un toast confirma "Estructura eliminada"

### Scenario 5: No se puede eliminar estructura con posiciones plantadas
- **Given** "Rack A1" tiene plant_positions con current_batch_id asignado
- **When** el admin intenta eliminar "Rack A1"
- **Then** el sistema muestra error "Esta estructura tiene posiciones con plantas activas. Mueva o coseche los batches antes de eliminar."

### Scenario 6: Zona sin estructuras muestra empty state
- **Given** "Lote Norte" es una zona open_field sin estructuras
- **When** el admin ve el detalle de la zona
- **Then** la seccion de estructuras muestra "Esta zona no tiene estructuras internas. La capacidad se calcula directamente desde el area." con CTA "Agregar estructura"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] max_positions se recalcula automaticamente al crear/editar
- [ ] plant_capacity de la zona padre se actualiza al modificar estructuras
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Actions**: `createZoneStructure(data)`, `updateZoneStructure(id, data)`, `deleteZoneStructure(id)` en `src/lib/actions/zones.ts`
- **Zod Schema**: `zoneStructureSchema` en `src/lib/schemas/zone.ts`
  - name: string min(2) max(100)
  - zone_id: uuid
  - type: enum (mobile_rack, fixed_rack, rolling_bench, row, bed, trellis_row, nft_channel)
  - length_m: number positive
  - width_m: number positive
  - is_mobile: boolean default false
  - num_levels: integer min(1) default 1
  - positions_per_level: integer min(1) optional
  - spacing_cm: number positive optional
  - pot_size_L: number positive optional
- **Calculated**: max_positions = num_levels * positions_per_level (en server action)
- **Auth**: `requireAuth(['admin', 'manager'])` en todas las actions
- **Validation pre-delete**: query plant_positions WHERE structure_id AND status='planted'

## UI/UX Notes
- Estructuras se muestran como tabla/lista dentro del detalle de zona o como seccion del formulario de edicion de zona
- Cada estructura: nombre, tipo badge, dimensiones, niveles x posiciones = total, toggle movil
- Dialog para agregar/editar estructura (mas simple que el de zona)
- Boton eliminar con confirmacion modal
- max_positions se muestra como campo calculado (readonly) que se actualiza en tiempo real

## Dependencies
- US-071-002 (zona donde se agregan las estructuras)
- F-003 (schema zone_structures)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-071-004: Desactivar zona con validacion de batches activos

## User Story

**As a** admin o gerente,
**I want** poder desactivar una zona que ya no se usa, con validacion que me advierta si tiene batches activos o actividades programadas,
**So that** pueda retirar zonas obsoletas o en mantenimiento sin perder datos historicos ni afectar operaciones en curso.

## Acceptance Criteria

### Scenario 1: Desactivar zona sin batches activos
- **Given** "Sala Secado B" no tiene batches con status='active' ni scheduled_activities con status='pending'
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** la zona se marca status='inactive', desaparece de la lista principal, y aparece solo con el toggle "Mostrar inactivas"

### Scenario 2: Desactivar zona con batches activos
- **Given** "Sala Vegetativo A" tiene 2 batches activos y 15 actividades programadas pendientes
- **When** el admin intenta desactivar la zona
- **Then** el sistema muestra warning "Esta zona tiene 2 batches activos y 15 actividades pendientes. Desactivar no afecta operaciones existentes pero impedira crear nuevos batches o programar actividades aqui." y requiere confirmacion explicita con boton "Desactivar de todas formas"

### Scenario 3: Poner zona en mantenimiento
- **Given** "Sala Floración A" esta activa
- **When** el admin cambia el status a "maintenance"
- **Then** la zona se marca status='maintenance', aparece con badge "Mantenimiento" en la lista, y no se ofrece como opcion para nuevos batches

### Scenario 4: Reactivar zona previamente desactivada
- **Given** "Sala Secado B" esta inactiva y visible en la lista con toggle "Mostrar inactivas"
- **When** el admin hace clic en "Reactivar"
- **Then** la zona vuelve a status='active' y aparece en la lista principal

### Scenario 5: Zona inactiva no aparece en selectores
- **Given** "Sala Secado B" esta inactiva
- **When** un usuario crea un nuevo batch o orden y ve el selector de zona
- **Then** "Sala Secado B" no aparece como opcion en el dropdown de zonas

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Soft delete via status='inactive' verificado (nunca DELETE fisico de zonas)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion de dependencias (batches, actividades) antes de desactivar
- [ ] Status 'maintenance' como estado intermedio funcional

## Technical Notes
- **Server Actions**: `updateZoneStatus(id, status)` en `src/lib/actions/zones.ts` — maneja active, maintenance, inactive
- Antes de desactivar: query para contar batches activos (WHERE zone_id AND status IN ('active', 'phase_transition')), scheduled_activities pendientes (WHERE batch.zone_id AND status='pending')
- `updateZoneStatus` solo hace UPDATE status, no cascade a batches ni actividades
- Queries de selectores deben filtrar `WHERE status = 'active'`
- Reactivar: UPDATE status='active' sin restricciones

## UI/UX Notes
- Dropdown o menu de 3 puntos con opciones: "Poner en mantenimiento", "Desactivar", "Reactivar" segun status actual
- Boton "Desactivar" con estilo secondary + clases de error
- Modal de confirmacion con conteo de entidades afectadas en lista
- Badge de status: active (green), maintenance (amber), inactive (gray)

## Dependencies
- US-071-001, US-071-002

## Estimation
- **Size**: S
- **Complexity**: Medium
