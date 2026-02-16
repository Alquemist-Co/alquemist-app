# F-049: Offline Completo

## Overview

Implementacion completa de la estrategia offline-first que permite al operador completar su jornada laboral sin conexion a internet. Incluye el schema de Dexie.js para almacenamiento local, la cola de sincronizacion (sync queue) con procesamiento FIFO, resolucion de conflictos (last-write-wins + server reconcile), compresion de fotos client-side, background sync con Serwist, pre-carga proactiva de datos al conectar WiFi, e indicador permanente de estado de conexion.

## User Personas

- **Operador**: Trabaja en campo sin internet, completa actividades offline, toma fotos, y sincroniza al reconectar.
- **Supervisor**: Recibe datos sincronizados de operadores, ve estado de conexion del equipo.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-049-001 | Dexie schema completo con almacenamiento local | M | P0 | Planned |
| US-049-002 | Sync queue con procesamiento FIFO | L | P0 | Planned |
| US-049-003 | Resolucion de conflictos | M | P0 | Planned |
| US-049-004 | Compresion de fotos y encolado offline | M | P1 | Planned |
| US-049-005 | Background sync y pre-carga proactiva | M | P1 | Planned |
| US-049-006 | Indicador permanente de estado de conexion | S | P0 | Planned |

---

# US-049-001: Dexie schema completo con almacenamiento local

## User Story

**As a** operador,
**I want** que la app descargue y almacene localmente los datos que necesito para trabajar (actividades, batches, templates, productos, inventario),
**So that** pueda acceder a toda la informacion necesaria para ejecutar mi jornada aunque pierda la conexion a internet.

## Acceptance Criteria

### Scenario 1: Descarga inicial al login
- **Given** el operador se autentica exitosamente con conexion a internet
- **When** la sesion se inicia
- **Then** se descargan a IndexedDB via Dexie:
  - scheduled_activities del usuario para los proximos 7 dias
  - batches activos en las zonas del usuario
  - activity_templates del crop_type activo
  - productos activos (catalogo)
  - inventory_items con stock disponible en las zonas del usuario
  - zonas de la facility del usuario
  - cultivars activos
  - production_phases
- **And** se muestra progreso de descarga al usuario
- **And** al completar, se registra timestamp de ultima sincronizacion

### Scenario 2: Datos accesibles sin conexion
- **Given** la descarga inicial se completo correctamente
- **When** el operador pierde conexion a internet
- **Then** puede navegar a sus actividades de hoy, ver detalles de batches, consultar stock disponible
- **And** los datos se leen desde IndexedDB, no del server

### Scenario 3: Login sin conexion previa
- **Given** el operador nunca ha iniciado sesion en este dispositivo
- **When** intenta usar la app sin conexion
- **Then** se muestra mensaje "Necesitas conexion a internet para el primer inicio de sesion"
- **And** la app no puede funcionar offline sin datos locales previos

### Scenario 4: Datos obsoletos con timestamp
- **Given** la ultima sincronizacion fue hace 24 horas
- **When** el operador accede a datos locales
- **Then** se muestra "Datos de hace 24h" en el banner de estado
- **And** los datos son funcionales aunque no esten 100% actualizados

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Schema Dexie tipado con TypeScript
- [ ] Migraciones de schema versionadas
- [ ] Tamanio maximo de datos locales < 50MB

## Technical Notes
- Ubicacion: `lib/offline/dexie-schema.ts`
- Schema completo basado en el definido en `docs/alquemist-features.md`:
  ```typescript
  class AlquemistDB extends Dexie {
    scheduledActivities!: Table;
    batches!: Table;
    activityTemplates!: Table;
    products!: Table;
    inventoryItems!: Table;
    zones!: Table;
    cultivars!: Table;
    productionPhases!: Table;
    syncQueue!: Table;
    offlinePhotos!: Table;
  }
  ```
- Indices optimizados para queries offline:
  - scheduledActivities: 'id, batch_id, planned_date, status, assigned_to'
  - batches: 'id, code, zone_id, status, current_phase_id'
  - syncQueue: '++localId, timestamp, action, status, entityType'
- Descarga: funciones modulares por tabla, llamadas en paralelo al login
- Filtros de descarga segun tabla (ver docs/alquemist-features.md seccion Pre-carga)
- Hook custom: `useOfflineData()` que abstrae lectura de Dexie vs server

## UI/UX Notes
- Indicador de progreso de descarga: barra linear con porcentaje
- "Descargando datos para uso offline... 65%"
- No bloquea el uso de la app: el usuario puede navegar mientras descarga
- Skeleton loaders si datos de una tabla aun no se han descargado

## Dependencies
- Fase 0: Serwist configurado, Dexie.js instalado
- Fase 1: F-022 (scheduled_activities, activity_templates)
- Fase 2: F-026 (inventory_items, products)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-049-002: Sync queue con procesamiento FIFO

## User Story

**As a** operador,
**I want** que cada accion que realice offline (completar actividad, registrar observacion, recibir item) se encole automaticamente y se envie al server en orden cuando recupere conexion,
**So that** mis acciones no se pierdan y se procesen correctamente al reconectar.

## Acceptance Criteria

### Scenario 1: Accion offline se encola
- **Given** el operador no tiene conexion a internet
- **When** completa una actividad (ejecuta executeActivity)
- **Then** la mutacion se serializa en IndexedDB como item de sync queue: {localId, timestamp, action: 'completeActivity', entityType: 'activity', payload: {...}, status: 'pending', retryCount: 0}
- **And** la UI muestra feedback optimista (actividad aparece como completada)
- **And** un badge muestra "1 pendiente de sincronizar"

### Scenario 2: Cola se procesa FIFO al reconectar
- **Given** hay 5 items en la sync queue con status 'pending' encolados en orden cronologico
- **When** el dispositivo recupera conexion
- **Then** los items se procesan uno por uno en orden FIFO (mas antiguo primero)
- **And** cada item pasa por: status 'pending' -> 'syncing' -> 'synced' (o 'failed')
- **And** se llama al Server Action correspondiente con el payload serializado

### Scenario 3: Item falla al sincronizar — retry con backoff
- **Given** un item de la cola falla al enviarse al server (error 500)
- **When** se detecta el fallo
- **Then** retryCount se incrementa y status vuelve a 'pending'
- **And** se reintenta con backoff exponencial (1s, 2s, 4s)
- **And** despues de 3 intentos fallidos: status = 'failed' y se notifica al usuario

### Scenario 4: Item fallido no bloquea el resto
- **Given** el item #2 de la cola falla permanentemente (status = 'failed')
- **When** se procesan los items restantes
- **Then** los items #3, #4, #5 se procesan normalmente
- **And** el item #2 permanece como 'failed' para revision manual

### Scenario 5: Limpieza de cola
- **Given** hay items con status = 'synced' de hace mas de 7 dias
- **When** se ejecuta la limpieza periodica
- **Then** los items 'synced' con mas de 7 dias se eliminan
- **And** los items 'failed' y 'conflict' se mantienen indefinidamente

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] FIFO garantizado por timestamp
- [ ] Retry con backoff exponencial
- [ ] Items fallidos no bloquean el resto de la cola
- [ ] Limpieza automatica de items antiguos

## Technical Notes
- Ubicacion: `lib/offline/sync-queue.ts`
- Interface:
  ```typescript
  interface SyncQueueItem {
    localId?: number;
    timestamp: string;
    action: string;
    entityType: string;
    payload: Record<string, any>;
    status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
    retryCount: number;
    errorMessage?: string;
    serverResponse?: Record<string, any>;
  }
  ```
- Procesamiento:
  1. `SELECT * FROM syncQueue WHERE status = 'pending' ORDER BY timestamp ASC`
  2. Para cada item: UPDATE status='syncing', llamar Server Action, UPDATE resultado
- Mapeo action -> Server Action:
  - 'completeActivity' -> executeActivity()
  - 'createObservation' -> createObservation()
  - 'receiveItem' -> receiveItem()
- Backoff: `delay = Math.min(1000 * Math.pow(2, retryCount), 30000)`
- Trigger: evento 'online' + timer cada 60s si online + manual pull-to-refresh
- Invalida TanStack Query caches tras sync exitoso

## UI/UX Notes
- Badge en topbar: "3 pendientes" con icono de sync
- Cuando syncing: animacion de rotacion en el icono
- Al completar sync: toast "3 acciones sincronizadas correctamente"
- Item fallido: notificacion con opcion de reintentar o ver detalle

## Dependencies
- US-049-001 (Dexie schema con syncQueue table)
- Fase 0: Serwist, TanStack Query

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-049-003: Resolucion de conflictos

## User Story

**As a** operador,
**I want** que los conflictos de sincronizacion (cuando edite algo offline que otro usuario tambien edito) se resuelvan automaticamente o me notifiquen claramente,
**So that** no pierda mi trabajo ni corrompa datos de otros usuarios.

## Acceptance Criteria

### Scenario 1: Last-write-wins sin conflicto
- **Given** el operador completo una actividad offline a las 10:00
- **And** nadie mas modifico esa actividad en el server
- **When** se sincroniza la accion
- **Then** el server acepta la mutacion normalmente
- **And** status = 'synced'

### Scenario 2: Conflicto detectado — actividad ya completada
- **Given** el operador completo la actividad offline a las 10:00
- **And** otro operador ya la completo en el server a las 09:45
- **When** se intenta sincronizar
- **Then** el server retorna 409 Conflict con mensaje "Actividad ya completada por {usuario} a las 09:45"
- **And** el item se marca como status = 'conflict'
- **And** se muestra notificacion al usuario con la informacion del conflicto

### Scenario 3: Conflicto en inventario — server reconcilia
- **Given** el operador consumio 10 unidades de Fertilizante offline
- **And** otro usuario tambien consumio stock y ahora solo quedan 3 unidades
- **When** se sincroniza la transaccion
- **Then** el server detecta stock insuficiente pero acepta la transaccion (el consumo ya ocurrio fisicamente)
- **And** genera una alerta de stock negativo para el supervisor
- **And** el inventario queda en negativo temporal hasta ajuste

### Scenario 4: Usuario resuelve conflicto manualmente
- **Given** hay un item con status 'conflict' en la cola
- **When** el operador abre la notificacion de conflicto
- **Then** ve: accion que intento, estado actual del server, opciones: "Mantener mi version" | "Aceptar version del server" | "Descartar"
- **And** al seleccionar una opcion, el conflicto se resuelve

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Last-write-wins como default
- [ ] Server reconcile para datos criticos (inventario)
- [ ] UI de resolucion manual para conflictos no automaticos

## Technical Notes
- Ubicacion: `lib/offline/conflict-resolver.ts`
- Estrategia por entityType:
  - activities: last-write-wins (si 409: marcar como conflict, no reintentar)
  - inventory_transactions: server siempre acepta (inventario puede ir negativo, se ajusta despues)
  - observations: always-accept (no hay conflicto posible, es append-only)
- Deteccion: HTTP 409 del server indica conflicto
- Server-side: comparar `updated_at` del registro con timestamp de la mutacion offline
- UI de resolucion: dialog con diff visual entre version local y server

## UI/UX Notes
- Notificacion de conflicto: card amarilla persistente en dashboard
- "Conflicto: tu actividad 'Fertirrigacion' en LOT-001 ya fue completada por Carlos a las 09:45"
- Opciones claras con iconos: check (mantener), refresh (aceptar server), trash (descartar)
- Historial de conflictos resueltos accesible desde settings

## Dependencies
- US-049-002 (sync queue)
- Fase 1: Server Actions de actividades con deteccion de conflicto (409)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-049-004: Compresion de fotos y encolado offline

## User Story

**As a** operador,
**I want** que las fotos que tomo durante actividades se compriman automaticamente y se guarden localmente para subir cuando tenga conexion,
**So that** pueda documentar mis actividades con fotos sin preocuparme por el tamano del archivo o la falta de internet.

## Acceptance Criteria

### Scenario 1: Foto comprimida automaticamente
- **Given** el operador toma una foto de 4MB (3000x4000px) durante una actividad
- **When** la foto se procesa
- **Then** se redimensiona a max 1200px en el lado mas largo
- **And** se comprime a JPEG con calidad 80%
- **And** el archivo resultante es ~200KB
- **And** se almacena como blob en IndexedDB (tabla offlinePhotos)

### Scenario 2: Foto se sube al reconectar
- **Given** hay 3 fotos offline en offlinePhotos vinculadas a actividades en syncQueue
- **When** la sync queue procesa la actividad padre exitosamente
- **Then** se buscan offlinePhotos con syncQueueId correspondiente
- **And** cada foto se sube a Supabase Storage bucket 'activity-photos'
- **And** la URL resultante se actualiza en el registro de la actividad server-side
- **And** la foto local se marca para limpieza

### Scenario 3: Compresion agresiva si la primera falla
- **Given** una foto comprimida a 1200px/80% supera el limite de upload (5MB)
- **When** se detecta que el tamano sigue siendo muy grande
- **Then** se recomprime a 800px, JPEG 60%
- **And** si aun falla: se encola para retry posterior

### Scenario 4: Multiples fotos por actividad
- **Given** el operador toma 5 fotos en una actividad (observaciones)
- **When** se guardan offline
- **Then** las 5 fotos se comprimen y almacenan individualmente
- **And** cada una vinculada al mismo syncQueueId
- **And** se suben secuencialmente (no en paralelo) para no saturar la conexion

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Compresion < 500ms por foto
- [ ] Tamano final promedio < 300KB
- [ ] Fotos se limpian de IndexedDB tras upload exitoso

## Technical Notes
- Compresion: Canvas API
  ```typescript
  async function compressPhoto(file: File): Promise<Blob> {
    const img = await createImageBitmap(file);
    const maxDim = 1200;
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
    const canvas = new OffscreenCanvas(img.width * scale, img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
  }
  ```
- Almacenamiento en Dexie:
  ```typescript
  db.offlinePhotos.add({
    syncQueueId: parentItem.localId,
    blob: compressedBlob,
    compressedSize: compressedBlob.size,
    originalName: file.name,
    mimeType: 'image/jpeg',
  });
  ```
- Upload: despues de sync exitoso de la actividad padre
- Naming en Storage: `{batch_id}/{activity_id}/{timestamp}.jpg`
- Limpieza: eliminar de offlinePhotos tras upload confirmado

## UI/UX Notes
- Preview de foto comprimida inmediata en la UI
- Indicador de tamano: "320 KB (comprimida de 3.8 MB)"
- Badge "3 fotos pendientes de subir" junto al indicador offline
- Progress bar por foto durante upload

## Dependencies
- US-049-002 (sync queue para vinculacion)
- Fase 0: Supabase Storage configurado

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-049-005: Background sync y pre-carga proactiva

## User Story

**As a** operador,
**I want** que la sincronizacion ocurra automaticamente en segundo plano cuando recupero conexion, y que los datos se pre-carguen al conectar WiFi,
**So that** no tenga que hacer nada manual para mantener mis datos actualizados.

## Acceptance Criteria

### Scenario 1: Sync automatico al reconectar
- **Given** el operador estaba offline con 3 items en sync queue
- **When** el dispositivo recupera conexion a internet
- **Then** Serwist dispara evento 'sync' automaticamente
- **And** la cola se procesa sin intervencion del usuario
- **And** al completar, se muestra toast "3 acciones sincronizadas"

### Scenario 2: Pre-carga al conectar WiFi
- **Given** el operador se conecta a WiFi (navigator.connection.type === 'wifi')
- **When** se detecta la conexion WiFi
- **Then** se descargan datos de las proximas 24 horas: actividades programadas, inventario actualizado
- **And** la descarga ocurre en background sin afectar la interaccion del usuario
- **And** no se descarga por datos moviles (solo WiFi)

### Scenario 3: Sync periodico mientras esta online
- **Given** el operador tiene conexion estable
- **When** pasan 60 segundos desde el ultimo sync
- **Then** se verifica si hay items pendientes en la cola y se procesan
- **And** se actualizan datos locales con cambios del server (bidireccional)

### Scenario 4: Sync manual con pull-to-refresh
- **Given** el operador quiere forzar sincronizacion
- **When** hace pull-to-refresh en cualquier lista
- **Then** se procesa sync queue + se refrescan datos locales
- **And** se muestra timestamp "Ultima sincronizacion: ahora"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Background sync funciona con app cerrada (service worker)
- [ ] Pre-carga solo en WiFi
- [ ] No impacta rendimiento de la UI

## Technical Notes
- Serwist service worker: registrar sync event
  ```typescript
  // En service worker
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-queue') {
      event.waitUntil(processSyncQueue());
    }
  });
  ```
- Registro del sync: `navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-queue'))`
- Pre-carga WiFi:
  ```typescript
  const connection = navigator.connection;
  if (connection?.type === 'wifi' || connection?.effectiveType === '4g') {
    preloadUpcomingData();
  }
  ```
- Timer periodico: `setInterval(checkAndSync, 60000)` solo si document.visibilityState === 'visible'
- TanStack Query: invalidar queries afectadas tras sync exitoso

## UI/UX Notes
- Sync en background: sin indicador visual a menos que haya items pendientes
- Toast al completar sync automatico: sutil, auto-dismiss 3s
- Pull-to-refresh: animacion nativa del navegador + spinner custom
- Pre-carga: completamente invisible para el usuario

## Dependencies
- US-049-001 (Dexie schema)
- US-049-002 (sync queue)
- Fase 0: Serwist configurado

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-049-006: Indicador permanente de estado de conexion

## User Story

**As a** operador,
**I want** ver un indicador permanente que me muestre si estoy conectado o sin conexion y cuando fue la ultima sincronizacion,
**So that** siempre sepa si mis acciones se estan guardando localmente o enviando al server.

## Acceptance Criteria

### Scenario 1: Conectado
- **Given** el dispositivo tiene conexion a internet activa
- **When** la app esta abierta
- **Then** se muestra banner verde compacto "Conectado" en la parte superior
- **And** el banner es no intrusivo (altura 24px, no bloquea contenido)

### Scenario 2: Sin conexion
- **Given** el dispositivo pierde conexion
- **When** se detecta el evento offline
- **Then** el banner cambia a amarillo "Sin conexion — datos de las HH:MM"
- **And** HH:MM es la hora de la ultima sincronizacion exitosa
- **And** el banner permanece visible en todas las pantallas

### Scenario 3: Sincronizando
- **Given** hay items en sync queue procesandose
- **When** la sincronizacion esta activa
- **Then** el banner muestra "Sincronizando... (2 de 5)" con animacion de progreso
- **And** al completar: vuelve a "Conectado" o "Sin conexion" segun estado

### Scenario 4: Items pendientes offline
- **Given** el operador realizo 3 acciones offline
- **When** ve el indicador
- **Then** muestra "Sin conexion — 3 acciones pendientes" en amarillo
- **And** al reconectar, cambia a "Sincronizando..." y luego "Conectado"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Banner visible en todas las pantallas (en layout principal)
- [ ] Responsive: se adapta a mobile y desktop
- [ ] Accesibilidad: aria-live region para cambios de estado

## Technical Notes
- Componente: `OfflineBanner` en `components/shared/`
- Ubicacion: dentro del layout principal, encima del contenido
- Deteccion: `navigator.onLine` + eventos 'online'/'offline'
- Hook: `useOfflineStatus()` que retorna `{ isOnline, lastSyncAt, pendingCount, isSyncing }`
- Zustand store: `offlineStore` con estado de conexion y sync
- Banner siempre renderizado (no condicional) para evitar layout shift

## UI/UX Notes
- Altura: 24px (compacto), font 11px DM Sans
- Verde conectado: bg #059669 10%, text #059669, icono check
- Amarillo offline: bg #D97706 10%, text #D97706, icono wifi-off
- Azul sincronizando: bg #0891B2 10%, text #0891B2, icono sync animado
- Transicion entre estados: 200ms ease
- No modal, no toast — siempre presente, no intrusivo

## Dependencies
- US-049-002 (sync queue para pendingCount)
- Fase 0: layout principal

## Estimation
- **Size**: S
- **Complexity**: Low
