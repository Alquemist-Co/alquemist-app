# F-026: Stock Actual (Vista por Producto y por Zona)

## Overview

Vista consolidada del inventario en tiempo real con dos perspectivas: por producto (SKU con cantidades disponibles, reservadas y comprometidas) y por zona (que hay en cada ubicacion). Incluye indicadores de stock bajo minimo y detalle de producto con lotes y grafico de movimientos de los ultimos 30 dias. Es la pantalla principal del modulo de inventario y la referencia operativa para supervisores y gerentes.

## User Personas

- **Supervisor**: Revisa stock de sus zonas asignadas para planificar actividades y detectar faltantes antes de que afecten la produccion.
- **Gerente**: Analiza inventario global para tomar decisiones de compra, detectar tendencias de consumo y controlar costos.
- **Operador**: Consulta disponibilidad de insumos en su zona antes de ejecutar actividades.
- **Viewer**: Consulta niveles de stock de forma read-only para reportes e informes.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-026-001 | Vista de stock por producto | M | P0 | Planned |
| US-026-002 | Vista de stock por zona | M | P0 | Planned |
| US-026-003 | Detalle de producto con lotes | M | P1 | Planned |
| US-026-004 | Grafico de movimiento de stock (30 dias) | S | P1 | Planned |
| US-026-005 | Indicador de stock bajo minimo | S | P0 | Planned |

---

# US-026-001: Vista de stock por producto

## User Story

**As a** supervisor,
**I want** ver una tabla/cards con todos los productos del inventario mostrando SKU, cantidad disponible, reservado, comprometido y unidad,
**So that** pueda conocer de un vistazo el estado actual del inventario y detectar faltantes.

## Acceptance Criteria

### Scenario 1: Visualizacion correcta de stock por producto
- **Given** existen 15 productos con inventory_items en el sistema
- **When** el supervisor accede a la pantalla inv-stock
- **Then** se muestra una tabla/cards con cada producto listando SKU (DM Mono), nombre, categoria (icon), cantidad disponible (bold), reservado (naranja), comprometido (rojo), total, y unidad (DM Mono)
- **And** los datos se obtienen agregando inventory_items GROUP BY product_id

### Scenario 2: Ordenamiento y busqueda de productos
- **Given** la vista de stock por producto esta visible con 50+ productos
- **When** el supervisor ordena por stock ascendente y busca "fertilizante" en el search bar
- **Then** los resultados se filtran mostrando solo productos que contengan "fertilizante" en nombre o SKU
- **And** estan ordenados por cantidad disponible de menor a mayor

### Scenario 3: Inventario vacio
- **Given** no existen inventory_items en el sistema
- **When** el supervisor accede a la pantalla inv-stock
- **Then** se muestra un empty state con ilustracion, mensaje "No hay productos en inventario" y CTA "Recibir primera compra" que navega a inv-receive

### Scenario 4: Filtro por categoria
- **Given** existen productos en categorias "nutrientes", "sustratos" y "EPP"
- **When** el supervisor selecciona el filtro de categoria "nutrientes"
- **Then** solo se muestran productos de la categoria nutrientes y sus subcategorias

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met (touch targets 44px, contraste AA)
- [ ] Performance: tabla renderiza < 500ms con 200 productos
- [ ] Virtual scrolling implementado para listas > 50 items

## Technical Notes
- Pantalla: `inv-stock`
- Query: `inventory_items` GROUP BY `product_id` con JOINs a `products`, `resource_categories`
- Campos calculados: `quantity_available`, `quantity_reserved`, `quantity_committed` sumados desde `inventory_items`
- Server Component para data fetching inicial con RLS por company_id
- Zustand store para filtros activos (categoria, ordenamiento, busqueda)
- Virtual scrolling con TanStack Virtual para listas largas

## UI/UX Notes
- Mobile: cards full-width en columna unica. Desktop: tabla con columnas alineadas
- SKU y cantidades en DM Mono. Nombres en DM Sans
- Indicador visual de cantidad: bold para disponible, naranja para reservado, rojo para comprometido
- Ordenable por: nombre, stock disponible, categoria
- Search bar con busqueda por SKU y nombre

## Dependencies
- F-027 (Catalogo de productos) para que existan productos
- F-028 (Recepcion de compras) para que existan inventory_items

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-026-002: Vista de stock por zona

## User Story

**As a** supervisor,
**I want** ver una agrupacion alternativa del inventario por zona de almacenamiento,
**So that** pueda saber exactamente que insumos y productos hay en cada zona que gestiono.

## Acceptance Criteria

### Scenario 1: Visualizacion de stock agrupado por zona
- **Given** existen inventory_items distribuidos en 5 zonas
- **When** el supervisor cambia a la vista "Por Zona" en inv-stock
- **Then** se muestra una lista de zonas, cada una como seccion expandible con sus productos, cantidades y unidades
- **And** las zonas se ordenan por nombre y muestran un badge con total de productos distintos

### Scenario 2: Zona sin inventario
- **Given** la zona "Sala Vegetativo B" no tiene inventory_items con quantity_available > 0
- **When** el supervisor revisa la vista por zona
- **Then** la zona aparece con un indicador "Sin stock" y colapsada por defecto

### Scenario 3: Toggle entre vistas
- **Given** el supervisor esta en la vista por producto
- **When** toca el toggle de vista (icono grid/lista)
- **Then** la vista cambia a agrupacion por zona manteniendo el estado de busqueda activo
- **And** el toggle mantiene el estado seleccionado via Zustand

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `inventory_items` GROUP BY `zone_id` con JOINs a `zones`, `products`
- Reutilizar la misma ruta `inv-stock` con toggle de vista
- Zustand store para persistir el modo de vista seleccionado
- Server Component con RLS: zonas filtradas por facility del usuario

## UI/UX Notes
- Secciones expandibles/colapsables por zona con header sticky
- Badge de conteo de productos por zona
- Mobile: acordeon vertical. Desktop: cards por zona en grid 2-3 columnas

## Dependencies
- US-026-001 (Vista por producto) como base compartida
- Zonas configuradas en el modulo de Areas (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-026-003: Detalle de producto con lotes

## User Story

**As a** gerente,
**I want** ver al hacer tap en un producto su detalle con todos los lotes (inventory_items) individuales,
**So that** pueda evaluar la procedencia, costos, fechas de vencimiento y estado de cada lote para tomar decisiones de uso o reorden.

## Acceptance Criteria

### Scenario 1: Ver lotes de un producto
- **Given** el producto "Ca(NO3)2 25kg" tiene 3 inventory_items (lotes) activos
- **When** el gerente hace tap en el producto desde la vista de stock
- **Then** se muestra la lista de lotes con: batch_number, supplier_lot_number, quantity_available, expiration_date, cost_per_unit, lot_status (badge), zona de almacenamiento
- **And** los lotes se ordenan por expiration_date ascendente (FIFO)

### Scenario 2: Lote proximo a vencer
- **Given** un lote tiene expiration_date dentro de los proximos 7 dias
- **When** el gerente ve la lista de lotes
- **Then** el lote se muestra con badge "Vence pronto" en color warning y borde naranja

### Scenario 3: Lote agotado
- **Given** un lote tiene quantity_available = 0 y lot_status = 'depleted'
- **When** el gerente ve la lista de lotes
- **Then** el lote se muestra al final de la lista en estilo muted con badge "Agotado"
- **And** se puede ocultar con toggle "Mostrar agotados"

### Scenario 4: Producto sin lotes
- **Given** un producto existe en el catalogo pero no tiene inventory_items
- **When** el gerente accede al detalle del producto
- **Then** se muestra empty state "Sin lotes registrados" con CTA "Recibir compra"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Documentation updated

## Technical Notes
- Query: `inventory_items WHERE product_id = :id` con JOINs a `zones`, `suppliers`
- Bottom sheet en mobile, panel lateral en desktop
- lot_status enum: available, quarantine, expired, depleted

## UI/UX Notes
- Bottom sheet (mobile) o panel lateral (desktop) al hacer tap
- Cada lote como card con barra lateral coloreada segun lot_status
- cost_per_unit en DM Mono con moneda de la company
- Badge de lot_status con colores semanticos: available=verde, quarantine=azul, expired=rojo, depleted=gris

## Dependencies
- US-026-001 (Vista por producto)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-026-004: Grafico de movimiento de stock (30 dias)

## User Story

**As a** gerente,
**I want** ver un grafico de linea mostrando la evolucion del stock de un producto durante los ultimos 30 dias,
**So that** pueda identificar patrones de consumo, picos de uso y planificar reordenes oportunamente.

## Acceptance Criteria

### Scenario 1: Grafico con datos completos
- **Given** el producto "Ca(NO3)2 25kg" tiene inventory_transactions de los ultimos 30 dias
- **When** el gerente accede al detalle del producto
- **Then** se muestra un grafico de linea (Recharts) con eje X = dias y eje Y = stock total
- **And** el grafico muestra la linea en #005E42 con area fill sutil

### Scenario 2: Producto con pocos movimientos
- **Given** un producto solo tiene 2 transacciones en los ultimos 30 dias
- **When** se renderiza el grafico
- **Then** el grafico muestra los puntos conectados con linea recta entre ellos
- **And** los dias sin movimiento mantienen el ultimo valor conocido (step function)

### Scenario 3: Producto sin movimientos recientes
- **Given** un producto no tiene inventory_transactions en los ultimos 30 dias
- **When** el gerente accede al detalle
- **Then** se muestra el area del grafico con mensaje "Sin movimientos en los ultimos 30 dias" y el stock actual como linea horizontal

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Chart accesible con aria-label descriptivo
- [ ] Lazy loading del componente de chart

## Technical Notes
- Query: `inventory_transactions WHERE product_id = :id AND timestamp >= NOW() - 30 days`
- Recharts AreaChart con datos agregados por dia
- Lazy loading del chart component para performance
- Calculo de stock acumulado diario desde transacciones

## UI/UX Notes
- Grafico debajo de la lista de lotes en el detalle de producto
- Ejes en DM Mono 10px, color #5A6B5E
- Area fill #005E42 con opacidad 10%
- Tooltip al hover/tap mostrando fecha y cantidad exacta

## Dependencies
- US-026-003 (Detalle de producto)
- Inventory_transactions existentes (F-028, F-030, F-031)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-026-005: Indicador de stock bajo minimo

## User Story

**As a** supervisor,
**I want** ver un indicador visual claro cuando un producto esta por debajo de su stock minimo configurado,
**So that** pueda gestionar reposiciones antes de que se agoten insumos criticos para la produccion.

## Acceptance Criteria

### Scenario 1: Producto bajo minimo
- **Given** el producto "Ca(NO3)2" tiene quantity_available total = 2kg y min_stock_threshold configurado en 5kg
- **When** el supervisor ve la vista de stock
- **Then** el producto se muestra con icono de alerta naranja, borde warning, y badge "Bajo minimo"
- **And** si hay preferred_supplier_id, muestra sugerencia de proveedor

### Scenario 2: Seccion de alertas de stock
- **Given** existen 3 productos bajo su stock minimo
- **When** el supervisor accede a inv-stock
- **Then** se muestra una seccion destacada "Alertas de Stock" en la parte superior con los 3 productos
- **And** cada alerta muestra cantidad actual, minimo configurado, y cantidad sugerida a reordenar

### Scenario 3: Producto sin threshold configurado
- **Given** un producto no tiene min_stock_threshold definido
- **When** el supervisor ve la vista de stock
- **Then** el producto no muestra indicador de alerta independientemente de su cantidad
- **And** funciona normalmente sin errores

### Scenario 4: Stock regresa sobre el minimo
- **Given** un producto estaba bajo minimo con 2kg y se recibe una compra de 10kg
- **When** el stock se actualiza a 12kg (mayor al threshold de 5kg)
- **Then** el indicador de alerta desaparece del producto
- **And** el producto sale de la seccion de alertas de stock

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility: indicador no depende solo de color (incluye icono y texto)

## Technical Notes
- Query: `inventory_items` GROUP BY product_id comparando SUM(quantity_available) contra threshold
- El threshold se configura en el producto (campo `min_stock_threshold` en tabla `products` o configuracion por company)
- Seccion de alertas de stock como componente reutilizable
- Conexion con cron job `/api/cron/stock-alerts` que genera alertas tipo `low_stock`

## UI/UX Notes
- Seccion destacada al top de inv-stock, o como tab separado "Alertas"
- Icono AlertTriangle de Lucide en naranja
- Badge "Bajo minimo" en color warning
- Sugerencia de reorden: cantidad = min_stock_threshold * 2 - stock actual

## Dependencies
- US-026-001 (Vista por producto)
- Configuracion de threshold por producto en F-027

## Estimation
- **Size**: S
- **Complexity**: Low
