# Product Backlog — Fase 3: Operaciones y Offline

> Last updated: 2026-02-16

## Resumen de Fase

**Fase 3** cubre las semanas 12-16 del roadmap. Su objetivo es completar los modulos de Areas, Operaciones (sensores, alertas, costos), y la infraestructura offline-first y realtime que permiten al operador trabajar sin conexion y al supervisor recibir cambios en tiempo real.

- **Total features**: 10
- **Total stories**: 42
- **Planned**: 0 | **In Progress**: 42 | **Done**: 0

## Dependencias Cross-Fase

| Dependencia | Fase | Descripcion |
|---|---|---|
| Fase 0 completa | 0 | Auth, layout, design system, schema DB, PWA basico |
| F-016 / F-017 (Batches) | 1 | CRUD de batches, avance de fase, split |
| F-022 (Actividades) | 1 | Ejecucion de actividades, scheduled_activities |
| F-026 (Inventario) | 2 | Stock, transacciones, recetas |

## Features

| ID | Feature | Stories | Prioridad | Estado | Doc |
|----|---------|---------|-----------|--------|-----|
| F-041 | Mapa de facility y grid de zonas | 3 | P1 - High | In Progress | [F-041](./in-progress/F-041-facility-map.md) |
| F-042 | Detalle de zona con clima actual y batches | 4 | P1 - High | In Progress | [F-042](./in-progress/F-042-zone-detail.md) |
| F-043 | Posiciones de planta (grid visual) | 3 | P2 - Medium | In Progress | [F-043](./in-progress/F-043-plant-positions.md) |
| F-044 | Ocupacion planificada (timeline Gantt) | 3 | P2 - Medium | In Progress | [F-044](./in-progress/F-044-occupancy-gantt.md) |
| F-045 | Monitoreo ambiental real-time | 5 | P0 - Critical | In Progress | [F-045](./in-progress/F-045-env-monitoring.md) |
| F-046 | Gestion de sensores | 3 | P1 - High | In Progress | [F-046](./in-progress/F-046-sensor-management.md) |
| F-047 | Centro de alertas | 5 | P0 - Critical | In Progress | [F-047](./in-progress/F-047-alert-center.md) |
| F-048 | Costos overhead y COGS completo | 5 | P1 - High | In Progress | [F-048](./in-progress/F-048-overhead-costs.md) |
| F-049 | Offline completo | 6 | P0 - Critical | In Progress | [F-049](./in-progress/F-049-offline-complete.md) |
| F-050 | Supabase Realtime | 5 | P1 - High | In Progress | [F-050](./in-progress/F-050-realtime.md) |

## Definiciones de Prioridad

| Prioridad | Etiqueta | Descripcion |
|-----------|----------|-------------|
| P0 | Critical | Imprescindible para la fase — bloqueante |
| P1 | High | Funcionalidad core, necesaria pronto |
| P2 | Medium | Importante pero no bloqueante |
| P3 | Low | Deseable, consideracion futura |

## Definiciones de Estado

| Estado | Descripcion |
|--------|-------------|
| Planned | Definido y listo para desarrollo |
| In Progress | En implementacion |
| Done | Completado y verificado |
| Deferred | Pospuesto a iteracion futura |

## Orden de Implementacion Sugerido

1. **Semana 12**: F-046 (Sensores) + F-045 (Monitoreo ambiental) — base de datos IoT
2. **Semana 13**: F-041 (Mapa facility) + F-042 (Detalle zona) + F-043 (Posiciones)
3. **Semana 14**: F-047 (Centro alertas) + F-044 (Ocupacion Gantt)
4. **Semana 15**: F-048 (Costos overhead) + F-049 (Offline completo)
5. **Semana 16**: F-050 (Realtime) + integracion y testing cross-feature
