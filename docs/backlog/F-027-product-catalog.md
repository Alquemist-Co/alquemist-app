# F-027: Catalogo de Productos (CRUD)

## Overview

Gestion completa del catalogo maestro de productos: insumos comprados, productos producidos y ambos. Incluye lista con filtros por categoria y tipo, busqueda por SKU/nombre, y editor con todos los campos del producto (SKU, nombre, categoria jerarquica, unidad, tipo, lot_tracking, shelf_life, precio, proveedor). Es la base de datos de referencia para inventario, recetas y transformaciones.

## User Personas

- **Admin**: Crea y edita productos del catalogo, configura categorias y proveedores.
- **Gerente**: Crea y edita productos, revisa precios y proveedores preferidos.
- **Supervisor**: Consulta el catalogo para verificar SKUs y propiedades de productos.
- **Operador**: Consulta productos disponibles (read-only) al ejecutar actividades.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-027-001 | Lista de productos con filtros y busqueda | M | P0 | Planned |
| US-027-002 | Crear producto nuevo | M | P0 | Planned |
| US-027-003 | Editar producto existente | S | P0 | Planned |
| US-027-004 | Desactivar producto (soft delete) | S | P1 | Planned |

---

# US-027-001: Lista de productos con filtros y busqueda

## User Story

**As a** gerente,
**I want** ver una lista de todos los productos del catalogo con filtros por categoria y tipo, y busqueda por SKU o nombre,
**So that** pueda encontrar rapidamente cualquier producto y revisar sus propiedades.

## Acceptance Criteria

### Scenario 1: Visualizacion completa de productos
- **Given** existen 50 productos activos en el catalogo
- **When** el gerente accede a la pantalla inv-products
- **Then** se muestra una tabla con columnas: SKU, nombre, categoria, unidad, tipo (purchased/produced/both), precio, proveedor
- **And** los productos se ordenan alfabeticamente por nombre

### Scenario 2: Filtrar por categoria y tipo
- **Given** la lista de productos esta visible
- **When** el gerente selecciona filtro categoria = "Nutrientes" y tipo = "purchased"
- **Then** solo se muestran productos que pertenezcan a la categoria "Nutrientes" (o subcategorias) y sean de tipo purchased
- **And** los filtros se muestran como chips removibles

### Scenario 3: Busqueda por SKU o nombre
- **Given** existe un producto con SKU "CANO3-25KG" y nombre "Nitrato de Calcio 25kg"
- **When** el gerente escribe "nitrato" en el search bar
- **Then** se filtra la lista mostrando productos que contengan "nitrato" en nombre o SKU
- **And** la busqueda es case-insensitive

### Scenario 4: Catalogo vacio
- **Given** no existen productos en el catalogo
- **When** el gerente accede a inv-products
- **Then** se muestra empty state con mensaje "No hay productos en el catalogo" y CTA "Crear primer producto"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility: tabla navegable por teclado
- [ ] Virtual scrolling para > 50 productos

## Technical Notes
- Pantalla: `inv-products`
- Query: `products` JOIN `resource_categories`, `units_of_measure`, `suppliers`
- Filtros: `resource_categories.id` (con jerarquia parent_id), `products.procurement_type`
- Server Component para data fetching con RLS (products filtrados por company via category o global)
- Zustand para estado de filtros

## UI/UX Notes
- Desktop: tabla completa. Mobile: cards con info esencial
- SKU en DM Mono, precio en DM Mono con moneda
- Chips removibles para filtros activos
- Tap en producto -> navega a editor (gerente/admin) o detalle read-only (otros roles)

## Dependencies
- Tablas `products`, `resource_categories`, `units_of_measure`, `suppliers` deben existir

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-027-002: Crear producto nuevo

## User Story

**As a** admin,
**I want** crear un nuevo producto en el catalogo con todos sus campos (SKU, nombre, categoria, unidad, tipo, lot_tracking, shelf_life, precio, proveedor),
**So that** el producto este disponible para recepciones de compra, recetas y transformaciones.

## Acceptance Criteria

### Scenario 1: Creacion exitosa de producto
- **Given** el admin esta en la pantalla inv-products y hace tap en "Nuevo Producto"
- **When** completa el formulario con SKU="FERT-NPK-1KG", nombre="Fertilizante NPK 1kg", categoria="Nutrientes > Sales", unidad="kg", tipo="purchased", lot_tracking="optional", shelf_life=365, precio=15000, proveedor="AgroInsumos SAS"
- **Then** el producto se crea exitosamente con todos los campos
- **And** aparece en la lista de productos con toast de confirmacion "Producto creado"
- **And** se ejecuta revalidatePath('/inventory/products')

### Scenario 2: SKU duplicado
- **Given** ya existe un producto con SKU "FERT-NPK-1KG"
- **When** el admin intenta crear otro producto con el mismo SKU
- **Then** se muestra error de validacion inline "Este SKU ya existe" en el campo SKU
- **And** el formulario no se envia

### Scenario 3: Campos obligatorios incompletos
- **Given** el admin abre el formulario de nuevo producto
- **When** intenta guardar sin completar SKU, nombre, categoria o unidad
- **Then** se muestran errores de validacion inline en cada campo requerido
- **And** el boton "Guardar" permanece disabled hasta que se corrijan

### Scenario 4: Categoria jerarquica
- **Given** existen categorias: Nutrientes > Sales > Calcio
- **When** el admin selecciona la categoria para el producto
- **Then** se muestra un selector jerarquico (padre > hijo > nieto)
- **And** puede seleccionar cualquier nivel de la jerarquia

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Zod schema validation funcional client y server
- [ ] Acceptance criteria verified
- [ ] Accessibility: labels en todos los inputs, focus management

## Technical Notes
- Server Action: `createProduct(input)` en `lib/actions/inventory.actions.ts`
- Zod schema: `createProductSchema` validando SKU unico, campos requeridos, shelf_life positivo
- React Hook Form + Zod resolver para validacion client-side
- Categoria jerarquica: query `resource_categories` con `parent_id` para construir arbol
- RLS: producto se asocia al company via category o directamente

## UI/UX Notes
- Form en pagina completa (mobile) o modal/panel lateral (desktop)
- Categoria: selector jerarquico con breadcrumb de seleccion
- Tipo: radio buttons con descripcion (purchased/produced/both)
- lot_tracking: radio buttons (required/optional/none)
- shelf_life: input numerico con suffix "dias"
- Proveedor: dropdown con search integrado

## Dependencies
- Tablas base: `resource_categories`, `units_of_measure`, `suppliers`
- Configuracion de empresa (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-027-003: Editar producto existente

## User Story

**As a** gerente,
**I want** editar los campos de un producto existente en el catalogo,
**So that** pueda actualizar precios, proveedores, shelf_life u otras propiedades sin crear un producto nuevo.

## Acceptance Criteria

### Scenario 1: Edicion exitosa
- **Given** existe el producto "Fertilizante NPK 1kg" con precio 15000
- **When** el gerente cambia el precio a 16500 y el proveedor a "NutriAgro"
- **Then** el producto se actualiza exitosamente con los nuevos valores
- **And** se muestra toast "Producto actualizado"
- **And** el updated_at y updated_by se actualizan

### Scenario 2: Cambiar SKU a uno existente
- **Given** existen productos con SKU "FERT-NPK-1KG" y "FERT-NPK-5KG"
- **When** el gerente edita el segundo y cambia su SKU a "FERT-NPK-1KG"
- **Then** se muestra error "Este SKU ya existe" y no se guarda el cambio

### Scenario 3: Edicion con inventory_items vinculados
- **Given** el producto tiene 3 inventory_items activos
- **When** el gerente cambia la unidad del producto
- **Then** se muestra warning "Este producto tiene 3 lotes en inventario. Cambiar la unidad no afecta lotes existentes."
- **And** permite continuar con la edicion

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Server Action con validacion de permisos (manager, admin)

## Technical Notes
- Server Action: `updateProduct(productId, input)` en `lib/actions/inventory.actions.ts`
- Zod schema: `updateProductSchema` (partial de createProductSchema con id requerido)
- Validar permisos: solo manager y admin pueden editar
- Reutilizar formulario de creacion con modo edicion

## UI/UX Notes
- Mismo formulario que creacion, pre-llenado con datos actuales
- Boton "Guardar cambios" solo activo si hay modificaciones (dirty form detection)

## Dependencies
- US-027-002 (Crear producto) para reutilizar formulario

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-027-004: Desactivar producto (soft delete)

## User Story

**As a** admin,
**I want** desactivar un producto del catalogo que ya no se utiliza,
**So that** no aparezca en selectores de recepcion, recetas ni actividades, pero mantenga su historial de transacciones.

## Acceptance Criteria

### Scenario 1: Desactivacion exitosa
- **Given** el producto "Insecticida Viejo" no tiene inventory_items con stock > 0
- **When** el admin hace tap en "Desactivar" y confirma
- **Then** el producto se marca como is_active=false
- **And** desaparece de la lista principal (filtro por defecto: activos)
- **And** no aparece en selectores de otros modulos

### Scenario 2: Desactivar producto con stock
- **Given** el producto tiene inventory_items con quantity_available > 0
- **When** el admin intenta desactivar
- **Then** se muestra warning "Este producto tiene X unidades en stock. Desactivar no eliminara el inventario existente. Continuar?"
- **And** requiere confirmacion explicita

### Scenario 3: Ver productos desactivados
- **Given** existen 5 productos desactivados
- **When** el admin activa el filtro "Mostrar inactivos"
- **Then** los productos inactivos aparecen en la lista con badge "Inactivo" y estilo muted
- **And** se pueden reactivar con accion "Reactivar"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Soft delete no borra datos historicos

## Technical Notes
- Server Action: `deactivateProduct(productId)` y `reactivateProduct(productId)`
- UPDATE products SET is_active = false WHERE id = :id
- Todos los queries de selectores filtran por is_active = true
- Solo admin puede desactivar/reactivar
- No DELETE fisico, solo soft delete

## UI/UX Notes
- Confirmacion via modal con texto explicativo
- Badge "Inactivo" en gris sobre productos desactivados
- Toggle "Mostrar inactivos" en area de filtros

## Dependencies
- US-027-001 (Lista de productos)

## Estimation
- **Size**: S
- **Complexity**: Low
