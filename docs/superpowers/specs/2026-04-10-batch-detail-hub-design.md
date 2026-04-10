# Batch Detail Hub — Design Spec

## Objetivo

Rediseñar la página de detalle del lote (`/production/batches/[id]`) como **hub central** donde supervisores, managers, operadores y admins pueden consultar y gestionar todo lo relacionado con un lote sin navegar a otras páginas.

## Principios de diseño

1. **Todo en un lugar** — No se navega fuera de batch detail para actuar sobre el lote
2. **Actividades como eje** — Toda acción que modifica el estado del lote (incluidas transiciones de fase, hold y cancel) se registra como actividad
3. **Progressive disclosure** — Tabs por dominio, contenido agrupado por fase, expandable rows para detalle
4. **Roles contextuales** — Acciones visibles según rol y estado del lote
5. **Fidelidad al modelo de datos** — Sin campos ni funciones inventados; todo verificado contra las migraciones

## Decisiones clave

### Transiciones de fase = consecuencia de actividades

El campo `activity_templates.triggers_phase_change_id` (FK → production_phases) define que la fase avanza al completar una actividad específica. El edge function `execute-activity` ya implementa esta lógica: si el template tiene `triggers_phase_change_id`, llama automáticamente a `fn_transition_batch_phase`.

**Cambio:** Eliminar el botón standalone de transición de fase. La transición ocurre al ejecutar la actividad correspondiente (ej: "Cosecha" completa → batch avanza a "Secado").

### Hold/Cancel como activity types

Crear nuevos registros en `activity_types`:
- "Pausa de lote" (category: 'control') — cambia `batches.status` a `on_hold`
- "Cancelación de lote" (category: 'control') — cambia `batches.status` a `cancelled`
- "Reactivación de lote" (category: 'control') — cambia `batches.status` a `active`

Estos requieren templates con lógica en `execute-activity` para actualizar el status del batch (extensión al edge function existente).

### Operadores pueden crear y capturar tests de calidad

Cambio respecto a PRDs 29/30 que restringían operadores a read-only. Los operadores en campo son quienes toman muestras — permitirles crear tests y capturar resultados elimina cuellos de botella.

## Permisos por rol

| Acción | Admin | Manager | Supervisor | Operador | Viewer |
|--------|-------|---------|------------|----------|--------|
| Programar actividad | si | si | si | no | no |
| Ejecutar actividad (programada o ad-hoc) | si | si | si | si | no |
| Re-agendar / omitir actividad | si | si | si | no | no |
| Crear test de calidad | si | si | si | si | no |
| Capturar resultados de test | si | si | si | si | no |
| Rechazar test | si | si | no | no | no |
| Hold/Cancel lote (via actividad) | si | si | no | no | no |
| Subir documento regulatorio | si | si | si | no | no |
| Ver todo (read-only) | si | si | si | si | si |

## Layout general

```
┌─────────────────────────────────────────────────────────┐
│ Header: Código │ Cultivar │ Fase actual │ Status │ Días  │
│ [Programar actividad] [Registrar actividad] [Crear test]│
├─────────────────────────────────────────────────────────┤
│ General │ Actividades │ Calidad │ Regulatorio │ ...     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Contenido del tab activo                               │
│  (agrupado por fase donde aplique)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Header

Info fija del lote visible en todo momento:
- Batch code, cultivar (name + code), fase actual (badge), status (badge), días en producción
- Zona actual, plant_count, area_m2

### Barra de acciones contextuales

Botones que aparecen según rol y `batch.status`:

| Botón | Visible si | Roles |
|-------|-----------|-------|
| Programar actividad | status IN (active, phase_transition) | admin, manager, supervisor |
| Registrar actividad | status IN (active, phase_transition) | admin, manager, supervisor, operator |
| Crear test de calidad | status IN (active, phase_transition, on_hold) | admin, manager, supervisor, operator |
| Pausar lote | status = active | admin, manager |
| Reactivar lote | status = on_hold | admin, manager |
| Cancelar lote | status IN (active, on_hold) | admin, manager |

"Pausar", "Reactivar" y "Cancelar" abren el wizard de ejecución con el template especial pre-seleccionado.

## Tabs

### Tab 1: General

**Contenido actual** (ya implementado, se mantiene):
- Info del lote: código, cultivar, zona, plant_count, area_m2, fechas, yields, producto, orden de producción
- Timeline de fases: `BatchPhaseCards` con production_order_phases

**Nuevo — KPIs resumen:**

| Card | Query | Display |
|------|-------|---------|
| Actividades pendientes | `scheduled_activities WHERE batch_id AND status = 'pending'` | Count + badge amarillo |
| Actividades vencidas | `scheduled_activities WHERE batch_id AND status = 'overdue'` | Count + badge rojo |
| Actividades completadas | `activities WHERE batch_id AND status = 'completed'` | Count |
| Tests pendientes | `quality_tests WHERE batch_id AND status IN ('pending', 'in_progress')` | Count |
| Tests fallidos | `quality_tests WHERE batch_id AND status = 'failed'` | Count + badge rojo |
| Docs regulatorios | `regulatory_documents WHERE batch_id` vs `product_regulatory_requirements WHERE applies_to_scope = 'per_batch'` | X/Y completados |

### Tab 2: Actividades

**Agrupado por fase** usando `production_order_phases` del lote.

Cada grupo de fase muestra un header colapsable:
```
▼ Fase: Vegetativa (Día 1–30) — 5 completadas, 2 pendientes, 1 vencida
```

#### Sub-sección: Programadas

Fuente: `scheduled_activities WHERE batch_id = X AND phase_id = Y`

| Columna | Campo |
|---------|-------|
| Actividad | activity_templates.name (via template_id) |
| Fecha planificada | planned_date |
| Día de cultivo | crop_day |
| Status | status (pending / completed / skipped / overdue) |
| Acciones | Ejecutar, Re-agendar, Omitir |

**Acciones inline:**
- **Ejecutar** (pending/overdue) → abre wizard multi-step
- **Re-agendar** (pending/overdue) → dialog simple: nueva fecha (no pasada). Actualiza `planned_date`
- **Omitir** (pending/overdue) → dialog con razón opcional. Actualiza status a `skipped`

#### Sub-sección: Ejecutadas

Fuente: `activities WHERE batch_id = X AND phase_id = Y`

| Columna | Campo |
|---------|-------|
| Tipo | activity_types.name (via activity_type_id) |
| Template | activity_templates.name (via template_id, nullable) |
| Fecha | performed_at |
| Día de cultivo | crop_day |
| Duración | duration_minutes |
| Ejecutor | users.full_name (via performed_by) |
| Origen | Badge "Programada" si scheduled_activity_id != null, "Ad-hoc" si null |
| Obs. | Count de activity_observations, badge rojo si alguna tiene severity >= high |
| Status | status (in_progress / completed / cancelled) |

**Expandable row:**
- measurement_data (renderizado desde JSONB)
- notes
- Lista de recursos consumidos (activity_resources: product, quantity_actual, unit, cost_total)
- Lista de observaciones (activity_observations: type, severity, description, agent common_name)

#### Botón por fase

"+ Programar actividad" → dialog de programación (ver sección Dialogs).

#### Botón general

"+ Registrar actividad ad-hoc" → wizard multi-step sin scheduled_activity.

### Tab 3: Calidad

**Agrupado por fase** usando `quality_tests.phase_id`.

| Columna | Campo |
|---------|-------|
| Tipo | test_type |
| Laboratorio | lab_name |
| Ref. laboratorio | lab_reference |
| Fecha muestra | sample_date |
| Fecha resultado | result_date |
| Status | status (pending / in_progress / completed / failed / rejected) |
| Resultado | overall_pass (badge PASS/FAIL/PENDING) |
| Params | count de quality_test_results |

**Expandable row:**

Tabla de `quality_test_results WHERE test_id`:

| Columna | Campo |
|---------|-------|
| Parámetro | parameter |
| Valor | value |
| Valor numérico | numeric_value |
| Unidad | unit |
| Mín | min_threshold |
| Máx | max_threshold |
| Resultado | passed (badge) |

**Acciones:**
- **Capturar resultados** (pending/in_progress) → dialog con tabla editable de parámetros. Campos: parameter, value, numeric_value, unit, min_threshold, max_threshold. Botones preset para cargar templates de parámetros comunes (potencia, terpenos, contaminantes, etc.)
- **Completar test** (in_progress, tiene resultados) → calcula `overall_pass` = all results passed, actualiza status a `completed` o `failed`
- **Rechazar** (completed/failed, solo admin/manager) → actualiza status a `rejected`
- **Editar info** (pending/in_progress) → dialog para editar lab_name, lab_reference, result_date, notes

**Botón:** "+ Crear test" → dialog con campos: test_type (free text con sugerencias), phase_id (default fase actual), lab_name, lab_reference, sample_date (default hoy), notes.

### Tab 4: Regulatorio

**Agrupado por categoría** de `regulatory_doc_types.category` (quality, transport, compliance, origin, safety, commercial).

#### Indicador de compliance

Query: `product_regulatory_requirements WHERE (product_id = batch.current_product_id OR category_id = product.category_id) AND applies_to_scope = 'per_batch'`

Muestra: "X de Y documentos requeridos capturados" con badge verde/amarillo/rojo.

#### Tabla de documentos

Fuente: `regulatory_documents WHERE batch_id = X`

| Columna | Campo |
|---------|-------|
| Tipo | regulatory_doc_types.name (via doc_type_id) |
| Número | document_number |
| Fecha emisión | issue_date |
| Fecha vencimiento | expiry_date |
| Status | status (draft / valid / expired / revoked / superseded) |
| Archivo | file_name (link de descarga via file_path) |
| Verificado por | users.full_name (via verified_by) |

**Acciones:**
- **Ver detalle** → dialog que renderiza `field_data` según el schema de `regulatory_doc_types.required_fields`
- **Subir documento** → dialog con: doc_type selector, formulario dinámico según `required_fields` del tipo, upload de archivo, document_number, issue_date, notes
- **Verificar** (admin/manager) → marca verified_by y verified_at

#### Docs requeridos faltantes

Lista de `product_regulatory_requirements` que no tienen `regulatory_documents` asociado para este batch. Cada uno con botón "Subir" que pre-selecciona el doc_type.

### Tab 5: Inventario

**Agrupado por fase** (via `inventory_transactions.phase_id` o via `activity.phase_id` cuando `inventory_transactions.activity_id` está vinculado).

Fuente: `inventory_transactions WHERE batch_id = X`

| Columna | Campo |
|---------|-------|
| Fecha | timestamp |
| Tipo | type (badge con color por tipo) |
| Producto | inventory_items → products.name (via inventory_item_id) |
| Cantidad | quantity |
| Unidad | units_of_measure.abbreviation (via unit_id) |
| Costo | cost_total |
| Actividad | link a la actividad (via activity_id, si existe) |
| Usuario | users.full_name (via user_id) |

**Card resumen:** Costo total directo = `SUM(cost_total) WHERE batch_id`

**Read-only** — transacciones se generan automáticamente al ejecutar actividades o desde otros procesos.

### Tab 6: Genealogía (ya existe)

Sin cambios. Mantiene la implementación actual de `batch_lineage` con tabla de splits/merges y links a batches relacionados.

### Tab 7: Ambiente

Fuente: `environmental_readings WHERE zone_id = batch.zone_id`

**Parámetros** (enum `env_parameter`): temperature, humidity, co2, light_ppfd, ec, ph, vpd

**Vistas temporales:** 24h / 7d / 30d (toggle)

**Display:** Cards por parámetro con último valor, min/max del período, y mini-gráfico de tendencia.

**Read-only** — datos vienen de sensores IoT.

**Nota:** Si el batch no tiene zona asignada o la zona no tiene sensores, mostrar estado vacío con mensaje explicativo.

## Dialogs y Wizards

### Dialog: Programar actividad

**Trigger:** Botón "Programar actividad" (header o dentro de una fase).

**Campos:**
- `template_id` (selector) — lista de `activity_templates WHERE is_active = true`, filtradas por templates aplicables a la fase actual via `activity_template_phases`. Si se abre desde una fase específica, pre-filtra por esa fase
- `planned_date` (date picker) — no permite fechas pasadas
- `crop_day` (auto-calculado) — `planned_date - batch.start_date` en días

**Al guardar:** INSERT en `scheduled_activities` con:
- schedule_id = batch.schedule_id (nullable)
- template_id = seleccionado
- batch_id = lote actual
- planned_date = seleccionada
- crop_day = calculado
- phase_id = fase actual del batch (o la fase del grupo si se abrió desde un grupo)
- template_snapshot = snapshot del template actual (resources, checklist, metadata)
- status = 'pending'

### Dialog: Re-agendar actividad

**Campos:**
- `planned_date` (date picker) — no permite fechas pasadas

**Al guardar:** UPDATE `scheduled_activities SET planned_date = X WHERE id = Y`

### Dialog: Omitir actividad

**Campos:**
- Razón (text, opcional)

**Al guardar:** UPDATE `scheduled_activities SET status = 'skipped' WHERE id = Y`. La razón se podría almacenar en un campo notes si existiera, pero `scheduled_activities` no tiene campo de razón — se registra como nota en la UI sin persistencia, o se evalúa agregar un campo.

**Nota de implementación:** `scheduled_activities` no tiene campo `reason` o `notes`. Opciones: (a) agregar campo `skip_reason TEXT` via migración, o (b) no persistir la razón. Decisión diferida a implementación.

### Wizard multi-step: Ejecutar actividad

**Contexto:** Se abre desde:
1. Botón "Ejecutar" en una scheduled_activity → pre-llena desde template_snapshot
2. Botón "Registrar actividad ad-hoc" → campos vacíos
3. Botón "Pausar/Cancelar/Reactivar lote" → template especial pre-seleccionado

#### Paso 1: Info general

**Si viene de scheduled_activity:**
- activity_type_id: pre-llenado desde template
- template_id: pre-llenado
- performed_at: default now(), editable
- duration_minutes: editable
- zone_id: default batch.zone_id, editable (selector de zonas de la facility)
- notes: text libre

**Si es ad-hoc:**
- activity_type_id: selector de `activity_types WHERE is_active = true`
- template_id: selector opcional de `activity_templates` filtrado por activity_type_id y fase actual. Si se selecciona, pre-llena los pasos siguientes
- Mismos campos editables

#### Paso 2: Checklist

**Si tiene template (via template_snapshot o template directo):**
- Lista de items de `activity_template_checklist` ordenados por `step_order`
- Cada item muestra: checkbox + instruction
- Items con `is_critical = true` marcados visualmente (borde rojo). Todos los critical deben estar checked para avanzar
- Items con `requires_photo = true` muestran indicador (funcionalidad de upload diferida)
- Items con `expected_value` muestran input para valor medido + `tolerance` como referencia

**Si es ad-hoc sin template:** Paso se omite automáticamente.

**Almacenamiento:** Los resultados del checklist se guardan en `activities.measurement_data` como JSONB: `{ "checklist": [{ "step_order": 1, "instruction": "...", "checked": true, "value": "6.1" }] }`

#### Paso 3: Recursos

**Si tiene template:**
- Tabla pre-llenada desde `activity_template_resources` (via template_snapshot o query directa)
- Escalado automático según `quantity_basis`:
  - `fixed`: quantity tal cual
  - `per_plant`: quantity × batch.plant_count
  - `per_m2`: quantity × batch.area_m2
  - `per_zone`: quantity × 1 (zona del batch)
  - `per_L_solution`: quantity × total_volume (input del usuario en measurement_data)

| Columna | Editable | Campo destino |
|---------|----------|---------------|
| Producto | no (pre-llenado) | activity_resources.product_id |
| Cantidad planificada | no (calculada) | activity_resources.quantity_planned |
| Cantidad real | si | activity_resources.quantity_actual |
| Unidad | no (del template) | activity_resources.unit_id |
| Lote inventario | si (selector) | activity_resources.inventory_item_id |

- Botón "+ Agregar recurso" para productos no contemplados en el template
- Selector de `inventory_item_id`: filtra `inventory_items WHERE product_id = X AND status = 'available'` mostrando lote, cantidad disponible, ubicación

**Si es ad-hoc sin template:** Tabla vacía, usuario agrega recursos manualmente.

#### Paso 4: Observaciones

Lista de observaciones (0..n). Botón "+ Agregar observación".

**Formulario por observación:**

| Campo | Tipo | Visible si | Obligatorio |
|-------|------|-----------|-------------|
| type | select: pest, disease, deficiency, environmental, general, measurement | siempre | si |
| agent_id | select de `phytosanitary_agents WHERE crop_type_id = batch.cultivar.crop_type_id AND is_active = true` | type IN (pest, disease) | no |
| plant_part | select: root, stem, leaf, flower, fruit, whole_plant | siempre | no |
| severity | select: info, low, medium, high, critical | siempre | si (default: info) |
| severity_pct | number (0-100) | siempre | no |
| incidence_value | number | siempre | no |
| incidence_unit | select: count, percentage | incidence_value != null | si (si incidence_value) |
| sample_size | number | siempre | no |
| affected_plants | number | siempre | no |
| description | text | siempre | si |
| action_taken | text | siempre | no |

#### Paso 5: Mediciones

**Si tiene template con `metadata` (JSONB):**
- Renderiza campos dinámicos basados en las keys del metadata del template
- Ejemplos comunes: `water_ph`, `solution_ec`, `total_volume_l`, `temperature`, `humidity`
- Cada key se muestra como input numérico con label derivado de la key

**Almacenamiento:** Se guarda directamente en `activities.measurement_data` (JSONB), merge con los datos de checklist del paso 2.

**Si no tiene metadata:** Paso se omite.

#### Paso 6: Confirmar

Resumen visual de todos los datos ingresados:
- Info general (tipo, fecha, duración, zona)
- Checklist: X/Y items completados
- Recursos: tabla resumen con cantidades y costos estimados
- Observaciones: count con indicador de severidad máxima
- Mediciones: valores capturados

**Indicadores especiales:**
- Si `template.triggers_phase_change_id IS NOT NULL`: alerta informativa "Al completar esta actividad, el lote avanzará a la fase [nombre_fase]"
- Si `template.triggers_transformation = true`: alerta informativa "Esta actividad generará una transformación de inventario"

**Botón "Ejecutar"** → llama al edge function `execute-activity` existente con:
```
{
  scheduled_activity_id: (si viene de programada, null si ad-hoc),
  batch_id: batch.id,
  activity_type_id: seleccionado,
  template_id: seleccionado (nullable),
  performed_by: auth.uid(),
  performed_at: fecha seleccionada,
  duration_minutes: duración,
  zone_id: zona seleccionada,
  phase_id: batch.current_phase_id,
  crop_day: calculated,
  measurement_data: { ...mediciones, checklist: [...] },
  notes: notas,
  resources: [{ product_id, inventory_item_id, quantity_planned, quantity_actual, unit_id }],
  observations: [{ type, agent_id, plant_part, severity, severity_pct, incidence_value, incidence_unit, sample_size, affected_plants, description, action_taken }]
}
```

## Cambios requeridos al sistema existente

### 1. Eliminar transición de fase standalone

- Remover botón "Avanzar fase" del header de batch detail
- Remover diálogos de hold/reactivate/cancel como acciones directas
- La transición ocurre automáticamente via `execute-activity` cuando el template tiene `triggers_phase_change_id`

### 2. Crear activity types para status changes

Migración SQL — INSERT en `activity_types`:
- "Pausa de lote" (category: 'control')
- "Cancelación de lote" (category: 'control')
- "Reactivación de lote" (category: 'control')

Crear `activity_templates` correspondientes con metadata que indique la acción de status.

### 3. Extender execute-activity para status changes

El edge function `execute-activity` (y su función SQL `fn_execute_activity`) necesita manejar templates que cambian el status del batch (no solo la fase). Opciones:
- Nuevo campo en `activity_templates`: no — evitar cambios al modelo
- Usar `metadata` JSONB del template: `{ "batch_status_action": "on_hold" | "cancelled" | "active" }` — el edge function lee este campo y actualiza `batches.status` acordemente

### 4. Actualizar PRDs 29/30

Cambiar permisos del operador de read-only a create + capture results.

### 5. Actualizar PRD 25

Reescribir para reflejar el nuevo diseño de tabs y la filosofía de hub central.

## Notas de implementación

- **Lazy loading de tabs:** Solo cargar datos del tab activo. Usar React state para tab selection y fetch on-demand
- **Reuse de componentes:** Reutilizar componentes existentes de schedule-client, execute-client, tests-list-client donde sea posible, adaptándolos para contexto embebido (sin layout de página completa)
- **Edge function reuse:** `execute-activity` ya maneja la lógica compleja — el wizard solo necesita construir el payload correcto
- **Template snapshot:** Para scheduled_activities, usar `template_snapshot` (JSONB) que ya se almacena al programar. Para ad-hoc con template, hacer query directa al template y sus relaciones

## Fuera de alcance

- Upload de fotos (diferido a fase 8 / campo móvil)
- Dashboard de métricas agregadas (fase 9)
- Notificaciones push de actividades vencidas
- Edición de actividades ya ejecutadas (inmutables por diseño)
