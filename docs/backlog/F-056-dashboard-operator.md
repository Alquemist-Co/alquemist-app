# F-056: Dashboard Operador

## Overview

Dashboard personalizado para el rol operador que muestra un resumen ejecutivo de su jornada: actividades pendientes, completadas y alertas relevantes. Incluye lista de actividades del dia ordenadas por hora, seccion de alertas, indicador de estado offline, pull-to-refresh y FAB con acciones rapidas (nueva observacion, actividad ad-hoc, foto rapida). Es la primera pantalla que ve el operador al abrir la app y debe comunicar inmediatamente que hay que hacer hoy.

## User Personas

- **Operador**: Usa este dashboard como punto de partida de su jornada diaria. Necesita ver rapidamente que actividades tiene pendientes, cuales ya completo y si hay alertas que requieran atencion. Trabaja desde celular Android de gama media, frecuentemente sin conexion.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-056-001 | Header contextual con saludo, fecha y facility | S | P0 | Planned |
| US-056-002 | Stats strip con contadores de pendientes, completadas y alertas | M | P0 | Planned |
| US-056-003 | Lista de actividades del dia con cards ordenadas por hora | M | P0 | Planned |
| US-056-004 | Seccion de alertas del operador | S | P1 | Planned |
| US-056-005 | Indicador de estado offline y pull-to-refresh | M | P0 | Planned |
| US-056-006 | FAB con acciones rapidas | M | P1 | Planned |

---

# US-056-001: Header contextual con saludo, fecha y facility

## User Story

**As a** operador,
**I want** ver un saludo personalizado con mi nombre, la fecha actual y la facility donde trabajo,
**So that** tenga contexto inmediato de mi jornada al abrir la app.

## Acceptance Criteria

### Scenario 1: Saludo segun hora del dia
- **Given** el operador "Carlos Martinez" esta autenticado y son las 08:30 AM
- **When** accede al dashboard
- **Then** ve el header "Buenos dias, Carlos" con la fecha formateada como "Lunes 16 de febrero, 2026" y el nombre de la facility asignada

### Scenario 2: Saludo por la tarde
- **Given** el operador esta autenticado y son las 14:00
- **When** accede al dashboard
- **Then** ve el saludo "Buenas tardes, Carlos" adaptado a la hora actual

### Scenario 3: Operador sin facility asignada
- **Given** el operador esta autenticado pero no tiene assigned_facility_id
- **When** accede al dashboard
- **Then** ve el header con saludo y fecha pero sin nombre de facility, y muestra un badge informativo "Sin facility asignada"

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Datos de `users.full_name`, `facilities.name` via Server Component
- Zona horaria tomada de `companies.timezone` para calcular hora local
- Pantalla: `dash-operator`
- Componente reutilizable `DashboardHeader` en `components/dashboard/`
- El saludo se determina client-side segun la hora local del dispositivo

## UI/UX Notes
- Titulo en DM Sans Bold 28px
- Fecha en DM Sans Regular 14px, color text-secondary
- Facility como badge pequeno debajo de la fecha
- Padding horizontal 16px en mobile

## Dependencies
- Requiere auth middleware funcional (Fase 0)
- Requiere tabla `users` y `facilities` pobladas

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-056-002: Stats strip con contadores de pendientes, completadas y alertas

## User Story

**As a** operador,
**I want** ver en un vistazo cuantas actividades tengo pendientes, cuantas complete hoy y cuantas alertas activas hay,
**So that** pueda priorizar mi trabajo y saber si hay urgencias.

## Acceptance Criteria

### Scenario 1: Stats con datos reales
- **Given** el operador tiene 5 actividades pendientes, 3 completadas hoy y 2 alertas activas
- **When** accede al dashboard
- **Then** ve 3 stat cards en fila horizontal scrolleable: "Pendientes: 5" (naranja), "Completadas: 3" (verde), "Alertas: 2" (rojo)

### Scenario 2: Tap en stat filtra la lista
- **Given** el operador ve el stats strip con "Pendientes: 5"
- **When** toca la stat card "Pendientes"
- **Then** la lista de actividades debajo se filtra para mostrar solo las pendientes, y la stat card tocada muestra un indicador visual de seleccion activa

### Scenario 3: Operador sin actividades programadas
- **Given** el operador no tiene actividades programadas para hoy
- **When** accede al dashboard
- **Then** los contadores muestran "Pendientes: 0", "Completadas: 0" y "Alertas: 0" (o el conteo real de alertas), y las cards mantienen su estructura visual sin colapsar

### Scenario 4: Datos offline
- **Given** el operador esta sin conexion pero tiene datos cacheados en Dexie
- **When** accede al dashboard
- **Then** los stats se calculan desde los datos locales de IndexedDB y muestran los valores de la ultima sincronizacion

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `COUNT(scheduled_activities WHERE status='pending' AND assigned_to=current_user AND planned_date=today)`
- Query: `COUNT(scheduled_activities WHERE status='completed' AND assigned_to=current_user AND planned_date=today)`
- Query: `COUNT(alerts WHERE entity_id IN (user batches/zones) AND resolved_at IS NULL)`
- Componente `StatCard` reutilizable de `components/data/`
- Offline: calcular stats desde `db.scheduledActivities` de Dexie
- Pantalla: `dash-operator`

## UI/UX Notes
- Stat cards con border-left 4px del color semantico (naranja, verde, rojo)
- Numero grande en DM Mono 24px Bold + label en overline 11px
- Horizontal scroll en mobile si no caben las 3 cards
- Touch targets de 48px minimo
- Tap en stat card activa filtro con animacion de transicion 200ms

## Dependencies
- Requiere `scheduled_activities` y `alerts` con datos reales (Fases 1-3)
- Requiere componente `StatCard` del design system (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-056-003: Lista de actividades del dia con cards ordenadas por hora

## User Story

**As a** operador,
**I want** ver una lista de todas mis actividades del dia ordenadas por hora planificada,
**So that** pueda seguir el plan de trabajo en orden y completar cada tarea a tiempo.

## Acceptance Criteria

### Scenario 1: Lista con actividades del dia
- **Given** el operador tiene 6 actividades programadas para hoy
- **When** accede al dashboard
- **Then** ve 6 activity cards ordenadas por hora planificada, cada una con: barra de color por tipo, titulo (tipo + codigo de batch), subtitulo (zona + hora), y chevron derecho

### Scenario 2: Tap en card navega a ejecucion
- **Given** el operador ve una card de actividad "Fertirrigacion - LOT-001"
- **When** toca la card
- **Then** navega a la pantalla de ejecucion `act-execute` con los datos de esa actividad precargados

### Scenario 3: Actividades vencidas en seccion sticky
- **Given** el operador tiene 2 actividades con status 'overdue' de dias anteriores
- **When** accede al dashboard
- **Then** ve una seccion sticky al inicio con fondo warning (naranja claro) mostrando las 2 actividades vencidas con borde rojo, que se mantiene visible al hacer scroll

### Scenario 4: Quick-complete con swipe
- **Given** el operador ve una card de actividad pendiente de tipo rutinario
- **When** hace swipe derecha sobre la card
- **Then** la actividad se marca como completada con valores por defecto del template, muestra toast "Actividad completada" con opcion "Deshacer" visible por 5 segundos

### Scenario 5: Sin actividades para hoy
- **Given** el operador no tiene actividades programadas para hoy
- **When** accede al dashboard
- **Then** ve un empty state con ilustracion y mensaje "No hay actividades pendientes para hoy" con CTA "Ver calendario" que lleva a `act-calendar`

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `scheduled_activities JOIN batches JOIN zones WHERE planned_date=today AND assigned_to=current_user ORDER BY planned_date ASC`
- Colores por tipo de actividad: fertirrigacion=verde, poda=naranja, cosecha=rojo, transplante=azul
- Swipe-to-complete ejecuta Server Action `executeActivity` con datos default del `template_snapshot`
- Offline: datos desde `db.scheduledActivities` de Dexie, swipe-complete se encola en `db.syncQueue`
- Zod schema: `executeActivitySchema` para validacion de quick-complete
- Pantalla: `dash-operator`

## UI/UX Notes
- Activity card: height 64-72px, barra izquierda 4px coloreada, titulo DM Sans SemiBold 16px, subtitulo 12px text-secondary
- Seccion overdue: background warning 10% opacity, border-radius 16px, sticky position
- Swipe gesture con feedback haptico si disponible
- Empty state con ilustracion line-art en verde primary
- Virtual scrolling si hay mas de 50 actividades (edge case para supervisores)

## Dependencies
- Requiere modulo de Actividades completo (Fase 1)
- Requiere datos de `batches` y `zones` (Fase 1)
- Requiere offline store poblado (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-056-004: Seccion de alertas del operador

## User Story

**As a** operador,
**I want** ver las alertas relevantes a mis zonas y batches asignados,
**So that** pueda reaccionar rapidamente a situaciones urgentes como problemas ambientales o de calidad.

## Acceptance Criteria

### Scenario 1: Alertas activas visibles
- **Given** hay 3 alertas activas vinculadas a los batches y zonas del operador
- **When** accede al dashboard
- **Then** ve un banner compacto por cada alerta (max 3 visibles) con icono de severidad, mensaje resumido y tap para expandir detalles

### Scenario 2: Ver todas las alertas
- **Given** hay mas de 3 alertas activas para el operador
- **When** toca "Ver todas"
- **Then** navega al centro de alertas `ops-alerts` filtrado por sus entidades

### Scenario 3: Sin alertas activas
- **Given** no hay alertas activas para los batches/zonas del operador
- **When** accede al dashboard
- **Then** la seccion de alertas no se muestra, liberando espacio para la lista de actividades

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Query: `alerts WHERE entity_id IN (batches/zones del usuario) AND resolved_at IS NULL ORDER BY severity DESC, triggered_at DESC LIMIT 3`
- Tipos de alerta relevantes para operador: `overdue_activity`, `env_out_of_range`, `quality_failed`
- Pantalla: `dash-operator`
- Componente reutilizable `AlertBanner` en `components/shared/`

## UI/UX Notes
- Banner compacto: height 48px, icono 20px + mensaje truncado + chevron
- Colores por severidad: warning (amber), critical (red), info (cyan)
- Max 3 visibles con link "Ver todas (N)" debajo
- No usar solo color para comunicar severidad: siempre incluir icono complementario

## Dependencies
- Requiere sistema de alertas (Fase 3)
- Requiere `alerts` table poblada

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-056-005: Indicador de estado offline y pull-to-refresh

## User Story

**As a** operador,
**I want** ver claramente si estoy conectado o sin conexion y poder actualizar los datos manualmente,
**So that** sepa si mis acciones se estan sincronizando y pueda forzar una actualizacion cuando recupere senal.

## Acceptance Criteria

### Scenario 1: Estado conectado
- **Given** el operador tiene conexion a internet
- **When** accede al dashboard
- **Then** ve un banner fijo superior verde sutil con "Conectado" y un icono de check

### Scenario 2: Estado sin conexion
- **Given** el operador pierde la conexion a internet
- **When** el banner detecta el cambio de estado de red
- **Then** cambia a amarillo con "Sin conexion - datos sincronizados a las HH:MM" mostrando la hora de la ultima sincronizacion exitosa

### Scenario 3: Pull-to-refresh con conexion
- **Given** el operador esta conectado y tira la pantalla hacia abajo
- **When** suelta despues de pasar el threshold de pull
- **Then** se sincroniza: actualiza actividades, alertas y stats, muestra timestamp "Ultima actualizacion: HH:MM" y animacion de loading durante el proceso

### Scenario 4: Pull-to-refresh sin conexion
- **Given** el operador esta sin conexion y tira la pantalla hacia abajo
- **When** suelta
- **Then** muestra toast "Sin conexion. Los datos se actualizaran al reconectar." sin intentar la sincronizacion

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Indicador offline: componente `OfflineBanner` que escucha `navigator.onLine` y eventos `online`/`offline`
- Pull-to-refresh: dispara `syncQueue.processAll()` de Dexie + invalida TanStack Query caches
- Timestamp de ultima sync almacenado en Zustand store o `localStorage`
- Serwist dispara sync event al reconectar
- Pantalla: `dash-operator`

## UI/UX Notes
- Banner fijo top: height 32px, no intrusivo, siempre visible
- Verde (#059669) cuando conectado, amarillo (#D97706) cuando offline
- Pull-to-refresh: spinner con brand color, threshold 80px
- Timestamp en DM Mono 11px

## Dependencies
- Requiere Serwist y service worker configurado (Fase 0)
- Requiere Dexie sync queue funcional (Fase 3)
- Requiere Zustand store para estado de conexion

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-056-006: FAB con acciones rapidas

## User Story

**As a** operador,
**I want** tener un boton flotante que me permita crear rapidamente una observacion, actividad ad-hoc o tomar una foto,
**So that** pueda registrar hallazgos en campo sin interrumpir mi flujo de trabajo.

## Acceptance Criteria

### Scenario 1: Abrir menu FAB
- **Given** el operador esta en el dashboard
- **When** toca el FAB (+)
- **Then** se abre un bottom sheet con 3 opciones: "Nueva observacion", "Actividad ad-hoc" y "Foto rapida", cada una con icono y descripcion

### Scenario 2: Nueva observacion desde FAB
- **Given** el operador abrio el menu FAB y selecciona "Nueva observacion"
- **When** toca la opcion
- **Then** navega a un formulario de observacion con selector de batch, tipo, severidad, descripcion y opcion de foto

### Scenario 3: Foto rapida desde FAB
- **Given** el operador selecciona "Foto rapida" desde el FAB
- **When** toma una foto
- **Then** la foto se comprime (max 1200px JPEG 80%), se vincula al batch seleccionado y se encola para upload en la sync queue

### Scenario 4: FAB en modo offline
- **Given** el operador esta sin conexion y toca el FAB
- **When** selecciona cualquier opcion y completa la accion
- **Then** los datos se guardan en Dexie (IndexedDB) y se muestra confirmacion "Guardado localmente. Se sincronizara al reconectar."

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- FAB posicionado bottom-right, sobre el bottom bar (z-index superior)
- Bottom sheet con animacion spring usando `Sheet` component
- Foto rapida: compresion client-side con canvas API, almacenada en `db.offlinePhotos` de Dexie
- Observacion usa Zod schema parcial de `executeActivitySchema.observations`
- Server Actions: `createObservation(input)` para observaciones ad-hoc
- Pantalla: `dash-operator`

## UI/UX Notes
- FAB: 56px diametro, background brand (#005E42), icono "+" en lime (#ECF7A3)
- Bottom sheet: max-height 50%, border-radius 20px top, pill indicator
- Opciones con icono 24px + titulo 16px + descripcion 12px
- Animacion de apertura: 300ms ease-out

## Dependencies
- Requiere componente `Sheet` del design system (Fase 0)
- Requiere compresion de fotos client-side (Fase 3)
- Requiere Dexie offline store (Fase 3)

## Estimation
- **Size**: M
- **Complexity**: Medium
