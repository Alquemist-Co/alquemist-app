# Product Backlog - Fase 2: Inventario y Calidad

> Last updated: 2026-02-16

## Summary
- **Total features**: 10
- **Total stories**: 37
- **Planned**: 37 | **In Progress**: 0 | **Done**: 0

## Fase
- **Nombre**: Fase 2 - Inventario y Calidad
- **Semanas**: 8-11
- **Rango de IDs**: F-026 a F-035

## Dependencias Cross-Fase
- Requiere F-016/F-017 (Batches) de Fase 1
- Requiere F-022 (Actividades) de Fase 1
- Requiere Configuracion base (crop_types, phases, products) de Fase 0

## Features

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-026 | Stock Actual (vista por producto y por zona) | 5 | P0 - Critical | Planned | [F-026](./F-026-stock-actual.md) |
| F-027 | Catalogo de Productos (CRUD) | 4 | P0 - Critical | Planned | [F-027](./F-027-product-catalog.md) |
| F-028 | Recepcion de Compras (INV-01) | 3 | P0 - Critical | Planned | [F-028](./F-028-purchase-reception.md) |
| F-029 | Log de Movimientos de Inventario | 3 | P1 - High | Planned | [F-029](./F-029-inventory-log.md) |
| F-030 | Recetas / BOM (INV-03) | 5 | P0 - Critical | Planned | [F-030](./F-030-recipes-bom.md) |
| F-031 | Transformaciones / Cosecha Multi-Output (INV-02) | 3 | P0 - Critical | Planned | [F-031](./F-031-transformations.md) |
| F-032 | Tests de Calidad (QUA-01) | 5 | P0 - Critical | Planned | [F-032](./F-032-quality-tests.md) |
| F-033 | Historial de Calidad y Tendencias | 2 | P1 - High | Planned | [F-033](./F-033-quality-history.md) |
| F-034 | Split de Batch (BAT-02) | 4 | P0 - Critical | Planned | [F-034](./F-034-batch-split.md) |
| F-035 | Genealogia Visual de Batch | 3 | P1 - High | Planned | [F-035](./F-035-batch-genealogy.md) |

## Stories por Feature

### F-026: Stock Actual
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-026-001 | Vista de stock por producto | M | P0 |
| US-026-002 | Vista de stock por zona | M | P0 |
| US-026-003 | Detalle de producto con lotes | M | P1 |
| US-026-004 | Grafico de movimiento de stock (30 dias) | S | P1 |
| US-026-005 | Indicador de stock bajo minimo | S | P0 |

### F-027: Catalogo de Productos
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-027-001 | Lista de productos con filtros y busqueda | M | P0 |
| US-027-002 | Crear producto nuevo | M | P0 |
| US-027-003 | Editar producto existente | S | P0 |
| US-027-004 | Desactivar producto (soft delete) | S | P1 |

### F-028: Recepcion de Compras
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-028-001 | Recepcion individual de producto | M | P0 |
| US-028-002 | Recepcion en batch (multiples productos) | L | P0 |
| US-028-003 | Auto-calculo de fecha de vencimiento | S | P1 |

### F-029: Log de Movimientos
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-029-001 | Tabla de transacciones con filtros | M | P0 |
| US-029-002 | Detalle de transaccion con links a entidades | S | P1 |
| US-029-003 | Exportar movimientos a CSV | S | P2 |

### F-030: Recetas / BOM
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-030-001 | Lista de recetas | S | P0 |
| US-030-002 | Detalle de receta con ingredientes | S | P0 |
| US-030-003 | Escalar receta con validacion de stock | M | P0 |
| US-030-004 | Ejecutar receta (transaccion atomica) | L | P0 |
| US-030-005 | CRUD de recetas | M | P1 |

### F-031: Transformaciones
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-031-001 | Ejecutar transformacion con outputs configurados | L | P0 |
| US-031-002 | Registro de waste y yields | M | P0 |
| US-031-003 | Comparacion yield real vs esperado | S | P1 |

### F-032: Tests de Calidad
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-032-001 | Lista de tests pendientes | S | P0 |
| US-032-002 | Crear test de calidad | M | P0 |
| US-032-003 | Registrar resultados con auto-calculo pass/fail | L | P0 |
| US-032-004 | Generacion automatica de alerta por fallo | S | P0 |
| US-032-005 | Upload de certificado PDF | S | P1 |

### F-033: Historial de Calidad
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-033-001 | Tabla de historial de tests con filtros | M | P0 |
| US-033-002 | Grafico de tendencias por parametro y cultivar | M | P1 |

### F-034: Split de Batch
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-034-001 | Wizard de split de batch (3 pasos) | L | P0 |
| US-034-002 | Codigo derivado y herencia de propiedades | S | P0 |
| US-034-003 | Merge de batches hijos | M | P1 |
| US-034-004 | Validaciones y edge cases de split | S | P0 |

### F-035: Genealogia Visual
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-035-001 | Arbol genealogico visual | M | P0 |
| US-035-002 | Tabla cronologica de operaciones | S | P0 |
| US-035-003 | Navegacion interactiva entre nodos | S | P1 |

## Distribucion por Tamano

| Size | Count | % |
|------|-------|---|
| XS | 0 | 0% |
| S | 16 | 46% |
| M | 14 | 40% |
| L | 5 | 14% |
| XL | 0 | 0% |

## Orden Sugerido de Implementacion

### Semana 8: Fundacion de Inventario
1. F-027: Catalogo de Productos (base para todo el modulo)
2. F-028: Recepcion de Compras (genera inventory_items)
3. F-026: Stock Actual (visualiza lo recibido)

### Semana 9: Movimientos y Recetas
4. F-029: Log de Movimientos (visualiza transactions)
5. F-030: Recetas / BOM (consume y produce inventario)

### Semana 10: Transformaciones y Calidad
6. F-031: Transformaciones (cosecha multi-output)
7. F-032: Tests de Calidad (crear y registrar resultados)

### Semana 11: Batch Operations y Polish
8. F-034: Split de Batch (wizard + validaciones)
9. F-035: Genealogia Visual (arbol + tabla)
10. F-033: Historial de Calidad (tendencias)

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have para Fase 2 / bloqueante para fases posteriores |
| P1 | High | Funcionalidad core, necesaria pronto tras P0 |
| P2 | Medium | Importante pero no bloqueante |
| P3 | Low | Nice-to-have, consideracion futura |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Definida y lista para desarrollo |
| In Progress | En implementacion activa |
| Done | Completada y verificada |
| Deferred | Pospuesta a iteracion futura |
