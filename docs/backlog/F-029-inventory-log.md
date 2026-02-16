# F-029: Log de Movimientos de Inventario

## Overview

Registro historico inmutable de todas las transacciones de inventario del sistema. Tabla scrollable con filtros avanzados (tipo, producto, batch, zona, rango de fechas), vista de detalle de cada transaccion con links a entidades relacionadas, y exportacion a CSV. Es la fuente de verdad para auditorias, trazabilidad y analisis de costos.

## User Personas

- **Supervisor**: Revisa movimientos recientes en sus zonas para verificar consumos y detectar anomalias.
- **Gerente**: Analiza patrones de consumo, costos por periodo y exporta datos para reportes financieros.
- **Admin**: Acceso completo al log para auditorias y troubleshooting.
- **Viewer**: Consulta read-only del historial de movimientos.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-029-001 | Tabla de transacciones con filtros | M | P0 | Planned |
| US-029-002 | Detalle de transaccion con links a entidades | S | P1 | Planned |
| US-029-003 | Exportar movimientos a CSV | S | P2 | Planned |

---

# US-029-001: Tabla de transacciones con filtros

## User Story

**As a** gerente,
**I want** ver una tabla scrollable con todas las transacciones de inventario y poder filtrar por tipo, producto, batch, zona y rango de fechas,
**So that** pueda rastrear movimientos especificos, auditar consumos y analizar patrones de uso.

## Acceptance Criteria

### Scenario 1: Visualizacion de transacciones
- **Given** existen 200 inventory_transactions en el sistema
- **When** el gerente accede a la pantalla inv-transactions
- **Then** se muestra una tabla scrollable con columnas: timestamp, tipo (badge coloreado), producto, cantidad (+/-), batch, zona, actividad, usuario
- **And** las transacciones se ordenan por timestamp DESC (mas recientes primero)
- **And** se implementa paginacion o virtual scrolling

### Scenario 2: Filtrar por tipo y rango de fechas
- **Given** la tabla de transacciones esta visible
- **When** el gerente selecciona tipo = "consumption" y rango = "ultima semana"
- **Then** solo se muestran transacciones de tipo consumo dentro de los ultimos 7 dias
- **And** los filtros se muestran como chips removibles

### Scenario 3: Filtrar por batch especifico
- **Given** el gerente necesita ver todos los movimientos del batch LOT-001
- **When** selecciona filtro batch = "LOT-001"
- **Then** se muestran todas las transacciones vinculadas a ese batch (consumos, transformaciones, waste)
- **And** el total de costo se muestra como resumen al top

### Scenario 4: Sin transacciones para los filtros
- **Given** el gerente aplica filtros muy restrictivos
- **When** no hay transacciones que coincidan
- **Then** se muestra empty state "No se encontraron movimientos con estos filtros" con CTA "Limpiar filtros"

### Scenario 5: Cantidades con signo visual
- **Given** existen transacciones de tipo 'receipt' (+) y 'consumption' (-)
- **When** se muestra la tabla
- **Then** las cantidades de ingreso se muestran con "+" en verde y las de egreso con "-" en rojo
- **And** el tipo de transaccion determina el signo visual

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Virtual scrolling o paginacion para > 100 registros
- [ ] Performance: query < 500ms con 10K transacciones

## Technical Notes
- Pantalla: `inv-transactions`
- Query: `inventory_transactions` JOIN `products`, `batches`, `zones`, `activities`, `users` ORDER BY timestamp DESC
- Filtros server-side para performance (no filtrar en client con 10K+ registros)
- Paginacion cursor-based usando timestamp como cursor
- Tipos de transaccion con signo: receipt (+), consumption (-), application (-), transfer_out (-), transfer_in (+), transformation_out (-), transformation_in (+), adjustment (+/-), waste (-), return (+), reservation (-), release (+)
- TanStack Query para cache y paginacion infinita

## UI/UX Notes
- Desktop: tabla completa con columnas alineadas. Mobile: cards compactas
- Tipos como badges coloreados: receipt=verde, consumption=naranja, transformation=morado, waste=rojo, adjustment=gris
- Timestamps en formato relativo ("hace 2h") con tooltip de fecha exacta
- Filtros en barra colapsable (mobile) o fila sticky (desktop)
- Rango de fechas: presets (hoy, esta semana, este mes) + picker personalizado

## Dependencies
- F-028 (Recepcion) para generar transacciones iniciales
- Transacciones generadas por actividades (Fase 1), recetas (F-030), transformaciones (F-031)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-029-002: Detalle de transaccion con links a entidades

## User Story

**As a** supervisor,
**I want** ver el detalle completo de una transaccion de inventario con links navegables a las entidades relacionadas (batch, actividad, receta),
**So that** pueda entender el contexto completo de cada movimiento y rastrear su origen.

## Acceptance Criteria

### Scenario 1: Detalle de transaccion de consumo
- **Given** existe una transaction tipo 'consumption' vinculada a actividad ACT-001 del batch LOT-001
- **When** el supervisor hace tap en la transaccion
- **Then** se muestra vista detalle con todos los campos: tipo, producto, cantidad, unidad, costo_unitario, costo_total, zona, timestamp, usuario
- **And** se muestran links navegables: "Batch: LOT-001" (navega a batch-detail), "Actividad: Fertirrigacion" (navega a act-detail), "Zona: Sala Veg A"

### Scenario 2: Detalle de transformacion con transaccion relacionada
- **Given** una transaction tipo 'transformation_out' tiene related_transaction_id apuntando a una 'transformation_in'
- **When** el supervisor ve el detalle
- **Then** se muestra la seccion "Transaccion Relacionada" con link a la transaccion vinculada
- **And** muestra: "Salida de transformacion -> Entrada: [producto output] [cantidad]"

### Scenario 3: Detalle de recepcion
- **Given** una transaction tipo 'receipt' sin batch_id ni activity_id
- **When** el supervisor ve el detalle
- **Then** los campos sin vinculo se muestran como "N/A" o no se muestran
- **And** se muestra el supplier_lot_number y proveedor del inventory_item

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Links navegables funcionales a todas las entidades

## Technical Notes
- Query: `inventory_transactions` WHERE id = :id con JOINs a todas las entidades relacionadas
- Bottom sheet en mobile, panel lateral en desktop
- Links via Next.js Link component para navegacion client-side
- related_transaction_id para vincular transformation_out con transformation_in

## UI/UX Notes
- Bottom sheet (mobile) o panel lateral (desktop)
- Secciones: Datos del movimiento, Contexto (batch, actividad, zona), Transaccion relacionada
- Links como text con underline y color brand, tap -> navega
- Timestamp completo: fecha, hora, timezone

## Dependencies
- US-029-001 (Tabla de transacciones)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-029-003: Exportar movimientos a CSV

## User Story

**As a** gerente,
**I want** exportar las transacciones filtradas a un archivo CSV,
**So that** pueda importar los datos en Excel o herramientas de analisis para reportes financieros y auditorias.

## Acceptance Criteria

### Scenario 1: Exportacion exitosa con filtros
- **Given** el gerente tiene filtros aplicados (tipo=consumption, mes=enero 2026) mostrando 85 transacciones
- **When** hace tap en "Exportar CSV"
- **Then** se descarga un archivo CSV con las 85 transacciones filtradas
- **And** el archivo incluye headers: Fecha, Tipo, Producto, SKU, Cantidad, Unidad, Costo Unitario, Costo Total, Batch, Zona, Usuario
- **And** el nombre del archivo sigue formato: "movimientos-inventario-2026-01.csv"

### Scenario 2: Exportacion sin filtros (todos los registros)
- **Given** no hay filtros aplicados y existen 5000 transacciones
- **When** el gerente hace tap en "Exportar CSV"
- **Then** se muestra confirmacion "Se exportaran 5000 registros. Continuar?"
- **And** al confirmar, se genera y descarga el CSV completo

### Scenario 3: Sin datos para exportar
- **Given** los filtros aplicados no devuelven transacciones
- **When** el gerente intenta exportar
- **Then** el boton "Exportar CSV" esta disabled con tooltip "No hay datos para exportar"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] CSV valido con encoding UTF-8 BOM para Excel
- [ ] Numeros formateados correctamente (sin locale issues)

## Technical Notes
- Server Action: `exportTransactionsCSV(filters)` que retorna blob o URL temporal
- Generar CSV server-side para manejar grandes volumenes
- Encoding: UTF-8 con BOM para compatibilidad con Excel
- Separador: coma con valores entre comillas donde necesario
- Numeros con punto decimal (no locale-dependent)
- Limite: 10K registros maximo por exportacion

## UI/UX Notes
- Boton "Exportar CSV" con icono Download en la barra de filtros
- Loading state durante generacion del archivo
- Confirmacion para exports > 1000 registros

## Dependencies
- US-029-001 (Tabla de transacciones con filtros)

## Estimation
- **Size**: S
- **Complexity**: Low
