# Test Plan — Fase 2: Inventory & Quality (F-026 a F-035)

## Prerequisitos

- `npm run db:reset` ejecutado exitosamente (seed data cargada)
- `npm run dev` corriendo en localhost:3000
- Navegador: Chrome 120+ (DevTools para responsive testing)
- Seed data proporciona:
  - **10 productos** en 5 categorias (Semillas, Nutrientes, Sustratos, Material Vegetal, Suministros)
  - **14 inventory items** con estados variados (available, expired, depleted)
  - **19 transactions** de 6 tipos (receipt, consumption, transformation_in, adjustment, transfer_out, transfer_in)
  - **2 proveedores** (AgroInsumos SAS, BioNutrientes Ltda)
  - **6 quality tests** (2 completed: 1 pass + 1 fail, 2 pending, 1 in_progress, 1 pending seed viability)
  - **18 test results** distribuidos entre tests qq001, qq002, qq004, qq005
  - **5 batches** incluyendo 2 splits con lineage (c03 -> c04=A + c05=B)
  - **3 zonas** (Propagacion, Vegetativo A, Floracion A)

## Credenciales rapidas

| Rol | Email | Password |
|-----|-------|----------|
| admin | admin@agrotech.co | Admin123! |
| supervisor | supervisor@agrotech.co | Super123! |
| operator | operator@agrotech.co | Oper123! |
| manager | manager@agrotech.co | Mgr123! |
| viewer | viewer@agrotech.co | View123! |

## Permisos relevantes para Fase 2

| Accion | Roles permitidos |
|--------|-----------------|
| manage_products | supervisor, manager, admin |
| create_inventory_transaction | supervisor, manager, admin |
| create_quality_test | supervisor, manager, admin |
| record_quality_result | supervisor, manager, admin |
| split_batch | supervisor, manager, admin |

---

## F-026: Stock Actual (Vista por Producto y por Zona)

**Contexto**: 14 inventory items distribuidos en 3 zonas. CaNO3 en Vegetativo tiene 3500g (bajo umbral de 5000g). Fungicida (ii006) vence en 15 dias. Item ii008 esta expirado. Item ii013 esta depleted (0 unidades).

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F026-001 | Vista de stock por producto muestra productos con cantidades agregadas | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/inventory`. 2. Verificar que se muestra la vista de stock por producto. 3. Buscar el producto "Nitrato de Calcio 25kg" (CANO3-25KG). | Se muestra una lista/tabla de productos con SKU, nombre, cantidad disponible y unidad. CaNO3 muestra cantidad agregada de 11500g (3500g en Veg + 8000g en Flor). Cada producto muestra su unidad en DM Mono. |
| T-2F026-002 | Vista por zona muestra items agrupados por zona | P0 | supervisor | Logueado, en `/inventory` | 1. Cambiar a la vista "Por Zona" usando el toggle de vista. 2. Verificar las 3 zonas. | Se muestran 3 secciones: Sala Propagacion (semillas, fungicida, root gel, clones, depleted coco), Sala Vegetativo A (CaNO3 3500g, coco 120L, expired fungicide, OG Kush seeds), Sala Floracion A (CaNO3 8000g, flor humeda, flor seca, trim). Cada zona muestra conteo de productos. |
| T-2F026-003 | Indicador de stock bajo en CaNO3 | P0 | supervisor | Logueado, en `/inventory` vista por producto | 1. Buscar "Nitrato de Calcio" en la lista. 2. Verificar indicadores visuales. | CaNO3 muestra indicador de alerta / badge "Bajo minimo" porque la cantidad en Veg (3500g) esta por debajo del min_stock_threshold (5000g). Se muestra un icono de alerta naranja o visual equivalente. |
| T-2F026-004 | Detalle de producto muestra lotes individuales | P1 | manager | Logueado, en `/inventory` | 1. Hacer tap en el producto "Nitrato de Calcio 25kg". 2. Verificar detalle con lotes. | Se muestra el detalle con 2 inventory items (lotes): CANO3-2026-01 en Sala Vegetativo A (3500g, lote proveedor AI-LOT-4521) y CANO3-2026-02 en Sala Floracion A (8000g, lote proveedor AI-LOT-4522). Cada lote muestra zona, cantidad, costo por unidad ($80/g) y fecha de vencimiento (2027-06-15). |
| T-2F026-005 | Item expirado (ii008) muestra status expired | P1 | supervisor | Logueado, en `/inventory` | 1. Buscar "Fungicida Cobre" o navegar a la zona Vegetativo A. 2. Localizar el lote FUNG-2025-OLD. | El lote ii008 se muestra con badge "Expirado" en rojo o estilo muted. La fecha de vencimiento es CURRENT_DATE - 30 (pasada). El lot_status es 'expired'. |
| T-2F026-006 | Item depleted (ii013) muestra status agotado | P1 | supervisor | Logueado, en `/inventory` | 1. Buscar "Sustrato Coco/Perlita" o navegar a la zona Propagacion. 2. Localizar el lote depleted. | El lote ii013 (coco en Propagacion) muestra cantidad 0 y badge "Agotado" o lot_status 'depleted'. Se muestra al final de la lista o con estilo muted. |
| T-2F026-007 | Item proximo a vencer (ii006) muestra indicador | P1 | supervisor | Logueado, en `/inventory` | 1. Buscar "Fungicida Cobre" o navegar a Sala Propagacion. 2. Localizar el lote FUNG-2025-01. | El lote ii006 muestra indicador "Vence pronto" o similar. La fecha de vencimiento es CURRENT_DATE + 15. Se muestra en color warning (naranja) ya que vence dentro de 15 dias. |
| T-2F026-008 | Toggle entre vista por producto y por zona | P1 | supervisor | Logueado, en `/inventory` | 1. Verificar que esta en vista "Por Producto" (default). 2. Hacer click en el toggle de vista. 3. Verificar que cambia a "Por Zona". 4. Hacer click nuevamente. 5. Verificar que vuelve a "Por Producto". | El toggle alterna entre ambas vistas sin perder el estado de busqueda. La vista seleccionada persiste (via Zustand). |
| T-2F026-009 | Busqueda por nombre/SKU funciona | P2 | supervisor | Logueado, en `/inventory` vista por producto | 1. Escribir "gelato" en el campo de busqueda. 2. Verificar los resultados filtrados. | Se filtran solo los productos que contienen "gelato" en nombre o SKU: Semilla Gelato #41, Clon Gelato #41, Flor Humeda Gelato #41, Flor Seca Gelato #41, Trim Gelato #41. La busqueda es case-insensitive. |
| T-2F026-010 | US-026-004 Grafico de movimiento 30 dias — DEFERRED | P2 | — | — | — | SKIP — Story US-026-004 diferida. El grafico de stock de 30 dias no esta implementado en esta fase. |

---

## F-027: Catalogo de Productos (CRUD)

**Contexto**: 10 productos en seed: 6 originales + 4 adicionales. Categorias: Semillas (2), Nutrientes (2), Sustratos (1), Material Vegetal (4), Suministros (1). Thresholds configurados en 4 productos.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F027-001 | Lista muestra los 10 productos activos | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/inventory/products`. 2. Verificar que se listan todos los productos. | Se muestran 10 productos con columnas/campos: SKU (DM Mono), nombre, categoria, unidad, tipo (purchased/produced). Los productos incluyen SEM-GELATO-FEM, CLN-GELATO, CANO3-25KG, WET-GELATO, DRY-GELATO, COCO-70-30, FUNG-COPPER, ROOT-GEL-500, SEM-OGK-FEM, TRIM-GELATO. |
| T-2F027-002 | Crear producto con campos requeridos | P0 | manager | Logueado como manager, en `/inventory/products` | 1. Hacer click en "Nuevo Producto" o boton "+". 2. Completar: SKU="TEST-PROD-001", nombre="Producto de Prueba", categoria=Nutrientes, unidad=g, tipo=purchased. 3. Hacer click en "Guardar". | El producto se crea exitosamente. Se muestra toast "Producto creado". El producto aparece en la lista con los datos ingresados. Se redirige a la lista de productos. |
| T-2F027-003 | Editar producto existente (cambiar nombre, precio) | P0 | manager | Logueado como manager, producto creado en T-2F027-002 | 1. Hacer click en "Producto de Prueba" en la lista. 2. Cambiar nombre a "Producto Editado". 3. Agregar precio=25000. 4. Hacer click en "Guardar cambios". | El producto se actualiza exitosamente. Se muestra toast "Producto actualizado". El nombre y precio reflejan los nuevos valores en la lista. |
| T-2F027-004 | Filtrar productos por categoria | P1 | supervisor | Logueado, en `/inventory/products` | 1. Seleccionar filtro de categoria "Semillas". 2. Verificar los resultados. | Solo se muestran 2 productos: Semilla Gelato #41 Feminizada (SEM-GELATO-FEM) y Semilla OG Kush Feminizada (SEM-OGK-FEM). Al limpiar el filtro, se muestran los 10 productos. |
| T-2F027-005 | SKU duplicado previene creacion | P1 | admin | Logueado como admin, en formulario de nuevo producto | 1. Intentar crear un producto con SKU="SEM-GELATO-FEM" (ya existente). 2. Completar los demas campos y hacer click en "Guardar". | Se muestra error de validacion indicando que el SKU ya existe. El producto no se crea. El formulario permanece abierto con los datos ingresados. |
| T-2F027-006 | Soft delete (desactivar) oculta producto de la lista | P1 | admin | Logueado como admin, producto de prueba creado | 1. Navegar al detalle del producto de prueba. 2. Hacer click en "Desactivar" o accion equivalente. 3. Confirmar la desactivacion. 4. Verificar la lista de productos. | El producto desaparece de la lista principal (filtro por defecto: activos). Se muestra toast de confirmacion. El producto sigue existiendo en la base de datos con is_active=false. |
| T-2F027-007 | Shelf life y proveedor se guardan correctamente | P2 | manager | Logueado como manager, en formulario de nuevo producto | 1. Crear producto con SKU="TEST-SHELF-001", nombre="Producto con Shelf Life", shelf_life_days=180, proveedor=AgroInsumos SAS. 2. Guardar. 3. Abrir el detalle del producto creado. | Los campos shelf_life_days (180) y proveedor preferido (AgroInsumos SAS) se muestran correctamente en el detalle del producto. |
| T-2F027-008 | Solo supervisor/manager/admin pueden gestionar productos | P2 | operator | Logueado como operator, en `/inventory/products` | 1. Verificar que la lista de productos carga (acceso de lectura). 2. Verificar si hay boton "Nuevo Producto" visible. 3. Intentar navegar a `/inventory/products/new`. | El operator puede ver la lista de productos (lectura). El boton de crear producto NO esta visible o esta deshabilitado. La navegacion directa a `/inventory/products/new` redirige o muestra acceso denegado. |

---

## F-028: Recepcion de Compras

**Contexto**: 2 proveedores disponibles: AgroInsumos SAS (Net 30) y BioNutrientes Ltda (Net 15). Productos con lot_tracking: required (semillas, clones), optional (CaNO3, fungicida), none (coco, root gel).

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F028-001 | Recibir un solo producto crea inventory_item + transaction | P0 | supervisor | Logueado como supervisor | 1. Navegar a `/inventory/receive`. 2. Seleccionar producto="Nitrato de Calcio 25kg" (CANO3-25KG). 3. Ingresar cantidad=10000, unidad=g. 4. Seleccionar proveedor=AgroInsumos SAS. 5. Ingresar lote_proveedor="AI-LOT-9999". 6. Ingresar costo_unitario=80. 7. Seleccionar zona=Sala Vegetativo A. 8. Hacer click en "Recibir". | Se muestra toast "Recepcion registrada exitosamente". Se crea un nuevo inventory_item con quantity_available=10000, source_type='purchase', lot_status='available'. Se crea inventory_transaction tipo 'receipt' con quantity=10000, cost_per_unit=80, cost_total=800000. El stock de CaNO3 en Vegetativo A aumenta de 3500g a 13500g visible en `/inventory`. |
| T-2F028-002 | Recepcion bulk de multiples productos atomica | P0 | supervisor | Logueado como supervisor, en `/inventory/receive` | 1. Seleccionar modo "Recepcion multiple" (si disponible). 2. Agregar linea 1: Semilla OG Kush, cantidad=50, costo=15000, zona=Propagacion. 3. Agregar linea 2: Gel Enraizador 500mL, cantidad=1000, costo=64, zona=Propagacion. 4. Confirmar la recepcion. | Se muestra resumen "2 productos recibidos exitosamente". Se crean 2 inventory_items y 2 inventory_transactions tipo 'receipt' en una sola operacion atomica. Ambos items son visibles en stock. |
| T-2F028-003 | Auto-calculo de fecha de vencimiento desde shelf_life_days | P1 | supervisor | Logueado, en `/inventory/receive` | 1. Seleccionar producto="Fungicida Cobre 1L" (shelf_life_days=365). 2. Verificar el campo de fecha de vencimiento. | El campo de fecha de vencimiento se pre-llena automaticamente con la fecha actual + 365 dias. El campo es editable para override manual. Si se selecciona un producto sin shelf_life_days (ej: Semilla Gelato), el campo queda vacio. |
| T-2F028-004 | Costo por unidad y total se registran correctamente | P1 | supervisor | Logueado, en `/inventory/receive` | 1. Recibir producto con cantidad=500, costo_unitario=100. 2. Verificar la transaction creada en `/inventory/movements`. | La inventory_transaction muestra cost_per_unit=100 y cost_total=50000 (500*100). Los valores se muestran en la moneda de la company (COP). |
| T-2F028-005 | Lote de proveedor (supplier_lot_number) se captura | P1 | supervisor | Logueado, en `/inventory/receive` | 1. Recibir producto con supplier_lot_number="PROV-LOT-2026-ABC". 2. Verificar en detalle de stock. | El inventory_item creado muestra supplier_lot_number="PROV-LOT-2026-ABC" en su detalle. El campo es visible en la vista de lotes del producto. |
| T-2F028-006 | Seleccion de zona de almacenamiento | P2 | supervisor | Logueado, en `/inventory/receive` | 1. Verificar que el dropdown de zona muestra las 3 zonas disponibles. 2. Seleccionar "Sala Floracion A". 3. Completar recepcion. | Las 3 zonas aparecen: Sala Propagacion, Sala Vegetativo A, Sala Floracion A. El inventory_item se crea con zone_id correspondiente a Sala Floracion A. |
| T-2F028-007 | Costo cero muestra warning | P2 | supervisor | Logueado, en `/inventory/receive` | 1. Seleccionar un producto. 2. Ingresar costo_unitario=0. 3. Verificar la UI. | Se muestra un warning o nota indicando que el costo es $0 (donacion o muestra gratuita). La recepcion se puede completar igualmente tras confirmacion. |

---

## F-029: Log de Movimientos de Inventario

**Contexto**: 19 transactions en seed: 6 receipt, 6 consumption, 3 transformation_in, 2 adjustment, 1 transfer_out + 1 transfer_in. Transactions vinculadas a batches, actividades y zonas.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F029-001 | Log muestra todas las 19 transacciones del seed | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/inventory/movements`. 2. Verificar que se muestran transacciones. 3. Contar los registros visibles (o verificar paginacion). | Se muestran las 19 transactions ordenadas por timestamp DESC (mas recientes primero). Cada fila muestra: fecha, tipo (badge coloreado), producto, cantidad con signo (+/-), batch (si aplica), zona, usuario. Los receipts muestran "+" en verde, consumptions "-" en rojo/naranja. |
| T-2F029-002 | Filtrar por tipo de transaccion funciona | P0 | supervisor | Logueado, en `/inventory/movements` | 1. Seleccionar filtro tipo="receipt". 2. Verificar los resultados. 3. Cambiar filtro a "consumption". 4. Verificar los resultados. | Con filtro receipt: se muestran 6 transacciones de compra (semillas, CaNO3 x2, coco, fungicida, root gel). Con filtro consumption: se muestran 6 transacciones de consumo (siembra batch 001, 3 fertirriego, fungicida aplicacion, transplante). |
| T-2F029-003 | Detalle de transaccion muestra entidades vinculadas | P1 | supervisor | Logueado, en `/inventory/movements` | 1. Hacer tap en una transaccion de consumo vinculada a batch 002 (ej: "Fertiriego dia 17"). 2. Verificar el detalle. | El detalle muestra: tipo=consumption, producto=CaNO3 25kg, cantidad=-80g, zona=Sala Vegetativo A, batch=LOT-GELATO-260201 (como link navegable), usuario=Juan Operador. El link del batch navega al detalle del batch al hacer click. |
| T-2F029-004 | Filtro por rango de fechas funciona | P1 | manager | Logueado como manager, en `/inventory/movements` | 1. Aplicar filtro de rango de fechas (ej: ultima semana o ultimos 7 dias). 2. Verificar que solo se muestran transacciones dentro del rango. | Solo se muestran transacciones cuyo timestamp esta dentro del rango seleccionado. Las transacciones anteriores al rango quedan ocultas. Al limpiar el filtro, se muestran todas. |
| T-2F029-005 | Exportar CSV descarga archivo valido con BOM | P1 | manager | Logueado como manager, en `/inventory/movements` | 1. Hacer click en "Exportar CSV". 2. Verificar que se descarga un archivo. 3. Abrir el archivo en un editor de texto. | Se descarga un archivo CSV. El archivo comienza con BOM UTF-8 (\uFEFF). Los headers incluyen: Fecha, Tipo, Producto, SKU, Cantidad, Unidad, Costo Unitario, Costo Total, Batch, Zona, Usuario. Los datos corresponden a las transacciones visibles (filtradas o todas). El archivo se abre correctamente en Excel sin problemas de encoding. |
| T-2F029-006 | Paginacion cursor carga mas registros al scroll | P2 | supervisor | Logueado, suficientes transacciones en el sistema | 1. Verificar la cantidad de registros iniciales visibles. 2. Hacer scroll hacia abajo o click en "Cargar mas". | La lista carga un lote inicial de registros. Al llegar al final o hacer click en "Cargar mas", se cargan registros adicionales. El cursor se basa en timestamp para paginacion. |
| T-2F029-007 | Pair de transferencia muestra related_transaction_id | P2 | supervisor | Logueado, en `/inventory/movements` | 1. Filtrar por tipo "transfer_out" o "transfer_in". 2. Localizar la transferencia de CaNO3 entre zonas. 3. Verificar el detalle. | La transaccion transfer_out (tx018, -5000g CaNO3) esta vinculada a la transfer_in (tx019, +5000g CaNO3) via related_transaction_id. El detalle muestra la referencia a la transaccion relacionada con link navegable. |

---

## F-030: Recetas / BOM

**Contexto**: No hay recetas en el seed data. Todos los tests de esta feature requieren crear recetas desde cero. Los productos disponibles como ingredientes son los 10 del seed.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F030-001 | Crear receta con producto output e ingredientes | P0 | manager | Logueado como manager | 1. Navegar a `/inventory/recipes/new` o boton "Crear receta". 2. Ingresar nombre="Solucion Nutritiva Veg", output product=Sustrato Coco/Perlita (o cualquier producto), base_quantity=100, unidad=L. 3. Agregar ingrediente 1: Nitrato de Calcio, cantidad=500, unidad=g. 4. Agregar ingrediente 2: Gel Enraizador, cantidad=50, unidad=mL. 5. Hacer click en "Guardar". | La receta se crea exitosamente. Se muestra toast de confirmacion. La receta aparece en `/inventory/recipes` con nombre, output product, base quantity y count de 2 ingredientes. |
| T-2F030-002 | Escalar receta (factor 2x) duplica cantidades | P0 | operator | Logueado, receta creada en T-2F030-001 | 1. Navegar al detalle de la receta "Solucion Nutritiva Veg". 2. Ingresar cantidad deseada=200 (2x del base 100). 3. Verificar las cantidades escaladas. | Los ingredientes muestran cantidades duplicadas: CaNO3 = 1000g (500*2), Gel Enraizador = 100mL (50*2). El calculo se muestra en tiempo real sin hacer server call. |
| T-2F030-003 | Ejecutar receta crea transactions + output item | P0 | supervisor | Logueado como supervisor, receta creada, stock suficiente de ingredientes | 1. Navegar al detalle de la receta. 2. Escalar a la cantidad deseada. 3. Seleccionar zona de destino para el output. 4. Confirmar ejecucion. | Se crean N inventory_transactions tipo 'consumption' (una por ingrediente con cantidades negativas). Se crea 1 inventory_item nuevo para el producto output con la cantidad resultante. Se crea 1 inventory_transaction para el output. Todo en transaccion atomica. Se muestra toast "Receta ejecutada: [cantidad] de [producto]". |
| T-2F030-004 | Validacion de stock advierte si ingredientes insuficientes | P1 | supervisor | Logueado, receta creada con ingrediente que excede stock | 1. Escalar la receta a una cantidad muy alta (ej: factor 1000). 2. Verificar indicadores de stock insuficiente. | Los ingredientes con stock insuficiente se marcan en rojo con indicador "Insuficiente" mostrando: cantidad necesaria vs disponible vs faltante. El boton "Ejecutar" esta deshabilitado o muestra warning. |
| T-2F030-005 | FIFO: ejecucion consume lotes mas antiguos primero | P1 | supervisor | Logueado, multiples lotes del mismo ingrediente | 1. Verificar que CaNO3 tiene 2 lotes (ii003 en Veg y ii004 en Flor). 2. Ejecutar receta que consume CaNO3 desde una zona especifica. | El consumo se realiza segun FIFO (ORDER BY expiration_date ASC NULLS LAST, created_at ASC). El lote con fecha de vencimiento mas temprana se consume primero. |
| T-2F030-006 | Lista de recetas muestra todas las recetas creadas | P1 | supervisor | Logueado, al menos 1 receta creada | 1. Navegar a `/inventory/recipes`. 2. Verificar la lista. | Se muestran cards/filas con: nombre de receta, producto output (nombre + SKU), base_quantity con unidad, count de ingredientes. Si no hay recetas, se muestra empty state con CTA "Crear receta". |
| T-2F030-007 | Validacion de factor de escala (positivo, max 1000) | P2 | supervisor | Logueado, receta existente | 1. Intentar ingresar factor de escala 0 o negativo. 2. Intentar ingresar factor > 1000. | El sistema no permite factor <= 0 (validacion Zod). Para factor > 100 se muestra warning "Escala inusualmente alta". Para factor > 1000 se bloquea o muestra error. |
| T-2F030-008 | Batch linkage opcional en ejecucion de receta | P2 | supervisor | Logueado, receta existente | 1. Al ejecutar una receta, verificar si existe campo opcional para vincular a un batch. 2. Seleccionar batch LOT-GELATO-260201. 3. Ejecutar. | Las transactions generadas llevan batch_id del batch seleccionado. Los consumos son visibles en el tab Inventario del detalle del batch. Si no se selecciona batch, las transactions no tienen batch_id. |

---

## F-031: Transformaciones / Cosecha Multi-Output

**Contexto**: Batch 003 (LOT-GELATO-260101) esta en fase drying con transactions de transformacion existentes: tx013 (cosecha, 11500g flor humeda), tx014 (secado, 2800g flor seca del split A), tx015 (trim, 800g del split A). Phase_product_flows definen outputs esperados por fase.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F031-001 | Ejecutar transformacion crea par transformation_out + transformation_in | P0 | supervisor | Logueado como supervisor, batch en fase de transformacion | 1. Navegar al detalle del batch 002 (fase vegetativo, no destructiva) o un batch en fase harvest. 2. Abrir dialog de transformacion (si existe boton "Transformar" o "Cosecha"). 3. Completar outputs con cantidades. 4. Confirmar la ejecucion. | Se crean transactions: transformation_out (consumo del input) y transformation_in (creacion de cada output). Se crean nuevos inventory_items para cada output. Las transactions estan vinculadas via related_transaction_id. Todo es atomico. |
| T-2F031-002 | Registro de waste como transaccion sin inventory_item | P0 | supervisor | Logueado, ejecutando transformacion | 1. En el dialog de transformacion, completar la seccion de waste/desperdicio. 2. Ingresar cantidad de waste y razon. 3. Confirmar. | Se crea inventory_transaction tipo 'waste' con la cantidad indicada. El waste NO genera inventory_item (solo es registro de perdida). La razon es visible en el detalle de la transaccion. |
| T-2F031-003 | Yield se calcula como porcentaje actual vs esperado | P1 | supervisor | Logueado, transformacion ejecutada | 1. Despues de ejecutar una transformacion, verificar el yield calculado. 2. Revisar en el detalle del batch o de la orden de produccion. | El yield se muestra como porcentaje: (sum output primary / input) * 100. Se compara visualmente con el yield esperado si esta configurado. Color verde si >= esperado, amarillo si 50-100%, rojo si < 50%. |
| T-2F031-004 | Transactions vinculadas via related_transaction_id | P1 | supervisor | Logueado, transformacion ejecutada | 1. Navegar a `/inventory/movements`. 2. Filtrar por tipo transformation_in. 3. Ver detalle de tx013 (cosecha batch 003). | La transaccion transformation_in (tx013) muestra referencia a la transaccion de salida via related_transaction_id. El detalle muestra la relacion: "Cosecha batch 003 - flor humeda". |
| T-2F031-005 | Multi-output: cosecha genera multiples transformation_in | P1 | supervisor | Logueado, en `/inventory/movements` | 1. Filtrar transactions vinculadas al batch 003 o split A (batch 004). 2. Verificar las transformation_in existentes del seed. | El seed contiene 3 transformation_in para batch 003/004: tx013 (11500g flor humeda, batch 003), tx014 (2800g flor seca, batch 004), tx015 (800g trim, batch 004). Cada una creo un inventory_item diferente. |
| T-2F031-006 | Alerta si yield es menor al 50% del esperado | P2 | supervisor | Logueado, ejecutando transformacion con yield bajo | 1. Ejecutar transformacion con output muy por debajo del esperado. 2. Verificar si se genera alerta o warning. | Se muestra warning en la UI "Yield muy bajo: X% (esperado: Y%)". Si se completa la transformacion, se puede generar una alerta tipo quality_failed con severity critical. |
| T-2F031-007 | US-031-003 Comparacion yield waterfall — DEFERRED | P2 | — | — | — | SKIP — Story US-031-003 diferida. El grafico waterfall de comparacion yield real vs esperado no esta implementado en esta fase. |

---

## F-032: Tests de Calidad

**Contexto**: 6 quality tests en seed: qq001 (Cannabinoids, batch 003, completed, pass), qq002 (Microbiology, batch 003, completed, FAIL - Yeast & Mold exceeded 1200 > 1000 CFU/g), qq003 (Cannabinoids, batch 004, pending), qq004 (Pesticides, batch 002, in_progress, 3 partial results), qq005 (Cannabinoids, batch 005, completed, pass - THC 24.3%), qq006 (Seed Viability, batch 001, pending).

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F032-001 | Lista de tests pendientes muestra tests correctos | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/quality`. 2. Verificar la lista de tests pendientes/in_progress. | Se muestran al menos 3 tests no completados: qq003 (Cannabinoids, batch 004, pending), qq004 (Pesticides, batch 002, in_progress), qq006 (Seed Viability, batch 001, pending). Cada card muestra: batch code, tipo de test, lab name, fecha de muestra, dias en espera, badge de status. Ordenados por urgencia (mas dias en espera primero). |
| T-2F032-002 | Crear test de calidad para un batch | P0 | supervisor | Logueado como supervisor | 1. Navegar a `/quality/new` o boton "Crear test". 2. Seleccionar batch=LOT-GELATO-260201 (batch 002). 3. Seleccionar fase=Vegetativo. 4. Ingresar tipo=Heavy Metals. 5. Ingresar lab=AgroLab SAS. 6. Fecha muestra=hoy. 7. Hacer click en "Crear test". | El test se crea exitosamente con status='pending'. Se muestra toast "Test de calidad creado". El test aparece en la lista de pendientes con los datos ingresados. |
| T-2F032-003 | Registrar resultados con pass/fail por threshold | P0 | supervisor | Logueado, test pendiente (qq003 o qq006) | 1. Navegar al detalle de un test pendiente (ej: qq006, Seed Viability). 2. Agregar parametros con valores y thresholds: ej. "Germination Rate"=92%, min=80, max=100. 3. Agregar otro parametro: "Moisture"=8%, min=0, max=12. 4. Hacer click en "Registrar Resultados". | Cada parametro se evalua contra sus thresholds: Germination Rate 92% esta dentro de 80-100% -> passed=true (check verde). Moisture 8% esta dentro de 0-12% -> passed=true. Overall_pass se calcula como true (todos pasan). Test cambia a status='completed'. Se muestra toast de exito. |
| T-2F032-004 | Test qq001 (Cannabinoids) muestra como PASSED | P0 | supervisor | Logueado, seed data cargada | 1. Navegar al detalle del test qq001. 2. Verificar resultados individuales y overall. | El test qq001 muestra 4 resultados: THC=22.5% (pass, dentro 15-30), CBD=0.6% (pass, dentro 0-5), CBN=0.1% (pass, dentro 0-1), Moisture=11.2% (pass, dentro 8-15). Overall badge muestra "Aprobado" o check verde. Status=completed. Lab=LabCanna Colombia, ref=LC-2026-0451. |
| T-2F032-005 | Test qq002 (Microbiology) muestra como FAILED | P0 | supervisor | Logueado, seed data cargada | 1. Navegar al detalle del test qq002. 2. Verificar resultados individuales y overall. | El test qq002 muestra 4 resultados: Total Aerobic=800 CFU/g (pass, < 10000), Yeast & Mold=1200 CFU/g (FAIL, excede max 1000), E.coli=Not detected (pass), Salmonella=Not detected (pass). Overall badge muestra "Fallido" o X rojo porque Yeast & Mold fallo. Status=completed, overall_pass=false. |
| T-2F032-006 | Overall_pass se auto-calcula desde resultados individuales | P1 | supervisor | Logueado, registrando resultados | 1. Al registrar resultados, ingresar 2 parametros que pasan y 1 que falla. 2. Verificar el indicador overall antes de guardar. | El indicador overall muestra "No pasa" en rojo en tiempo real cuando al menos 1 parametro con threshold falla. Si se corrige el valor para que pase, el indicador cambia a "Pasa" en verde. |
| T-2F032-007 | Auto-alerta creada cuando test falla (alerta aa05 existe) | P1 | supervisor | Logueado, seed data cargada | 1. Verificar que la alerta aa05 existe en el centro de alertas (`/operations/alerts`). 2. Verificar que esta vinculada al test qq002. | La alerta aa05 de tipo 'quality_failed' existe con severity='critical'. Mensaje: "Test de microbiologia FALLO - Batch LOT-GELATO-260101 excede mohos". Entity_type='quality_test', entity_id=qq002. La alerta esta en estado pendiente (no acknowledged). |
| T-2F032-008 | US-032-005 Upload de certificado PDF — DEFERRED | P2 | — | — | — | SKIP — Story US-032-005 diferida. El upload de certificado PDF no esta implementado en esta fase. |

---

## F-033: Historial de Calidad y Tendencias

**Contexto**: Tests completados en seed: qq001 (Cannabinoids pass, batch 003), qq002 (Microbiology fail, batch 003), qq005 (Cannabinoids pass, batch 005). Test in_progress: qq004 (Pesticides, batch 002). Tests pending: qq003 (batch 004), qq006 (batch 001).

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F033-001 | Historial muestra tests completados | P0 | manager | Logueado como manager, seed data cargada | 1. Navegar a `/quality/history`. 2. Verificar los tests listados. | Se muestran al menos 3 tests completados: qq001 (Cannabinoids, batch 003, pass), qq002 (Microbiology, batch 003, fail), qq005 (Cannabinoids, batch 005, pass). Cada fila muestra: batch code, tipo, lab, fecha muestra, fecha resultado, overall pass (badge verde/rojo). Ordenados por fecha resultado DESC. |
| T-2F033-002 | Filtrar por batch, tipo de test, o status funciona | P1 | manager | Logueado, en `/quality/history` | 1. Filtrar por batch=LOT-GELATO-260101 (batch 003). 2. Verificar resultados. 3. Limpiar filtro y filtrar por status="failed". | Con filtro batch 003: se muestran 2 tests (qq001 pass + qq002 fail). Con filtro failed: se muestra solo qq002 (Microbiology fail). Los filtros se muestran como chips removibles. |
| T-2F033-003 | Tendencias: grafico de parametro por cultivar | P1 | manager | Logueado, en `/quality/history` | 1. Navegar a la seccion de tendencias o tab "Tendencias". 2. Seleccionar cultivar=Gelato #41. 3. Seleccionar parametro=THC. | Se muestra grafico de linea con los valores de THC de tests completados para Gelato: qq001 (22.5%), qq005 (24.3%). Los puntos estan dentro de la banda de threshold (15-30%). Se muestra linea de tendencia si hay 3+ puntos, o mensaje "Se necesitan al menos 3 tests" si hay menos. |
| T-2F033-004 | Batch 003 muestra 2 tests en historial (pass + fail) | P1 | supervisor | Logueado, en `/quality/history` | 1. Filtrar por batch 003. 2. Verificar los 2 tests. | Se muestran exactamente 2 tests para batch 003: qq001 Cannabinoids (pass, badge verde) y qq002 Microbiology (fail, badge rojo). Ambos de LabCanna Colombia. |
| T-2F033-005 | Paginacion cursor para historiales grandes | P2 | manager | Logueado, en `/quality/history` | 1. Verificar que la lista se carga con paginacion. 2. Si hay pocos registros, verificar que no se rompe la UI. | La lista implementa paginacion cursor-based por result_date. Con pocos registros (3 en seed), se muestra todo sin paginacion. El componente "Cargar mas" solo aparece si hay mas registros disponibles. |
| T-2F033-006 | Detalle de test navega a resultados completos | P2 | manager | Logueado, en `/quality/history` | 1. Hacer tap en un test completado (ej: qq001). 2. Verificar navegacion. | Se navega al detalle del test mostrando todos los parametros, valores, thresholds y pass/fail por parametro. Incluye link al batch (LOT-GELATO-260101) y lab reference (LC-2026-0451). |

---

## F-034: Split de Batch

**Contexto**: Batch 003 (LOT-GELATO-260101) ya tiene 2 split children en seed: c04 (LOT-GELATO-260101-A, 15 plantas) y c05 (LOT-GELATO-260101-B, 10 plantas). Batch_lineage records: dd11 (split c03->c04, 15 plantas) y dd12 (split c03->c05, 10 plantas). Batch 002 (40 plantas, vegetativo) es candidato para nuevos splits.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F034-001 | Split crea batch hijo con codigo derivado (letras) | P0 | supervisor | Logueado como supervisor | 1. Navegar al detalle del batch 002 (LOT-GELATO-260201, 40 plantas, vegetativo). 2. Hacer click en "Split" o boton equivalente. 3. Paso 1: Seleccionar 10 plantas. 4. Paso 2: Seleccionar zona=Sala Propagacion, razon="Separar plantas con deficiencia". 5. Paso 3: Confirmar split. | Se crea batch hijo con codigo LOT-GELATO-260201-A (primera letra). El hijo tiene plant_count=10. Batch padre (002) se actualiza a plant_count=30. Se crea batch_lineage con operation='split', quantity_transferred=10, reason registrada, performed_by=supervisor. Se muestra toast "Split completado: LOT-GELATO-260201-A creado con 10 plantas". |
| T-2F034-002 | Batch padre muestra hijos en detalle (split existente del seed) | P0 | supervisor | Logueado, seed data cargada | 1. Navegar al detalle del batch 003 (LOT-GELATO-260101). 2. Verificar que se muestran los hijos. | El detalle del batch 003 muestra referencia a sus 2 hijos: LOT-GELATO-260101-A (c04, 15 plantas, active) y LOT-GELATO-260101-B (c05, 10 plantas, completed). Cada hijo es un link navegable a su detalle. |
| T-2F034-003 | Plant count se distribuye correctamente entre parent e hijos | P1 | supervisor | Logueado, split ejecutado en T-2F034-001 | 1. Verificar plant_count del batch padre (002). 2. Verificar plant_count del batch hijo creado. 3. Sumar ambos. | Padre: 30 plantas (40 - 10). Hijo: 10 plantas. Total = 40 (igual al plant_count original). No hay plantas perdidas ni duplicadas en la distribucion. |
| T-2F034-004 | Batch lineage records se crean con operation='split' | P1 | supervisor | Logueado, seed data cargada | 1. Verificar los registros de lineage del batch 003. 2. Revisar la tabla de operaciones en la genealogia. | Existen 2 registros de batch_lineage: dd11 (split, c03->c04, 15 plantas, "Separar fenotipo A", supervisor) y dd12 (split, c03->c05, 10 plantas, "Separar fenotipo B", supervisor). Operation='split' en ambos. |
| T-2F034-005 | Hijo hereda propiedades del padre (cultivar, fase, orden) | P1 | supervisor | Logueado, seed data cargada | 1. Navegar al detalle del batch 004 (LOT-GELATO-260101-A). 2. Verificar propiedades heredadas. | Batch 004 muestra: cultivar=Gelato #41 (heredado de c03), current_phase=Secado/Drying (heredado), production_order=OP-2026-004 (heredado), parent_batch=LOT-GELATO-260101 (link al padre). Zone puede ser diferente al padre. |
| T-2F034-006 | Derivacion de codigo: numeros para sub-splits de hijos | P2 | supervisor | Logueado, batch hijo existente con plantas suficientes | 1. Si el batch 004 (LOT-GELATO-260101-A) tiene plantas, hacer split de el. 2. Verificar el codigo del nuevo nieto. | El nieto recibe codigo LOT-GELATO-260101-A-1 (numeros para segundo nivel, no letras). Si se hiciera otro split de 004, el siguiente seria LOT-GELATO-260101-A-2. Patron: letras para primer nivel de split, numeros para sub-splits. |
| T-2F034-007 | Solo supervisor/manager/admin pueden ejecutar split | P2 | operator | Logueado como operator | 1. Navegar al detalle de un batch activo. 2. Verificar si el boton "Split" esta visible o habilitado. | El boton de split NO esta visible o esta deshabilitado para el operator. La accion split_batch requiere rol supervisor, manager o admin segun ACTION_PERMISSIONS. |

---

## F-035: Genealogia Visual de Batch

**Contexto**: Arbol genealogico en seed: c03 (LOT-GELATO-260101, raiz) con 2 hijos -> c04 (LOT-GELATO-260101-A) y c05 (LOT-GELATO-260101-B). Query recursiva CTE sube hasta root y baja por todos los descendants. Diagrama SVG custom top-down.

| ID | Descripcion | Prio | Rol | Precondiciones | Pasos | Resultado Esperado |
|----|-------------|------|-----|----------------|-------|--------------------|
| T-2F035-001 | Genealogia de batch 003 muestra arbol con 2 hijos | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/batches/[batchId de c03]/genealogy`. 2. Verificar el diagrama de arbol. | Se muestra un arbol con 3 nodos: LOT-GELATO-260101 (raiz, arriba) con 2 ramas hacia LOT-GELATO-260101-A y LOT-GELATO-260101-B. Cada nodo muestra: codigo (DM Mono), plant_count, status badge (active/completed). Las lineas de conexion indican operation='split'. |
| T-2F035-002 | Genealogia desde batch hijo (c04) muestra padre y hermano | P0 | supervisor | Logueado, seed data cargada | 1. Navegar a `/batches/[batchId de c04]/genealogy`. 2. Verificar el diagrama. | El arbol muestra el mismo arbol completo de la familia: raiz c03 con hijos c04 y c05. La CTE recursiva encuentra la raiz automaticamente (sube por parent_batch_id hasta encontrar batch sin parent). El nodo actual (c04) puede estar destacado visualmente. |
| T-2F035-003 | SVG layout renderiza arbol top-down correctamente | P1 | manager | Logueado, en genealogia de batch 003 | 1. Verificar el layout del SVG. 2. Verificar que las lineas de conexion son claras. | El arbol se renderiza con layout top-down (raiz arriba, hijos abajo). Los nodos estan espaciados correctamente sin solapamiento. Las lineas de conexion van desde el nodo padre hacia cada hijo. El SVG es scrollable si el arbol es grande. |
| T-2F035-004 | Click en nodo navega al detalle del batch | P1 | supervisor | Logueado, en genealogia de batch 003 | 1. Hacer click/tap en el nodo LOT-GELATO-260101-A. 2. Verificar la navegacion. | Se navega al detalle del batch c04 (`/batches/[batchId de c04]`). Desde ahi, el usuario puede acceder a la genealogia de c04. La navegacion es fluida sin perder contexto. |
| T-2F035-005 | Root detection: c03 es root de la familia | P1 | supervisor | Logueado, en genealogia | 1. Acceder a la genealogia desde cualquier miembro de la familia (c03, c04, o c05). 2. Verificar que el root detectado es siempre c03. | Independientemente de desde que nodo se acceda, el arbol siempre muestra c03 como raiz (es el unico batch sin parent_batch_id en la familia). La CTE recursiva navega correctamente hacia arriba. |
| T-2F035-006 | Tabla de operaciones muestra lineage cronologico | P1 | supervisor | Logueado, en genealogia de batch 003 | 1. Verificar la tabla de operaciones (debajo del arbol o en tab separada). 2. Revisar las 2 operaciones de split. | La tabla muestra 2 filas: Split c03 -> c04 (15 plantas, "Separar fenotipo A", supervisor) y Split c03 -> c05 (10 plantas, "Separar fenotipo B", supervisor). Ordenadas por fecha. Cada fila muestra: fecha, operacion (badge split), batch origen, batch destino, cantidad, razon, responsable. |
| T-2F035-007 | Batch codes se muestran en los nodos del arbol | P2 | supervisor | Logueado, en genealogia de batch 003 | 1. Verificar el contenido de cada nodo del arbol. | Cada nodo del SVG muestra claramente el batch code: LOT-GELATO-260101, LOT-GELATO-260101-A, LOT-GELATO-260101-B. Los codigos usan fuente DM Mono para legibilidad. Adicionalmente se muestra plant_count y status badge con color semantico (active=verde, completed=gris). |

---

## Resumen de Cobertura

| Feature | P0 | P1 | P2 | Total | Deferred |
|---------|----|----|-----|-------|----------|
| F-026: Stock Actual | 3 | 4 | 2 | 9 | 1 (chart) |
| F-027: Product Catalog | 3 | 2 | 3 | 8 | 0 |
| F-028: Purchase Reception | 2 | 3 | 2 | 7 | 0 |
| F-029: Inventory Log | 2 | 3 | 2 | 7 | 0 |
| F-030: Recipes / BOM | 3 | 3 | 2 | 8 | 0 |
| F-031: Transformations | 2 | 3 | 1 | 6 | 1 (waterfall) |
| F-032: Quality Tests | 5 | 2 | 0 | 7 | 1 (cert upload) |
| F-033: Quality History | 1 | 3 | 2 | 6 | 0 |
| F-034: Batch Split | 2 | 3 | 2 | 7 | 0 |
| F-035: Batch Genealogy | 2 | 4 | 1 | 7 | 0 |
| **TOTAL** | **25** | **30** | **17** | **72** | **3** |

## Notas para el Tester

1. **Transacciones atomicas**: Las operaciones de recepcion bulk (F-028), ejecucion de receta (F-030), transformacion (F-031) y split (F-034) son transaccionales. Si una parte falla, toda la operacion se revierte. Verificar esto intentando escenarios de fallo parcial.

2. **Orden de ejecucion recomendado**: Empezar por F-027 (catalogo) y F-026 (stock) que son de lectura. Luego F-028 (recepcion) para agregar datos. F-029 (log) verifica las transacciones creadas. F-030 y F-031 requieren stock existente. F-032 y F-033 son independientes. F-034 y F-035 requieren batches existentes.

3. **Datos mutables**: Los tests que crean datos (F-027 crear producto, F-028 recepcion, F-030 receta, F-034 split) modifican el estado de la base de datos. Si necesita repetir tests, ejecutar `npm run db:reset` para restaurar el seed.

4. **Stories diferidas**: Tres stories estan marcadas como SKIP (US-026-004 chart, US-031-003 yield waterfall, US-032-005 certificate upload). Estas fueron diferidas explicitamente y no deben probarse.

5. **CSV export (F-029)**: El archivo CSV debe incluir BOM UTF-8 (\uFEFF) al inicio para compatibilidad con Excel. Verificar abriendo con editor hexadecimal o con Excel directamente.

6. **Permisos por rol**: Los tests de escritura (crear, editar, split, etc.) deben ejecutarse con roles autorizados. Verificar que operator y viewer no pueden realizar acciones restringidas. Las acciones de lectura (stock, log, historial) estan disponibles para todos los roles.
