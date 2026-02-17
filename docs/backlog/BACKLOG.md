# Product Backlog — Alquemist

> Last updated: 2026-02-16

## Summary

- **Total features**: 48
- **Total stories**: 218
- **Fases**: 5 (0-4)
- **Semanas**: 20
- **Planned**: 171 | **In Progress**: 0 | **Done**: 47

## Resumen por Fase

| Fase | Nombre | Semanas | Features | Stories | Dependencias |
|------|--------|---------|----------|---------|--------------|
| 0 | Fundacion | 1-2 | 7 | 38 | Ninguna |
| 1 | Core Loop (Produccion) | 3-7 | 12 | 55 | Fase 0 |
| 2 | Inventario y Calidad | 8-11 | 10 | 37 | F-016, F-017, F-022 (Fase 1) |
| 3 | Operaciones y Offline | 12-16 | 10 | 42 | Fases 0-1 + F-026 (Fase 2) |
| 4 | Polish y Lanzamiento | 17-20 | 9 | 46 | Todas las fases anteriores |

---

## Fase 0: Fundacion (Semanas 1-2)

> Indice detallado: [BACKLOG-FASE-0.md](./BACKLOG-FASE-0.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-001 | Setup del proyecto y deploy | 5 | P0 - Critical | Done | [F-001](./done/F-001-project-setup.md) |
| F-002 | Design system (componentes base UI) | 9 | P0 - Critical | Done | [F-002](./done/F-002-design-system.md) |
| F-003 | Schema de base de datos | 8 | P0 - Critical | Done | [F-003](./done/F-003-database-schema.md) |
| F-004 | Autenticacion y middleware de roles | 4 | P0 - Critical | Done | [F-004](./done/F-004-auth-middleware.md) |
| F-005 | Layout principal responsive | 5 | P0 - Critical | Done | [F-005](./done/F-005-main-layout.md) |
| F-006 | PWA basica | 4 | P0 - Critical | Done | [F-006](./done/F-006-pwa-basic.md) |
| F-007 | Provisioning basico de usuarios | 3 | P0 - Critical | Done | [F-007](./done/F-007-basic-user-provisioning.md) |

---

## Fase 1: Core Loop — Produccion (Semanas 3-7)

> Indice detallado: [BACKLOG-FASE-1.md](./BACKLOG-FASE-1.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-011 | Configuracion de tipos de cultivo y fases | 5 | P0 - Critical | Done | [F-011](./done/F-011-crop-types-config.md) |
| F-012 | Configuracion de cultivares | 4 | P0 - Critical | Done | [F-012](./done/F-012-cultivar-config.md) |
| F-013 | Crear orden de produccion — wizard 5 pasos | 6 | P0 - Critical | Planned | [F-013](./planned/F-013-create-production-order.md) |
| F-014 | Aprobar/rechazar orden y crear batch | 3 | P0 - Critical | Planned | [F-014](./planned/F-014-approve-reject-order.md) |
| F-015 | Lista de ordenes y detalle con yield waterfall | 4 | P1 - High | Planned | [F-015](./planned/F-015-order-list-detail.md) |
| F-016 | Lista de batches con filtros y vistas | 3 | P1 - High | Planned | [F-016](./planned/F-016-batch-list.md) |
| F-017 | Detalle de batch con tabs | 6 | P1 - High | Planned | [F-017](./planned/F-017-batch-detail.md) |
| F-018 | Avanzar fase de batch | 4 | P0 - Critical | Planned | [F-018](./planned/F-018-batch-phase-advance.md) |
| F-019 | Templates de actividad (CRUD) | 5 | P0 - Critical | Planned | [F-019](./planned/F-019-activity-templates.md) |
| F-020 | Programar actividades desde schedule | 4 | P0 - Critical | Planned | [F-020](./planned/F-020-schedule-activities.md) |
| F-021 | Lista de actividades de hoy | 5 | P1 - High | Planned | [F-021](./planned/F-021-today-activities.md) |
| F-022 | Ejecutar actividad completa | 6 | P0 - Critical | Planned | [F-022](./planned/F-022-execute-activity.md) |

---

## Fase 2: Inventario y Calidad (Semanas 8-11)

> Indice detallado: [BACKLOG-FASE-2.md](./BACKLOG-FASE-2.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-026 | Stock actual (vista por producto y por zona) | 5 | P0 - Critical | Planned | [F-026](./planned/F-026-stock-actual.md) |
| F-027 | Catalogo de productos (CRUD) | 4 | P0 - Critical | Planned | [F-027](./planned/F-027-product-catalog.md) |
| F-028 | Recepcion de compras (INV-01) | 3 | P0 - Critical | Planned | [F-028](./planned/F-028-purchase-reception.md) |
| F-029 | Log de movimientos de inventario | 3 | P1 - High | Planned | [F-029](./planned/F-029-inventory-log.md) |
| F-030 | Recetas / BOM (INV-03) | 5 | P0 - Critical | Planned | [F-030](./planned/F-030-recipes-bom.md) |
| F-031 | Transformaciones / cosecha multi-output (INV-02) | 3 | P0 - Critical | Planned | [F-031](./planned/F-031-transformations.md) |
| F-032 | Tests de calidad (QUA-01) | 5 | P0 - Critical | Planned | [F-032](./planned/F-032-quality-tests.md) |
| F-033 | Historial de calidad y tendencias | 2 | P1 - High | Planned | [F-033](./planned/F-033-quality-history.md) |
| F-034 | Split de batch (BAT-02) | 4 | P0 - Critical | Planned | [F-034](./planned/F-034-batch-split.md) |
| F-035 | Genealogia visual de batch | 3 | P1 - High | Planned | [F-035](./planned/F-035-batch-genealogy.md) |

---

## Fase 3: Operaciones y Offline (Semanas 12-16)

> Indice detallado: [BACKLOG-FASE-3.md](./BACKLOG-FASE-3.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-041 | Mapa de facility y grid de zonas | 3 | P1 - High | Planned | [F-041](./planned/F-041-facility-map.md) |
| F-042 | Detalle de zona con clima actual y batches | 4 | P1 - High | Planned | [F-042](./planned/F-042-zone-detail.md) |
| F-043 | Posiciones de planta (grid visual) | 3 | P2 - Medium | Planned | [F-043](./planned/F-043-plant-positions.md) |
| F-044 | Ocupacion planificada (timeline Gantt) | 3 | P2 - Medium | Planned | [F-044](./planned/F-044-occupancy-gantt.md) |
| F-045 | Monitoreo ambiental real-time (OPS-01) | 5 | P0 - Critical | Planned | [F-045](./planned/F-045-env-monitoring.md) |
| F-046 | Gestion de sensores | 3 | P1 - High | Planned | [F-046](./planned/F-046-sensor-management.md) |
| F-047 | Centro de alertas | 5 | P0 - Critical | Planned | [F-047](./planned/F-047-alert-center.md) |
| F-048 | Costos overhead y COGS completo (OPS-02) | 5 | P1 - High | Planned | [F-048](./planned/F-048-overhead-costs.md) |
| F-049 | Offline completo | 6 | P0 - Critical | Planned | [F-049](./planned/F-049-offline-complete.md) |
| F-050 | Supabase Realtime | 5 | P1 - High | Planned | [F-050](./planned/F-050-realtime.md) |

---

## Fase 4: Polish y Lanzamiento (Semanas 17-20)

> Indice detallado: [BACKLOG-FASE-4.md](./BACKLOG-FASE-4.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-056 | Dashboard operador | 6 | P0 - Critical | Planned | [F-056](./planned/F-056-dashboard-operator.md) |
| F-057 | Dashboard supervisor | 6 | P0 - Critical | Planned | [F-057](./planned/F-057-dashboard-supervisor.md) |
| F-058 | Dashboard gerente | 6 | P0 - Critical | Planned | [F-058](./planned/F-058-dashboard-manager.md) |
| F-059 | Dashboard viewer | 3 | P1 - High | Planned | [F-059](./planned/F-059-dashboard-viewer.md) |
| F-060 | Busqueda global (Cmd+K) | 4 | P1 - High | Planned | [F-060](./planned/F-060-global-search.md) |
| F-061 | Gestion de usuarios e invitaciones (CFG-02) | 5 | P0 - Critical | Planned | [F-061](./planned/F-061-user-management.md) |
| F-062 | Optimizacion de performance | 5 | P0 - Critical | Planned | [F-062](./planned/F-062-performance-optimization.md) |
| F-063 | Testing | 8 | P0 - Critical | Planned | [F-063](./planned/F-063-testing.md) |
| F-064 | Documentacion | 3 | P1 - High | Planned | [F-064](./planned/F-064-documentation.md) |

---

## Grafo de Dependencias Cross-Fase

```
Fase 0: Fundacion (F-001 a F-006)
  │
  ├──► Fase 1: Core Loop (F-011 a F-022)
  │      │
  │      ├── F-016/F-017 (Batches) ──────────────────────────► Fase 2
  │      ├── F-022 (Ejecutar Actividad) ─────────────────────► Fase 2
  │      └── F-016/F-017/F-022 ──────────────────────────────► Fase 3
  │
  ├──► Fase 2: Inventario y Calidad (F-026 a F-035)
  │      │
  │      └── F-026 (Stock) ──────────────────────────────────► Fase 3
  │
  ├──► Fase 3: Operaciones y Offline (F-041 a F-050)
  │
  └──► Fase 4: Polish y Lanzamiento (F-056 a F-064)
         (requiere Fases 0-3 completas)
```

## Distribucion Global

### Por Prioridad

| Priority | Label | Count | % |
|----------|-------|-------|---|
| P0 | Critical | ~120 | ~56% |
| P1 | High | ~78 | ~36% |
| P2 | Medium | ~17 | ~8% |
| P3 | Low | 0 | 0% |

### Por Tamano

| Size | Count | % |
|------|-------|---|
| XS | 0 | 0% |
| S | ~60 | ~28% |
| M | ~105 | ~49% |
| L | ~35 | ~16% |
| XL | 0 | 0% |

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have para MVP / bloqueante para la fase |
| P1 | High | Funcionalidad core, necesaria pronto |
| P2 | Medium | Importante pero no bloqueante |
| P3 | Low | Nice-to-have, consideracion futura |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Definida y lista para desarrollo |
| In Progress | En implementacion activa |
| Done | Completada y verificada |
| Deferred | Pospuesta a iteracion futura |
