# F-083: Creacion Manual de Batch (sin orden)

## Overview

Permite crear batches independientes sin una orden de produccion asociada. Actualmente los batches solo se crean automaticamente al aprobar una orden (F-014), pero hay casos donde se necesita registrar produccion existente, importar lotes de terceros, o iniciar cultivos experimentales sin pasar por el flujo formal de ordenes. El batch manual no tiene `production_order_id` y funciona de forma independiente: el usuario selecciona cultivar, zona, fase inicial, y opcionalmente un schedule. El codigo del batch se auto-genera con el formato `{FACILITY_PREFIX}-{YEAR}-{SEQ}`. Documentado como capacidad en BAT-F01 del user flows.

## User Personas

- **Supervisor**: Crea batches manuales para registrar produccion existente, lotes recibidos de terceros, o cultivos ad-hoc que no justifican una orden formal.
- **Admin**: Crea batches manuales en cualquier contexto, incluyendo migracion de datos o pruebas del sistema.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-083-001 | Formulario de creacion de batch manual | M | P0 | Planned |
| US-083-002 | Asignacion de schedule al batch manual | S | P1 | Planned |
| US-083-003 | Validaciones y generacion de codigo | S | P0 | Planned |

---

# US-083-001: Formulario de creacion de batch manual

## User Story

**As a** supervisor,
**I want** crear un batch directamente desde la lista de batches sin necesidad de una orden de produccion,
**So that** pueda registrar lotes existentes, importaciones de terceros, o cultivos experimentales en el sistema con trazabilidad completa.

## Acceptance Criteria

### Scenario 1: Crear batch manual con datos basicos
- **Given** el supervisor esta en /batches y hace clic en "Nuevo batch manual"
- **When** completa: cultivar "Gelato #41", zona "Sala Vegetativo A", plant_count 50, fase inicial "Vegetativo"
- **Then** el sistema crea el batch con code auto-generado (ej: INV-2026-0015), status='active', production_order_id=null, y redirige al detalle del nuevo batch con toast "Batch creado: INV-2026-0015"

### Scenario 2: Seleccionar fase inicial segun entry points del crop type
- **Given** el supervisor esta creando un batch manual y selecciona cultivar "Gelato #41" (Cannabis)
- **When** abre el selector de fase inicial
- **Then** ve todas las fases del crop type Cannabis ordenadas por sort_order. Las fases con `can_be_entry_point=true` se muestran como recomendadas (badge "Entry point"). Todas las fases son seleccionables.

### Scenario 3: Vincular a inventory_item existente (opcional)
- **Given** el supervisor esta creando un batch manual y hay semillas de Gelato disponibles en inventario (LOT-SEM-GELATO-001, 200 unidades en Almacen)
- **When** activa la opcion "Vincular a material de origen" y selecciona LOT-SEM-GELATO-001
- **Then** el batch se crea con source_inventory_item_id apuntando a ese lote, estableciendo trazabilidad desde el material de origen

### Scenario 4: Crear batch sin vincular a inventario
- **Given** el supervisor esta creando un batch manual para registrar plantas ya existentes en el invernadero
- **When** no activa la opcion "Vincular a material de origen"
- **Then** el batch se crea con source_inventory_item_id=null, lo cual es valido para lotes historicos o importados

### Scenario 5: Fecha de inicio editable
- **Given** el supervisor esta creando un batch manual para registrar produccion que inicio hace 2 semanas
- **When** cambia la fecha de inicio de hoy (default) a hace 14 dias
- **Then** el batch se crea con start_date=fecha seleccionada y el expected_end_date se calcula desde esa fecha (si hay schedule)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['supervisor', 'admin'])
- [ ] Validacion Zod compartida client/server
- [ ] Codigo auto-generado con formato correcto
- [ ] Formulario funcional en mobile y desktop
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `createManualBatch(data)` en `src/lib/actions/batches.ts`
- **Zod Schema**: `createManualBatchSchema` en `src/lib/schemas/batch.ts`
  - cultivarId: UUID required
  - zoneId: UUID required
  - plantCount: number positive integer
  - initialPhaseId: UUID required — debe pertenecer al crop_type del cultivar
  - startDate: date, default today
  - sourceInventoryItemId: UUID optional
  - scheduleId: UUID optional
  - notes: string max(500) optional
- **Auth**: `requireAuth(['supervisor', 'admin'])`
- **Code generation**: Query para obtener el ultimo secuencial de la facility en el ano actual:
  ```sql
  SELECT code FROM batches
  WHERE code LIKE '{PREFIX}-{YEAR}-%'
  ORDER BY code DESC LIMIT 1
  ```
  Incrementar secuencial. Formato: `{FACILITY_PREFIX}-{YEAR}-{SEQUENCE_4DIGITS}` (ej: INV-2026-0015)
- **FACILITY_PREFIX**: Derivar de facility.name (primeras 3 letras en uppercase) o de un campo `code` en facilities si existe. Fallback: "BAT"
- **Transaction**: Dentro de `db.transaction()`:
  1. Validate cultivar exists, is active
  2. Validate zone exists, is active, belongs to user's facility
  3. Validate initialPhaseId belongs to cultivar's crop_type
  4. Generate code
  5. INSERT batch con production_order_id=null
  6. Si sourceInventoryItemId: validate inventory_item exists
  7. Si scheduleId: link y generar scheduled_activities para la fase inicial
- **Ruta**: `/batches/new` — Server Component con query de datos + Client Component con formulario
- **Revalidation**: `revalidatePath('/batches')`

## UI/UX Notes
- Pagina completa (no Dialog) accesible desde boton "Nuevo batch manual" en /batches
- Formulario en card con secciones:
  1. **Cultivar**: Search dropdown de cultivares activos con badge de crop_type
  2. **Ubicacion**: Dropdown de zonas activas de la facility del usuario, agrupadas por proposito
  3. **Cantidad**: Input numerico de plantas (entero positivo)
  4. **Fase inicial**: Dropdown de fases del crop_type, con badge "Entry point" en las recomendadas
  5. **Fecha de inicio**: Date picker, default hoy
  6. **Material de origen** (colapsable, opcional): Search dropdown de inventory_items disponibles filtrados por cultivar
  7. **Notas** (opcional): Textarea
- Boton "Crear batch" con estilo primary
- Link "Cancelar" que vuelve a /batches

## Dependencies
- F-016 (lista de batches donde aparece)
- F-017 (detalle de batch al que redirige)
- F-012 (cultivares para el selector)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-083-002: Asignacion de schedule al batch manual

## User Story

**As a** supervisor,
**I want** opcionalmente asignar un cultivation_schedule al batch manual durante o despues de la creacion,
**So that** el batch reciba actividades programadas automaticamente como si hubiera sido creado desde una orden de produccion.

## Acceptance Criteria

### Scenario 1: Asignar schedule durante creacion
- **Given** el supervisor esta creando un batch manual de "Gelato #41" y existe un schedule "Plan Gelato Indoor 127 dias"
- **When** selecciona ese schedule en el campo opcional "Plan de cultivo"
- **Then** al crear el batch, se genera automaticamente scheduled_activities para la fase inicial del batch, con planned_dates calculadas desde la fecha de inicio

### Scenario 2: Crear batch sin schedule
- **Given** el supervisor esta creando un batch manual experimental
- **When** no selecciona ningun schedule (campo vacio)
- **Then** el batch se crea con schedule_id=null y sin scheduled_activities. Las actividades se pueden programar manualmente despues.

### Scenario 3: Solo schedules del cultivar seleccionado
- **Given** el supervisor selecciono cultivar "Gelato #41"
- **When** abre el dropdown de schedules
- **Then** solo ve schedules donde cultivar_id='gelato-41' y is_active=true. Schedules de otros cultivares no aparecen.

### Scenario 4: Scheduled activities respetan la fase inicial
- **Given** el supervisor crea un batch manual en fase "Floracion" (saltando germinacion, propagacion y vegetativo) con schedule "Plan Gelato Indoor 127 dias"
- **When** el batch se crea
- **Then** solo se generan scheduled_activities para la fase "Floracion" y fases posteriores del schedule. Las actividades de fases anteriores se ignoran.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Scheduled activities generadas correctamente desde la fase inicial
- [ ] Solo schedules del cultivar seleccionado se muestran
- [ ] Actividades de fases anteriores a la inicial se excluyen

## Technical Notes
- **Generacion de actividades**: Reutilizar la funcion `generateScheduledActivities()` de `src/lib/actions/scheduled-activities.ts` que ya existe para el flujo de ordenes. Pasar batchId, scheduleId, y la fase inicial como parametros
- **Filtro por fase**: La funcion de generacion debe filtrar templates por phase_id >= initialPhaseId (basandose en sort_order)
- **planned_date calculo**: startDate del batch + start_day del schedule entry para cada actividad
- **Schedule query**: Dropdown carga schedules filtrados por cultivarId con un query simple: `SELECT * FROM cultivation_schedules WHERE cultivar_id = :cultivarId AND is_active = true`

## UI/UX Notes
- Campo "Plan de cultivo" como dropdown opcional en el formulario de creacion
- Placeholder: "Sin plan de cultivo (actividades manuales)"
- Al seleccionar un schedule, mostrar preview: "Este plan incluye X actividades para las fases seleccionadas"
- Si no hay schedules para el cultivar: mostrar texto "No hay planes de cultivo disponibles para este cultivar"

## Dependencies
- US-083-001 (formulario de creacion)
- F-020 (funcion generateScheduledActivities)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-083-003: Validaciones y generacion de codigo

## User Story

**As a** supervisor,
**I want** que el sistema valide los datos del batch manual y genere un codigo unico automaticamente,
**So that** no se creen batches con datos inconsistentes y cada batch tenga un identificador unico predecible.

## Acceptance Criteria

### Scenario 1: Codigo auto-generado correctamente
- **Given** la facility "Invernadero Principal" tiene prefix "INV" y el ultimo batch del 2026 es INV-2026-0014
- **When** el supervisor crea un nuevo batch manual
- **Then** el codigo se genera como "INV-2026-0015" y se muestra en el header del batch creado

### Scenario 2: Primer batch del ano
- **Given** no existen batches en la facility para el ano 2026
- **When** el supervisor crea el primer batch manual
- **Then** el codigo se genera como "INV-2026-0001"

### Scenario 3: Validar que la fase pertenece al crop type del cultivar
- **Given** el supervisor selecciono cultivar "Gelato #41" (Cannabis, fases: germinacion, propagacion, vegetativo, floracion, cosecha, secado, empaque)
- **When** intenta seleccionar una fase que no pertenece a Cannabis
- **Then** el dropdown solo muestra fases de Cannabis — no es posible seleccionar fases de otro crop type

### Scenario 4: Validar capacidad de zona (warning, no bloqueo)
- **Given** "Sala Vegetativo A" tiene capacidad para 100 plantas y actualmente tiene 80
- **When** el supervisor intenta crear un batch de 30 plantas en esa zona
- **Then** el sistema muestra warning "La zona quedaria al 110% de capacidad (110/100 plantas)" pero permite continuar

### Scenario 5: Validar zone pertenece a la facility del usuario
- **Given** el supervisor tiene assigned_facility_id="Invernadero Principal"
- **When** abre el dropdown de zonas
- **Then** solo ve zonas de "Invernadero Principal", no zonas de otras facilities

### Scenario 6: Plant count debe ser positivo
- **Given** el supervisor esta en el formulario de creacion
- **When** ingresa plant_count=0 o un valor negativo
- **Then** el sistema muestra error inline "La cantidad de plantas debe ser mayor a 0"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Codigo unico generado atomicamente (sin race conditions)
- [ ] Todas las validaciones de integridad implementadas
- [ ] Warning de capacidad funcional (soft limit)

## Technical Notes
- **Code generation atomico**: Usar SELECT ... FOR UPDATE o INSERT con UNIQUE constraint + retry para evitar race conditions cuando dos usuarios crean batch simultaneamente
- **Format**: `{PREFIX}-{YEAR}-{SEQ:04d}` donde PREFIX son 3 chars del facility name uppercase
- **Facility prefix**: Derivar de `facility.name.substring(0,3).toUpperCase()`. Si la facility tiene un campo `code`, usar ese. Manejar colisiones: si dos facilities tienen el mismo prefix, agregar suffix numerico
- **Cascading dropdowns**: Cultivar → filtra fases disponibles. Cultivar → filtra schedules disponibles. Facility → filtra zonas disponibles.
- **Capacity check**: Query `SELECT SUM(plant_count) FROM batches WHERE zone_id = :zoneId AND status IN ('active', 'on_hold', 'phase_transition')` comparar contra `zones.plant_capacity`. Si planta_capacity IS NULL, no validar (zona sin limite, ej: almacen)
- **Validation layers**: Zod schema en client para feedback inmediato + mismas validaciones en Server Action para seguridad

## UI/UX Notes
- Los dropdowns se cargan en cascada: al seleccionar cultivar, se filtran fases y schedules
- Warning de capacidad se muestra como banner amarillo debajo del campo de zona
- El codigo del batch se muestra como preview (texto gris) debajo del titulo del formulario: "Codigo: INV-2026-0015 (auto-generado)"
- Si hay error de unicidad de codigo (race condition), retry automatico sin feedback al usuario

## Dependencies
- US-083-001 (formulario que usa estas validaciones)
- F-003 (schema de DB con tablas batches, zones, cultivars)

## Estimation
- **Size**: S
- **Complexity**: Medium
