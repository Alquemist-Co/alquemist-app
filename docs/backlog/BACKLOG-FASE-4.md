# Product Backlog - Fase 4: Polish y Lanzamiento

> Last updated: 2026-02-16

## Summary
- **Total features**: 9
- **Total stories**: 44
- **Planned**: 44 | **In Progress**: 0 | **Done**: 0

## Fase
- **Fase**: 4 - Polish y Lanzamiento
- **Semanas**: 17-20
- **Dependencias cross-fase**: Requiere todas las fases anteriores (0-3) completadas para que los dashboards tengan datos reales, la busqueda global tenga entidades indexables, y los tests E2E puedan verificar flujos completos.

## Features

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-056 | Dashboard Operador | 6 | P0 - Critical | Planned | [F-056](./planned/F-056-dashboard-operator.md) |
| F-057 | Dashboard Supervisor | 6 | P0 - Critical | Planned | [F-057](./planned/F-057-dashboard-supervisor.md) |
| F-058 | Dashboard Gerente | 6 | P0 - Critical | Planned | [F-058](./planned/F-058-dashboard-manager.md) |
| F-059 | Dashboard Viewer | 3 | P1 - High | Planned | [F-059](./planned/F-059-dashboard-viewer.md) |
| F-060 | Busqueda Global (Cmd+K) | 4 | P1 - High | Planned | [F-060](./planned/F-060-global-search.md) |
| F-061 | Gestion de Usuarios e Invitaciones | 5 | P0 - Critical | Planned | [F-061](./planned/F-061-user-management.md) |
| F-062 | Optimizacion de Performance | 5 | P0 - Critical | Planned | [F-062](./planned/F-062-performance-optimization.md) |
| F-063 | Testing | 8 | P0 - Critical | Planned | [F-063](./planned/F-063-testing.md) |
| F-064 | Documentacion | 3 | P1 - High | Planned | [F-064](./planned/F-064-documentation.md) |

## Resumen de Stories por Feature

### F-056: Dashboard Operador (6 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-056-001 | Header contextual con saludo, fecha y facility | S | P0 |
| US-056-002 | Stats strip con contadores de pendientes, completadas y alertas | M | P0 |
| US-056-003 | Lista de actividades del dia con cards ordenadas por hora | M | P0 |
| US-056-004 | Seccion de alertas del operador | S | P1 |
| US-056-005 | Indicador de estado offline y pull-to-refresh | M | P0 |
| US-056-006 | FAB con acciones rapidas | M | P1 |

### F-057: Dashboard Supervisor (6 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-057-001 | Header con titulo, stats de zonas y filtro por facility | S | P0 |
| US-057-002 | Stats strip de supervision | S | P0 |
| US-057-003 | Grid de zonas con health indicator y sparklines | L | P0 |
| US-057-004 | Panel de equipo con progreso de operadores | M | P1 |
| US-057-005 | Timeline de actividades por hora | M | P1 |
| US-057-006 | Quick actions del supervisor | S | P1 |

### F-058: Dashboard Gerente (6 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-058-001 | Header con selector de periodo y facility | S | P0 |
| US-058-002 | KPIs principales con tendencias | M | P0 |
| US-058-003 | Grafico de rendimiento yield real vs esperado | M | P0 |
| US-058-004 | Panel de ordenes en progreso | M | P1 |
| US-058-005 | Mini-panel de costos con distribucion | M | P1 |
| US-058-006 | Acciones rapidas del gerente | S | P1 |

### F-059: Dashboard Viewer (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-059-001 | Header read-only con periodo y facility | S | P1 |
| US-059-002 | KPIs de produccion read-only | M | P1 |
| US-059-003 | Estado de produccion simplificado | M | P1 |

### F-060: Busqueda Global - Cmd+K (4 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-060-001 | Modal de busqueda con input y shortcut Cmd+K | M | P0 |
| US-060-002 | Busqueda multi-entidad con resultados agrupados | L | P0 |
| US-060-003 | Historial de busquedas recientes | S | P2 |
| US-060-004 | Navegacion desde resultado al detalle | S | P0 |

### F-061: Gestion de Usuarios e Invitaciones (5 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-061-001 | Lista de usuarios con filtros y busqueda | M | P0 |
| US-061-002 | Editor de usuario: datos, rol, facility y permisos | M | P0 |
| US-061-003 | Invitar usuario por email | M | P0 |
| US-061-004 | Desactivar usuario con reasignacion | M | P1 |
| US-061-005 | Validaciones de negocio de roles | S | P0 |

### F-062: Optimizacion de Performance (5 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-062-001 | Lighthouse audit inicial y baseline | S | P0 |
| US-062-002 | Code splitting por modulo | M | P0 |
| US-062-003 | Lazy loading de charts e imagenes | M | P0 |
| US-062-004 | Virtual scrolling para listas grandes | M | P1 |
| US-062-005 | Optimizacion de imagenes y bundle | M | P0 |

### F-063: Testing (8 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-063-001 | Configuracion de Vitest y estructura de tests | S | P0 |
| US-063-002 | Unit tests para yield calculator | M | P0 |
| US-063-003 | Unit tests para cost allocation | M | P0 |
| US-063-004 | Unit tests para validacion Zod schemas | M | P0 |
| US-063-005 | Unit tests para sync queue logic | M | P1 |
| US-063-006 | E2E: flujo completo orden a inventario | L | P0 |
| US-063-007 | Visual regression para design system | M | P2 |
| US-063-008 | Configuracion CI/CD con tests automaticos | S | P0 |

### F-064: Documentacion (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-064-001 | README con setup rapido | M | P0 |
| US-064-002 | Guia de onboarding para desarrolladores | M | P1 |
| US-064-003 | Runbook de operaciones | M | P1 |

## Distribucion por Tamano

| Size | Count | % |
|------|-------|---|
| XS | 0 | 0% |
| S | 12 | 27% |
| M | 28 | 64% |
| L | 3 | 7% |
| XL | 0 | 0% |

## Distribucion por Prioridad

| Priority | Count | % |
|----------|-------|---|
| P0 - Critical | 27 | 61% |
| P1 - High | 15 | 34% |
| P2 - Medium | 2 | 5% |
| P3 - Low | 0 | 0% |

## Plan de Ejecucion Sugerido

### Semana 17: Dashboards core + Testing setup
- F-056: US-056-001 a US-056-003 (Dashboard Operador core)
- F-057: US-057-001 a US-057-002 (Dashboard Supervisor core)
- F-063: US-063-001 (Setup testing)
- F-062: US-062-001 (Lighthouse baseline)

### Semana 18: Dashboards completos + Busqueda + Performance
- F-056: US-056-004 a US-056-006 (Dashboard Operador complementos)
- F-057: US-057-003 a US-057-006 (Dashboard Supervisor complementos)
- F-058: US-058-001 a US-058-006 (Dashboard Gerente completo)
- F-059: US-059-001 a US-059-003 (Dashboard Viewer completo)
- F-060: US-060-001 a US-060-002 (Busqueda Global core)

### Semana 19: Usuarios + Performance + Testing
- F-061: US-061-001 a US-061-005 (Gestion de Usuarios completo)
- F-060: US-060-003 a US-060-004 (Busqueda complementos)
- F-062: US-062-002 a US-062-005 (Performance optimizations)
- F-063: US-063-002 a US-063-005 (Unit tests)

### Semana 20: E2E + CI/CD + Documentacion + Polish final
- F-063: US-063-006 a US-063-008 (E2E, visual regression, CI/CD)
- F-064: US-064-001 a US-064-003 (Documentacion completa)
- Lighthouse audit final y ajustes

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have for launch. Bloquea el lanzamiento si no esta listo. |
| P1 | High | Core functionality needed for complete experience. |
| P2 | Medium | Important but not blocking launch. |
| P3 | Low | Nice-to-have, puede esperar a post-launch. |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Defined and ready for development |
| In Progress | Currently being implemented |
| Done | Completed and verified |
| Deferred | Postponed to a future iteration |
