# F-022: Ejecutar Actividad Completa

## Overview

La pantalla de ejecucion de actividad es el corazon operativo del sistema. En 4 pasos, el operador: (1) verifica y ajusta los recursos escalados automaticamente por plant_count del batch, (2) completa el checklist de verificacion con items criticos que bloquean si no se cumplen, (3) registra observaciones opcionales con fotos, y (4) confirma para generar las transacciones de inventario. Un timer automatico registra la duracion. Si la actividad tiene triggers_phase_change, el batch avanza automaticamente. Todo funciona offline con sync al reconectar.

## User Personas

- **Operador**: Principal usuario. Ejecuta actividades diarias en campo, frecuentemente sin conexion a internet.
- **Supervisor**: Puede ejecutar actividades en reemplazo de un operador ausente.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-022-001 | Paso 1: Recursos escalados con edicion | L | P0 | Planned |
| US-022-002 | Paso 2: Checklist con items criticos bloqueantes | M | P0 | Planned |
| US-022-003 | Paso 3: Observaciones opcionales con fotos | M | P1 | Planned |
| US-022-004 | Paso 4: Confirmacion y generacion de transacciones | L | P0 | Planned |
| US-022-005 | Timer automatico de duracion | S | P0 | Planned |
| US-022-006 | Funcionamiento offline completo | L | P1 | Planned |

---

# US-022-001: Paso 1 — Recursos escalados con edicion

## User Story

**As a** operador,
**I want** ver los recursos planificados para la actividad ya escalados automaticamente segun la cantidad de plantas del batch, con la posibilidad de editar las cantidades reales,
**So that** pueda ajustar los consumos a la realidad del campo sin tener que calcular manualmente.

## Acceptance Criteria

### Scenario 1: Recursos pre-escalados correctamente
- **Given** el template define "Agua: 5 L/planta" y el batch tiene 42 plantas
- **When** el operador abre el paso 1 de act-execute
- **Then** la tabla muestra: Agua | Planificado: 210 L | Real: 210 L (pre-llenado) | Disponible: 500 L (stock en zona). El campo "Real" es editable.

### Scenario 2: Editar cantidad real diferente a planificada
- **Given** la cantidad planificada de Ca(NO3)2 es 168g
- **When** el operador cambia quantity_actual a 150g (uso menor porque habia residuo de la anterior)
- **Then** el valor se acepta, se resalta como diferente del planificado, y el campo muestra "150g (plan: 168g)"

### Scenario 3: Recurso sin stock disponible en la zona
- **Given** el recurso "Fungicida X" tiene 0 unidades disponibles en la zona
- **When** se renderiza la tabla de recursos
- **Then** la columna "Disponible" muestra "0" en rojo, pero el campo es editable con warning "Sin stock registrado. Confirma si usaste stock no registrado."

### Scenario 4: Agregar recurso extra no planificado
- **Given** el operador necesito usar un recurso adicional no listado en el template
- **When** hace clic en "Agregar recurso"
- **Then** se abre un selector de producto y puede agregar una nueva fila con producto, cantidad y unidad

### Scenario 5: Recurso con quantity_actual = 0 se omite
- **Given** el template incluye "Miel/Melaza" como recurso opcional
- **When** el operador deja quantity_actual en 0
- **Then** el recurso se omite de la lista de consumos al confirmar (no genera inventory_transaction)

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Calculo de escalado correcto para todos los quantity_basis
- [ ] Tests unitarios para escalado
- [ ] Criterios de aceptacion verificados
- [ ] Teclado numerico automatico en inputs de cantidad

## Technical Notes
- **Server Action**: `getActivityContext(scheduledActivityId)` retorna: template con checklist y recursos, batch con plant_count y zone, productos disponibles en zona
- **Escalado**: quantity = template_resource.quantity * scale_factor, donde scale_factor depende de quantity_basis:
  - fixed: 1
  - per_plant: batch.plant_count
  - per_m2: zone.effective_growing_area_m2
  - per_zone: 1
  - per_L_solution: calculado de otros recursos tipo solucion
- **Zod Schema**: parte de `executeActivitySchema` — resources array con product_id, quantity_actual, unit_id
- **Pantalla**: act-execute, paso 1

## UI/UX Notes
- Tabla con columnas: Producto (nombre + SKU), Planificado (DM Mono, gris), Real (input numerico editable, DM Mono), Unidad, Disponible (DM Mono, verde/rojo)
- inputMode='decimal' para campos numericos
- Recursos opcionales con badge "Opcional"
- Boton "+ Agregar recurso" al final de la tabla
- Header de contexto siempre visible: nombre actividad, batch, zona, fase

## Dependencies
- F-019 (templates con recursos), F-020 (actividades programadas), F-016/F-017 (batch con plant_count)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-022-002: Paso 2 — Checklist con items criticos bloqueantes

## User Story

**As a** operador,
**I want** completar el checklist de verificacion de la actividad donde los items criticos bloquean la finalizacion si no se cumplen, y los items con valor esperado muestran si estoy dentro del rango,
**So that** se garantice que las verificaciones criticas se realicen antes de cerrar la actividad.

## Acceptance Criteria

### Scenario 1: Completar item de checklist simple
- **Given** el checklist tiene item "Verificar color de hojas" con is_critical=false
- **When** el operador marca el checkbox
- **Then** el item se marca como completado con checkmark verde

### Scenario 2: Item critico bloquea confirmacion
- **Given** el checklist tiene item "Verificar EC del drenaje" con is_critical=true y expected_value="1.5-2.0"
- **When** el operador llega al paso 4 (confirmar) sin haber completado este item
- **Then** el boton "Completar Actividad" esta deshabilitado y muestra "X items criticos pendientes"

### Scenario 3: Valor fuera de rango muestra warning
- **Given** el item espera EC entre 1.5 y 2.0 con tolerance +-0.3
- **When** el operador registra valor 2.5 (fuera de rango pero dentro de tolerancia)
- **Then** el valor se muestra en amarillo (warning). Si registra 3.0 (fuera de tolerancia): se muestra en rojo. No bloquea a menos que is_critical=true y el item no se completa

### Scenario 4: Item que requiere foto
- **Given** un item tiene requires_photo=true
- **When** el operador intenta marcarlo como completado sin tomar foto
- **Then** el item no se puede marcar hasta que se adjunte al menos una foto

### Scenario 5: Todos los items criticos completados habilita confirmacion
- **Given** hay 3 items criticos y 2 informativos
- **When** el operador completa los 3 criticos (los 2 informativos pueden quedar pendientes)
- **Then** el boton "Completar Actividad" se habilita

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Bloqueo de items criticos funcional
- [ ] Validacion de rangos funcional
- [ ] Captura de foto integrada
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: checkboxes accesibles, indicadores no solo por color

## Technical Notes
- **Zod Schema**: parte de `executeActivitySchema` — checklist array con template_checklist_id, is_completed, value_recorded, photo_url
- Validacion de rango client-side: parsear expected_value ("1.5-2.0") y tolerance ("+-0.3"), comparar con value_recorded
- Items criticos: is_critical=true deben tener is_completed=true para habilitar paso 4
- **Tabla output**: activity_checklist_results

## UI/UX Notes
- Lista vertical de items en orden (step_order)
- Cada item: checkbox, instruccion, input de valor (si expected_value), boton camara (si requires_photo), indicador critico (badge rojo)
- Valores en rango: verde. Borderline: amarillo. Fuera: rojo.
- Items criticos incompletos: resaltados con borde rojo
- Progress: "3/5 items completados (2/3 criticos)"

## Dependencies
- US-022-001, F-019 (checklist items en template)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-022-003: Paso 3 — Observaciones opcionales con fotos

## User Story

**As a** operador,
**I want** registrar observaciones de campo opcionales (plagas, enfermedades, deficiencias) con severidad, descripcion, conteo de plantas afectadas y fotos comprimidas,
**So that** quede registro de lo observado durante la actividad para que el supervisor pueda tomar decisiones.

## Acceptance Criteria

### Scenario 1: Agregar observacion de plaga
- **Given** el operador esta en el paso 3 de act-execute
- **When** selecciona tipo="pest", severity="high", describe "Se observan trips en hojas superiores", affected_count=8, y toma 2 fotos
- **Then** la observacion se agrega a la lista con badge de tipo y severidad, fotos en miniatura, y puede continuar al paso 4

### Scenario 2: Saltar observaciones
- **Given** el operador no tiene nada que reportar
- **When** hace clic en "Siguiente" sin agregar observaciones
- **Then** avanza al paso 4 sin problemas (las observaciones son opcionales)

### Scenario 3: Fotos comprimidas automaticamente
- **Given** el operador toma una foto de 4MB desde la camara
- **When** la foto se procesa
- **Then** se comprime a max 1200px, JPEG 80% (~200KB) automaticamente antes de adjuntarse. Si offline: se almacena como blob en IndexedDB

### Scenario 4: Multiples observaciones de diferente tipo
- **Given** el operador observo plagas Y deficiencia nutricional
- **When** agrega 2 observaciones con diferentes tipos y severidades
- **Then** ambas aparecen en la lista del paso 3, cada una con su tipo, severidad y fotos

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Compresion de fotos funcional (1200px, JPEG 80%)
- [ ] Criterios de aceptacion verificados
- [ ] Funciona offline (fotos en IndexedDB)

## Technical Notes
- **Zod Schema**: parte de `executeActivitySchema` — observations array opcional con type, severity, description, affected_count, photo_urls
- Compresion client-side: canvas.toBlob() con calidad 0.8, max dimension 1200px
- Offline: blob almacenado en Dexie offlinePhotos, URL generada localmente, upload encolado en syncQueue
- **Tabla output**: activity_observations + attachments (para fotos)
- **Storage**: Supabase bucket 'activity-photos', naming: {batch_id}/{activity_id}/{timestamp}.jpg

## UI/UX Notes
- Boton "+ Agregar observacion" que abre formulario inline o modal
- Selectors: tipo (pest/disease/deficiency/environmental/general), severidad (info->critical con colores)
- Textarea para descripcion (min 5 caracteres)
- Input numerico para affected_count
- Boton camara para captura o seleccion de galeria (max 5 fotos por observacion)
- Preview de fotos en miniaturas

## Dependencies
- US-022-001, US-022-002

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-022-004: Paso 4 — Confirmacion y generacion de transacciones

## User Story

**As a** operador,
**I want** ver un resumen de la actividad completada (recursos, checklist, observaciones, duracion) y confirmar para generar las transacciones de inventario y cerrar la actividad,
**So that** el inventario se actualice automaticamente y la actividad quede registrada en la timeline del batch.

## Acceptance Criteria

### Scenario 1: Confirmar actividad genera todas las transacciones
- **Given** el operador completo los pasos 1-3 con 3 recursos consumidos
- **When** hace clic en "Completar Actividad" en el paso 4
- **Then** el Server Action executeActivity: (1) INSERT activity, (2) INSERT activity_resources (3 registros), (3) INSERT inventory_transactions type='consumption' (3 registros, uno por recurso con quantity > 0), (4) INSERT activity_checklist_results, (5) INSERT activity_observations (si hay), (6) UPDATE scheduled_activity status='completed' + completed_activity_id, (7) muestra toast "Actividad completada" y navega de vuelta a act-today

### Scenario 2: Actividad con triggers_phase_change avanza batch
- **Given** el template tiene triggers_phase_change_id apuntando a la fase "Secado"
- **When** el operador completa la actividad
- **Then** despues de generar las transacciones, se llama automaticamente advancePhase(batchId) y el batch avanza a "Secado". Toast: "Actividad completada. Batch LOT-001 avanza a fase Secado."

### Scenario 3: Boton deshabilitado si items criticos pendientes
- **Given** hay 1 item critico sin completar
- **When** el operador esta en el paso 4
- **Then** el boton "Completar Actividad" esta deshabilitado con texto "1 item critico pendiente" y link para volver al paso 2

### Scenario 4: Conflicto: actividad ya completada por otro usuario
- **Given** otro supervisor completo la misma scheduled_activity mientras el operador estaba offline
- **When** el operador intenta confirmar (online)
- **Then** el Server Action retorna error 409 "Actividad ya completada por {user} a las {time}" y no crea duplicados

### Scenario 5: Resumen muestra datos completos
- **Given** el operador esta en el paso 4
- **When** se renderiza la pantalla
- **Then** se muestra: recursos consumidos (con diferencias vs planificado), checklist status (X/Y completados, Z criticos OK), observaciones registradas (count + tipos), duracion total, y warnings si hay items fuera de rango

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] INSERT atomico de todas las tablas
- [ ] Manejo de conflictos (409)
- [ ] Triggers phase change funcional
- [ ] Tests unitarios e integracion
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Server Action**: `executeActivity(input)` en `lib/actions/activity.actions.ts`
  - Parse executeActivitySchema
  - Verificar scheduled_activity.status != 'completed' (concurrencia)
  - INSERT activities con datos del contexto (batch_id, zone_id, phase_id, performed_by, etc.)
  - INSERT activity_resources para cada recurso con quantity_actual > 0
  - INSERT inventory_transactions type='consumption' para cada recurso (resta stock)
  - INSERT activity_checklist_results para cada item del checklist
  - INSERT activity_observations para cada observacion (si hay)
  - UPDATE scheduled_activity.status='completed', completed_activity_id
  - Si template.triggers_phase_change_id: call advancePhase(batch_id)
  - Operacion atomica (transaccion DB)
- **Zod Schema**: `executeActivitySchema` completo
- **Tablas**: activities, activity_resources, inventory_transactions, activity_checklist_results, activity_observations, scheduled_activities
- **Pantalla**: act-execute, paso 4

## UI/UX Notes
- Resumen en formato card por seccion: Recursos (tabla compacta), Checklist (status), Observaciones (count), Duracion (DM Mono grande)
- Boton "Completar Actividad" verde, 56px height, prominente
- Deshabilitado con mensaje si items criticos pendientes
- Tras completar: animacion de checkmark + redirect a act-today

## Dependencies
- US-022-001, US-022-002, US-022-003, F-018 (advancePhase para triggers)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-022-005: Timer automatico de duracion

## User Story

**As a** operador,
**I want** que un timer automatico se inicie al abrir la pantalla de ejecucion y registre la duracion total al completar,
**So that** la duracion de cada actividad se registre sin esfuerzo adicional para analisis de productividad.

## Acceptance Criteria

### Scenario 1: Timer se inicia automaticamente
- **Given** el operador abre la pantalla act-execute para una actividad
- **When** la pantalla se carga
- **Then** un timer comienza a contar desde 00:00, visible en el header de contexto

### Scenario 2: Timer persiste si sale y vuelve
- **Given** el operador inicio la ejecucion hace 10 minutos y sale a otra pantalla
- **When** vuelve a act-execute para la misma actividad
- **Then** el timer muestra 10:XX (no se reseteo) porque el tiempo de inicio se almaceno en sessionStorage/Zustand

### Scenario 3: Duracion se registra al completar
- **Given** el timer marca 32 minutos
- **When** el operador confirma la actividad
- **Then** activities.duration_minutes se registra como 32

### Scenario 4: Pausa de timer
- **Given** el operador necesita hacer una pausa (llamada telefonica)
- **When** hace clic en el boton pausa del timer
- **Then** el timer se detiene y muestra "(pausado)". Al reanudar, continua desde donde quedo

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Persistencia en sessionStorage/Zustand
- [ ] Criterios de aceptacion verificados

## Technical Notes
- Timer guardado en Zustand store con persist (sessionStorage): key `activity-timer-{scheduledActivityId}`
- Almacenar: startTime, pausedDuration, isPaused
- Calcular duration_minutes = (completedAt - startTime - totalPausedTime) / 60000
- Limpiar timer al completar la actividad

## UI/UX Notes
- Timer visible en el header de contexto: "12:34" en DM Mono
- Boton pausa/play junto al timer
- Color: neutral si corriendo, gris si pausado
- Timer no prominente: informativo, no distractor

## Dependencies
- US-022-001

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-022-006: Funcionamiento offline completo

## User Story

**As a** operador,
**I want** poder ejecutar una actividad completa sin conexion a internet, con los datos guardados localmente y sincronizados automaticamente al reconectar,
**So that** pueda completar mi jornada de trabajo en campo sin depender de la conexion.

## Acceptance Criteria

### Scenario 1: Ejecucion completa offline
- **Given** el operador esta sin conexion y tiene actividades pre-descargadas en IndexedDB
- **When** abre una actividad y completa los 4 pasos
- **Then** todos los datos se guardan en Dexie (syncQueue): actividad, recursos, checklist, observaciones. La UI muestra feedback optimista: "Completada (pendiente de sync)"

### Scenario 2: Fotos guardadas offline
- **Given** el operador toma 3 fotos durante la actividad sin conexion
- **When** las fotos se procesan
- **Then** se comprimen (1200px, JPEG 80%) y se almacenan como blob en Dexie offlinePhotos, vinculadas al syncQueueId de la actividad

### Scenario 3: Sincronizacion automatica al reconectar
- **Given** el operador completo 3 actividades offline
- **When** se detecta conexion
- **Then** Serwist dispara sync event, la cola se procesa FIFO: cada actividad se envia via executeActivity Server Action, las fotos se suben a Supabase Storage, status cambia a 'synced'. Toast: "3 actividades sincronizadas"

### Scenario 4: Conflicto al sincronizar
- **Given** otra persona completo la misma actividad mientras el operador estaba offline
- **When** la sync intenta enviar la actividad duplicada
- **Then** el server retorna 409, el item en syncQueue se marca como 'conflict', y se muestra notificacion al operador "Actividad LOT-001 Fertirrigacion ya fue completada por otro usuario"

### Scenario 5: Fallo de sync con retry
- **Given** la sincronizacion de una actividad falla por error de red
- **When** el retryCount < 3
- **Then** el item se reintenta en el siguiente ciclo de sync (status='pending'). Si retryCount >= 3: status='failed' y se notifica al usuario

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Dexie syncQueue funcional
- [ ] Compresion de fotos offline verificada
- [ ] Sync automatico y manual (pull-to-refresh)
- [ ] Manejo de conflictos verificado
- [ ] Retry con limite verificado
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Dexie**: syncQueue.add({timestamp, action: 'completeActivity', entityType: 'activity', payload: serializedInput, status: 'pending', retryCount: 0})
- **offlinePhotos**: offlinePhotos.add({syncQueueId, blob: compressedBlob, compressedSize})
- **Sync process**: en Serwist service worker o en componente React con navigator.onLine listener
  1. Read queue WHERE status='pending' ORDER BY timestamp ASC
  2. Para cada item: status='syncing' -> call Server Action -> si ok: status='synced' -> si error: retryCount++, status='failed' si >= 3
  3. Tras sync: subir fotos de offlinePhotos -> actualizar URLs
  4. Invalidar TanStack Query caches
- **Indicador**: banner "Sin conexion — ultima sync: HH:MM" visible permanentemente
- **Pre-carga**: al login o WiFi, descargar datos necesarios a Dexie (actividades del dia, batches, templates, productos, inventario de zona)

## UI/UX Notes
- Banner offline permanente en la parte superior (amarillo)
- Actividades completadas offline: badge "Pendiente de sync" en naranja
- Al sincronizar: badge cambia a "Sincronizada" en verde brevemente
- Indicador de fotos pendientes de upload: "3 fotos pendientes"
- Error de sync: notificacion persistente con opcion de reintentar manualmente

## Dependencies
- US-022-001 a US-022-005
- PWA y Serwist configurados (Fase 0)
- Dexie schema configurado (Fase 0)

## Estimation
- **Size**: L
- **Complexity**: High
