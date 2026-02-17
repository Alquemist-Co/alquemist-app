# F-011: Configuracion de Tipos de Cultivo y Fases

## Overview

Permite al administrador crear y gestionar tipos de cultivo (crop_types) con sus fases de produccion (production_phases) configurables, incluyendo el orden de ejecucion, propiedades de cada fase (transformacion, destructiva, cambio de zona), y los flujos de producto por fase (phase_product_flows) que definen que entra y que sale de cada etapa. Esta configuracion es la base de todo el ciclo productivo: sin ella no se pueden crear ordenes, batches ni actividades.

## User Personas

- **Admin**: Configura los tipos de cultivo, define las fases en el orden correcto, y establece los flujos de producto (inputs/outputs) por fase. Es el unico rol con acceso de escritura a esta pantalla.
- **Gerente**: Consulta la configuracion de fases para entender la cadena productiva al crear ordenes. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-011-001 | CRUD de tipos de cultivo | S | P0 | Planned |
| US-011-002 | CRUD de fases de produccion con drag-to-reorder | M | P0 | Planned |
| US-011-003 | Configuracion de phase product flows por fase | L | P0 | Planned |
| US-011-004 | Validacion visual de cadena input-output entre fases consecutivas | M | P1 | Planned |
| US-011-005 | Soft delete y proteccion de datos en uso | S | P1 | Planned |

---

# US-011-001: CRUD de tipos de cultivo

## User Story

**As a** admin,
**I want** crear, editar, listar y desactivar tipos de cultivo,
**So that** pueda definir los diferentes cultivos que la empresa maneja (cannabis, arandano, fresa, etc.) como base para toda la configuracion productiva.

## Acceptance Criteria

### Scenario 1: Crear un nuevo tipo de cultivo exitosamente
- **Given** el admin esta en la pantalla cfg-crop-phases
- **When** hace clic en "Nuevo tipo de cultivo" y completa el formulario con nombre "Cannabis Medicinal", categoria "annual", y descripcion opcional
- **Then** el sistema crea el crop_type, lo muestra en la lista con count de fases = 0 y count de cultivares = 0, y muestra un toast de confirmacion

### Scenario 2: Editar un tipo de cultivo existente
- **Given** existe un crop_type "Cannabis Medicinal" en la lista
- **When** el admin hace clic en editar y cambia el nombre a "Cannabis Medicinal Indoor"
- **Then** el sistema actualiza el registro y refleja el cambio en la lista sin afectar las fases, cultivares u ordenes vinculadas

### Scenario 3: Intentar crear tipo de cultivo con nombre duplicado
- **Given** ya existe un crop_type con code "cannabis"
- **When** el admin intenta crear otro con el mismo code
- **Then** el sistema muestra error de validacion "Ya existe un tipo de cultivo con este codigo" y no crea el registro

### Scenario 4: Intentar crear tipo de cultivo con campos invalidos
- **Given** el admin esta en el formulario de creacion
- **When** intenta guardar con el campo nombre vacio o con menos de 2 caracteres
- **Then** el sistema muestra error de validacion inline en el campo nombre y el boton guardar permanece deshabilitado

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Validacion Zod compartida client/server (createCropTypeSchema)
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Actions**: `createCropType`, `updateCropType`, `listCropTypes` en `lib/actions/config.actions.ts`
- **Zod Schema**: `createCropTypeSchema` de `lib/validations/config.schema.ts`
- **Tablas**: `crop_types` (Tipo D - catalogo global, admin_write RLS)
- **Pantalla**: cfg-crop-phases (lista de cards con nombre, categoria, count de fases, count de cultivares)

## UI/UX Notes
- Cards en lista con: nombre, categoria badge, count de fases, count de cultivares
- Tap en card abre el editor de fases (US-011-002)
- Formulario en bottom sheet (mobile) o modal (desktop)
- Empty state: "No hay tipos de cultivo configurados. Crea el primero para comenzar."

## Dependencies
- F-001 a F-006 (Fase 0): Auth, layout, DB schema, design system

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-011-002: CRUD de fases de produccion con drag-to-reorder

## User Story

**As a** admin,
**I want** crear, editar, reordenar y eliminar fases de produccion para un tipo de cultivo, con drag-and-drop para definir el orden de ejecucion,
**So that** pueda definir la secuencia exacta del ciclo productivo (germinacion, vegetativo, floracion, cosecha, secado, empaque) adaptada a cada tipo de cultivo.

## Acceptance Criteria

### Scenario 1: Crear una nueva fase y verla en la lista ordenada
- **Given** el admin esta en el editor de fases del crop_type "Cannabis Medicinal"
- **When** crea una fase con nombre "Floracion", codigo "FLOWERING", sort_order=4, is_transformation=false, requires_zone_change=true, default_duration_days=63
- **Then** la fase aparece en la posicion correcta de la lista drag-to-reorder con todos sus toggles visibles, y el sort_order se asigna automaticamente segun la posicion

### Scenario 2: Reordenar fases mediante drag-and-drop
- **Given** existen 5 fases ordenadas: Germinacion(1), Propagacion(2), Vegetativo(3), Floracion(4), Cosecha(5)
- **When** el admin arrastra "Propagacion" despues de "Vegetativo"
- **Then** el sistema reordena atomicamente: Germinacion(1), Vegetativo(2), Propagacion(3), Floracion(4), Cosecha(5), y muestra un toast de confirmacion

### Scenario 3: Reordenar fases cuando hay ordenes activas
- **Given** existen production_orders activas usando este crop_type
- **When** el admin intenta reordenar las fases
- **Then** el sistema muestra un warning "Hay X ordenes activas. Reordenar no afecta ordenes existentes." y permite continuar tras confirmacion

### Scenario 4: Crear fase con sort_order duplicado
- **Given** ya existe una fase con sort_order=3 en el crop_type
- **When** el admin intenta crear otra fase con sort_order=3
- **Then** el sistema auto-incrementa el sort_order de las fases existentes para hacer espacio, o muestra error si se ingresa manualmente pidiendo un valor unico

### Scenario 5: Editar toggles de fase (entry/exit point, skip, destructive)
- **Given** existe la fase "Cosecha" en la lista
- **When** el admin activa los toggles is_destructive=true, can_be_exit_point=true
- **Then** los cambios se guardan inmediatamente (inline edit) y los badges de la fase se actualizan visualmente para reflejar "destructiva" y "punto de salida"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Drag-and-drop funcional en mobile (touch) y desktop (mouse)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion Zod compartida client/server (createPhaseSchema)
- [ ] Accesibilidad: reorder via teclado (flechas arriba/abajo como alternativa a drag)

## Technical Notes
- **Server Actions**: `createPhase`, `updatePhase`, `reorderPhases(cropTypeId, phaseIds[])`, `deletePhase` en `lib/actions/config.actions.ts`
- **Zod Schema**: `createPhaseSchema` de `lib/validations/config.schema.ts` — valida code con regex `/^[A-Z0-9_]+$/`, sort_order unique dentro del crop_type
- **Tablas**: `production_phases` (catalogo global, admin_write)
- **Server Action `reorderPhases`**: recibe crop_type_id y array ordenado de phase IDs, UPDATE atomico de sort_order para cada fase
- **Pantalla**: cfg-crop-phases (lista drag-to-reorder dentro del detalle del crop_type)

## UI/UX Notes
- Lista vertical de fases con handle de drag a la izquierda
- Cada fase muestra: nombre, codigo (monospace), sort_order, badges para toggles activos (destructiva, transformacion, requiere zona, entry point, exit point, skippable)
- Inline edit: tap en campo para editar directamente
- Duracion default en dias visible a la derecha
- Boton "+" al final de la lista para agregar nueva fase

## Dependencies
- US-011-001 (debe existir al menos un crop_type)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-011-003: Configuracion de phase product flows por fase

## User Story

**As a** admin,
**I want** definir los flujos de producto (inputs y outputs) para cada fase de produccion, especificando que productos entran, cuales salen, el rendimiento esperado y el rol de cada producto,
**So that** el sistema pueda calcular automaticamente el yield en cascada de las ordenes de produccion y ejecutar las transformaciones de inventario correctamente durante la cosecha y otros procesos.

## Acceptance Criteria

### Scenario 1: Agregar un flow de output primario a una fase
- **Given** el admin esta editando los phase_product_flows de la fase "Cosecha"
- **When** agrega un flow con direction=output, product_role=primary, product_id=WET-GELATO, expected_yield_pct=100, is_required=true
- **Then** el flow aparece en la tabla de outputs de la fase con todos los campos visibles y editables

### Scenario 2: Agregar multiples outputs incluyendo waste
- **Given** la fase "Cosecha" ya tiene un output primario (flor humeda)
- **When** el admin agrega un output secundario (trim humedo, yield=40%) y un output waste (tallos, yield=10%)
- **Then** los tres outputs aparecen en la tabla ordenados por sort_order, con badges de color diferenciando primary (verde), secondary (azul), byproduct (naranja) y waste (rojo)

### Scenario 3: Configurar expected_yield_pct mayor a 100%
- **Given** el admin esta configurando la fase "Clonacion"
- **When** establece expected_yield_pct=300 (cada planta madre produce 3 clones)
- **Then** el sistema acepta el valor sin error ya que la clonacion genera mas output que input, y muestra el porcentaje en verde

### Scenario 4: Intentar guardar flow sin producto ni categoria
- **Given** el admin esta agregando un nuevo flow a una fase
- **When** intenta guardar sin seleccionar product_id ni product_category_id
- **Then** el sistema muestra error de validacion "Debe seleccionar un producto o una categoria" y no guarda el flow

### Scenario 5: Reemplazar todos los flows de una fase atomicamente
- **Given** la fase "Secado" tiene 3 flows configurados
- **When** el admin modifica la tabla de flows y guarda
- **Then** el Server Action `setPhaseProductFlow` elimina los flows existentes e inserta los nuevos en una transaccion atomica, garantizando consistencia

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Operacion atomica (DELETE + INSERT) verificada
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: tabla editable navegable por teclado

## Technical Notes
- **Server Action**: `setPhaseProductFlow(phaseId, flows[])` en `lib/actions/config.actions.ts` — DELETE existing flows for phase, INSERT new flows, atomico
- **Tablas**: `phase_product_flows` — FK a `production_phases`, `products` (opt), `resource_categories` (opt), `units_of_measure` (opt)
- **Validacion server-side**: al menos product_id O product_category_id debe estar definido. expected_yield_pct es opcional (null = sin calculo de yield para este flow)
- **Pantalla**: cfg-crop-phases, seccion de flows dentro del detalle de cada fase

## UI/UX Notes
- Tabla editable dentro de cada fase expandida, dividida en dos secciones: "Inputs" y "Outputs"
- Cada fila: direction badge, product selector (con search), role badge (primary/secondary/byproduct/waste), yield % input, unit selector, is_required toggle
- Boton "+" para agregar fila, "x" para eliminar
- Preview visual de la cadena: "Plantas -> Cosecha -> Flor humeda (100%) + Trim (40%) + Waste (10%)"

## Dependencies
- US-011-002 (debe existir al menos una fase)
- F-001 a F-006: Catalogo de productos basico debe existir para seleccionar en los flows

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-011-004: Validacion visual de cadena input-output entre fases consecutivas

## User Story

**As a** admin,
**I want** ver una validacion visual que confirme que la cadena de productos entre fases consecutivas es coherente (el output de la fase N coincide con el input de la fase N+1),
**So that** pueda detectar y corregir errores de configuracion antes de que afecten las ordenes de produccion y el calculo de yields.

## Acceptance Criteria

### Scenario 1: Cadena valida muestra indicador verde
- **Given** la fase "Floracion" tiene output primary=plantas en floracion, y la fase "Cosecha" tiene input=plantas en floracion
- **When** el admin visualiza la cadena de fases del crop_type
- **Then** la conexion entre Floracion y Cosecha muestra un indicador verde con checkmark indicando que el output matchea el input

### Scenario 2: Cadena con gap muestra warning
- **Given** la fase "Vegetativo" tiene output=plantas vegetativas, pero la fase siguiente "Floracion" no tiene ningun input configurado
- **When** el admin visualiza la cadena
- **Then** la conexion entre Vegetativo y Floracion muestra un indicador amarillo con warning "Fase sin input configurado — la transformacion no generara inventario automatico"

### Scenario 3: Cadena con mismatch muestra error
- **Given** la fase "Secado" tiene output=flor seca, pero la fase siguiente "Empaque" tiene input=flor humeda (producto diferente)
- **When** el admin visualiza la cadena
- **Then** la conexion muestra un indicador rojo con error "El output de Secado (flor seca) no coincide con el input de Empaque (flor humeda)" y sugiere corregir

### Scenario 4: Fase sin flows es valida
- **Given** la fase "Vegetativo" no tiene phase_product_flows configurados (fase que no transforma producto)
- **When** el admin visualiza la cadena
- **Then** la fase muestra un badge gris "Sin transformacion" y no genera error ni warning, ya que es un caso valido

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Visualizacion clara con iconos y colores semanticos
- [ ] Criterios de aceptacion verificados
- [ ] No depende de color unicamente (incluye iconos y texto)

## Technical Notes
- Validacion client-side: comparar product_id del output con direction='out' y product_role='primary' de fase N con product_id del input con direction='in' de fase N+1
- Si la comparacion es por product_category_id en lugar de product_id, considerar match si la categoria coincide
- Esta validacion es visual e informativa, no bloquea el guardado

## UI/UX Notes
- Vista de cadena horizontal o vertical mostrando las fases conectadas por flechas
- Cada conexion entre fases muestra: icono de estado (check verde, warning amarillo, error rojo), nombre del producto que fluye, yield esperado
- Al hacer clic en una conexion con error, resalta las fases involucradas

## Dependencies
- US-011-002, US-011-003

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-011-005: Soft delete y proteccion de datos en uso

## User Story

**As a** admin,
**I want** que al desactivar un tipo de cultivo o una fase, el sistema realice un soft delete (is_active=false) sin eliminar datos vinculados, y me advierta si hay batches o ordenes activas usando esa configuracion,
**So that** pueda retirar configuraciones obsoletas sin perder trazabilidad historica ni afectar operaciones en curso.

## Acceptance Criteria

### Scenario 1: Desactivar crop_type sin datos vinculados
- **Given** existe un crop_type "Fresa" sin cultivares, ordenes ni batches
- **When** el admin hace clic en "Desactivar"
- **Then** el sistema marca is_active=false, el crop_type desaparece de la lista principal pero permanece accesible en un filtro "Mostrar inactivos"

### Scenario 2: Desactivar crop_type con ordenes activas
- **Given** existe un crop_type "Cannabis" con 3 ordenes in_progress
- **When** el admin intenta desactivar el crop_type
- **Then** el sistema muestra warning "Hay 3 ordenes activas usando Cannabis Medicinal. Desactivar no afecta ordenes existentes pero impedira crear nuevas." y requiere confirmacion explicita

### Scenario 3: Intentar eliminar fase con batch activo en esa fase
- **Given** existe la fase "Floracion" y un batch LOT-001 con current_phase_id apuntando a esa fase
- **When** el admin intenta desactivar la fase
- **Then** el sistema muestra warning "El batch LOT-001 esta actualmente en la fase Floracion. Desactivar no afecta batches existentes." y permite continuar con confirmacion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para validacion de dependencias
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Actions**: `deactivateCropType(id)`, `deactivatePhase(id)` — UPDATE is_active=false
- Antes de desactivar: query para contar batches activos, ordenes activas, cultivares activos vinculados
- Los registros inactivos NO aparecen en selectores de nuevas ordenes/batches pero SI en consultas historicas
- **Tablas**: `crop_types.is_active`, `production_phases` (agregar is_active si no existe)

## UI/UX Notes
- Boton "Desactivar" con estilo destructivo (rojo)
- Modal de confirmacion con conteo de entidades afectadas
- Toggle "Mostrar inactivos" en la lista para ver registros desactivados con estilo muted

## Dependencies
- US-011-001, US-011-002

## Estimation
- **Size**: S
- **Complexity**: Medium
