# Product Backlog — Fase 1: Core Loop (Produccion)

> Last updated: 2026-02-16

## Summary
- **Total features**: 12
- **Total stories**: 55
- **Planned**: 9 | **In Progress**: 0 | **Done**: 51
- **Semanas**: 3-7
- **Rango de IDs**: F-011 a F-022
- **Dependencia cross-fase**: Requiere F-001 a F-006 (Fase 0) como base

## Features

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-011 | Configuracion de tipos de cultivo y fases | 5 | P0 - Critical | Done | [F-011](./done/F-011-crop-types-config.md) |
| F-012 | Configuracion de cultivares | 4 | P0 - Critical | Done | [F-012](./done/F-012-cultivar-config.md) |
| F-013 | Crear orden de produccion — wizard 5 pasos | 6 | P0 - Critical | Done | [F-013](./done/F-013-create-production-order.md) |
| F-014 | Aprobar/rechazar orden y crear batch | 3 | P0 - Critical | Done | [F-014](./done/F-014-approve-reject-order.md) |
| F-015 | Lista de ordenes y detalle con yield waterfall | 4 | P1 - High | Done | [F-015](./done/F-015-order-list-detail.md) |
| F-016 | Lista de batches con filtros y vistas | 3 | P1 - High | Done | [F-016](./done/F-016-batch-list.md) |
| F-017 | Detalle de batch con tabs | 6 | P1 - High | Done | [F-017](./done/F-017-batch-detail.md) |
| F-018 | Avanzar fase de batch | 4 | P0 - Critical | Done | [F-018](./done/F-018-batch-phase-advance.md) |
| F-019 | Templates de actividad (CRUD) | 5 | P0 - Critical | Done | [F-019](./done/F-019-activity-templates.md) |
| F-020 | Programar actividades desde schedule | 4 | P0 - Critical | Done | [F-020](./done/F-020-schedule-activities.md) |
| F-021 | Lista de actividades de hoy | 5 | P1 - High | Done | [F-021](./done/F-021-today-activities.md) |
| F-022 | Ejecutar actividad completa | 6 | P0 - Critical | Done | [F-022](./done/F-022-execute-activity.md) |

## Resumen de Stories por Feature

### F-011: Configuracion de tipos de cultivo y fases (5 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-011-001 | CRUD de tipos de cultivo | S | P0 |
| US-011-002 | CRUD de fases de produccion con drag-to-reorder | M | P0 |
| US-011-003 | Configuracion de phase product flows por fase | L | P0 |
| US-011-004 | Validacion visual de cadena input-output entre fases consecutivas | M | P1 |
| US-011-005 | Soft delete y proteccion de datos en uso | S | P1 |

### F-012: Configuracion de cultivares (4 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-012-001 | CRUD de cultivares con datos base | M | P0 |
| US-012-002 | Configuracion de duraciones por fase (phase_durations) | S | P0 |
| US-012-003 | Configuracion de condiciones optimas (optimal_conditions) | M | P1 |
| US-012-004 | Gestion de cultivar products (SKUs por fase) | M | P1 |

### F-013: Crear orden de produccion — wizard 5 pasos (6 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-013-001 | Paso 1: Seleccion de cultivar | S | P0 |
| US-013-002 | Paso 2: Seleccion de fases entry/exit | M | P0 |
| US-013-003 | Paso 3: Cantidad inicial y calculo de yield en cascada | L | P0 |
| US-013-004 | Paso 4: Asignacion de zonas y fechas | M | P0 |
| US-013-005 | Paso 5: Revision y guardado como draft | M | P0 |
| US-013-006 | Persistencia de wizard (auto-save entre pasos) | S | P1 |

### F-014: Aprobar/rechazar orden y crear batch (3 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-014-001 | Aprobar orden y crear batch automaticamente | L | P0 |
| US-014-002 | Rechazar orden con razon obligatoria | S | P0 |
| US-014-003 | Validacion de stock para aprobacion | M | P1 |

### F-015: Lista de ordenes y detalle con yield waterfall (4 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-015-001 | Lista de ordenes con filtros y busqueda | M | P0 |
| US-015-002 | Vista kanban de ordenes por estado (desktop) | M | P2 |
| US-015-003 | Detalle de orden con progreso por fase | M | P0 |
| US-015-004 | Diagrama yield waterfall (real vs esperado) | L | P1 |

### F-016: Lista de batches con filtros y vistas (3 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-016-001 | Lista de batches con cards y datos clave | M | P0 |
| US-016-002 | Filtros combinables (estado, fase, zona, cultivar) | M | P0 |
| US-016-003 | Selector de vista lista/grid y sorting | S | P1 |

### F-017: Detalle de batch con tabs (6 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-017-001 | Header hero con datos principales del batch | M | P0 |
| US-017-002 | Phase stepper visual interactivo | M | P0 |
| US-017-003 | Tab Timeline con cronologia de eventos | L | P0 |
| US-017-004 | Tab Actividades con lista pendientes/completadas | M | P1 |
| US-017-005 | Tab Inventario con transacciones del batch | M | P1 |
| US-017-006 | Tabs Costos y Calidad (vistas basicas) | M | P2 |

### F-018: Avanzar fase de batch (4 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-018-001 | Avanzar batch a la siguiente fase | L | P0 |
| US-018-002 | Cambio de zona obligatorio al avanzar fase | M | P0 |
| US-018-003 | Warning de actividades pendientes al avanzar | S | P1 |
| US-018-004 | Completar batch al llegar a exit_phase | M | P1 |

### F-019: Templates de actividad (CRUD) (5 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-019-001 | Lista de templates con filtros | S | P0 |
| US-019-002 | Editor de template: datos base y configuracion | M | P0 |
| US-019-003 | Editor de recursos del template (quantity_basis) | L | P0 |
| US-019-004 | Editor de checklist items (drag-to-reorder) | M | P0 |
| US-019-005 | Seleccion de fases aplicables (multi-select) | S | P1 |

### F-020: Programar actividades desde schedule (4 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-020-001 | Generar actividades al crear batch o avanzar fase | L | P0 |
| US-020-002 | Reprogramar actividad individual (cambiar fecha) | S | P0 |
| US-020-003 | Cancelar actividad programada con razon | S | P1 |
| US-020-004 | Asignacion automatica de operador por zona | M | P1 |

### F-021: Lista de actividades de hoy (5 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-021-001 | Timeline visual de actividades del dia | M | P0 |
| US-021-002 | Activity cards con datos y color-coding por tipo | M | P0 |
| US-021-003 | Quick-complete (swipe) para actividades rutinarias | M | P1 |
| US-021-004 | Seccion sticky de actividades vencidas | S | P0 |
| US-021-005 | Filtros: pendientes, completadas, todas | S | P1 |

### F-022: Ejecutar actividad completa (6 stories)

| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-022-001 | Paso 1: Recursos escalados con edicion | L | P0 |
| US-022-002 | Paso 2: Checklist con items criticos bloqueantes | M | P0 |
| US-022-003 | Paso 3: Observaciones opcionales con fotos | M | P1 |
| US-022-004 | Paso 4: Confirmacion y generacion de transacciones | L | P0 |
| US-022-005 | Timer automatico de duracion | S | P0 |
| US-022-006 | Funcionamiento offline completo | L | P1 |

## Distribucion por Size

| Size | Count | Porcentaje |
|------|-------|------------|
| XS | 0 | 0% |
| S | 16 | 29% |
| M | 27 | 49% |
| L | 12 | 22% |
| XL | 0 | 0% |

## Distribucion por Priority

| Priority | Count | Porcentaje |
|----------|-------|------------|
| P0 - Critical | 34 | 62% |
| P1 - High | 18 | 33% |
| P2 - Medium | 3 | 5% |
| P3 - Low | 0 | 0% |

## Grafo de Dependencias entre Features

```
Fase 0 (F-001 a F-006)
  |
  v
F-011 (Crop Types + Fases)
  |
  +---> F-012 (Cultivares)
  |       |
  |       v
  +---> F-013 (Crear Orden - Wizard) ---> F-014 (Aprobar/Rechazar)
  |                                         |
  |                                         +---> F-015 (Lista/Detalle Ordenes)
  |                                         |
  |                                         +---> F-016 (Lista Batches)
  |                                         |       |
  |                                         |       v
  |                                         +---> F-017 (Detalle Batch)
  |                                         |
  |                                         +---> F-018 (Avanzar Fase)
  |
  +---> F-019 (Templates Actividad)
          |
          v
        F-020 (Programar Actividades)
          |
          +---> F-021 (Actividades de Hoy)
          |
          +---> F-022 (Ejecutar Actividad)
```

## Orden de Implementacion Sugerido

### Semana 3: Configuracion base
1. F-011: Crop types y fases (base de todo)
2. F-012: Cultivares

### Semana 4: Ordenes y batches
3. F-013: Crear orden (wizard)
4. F-014: Aprobar/rechazar orden

### Semana 5: Listas y detalle
5. F-015: Lista y detalle de ordenes
6. F-016: Lista de batches
7. F-017: Detalle de batch

### Semana 6: Actividades
8. F-019: Templates de actividad
9. F-020: Programar actividades
10. F-018: Avanzar fase de batch

### Semana 7: Ejecucion
11. F-021: Actividades de hoy
12. F-022: Ejecutar actividad completa

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have para el core loop de produccion |
| P1 | High | Funcionalidad core, necesaria para completar la fase |
| P2 | Medium | Importante pero no bloquea el flujo principal |
| P3 | Low | Nice-to-have, consideracion futura |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Definida y lista para desarrollo |
| In Progress | En implementacion |
| Done | Completada y verificada |
| Deferred | Pospuesta a una iteracion futura |
