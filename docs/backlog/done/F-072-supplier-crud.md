# F-072: CRUD de Proveedores

## Overview

Permite al administrador y gerente crear, editar, listar y desactivar proveedores (suppliers) desde la UI. Actualmente la tabla `suppliers` existe en el schema con datos insertados via seed SQL, pero no hay pantalla de administracion. Los proveedores son referenciados en recepciones de compra (F-028) y como preferred_supplier_id en productos. Sin este CRUD, registrar o actualizar proveedores requiere acceso directo a la base de datos.

## User Personas

- **Admin**: Crea, edita y desactiva proveedores. Acceso completo de escritura.
- **Gerente (Manager)**: Crea y edita proveedores. Acceso de escritura.
- **Supervisor**: Consulta la lista de proveedores para referencia en recepciones. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-072-001 | Lista de proveedores con busqueda | S | P0 | Done |
| US-072-002 | Crear y editar proveedor | S | P0 | Done |
| US-072-003 | Desactivar proveedor con validacion | S | P1 | Done |

---

# US-072-001: Lista de proveedores con busqueda

## User Story

**As a** admin o gerente,
**I want** ver una lista de todos los proveedores de mi empresa con busqueda por nombre,
**So that** pueda encontrar rapidamente la informacion de contacto de un proveedor y gestionar el directorio.

## Acceptance Criteria

### Scenario 1: Visualizar lista de proveedores
- **Given** existen 5 proveedores en la empresa: "AgroInsumos SA" (activo), "FertiColombia" (activo), "QuimiAgro" (activo), "SemillasDelValle" (activo), "ViveroPremium" (inactivo)
- **When** el admin navega a /settings/suppliers
- **Then** ve una lista de cards con: nombre, email, telefono, condiciones de pago (si existen), y status badge (activo/inactivo), mostrando solo los 4 activos por defecto

### Scenario 2: Buscar proveedor por nombre
- **Given** existen 5 proveedores activos
- **When** el admin escribe "Ferti" en el campo de busqueda
- **Then** la lista se filtra mostrando solo "FertiColombia" y cualquier otro proveedor cuyo nombre contenga "Ferti"

### Scenario 3: Lista vacia con empty state
- **Given** la empresa no tiene proveedores registrados
- **When** el admin navega a /settings/suppliers
- **Then** ve un empty state con mensaje "No hay proveedores registrados" y CTA "Agregar primer proveedor"

### Scenario 4: Toggle para mostrar inactivos
- **Given** existen 4 proveedores activos y 1 inactivo
- **When** el admin activa el toggle "Mostrar inactivos"
- **Then** el proveedor inactivo aparece en la lista con estilo muted (opacity reducida) y badge "Inactivo"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] Server Action con requireAuth(['admin', 'manager']) para escritura, lectura abierta a roles autenticados
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Server Action**: `getSuppliers(search?)` en `src/lib/actions/suppliers.ts` — query simple con filtro ILIKE para busqueda
- **Query**: `SELECT * FROM suppliers WHERE company_id = $companyId AND (name ILIKE $search OR contact_info->>'email' ILIKE $search) ORDER BY name`
- **RLS**: Tipo A (company_id directo)
- **Ruta**: `/settings/suppliers` — Server Component que llama a `getSuppliers()` + Client Component para lista con busqueda
- **Busqueda**: Client-side filtering para listas pequenas (< 100 proveedores), o server-side si se necesita

## UI/UX Notes
- Cards en grid responsive: 1 col mobile, 2 cols tablet, 3 cols desktop
- Cada card muestra: nombre (bold), email (con icono mail), telefono (con icono phone), condiciones de pago (secondary text), status badge
- Campo de busqueda en la parte superior con icono de lupa
- Boton "Nuevo proveedor" en header, permission-gated a admin y manager
- Toggle "Mostrar inactivos" en la parte superior

## Dependencies
- F-003 (schema de DB con tabla suppliers)
- F-004 (auth y middleware)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-072-002: Crear y editar proveedor

## User Story

**As a** admin o gerente,
**I want** crear nuevos proveedores y editar los existentes con su informacion de contacto completa,
**So that** pueda mantener un directorio actualizado de proveedores para asociarlos a recepciones de compra y productos.

## Acceptance Criteria

### Scenario 1: Crear proveedor con datos completos
- **Given** el admin esta en /settings/suppliers
- **When** hace clic en "Nuevo proveedor" y completa: nombre "AgroInsumos SA", email "ventas@agroinsumos.com", telefono "+57 310 555 1234", direccion "Calle 45 #12-30, Bogota", sitio web "www.agroinsumos.com", condiciones de pago "30 dias neto"
- **Then** el sistema crea el proveedor, muestra toast "Proveedor creado", y el proveedor aparece en la lista

### Scenario 2: Crear proveedor con datos minimos
- **Given** el admin esta creando un nuevo proveedor
- **When** completa solo el nombre "Proveedor Temporal" y deja los demas campos vacios
- **Then** el proveedor se crea correctamente con contact_info vacio y sin payment_terms

### Scenario 3: Editar proveedor existente
- **Given** existe "AgroInsumos SA" con email "ventas@agroinsumos.com"
- **When** el admin cambia el email a "pedidos@agroinsumos.com" y agrega condiciones de pago "60 dias neto"
- **Then** los cambios se guardan, la card se actualiza, y un toast confirma "Proveedor actualizado"

### Scenario 4: Nombre duplicado en la misma empresa
- **Given** ya existe un proveedor con nombre "AgroInsumos SA" en la empresa
- **When** el admin intenta crear otro proveedor con el mismo nombre
- **Then** el sistema muestra error "Ya existe un proveedor con este nombre" y no crea el registro

### Scenario 5: Validacion de formato de email
- **Given** el admin esta creando un nuevo proveedor
- **When** ingresa un email con formato invalido "noesunmail"
- **Then** el sistema muestra error de validacion "Email invalido" en el campo de email

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Formulario funcional en mobile (bottom sheet) y desktop (modal)
- [ ] Accesibilidad: labels, focus trap en modal, contraste AA

## Technical Notes
- **Server Actions**: `createSupplier(data)`, `updateSupplier(id, data)` en `src/lib/actions/suppliers.ts`
- **Zod Schema**: `supplierSchema` en `src/lib/schemas/supplier.ts`
  - name: string min(2) max(200)
  - contact_info: object optional
    - email: string email optional (or empty string)
    - phone: string optional
    - address: string optional
    - website: string url optional (or empty string)
  - payment_terms: string max(200) optional
- **Auth**: `requireAuth(['admin', 'manager'])` en ambas actions
- **RLS**: Tipo A — company_id se auto-popula via trigger o desde auth context
- **Unique constraint**: (company_id, name) — validar en server action antes de insert
- **contact_info JSONB**: Se almacena como objeto JSON con campos estructurados, no texto libre

## UI/UX Notes
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Seccion de contacto con campos individuales: email, telefono, direccion, sitio web
- Campo de condiciones de pago como input de texto libre
- Boton submit: "Crear proveedor" / "Guardar cambios" segun contexto

## Dependencies
- US-072-001 (lista donde aparece el nuevo proveedor)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-072-003: Desactivar proveedor con validacion

## User Story

**As a** admin o gerente,
**I want** poder desactivar un proveedor que ya no se usa, con validacion que me advierta si tiene productos vinculados como proveedor preferido,
**So that** pueda retirar proveedores obsoletos sin perder datos historicos de compras ni afectar referencias activas.

## Acceptance Criteria

### Scenario 1: Desactivar proveedor sin referencias activas
- **Given** "ViveroPremium" no tiene productos con preferred_supplier_id apuntando a el
- **When** el admin hace clic en "Desactivar" y confirma
- **Then** el proveedor se marca is_active=false, desaparece de la lista principal, y aparece solo con el toggle "Mostrar inactivos"

### Scenario 2: Desactivar proveedor con productos vinculados
- **Given** "AgroInsumos SA" es el preferred_supplier_id de 5 productos activos
- **When** el admin intenta desactivar el proveedor
- **Then** el sistema muestra warning "Este proveedor esta asignado como preferido en 5 productos. Desactivar no eliminara la referencia pero el proveedor no aparecera en selectores de nuevas compras." y requiere confirmacion explicita con boton "Desactivar de todas formas"

### Scenario 3: Reactivar proveedor previamente desactivado
- **Given** "ViveroPremium" esta inactivo y visible en la lista con toggle "Mostrar inactivos"
- **When** el admin hace clic en "Reactivar"
- **Then** el proveedor vuelve a is_active=true y aparece en la lista principal

### Scenario 4: Proveedor inactivo no aparece en selectores
- **Given** "ViveroPremium" esta inactivo
- **When** un usuario crea una recepcion de compra o edita un producto y ve el selector de proveedor
- **Then** "ViveroPremium" no aparece como opcion en el dropdown de proveedores

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Soft delete verificado (nunca DELETE fisico)
- [ ] Criterios de aceptacion verificados
- [ ] Validacion de dependencias (productos vinculados) antes de desactivar

## Technical Notes
- **Server Actions**: `deactivateSupplier(id)`, `reactivateSupplier(id)` en `src/lib/actions/suppliers.ts`
- Antes de desactivar: query para contar productos con preferred_supplier_id = supplier.id AND is_active=true
- `deactivateSupplier` solo hace UPDATE is_active=false, no limpia preferred_supplier_id de productos
- Queries de selectores deben filtrar `WHERE is_active = true`

## UI/UX Notes
- Boton "Desactivar" con estilo secondary + clases de error (no existe variant destructive)
- Modal de confirmacion con conteo de productos afectados
- Boton "Reactivar" visible solo en modo "Mostrar inactivos"

## Dependencies
- US-072-001, US-072-002

## Estimation
- **Size**: S
- **Complexity**: Low
