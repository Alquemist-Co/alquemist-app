# F-075: CRUD de Tipos de Actividad

## Overview

Permite al administrador crear, editar, listar y desactivar tipos de actividad (`activity_types`) desde la UI. Actualmente la tabla existe en el schema con datos insertados via seed SQL, pero no hay pantalla de administracion. Los tipos de actividad son una clasificacion de primer nivel (~15-30 registros) usada como FK en `activity_templates.activity_type_id` para agrupacion y reporting. Este CRUD es necesario para que los administradores puedan personalizar los tipos de actividad sin acceso directo a la base de datos.

## User Personas

- **Admin**: Crea y gestiona tipos de actividad. Unico rol con acceso de escritura y lectura a esta pantalla.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-075-001 | Lista de tipos de actividad | S | P0 | Done |
| US-075-002 | Crear, editar y desactivar tipo de actividad | S | P0 | Done |

---

# US-075-001: Lista de tipos de actividad

## User Story

**As a** admin,
**I want** ver una lista de todos los tipos de actividad configurados en el sistema con su nombre, categoria y estado,
**So that** pueda tener una vision general de los tipos disponibles y acceder rapidamente a crear o editar uno.

## Acceptance Criteria

### Scenario 1: Visualizar lista de tipos de actividad
- **Given** existen 5 tipos de actividad: "Fertirrigacion" (categoria: nutricion), "Poda" (categoria: mantenimiento), "Cosecha" (sin categoria), "Trasplante" (categoria: manejo), "Fumigacion" (categoria: fitosanitario)
- **When** el admin navega a /settings/activity-types
- **Then** ve una tabla con columnas: nombre, categoria (o "-" si no tiene), estado (badge activo/inactivo), y acciones (editar, desactivar)

### Scenario 2: Lista vacia con empty state
- **Given** no existen tipos de actividad registrados
- **When** el admin navega a /settings/activity-types
- **Then** ve un empty state con mensaje "No hay tipos de actividad configurados" y CTA "Crear primer tipo"

### Scenario 3: Filtro de tipos inactivos
- **Given** existen 5 tipos de actividad, 1 de ellos con is_active=false
- **When** el admin activa el toggle "Mostrar inactivos"
- **Then** el tipo inactivo aparece en la tabla con estilo muted (opacity reducida) y badge "Inactivo"

### Scenario 4: Solo admin puede acceder
- **Given** un usuario con rol "supervisor" esta autenticado
- **When** intenta navegar a /settings/activity-types
- **Then** el middleware lo redirige a / porque no tiene permisos de acceso a configuracion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin'])
- [ ] RLS tipo D (catalogo global, lectura abierta a autenticados)
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getActivityTypes()` en `src/lib/actions/activity-types.ts` — query simple a `activity_types` con ORDER BY name
- **RLS**: Tipo D (catalogo global). SELECT para cualquier autenticado, INSERT/UPDATE solo admin
- **Ruta**: `/settings/activity-types` — Server Component que llama a `getActivityTypes()` + Client Component para tabla con filtro
- **Tabla simple**: Sin JOINs ni campos calculados. Solo 3 columnas de datos (name, category, is_active)

## UI/UX Notes
- Tabla simple responsive: en mobile se muestra como lista de cards con nombre y categoria
- Boton "Nuevo tipo" en header
- Toggle "Mostrar inactivos" en la parte superior derecha
- Cada fila tiene acciones: icono lapiz (editar) e icono toggle (activar/desactivar)

## Dependencies
- F-003 (schema de DB con tabla activity_types)
- F-004 (auth y middleware)
- F-005 (layout con settings section)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-075-002: Crear, editar y desactivar tipo de actividad

## User Story

**As a** admin,
**I want** crear nuevos tipos de actividad, editar los existentes y desactivar los que ya no se usan,
**So that** pueda mantener el catalogo de tipos actualizado sin necesidad de acceso directo a la base de datos.

## Acceptance Criteria

### Scenario 1: Crear tipo de actividad con datos minimos
- **Given** el admin esta en /settings/activity-types
- **When** hace clic en "Nuevo tipo", ingresa nombre "Riego manual" y deja categoria vacia
- **Then** el sistema crea el tipo, muestra toast "Tipo de actividad creado", y el tipo aparece en la lista

### Scenario 2: Crear tipo de actividad con categoria
- **Given** el admin esta en el dialog de nuevo tipo
- **When** ingresa nombre "Poda de formacion" y categoria "mantenimiento"
- **Then** el tipo se crea con la categoria asignada y se muestra en la tabla con su badge de categoria

### Scenario 3: Editar tipo de actividad existente
- **Given** existe "Fertirrigacion" con categoria "nutricion"
- **When** el admin hace clic en editar, cambia la categoria a "riego y nutricion" y guarda
- **Then** los cambios se persisten, la tabla se actualiza, y un toast confirma "Tipo de actividad actualizado"

### Scenario 4: Nombre duplicado
- **Given** ya existe un tipo con nombre "Cosecha"
- **When** el admin intenta crear otro tipo con nombre "Cosecha"
- **Then** el sistema muestra error "Ya existe un tipo de actividad con este nombre" y no crea el registro

### Scenario 5: Validacion de campo obligatorio
- **Given** el admin abre el dialog de nuevo tipo
- **When** intenta guardar sin completar el nombre
- **Then** el sistema muestra error de validacion inline "El nombre es obligatorio"

### Scenario 6: Desactivar tipo sin templates vinculados
- **Given** existe "Fumigacion" sin ningun activity_template que lo referencie
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** el tipo se marca is_active=false, desaparece de la lista principal, y solo aparece con el toggle "Mostrar inactivos"

### Scenario 7: Desactivar tipo con templates vinculados
- **Given** existe "Fertirrigacion" con 3 activity_templates que lo referencian
- **When** el admin intenta desactivar el tipo
- **Then** el sistema muestra warning "Este tipo tiene 3 templates vinculados. Desactivar no afecta templates existentes pero impedira crear nuevos templates con este tipo." y requiere confirmacion explicita

### Scenario 8: Reactivar tipo previamente desactivado
- **Given** "Fumigacion" esta inactivo y visible con el toggle "Mostrar inactivos"
- **When** el admin hace clic en "Reactivar"
- **Then** el tipo vuelve a is_active=true y aparece en la lista principal

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createActivityType(data)`, `updateActivityType(id, data)`, `deactivateActivityType(id)`, `reactivateActivityType(id)` en `src/lib/actions/activity-types.ts`
- **Zod Schema**: `activityTypeSchema` en `src/lib/schemas/activity-type.ts`
  - name: string min(2) max(100)
  - category: string max(50) optional (puede ser empty string o undefined)
- **Auth**: `requireAuth(['admin'])` en todas las actions de mutacion
- **Validacion de dependencias**: Antes de desactivar, query COUNT de activity_templates WHERE activity_type_id = id AND is_active = true
- **Unicidad de nombre**: Validar en Server Action con query previa, no solo constraint de DB (para mensaje user-friendly)
- **RLS**: Tipo D — catalogo global. El campo no tiene company_id

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- 2 campos: nombre (Input obligatorio) y categoria (Input opcional)
- Boton submit: "Crear tipo" / "Guardar cambios" segun contexto
- Boton desactivar con estilo secondary + clases de error
- Modal de confirmacion al desactivar si hay templates vinculados, mostrando conteo
- Boton "Reactivar" visible solo en modo "Mostrar inactivos"

## Dependencies
- US-075-001 (lista donde aparece el tipo)
- F-019 (activity templates — depende de activity_types como FK)

## Estimation
- **Size**: S
- **Complexity**: Low
