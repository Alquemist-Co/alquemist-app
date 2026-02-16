# F-047: Centro de Alertas

## Overview

Sistema proactivo de alertas que genera notificaciones automaticas para condiciones criticas: actividades vencidas, parametros ambientales fuera de rango, stock bajo, fallos de calidad y productos proximos a vencer. Incluye un centro de alertas con tabs de pendientes/reconocidas/resueltas, acciones de reconocer y resolver, push notifications, y cron jobs de Vercel para verificaciones periodicas.

## User Personas

- **Supervisor**: Recibe y gestiona alertas de sus zonas, reconoce y resuelve problemas.
- **Gerente**: Tiene visibilidad de todas las alertas, prioriza intervenciones.
- **Operador**: Ve alertas relevantes a sus batches y actividades.

## Stories

| ID | Story | Size | Prioridad | Estado |
|----|-------|------|-----------|--------|
| US-047-001 | Centro de alertas con tabs y acciones | M | P0 | Planned |
| US-047-002 | Cron job: verificacion de actividades vencidas | M | P0 | Planned |
| US-047-003 | Cron job: alertas de stock bajo | M | P1 | Planned |
| US-047-004 | Cron job: verificacion de items proximos a vencer | M | P1 | Planned |
| US-047-005 | Push notifications para alertas criticas | M | P2 | Planned |

---

# US-047-001: Centro de alertas con tabs y acciones

## User Story

**As a** supervisor,
**I want** acceder a un centro de alertas organizado por estado (pendientes, reconocidas, resueltas) con acciones para reconocer y resolver cada alerta,
**So that** pueda gestionar sistematicamente los problemas detectados por el sistema.

## Acceptance Criteria

### Scenario 1: Vista de alertas pendientes
- **Given** hay 5 alertas pendientes (sin acknowledged_at) de tipos variados
- **When** el supervisor navega a la pantalla ops-alerts
- **Then** se muestra el tab "Pendientes" activo con badge "5"
- **And** cada alerta muestra: icono de severity (info/warning/critical), tipo, mensaje, entidad vinculada (con link), timestamp
- **And** las alertas se ordenan por severity (critical primero) y luego por timestamp

### Scenario 2: Reconocer una alerta
- **Given** hay una alerta pendiente de tipo "env_out_of_range" en Sala Floracion A
- **When** el supervisor hace tap en "Reconocer"
- **Then** la alerta se actualiza con acknowledged_by y acknowledged_at
- **And** se mueve al tab "Reconocidas"
- **And** el badge del tab "Pendientes" se reduce en 1

### Scenario 3: Resolver una alerta
- **Given** hay una alerta reconocida de tipo "low_stock" para Fertilizante NPK
- **When** el supervisor hace tap en "Resolver" e ingresa nota "Stock reabastecido con OC-2026-015"
- **Then** la alerta se actualiza con resolved_at y resolution_notes
- **And** se mueve al tab "Resueltas"

### Scenario 4: Filtrar alertas por tipo y severity
- **Given** hay 20 alertas de diferentes tipos y severidades
- **When** el usuario aplica filtro tipo = "env_out_of_range" y severity = "critical"
- **Then** solo se muestran las alertas que cumplen ambos criterios

### Scenario 5: Navegar a entidad vinculada
- **Given** una alerta tiene entity_type = 'batch' y entity_id = uuid de LOT-001
- **When** el usuario hace tap en el link de la entidad
- **Then** navega a batch-detail de LOT-001

### Scenario 6: Sin alertas pendientes
- **Given** no hay alertas pendientes
- **When** el usuario navega a ops-alerts
- **Then** se muestra empty state "No hay alertas pendientes — todo esta en orden"
- **And** se muestra icono de check verde

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Accesibilidad: tabs con aria-selected, alertas con aria-live para cambios
- [ ] Performance: lista virtual si > 50 alertas

## Technical Notes
- Pantalla: `ops-alerts`
- Queries:
  - Pendientes: `SELECT * FROM alerts WHERE company_id = auth.company_id() AND acknowledged_at IS NULL ORDER BY severity DESC, triggered_at DESC`
  - Reconocidas: `WHERE acknowledged_at IS NOT NULL AND resolved_at IS NULL`
  - Resueltas: `WHERE resolved_at IS NOT NULL`
- Server Actions:
  - `acknowledgeAlert(alertId)`: UPDATE acknowledged_at, acknowledged_by
  - `resolveAlert(alertId, resolution)`: UPDATE resolved_at, resolved_by, resolution_notes
- Zod schemas:
  ```typescript
  const acknowledgeAlertSchema = z.object({ alert_id: z.string().uuid() });
  const resolveAlertSchema = z.object({
    alert_id: z.string().uuid(),
    resolution_notes: z.string().min(5).max(1000),
  });
  ```
- RLS: alerts tiene company_id (Tipo A)
- Roles: operador solo ve alertas de sus batches/zonas, supervisor ve de sus zonas, gerente/admin ven todas
- Navegacion a entidad: mapeo entity_type -> ruta: batch -> /batches/{id}, sensor -> /operations/sensors, inventory_item -> /inventory

## UI/UX Notes
- 3 tabs con badge count: "Pendientes (5)" | "Reconocidas (3)" | "Resueltas"
- Alert cards: borde izquierdo coloreado por severity (info=#0891B2, warning=#D97706, critical=#DC2626)
- Icono por tipo: overdue=reloj, env=termometro, low_stock=caja, quality=tubo ensayo, expiring=calendario
- Acciones: botones inline en cada card
- Mobile: cards full-width, acciones reveladas con swipe
- Dialog para resolver: textarea con nota obligatoria

## Dependencies
- F-045 (genera alertas env_out_of_range)
- Fase 2: F-026 (inventario para stock bajo)
- Fase 0: schema DB (alerts)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-047-002: Cron job: verificacion de actividades vencidas

## User Story

**As a** supervisor,
**I want** que el sistema verifique automaticamente cada hora si hay actividades programadas vencidas y genere alertas,
**So that** me entere oportunamente de tareas que no se ejecutaron a tiempo.

## Acceptance Criteria

### Scenario 1: Actividades vencidas detectadas
- **Given** hay 3 scheduled_activities con planned_date < ahora y status = 'pending'
- **When** se ejecuta el cron job /api/cron/overdue-check
- **Then** las 3 actividades pasan a status = 'overdue'
- **And** se genera una alerta tipo 'overdue_activity' por cada actividad con severity 'warning'
- **And** el endpoint retorna 200 con `{processed: 3, alerts_created: 3}`

### Scenario 2: Sin actividades vencidas
- **Given** todas las actividades programadas estan completadas o tienen planned_date futura
- **When** se ejecuta el cron job
- **Then** retorna 200 con `{processed: 0, alerts_created: 0}`

### Scenario 3: Actividad ya marcada overdue — sin duplicar alerta
- **Given** una actividad ya tiene status = 'overdue' y ya tiene una alerta activa asociada
- **When** se ejecuta el cron job nuevamente
- **Then** no se genera una nueva alerta para esa actividad
- **And** no se modifica la actividad

### Scenario 4: Autenticacion con CRON_SECRET
- **Given** se llama al endpoint sin el query param secret o con valor incorrecto
- **When** se procesa el request
- **Then** retorna 401 Unauthorized
- **And** no se ejecuta ninguna logica

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Configuracion en vercel.json con schedule "0 * * * *" (cada hora)
- [ ] Logging de ejecucion para debugging

## Technical Notes
- Route: `app/api/cron/overdue-check/route.ts`
- Auth: `request.nextUrl.searchParams.get('secret') === process.env.CRON_SECRET`
- Query:
  ```sql
  UPDATE scheduled_activities
  SET status = 'overdue'
  WHERE planned_date < NOW()
    AND status = 'pending'
  RETURNING id, batch_id, template_id, assigned_to
  ```
- Para cada actividad actualizada:
  - Check si ya existe alerta activa: `SELECT COUNT(*) FROM alerts WHERE entity_type = 'scheduled_activity' AND entity_id = :id AND resolved_at IS NULL`
  - Si no: INSERT alert type='overdue_activity', severity='warning'
- Vercel cron config en vercel.json:
  ```json
  {"path": "/api/cron/overdue-check?secret=CRON_SECRET", "schedule": "0 * * * *"}
  ```
- Usar service role key (SUPABASE_SERVICE_ROLE_KEY) para bypass RLS en cron

## UI/UX Notes
- No aplica (cron job sin UI)

## Dependencies
- US-047-001 (centro de alertas consume las alertas)
- Fase 1: F-022 (scheduled_activities existen)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-047-003: Cron job: alertas de stock bajo

## User Story

**As a** gerente,
**I want** que el sistema verifique automaticamente cada 6 horas si hay productos con stock por debajo del minimo y genere alertas,
**So that** pueda reordenar insumos antes de que se agoten.

## Acceptance Criteria

### Scenario 1: Productos con stock bajo detectados
- **Given** el producto "Fertilizante NPK" tiene min_stock_threshold = 10kg y stock actual disponible = 3kg
- **When** se ejecuta el cron job /api/cron/stock-alerts
- **Then** se genera alerta tipo 'low_inventory', severity 'warning', message "Stock bajo de Fertilizante NPK: 3 kg disponibles (minimo: 10 kg)"
- **And** entity_type = 'product', entity_id = id del producto

### Scenario 2: Alerta ya existente para el mismo producto
- **Given** ya existe una alerta activa (resolved_at IS NULL) tipo 'low_inventory' para Fertilizante NPK
- **When** se ejecuta el cron job
- **Then** NO se genera una nueva alerta duplicada

### Scenario 3: Stock recuperado — alerta previa se auto-resuelve
- **Given** existe una alerta activa tipo 'low_inventory' para Fertilizante NPK
- **And** el stock actual ahora es 15kg (por encima del minimo de 10kg)
- **When** se ejecuta el cron job
- **Then** la alerta existente se resuelve automaticamente con resolved_at = NOW() y resolution_notes = "Stock recuperado automaticamente"

### Scenario 4: Producto sin threshold configurado
- **Given** un producto no tiene min_stock_threshold definido
- **When** se ejecuta el cron job
- **Then** ese producto se omite del check (no se puede determinar si esta bajo)

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Configuracion en vercel.json con schedule "0 */6 * * *"

## Technical Notes
- Route: `app/api/cron/stock-alerts/route.ts`
- Auth: CRON_SECRET
- Query principal:
  ```sql
  SELECT p.id, p.name, p.sku, uom.code as unit,
         COALESCE(SUM(ii.quantity_available), 0) as current_stock,
         p.min_stock_threshold
  FROM products p
  LEFT JOIN inventory_items ii ON ii.product_id = p.id AND ii.lot_status = 'available'
  LEFT JOIN units_of_measure uom ON p.default_unit_id = uom.id
  WHERE p.is_active = true
    AND p.min_stock_threshold IS NOT NULL
  GROUP BY p.id, p.name, p.sku, uom.code, p.min_stock_threshold
  HAVING COALESCE(SUM(ii.quantity_available), 0) < p.min_stock_threshold
  ```
- Nota: products no tiene company_id directamente. Filtrar por company via inventory_items -> zone -> facility -> company, o aceptar que es global si products es catalogo compartido.
- Auto-resolucion: para alertas existentes, verificar si stock actual >= threshold
- Vercel cron: `{"path": "/api/cron/stock-alerts?secret=CRON_SECRET", "schedule": "0 */6 * * *"}`

## UI/UX Notes
- No aplica (cron job sin UI)

## Dependencies
- US-047-001 (centro de alertas consume las alertas)
- Fase 2: F-026 (inventario con inventory_items y products)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-047-004: Cron job: verificacion de items proximos a vencer

## User Story

**As a** supervisor,
**I want** que el sistema verifique diariamente si hay lotes de inventario proximos a vencer (< 7 dias) y genere alertas agrupadas,
**So that** pueda priorizar su uso o descartarlos antes de que expiren.

## Acceptance Criteria

### Scenario 1: Lotes proximos a vencer detectados
- **Given** hay 5 inventory_items con expiration_date entre hoy y hoy+7dias
- **When** se ejecuta el cron job /api/cron/expiration-check
- **Then** se genera UNA alerta agrupada: tipo 'expiring_soon', severity 'warning', message "5 lotes expiran esta semana: Fertilizante NPK (2), Sustrato Premium (1), Agua Oxigenada (2)"
- **And** entity_type = 'company', entity_id = company_id (alerta global)

### Scenario 2: Lote que expira manana — severity critical
- **Given** un inventory_item tiene expiration_date = manana
- **When** se ejecuta el cron job
- **Then** ese item se incluye en la alerta con severity 'critical' (no warning)
- **And** el mensaje indica especificamente los items que expiran en < 24h

### Scenario 3: Sin lotes proximos a vencer
- **Given** ningun inventory_item tiene expiration_date en los proximos 7 dias
- **When** se ejecuta el cron job
- **Then** no se genera alerta
- **And** retorna `{checked: N, expiring: 0}`

### Scenario 4: Alerta de expiracion ya existe esta semana
- **Given** ya se genero una alerta 'expiring_soon' hoy
- **When** se ejecuta el cron nuevamente
- **Then** NO se genera una nueva alerta duplicada (debounce diario)

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Configuracion en vercel.json con schedule "0 6 * * *" (diario a las 6am)

## Technical Notes
- Route: `app/api/cron/expiration-check/route.ts`
- Auth: CRON_SECRET
- Query:
  ```sql
  SELECT ii.id, ii.expiration_date, p.name as product_name, p.sku,
         ii.quantity_available, uom.code as unit
  FROM inventory_items ii
  JOIN products p ON ii.product_id = p.id
  JOIN units_of_measure uom ON ii.unit_id = uom.id
  WHERE ii.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND ii.lot_status = 'available'
    AND ii.quantity_available > 0
  ORDER BY ii.expiration_date ASC
  ```
- Agrupar por producto en el mensaje: "Fertilizante NPK (3 lotes), Sustrato (2 lotes)"
- Severity: expira en < 24h = critical, 1-3 dias = warning, 3-7 dias = info
- Debounce: `SELECT COUNT(*) FROM alerts WHERE type = 'expiring_soon' AND DATE(triggered_at) = CURRENT_DATE`
- Vercel cron: `{"path": "/api/cron/expiration-check?secret=CRON_SECRET", "schedule": "0 6 * * *"}`

## UI/UX Notes
- No aplica (cron job sin UI)

## Dependencies
- US-047-001 (centro de alertas consume las alertas)
- Fase 2: F-026 (inventory_items con expiration_date)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-047-005: Push notifications para alertas criticas

## User Story

**As a** supervisor,
**I want** recibir push notifications en mi dispositivo cuando se genera una alerta critica,
**So that** pueda reaccionar inmediatamente a condiciones peligrosas incluso si no tengo la app abierta.

## Acceptance Criteria

### Scenario 1: Push notification por alerta critical
- **Given** el supervisor tiene push notifications habilitadas en su dispositivo
- **When** se genera una alerta con severity = 'critical' en una de sus zonas
- **Then** recibe una push notification con titulo "ALERTA CRITICA" y cuerpo con el mensaje de la alerta
- **And** al hacer tap en la notification, la app navega a ops-alerts

### Scenario 2: No enviar push para alertas info/warning
- **Given** se genera una alerta con severity = 'info' o 'warning'
- **When** se evalua si enviar push
- **Then** NO se envia push notification (solo critical)

### Scenario 3: Usuario no ha otorgado permiso de notificaciones
- **Given** el usuario no ha otorgado permiso de push en el navegador
- **When** accede a la app por primera vez
- **Then** se muestra un prompt amigable (no el nativo del browser) explicando el beneficio
- **And** si acepta, se solicita el permiso nativo
- **And** si rechaza, se registra y no se vuelve a pedir en 30 dias

### Scenario 4: Push offline — recibida al reconectar
- **Given** el supervisor no tiene conexion
- **When** se genera una alerta critical
- **Then** la push se encola
- **And** al recuperar conexion, la notification llega

## Definition of Done
- [ ] Implementacion completa y code reviewed
- [ ] Tests unitarios escritos y pasando
- [ ] Criterios de aceptacion verificados
- [ ] Service worker maneja push events
- [ ] Respeta preferencias del usuario

## Technical Notes
- Implementar con Web Push API + Serwist service worker
- Suscripcion: guardar endpoint en DB (tabla push_subscriptions o campo en users)
- Al crear alerta critical: llamar a web-push library para enviar a suscriptores relevantes
- Filtro de destinatarios: usuarios con rol supervisor/manager/admin en la misma facility que la zona de la alerta
- Service worker: evento 'push' muestra notification, evento 'notificationclick' navega a /operations/alerts
- Prompt custom: componente `PushPermissionBanner` que aparece despues de 3 sesiones

## UI/UX Notes
- Banner de permiso: card con icono de campanita, texto "Recibe alertas criticas al instante", botones "Activar" / "Ahora no"
- Notification: icono de app, titulo en mayusculas, body con mensaje de alerta
- Tap navega a ops-alerts con la alerta resaltada

## Dependencies
- US-047-001 (centro de alertas)
- Fase 0: Serwist (service worker configurado)

## Estimation
- **Size**: M
- **Complexity**: Medium
