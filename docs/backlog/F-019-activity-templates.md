# F-019: Templates de Actividad (CRUD)

## Overview

Los templates de actividad son las recetas reutilizables que definen que recursos se necesitan, que pasos del checklist se deben verificar, y en que fases aplican. Al programar o ejecutar una actividad, se toma un snapshot del template. Esta pantalla permite al gerente y admin crear y gestionar estos templates con un editor completo que incluye tabla de recursos (con modos de escalado), lista de checklist items (drag-to-reorder), y seleccion de fases aplicables.

## User Personas

- **Gerente**: Crea y edita templates de actividad basandose en protocolos agronomicos.
- **Admin**: Acceso completo para gestionar templates.
- **Supervisor**: Consulta templates para entender que se espera en cada actividad. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-019-001 | Lista de templates con filtros | S | P0 | Planned |
| US-019-002 | Editor de template: datos base y configuracion | M | P0 | Planned |
| US-019-003 | Editor de recursos del template (quantity_basis) | L | P0 | Planned |
| US-019-004 | Editor de checklist items (drag-to-reorder) | M | P0 | Planned |
| US-019-005 | Seleccion de fases aplicables (multi-select) | S | P1 | Planned |

---

# US-019-001: Lista de templates con filtros

## User Story

**As a** gerente,
**I want** ver una lista de todos los templates de actividad con filtros por tipo y fase aplicable,
**So that** pueda encontrar y gestionar las recetas de actividades de forma eficiente.

## Acceptance Criteria

### Scenario 1: Ver lista de templates con datos clave
- **Given** existen 15 templates de actividad en el sistema
- **When** el gerente navega a la pantalla act-templates
- **Then** se muestran cards con: codigo, nombre, tipo (badge), frecuencia, fases aplicables (badges), count de recursos, indicador si triggers_phase_change

### Scenario 2: Filtrar por tipo de actividad
- **Given** existen templates de tipo Fertirrigacion, Poda y Cosecha
- **When** el gerente selecciona filtro tipo="Fertirrigacion"
- **Then** solo se muestran templates de tipo Fertirrigacion

### Scenario 3: Filtrar por fase aplicable
- **Given** existen templates aplicables a diferentes fases
- **When** el gerente filtra por fase="Floracion"
- **Then** solo se muestran templates que tienen la fase Floracion en su activity_template_phases

### Scenario 4: Lista vacia
- **Given** no existen templates
- **When** el gerente navega a act-templates
- **Then** se muestra empty state "No hay templates de actividad. Crea el primero para poder programar actividades."

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Filtros funcionales
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Query**: activity_templates JOIN activity_types, LEFT JOIN activity_template_phases JOIN production_phases
- Filtro por fase: WHERE EXISTS (SELECT 1 FROM activity_template_phases WHERE template_id AND phase_id=filtro)
- **Pantalla**: act-templates

## UI/UX Notes
- Cards con: codigo en monospace, nombre, tipo badge coloreado, frecuencia, fases como badges, icono de triggers_phase_change si activo
- Filtros como chips en header: tipo, fase
- Tap en card abre el editor

## Dependencies
- F-011 (fases configuradas), F-001 a F-006 (Fase 0)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-019-002: Editor de template: datos base y configuracion

## User Story

**As a** gerente,
**I want** crear y editar un template de actividad definiendo nombre, codigo, tipo, frecuencia, duracion estimada, y si dispara cambio de fase o transformacion,
**So that** pueda configurar la receta base de una actividad que sera reutilizada al programarla para multiples batches.

## Acceptance Criteria

### Scenario 1: Crear template con datos base
- **Given** el gerente esta en el editor de templates
- **When** completa: codigo="FERT-VEG-S1", tipo=Fertirrigacion, nombre="Fertirrigacion Vegetativa Semana 1-2", frecuencia=daily, duracion_estimada=30min
- **Then** el template se crea y aparece en la lista con todos los datos visibles

### Scenario 2: Configurar triggers_phase_change
- **Given** el gerente esta creando un template de tipo "Cosecha"
- **When** activa triggers_phase_change_id y selecciona la fase "Secado"
- **Then** el template queda configurado para que al ejecutar esta actividad el batch avance automaticamente a la fase "Secado"

### Scenario 3: Validacion de codigo unico
- **Given** ya existe un template con code="FERT-VEG-S1"
- **When** el gerente intenta crear otro con el mismo codigo
- **Then** el sistema muestra error "Ya existe un template con el codigo FERT-VEG-S1"

### Scenario 4: Editar template existente
- **Given** existe el template "FERT-VEG-S1" con duracion=30min
- **When** el gerente cambia la duracion a 45min y guarda
- **Then** el template se actualiza. Los scheduled_activities ya generados NO se afectan (tienen snapshot)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Actions**: `createTemplate`, `updateTemplate` en `lib/actions/activity.actions.ts`
- **Tablas**: activity_templates — code UNIQUE, FK a activity_types, production_phases (triggers_phase_change_id)
- Cambios al template no afectan scheduled_activities existentes (snapshot inmutable)

## UI/UX Notes
- Formulario en pagina dedicada o modal grande con secciones
- Seccion 1: datos base (codigo, nombre, tipo selector, frecuencia, duracion)
- Seccion 2: configuracion avanzada (triggers_phase_change, triggers_transformation, metadata JSON)
- Preview: "Al completar esta actividad, el batch avanzara a fase Secado"

## Dependencies
- US-019-001, F-011

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-019-003: Editor de recursos del template (quantity_basis)

## User Story

**As a** gerente,
**I want** definir los recursos (productos) que se necesitan para una actividad, con cantidad y modo de escalado (fijo, por planta, por m2, por zona, por litro de solucion),
**So that** al ejecutar la actividad el operador vea las cantidades automaticamente escaladas segun el tamano del batch y la zona.

## Acceptance Criteria

### Scenario 1: Agregar recurso con escalado por planta
- **Given** el gerente esta editando recursos del template FERT-VEG-S1
- **When** agrega: producto=Agua, cantidad=5, quantity_basis=per_plant, is_optional=false
- **Then** el recurso aparece en la tabla con preview: "5 L/planta. Para batch de 42 plantas = 210 L"

### Scenario 2: Agregar recurso con escalado por litro de solucion
- **Given** el template ya tiene "Agua" con 210L
- **When** agrega: producto=Ca(NO3)2, cantidad=0.8, quantity_basis=per_L_solution
- **Then** el recurso muestra preview: "0.8 g/L solucion. Para 210L = 168g"

### Scenario 3: Agregar recurso fijo
- **Given** el gerente agrega un recurso de EPP
- **When** selecciona: producto=Guantes nitrilo, cantidad=2, quantity_basis=fixed
- **Then** el recurso muestra "2 pares (fijo, no escala)"

### Scenario 4: Reordenar recursos
- **Given** hay 5 recursos en la tabla
- **When** el gerente arrastra "Guantes" al inicio de la lista
- **Then** los recursos se reordenan y el sort_order se actualiza

### Scenario 5: Marcar recurso como opcional
- **Given** el gerente agrega "Miel/Melaza"
- **When** activa el toggle is_optional=true
- **Then** el recurso muestra badge "Opcional" y el operador podra omitirlo al ejecutar sin que bloquee la actividad

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Preview de escalado funcional
- [ ] Tests unitarios para calculos de escalado
- [ ] Criterios de aceptacion verificados
- [ ] Drag-and-drop funcional para reordenar

## Technical Notes
- **Tabla**: activity_template_resources — FK a activity_templates, products, units_of_measure
- **Campos clave**: quantity, quantity_basis ENUM (fixed | per_plant | per_m2 | per_zone | per_L_solution), is_optional, sort_order
- Calculo de preview: depende del quantity_basis y datos de referencia (plant_count, area_m2, volume solucion)
- **Server Actions**: `updateTemplateResources(templateId, resources[])` — atomico

## UI/UX Notes
- Tabla editable con columnas: producto (search selector), cantidad (input numerico), basis (dropdown), unidad (auto del producto), opcional (toggle), acciones
- Drag handle a la izquierda para reordenar
- Preview de escalado debajo de la tabla: "Ejemplo para batch de 42 plantas en zona de 20m2"
- Boton "+" para agregar recurso, "x" para eliminar

## Dependencies
- US-019-002, Catalogo de productos (Fase 0)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-019-004: Editor de checklist items (drag-to-reorder)

## User Story

**As a** gerente,
**I want** definir los items del checklist de verificacion para un template, con instrucciones, indicador de criticidad, valores esperados y tolerancias, ordenables por drag-and-drop,
**So that** el operador tenga una lista clara de pasos a verificar durante la ejecucion de la actividad.

## Acceptance Criteria

### Scenario 1: Agregar item critico con valor esperado
- **Given** el gerente esta editando el checklist del template FERT-VEG-S1
- **When** agrega: instruccion="Verificar EC del drenaje", is_critical=true, expected_value="1.5-2.0", tolerance="+-0.3"
- **Then** el item aparece en la lista con badge rojo "Critico" y muestra rango esperado

### Scenario 2: Agregar item informativo simple
- **Given** el gerente agrega un item de verificacion
- **When** completa: instruccion="Verificar color de hojas", is_critical=false, sin expected_value
- **Then** el item aparece como checkbox simple sin indicador de rango ni bloqueo

### Scenario 3: Reordenar items por drag-and-drop
- **Given** hay 5 items en el checklist
- **When** el gerente arrastra "Verificar pH" del puesto 4 al puesto 1
- **Then** los items se reordenan y step_order se actualiza atomicamente

### Scenario 4: Item critico con requires_photo
- **Given** el gerente agrega un item de verificacion visual
- **When** activa requires_photo=true e is_critical=true
- **Then** al ejecutar, el operador debera tomar foto Y completar el item para poder finalizar la actividad

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Drag-and-drop funcional en mobile y desktop
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Tabla**: activity_template_checklist — FK a activity_templates
- **Campos**: step_order, instruction (TEXT), is_critical (BOOLEAN), requires_photo (BOOLEAN), expected_value (VARCHAR opt), tolerance (VARCHAR opt)
- **Server Actions**: `updateTemplateChecklist(templateId, items[])` — atomico
- Items criticos bloquean la completitud de la actividad en F-022

## UI/UX Notes
- Lista vertical con drag handle, cada item muestra: instruccion, badges (critico, foto), campos de valor esperado y tolerancia
- Inline edit para instruccion y valores
- Badge rojo "Critico" y badge camara "Requiere foto"
- Boton "+" al final para agregar item

## Dependencies
- US-019-002

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-019-005: Seleccion de fases aplicables (multi-select)

## User Story

**As a** gerente,
**I want** seleccionar en que fases de produccion aplica un template de actividad usando un multi-select,
**So that** al programar actividades para un batch, solo se ofrezcan los templates relevantes para la fase actual.

## Acceptance Criteria

### Scenario 1: Seleccionar multiples fases
- **Given** el gerente esta editando el template FERT-VEG-S1
- **When** selecciona las fases "Vegetativo" y "Floracion" en el multi-select
- **Then** se crean los registros en activity_template_phases para ambas fases y el template aparece como disponible en ambas fases

### Scenario 2: Template sin fases seleccionadas
- **Given** el gerente no selecciona ninguna fase
- **When** intenta guardar el template
- **Then** el sistema muestra warning "Template sin fases asociadas. No sera ofrecido al programar actividades." pero permite guardar

### Scenario 3: Deseleccionar fase con scheduled_activities existentes
- **Given** el template tiene fase "Vegetativo" seleccionada y hay scheduled_activities usando este template en fase Vegetativo
- **When** el gerente deselecciona "Vegetativo"
- **Then** el sistema muestra warning "Hay X actividades programadas usando este template en fase Vegetativo. Deseleccionar no afecta actividades existentes." y permite continuar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tabla de union activity_template_phases gestionada correctamente
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Tabla**: activity_template_phases — UNIQUE(template_id, phase_id)
- **Server Actions**: parte del `updateTemplate` que sincroniza fases seleccionadas
- Filtrado en programacion: WHERE template_id IN (SELECT template_id FROM activity_template_phases WHERE phase_id=currentPhase)

## UI/UX Notes
- Multi-select con checkboxes: lista de fases del crop_type asociado
- Fases seleccionadas como badges debajo del selector
- Si el template no tiene crop_type fijo: mostrar todas las fases de todos los crop_types con agrupacion

## Dependencies
- US-019-002, F-011 (fases configuradas)

## Estimation
- **Size**: S
- **Complexity**: Low
