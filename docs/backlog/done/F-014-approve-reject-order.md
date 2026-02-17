# F-014: Aprobar/Rechazar Orden y Crear Batch

## Overview

Completa el ciclo de la orden de produccion: el gerente o admin aprueba una orden en estado 'draft', lo que genera automaticamente un batch con codigo unico vinculado a la orden. Tambien permite rechazar una orden con razon. La aprobacion valida stock disponible del producto de entrada si aplica, y la creacion del batch establece la fase inicial y la zona del batch.

## User Personas

- **Gerente**: Aprueba o rechaza ordenes de produccion. Necesita ver claramente si hay stock disponible para iniciar.
- **Admin**: Mismos permisos que el gerente para aprobacion/rechazo.
- **Supervisor**: Consulta ordenes aprobadas para preparar zonas. Solo lectura.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-014-001 | Aprobar orden y crear batch automaticamente | L | P0 | Done |
| US-014-002 | Rechazar orden con razon obligatoria | S | P0 | Done |
| US-014-003 | Validacion de stock para aprobacion | M | P1 | Done |

---

# US-014-001: Aprobar orden y crear batch automaticamente

## User Story

**As a** gerente,
**I want** aprobar una orden de produccion en estado 'draft', lo que automaticamente crea un batch con codigo unico, lo vincula a la orden, y lo posiciona en la fase de entrada seleccionada,
**So that** el equipo de operaciones pueda comenzar a trabajar con el batch y las actividades se puedan programar.

## Acceptance Criteria

### Scenario 1: Aprobar orden exitosamente y crear batch
- **Given** existe una orden OP-2026-001 en status='draft' con cultivar Gelato, entry_phase=Germinacion, zona=Sala Propagacion
- **When** el gerente hace clic en "Aprobar" en el detalle de la orden
- **Then** el sistema: (1) actualiza order.status a 'approved' y luego a 'in_progress', (2) crea un batch con code auto-generado (ej: PROP-2026-001), cultivar_id heredado, current_phase_id=entry_phase, zone_id=zona de la primera fase, (3) marca la primera production_order_phase como 'in_progress', (4) muestra toast "Orden aprobada. Batch PROP-2026-001 creado." con link al batch

### Scenario 2: Generacion de batch_code con formato correcto
- **Given** la facility tiene code="PROP" y el anio es 2026
- **When** se aprueba la primera orden del anio
- **Then** el batch_code generado sigue el formato {FACILITY_CODE}-{YEAR}-{SEQUENCE}: "PROP-2026-001"

### Scenario 3: Intentar aprobar orden ya aprobada
- **Given** la orden OP-2026-001 ya tiene status='approved' o 'in_progress'
- **When** otro gerente intenta aprobar la misma orden (concurrencia)
- **Then** el sistema retorna error 409 "Orden ya aprobada" y no crea un batch duplicado

### Scenario 4: Intentar aprobar orden cancelada
- **Given** la orden OP-2026-001 tiene status='cancelled'
- **When** el gerente intenta aprobar
- **Then** el sistema retorna error 400 "No se puede aprobar una orden cancelada"

### Scenario 5: El batch aparece en el detalle de la orden
- **Given** la orden fue aprobada exitosamente y el batch fue creado
- **When** el gerente ve el detalle de la orden
- **Then** la seccion "Batch vinculado" muestra el codigo del batch con link directo al detalle del batch

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para flujo de aprobacion
- [ ] Tests de concurrencia (dos aprobaciones simultaneas)
- [ ] Generacion de batch_code unica verificada
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `approveOrder(orderId)` en `lib/actions/order.actions.ts`
  - Validar order.status === 'draft'
  - UPDATE production_orders SET status='approved' luego 'in_progress'
  - INSERT batches con datos de la orden
  - UPDATE primera production_order_phase SET status='in_progress'
  - Generacion de batch_code: query MAX sequence por facility y anio, incrementar
- **Zod Schema**: `approveOrderSchema` — solo order_id UUID
- **Tablas**: production_orders, batches, production_order_phases
- **Concurrencia**: usar optimistic locking o check de status antes de UPDATE

## UI/UX Notes
- Boton "Aprobar" prominente en el header del detalle de la orden (solo visible si status='draft')
- Modal de confirmacion: "Al aprobar se creara un batch para esta orden. Continuar?"
- Tras aprobacion: redirect al detalle de la orden mostrando el batch vinculado
- Badge de estado actualizado inmediatamente (optimistic update)

## Dependencies
- F-013 (la orden debe existir en estado draft)
- Zonas configuradas (Fase 0)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-014-002: Rechazar orden con razon obligatoria

## User Story

**As a** gerente,
**I want** rechazar una orden de produccion en estado 'draft' proporcionando una razon obligatoria,
**So that** quede registro de por que se cancelo la planificacion y el equipo pueda ajustar sus planes.

## Acceptance Criteria

### Scenario 1: Rechazar orden con razon
- **Given** existe una orden OP-2026-002 en status='draft'
- **When** el gerente hace clic en "Rechazar", ingresa la razon "Cultivar descontinuado por baja demanda" y confirma
- **Then** el sistema actualiza order.status='cancelled', guarda la razon en el campo notes, y muestra toast "Orden OP-2026-002 rechazada"

### Scenario 2: Intentar rechazar sin razon
- **Given** el gerente hizo clic en "Rechazar" y se muestra el dialog de razon
- **When** intenta confirmar sin escribir una razon
- **Then** el boton "Confirmar rechazo" permanece deshabilitado y el campo muestra "La razon es obligatoria"

### Scenario 3: Rechazar orden que no esta en draft
- **Given** la orden tiene status='in_progress' (ya fue aprobada y tiene batch activo)
- **When** el gerente intenta rechazar
- **Then** el sistema retorna error 400 "Solo se pueden rechazar ordenes en estado borrador"

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios escritos y pasando
- [ ] Razon registrada en notes verificada
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `rejectOrder(orderId, reason)` en `lib/actions/order.actions.ts`
  - Validar order.status === 'draft'
  - UPDATE production_orders SET status='cancelled', notes=reason
- No crea batch ni modifica inventario
- **Tablas**: production_orders

## UI/UX Notes
- Boton "Rechazar" estilo secundario/destructivo junto al boton "Aprobar"
- Dialog/bottom sheet con textarea para la razon (min 5 caracteres)
- Boton "Confirmar rechazo" en rojo

## Dependencies
- F-013

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-014-003: Validacion de stock para aprobacion

## User Story

**As a** gerente,
**I want** que el sistema valide automaticamente si hay stock suficiente del producto de entrada antes de aprobar una orden,
**So that** no se cree un batch que no pueda iniciar por falta de material (semillas, clones, flor humeda para procesamiento).

## Acceptance Criteria

### Scenario 1: Stock suficiente permite aprobacion
- **Given** la orden requiere 50 semillas de Gelato y hay 80 disponibles en la zona asignada
- **When** el gerente intenta aprobar
- **Then** la aprobacion procede normalmente sin warnings de stock

### Scenario 2: Stock insuficiente bloquea aprobacion
- **Given** la orden requiere 50 semillas de Gelato pero solo hay 20 disponibles en la zona
- **When** el gerente intenta aprobar
- **Then** el sistema muestra error "Stock insuficiente de Semillas Gelato en Sala Propagacion. Disponible: 20, Requerido: 50" y bloquea la aprobacion

### Scenario 3: Orden sin producto de entrada (primera fase del ciclo con semillas propias)
- **Given** la orden tiene entry_phase como primera fase del crop_type y no tiene initial_product_id definido
- **When** el gerente intenta aprobar
- **Then** la validacion de stock se omite (no hay producto de entrada que validar) y la aprobacion procede normalmente

### Scenario 4: Stock en otra zona pero no en la asignada
- **Given** hay 50 semillas disponibles en "Almacen General" pero 0 en "Sala Propagacion" (zona asignada)
- **When** el gerente intenta aprobar
- **Then** el sistema muestra warning "Stock disponible en Almacen General (50 unidades) pero no en la zona asignada Sala Propagacion. Se requiere transferencia previa." y bloquea aprobacion

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Tests unitarios para los 4 escenarios de stock
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Validacion dentro de `approveOrder`: si order.initial_product_id existe, query inventory_items WHERE product_id AND zone_id AND quantity_available >= initial_quantity
- Si no hay initial_product_id y entry_phase es la primera del crop_type: skip validacion
- Error con detalle: producto, zona, disponible, requerido (para AppError.details)

## UI/UX Notes
- Error de stock mostrado en modal de confirmacion de aprobacion
- Incluir link a inventario para verificar disponibilidad
- Si hay stock en otra zona: sugerir "Ir a transferencias" como accion alternativa

## Dependencies
- US-014-001
- Inventario basico configurado (items en stock)

## Estimation
- **Size**: M
- **Complexity**: Medium
