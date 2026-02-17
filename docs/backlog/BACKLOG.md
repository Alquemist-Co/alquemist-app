# Product Backlog — Alquemist

> Last updated: 2026-02-17

## Summary

- **Total features**: 67
- **Total stories**: 278
- **Fases**: 6 (0-5)
- **Semanas**: 20+
- **Planned**: 100 | **In Progress**: 0 | **Done**: 178

## Resumen por Fase

| Fase | Nombre | Semanas | Features | Stories | Dependencias |
|------|--------|---------|----------|---------|--------------|
| 0 | Fundacion | 1-2 | 7 | 38 | Ninguna |
| 1 | Core Loop (Produccion) | 3-7 | 12 | 55 | Fase 0 |
| 2 | Inventario y Calidad | 8-11 | 10 | 37 | F-016, F-017, F-022 (Fase 1) |
| 3 | Operaciones y Offline | 12-16 | 10 | 42 | Fases 0-1 + F-026 (Fase 2) |
| 4 | Polish y Lanzamiento | 17-20 | 9 | 46 | Todas las fases anteriores |
| 5 | Configuracion, Flujos Operacionales y Calidad | 21+ | 19 | 60 | Fases 0-4 |

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

---

## Fase 2: Inventario y Calidad (Semanas 8-11)

> Indice detallado: [BACKLOG-FASE-2.md](./BACKLOG-FASE-2.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-026 | Stock actual (vista por producto y por zona) | 5 | P0 - Critical | Done | [F-026](./done/F-026-stock-actual.md) |
| F-027 | Catalogo de productos (CRUD) | 4 | P0 - Critical | Done | [F-027](./done/F-027-product-catalog.md) |
| F-028 | Recepcion de compras (INV-01) | 3 | P0 - Critical | Done | [F-028](./done/F-028-purchase-reception.md) |
| F-029 | Log de movimientos de inventario | 3 | P1 - High | Done | [F-029](./done/F-029-inventory-log.md) |
| F-030 | Recetas / BOM (INV-03) | 5 | P0 - Critical | Done | [F-030](./done/F-030-recipes-bom.md) |
| F-031 | Transformaciones / cosecha multi-output (INV-02) | 3 | P0 - Critical | Done | [F-031](./done/F-031-transformations.md) |
| F-032 | Tests de calidad (QUA-01) | 5 | P0 - Critical | Done | [F-032](./done/F-032-quality-tests.md) |
| F-033 | Historial de calidad y tendencias | 2 | P1 - High | Done | [F-033](./done/F-033-quality-history.md) |
| F-034 | Split de batch (BAT-02) | 4 | P0 - Critical | Done | [F-034](./done/F-034-batch-split.md) |
| F-035 | Genealogia visual de batch | 3 | P1 - High | Done | [F-035](./done/F-035-batch-genealogy.md) |

---

## Fase 3: Operaciones y Offline (Semanas 12-16)

> Indice detallado: [BACKLOG-FASE-3.md](./BACKLOG-FASE-3.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-041 | Mapa de facility y grid de zonas | 3 | P1 - High | Done | [F-041](./done/F-041-facility-map.md) |
| F-042 | Detalle de zona con clima actual y batches | 4 | P1 - High | Done | [F-042](./done/F-042-zone-detail.md) |
| F-043 | Posiciones de planta (grid visual) | 3 | P2 - Medium | Done | [F-043](./done/F-043-plant-positions.md) |
| F-044 | Ocupacion planificada (timeline Gantt) | 3 | P2 - Medium | Done | [F-044](./done/F-044-occupancy-gantt.md) |
| F-045 | Monitoreo ambiental real-time (OPS-01) | 5 | P0 - Critical | Done | [F-045](./done/F-045-env-monitoring.md) |
| F-046 | Gestion de sensores | 3 | P1 - High | Done | [F-046](./done/F-046-sensor-management.md) |
| F-047 | Centro de alertas | 5 | P0 - Critical | Done | [F-047](./done/F-047-alert-center.md) |
| F-048 | Costos overhead y COGS completo (OPS-02) | 5 | P1 - High | Done | [F-048](./done/F-048-overhead-costs.md) |
| F-049 | Offline completo | 6 | P0 - Critical | Done | [F-049](./done/F-049-offline-complete.md) |
| F-050 | Supabase Realtime | 5 | P1 - High | Done | [F-050](./done/F-050-realtime.md) |

---

## Fase 4: Polish y Lanzamiento (Semanas 17-20)

> Indice detallado: [BACKLOG-FASE-4.md](./BACKLOG-FASE-4.md)

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-056 | Dashboard operador | 6 | P0 - Critical | Done | [F-056](./done/F-056-dashboard-operator.md) |
| F-057 | Dashboard supervisor | 6 | P0 - Critical | Planned | [F-057](./planned/F-057-dashboard-supervisor.md) |
| F-058 | Dashboard gerente | 6 | P0 - Critical | Planned | [F-058](./planned/F-058-dashboard-manager.md) |
| F-059 | Dashboard viewer | 3 | P1 - High | Planned | [F-059](./planned/F-059-dashboard-viewer.md) |
| F-060 | Busqueda global (Cmd+K) | 4 | P1 - High | Planned | [F-060](./planned/F-060-global-search.md) |
| F-061 | Gestion de usuarios e invitaciones (CFG-02) | 5 | P0 - Critical | Planned | [F-061](./planned/F-061-user-management.md) |
| F-062 | Optimizacion de performance | 5 | P0 - Critical | Planned | [F-062](./planned/F-062-performance-optimization.md) |
| F-063 | Testing | 8 | P0 - Critical | Planned | [F-063](./planned/F-063-testing.md) |
| F-064 | Documentacion | 3 | P1 - High | Planned | [F-064](./planned/F-064-documentation.md) |

---

## Fase 5: Configuracion, Flujos Operacionales y Calidad (Semanas 21+)

> Indice detallado: [BACKLOG-FASE-5.md](./BACKLOG-FASE-5.md)

### Bloque A: CRUD de Configuracion

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-070 | CRUD de Facilities | 3 | P1 - High | Planned | [F-070](./planned/F-070-facility-crud.md) |
| F-071 | CRUD de Zonas | 4 | P1 - High | Planned | [F-071](./planned/F-071-zone-crud.md) |
| F-072 | CRUD de Proveedores | 3 | P1 - High | Planned | [F-072](./planned/F-072-supplier-crud.md) |
| F-073 | Gestion de Unidades de Medida | 3 | P1 - High | Planned | [F-073](./planned/F-073-units-management.md) |
| F-074 | Gestion de Categorias de Recursos | 3 | P1 - High | Planned | [F-074](./planned/F-074-category-management.md) |
| F-075 | CRUD de Tipos de Actividad | 2 | P1 - High | Planned | [F-075](./planned/F-075-activity-types-crud.md) |
| F-076 | CRUD de Cultivation Schedules | 5 | P0 - Critical | Planned | [F-076](./planned/F-076-cultivation-schedules.md) |
| F-077 | Configuracion de Empresa | 3 | P1 - High | Planned | [F-077](./planned/F-077-company-settings.md) |

### Bloque B: Flujos Operacionales

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-080 | Transferencia de Stock entre Zonas | 3 | P0 - Critical | Planned | [F-080](./planned/F-080-stock-transfer.md) |
| F-081 | Ajuste de Stock y Registro de Waste | 3 | P0 - Critical | Planned | [F-081](./planned/F-081-stock-adjustment-waste.md) |
| F-082 | Hold, Cancel y Zone Change de Batch | 4 | P0 - Critical | Planned | [F-082](./planned/F-082-batch-hold-cancel-move.md) |
| F-083 | Creacion Manual de Batch | 3 | P1 - High | Planned | [F-083](./planned/F-083-manual-batch.md) |
| F-084 | Observaciones Rapidas con Fotos | 3 | P0 - Critical | Planned | [F-084](./planned/F-084-quick-observations.md) |
| F-085 | Calendario de Actividades (Supervisor) | 4 | P1 - High | Planned | [F-085](./planned/F-085-activity-calendar.md) |
| F-086 | Edicion de Perfil de Usuario | 2 | P1 - High | Planned | [F-086](./planned/F-086-user-profile.md) |
| F-087 | Cambio de Facility Activa | 2 | P0 - Critical | Planned | [F-087](./planned/F-087-facility-switch.md) |

### Bloque D: Calidad Transversal

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-088 | Push Notifications | 3 | P1 - High | Planned | [F-088](./planned/F-088-push-notifications.md) |
| F-089 | Hardening IoT Webhook | 3 | P1 - High | Planned | [F-089](./planned/F-089-iot-hardening.md) |
| F-090 | Accesibilidad y UX Mejorada | 4 | P2 - Medium | Planned | [F-090](./planned/F-090-accessibility.md) |

---

## Grafo de Dependencias Cross-Fase

```
Fase 0: Fundacion (F-001 a F-007)
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
  ├──► Fase 4: Polish y Lanzamiento (F-056 a F-064)
  │      (requiere Fases 0-3 completas)
  │
  └──► Fase 5: Configuracion, Flujos y Calidad (F-070 a F-090)
         (requiere Fases 0-4 completas)
         │
         ├── Bloque A (CRUDs F-070 a F-077) ──► prerrequisito de Bloque B
         ├── Bloque B (Flujos F-080 a F-087) ──► depende de Bloque A
         └── Bloque D (Calidad F-088 a F-090) ──► independiente, aplica sobre todo
```

## Distribucion Global

### Por Prioridad

| Priority | Label | Count | % |
|----------|-------|-------|---|
| P0 | Critical | ~157 | ~56% |
| P1 | High | ~100 | ~36% |
| P2 | Medium | ~21 | ~8% |
| P3 | Low | 0 | 0% |

### Por Tamano

| Size | Count | % |
|------|-------|---|
| XS | 0 | 0% |
| S | ~87 | ~31% |
| M | ~137 | ~49% |
| L | ~36 | ~13% |
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
