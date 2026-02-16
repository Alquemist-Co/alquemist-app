# F-032: Tests de Calidad (QUA-01)

## Overview

Ciclo completo de tests de calidad de laboratorio: crear test vinculado a batch y fase, registrar resultados con parametros individuales y thresholds, auto-calculo de pass/fail por parametro y overall, generacion automatica de alertas cuando falla, y upload de certificados PDF del laboratorio. Soporta cualquier tipo de test (potencia, contaminantes, brix, calibre) con parametros flexibles.

## User Personas

- **Supervisor**: Crea tests de calidad, registra resultados del laboratorio, adjunta certificados.
- **Gerente**: Revisa resultados, aprueba o rechaza batches basado en calidad, analiza tendencias.
- **Admin**: Acceso completo a gestion de calidad.
- **Operador**: Solo registra observaciones en actividades, no crea tests directamente.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-032-001 | Lista de tests pendientes | S | P0 | Planned |
| US-032-002 | Crear test de calidad | M | P0 | Planned |
| US-032-003 | Registrar resultados con auto-calculo pass/fail | L | P0 | Planned |
| US-032-004 | Generacion automatica de alerta por fallo | S | P0 | Planned |
| US-032-005 | Upload de certificado PDF | S | P1 | Planned |

---

# US-032-001: Lista de tests pendientes

## User Story

**As a** supervisor,
**I want** ver una lista de todos los tests de calidad pendientes ordenados por urgencia,
**So that** pueda priorizar el seguimiento con laboratorios y registrar resultados oportunamente.

## Acceptance Criteria

### Scenario 1: Tests pendientes ordenados por urgencia
- **Given** existen 5 tests con status 'pending' y 2 con status 'in_progress'
- **When** el supervisor accede a la pantalla qual-pending
- **Then** se muestran cards con: batch code, tipo de test, lab name, fecha de muestra, dias en espera, badge de status
- **And** se ordenan por dias en espera DESC (mas antiguos primero = mas urgentes)

### Scenario 2: Test con muchos dias de espera
- **Given** un test tiene 15 dias en espera
- **When** se muestra en la lista
- **Then** el badge de dias muestra "15 dias" en color rojo (> 7 dias = critico)
- **And** la card tiene borde rojo sutil para destacar urgencia

### Scenario 3: Sin tests pendientes
- **Given** no hay tests con status 'pending' o 'in_progress'
- **When** el supervisor accede a qual-pending
- **Then** se muestra empty state "No hay tests pendientes" con icono de check y CTA "Crear test"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified

## Technical Notes
- Pantalla: `qual-pending`
- Query: `quality_tests WHERE status IN ('pending', 'in_progress')` JOIN `batches` ORDER BY sample_date ASC
- Dias en espera: CURRENT_DATE - sample_date
- RLS via batch -> company_id

## UI/UX Notes
- Cards con layout: batch code (DM Mono) + tipo test (bold) + lab + fecha muestra + dias badge
- Color de badge dias: verde (< 3d), amarillo (3-7d), rojo (> 7d)
- Tap en card -> pantalla de registrar resultados (qual-results)
- Boton "Crear test" como header action o FAB

## Dependencies
- F-016/F-017 (Batches) de Fase 1

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-032-002: Crear test de calidad

## User Story

**As a** supervisor,
**I want** crear un nuevo test de calidad vinculado a un batch, fase, tipo de test, laboratorio y muestra,
**So that** quede registrada la solicitud de analisis y pueda hacer seguimiento hasta recibir resultados.

## Acceptance Criteria

### Scenario 1: Creacion exitosa de test
- **Given** el supervisor accede al formulario de crear test
- **When** selecciona batch="LOT-001", fase="cosecha", tipo="potency", lab="ChemHistory Labs", muestra="M-2026-001", fecha_muestra=hoy
- **Then** se crea quality_test con status='pending' y todos los datos ingresados
- **And** aparece en la lista de tests pendientes
- **And** se muestra toast "Test de calidad creado"

### Scenario 2: Batch no encontrado
- **Given** el supervisor busca un batch que no existe
- **When** no encuentra resultados en el selector
- **Then** se muestra "Batch no encontrado" con sugerencia de verificar el codigo

### Scenario 3: Test duplicado para mismo batch y tipo
- **Given** ya existe un test tipo 'potency' pendiente para LOT-001 en fase cosecha
- **When** el supervisor intenta crear otro identico
- **Then** se muestra warning "Ya existe un test de [tipo] pendiente para este batch. Crear de todos modos?"
- **And** permite crear si confirma (un batch puede tener retests)

### Scenario 4: Test de batch completado/cancelado
- **Given** el batch LOT-002 tiene status 'completed'
- **When** el supervisor crea un test para este batch
- **Then** se permite la creacion (el test puede ser posterior al cierre del batch)
- **And** se muestra nota informativa "Este batch ya esta completado"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Validacion Zod client y server (createTestSchema)
- [ ] Acceptance criteria verified

## Technical Notes
- Server Action: `createTest(input)` en `lib/actions/quality.actions.ts`
- Zod schema: `createTestSchema` (ya definido en docs/alquemist-features.md)
- INSERT quality_test con status='pending'
- Validar permisos: solo supervisor, manager, admin pueden crear tests
- RLS via batch -> company_id

## UI/UX Notes
- Form fields: batch (search por codigo), fase (dropdown filtrado por crop_type del batch), tipo (input con sugerencias: potency, contaminants, brix, caliber), lab (input con autocompletado de labs previos), muestra (input texto), fecha muestra (date picker, default hoy)
- Batch search: al seleccionar batch, auto-filtrar fases segun crop_type
- Lab: autocompletado desde labs usados previamente por la company

## Dependencies
- F-016/F-017 (Batches) de Fase 1

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-032-003: Registrar resultados con auto-calculo pass/fail

## User Story

**As a** supervisor,
**I want** registrar los resultados de cada parametro de un test de calidad con sus valores, y que el sistema calcule automaticamente si pasa o falla basado en los thresholds,
**So that** la evaluacion sea objetiva, rapida y no dependa de calculos manuales.

## Acceptance Criteria

### Scenario 1: Registro exitoso con parametros que pasan
- **Given** el supervisor abre el test pendiente para LOT-001 tipo 'potency'
- **When** ingresa resultados: THC=23.5% (threshold 18-30%), CBD=0.8% (threshold 0-2%), Humedad=11% (threshold 0-12%)
- **Then** cada parametro muestra indicador verde "Pasa" ya que todos estan dentro de thresholds
- **And** overall_passed se calcula como true (todos pasan)
- **And** el test pasa a status='completed'

### Scenario 2: Parametro fuera de threshold
- **Given** el supervisor registra E.coli=150 CFU/g con max_threshold=100
- **When** se calcula el resultado
- **Then** E.coli muestra indicador rojo "No pasa" con valor y threshold visible
- **And** overall_passed = false (al menos un parametro con threshold no pasa)

### Scenario 3: Parametro informativo (sin threshold)
- **Given** un parametro "Limonene" no tiene min/max threshold configurado
- **When** el supervisor ingresa valor "12 mg/g"
- **Then** el parametro se registra sin indicador pass/fail
- **And** no afecta el calculo de overall_passed

### Scenario 4: Todos los parametros sin threshold
- **Given** todos los parametros del test son informativos (sin thresholds)
- **When** el supervisor registra valores para todos
- **Then** overall_passed = true (no hay nada que falle)

### Scenario 5: Test ya completado
- **Given** un test ya tiene resultados registrados (status='completed')
- **When** el supervisor intenta registrar resultados nuevamente
- **Then** se muestra error 409 "Este test ya tiene resultados registrados"
- **And** no permite sobrescribir (los resultados son inmutables)

### Scenario 6: Valor numerico como string
- **Given** el supervisor ingresa "23.5" como string en el campo valor
- **When** se compara contra thresholds numericos
- **Then** el sistema parsea "23.5" a float 23.5 para la comparacion
- **And** el campo passed se calcula correctamente

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Validacion Zod client y server (recordResultsSchema)
- [ ] Acceptance criteria verified
- [ ] Auto-calculo pass/fail correcto con edge cases

## Technical Notes
- Pantalla: `qual-results`
- Server Action: `recordResults(input)` en `lib/actions/quality.actions.ts`
- Zod schema: `recordResultsSchema` (ya definido en docs/alquemist-features.md)
- INSERT quality_test_results (uno por parametro) con:
  - value (string), numeric_value (parsed float si posible)
  - passed = null si no hay thresholds, true si min <= numeric_value <= max, false si fuera de rango
- UPDATE quality_test: status='completed', overall_pass = AND(all results with thresholds passed)
- Error 409 si test.status != 'pending' y != 'in_progress'
- revalidatePath('/quality')

## UI/UX Notes
- Tabla editable: parametro (label), valor (input), unidad, thresholds mostrados como referencia (min-max en gris)
- Indicador visual por parametro: check verde si pasa, x rojo si no, guion gris si informativo
- Overall pass/fail como badge grande al top del formulario, actualizado en tiempo real
- Boton "Registrar Resultados" solo activo cuando al menos 1 resultado esta ingresado
- Layout responsive: tabla en desktop, cards apiladas en mobile

## Dependencies
- US-032-001 (Lista de tests pendientes)
- US-032-002 (Crear test)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-032-004: Generacion automatica de alerta por fallo

## User Story

**As a** gerente,
**I want** que cuando un test de calidad falla se genere automaticamente una alerta critica vinculada al batch,
**So that** el equipo sea notificado inmediatamente y pueda tomar acciones correctivas.

## Acceptance Criteria

### Scenario 1: Alerta generada por fallo de test
- **Given** se registran resultados de un test y overall_passed = false
- **When** se completa el registro
- **Then** se genera automaticamente una alerta tipo 'quality_failed', severity='critical'
- **And** la alerta se vincula al batch (entity_type='batch', entity_id=batch_id)
- **And** el mensaje incluye: "Test de [tipo] fallido para [batch_code]. Parametros fuera de rango: [lista]"

### Scenario 2: Test pasa - no genera alerta
- **Given** se registran resultados de un test y overall_passed = true
- **When** se completa el registro
- **Then** no se genera ninguna alerta
- **And** el batch no recibe notificacion de fallo

### Scenario 3: Alerta visible en batch detail
- **Given** se genero una alerta de quality_failed para LOT-001
- **When** el gerente accede al detalle del batch LOT-001 tab Calidad
- **Then** la alerta aparece con badge rojo "Test fallido" y link al detalle del test

### Scenario 4: Alerta en centro de alertas
- **Given** se genero una alerta de quality_failed
- **When** el supervisor accede al centro de alertas (ops-alerts)
- **Then** la alerta aparece en la tab "Pendientes" con severity='critical' y link al batch

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Alerta se genera atomicamente con el registro de resultados

## Technical Notes
- Dentro de la misma transaccion de recordResults: si overall_passed = false, INSERT alert
- Alert: type='quality_failed', severity='critical', entity_type='batch', entity_id=batch_id
- Mensaje dinamico con parametros que fallaron
- Supabase Realtime: broadcast en canal 'alerts:{company_id}' para notificacion live
- La alerta se puede reconocer y resolver desde ops-alerts

## UI/UX Notes
- Toast de alerta tras registrar resultados fallidos: "Alerta de calidad generada para [batch]"
- Badge rojo en el batch en la lista de batches
- Notificacion push (si configurada) para supervisor y gerente

## Dependencies
- US-032-003 (Registrar resultados)
- Centro de alertas (Fase 3, pero la alerta se genera en Fase 2)

## Estimation
- **Size**: S
- **Complexity**: Medium

---

# US-032-005: Upload de certificado PDF

## User Story

**As a** supervisor,
**I want** adjuntar el certificado PDF del laboratorio al test de calidad,
**So that** quede respaldo documental del analisis para auditorias regulatorias y trazabilidad.

## Acceptance Criteria

### Scenario 1: Upload exitoso de PDF
- **Given** el supervisor esta registrando resultados de un test
- **When** adjunta un archivo PDF de 2MB
- **Then** el archivo se sube a Supabase Storage bucket 'quality-certificates'
- **And** el URL se guarda en certificate_url del test
- **And** el archivo se nombra: {test_id}/{lab_reference}.pdf

### Scenario 2: Archivo no es PDF
- **Given** el supervisor intenta adjuntar un archivo .jpg
- **When** selecciona el archivo
- **Then** se muestra error "Solo se permiten archivos PDF"
- **And** el upload no se ejecuta

### Scenario 3: Archivo demasiado grande
- **Given** el supervisor intenta adjuntar un PDF de 15MB
- **When** selecciona el archivo
- **Then** se muestra error "El archivo excede el tamano maximo de 10MB"
- **And** el upload no se ejecuta

### Scenario 4: Descargar certificado existente
- **Given** un test completado tiene certificate_url guardado
- **When** el supervisor ve el detalle del test
- **Then** se muestra link "Descargar certificado" con icono de PDF
- **And** al hacer tap, descarga el PDF via signed URL de Supabase Storage

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Signed URLs para acceso seguro

## Technical Notes
- Supabase Storage: bucket 'quality-certificates' (privado)
- Upload via Supabase client con policy: solo supervisor+ puede escribir
- Descarga via signed URL con expiracion de 1 hora
- Validacion client-side: tipo MIME = application/pdf, tamano < 10MB
- Naming: {test_id}/{lab_reference}.pdf
- Tambien se puede registrar como attachment: entity_type='quality_test', entity_id=test_id

## UI/UX Notes
- Boton "Adjuntar certificado" con icono Upload en el formulario de resultados
- Preview del nombre del archivo seleccionado con icono PDF
- Progress bar durante upload
- En detalle del test completado: icono PDF con link de descarga

## Dependencies
- US-032-003 (Registrar resultados)
- Supabase Storage configurado con bucket 'quality-certificates'

## Estimation
- **Size**: S
- **Complexity**: Medium
