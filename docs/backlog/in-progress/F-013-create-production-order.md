# F-013: Crear Orden de Produccion — Wizard 5 Pasos

## Overview

El wizard de creacion de ordenes de produccion es el punto de entrada del ciclo productivo. En 5 pasos, el gerente o admin selecciona un cultivar, define las fases de inicio y fin, establece la cantidad inicial con calculo automatico de yield en cascada, asigna zonas y fechas, y revisa todo antes de guardar. La orden se crea en estado 'draft' sin afectar inventario ni crear batch.

## User Personas

- **Gerente**: Principal usuario. Crea ordenes de produccion basandose en la demanda y capacidad disponible. Necesita ver el yield esperado en cascada para tomar decisiones informadas.
- **Admin**: Puede crear ordenes con los mismos permisos que el gerente.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-013-001 | Paso 1: Seleccion de cultivar | S | P0 | Planned |
| US-013-002 | Paso 2: Seleccion de fases entry/exit | M | P0 | Planned |
| US-013-003 | Paso 3: Cantidad inicial y calculo de yield en cascada | L | P0 | Planned |
| US-013-004 | Paso 4: Asignacion de zonas y fechas | M | P0 | Planned |
| US-013-005 | Paso 5: Revision y guardado como draft | M | P0 | Planned |
| US-013-006 | Persistencia de wizard (auto-save entre pasos) | S | P1 | Planned |

---

# US-013-001: Paso 1 — Seleccion de cultivar

## User Story

**As a** gerente,
**I want** seleccionar un cultivar de un catalogo visual con cards que muestren nombre, tipo de cultivo, ciclo estimado y rendimiento esperado,
**So that** pueda elegir la variedad correcta como base para la nueva orden de produccion.

## Acceptance Criteria

### Scenario 1: Seleccionar cultivar exitosamente
- **Given** el gerente esta en el paso 1 del wizard order-create y existen cultivares activos
- **When** hace tap en la card del cultivar "Gelato #41"
- **Then** la card se resalta como seleccionada, el boton "Siguiente" se habilita, y el wizard carga las fases del crop_type asociado para el paso 2

### Scenario 2: Filtrar cultivares por tipo de cultivo
- **Given** existen cultivares de Cannabis y de Arandano
- **When** el gerente selecciona el filtro crop_type="Cannabis"
- **Then** solo se muestran los cultivares de cannabis, facilitando la seleccion

### Scenario 3: No hay cultivares configurados
- **Given** no existen cultivares activos en el sistema
- **When** el gerente accede al wizard
- **Then** se muestra un empty state "No hay cultivares configurados. Contacta al administrador para crear cultivares." y el wizard no puede avanzar

### Scenario 4: Cambiar cultivar despues de haber avanzado pasos
- **Given** el gerente esta en el paso 3 y ya selecciono fases y cantidad
- **When** vuelve al paso 1 y cambia el cultivar
- **Then** los pasos 2, 3 y 4 se resetean ya que las fases, yields y zonas dependen del cultivar seleccionado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: cards seleccionables con teclado

## Technical Notes
- **Server Action**: query de `cultivars` JOIN `crop_types` WHERE is_active=true, filtrado por company_id via RLS
- **Pantalla**: order-create, paso 1
- Al seleccionar cultivar, se pre-cargan las production_phases via `getAvailablePhases(cropTypeId)`

## UI/UX Notes
- Cards visuales: nombre grande, crop_type badge, ciclo en dias, rendimiento/planta, breeder
- Filtro por crop_type como chips en la parte superior
- Seleccion marcada con borde brand y checkmark
- Mobile: scroll vertical de cards. Desktop: grid 2-3 columnas

## Dependencies
- F-011, F-012 (crop_types, cultivars deben existir)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-013-002: Paso 2 — Seleccion de fases entry/exit

## User Story

**As a** gerente,
**I want** seleccionar la fase de inicio (entry point) y la fase de fin (exit point) del ciclo productivo, con un stepper visual que muestre todas las fases disponibles y permita incluir o excluir fases opcionales,
**So that** pueda crear ordenes que cubran solo el subconjunto de fases necesario (full-cycle, solo vivero, solo procesamiento).

## Acceptance Criteria

### Scenario 1: Seleccionar entry y exit point exitosamente
- **Given** el cultivar seleccionado pertenece a un crop_type con fases: Germinacion(entry), Propagacion, Vegetativo, Floracion, Cosecha, Secado(exit), Empaque(exit)
- **When** el gerente selecciona entry=Germinacion, exit=Empaque
- **Then** el stepper visual muestra todas las fases 1-7 seleccionadas, el boton "Siguiente" se habilita

### Scenario 2: Seleccionar subconjunto de fases (procesador post-cosecha)
- **Given** las fases del crop_type incluyen can_be_entry_point en "Secado" y can_be_exit_point en "Empaque"
- **When** el gerente selecciona entry=Secado, exit=Empaque
- **Then** el stepper muestra solo las fases 5-7, las anteriores aparecen en gris como "excluidas"

### Scenario 3: Exit phase antes que entry phase
- **Given** el gerente esta seleccionando fases
- **When** intenta seleccionar un exit_phase cuyo sort_order es menor que el entry_phase seleccionado
- **Then** el sistema muestra error "La fase de salida debe ser posterior a la fase de entrada" y no permite avanzar

### Scenario 4: Toggle de fases opcionales (can_skip)
- **Given** entre entry y exit hay una fase con can_skip=true (ej: "Propagacion")
- **When** el gerente desactiva el toggle de esa fase
- **Then** la fase se muestra como "omitida" en el stepper, y el yield cascade del paso 3 recalcula excluyendo esa fase

### Scenario 5: No hay fases con can_be_entry_point
- **Given** el crop_type no tiene ninguna fase con can_be_entry_point=true
- **When** el gerente llega al paso 2
- **Then** el sistema muestra warning "No hay fases configuradas como punto de entrada. Contacta al administrador." y no permite avanzar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para validacion entry < exit
- [ ] Criterios de aceptacion verificados
- [ ] Stepper visual responsive

## Technical Notes
- **Server Action**: `getAvailablePhases(cropTypeId)` retorna production_phases ordenadas por sort_order con flags can_be_entry_point y can_be_exit_point
- **Validacion**: entry_phase.sort_order < exit_phase.sort_order (server-side en createOrder)
- **Pantalla**: order-create, paso 2

## UI/UX Notes
- Stepper horizontal o vertical mostrando todas las fases del crop_type
- Dropdowns o selectors para entry y exit point (solo muestran fases elegibles)
- Fases entre entry y exit: activas por default, con toggle para can_skip=true
- Fases fuera del rango: grises, no interactivas
- Preview visual de la cadena seleccionada

## Dependencies
- US-013-001, F-011 (fases configuradas con flags de entry/exit)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-013-003: Paso 3 — Cantidad inicial y calculo de yield en cascada

## User Story

**As a** gerente,
**I want** ingresar la cantidad inicial (semillas, clones, kg de material) y ver en tiempo real el calculo de rendimiento en cascada que muestra cuanto se espera obtener al final de cada fase,
**So that** pueda tomar decisiones informadas sobre el volumen de produccion basandome en los yields historicos configurados.

## Acceptance Criteria

### Scenario 1: Calculo de yield en cascada exitoso
- **Given** el gerente esta en el paso 3 con fases Germinacion→Empaque seleccionadas
- **When** ingresa initial_quantity=50, unidad=semillas
- **Then** el sistema calcula y muestra: "50 semillas -> 45 plantulas (90%) -> 42 plantas (95%) -> ... -> 4.7kg producto final" usando expected_yield_pct de phase_product_flows

### Scenario 2: Recalculo al cambiar cantidad
- **Given** el yield cascade ya esta mostrando resultados para 50 semillas
- **When** el gerente cambia la cantidad a 100 semillas
- **Then** el cascade se recalcula en tiempo real mostrando "100 semillas -> 90 plantulas -> ... -> 9.4kg producto final"

### Scenario 3: Cultivar sin phase_product_flows configurados
- **Given** el cultivar seleccionado no tiene phase_product_flows completos para el rango de fases
- **When** el gerente ingresa la cantidad
- **Then** el sistema muestra warning "Yields no configurados — usando 100% por defecto" y calcula sin perdidas, permitiendo continuar

### Scenario 4: Cantidad inicial negativa o cero
- **Given** el gerente esta en el campo de cantidad
- **When** ingresa 0 o un valor negativo
- **Then** el sistema muestra error de validacion "La cantidad debe ser mayor a cero" y el boton Siguiente se deshabilita

### Scenario 5: Seleccionar producto de entrada para fase intermedia
- **Given** el entry_phase NO es la primera fase del crop_type (ej: procesador que empieza en Secado)
- **When** el gerente llega al paso 3
- **Then** el sistema requiere seleccionar initial_product_id (ej: flor humeda) ademas de la cantidad, ya que se arranca con material comprado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para calculateYieldCascade con diferentes escenarios
- [ ] Calculo en tiempo real sin lag perceptible
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `calculateYieldCascade(cultivarId, entryPhaseId, exitPhaseId, initialQty)` — calculo puro, no escribe en DB. Retorna array de {phase, input_qty, yield_pct, output_qty}
- **Zod Schema**: `createOrderSchema` valida initial_quantity con z.number().positive()
- Chaining: output de fase N = input de fase N+1, yield_pct de phase_product_flows con direction='out' y product_role='primary'
- Si no hay flows: yield_pct = 100% con warning
- initial_product_id solo requerido si entry_phase no es la primera del crop_type
- **Pantalla**: order-create, paso 3

## UI/UX Notes
- Input grande de cantidad con selector de unidad a la derecha
- Cascade visual: lista vertical con flechas entre fases mostrando cantidad entrada -> yield % -> cantidad salida
- Numeros en DM Mono para facil lectura
- Warning de yields faltantes en banner amarillo
- Si entry_phase no es primera: selector de producto visible

## Dependencies
- US-013-001, US-013-002, F-011 (phase_product_flows configurados)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-013-004: Paso 4 — Asignacion de zonas y fechas

## User Story

**As a** gerente,
**I want** asignar zonas para cada fase de la orden y establecer la fecha de inicio planificada, con calculo automatico de la fecha de fin basado en las duraciones del cultivar,
**So that** pueda planificar la rotacion de espacios y coordinar con el equipo de operaciones.

## Acceptance Criteria

### Scenario 1: Asignar zonas y fecha exitosamente
- **Given** el gerente esta en el paso 4 con 5 fases seleccionadas
- **When** asigna zona "Sala Propagacion" para Germinacion, "Sala Veg A" para Vegetativo, establece fecha inicio=2026-03-01 y selecciona un supervisor responsable
- **Then** el sistema calcula automaticamente: fin Germinacion=2026-03-08, inicio Vegetativo=2026-03-08, etc., y muestra el cronograma completo

### Scenario 2: Warning por capacidad insuficiente en zona
- **Given** la zona "Sala Veg A" tiene capacidad para 30 plantas y la orden es de 50
- **When** el gerente selecciona esa zona para la fase Vegetativo
- **Then** el sistema muestra warning "Sala Veg A tiene capacidad para 30 plantas. La orden requiere ~47 (post-yield). Capacidad restante insuficiente." pero permite continuar

### Scenario 3: Warning por solapamiento de fechas con otra orden
- **Given** ya existe una orden activa en "Sala Floracion" del 2026-03-15 al 2026-05-15
- **When** el gerente asigna la misma zona para floracion con fechas solapadas
- **Then** el sistema muestra warning "Solapamiento con orden OP-2026-001 en Sala Floracion. Capacidad restante: X plantas." pero no bloquea

### Scenario 4: Fecha de inicio en el pasado
- **Given** el gerente esta en el selector de fecha
- **When** selecciona una fecha anterior a hoy
- **Then** el sistema muestra error "La fecha de inicio debe ser hoy o posterior" y no permite avanzar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para calculo de fechas
- [ ] Warnings de capacidad y solapamiento funcionales
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Calculo de fechas**: para cada fase, planned_start = anterior.planned_end, planned_end = planned_start + phase_duration_days (del cultivar o default)
- **Validacion de capacidad**: query zones.plant_capacity vs SUM(batches.plant_count WHERE zone_id AND status='active')
- **Zod Schema**: target_zone_ids como z.record(phase_id, zone_id), planned_start_date como z.string().date()
- **Pantalla**: order-create, paso 4

## UI/UX Notes
- Tabla o lista de fases con: nombre de fase, selector de zona (dropdown con search), fecha inicio (auto), fecha fin (auto), duracion en dias
- Selector de fecha de inicio general en la parte superior
- Selector de responsable (assigned_to): dropdown de usuarios con rol manager o supervisor
- Warnings inline junto a cada zona con problemas

## Dependencies
- US-013-001, US-013-002, US-013-003
- Zonas configuradas (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-013-005: Paso 5 — Revision y guardado como draft

## User Story

**As a** gerente,
**I want** revisar un resumen completo de la orden antes de guardarla, con la opcion de guardar como borrador o aprobar directamente si tengo permisos,
**So that** pueda verificar que todos los datos son correctos antes de comprometer recursos y generar un batch.

## Acceptance Criteria

### Scenario 1: Guardar orden como borrador exitosamente
- **Given** el gerente ha completado los 5 pasos del wizard sin errores
- **When** hace clic en "Guardar como borrador"
- **Then** el Server Action createOrder crea la production_order con status='draft', genera los production_order_phases, y navega a la lista de ordenes con toast "Orden OP-2026-XXX creada como borrador"

### Scenario 2: Aprobar directamente desde el wizard
- **Given** el gerente esta en el paso 5 y tiene permisos de aprobacion
- **When** hace clic en "Aprobar directamente"
- **Then** el sistema crea la orden como draft y la aprueba en una operacion, generando el batch inmediatamente (ver F-014)

### Scenario 3: Resumen muestra todos los datos para verificacion
- **Given** el gerente llega al paso 5
- **When** se renderiza la pantalla de revision
- **Then** se muestra: cultivar, fases seleccionadas (entry->exit), cantidad + yield cascade completo, zonas por fase, fecha inicio y fin calculadas, responsable, prioridad, y cualquier warning activo

### Scenario 4: Volver a un paso anterior para corregir
- **Given** el gerente esta en el paso 5 y nota un error en la zona asignada
- **When** hace clic en el paso 4 del stepper del wizard
- **Then** navega al paso 4 con todos los datos preservados y puede corregir sin perder la informacion de otros pasos

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Server Action createOrder funcional con INSERT atomico
- [ ] Tests unitarios y de integracion
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `createOrder(input)` — INSERT production_orders + INSERT production_order_phases (uno por fase en rango). Status='draft'. Retorna orden con fases.
- **Zod Schema**: `createOrderSchema` valida todos los campos del wizard
- **Validacion server-side adicional**: entry_phase.sort_order < exit_phase.sort_order, fases intermedias existen, planned_start_date >= today
- **Pantalla**: order-create, paso 5

## UI/UX Notes
- Resumen en formato card/seccion: datos del cultivar, stepper de fases con zonas, cascade de yield visual, cronograma, responsable
- Dos botones: "Guardar borrador" (secondary) y "Aprobar directamente" (primary, solo si tiene permisos)
- Cada seccion del resumen tiene un link/boton para "Editar" que navega al paso correspondiente
- Warnings acumulados visibles en una seccion al final

## Dependencies
- US-013-001 a US-013-004

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-013-006: Persistencia de wizard (auto-save entre pasos)

## User Story

**As a** gerente,
**I want** que el progreso del wizard se guarde automaticamente entre pasos, incluso si cierro la app y vuelvo despues,
**So that** no pierda el trabajo de configuracion si me interrumpen o si la conexion se pierde en medio del proceso.

## Acceptance Criteria

### Scenario 1: Navegar entre pasos preserva datos
- **Given** el gerente ha completado los pasos 1, 2 y 3
- **When** navega al paso 1 y luego vuelve al paso 3
- **Then** todos los datos del paso 3 estan intactos (cantidad, yields calculados)

### Scenario 2: Cerrar app y retomar wizard
- **Given** el gerente ha completado hasta el paso 3 y cierra el navegador
- **When** vuelve a abrir la app y navega a "Nueva orden"
- **Then** el sistema ofrece "Retomar orden en progreso?" con opcion de continuar donde quedo o empezar de nuevo

### Scenario 3: Expirar wizard abandonado
- **Given** el gerente inicio un wizard hace mas de 24 horas sin completarlo
- **When** abre la app
- **Then** el wizard expirado se descarta automaticamente y se inicia uno nuevo sin preguntar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Persistencia en localStorage o Zustand persist
- [ ] Tests para persistencia y recuperacion
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Persistencia via Zustand store con persist middleware (localStorage)
- Key: `wizard-order-draft-{userId}`
- Cada paso guarda su estado al hacer "Siguiente" o al perder foco
- Limpieza: al guardar la orden exitosamente, eliminar el draft del store
- TTL de 24h para drafts abandonados

## UI/UX Notes
- Dialog de recuperacion: "Tienes una orden en progreso. Continuar o empezar de nuevo?"
- Indicador sutil de auto-guardado (checkmark con "Guardado" al pie del wizard)

## Dependencies
- US-013-001 a US-013-005

## Estimation
- **Size**: S
- **Complexity**: Low
