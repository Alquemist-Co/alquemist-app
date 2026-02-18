# Product Backlog - Fase 5: Configuracion, Flujos Operacionales y Calidad

> Last updated: 2026-02-18

## Summary
- **Total features**: 19
- **Total stories**: 60
- **Planned**: 0 | **In Progress**: 0 | **Done**: 60

## Fase
- **Fase**: 5 - Configuracion, Flujos Operacionales y Calidad
- **Semanas**: 21+
- **Dependencias cross-fase**: Requiere Fases 0-4 completadas. Los CRUDs de configuracion (F-070 a F-077) son prerrequisito para flujos operacionales (F-080 a F-087). Las features de calidad transversal (F-088 a F-090) se aplican sobre todo lo anterior.

## Features

### Bloque A: CRUD de Configuracion

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-070 | CRUD de Facilities | 3 | P1 - High | Done | [F-070](./done/F-070-facility-crud.md) |
| F-071 | CRUD de Zonas | 4 | P1 - High | Done | [F-071](./done/F-071-zone-crud.md) |
| F-072 | CRUD de Proveedores | 3 | P1 - High | Done | [F-072](./done/F-072-supplier-crud.md) |
| F-073 | Gestion de Unidades de Medida | 3 | P1 - High | Done | [F-073](./done/F-073-units-management.md) |
| F-074 | Gestion de Categorias de Recursos | 3 | P1 - High | Done | [F-074](./done/F-074-category-management.md) |
| F-075 | CRUD de Tipos de Actividad | 2 | P1 - High | Done | [F-075](./done/F-075-activity-types-crud.md) |
| F-076 | CRUD de Cultivation Schedules | 5 | P0 - Critical | Done | [F-076](./done/F-076-cultivation-schedules.md) |
| F-077 | Configuracion de Empresa | 3 | P1 - High | Done | [F-077](./done/F-077-company-settings.md) |

### Bloque B: Flujos Operacionales

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-080 | Transferencia de Stock entre Zonas | 3 | P0 - Critical | Done | [F-080](./done/F-080-stock-transfer.md) |
| F-081 | Ajuste de Stock y Registro de Waste | 3 | P0 - Critical | Done | [F-081](./done/F-081-stock-adjustment-waste.md) |
| F-082 | Hold, Cancel y Zone Change de Batch | 4 | P0 - Critical | Done | [F-082](./done/F-082-batch-hold-cancel-move.md) |
| F-083 | Creacion Manual de Batch | 3 | P1 - High | Done | [F-083](./done/F-083-manual-batch.md) |
| F-084 | Observaciones Rapidas con Fotos | 3 | P0 - Critical | Done | [F-084](./done/F-084-quick-observations.md) |
| F-085 | Calendario de Actividades (Supervisor) | 4 | P1 - High | Done | [F-085](./done/F-085-activity-calendar.md) |
| F-086 | Edicion de Perfil de Usuario | 2 | P1 - High | Done | [F-086](./done/F-086-user-profile.md) |
| F-087 | Cambio de Facility Activa | 2 | P0 - Critical | Done | [F-087](./done/F-087-facility-switch.md) |

### Bloque D: Calidad Transversal

| ID | Feature | Stories | Priority | Status | Doc |
|----|---------|---------|----------|--------|-----|
| F-088 | Push Notifications | 3 | P1 - High | Done | [F-088](./done/F-088-push-notifications.md) |
| F-089 | Hardening IoT Webhook | 3 | P1 - High | Done | [F-089](./done/F-089-iot-hardening.md) |
| F-090 | Accesibilidad y UX Mejorada | 4 | P2 - Medium | Done | [F-090](./done/F-090-accessibility.md) |

## Resumen de Stories por Feature

### F-070: CRUD de Facilities (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-070-001 | Lista de facilities con stats derivados | S | P0 |
| US-070-002 | Crear y editar facility | M | P0 |
| US-070-003 | Desactivar facility con validacion de zonas activas | S | P1 |

### F-071: CRUD de Zonas (4 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-071-001 | Lista de zonas con filtros por facility y status | S | P0 |
| US-071-002 | Crear y editar zona | M | P0 |
| US-071-003 | Gestionar estructuras de zona (sub-CRUD) | M | P1 |
| US-071-004 | Desactivar zona con validacion de batches activos | S | P1 |

### F-072: CRUD de Proveedores (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-072-001 | Lista de proveedores con busqueda | S | P0 |
| US-072-002 | Crear y editar proveedor | S | P0 |
| US-072-003 | Desactivar proveedor con validacion | S | P1 |

### F-073: Gestion de Unidades de Medida (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-073-001 | Lista de unidades agrupadas por dimension | S | P0 |
| US-073-002 | Crear y editar unidad de medida | S | P0 |
| US-073-003 | Validacion de conversiones misma dimension | S | P1 |

### F-074: Gestion de Categorias de Recursos (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-074-001 | Lista jerarquica de categorias | S | P0 |
| US-074-002 | Crear y editar categoria con selector de padre | M | P0 |
| US-074-003 | Desactivar categoria con validacion de productos | S | P1 |

### F-075: CRUD de Tipos de Actividad (2 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-075-001 | Lista de tipos de actividad | S | P0 |
| US-075-002 | Crear, editar y desactivar tipo de actividad | S | P0 |

### F-076: CRUD de Cultivation Schedules (5 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-076-001 | Lista de cultivation schedules | S | P0 |
| US-076-002 | Crear cultivation schedule (wizard) | L | P0 |
| US-076-003 | Editar configuracion de fases y templates | M | P0 |
| US-076-004 | Preview de actividades generadas | S | P1 |
| US-076-005 | Desactivar schedule con validacion de batches | S | P1 |

### F-077: Configuracion de Empresa (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-077-001 | Ver configuracion actual de la empresa | S | P0 |
| US-077-002 | Editar datos basicos de la empresa | M | P0 |
| US-077-003 | Gestionar features habilitados | S | P1 |

### F-080: Transferencia de Stock entre Zonas (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-080-001 | Seleccionar lote y cantidad a transferir | M | P0 |
| US-080-002 | Confirmacion con preview del movimiento | S | P0 |
| US-080-003 | Edge cases: lote parcial, lote agotado, validaciones | S | P1 |

### F-081: Ajuste de Stock y Registro de Waste (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-081-001 | Ajuste de stock con razon obligatoria | M | P0 |
| US-081-002 | Registro de waste (merma) | M | P0 |
| US-081-003 | Filtro de ajustes y waste en log de movimientos | S | P1 |

### F-082: Hold, Cancel y Zone Change de Batch (4 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-082-001 | Poner batch en hold con razon obligatoria | M | P0 |
| US-082-002 | Resumir batch desde hold | S | P0 |
| US-082-003 | Cancelar batch con confirmacion | M | P1 |
| US-082-004 | Cambiar zona de batch sin avance de fase | S | P1 |

### F-083: Creacion Manual de Batch (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-083-001 | Formulario de creacion de batch manual | M | P0 |
| US-083-002 | Asignacion de schedule al batch manual | S | P1 |
| US-083-003 | Validaciones y generacion de codigo | S | P0 |

### F-084: Observaciones Rapidas con Fotos (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-084-001 | Formulario de observacion con selector de batch | M | P0 |
| US-084-002 | Captura y compresion de fotos | M | P0 |
| US-084-003 | Generacion de alertas por severidad | S | P1 |

### F-085: Calendario de Actividades (4 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-085-001 | Vista semanal del calendario | M | P0 |
| US-085-002 | Vista mensual del calendario | M | P1 |
| US-085-003 | Reprogramar actividad (drag desktop / tap mobile) | M | P0 |
| US-085-004 | Filtros y navegacion temporal | S | P1 |

### F-086: Edicion de Perfil de Usuario (2 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-086-001 | Ver y editar datos del perfil | M | P0 |
| US-086-002 | Cambiar contrasena | S | P0 |

### F-087: Cambio de Facility Activa (2 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-087-001 | Selector de facility en la UI | M | P0 |
| US-087-002 | Filtrado global de datos por facility activa | M | P0 |

### F-088: Push Notifications (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-088-001 | Suscripcion y permisos de push | M | P0 |
| US-088-002 | Envio de push por alerta critica | M | P0 |
| US-088-003 | Gestion de suscripciones del usuario | S | P1 |

### F-089: Hardening IoT Webhook (3 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-089-001 | Rate limiting por API key | M | P0 |
| US-089-002 | Validacion avanzada y idempotencia | M | P0 |
| US-089-003 | Ingestion por lotes (batch endpoint) | M | P1 |

### F-090: Accesibilidad y UX Mejorada (4 stories)
| ID | Story | Size | Priority |
|----|-------|------|----------|
| US-090-001 | Focus traps y navegacion por teclado | M | P0 |
| US-090-002 | ARIA landmarks y live regions | M | P1 |
| US-090-003 | Soporte para reduced motion | S | P1 |
| US-090-004 | Modo high contrast | M | P2 |

## Distribucion por Tamano

| Size | Count | % |
|------|-------|---|
| XS | 0 | 0% |
| S | 27 | 45% |
| M | 32 | 53% |
| L | 1 | 2% |
| XL | 0 | 0% |

## Distribucion por Prioridad

| Priority | Count | % |
|----------|-------|---|
| P0 - Critical | 37 | 62% |
| P1 - High | 22 | 37% |
| P2 - Medium | 1 | 2% |
| P3 - Low | 0 | 0% |

## Orden de Ejecucion Recomendado

### Sprint 1: CRUD de Configuracion base
- F-077: Configuracion de empresa (prerequisito para todo)
- F-070: CRUD de Facilities
- F-071: CRUD de Zonas
- F-075: CRUD de Tipos de Actividad

### Sprint 2: CRUD de Configuracion complementario
- F-072: CRUD de Proveedores
- F-073: Gestion de Unidades de Medida
- F-074: Gestion de Categorias de Recursos
- F-076: CRUD de Cultivation Schedules

### Sprint 3: Flujos operacionales core
- F-080: Transferencia de stock
- F-081: Ajuste de stock y waste
- F-082: Hold, cancel y zone change de batch
- F-087: Cambio de facility activa

### Sprint 4: Flujos operacionales complementarios
- F-083: Creacion manual de batch
- F-084: Observaciones rapidas con fotos
- F-085: Calendario de actividades
- F-086: Edicion de perfil de usuario

### Sprint 5: Calidad transversal
- F-088: Push notifications
- F-089: Hardening IoT webhook
- F-090: Accesibilidad y UX mejorada

## Priority Definitions

| Priority | Label | Description |
|----------|-------|-------------|
| P0 | Critical | Must-have for production readiness. Bloquea adopcion real por usuarios. |
| P1 | High | Core functionality for self-service. Sin esto, requiere acceso directo a DB. |
| P2 | Medium | Important for compliance and usability. |
| P3 | Low | Nice-to-have, puede esperar a siguiente iteracion. |

## Status Definitions

| Status | Description |
|--------|-------------|
| Planned | Defined and ready for development |
| In Progress | Currently being implemented |
| Done | Completed and verified |
| Deferred | Postponed to a future iteration |
