# F-074: Gestion de Categorias de Recursos

## Overview

Permite al administrador gestionar el catalogo jerarquico de categorias de recursos (resource_categories) desde la UI. Actualmente la tabla existe en el schema con datos de seed (~11 categorias base), pero no hay pantalla de administracion. Las categorias determinan el comportamiento de los productos: si son consumibles, depreciables o transformables, y su politica de tracking de lotes. Son usadas extensivamente por el modulo de inventario, recetas y transformaciones. Este CRUD permite crear sub-categorias (jerarquia parent->child->grandchild), configurar flags de comportamiento, y mantener el arbol organizado. Es una tabla global (RLS tipo D): lectura abierta a todos, escritura restringida a admin.

## User Personas

- **Admin**: Crea, edita y desactiva categorias. Unico rol con acceso de escritura.
- **Gerente / Supervisor**: Consulta categorias al crear productos o analizar inventario. Solo lectura implicita.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-074-001 | Lista jerarquica de categorias | S | P0 | Done |
| US-074-002 | Crear y editar categoria con selector de padre | M | P0 | Done |
| US-074-003 | Desactivar categoria con validacion de productos | S | P1 | Done |

---

# US-074-001: Lista jerarquica de categorias

## User Story

**As a** admin,
**I want** ver todas las categorias de recursos organizadas en su jerarquia natural (padre -> hijo -> nieto),
**So that** pueda entender la estructura del catalogo, identificar categorias faltantes y navegar a la edicion de cada una.

## Acceptance Criteria

### Scenario 1: Visualizar arbol de categorias
- **Given** existen categorias: "Nutrientes" (root) -> "Sales minerales" -> "Calcio", "Magnesio"; "Material vegetal" (root) -> "Semillas", "Esquejes"; "Equipos" (root) -> "Iluminacion", "Riego"
- **When** el admin navega a /settings/categories
- **Then** ve un arbol indentado o lista jerarquica con: nombre, code (mono), icono, color badge, flags (consumible/depreciable/transformable como badges), lot_tracking (badge), count de productos asociados, y status

### Scenario 2: Expandir y colapsar ramas del arbol
- **Given** "Nutrientes" tiene 5 sub-categorias que a su vez tienen 3 sub-sub-categorias
- **When** el admin hace clic en el indicador de expansion de "Nutrientes"
- **Then** las sub-categorias se muestran indentadas debajo, con sus propias sub-categorias colapsadas

### Scenario 3: Categorias sin hijos
- **Given** "Semillas" es una categoria hoja (sin sub-categorias)
- **When** el admin ve la lista
- **Then** "Semillas" aparece sin indicador de expansion y con su conteo de productos directos

### Scenario 4: Lista vacia con empty state
- **Given** no existen categorias en el sistema
- **When** el admin navega a /settings/categories
- **Then** ve un empty state con mensaje "No hay categorias configuradas" y CTA "Crear primera categoria"

### Scenario 5: Mostrar categorias inactivas
- **Given** existen 10 categorias activas y 2 inactivas
- **When** el admin activa el toggle "Mostrar inactivas"
- **Then** las categorias inactivas aparecen en el arbol con estilo muted (opacity reducida) y badge "Inactiva"

### Scenario 6: Conteo de productos por categoria
- **Given** "Sales minerales" tiene 3 productos directos y sus sub-categorias "Calcio" y "Magnesio" tienen 2 y 1 productos respectivamente
- **When** el admin ve "Sales minerales"
- **Then** muestra "3 productos" como conteo directo (no incluye hijos para evitar confusion)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Jerarquia correctamente renderizada con indentacion visual clara
- [ ] Server Action con lectura abierta a todos los autenticados, escritura admin-only
- [ ] Accesibilidad: tree role, aria-expanded, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getResourceCategories()` en `src/lib/actions/resource-categories.ts` — query con LEFT JOIN a products para conteo
- **Query**: `SELECT rc.*, COUNT(p.id) as product_count FROM resource_categories rc LEFT JOIN products p ON p.category_id = rc.id AND p.is_active = true GROUP BY rc.id ORDER BY rc.parent_id NULLS FIRST, rc.name`
- **RLS**: Tipo D (catalogo global — SELECT para todos los autenticados, INSERT/UPDATE solo admin)
- **Ruta**: `/settings/categories` — Server Component que llama a `getResourceCategories()` + Client Component para arbol
- **Tree building**: Client-side: convertir flat list a tree usando parent_id, recursivo. Root nodes tienen parent_id=null
- **Max depth**: Limitar a 3 niveles en la UI para mantener usabilidad (root -> child -> grandchild)

## UI/UX Notes
- Lista indentada (tree view) con chevron para expandir/colapsar ramas
- Cada nodo muestra: icono (si existe), nombre (bold), code (mono, secondary), badges de flags (Consumible/Depreciable/Transformable), lot_tracking badge, product count
- Indentacion: 24px por nivel (ml-6)
- Color badge: small circle con el color de la categoria al lado del nombre
- Boton "Nueva categoria" en header, permission-gated a admin
- Toggle "Mostrar inactivas" en la parte superior

## Dependencies
- F-003 (schema de DB con tabla resource_categories)
- F-004 (auth y middleware)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-074-002: Crear y editar categoria con selector de padre

## User Story

**As a** admin,
**I want** crear nuevas categorias y editar las existentes con su jerarquia y flags de comportamiento,
**So that** pueda organizar el catalogo de recursos con la granularidad necesaria para mi operacion, configurando correctamente si son consumibles, depreciables o transformables.

## Acceptance Criteria

### Scenario 1: Crear categoria raiz (sin padre)
- **Given** el admin esta en /settings/categories
- **When** hace clic en "Nueva categoria" y completa: nombre "Sustratos", code "SUST", sin categoria padre, consumible=true, depreciable=false, transformable=false, lot_tracking="optional"
- **Then** la categoria se crea como raiz (parent_id=null), muestra toast "Categoria creada", y aparece en el nivel superior del arbol

### Scenario 2: Crear sub-categoria con padre
- **Given** existe la categoria raiz "Nutrientes"
- **When** el admin crea: nombre "Micronutrientes", code "MICRO", padre "Nutrientes", consumible=true, depreciable=false, transformable=false, lot_tracking="required"
- **Then** la categoria se crea con parent_id=Nutrientes.id y aparece indentada debajo de "Nutrientes" en el arbol

### Scenario 3: Editar categoria existente
- **Given** existe "Sales minerales" con lot_tracking="optional"
- **When** el admin cambia lot_tracking a "required" y agrega icono "flask"
- **Then** los cambios se guardan, el arbol se actualiza, y un toast confirma "Categoria actualizada"

### Scenario 4: Nombre duplicado al mismo nivel
- **Given** "Nutrientes" tiene sub-categorias "Sales minerales" y "Acidos"
- **When** el admin intenta crear otra sub-categoria de "Nutrientes" con nombre "Sales minerales"
- **Then** el sistema muestra error "Ya existe una categoria con este nombre bajo el mismo padre" y no crea el registro

### Scenario 5: No se permite asignar como padre a si misma o a un descendiente
- **Given** existe "Nutrientes" -> "Sales minerales" -> "Calcio"
- **When** el admin intenta mover "Nutrientes" para que sea hijo de "Calcio" (su nieto)
- **Then** el sistema muestra error "No se puede crear una referencia circular en la jerarquia" y no permite el cambio

### Scenario 6: Validacion de campos obligatorios
- **Given** el admin abre el formulario de nueva categoria
- **When** intenta guardar sin completar nombre o code
- **Then** el sistema muestra errores de validacion inline en cada campo faltante

### Scenario 7: Code duplicado global
- **Given** ya existe una categoria con code "NUT"
- **When** el admin intenta crear otra categoria con code "NUT"
- **Then** el sistema muestra error "Ya existe una categoria con este codigo" y no crea el registro

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Selector de padre con arbol visual o lista indentada
- [ ] Validacion de ciclos en jerarquia implementada server-side
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createCategory(data)`, `updateCategory(id, data)` en `src/lib/actions/resource-categories.ts`
- **Zod Schema**: `categorySchema` en `src/lib/schemas/resource-category.ts`
  - name: string min(2) max(100)
  - code: string min(2) max(20) uppercase
  - parent_id: uuid optional (null = categoria raiz)
  - icon: string optional (nombre de icono Lucide)
  - color: string optional (hex color)
  - is_consumable: boolean default false
  - is_depreciable: boolean default false
  - is_transformable: boolean default false
  - default_lot_tracking: enum (required, optional, none) default "none"
- **Auth**: `requireAuth(['admin'])` en ambas actions
- **RLS**: Tipo D — catalogo global, escritura solo admin
- **Cycle detection**: Al asignar parent_id, recorrer la cadena de padres hasta la raiz verificando que el id de la categoria no aparezca (CTE recursiva o loop en server action)
- **Unique constraints**: code UNIQUE global, (parent_id, name) — validar en server action

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Selector de padre como select nativo con opciones indentadas: "Nutrientes", "  Sales minerales", "    Calcio" (usando text-indent o prefijo con guiones)
- Opcion "Sin padre (categoria raiz)" como primera opcion del select
- Toggle group para flags: Consumible, Depreciable, Transformable (usando Toggle component existente)
- Select para lot_tracking: Requerido, Opcional, Ninguno
- Campos opcionales de icono (input text con nombre de icono Lucide) y color (input color o hex)
- Boton submit: "Crear categoria" / "Guardar cambios" segun contexto

## Dependencies
- US-074-001 (arbol donde aparece la nueva categoria)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-074-003: Desactivar categoria con validacion de productos

## User Story

**As a** admin,
**I want** poder desactivar una categoria que ya no se usa, con validacion que me advierta si tiene productos activos vinculados o sub-categorias activas,
**So that** pueda retirar categorias obsoletas sin perder datos historicos ni dejar productos huerfanos de categoria.

## Acceptance Criteria

### Scenario 1: Desactivar categoria hoja sin productos
- **Given** "Micronutrientes" es una categoria sin sub-categorias y con 0 productos activos vinculados
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** la categoria se marca is_active=false, desaparece del arbol principal, y aparece solo con el toggle "Mostrar inactivas"

### Scenario 2: Desactivar categoria con productos activos
- **Given** "Sales minerales" tiene 5 productos activos con category_id apuntando a ella
- **When** el admin intenta desactivar la categoria
- **Then** el sistema muestra error "Esta categoria tiene 5 productos activos. Reasigne los productos a otra categoria antes de desactivar." y no permite la desactivacion

### Scenario 3: Desactivar categoria con sub-categorias activas
- **Given** "Nutrientes" tiene 3 sub-categorias activas
- **When** el admin intenta desactivar "Nutrientes"
- **Then** el sistema muestra error "Esta categoria tiene 3 sub-categorias activas. Desactive o reasigne las sub-categorias antes de desactivar la categoria padre." y no permite la desactivacion

### Scenario 4: Desactivar categoria con sub-categorias y productos ya inactivos
- **Given** "Equipos obsoletos" tiene 2 sub-categorias inactivas y 0 productos activos
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** la categoria se desactiva exitosamente

### Scenario 5: Reactivar categoria previamente desactivada
- **Given** "Micronutrientes" esta inactiva y visible con toggle "Mostrar inactivas"
- **When** el admin hace clic en "Reactivar"
- **Then** la categoria vuelve a is_active=true y aparece en el arbol principal. Si su padre esta inactivo, el sistema muestra warning "La categoria padre 'Nutrientes' esta inactiva. Considere reactivarla tambien."

### Scenario 6: Categoria inactiva no aparece en selectores de producto
- **Given** "Micronutrientes" esta inactiva
- **When** un admin crea o edita un producto y ve el selector de categoria
- **Then** "Micronutrientes" no aparece como opcion en el dropdown de categorias

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion de dependencias (productos activos, sub-categorias activas) bloquea desactivacion
- [ ] Warning de padre inactivo al reactivar implementado

## Technical Notes
- **Server Actions**: `deactivateCategory(id)`, `reactivateCategory(id)` en `src/lib/actions/resource-categories.ts`
- **Validacion pre-deactivate**:
  1. Query productos activos: `SELECT COUNT(*) FROM products WHERE category_id = $id AND is_active = true`
  2. Query sub-categorias activas: `SELECT COUNT(*) FROM resource_categories WHERE parent_id = $id AND is_active = true`
  3. Si cualquiera > 0, retornar error con conteo (no warning — es bloqueante)
- **Reactivar**: UPDATE is_active=true + query padre para warning si esta inactivo
- Queries de selectores deben filtrar `WHERE is_active = true`

## UI/UX Notes
- Boton "Desactivar" con estilo secondary + clases de error (no existe variant destructive)
- Modal de error (no warning) cuando hay productos o sub-categorias activas — con lista de dependencias
- Boton "Reactivar" visible solo en modo "Mostrar inactivas"
- Warning amber al reactivar si el padre esta inactivo, con link a la categoria padre

## Dependencies
- US-074-001, US-074-002

## Estimation
- **Size**: S
- **Complexity**: Medium
