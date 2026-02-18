# F-073: Gestion de Unidades de Medida

## Overview

Permite al administrador gestionar el catalogo de unidades de medida (units_of_measure) desde la UI. Actualmente la tabla existe en el schema con datos de seed, pero no hay pantalla de administracion. Las unidades de medida son fundamentales para todo el sistema: productos, inventario, recetas, actividades y transformaciones dependen de ellas. Este CRUD permite agregar unidades custom, configurar conversiones misma-dimension (kg->g via to_base_factor), y mantener el catalogo organizado por dimension. Es una tabla global (RLS tipo D): lectura abierta a todos los usuarios autenticados, escritura restringida a admin.

## User Personas

- **Admin**: Crea, edita y gestiona unidades de medida. Unico rol con acceso de escritura.
- **Gerente / Supervisor / Operador**: Consulta unidades al crear productos, registrar actividades o hacer recepciones. Solo lectura implicita.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-073-001 | Lista de unidades agrupadas por dimension | S | P0 | Planned |
| US-073-002 | Crear y editar unidad de medida | S | P0 | Planned |
| US-073-003 | Validacion de conversiones misma dimension | S | P1 | Planned |

---

# US-073-001: Lista de unidades agrupadas por dimension

## User Story

**As a** admin,
**I want** ver todas las unidades de medida del sistema agrupadas por dimension (masa, volumen, conteo, etc.),
**So that** pueda entender que unidades estan disponibles, cuales son base, y como se organizan las conversiones.

## Acceptance Criteria

### Scenario 1: Visualizar unidades agrupadas por dimension
- **Given** existen 15 unidades: 4 de masa (g, kg, mg, oz), 4 de volumen (mL, L, gal, fl oz), 3 de conteo (unidad, docena, millar), 2 de area (m2, ha), 1 de energia (kWh), 1 de tiempo (hora)
- **When** el admin navega a /settings/units
- **Then** ve las unidades organizadas en secciones por dimension, cada seccion con header "Masa", "Volumen", "Conteo", etc., y dentro de cada seccion una lista con: code, nombre, unidad base (si aplica), factor de conversion, y badge "Base" para las unidades base

### Scenario 2: Identificar unidades base
- **Given** en la dimension "Masa", "g" (gramo) es la unidad base (base_unit_id=null, to_base_factor=1)
- **When** el admin ve la seccion "Masa"
- **Then** "g" aparece con badge "Base" y las demas unidades muestran su factor relativo: "kg = 1000 g", "mg = 0.001 g", "oz = 28.3495 g"

### Scenario 3: Dimension sin unidades
- **Given** la dimension "concentration" no tiene unidades registradas
- **When** el admin ve la lista completa
- **Then** la seccion "Concentracion" aparece vacia con un mensaje inline "Sin unidades" y boton "Agregar" contextual

### Scenario 4: Lista vacia total con empty state
- **Given** no existen unidades de medida en el sistema (caso extremo post-reset)
- **When** el admin navega a /settings/units
- **Then** ve un empty state con mensaje "No hay unidades de medida configuradas" y CTA "Crear primera unidad"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con lectura abierta a todos los autenticados, escritura admin-only
- [ ] Agrupacion visual por dimension clara y consistente
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getUnitsOfMeasure()` en `src/lib/actions/units.ts` — query simple ORDER BY dimension, code
- **Query**: `SELECT u.*, base.code as base_unit_code, base.name as base_unit_name FROM units_of_measure u LEFT JOIN units_of_measure base ON base.id = u.base_unit_id ORDER BY u.dimension, u.code`
- **RLS**: Tipo D (catalogo global — SELECT para todos los autenticados, INSERT/UPDATE solo admin)
- **Ruta**: `/settings/units` — Server Component que llama a `getUnitsOfMeasure()` + Client Component para lista agrupada
- **Grouping**: Client-side groupBy dimension despues de fetch

## UI/UX Notes
- Lista agrupada por dimension con headers de seccion sticky o coloreados
- Cada unidad muestra: code (bold mono font), nombre, factor de conversion formateado ("= 1000 g"), badge "Base" si es unidad base
- Boton "Nueva unidad" en header, permission-gated a admin
- Layout: tabla o lista compacta (no cards — las unidades son datos tabulares)
- Usar DM Mono para codes y factores numericos

## Dependencies
- F-003 (schema de DB con tabla units_of_measure)
- F-004 (auth y middleware)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-073-002: Crear y editar unidad de medida

## User Story

**As a** admin,
**I want** crear nuevas unidades de medida y editar las existentes con su dimension y factor de conversion,
**So that** pueda extender el catalogo cuando se necesiten unidades especificas (ej: libras, galones, ppm) sin modificar la base de datos directamente.

## Acceptance Criteria

### Scenario 1: Crear unidad base de nueva dimension
- **Given** el admin esta en /settings/units y la dimension "concentration" no tiene unidades
- **When** crea una nueva unidad: code "ppm", nombre "Partes por millon", dimension "concentration", sin unidad base, factor 1
- **Then** la unidad se crea como unidad base de su dimension (base_unit_id=null, to_base_factor=1), y aparece en la seccion "Concentracion" con badge "Base"

### Scenario 2: Crear unidad derivada con factor de conversion
- **Given** existe "g" como unidad base de masa
- **When** el admin crea: code "lb", nombre "Libra", dimension "mass", unidad base "g", factor 453.592
- **Then** la unidad se crea con base_unit_id=g.id y to_base_factor=453.592, y aparece en la seccion "Masa" mostrando "= 453.592 g"

### Scenario 3: Editar unidad existente
- **Given** existe "oz" con to_base_factor=28.3495
- **When** el admin actualiza el nombre a "Onza (avoirdupois)" y el factor a 28.35
- **Then** los cambios se guardan y un toast confirma "Unidad actualizada"

### Scenario 4: Code duplicado
- **Given** ya existe una unidad con code "kg"
- **When** el admin intenta crear otra unidad con code "kg"
- **Then** el sistema muestra error "Ya existe una unidad con este codigo" y no crea el registro

### Scenario 5: Validacion de campos obligatorios
- **Given** el admin abre el formulario de nueva unidad
- **When** intenta guardar sin completar code, nombre o dimension
- **Then** el sistema muestra errores de validacion inline en cada campo faltante

### Scenario 6: No se puede editar code de unidad en uso
- **Given** "kg" esta referenciada por 10 productos como default_unit_id
- **When** el admin intenta cambiar el code de "kg" a "KG"
- **Then** el sistema permite el cambio (code es display-only, el ID es UUID), o alternativamente muestra advertencia si el code se usa como referencia en exports

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createUnit(data)`, `updateUnit(id, data)` en `src/lib/actions/units.ts`
- **Zod Schema**: `unitSchema` en `src/lib/schemas/unit.ts`
  - code: string min(1) max(20) uppercase/lowercase flexible
  - name: string min(2) max(100)
  - dimension: enum (mass, volume, count, area, energy, time, concentration)
  - base_unit_id: uuid optional (null = esta ES la unidad base)
  - to_base_factor: number positive (default 1 para unidades base)
- **Auth**: `requireAuth(['admin'])` en ambas actions
- **RLS**: Tipo D — catalogo global, escritura solo admin
- **Unique constraint**: code es UNIQUE global — validar en server action
- **base_unit_id validation**: Si se proporciona, debe existir y pertenecer a la misma dimension

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Select de dimension con opciones descriptivas: "Masa (kg, g, lb)", "Volumen (L, mL, gal)", etc.
- Select de unidad base filtrado por la dimension seleccionada (solo muestra unidades de esa dimension)
- to_base_factor: input numerico con placeholder "1 para unidad base, 1000 para kg->g"
- Boton submit: "Crear unidad" / "Guardar cambios" segun contexto

## Dependencies
- US-073-001 (lista donde aparece la nueva unidad)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-073-003: Validacion de conversiones misma dimension

## User Story

**As a** admin,
**I want** que el sistema valide la coherencia de las conversiones dentro de una misma dimension,
**So that** las conversiones automaticas entre unidades sean correctas y no haya errores de calculo en inventario, recetas o transformaciones.

## Acceptance Criteria

### Scenario 1: Conversion correcta entre unidades de la misma dimension
- **Given** existen: g (base, factor=1), kg (factor=1000), mg (factor=0.001)
- **When** el admin ve el detalle de "kg"
- **Then** ve la conversion explicita: "1 kg = 1000 g" y puede verificar que es correcta

### Scenario 2: No se permite asignar unidad base de otra dimension
- **Given** el admin esta creando una unidad de dimension "mass"
- **When** selecciona como unidad base "mL" que pertenece a dimension "volume"
- **Then** el sistema muestra error "La unidad base debe pertenecer a la misma dimension (mass)" y no permite guardar

### Scenario 3: Advertencia al crear unidad sin base en dimension que ya tiene una
- **Given** la dimension "mass" ya tiene "g" como unidad base (base_unit_id=null)
- **When** el admin crea una nueva unidad "t" (tonelada) en dimension "mass" sin asignar unidad base y con factor=1
- **Then** el sistema muestra advertencia "La dimension Masa ya tiene una unidad base (g). Se recomienda asignar 'g' como unidad base y definir el factor de conversion (1000000 para tonelada)." y permite guardar de todas formas si el admin confirma

### Scenario 4: Preview de conversion al ingresar factor
- **Given** el admin esta creando "lb" con unidad base "g" en dimension "mass"
- **When** ingresa to_base_factor=453.592
- **Then** el formulario muestra preview en tiempo real: "1 lb = 453.592 g" y "1 g = 0.002205 lb"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion cross-dimension implementada en server action
- [ ] Criterios de aceptacion verificados
- [ ] Preview de conversion funcional en el formulario

## Technical Notes
- **Validacion server-side**: En `createUnit` y `updateUnit`, verificar que base_unit_id.dimension === data.dimension
- **Advertencia multiple bases**: Query `WHERE dimension = $dim AND base_unit_id IS NULL` — si count > 0 y nueva unidad tambien tiene base_unit_id=null, retornar warning (no error)
- **Preview client-side**: Calculo simple en el formulario: `1 ${code} = ${factor} ${baseCode}` y `1 ${baseCode} = ${1/factor} ${code}`
- **No cascade**: Cambiar factor de conversion NO recalcula inventario existente — las transacciones ya registradas guardan su unidad y cantidad original

## UI/UX Notes
- Preview de conversion debajo del campo to_base_factor, actualizado en tiempo real
- Mensaje de advertencia en amber/warning si hay inconsistencia de bases
- Error en rojo si se selecciona base de otra dimension (bloquea submit)

## Dependencies
- US-073-002 (formulario donde se aplican las validaciones)

## Estimation
- **Size**: S
- **Complexity**: Medium
