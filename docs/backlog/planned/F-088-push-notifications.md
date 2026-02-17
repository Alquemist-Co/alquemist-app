# F-088: Push Notifications

## Overview

Implementa notificaciones push via Web Push API para alertar a los usuarios de eventos criticos en tiempo real, incluso cuando la app no esta en primer plano. Absorbe la story diferida US-047-005 del centro de alertas. Las notificaciones push complementan el sistema de alertas existente (F-047) agregando un canal de entrega proactivo que no depende de que el usuario tenga la app abierta.

## User Personas

- **Supervisor**: Recibe push de alertas criticas (ambiente fuera de rango, calidad fallida, actividades vencidas) para reaccionar rapidamente.
- **Gerente**: Recibe push de alertas de negocio (ordenes completadas, stock critico).
- **Operador**: Recibe push de nuevas actividades asignadas (cuando US-020-004 se implemente).
- **Admin**: Configura los tipos de alerta que generan push.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-088-001 | Suscripcion y permisos de push | M | P0 | Planned |
| US-088-002 | Envio de push por alerta critica | M | P0 | Planned |
| US-088-003 | Gestion de suscripciones del usuario | S | P1 | Planned |

---

# US-088-001: Suscripcion y permisos de push

## User Story

**As a** supervisor,
**I want** que la app me pida permiso para enviar notificaciones push despues de algunas sesiones de uso,
**So that** pueda recibir alertas criticas en mi dispositivo aunque no tenga la app abierta.

## Acceptance Criteria

### Scenario 1: Prompt de permiso despues de 3 sesiones
- **Given** el supervisor ha iniciado sesion 3 veces sin haber aceptado ni rechazado push
- **When** carga el dashboard en su cuarta sesion
- **Then** aparece un banner no-intrusivo en la parte inferior: "Activa notificaciones para recibir alertas criticas al instante" con botones "Activar" y "Ahora no"

### Scenario 2: Aceptar permisos y registrar suscripcion
- **Given** el banner de push esta visible
- **When** el supervisor hace clic en "Activar"
- **Then** el browser muestra el prompt nativo de permisos, y al aceptar se registra la suscripcion (endpoint + keys) en la base de datos vinculada al user_id y facility_id

### Scenario 3: Rechazar permisos
- **Given** el banner de push esta visible
- **When** el supervisor hace clic en "Ahora no"
- **Then** el banner se oculta y no vuelve a aparecer por 30 dias (timestamp guardado en localStorage)

### Scenario 4: Permisos ya denegados a nivel de browser
- **Given** el usuario previamente denego permisos de notificacion en el browser
- **When** intenta activar push desde settings
- **Then** el sistema muestra mensaje "Los permisos de notificacion estan bloqueados. Ve a la configuracion de tu navegador para habilitarlos." con instrucciones por browser

### Scenario 5: Multiples dispositivos
- **Given** el supervisor usa la app en tablet y telefono
- **When** acepta push en ambos dispositivos
- **Then** se crean 2 registros de suscripcion (uno por device endpoint), y las notificaciones llegan a ambos dispositivos

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Web Push API con VAPID keys configuradas
- [ ] Tabla push_subscriptions creada (migracion)
- [ ] Service worker maneja evento push
- [ ] Criterios de aceptacion verificados
- [ ] Funcional en Chrome, Edge, Firefox (Safari con limitaciones documentadas)

## Technical Notes
- **Nueva tabla**: `push_subscriptions` (id UUID PK, user_id FK, facility_id FK, endpoint TEXT, p256dh TEXT, auth_key TEXT, created_at TIMESTAMPTZ, is_active BOOLEAN)
- **Migracion**: Nueva migracion SQL en `supabase/migrations/`
- **VAPID keys**: Generar par de claves y almacenar en env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- **Server Action**: `subscribePush(subscription)` en `src/lib/actions/push.ts` — INSERT en push_subscriptions
- **Service Worker**: Agregar event listener `push` en `src/app/sw.ts` — muestra notificacion con datos del payload
- **Banner component**: `PushPermissionBanner` en `src/components/shared/` — usa localStorage para tracking de sesiones y dismissal
- **Contador de sesiones**: Incrementar en `AuthProvider` al hidratar, almacenar en localStorage `alquemist-push-sessions`

## UI/UX Notes
- Banner fijo en la parte inferior de la pantalla (above BottomBar en mobile)
- Estilo: bg-surface con borde brand, icono de campana, texto conciso, 2 botones
- No mostrar si el usuario ya tiene suscripcion activa
- En /profile o /settings: toggle "Notificaciones push" para gestionar estado

## Dependencies
- F-047 (centro de alertas — las alertas son el trigger de push)
- F-006 (service worker basico — se extiende con push handler)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-088-002: Envio de push por alerta critica

## User Story

**As a** supervisor,
**I want** recibir una notificacion push inmediata cuando se genera una alerta critica en mi facility,
**So that** pueda tomar accion correctiva sin delay aunque no este mirando la app.

## Acceptance Criteria

### Scenario 1: Push por alerta ambiental critica
- **Given** el supervisor tiene push activo y esta suscrito a la facility "Invernadero Principal"
- **When** un sensor reporta temperatura 35C (critica, rango optimo 20-26C) y se genera una alerta
- **Then** el supervisor recibe push con titulo "Alerta Critica — Invernadero Principal", body "Temperatura 35C en Sala Floracion A. Rango optimo: 20-26C", y al hacer tap navega a /areas/zones/{zoneId}

### Scenario 2: Push por test de calidad fallido
- **Given** el supervisor tiene push activo
- **When** se registran resultados de un quality_test con overall_pass=false
- **Then** el supervisor recibe push con titulo "Calidad — Test fallido", body "Batch LOT-001: Analisis de cannabinoides no paso. 1 parametro fuera de rango.", y al tap navega a /quality/{testId}

### Scenario 3: No enviar push para alertas de severidad info o warning
- **Given** el supervisor tiene push activo
- **When** se genera una alerta con severity='warning' (no critica)
- **Then** no se envia push notification (solo aparece en el centro de alertas in-app)

### Scenario 4: Push solo a usuarios de la facility afectada
- **Given** hay 2 supervisores: uno en "Invernadero Principal" y otro en "Bodega Norte"
- **When** se genera alerta critica en "Invernadero Principal"
- **Then** solo el supervisor asignado a esa facility recibe el push, no el de "Bodega Norte"

### Scenario 5: Suscripcion expirada o invalida
- **Given** un usuario tiene una suscripcion push cuyo endpoint ya no es valido (device borrado, browser reinstalado)
- **When** el sistema intenta enviar push
- **Then** el web-push library retorna error 410 Gone, y el sistema marca la suscripcion como is_active=false sin reintentar

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Push enviado en <5 segundos despues de crear la alerta
- [ ] Solo alertas severity='critical' generan push
- [ ] Filtrado por facility funcional
- [ ] Cleanup de suscripciones expiradas implementado

## Technical Notes
- **Trigger**: Despues de INSERT en `alerts` con severity='critical', ejecutar `sendPushForAlert(alertId)` como fire-and-forget
- **Server Action**: `sendPushForAlert(alertId)` en `src/lib/actions/push.ts`:
  1. Query alert con entity_type/entity_id para obtener facility_id (via zone/batch/etc)
  2. Query push_subscriptions WHERE facility_id AND is_active=true
  3. Para cada suscripcion: `webpush.sendNotification(subscription, payload)`
  4. Manejar errores 410/404 marcando suscripcion inactiva
- **Package**: `web-push` npm package para server-side push
- **Payload**: JSON con `{ title, body, url, icon, badge, tag }` — tag para deduplication
- **SW handler**: `self.addEventListener('push', ...)` en sw.ts — `self.registration.showNotification(title, options)`
- **Click handler**: `self.addEventListener('notificationclick', ...)` — `clients.openWindow(url)`

## UI/UX Notes
- La notificacion nativa del OS muestra: icono de Alquemist, titulo con tipo de alerta, body con detalle
- Al hacer tap: abre la app en la URL relevante (zona, batch, test de calidad)
- Tag por alert.id para evitar notificaciones duplicadas del mismo evento

## Dependencies
- US-088-001 (suscripciones registradas)
- F-047 (alertas generadas por cron y por eventos)

## Estimation
- **Size**: M
- **Complexity**: High

---

# US-088-003: Gestion de suscripciones del usuario

## User Story

**As a** supervisor,
**I want** poder ver y gestionar mis suscripciones de push notification desde mi perfil,
**So that** pueda desactivar push si ya no los necesito o verificar en que dispositivos tengo push activo.

## Acceptance Criteria

### Scenario 1: Ver estado de suscripcion en perfil
- **Given** el supervisor tiene push activo en 2 dispositivos
- **When** navega a /profile → seccion "Notificaciones"
- **Then** ve: estado "Push activado", lista de 2 dispositivos suscritos con fecha de suscripcion, y boton "Desactivar push"

### Scenario 2: Desactivar push desde perfil
- **Given** el supervisor tiene push activo
- **When** hace clic en "Desactivar push" y confirma
- **Then** todas sus suscripciones se marcan is_active=false, no recibe mas push, y el estado cambia a "Push desactivado" con boton "Reactivar"

### Scenario 3: Reactivar push
- **Given** el supervisor desactivo push previamente pero el browser aun tiene permisos
- **When** hace clic en "Reactivar push"
- **Then** se registra una nueva suscripcion con el endpoint actual del browser y el estado vuelve a "Push activado"

### Scenario 4: Eliminar suscripcion de dispositivo especifico
- **Given** el supervisor tiene push en tablet y telefono
- **When** elimina la suscripcion del telefono
- **Then** solo esa suscripcion se marca inactiva, el push sigue llegando a la tablet

## Definition of Done
- [ ] Implementacion completa y codigo revisado
- [ ] Criterios de aceptacion verificados
- [ ] UI integrada en pagina de perfil (F-086)

## Technical Notes
- **Server Actions**: `getUserPushSubscriptions()`, `deactivateAllPushSubscriptions(userId)`, `deactivatePushSubscription(subscriptionId)` en `src/lib/actions/push.ts`
- Mostrar user-agent o device info si esta disponible (parseado del endpoint URL)
- Integrar en la pagina de perfil (F-086) como seccion separada

## UI/UX Notes
- Seccion "Notificaciones" en /profile debajo de datos personales
- Toggle principal on/off + lista de dispositivos si hay multiples
- Cada dispositivo: icono generico + fecha de alta + boton "Eliminar"

## Dependencies
- US-088-001 (suscripcion existente)
- F-086 (pagina de perfil donde se integra)

## Estimation
- **Size**: S
- **Complexity**: Medium
