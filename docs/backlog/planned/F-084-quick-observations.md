# F-084: Observaciones Rapidas con Fotos

## Overview

Permite a operadores y supervisores registrar observaciones de campo de forma independiente (sin actividad asociada), con fotos comprimidas client-side y generacion automatica de alertas por severidad. Actualmente las observaciones solo se pueden registrar como parte del flujo de ejecucion de actividades (F-022), lo que obliga al operador a tener una actividad abierta para reportar un problema. Este feature habilita el flujo ACT-F03 del documento de flujos de usuario: FAB desde dashboard o desde detalle de batch, seleccionar batch, tipo, severidad, descripcion y fotos.

Absorbe la story diferida US-022-003 (observations + photos) y la extiende con soporte standalone.

## User Personas

- **Operador**: Detecta problemas en campo (plagas, enfermedades, deficiencias) y necesita reportarlos inmediatamente sin depender de una actividad programada. Trabaja frecuentemente offline.
- **Supervisor**: Registra observaciones durante rondas de inspeccion. Recibe alertas automaticas cuando un operador reporta severidad critica.
- **Admin**: Puede registrar observaciones. Gestiona configuracion del bucket de Storage.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-084-001 | Formulario de observacion con selector de batch | M | P0 | Planned |
| US-084-002 | Captura y compresion de fotos | M | P0 | Planned |
| US-084-003 | Generacion de alertas por severidad | S | P1 | Planned |

---

# US-084-001: Formulario de observacion con selector de batch

## User Story

**As a** operador,
**I want** registrar una observacion rapida seleccionando un batch, tipo, severidad y descripcion,
**So that** pueda reportar problemas detectados en campo sin necesidad de tener una actividad abierta.

## Acceptance Criteria

### Scenario 1: Crear observacion desde FAB del dashboard
- **Given** el operador esta en el dashboard y hay 3 batches activos en su facility
- **When** toca el FAB y selecciona "Observacion"
- **Then** se abre un formulario con: selector de batch (solo batches activos de la facility), tipo (pest/disease/deficiency/environmental/general), severidad (info/low/medium/high/critical), descripcion (textarea), plantas afectadas (opcional, numero entero positivo), y boton "Registrar"

### Scenario 2: Crear observacion desde detalle de batch
- **Given** el operador esta viendo el detalle del batch LOT-001
- **When** toca el boton "Observacion" en la action bar inferior
- **Then** se abre el mismo formulario pero con el batch LOT-001 pre-seleccionado y el selector de batch deshabilitado

### Scenario 3: Validacion de campos obligatorios
- **Given** el operador abre el formulario de observacion
- **When** intenta enviar sin completar tipo, severidad o descripcion, o con descripcion menor a 5 caracteres
- **Then** el sistema muestra errores de validacion inline: "Tipo es obligatorio", "Severidad es obligatoria", "La descripcion debe tener al menos 5 caracteres"

### Scenario 4: Observacion registrada exitosamente
- **Given** el operador completa: batch=LOT-001, tipo=pest, severidad=high, descripcion="Araña roja detectada en hojas inferiores zona norte", plantas afectadas=10
- **When** toca "Registrar"
- **Then** el sistema inserta en `activity_observations` con activity_id=NULL, batch_id=LOT-001, y muestra toast "Observacion registrada". El formulario se cierra y vuelve a la pantalla anterior.

### Scenario 5: Observacion sin batch (observacion general de zona)
- **Given** el operador quiere reportar algo ambiental no vinculado a un batch especifico
- **When** deja el selector de batch vacio y completa tipo=environmental, severidad=medium, descripcion="Condensacion excesiva en techo del invernadero"
- **Then** el sistema registra la observacion con batch_id=NULL. La observacion aparece en el historial general sin vinculacion a batch.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Schema migration: `activity_observations.activity_id` nullable + agregar `batch_id` FK
- [ ] Validacion Zod compartida client/server
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: labels, focus visible, contraste AA

## Technical Notes
- **Schema migration**: ALTER TABLE `activity_observations` — hacer `activity_id` nullable (actualmente NOT NULL) y agregar columna `batch_id UUID REFERENCES batches(id)`. Agregar CHECK constraint: al menos uno de `activity_id` o `batch_id` debe ser NOT NULL.
- **Server Action**: `createObservation(data)` en `src/lib/actions/observations.ts` con `requireAuth(['operator', 'supervisor', 'admin'])`
- **Zod Schema**: `observationSchema` en `src/lib/schemas/observation.ts`
  - batch_id: uuid optional (nullable para observaciones generales)
  - type: enum (pest, disease, deficiency, environmental, general)
  - severity: enum (info, low, medium, high, critical)
  - description: string min(5) max(2000)
  - affected_plants: number int positive optional
- **Ruta**: No tiene ruta propia — se accede desde FAB en dashboard (`/(dashboard)/`) y desde batch detail (`/(dashboard)/batches/[id]`)
- **Componente**: `ObservationDialog` en `src/components/activities/observation-dialog.tsx` — Dialog (bottom sheet mobile / modal desktop)
- **RLS**: Tipo C — `company_id` derivado del batch o del usuario autenticado. El trigger auto-popula.
- **FAB**: Floating Action Button en dashboard con opciones (Observacion, posiblemente otras acciones futuras). Usar componente existente Dialog como bottom sheet.

## UI/UX Notes
- FAB: boton circular fijo bottom-right (antes del bottom bar safe area), icono `Plus` de Lucide, bg-primary
- Al tocar FAB: bottom sheet con opciones disponibles. Si solo hay "Observacion", ir directo al formulario.
- Formulario en Dialog (bottom sheet mobile / modal desktop)
- Selector de batch: dropdown con search, muestra batch code + cultivar name + zona
- Chips o radio group para tipo y severidad (no select nativo — son pocos valores)
- Severidad con colores: info=gray, low=blue, medium=yellow, high=orange, critical=red
- Textarea para descripcion con contador de caracteres

## Dependencies
- F-003 (schema de DB con tabla activity_observations)
- F-004 (auth y middleware)
- F-022 (flujo actual de observaciones dentro de actividades — se reutiliza logica)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-084-002: Captura y compresion de fotos

## User Story

**As a** operador,
**I want** adjuntar hasta 5 fotos a mi observacion, comprimidas automaticamente para no consumir datos,
**So that** pueda documentar visualmente el problema detectado y el supervisor pueda evaluarlo remotamente.

## Acceptance Criteria

### Scenario 1: Capturar fotos desde camara del dispositivo
- **Given** el operador esta completando el formulario de observacion
- **When** toca el boton "Agregar foto" y selecciona "Tomar foto"
- **Then** se abre la camara nativa del dispositivo. Al tomar la foto, se comprime a 1200px de ancho maximo, JPEG calidad 80%, y se muestra como thumbnail en el formulario.

### Scenario 2: Seleccionar foto de galeria
- **Given** el operador esta completando el formulario de observacion
- **When** toca "Agregar foto" y selecciona "Galeria"
- **Then** se abre el selector de archivos nativo. Al seleccionar una imagen, se comprime con los mismos parametros y se muestra como thumbnail.

### Scenario 3: Limite de 5 fotos
- **Given** el operador ya agrego 5 fotos a la observacion
- **When** intenta agregar una sexta foto
- **Then** el boton "Agregar foto" esta deshabilitado con texto "Maximo 5 fotos"

### Scenario 4: Eliminar foto antes de enviar
- **Given** el operador tiene 3 fotos adjuntas al formulario
- **When** toca el icono X en el thumbnail de la segunda foto
- **Then** la foto se elimina del formulario. El contador muestra "2/5 fotos" y el boton "Agregar foto" se habilita nuevamente.

### Scenario 5: Fotos subidas a Supabase Storage al registrar
- **Given** el operador completa la observacion con 3 fotos comprimidas
- **When** toca "Registrar" estando online
- **Then** las fotos se suben al bucket `observation-photos` en Supabase Storage con path `{company_id}/{observation_id}/{index}.jpg`, y se crean registros en `attachments` con entity_type='observation', entity_id=la observacion, file_url=URL publica.

### Scenario 6: Fotos almacenadas offline cuando no hay red
- **Given** el operador no tiene conexion a internet
- **When** completa la observacion con 2 fotos y toca "Registrar"
- **Then** la observacion se encola en Dexie `syncQueue` y las fotos se almacenan como blobs en `offlinePhotos`. UI muestra feedback optimista "Observacion guardada (pendiente de sincronizacion)". Al reconectar, las fotos se suben automaticamente y se crean los registros en `attachments`.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Compresion client-side verificada: max 1200px, JPEG 80%
- [ ] Subida a Supabase Storage bucket `observation-photos`
- [ ] Registros en tabla `attachments` con entity_type='observation'
- [ ] Flujo offline verificado: Dexie syncQueue + offlinePhotos
- [ ] Criterios de aceptacion verificados

## Technical Notes
- **Compresion**: Usar `canvas` API nativo del browser — crear canvas de max 1200px (mantener aspect ratio), `toBlob('image/jpeg', 0.8)`. No requiere libreria externa.
- **Storage bucket**: Crear bucket `observation-photos` en Supabase Storage (puede ser via migration o manualmente). RLS policy: INSERT para authenticated, SELECT para authenticated con mismo company_id.
- **Subida**: Server Action `uploadObservationPhotos(observationId, files: File[])` — usa admin client o signed upload URL. Retorna URLs publicas.
- **Attachments**: INSERT en `attachments` tabla con entity_type='observation', entity_id, file_url, file_type='image/jpeg', file_size_bytes, uploaded_by.
- **Offline**: Al estar offline, las fotos comprimidas se guardan en Dexie `offlinePhotos` store con key={syncQueueId}_{index}. El sync worker procesa: 1) crear observacion via Server Action, 2) subir fotos a Storage, 3) crear attachments, 4) limpiar offlinePhotos.
- **Componente**: `PhotoCapture` en `src/components/shared/photo-capture.tsx` — reutilizable para futuras features que necesiten fotos.
- **Input**: `<input type="file" accept="image/*" capture="environment">` para camara, sin `capture` para galeria.

## UI/UX Notes
- Grid de thumbnails 3 columnas debajo del textarea de descripcion
- Cada thumbnail: imagen cuadrada con borde redondeado, icono X en esquina superior derecha
- Boton "Agregar foto" con icono Camera de Lucide. Si hay fotos: muestra contador "3/5"
- Placeholder cuando no hay fotos: area dashed con icono Camera + "Toca para agregar fotos"
- Progress indicator durante la compresion (puede ser instantaneo en la mayoria de dispositivos)
- Badge "Pendiente" en thumbnail si la foto esta esperando sync offline

## Dependencies
- US-084-001 (formulario base de observacion)
- F-049 (offline: Dexie syncQueue y offlinePhotos stores)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-084-003: Generacion de alertas por severidad

## User Story

**As a** supervisor,
**I want** que las observaciones con severidad 'critical' generen una alerta automatica,
**So that** me entere inmediatamente de problemas graves sin tener que revisar manualmente cada observacion.

## Acceptance Criteria

### Scenario 1: Observacion critica genera alerta automatica
- **Given** un operador registra una observacion con severidad='critical', tipo='pest', batch=LOT-001, descripcion="Infestacion severa de trips en toda la zona"
- **When** la observacion se guarda exitosamente
- **Then** el sistema inserta automaticamente una alerta: type='quality_failed', severity='critical', entity_type='batch', entity_id=LOT-001, message="Observacion critica: Infestacion severa de trips en toda la zona"

### Scenario 2: Observacion high genera alerta warning
- **Given** un operador registra una observacion con severidad='high', tipo='disease', batch=LOT-002
- **When** la observacion se guarda exitosamente
- **Then** el sistema inserta una alerta: type='quality_failed', severity='warning', entity_type='batch', entity_id=LOT-002

### Scenario 3: Severidad media o baja no genera alerta
- **Given** un operador registra una observacion con severidad='medium'
- **When** la observacion se guarda exitosamente
- **Then** no se genera ninguna alerta. La observacion queda registrada para consulta pero sin notificacion automatica.

### Scenario 4: Alerta visible en centro de alertas y dashboard
- **Given** se genero una alerta por observacion critica en LOT-001
- **When** el supervisor abre el centro de alertas
- **Then** la alerta aparece en la tab "Pendientes" con badge de severidad 'critical', tipo 'quality_failed', y link directo al batch LOT-001. El badge del icono de campana en top bar se incrementa.

### Scenario 5: Debounce de alertas duplicadas
- **Given** un operador registro una observacion critica para LOT-001 hace 10 minutos
- **When** otro operador registra otra observacion critica para el mismo LOT-001
- **Then** no se genera una segunda alerta (debounce 30 min para mismo entity_type + entity_id + alert type). La nueva observacion queda registrada normalmente.

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Alertas generadas atomicamente con la observacion (misma transaccion o fire-and-forget)
- [ ] Debounce de 30 min verificado
- [ ] Criterios de aceptacion verificados
- [ ] Alerta visible via Supabase Realtime en dashboard del supervisor

## Technical Notes
- **Logica**: Dentro de `createObservation()` Server Action, despues de INSERT observation: si severity='critical' o severity='high', verificar debounce (SELECT alert WHERE entity_type='batch' AND entity_id=batch_id AND type='quality_failed' AND triggered_at > now() - 30min). Si no hay duplicada, INSERT alert.
- **Mapping severidad**: critical → alert severity='critical'. high → alert severity='warning'. medium/low/info → no alert.
- **Alert type**: Usar 'quality_failed' del enum existente (es el mas semanticamente cercano). Si se necesita un tipo nuevo, habria que agregar al enum.
- **Realtime**: La alerta se broadcastea automaticamente por el canal de Supabase Realtime existente (F-050 ya configuro suscripciones a alerts).
- **Observacion sin batch**: Si batch_id es NULL, la alerta no se genera (no hay entidad a vincular). Se podria vincular a facility en el futuro.

## UI/UX Notes
- No tiene UI propia — la alerta aparece en el centro de alertas existente (F-047)
- El mensaje de la alerta debe ser descriptivo: "Observacion {tipo}: {primeros 100 chars de descripcion}"
- Al tap en la alerta: navegar al detalle del batch, tab timeline donde se ve la observacion

## Dependencies
- US-084-001 (formulario de observacion que invoca la logica de alertas)
- F-047 (centro de alertas existente)
- F-050 (Supabase Realtime para broadcast de alertas)

## Estimation
- **Size**: S
- **Complexity**: Medium
