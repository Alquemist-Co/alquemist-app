# F-050: Supabase Realtime

## Overview

Implementacion de canales de Supabase Realtime para comunicacion en tiempo real: alertas live, sincronizacion de lecturas ambientales entre tabs, notificaciones de actividades asignadas, y cambios en batches. Cada canal esta filtrado por company_id, zone_id o user_id para eficiencia y seguridad. Permite al supervisor ver cambios sin necesidad de refrescar la pagina.

## User Personas

- **Supervisor**: Ve alertas y cambios de batches en tiempo real, recibe notificaciones de lecturas ambientales anormales.
- **Operador**: Recibe notificaciones de actividades asignadas o reprogramadas en tiempo real.
- **Gerente**: Ve cambios globales de batches y ordenes sin refresh.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-050-001 | Canal de alertas en tiempo real | M | P0 | Planned |
| US-050-002 | Canal de lecturas ambientales por zona | M | P0 | Planned |
| US-050-003 | Canal de actividades por usuario | M | P1 | Planned |
| US-050-004 | Canal de batches por empresa | M | P1 | Planned |
| US-050-005 | Gestion de conexiones y reconexion | S | P0 | Planned |

---

# US-050-001: Canal de alertas en tiempo real

## User Story

**As a** supervisor,
**I want** recibir alertas nuevas en tiempo real sin necesidad de refrescar la pagina,
**So that** pueda reaccionar inmediatamente a condiciones criticas como temperaturas fuera de rango o actividades vencidas.

## Acceptance Criteria

### Scenario 1: Alerta nueva recibida en tiempo real
- **Given** el supervisor tiene el centro de alertas (ops-alerts) o el dashboard abierto
- **When** se inserta una nueva alerta en la tabla alerts con company_id del supervisor
- **Then** la alerta aparece automaticamente en la lista de pendientes sin refresh
- **And** el badge de notificaciones en el topbar se incrementa
- **And** se reproduce una animacion sutil de entrada (slide-in)

### Scenario 2: Alerta critical genera notificacion inline
- **Given** el supervisor esta en cualquier pantalla de la app
- **When** se recibe una alerta con severity = 'critical'
- **Then** se muestra un toast no-dismissible con el mensaje de la alerta
- **And** el toast tiene boton "Ver" que navega a ops-alerts
- **And** el toast permanece visible hasta que el usuario interactue con el

### Scenario 3: Alerta de otra empresa no se recibe
- **Given** el supervisor pertenece a company_id = "ABC"
- **When** se inserta una alerta con company_id = "XYZ"
- **Then** el supervisor NO recibe ninguna notificacion
- **And** el canal esta filtrado por company_id

### Scenario 4: Multiples tabs — alerta aparece en todas
- **Given** el supervisor tiene 2 tabs abiertas de la app
- **When** se recibe una alerta
- **Then** ambas tabs la muestran simultaneamente via Realtime

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Canal filtrado por company_id
- [ ] Toast para critical alerts
- [ ] Badge de notificaciones actualizado

## Technical Notes
- Canal: `alerts:{company_id}`
- Configuracion Supabase Realtime:
  ```typescript
  const channel = supabase
    .channel(`alerts:${companyId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'alerts',
      filter: `company_id=eq.${companyId}`,
    }, (payload) => {
      handleNewAlert(payload.new);
    })
    .subscribe();
  ```
- Nota: alerts necesita company_id directo para filtrado eficiente. Si no existe, agregarlo (ver docs/alquemist-features.md seccion RLS).
- Handler:
  1. Agregar alerta al TanStack Query cache de alerts
  2. Incrementar badge count en Zustand store
  3. Si severity = 'critical': mostrar toast persistente
- Cleanup: `channel.unsubscribe()` en useEffect cleanup

## UI/UX Notes
- Toast para critical: fondo #DC2626 10%, borde izquierdo #DC2626, icono de alerta
- Animacion de entrada: slide-in desde la derecha, 300ms
- Badge de notificaciones: circulo rojo con numero, animacion de shake al incrementar
- Nuevo item en lista: highlight amarillo que fade a blanco en 3 segundos

## Dependencies
- F-047 (centro de alertas)
- Fase 0: Supabase Realtime configurado

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-050-002: Canal de lecturas ambientales por zona

## User Story

**As a** supervisor,
**I want** que los dials del panel ambiental se actualicen en tiempo real cuando llegan nuevas lecturas de sensores,
**So that** vea cambios de condiciones al instante sin esperar al proximo ciclo de polling.

## Acceptance Criteria

### Scenario 1: Lectura nueva actualiza dial en tiempo real
- **Given** el supervisor tiene abierta la pantalla ops-env o area-zone-detail
- **When** se inserta una nueva lectura de temperatura para la zona monitoreada
- **Then** el dial de temperatura se actualiza con el nuevo valor
- **And** la transicion es suave (animacion de cambio de valor)
- **And** si el valor sale del rango, el color del dial cambia inmediatamente

### Scenario 2: Solo lecturas de zonas suscritas
- **Given** el supervisor ve el detalle de "Sala Floracion A" (zone_id = "abc")
- **When** se inserta una lectura para "Sala Secado" (zone_id = "xyz")
- **Then** NO se recibe la lectura en la pantalla actual
- **And** el canal solo escucha zone_id = "abc"

### Scenario 3: Cambio de zona — resuscripcion
- **Given** el supervisor esta viendo zona A y navega a zona B
- **When** cambia de pantalla
- **Then** se desuscribe del canal `env:zona_a`
- **And** se suscribe a `env:zona_b`
- **And** las lecturas de zona B empiezan a llegar

### Scenario 4: Realtime complementa polling
- **Given** el dashboard ops-env usa polling cada 30s + Realtime
- **When** llega una lectura via Realtime entre ciclos de polling
- **Then** el valor se actualiza inmediatamente
- **And** el proximo polling confirma o corrige el valor
- **And** no hay duplicacion de datos

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Suscripcion/desuscripcion limpia al navegar
- [ ] Complementa polling sin duplicar

## Technical Notes
- Canal: `env:{zone_id}`
- Configuracion:
  ```typescript
  const channel = supabase
    .channel(`env:${zoneId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'environmental_readings',
      filter: `zone_id=eq.${zoneId}`,
    }, (payload) => {
      handleNewReading(payload.new);
    })
    .subscribe();
  ```
- Handler: actualizar TanStack Query cache para las condiciones de la zona
- Para dashboard ops-env: suscribirse a multiples canales (uno por zona visible)
- Cleanup importante: desuscribir al desmontar o cambiar zona
- Hook custom: `useZoneRealtime(zoneId)` que maneja suscripcion/desuscripcion

## UI/UX Notes
- Transicion de valor en dial: ease-out 400ms
- Flash sutil en el dial cuando el valor cambia (outline pulse 1 vez)
- Si valor cambia de rango (verde -> amarillo): animacion mas prominente

## Dependencies
- F-045 (panel ambiental, dials)
- US-045-003 (API Route que genera las lecturas)
- Fase 0: Supabase Realtime

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-050-003: Canal de actividades por usuario

## User Story

**As a** operador,
**I want** recibir notificaciones en tiempo real cuando me asignan una nueva actividad o reprograman una existente,
**So that** me entere inmediatamente de cambios en mi agenda sin tener que refrescar la app.

## Acceptance Criteria

### Scenario 1: Nueva actividad asignada
- **Given** el operador tiene la app abierta
- **When** el supervisor programa una nueva actividad asignada a este operador
- **Then** el operador recibe una notificacion inline: "Nueva actividad: Fertirrigacion en LOT-001 para hoy a las 14:00"
- **And** la lista de actividades de hoy se actualiza automaticamente
- **And** el stat de "Pendientes" se incrementa

### Scenario 2: Actividad reprogramada
- **Given** el operador tiene la actividad "Poda LOT-002" programada para hoy
- **When** el supervisor reprograma la actividad para manana
- **Then** el operador recibe notificacion "Actividad reprogramada: Poda LOT-002 movida a manana"
- **And** la actividad desaparece de la lista de hoy
- **And** aparece en la lista de manana

### Scenario 3: Solo actividades del usuario actual
- **Given** el operador con user_id = "op1" esta suscrito
- **When** se actualiza una actividad asignada a user_id = "op2"
- **Then** "op1" NO recibe la notificacion

### Scenario 4: Operador offline — notificacion al reconectar
- **Given** el operador estaba offline cuando le asignaron una nueva actividad
- **When** reconecta y se suscribe al canal
- **Then** la nueva actividad aparece en su lista tras el refetch automatico
- **And** se muestra notificacion "1 nueva actividad asignada mientras estabas offline"

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Canal filtrado por assigned_to = user_id
- [ ] Notificacion inline no intrusiva

## Technical Notes
- Canal: `activities:{user_id}`
- Configuracion:
  ```typescript
  const channel = supabase
    .channel(`activities:${userId}`)
    .on('postgres_changes', {
      event: '*', // INSERT y UPDATE
      schema: 'public',
      table: 'scheduled_activities',
      filter: `assigned_to=eq.${userId}`,
    }, (payload) => {
      handleActivityChange(payload.eventType, payload.new, payload.old);
    })
    .subscribe();
  ```
- Nota: scheduled_activities necesita campo `assigned_to` para filtrado. Verificar modelo de datos.
- Handler:
  - INSERT: agregar a TanStack Query cache, mostrar notificacion
  - UPDATE: actualizar cache, si planned_date cambio mostrar notificacion de reprogramacion
- Al reconectar: refetch completo de actividades del dia + verificar si hay nuevas

## UI/UX Notes
- Notificacion: banner deslizable desde arriba, auto-dismiss 5s, con tap para ir al detalle
- Color: brand accent (lime sobre verde oscuro) para diferenciarse de alertas
- Icono: calendario con plus (nueva) o calendario con flecha (reprogramada)

## Dependencies
- Fase 1: F-022 (scheduled_activities)
- Fase 0: Supabase Realtime

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-050-004: Canal de batches por empresa

## User Story

**As a** supervisor,
**I want** ver cambios en los batches de mi empresa en tiempo real (cambios de fase, splits, completaciones),
**So that** pueda estar al tanto del progreso de produccion sin necesidad de refrescar las listas.

## Acceptance Criteria

### Scenario 1: Batch cambia de fase — lista se actualiza
- **Given** el supervisor tiene la lista de batches (batch-list) abierta
- **When** un batch avanza de fase (UPDATE batches SET current_phase_id)
- **Then** la card del batch se actualiza con la nueva fase
- **And** el badge de fase cambia de color
- **And** se muestra animacion de transicion

### Scenario 2: Nuevo batch creado por aprobacion de orden
- **Given** el supervisor ve la lista de batches
- **When** el gerente aprueba una orden y se crea un nuevo batch
- **Then** el batch aparece en la lista automaticamente
- **And** se muestra en la parte superior con animacion de entrada

### Scenario 3: Batch completado
- **Given** un batch activo esta visible en la lista
- **When** se completa el batch (status = 'completed')
- **Then** el status badge cambia a "Completado"
- **And** si la lista esta filtrada por "activos", el batch desaparece con animacion

### Scenario 4: Filtrado por company_id
- **Given** el supervisor pertenece a company_id = "ABC"
- **When** se crea un batch en company_id = "XYZ"
- **Then** el supervisor NO ve el nuevo batch

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Canal filtrado por company_id
- [ ] TanStack Query cache actualizado correctamente

## Technical Notes
- Canal: `batches:{company_id}`
- Configuracion:
  ```typescript
  const channel = supabase
    .channel(`batches:${companyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'batches',
      filter: `company_id=eq.${companyId}`,
    }, (payload) => {
      handleBatchChange(payload.eventType, payload.new, payload.old);
    })
    .subscribe();
  ```
- Nota: batches necesita company_id directo. Segun docs/alquemist-features.md, ya se agrego como columna redundante con trigger.
- Handler:
  - INSERT: agregar al cache, si la lista esta visible insertar con animacion
  - UPDATE: actualizar cache, resaltar cambio
  - DELETE: raro (soft-delete via status), pero manejar si ocurre
- Optimizacion: solo escuchar si la lista de batches o un batch-detail esta visible

## UI/UX Notes
- Card actualizada: highlight sutil (borde brand 1s -> vuelve a normal)
- Nuevo batch: slide-in desde arriba con fondo brand-light que se desvanece
- Batch completado: transicion de color en badge + confetti sutil (opcional)

## Dependencies
- Fase 1: F-016/F-017 (batches con company_id)
- Fase 0: Supabase Realtime

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-050-005: Gestion de conexiones y reconexion

## User Story

**As a** supervisor,
**I want** que las conexiones Realtime se gestionen automaticamente (conectar, desconectar, reconectar ante fallos),
**So that** no pierda actualizaciones en tiempo real ni consuma recursos innecesarios cuando no los necesito.

## Acceptance Criteria

### Scenario 1: Conexion automatica al abrir la app
- **Given** el usuario inicia la app y esta autenticado
- **When** la app carga completamente
- **Then** se establecen automaticamente las suscripciones Realtime relevantes segun el rol:
  - Operador: canal activities:{userId} + alerts:{companyId}
  - Supervisor: activities + alerts + batches:{companyId} + env:{zoneIds}
  - Gerente: alerts + batches
  - Viewer: solo batches (read-only)

### Scenario 2: Reconexion automatica tras perdida de conexion
- **Given** la conexion WebSocket se pierde por un fallo de red
- **When** se detecta la desconexion
- **Then** Supabase Realtime intenta reconectar automaticamente con backoff exponencial
- **And** se muestra indicador "Reconectando..." en el banner de estado
- **And** al reconectar, se resuscriben todos los canales activos

### Scenario 3: Desuscripcion al cerrar sesion
- **Given** el usuario tiene 3 canales Realtime activos
- **When** cierra sesion
- **Then** todos los canales se desuscriben limpiamente
- **And** no quedan conexiones huerfanas
- **And** no hay memory leaks

### Scenario 4: Cambio de pantalla — gestion de canales por zona
- **Given** el supervisor ve el detalle de zona A (suscrito a env:zonaA)
- **When** navega a zona B
- **Then** se desuscribe de env:zonaA
- **And** se suscribe a env:zonaB
- **And** no hay periodo sin suscripcion (overlap minimo)

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] No memory leaks en suscripciones
- [ ] Reconexion automatica funcional
- [ ] Canales gestionados por rol

## Technical Notes
- Hook central: `useRealtimeManager()` que gestiona todas las suscripciones
- Provider: `RealtimeProvider` en layout principal que inicializa canales segun rol
- Cleanup: useEffect con cleanup function que desuscribe
- Canales por rol:
  ```typescript
  const CHANNELS_BY_ROLE = {
    operator: ['activities', 'alerts'],
    supervisor: ['activities', 'alerts', 'batches', 'env'],
    manager: ['alerts', 'batches'],
    admin: ['alerts', 'batches'],
    viewer: ['batches'],
  };
  ```
- Canales dinamicos (env:{zoneId}): gestionados por hooks de paginas especificas, no globalmente
- Supabase Realtime tiene reconexion built-in, pero agregar logging y indicador visual
- Zustand: `realtimeStore` con estado de conexion por canal

## UI/UX Notes
- Indicador de estado Realtime: integrado en el banner de conexion (US-049-006)
- "Conectado" incluye conexion HTTP + WebSocket
- Si WebSocket falla pero HTTP funciona: "Conectado (tiempo real no disponible)"
- No requiere interaccion del usuario

## Dependencies
- US-049-006 (indicador de conexion)
- Fase 0: Supabase Realtime, auth con roles

## Estimation
- **Size**: S
- **Complexity**: Medium
