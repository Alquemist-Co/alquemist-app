# F-076: CRUD de Cultivation Schedules

## Overview

Permite a administradores y gerentes crear, editar, listar y desactivar planes maestros de cultivo (`cultivation_schedules`) desde la UI. Un cultivation schedule es el blueprint que define que actividades se ejecutan automaticamente en cada fase del ciclo productivo de un cultivar. Cuando se aprueba una orden de produccion y se crea un batch, el schedule asociado genera las `scheduled_activities` con templates congelados (snapshot) para cada dia planificado.

Actualmente la tabla existe en el schema y el sistema ya genera actividades desde schedules (F-020), pero no hay pantalla para crear ni editar schedules — se insertan via seed SQL. Este es el CRUD mas complejo del paquete porque involucra una UI de timeline visual donde se asignan activity templates a fases con dia de inicio y frecuencia, y un preview de las actividades que se generarian.

Referencia: flujos PROD-F01 y ACT-F02 en `docs/alquemist-user-flows.md`.

## User Personas

- **Admin**: Crea y gestiona schedules completos. Acceso total de escritura.
- **Gerente (Manager)**: Crea y edita schedules para los cultivares bajo su gestion. Acceso de escritura.
- **Supervisor**: Consulta schedules existentes para entender el plan de actividades de los batches. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-076-001 | Lista de cultivation schedules | S | P0 | Planned |
| US-076-002 | Crear cultivation schedule (wizard) | L | P0 | Planned |
| US-076-003 | Editar configuracion de fases y templates | M | P0 | Planned |
| US-076-004 | Preview de actividades generadas | S | P1 | Planned |
| US-076-005 | Desactivar schedule con validacion de batches | S | P1 | Planned |

---

# US-076-001: Lista de cultivation schedules

## User Story

**As a** admin o gerente,
**I want** ver una lista de todos los cultivation schedules de mi empresa con su cultivar asociado, duracion total y estado,
**So that** pueda tener una vision general de los planes de cultivo disponibles y acceder a crear o editar uno.

## Acceptance Criteria

### Scenario 1: Visualizar lista de schedules con datos clave
- **Given** existen 3 schedules: "Plan Gelato Indoor 127d" (cultivar Gelato #41, 127 dias, 4 fases, 12 templates), "Plan Blue Dream Outdoor 90d" (cultivar Blue Dream, 90 dias, 3 fases, 8 templates), y uno inactivo
- **When** el admin navega a /settings/schedules
- **Then** ve una tabla/cards con: nombre, cultivar (nombre + crop type badge), total_days, count de fases configuradas, count de templates asignados, y status badge (activo/inactivo)

### Scenario 2: Lista vacia con empty state
- **Given** la empresa no tiene schedules registrados
- **When** el admin navega a /settings/schedules
- **Then** ve un empty state con mensaje "No hay planes de cultivo configurados" y CTA "Crear primer plan"

### Scenario 3: Filtro de schedules inactivos
- **Given** existen 3 schedules, 1 de ellos con is_active=false
- **When** el admin activa el toggle "Mostrar inactivos"
- **Then** el schedule inactivo aparece en la lista con estilo muted (opacity reducida) y badge "Inactivo"

### Scenario 4: Filtro por cultivar
- **Given** existen schedules para 3 cultivares distintos
- **When** el admin selecciona "Gelato #41" en el filtro de cultivar
- **Then** solo se muestran los schedules vinculados a ese cultivar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin', 'manager']) para escritura, lectura abierta a supervisor+
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getCultivationSchedules()` en `src/lib/actions/cultivation-schedules.ts` — query con JOIN a cultivars para mostrar nombre de cultivar y crop type
- **Query**: `SELECT cs.*, c.name as cultivar_name, c.code as cultivar_code, ct.name as crop_type_name FROM cultivation_schedules cs JOIN cultivars c ON cs.cultivar_id = c.id JOIN crop_types ct ON c.crop_type_id = ct.id WHERE cs.company_id = ? ORDER BY cs.name`
- **Conteo derivado de templates**: Parsear `phase_config` JSONB para contar fases y templates. Se hace en el server action, no en SQL
- **RLS**: Company-scoped via cultivar (cultivar.crop_type.company_id) o company_id directo si existe en la tabla. Verificar schema real
- **Ruta**: `/settings/schedules` — Server Component + Client Component para filtros

## UI/UX Notes
- Cards en grid responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
- Cada card muestra: nombre (bold), cultivar badge (coloreado por crop type), total_days + "dias", fases count, templates count
- Boton "Nuevo plan" en header, permission-gated a admin y manager
- Filtro por cultivar como select dropdown en la barra superior
- Toggle "Mostrar inactivos"

## Dependencies
- F-003 (schema de DB con tabla cultivation_schedules)
- F-004 (auth y middleware)
- F-012 (cultivares configurados — FK a cultivars)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-076-002: Crear cultivation schedule (wizard)

## User Story

**As a** admin o gerente,
**I want** crear un nuevo cultivation schedule seleccionando un cultivar, definiendo la duracion total, y configurando que templates de actividad se ejecutan en cada fase con su dia de inicio y frecuencia,
**So that** los batches creados con este cultivar tengan un plan automatico de actividades que se genere al aprobar la orden.

## Acceptance Criteria

### Scenario 1: Crear schedule paso 1 — Datos basicos
- **Given** el admin hace clic en "Nuevo plan"
- **When** ingresa nombre "Plan Gelato Indoor 127d", selecciona cultivar "Gelato #41" (que tiene 7 fases definidas), y total_days 127
- **Then** el wizard avanza al paso 2 y muestra las 7 fases del crop type del cultivar seleccionado con sus duraciones default

### Scenario 2: Crear schedule paso 2 — Configurar duracion por fase
- **Given** el wizard muestra las 7 fases con duraciones default del cultivar (germinacion:7, propagacion:14, vegetativo:28, floracion:63, cosecha:1, secado:14, empaque:3)
- **When** el admin ajusta la duracion de vegetativo a 21 dias y floracion a 56 dias
- **Then** la suma de duraciones se actualiza en tiempo real y se valida contra total_days (127). Si la suma no coincide, se muestra un warning

### Scenario 3: Crear schedule paso 3 — Asignar templates a fases
- **Given** el admin esta en el paso de asignacion de templates
- **When** selecciona la fase "Vegetativo" y agrega el template "Fertirrigacion Vegetativa Sem 1-2" con start_day=1 y frequency=daily, y "Poda de formacion" con start_day=7 y frequency=weekly
- **Then** cada template aparece como una fila dentro de la fase con sus parametros editables (start_day, frequency)

### Scenario 4: Guardar schedule completo
- **Given** el admin ha configurado nombre, cultivar, total_days, duraciones por fase, y al menos 1 template por fase
- **When** hace clic en "Crear plan"
- **Then** el sistema crea el schedule con phase_config JSONB completo, muestra toast "Plan de cultivo creado", y redirige a la lista

### Scenario 5: Validacion de cultivar sin fases
- **Given** el admin selecciona un cultivar cuyo crop_type no tiene fases configuradas
- **When** intenta avanzar al paso 2
- **Then** el sistema muestra error "El tipo de cultivo de este cultivar no tiene fases configuradas. Configure las fases primero en Configuracion > Tipos de cultivo."

### Scenario 6: Solo templates activos y aplicables a la fase
- **Given** el admin esta asignando templates a la fase "Vegetativo"
- **When** abre el selector de templates
- **Then** solo ve templates activos que tienen la fase "Vegetativo" en sus activity_template_phases (via tabla de union)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Wizard funcional en mobile y desktop
- [ ] phase_config JSONB generado correctamente
- [ ] Accesibilidad: labels, focus management entre pasos, contraste AA

## Technical Notes
- **Server Actions**: `createCultivationSchedule(data)` en `src/lib/actions/cultivation-schedules.ts`
- **Zod Schema**: `cultivationScheduleSchema` en `src/lib/schemas/cultivation-schedule.ts`
  - name: string min(2) max(100)
  - cultivar_id: uuid
  - total_days: number positive int
  - phase_config: array of objects [{phase_id: uuid, duration_days: number, templates: [{template_id: uuid, start_day: number, frequency: enum}]}]
- **Auth**: `requireAuth(['admin', 'manager'])`
- **Queries auxiliares**:
  - `getPhasesByCultivar(cultivarId)`: JOIN cultivars → crop_types → production_phases para obtener fases del cultivar seleccionado
  - `getTemplatesByPhase(phaseId)`: JOIN activity_templates → activity_template_phases WHERE phase_id = ? AND is_active = true
- **phase_config JSONB structure**:
  ```json
  [
    {
      "phase_id": "uuid",
      "duration_days": 28,
      "templates": [
        { "template_id": "uuid", "start_day": 1, "frequency": "daily" },
        { "template_id": "uuid", "start_day": 7, "frequency": "weekly" }
      ]
    }
  ]
  ```
- **Frecuencias disponibles**: daily, weekly, biweekly, once (mismas del enum en activity_templates.frequency)

## UI/UX Notes
- Wizard de 3 pasos: (1) Datos basicos, (2) Duracion por fase, (3) Asignar templates
- Step indicator horizontal en desktop, compacto en mobile
- Paso 2: lista vertical de fases con input numerico de duracion por fase. Mostrar barra visual proporcional a duracion. Mostrar suma vs total_days con indicador de match/mismatch
- Paso 3: acordeon de fases. Al expandir una fase se ve la lista de templates asignados con boton "Agregar template". Cada template tiene: nombre (readonly), start_day (input numerico), frequency (select)
- El selector de templates puede ser un Dialog con lista de templates filtrados por fase
- Boton "Crear plan" en el ultimo paso
- Navegacion entre pasos con botones "Anterior" / "Siguiente"

## Dependencies
- US-076-001 (lista donde aparece el nuevo schedule)
- F-011 (crop types y fases configurados)
- F-012 (cultivares configurados)
- F-019 (activity templates configurados)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-076-003: Editar configuracion de fases y templates

## User Story

**As a** admin o gerente,
**I want** editar un cultivation schedule existente para ajustar duraciones de fase, agregar o remover templates, o cambiar parametros de los templates asignados,
**So that** pueda refinar los planes de cultivo basandome en la experiencia operativa sin afectar batches ya creados.

## Acceptance Criteria

### Scenario 1: Editar datos basicos del schedule
- **Given** existe "Plan Gelato Indoor 127d" con total_days=127
- **When** el admin edita el nombre a "Plan Gelato Indoor Optimizado" y cambia total_days a 120
- **Then** los cambios se guardan, la card se actualiza en la lista, y un toast confirma "Plan de cultivo actualizado"

### Scenario 2: Ajustar duracion de una fase
- **Given** el schedule tiene fase "Vegetativo" con duration_days=28
- **When** el admin cambia la duracion a 21 dias
- **Then** la duracion se actualiza en el phase_config JSONB y la suma total se recalcula en tiempo real

### Scenario 3: Agregar template a una fase
- **Given** la fase "Floracion" tiene 2 templates asignados
- **When** el admin agrega "Control de plagas" con start_day=14 y frequency=biweekly
- **Then** el template aparece en la lista de la fase y el conteo de templates se incrementa a 3

### Scenario 4: Remover template de una fase
- **Given** la fase "Vegetativo" tiene 3 templates, uno de ellos "Monitoreo EC" con frequency=daily
- **When** el admin hace clic en el icono de eliminar de "Monitoreo EC" y confirma
- **Then** el template se remueve de la configuracion de esa fase y el conteo baja a 2

### Scenario 5: Cambiar cultivar no es posible
- **Given** el admin esta editando un schedule vinculado a "Gelato #41"
- **When** intenta cambiar el cultivar
- **Then** el campo cultivar esta deshabilitado con tooltip "No se puede cambiar el cultivar de un schedule existente. Cree uno nuevo."

### Scenario 6: Edicion no afecta batches existentes
- **Given** existe un batch LOT-001 creado con este schedule que ya tiene scheduled_activities generadas
- **When** el admin modifica los templates del schedule
- **Then** las scheduled_activities existentes del batch NO se modifican (usan template_snapshot). Solo nuevos batches usaran la configuracion actualizada

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Edicion de phase_config JSONB funcional
- [ ] Verificado que cambios no afectan batches existentes
- [ ] Accesibilidad: labels, focus management, contraste AA

## Technical Notes
- **Server Action**: `updateCultivationSchedule(id, data)` en `src/lib/actions/cultivation-schedules.ts`
- **Mismo Zod Schema** que US-076-002 para validacion
- **Cultivar inmutable**: El Server Action rechaza cambios a cultivar_id si el schedule ya tiene batches vinculados. El UI lo deshabilita siempre para simplicidad
- **Atomicidad**: El UPDATE reemplaza el phase_config JSONB completo — no hay patch parcial. El client envia el objeto completo
- **No cascade**: Los cambios al schedule NO generan UPDATE en scheduled_activities existentes. Las scheduled_activities tienen template_snapshot que es inmutable una vez creado

## UI/UX Notes
- Reutilizar los componentes del wizard de creacion pero en modo edicion
- Vista de una sola pagina (no wizard) con secciones: datos basicos arriba, fases y templates debajo
- Cada fase como seccion colapsable con lista de templates y controles inline
- Campo cultivar mostrado como texto readonly (no editable)
- Boton "Guardar cambios" sticky en bottom en mobile
- Indicador visual de suma de duraciones vs total_days

## Dependencies
- US-076-002 (creacion del schedule que se edita)
- US-076-001 (navegacion desde la lista)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-076-004: Preview de actividades generadas

## User Story

**As a** admin o gerente,
**I want** ver un preview de las actividades que se generarian para un batch hipotetico basandome en la configuracion actual del schedule,
**So that** pueda verificar visualmente que el plan es correcto antes de usarlo en produccion.

## Acceptance Criteria

### Scenario 1: Generar preview de actividades
- **Given** el admin esta viendo el detalle de un schedule con 4 fases y 10 templates configurados
- **When** hace clic en "Vista previa" e ingresa una fecha de inicio hipotetica (ej: 2026-03-01)
- **Then** el sistema calcula y muestra una lista cronologica de todas las actividades que se generarian, con: fecha planificada, dia del ciclo, fase, nombre del template, y frecuencia

### Scenario 2: Preview refleja frecuencias correctamente
- **Given** el schedule tiene en fase "Vegetativo" (dia 8-35) el template "Fertirrigacion" con start_day=1 y frequency=daily
- **When** el preview se genera con fecha inicio 2026-03-01
- **Then** se muestran 28 entradas de "Fertirrigacion" del dia 8 al dia 35, una por cada dia, con fechas consecutivas

### Scenario 3: Preview con timeline visual
- **Given** el preview se ha generado
- **When** el admin lo visualiza
- **Then** ve una timeline vertical agrupada por fase, con color coding por fase y badges de frecuencia por template. Cada fase muestra el rango de dias y las actividades dentro

### Scenario 4: Preview vacio para schedule sin templates
- **Given** el schedule tiene fases configuradas pero ninguna tiene templates asignados
- **When** el admin genera el preview
- **Then** ve un mensaje "No se generarian actividades. Asigne templates a las fases para crear un plan de actividades."

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Calculo de actividades correcto para todas las frecuencias (daily, weekly, biweekly, once)
- [ ] Vista responsive funcional en mobile y desktop
- [ ] Accesibilidad: semantica correcta, contraste AA

## Technical Notes
- **Calculo client-side**: El preview se calcula en el browser a partir del phase_config JSONB — no requiere Server Action. La logica de generacion es determinista
- **Algoritmo de generacion**: Para cada fase del config:
  - `phase_start_day` = suma de duraciones de fases anteriores + 1
  - `phase_end_day` = phase_start_day + duration_days - 1
  - Para cada template en la fase:
    - `first_activity_day` = phase_start_day + template.start_day - 1
    - Generar segun frequency: daily (cada dia), weekly (cada 7 dias), biweekly (cada 14 dias), once (solo first_activity_day)
    - Mientras activity_day <= phase_end_day
- **Reutilizar logica**: Esta misma logica es la que usa `generateScheduledActivities()` en el server. Considerar extraer a una utility compartida en `src/lib/utils/schedule-calculator.ts`
- **Formato de salida**: Array de `{day: number, date: Date, phase_name: string, template_name: string, frequency: string}`

## UI/UX Notes
- Boton "Vista previa" en la pagina de detalle/edicion del schedule
- Dialog o seccion expandible con input de fecha de inicio y boton "Generar"
- Timeline vertical agrupada por fase: cada fase es una seccion con header coloreado (nombre + dias)
- Dentro de cada fase: lista de actividades ordenadas por dia con: dia del ciclo (badge), fecha, template name
- Conteo total de actividades en el header: "Se generarian X actividades en Y dias"
- Scroll virtual si hay muchas actividades (>50)

## Dependencies
- US-076-002 (schedule creado con phase_config)
- US-076-003 (edicion del schedule antes de previsualizar)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-076-005: Desactivar schedule con validacion de batches

## User Story

**As a** admin o gerente,
**I want** poder desactivar un schedule que ya no se usa, con validacion que me advierta si hay batches activos vinculados,
**So that** pueda retirar planes obsoletos sin afectar batches en curso.

## Acceptance Criteria

### Scenario 1: Desactivar schedule sin batches activos
- **Given** "Plan Gelato Viejo" tiene 0 batches activos vinculados
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** el schedule se marca is_active=false, desaparece de la lista principal, y aparece solo con el toggle "Mostrar inactivos"

### Scenario 2: Desactivar schedule con batches activos
- **Given** "Plan Gelato Indoor 127d" tiene 2 batches activos (LOT-001, LOT-003) que usan este schedule
- **When** el admin intenta desactivar el schedule
- **Then** el sistema muestra warning "Este plan tiene 2 batches activos que lo usan. Desactivar no afecta los batches existentes ni sus actividades programadas, pero impedira seleccionar este plan en nuevas ordenes." y requiere confirmacion explicita

### Scenario 3: Reactivar schedule previamente desactivado
- **Given** "Plan Gelato Viejo" esta inactivo y visible con el toggle "Mostrar inactivos"
- **When** el admin hace clic en "Reactivar"
- **Then** el schedule vuelve a is_active=true y aparece en la lista principal

### Scenario 4: Schedule inactivo no aparece en selectores
- **Given** "Plan Gelato Viejo" esta inactivo
- **When** un admin o gerente crea una nueva orden y ve el selector de schedule
- **Then** "Plan Gelato Viejo" no aparece como opcion en el dropdown

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion de dependencias (batches activos) antes de desactivar

## Technical Notes
- **Server Actions**: `deactivateCultivationSchedule(id)`, `reactivateCultivationSchedule(id)` en `src/lib/actions/cultivation-schedules.ts`
- **Auth**: `requireAuth(['admin', 'manager'])`
- Antes de desactivar: query COUNT de batches WHERE schedule_id = id AND status IN ('active', 'phase_transition', 'on_hold')
- `deactivateCultivationSchedule` solo hace UPDATE is_active=false, no cascade a batches ni scheduled_activities
- Queries de selectores deben filtrar WHERE is_active = true

## UI/UX Notes
- Boton "Desactivar" con estilo secondary + clases de error
- Modal de confirmacion con conteo de batches activos
- Boton "Reactivar" visible solo en modo "Mostrar inactivos"

## Dependencies
- US-076-001 (lista donde aparece/desaparece)

## Estimation
- **Size**: S
- **Complexity**: Low
