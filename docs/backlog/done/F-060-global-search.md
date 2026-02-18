# F-060: Busqueda Global (Cmd+K)

## Overview

Modal de busqueda global accesible via Cmd+K en desktop o icono de lupa en mobile. Permite buscar en: batches (por codigo), productos (por SKU/nombre), ordenes (por codigo), zonas (por nombre), actividades (por tipo) y usuarios (por nombre). Los resultados se agrupan por categoria con highlight del texto coincidente. Incluye historial de busquedas recientes y navegacion directa al detalle del resultado seleccionado.

## User Personas

- **Operador**: Busca rapidamente un batch por codigo o una zona por nombre para navegar al detalle.
- **Supervisor**: Busca batches, operadores o actividades para gestion rapida.
- **Gerente**: Busca ordenes, batches o productos para analisis.
- **Admin**: Busca usuarios o cualquier entidad del sistema para configuracion.
- **Viewer**: Busca batches u ordenes para consulta read-only.

## Stories

| ID | Story | Size | Priority | Status |
|----|-------|------|----------|--------|
| US-060-001 | Modal de busqueda con input y shortcut Cmd+K | M | P0 | Planned |
| US-060-002 | Busqueda multi-entidad con resultados agrupados | L | P0 | Planned |
| US-060-003 | Historial de busquedas recientes | S | P2 | Planned |
| US-060-004 | Navegacion desde resultado al detalle | S | P0 | Planned |

---

# US-060-001: Modal de busqueda con input y shortcut Cmd+K

## User Story

**As a** supervisor,
**I want** abrir un modal de busqueda global con Cmd+K o tocando el icono de lupa,
**So that** pueda encontrar cualquier entidad del sistema desde cualquier pantalla sin navegar por menus.

## Acceptance Criteria

### Scenario 1: Abrir con shortcut en desktop
- **Given** el supervisor esta en cualquier pantalla del sistema en desktop
- **When** presiona Cmd+K (Mac) o Ctrl+K (Windows/Linux)
- **Then** se abre un modal centrado con un input de texto grande (20px font), focus automatico y placeholder "Buscar batches, productos, ordenes..."

### Scenario 2: Abrir con icono en mobile
- **Given** el operador esta en cualquier pantalla en mobile
- **When** toca el icono de lupa en el top bar
- **Then** se abre el mismo modal de busqueda a pantalla completa o como bottom sheet con input grande y teclado abierto automaticamente

### Scenario 3: Cerrar modal
- **Given** el modal de busqueda esta abierto
- **When** el usuario presiona Escape, toca fuera del modal (desktop) o el boton cerrar
- **Then** el modal se cierra y vuelve a la pantalla anterior sin perder estado

### Scenario 4: Shortcut no interfiere con inputs
- **Given** el usuario esta escribiendo en un input de formulario
- **When** presiona Cmd+K
- **Then** el shortcut NO se activa porque el focus esta en un campo de texto editable

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Event listener global para `keydown` que detecta Cmd/Ctrl+K y previene default
- No activar si `document.activeElement` es un input/textarea/contenteditable
- Modal: Dialog component con `autoFocus` en el input
- Zustand store para estado open/closed del modal
- Ref: `docs/alquemist-pwa-reqs.md` seccion "Busqueda Global"

## UI/UX Notes
- Desktop: modal centrado, max-width 640px, overlay #1A1A1A40
- Mobile: fullscreen o bottom sheet con height 90vh
- Input: font 20px DM Sans, background blanco, border-radius 12px
- Animacion de apertura: fade + scale 200ms ease-out
- Hint visible: "Cmd+K" badge en el top bar (desktop)

## Dependencies
- Requiere layout con top bar (Fase 0)

## Estimation
- **Size**: M
- **Complexity**: Medium

---

# US-060-002: Busqueda multi-entidad con resultados agrupados

## User Story

**As a** gerente,
**I want** escribir un termino y ver resultados agrupados por tipo (batches, productos, ordenes, zonas, actividades, usuarios) con el texto coincidente resaltado,
**So that** encuentre rapidamente lo que busco entre todas las entidades del sistema.

## Acceptance Criteria

### Scenario 1: Busqueda con resultados multiples
- **Given** el gerente escribe "gelato" en el campo de busqueda
- **When** hay coincidencias en batches, productos y cultivars
- **Then** ve resultados agrupados por seccion: "Batches" (LOT-GELATO-001, LOT-GELATO-002), "Productos" (SEM-GELATO, WET-GELATO), con "gelato" resaltado en amarillo en cada resultado

### Scenario 2: Busqueda con debounce
- **Given** el usuario esta escribiendo rapido "LOT-001"
- **When** escribe cada caracter
- **Then** la busqueda no se ejecuta en cada keystroke sino despues de 300ms de inactividad (debounce)

### Scenario 3: Busqueda sin resultados
- **Given** el usuario busca "xyz123nonexistent"
- **When** no hay coincidencias
- **Then** muestra empty state "No se encontraron resultados para 'xyz123nonexistent'" con sugerencia "Intenta con otro termino"

### Scenario 4: Busqueda con texto corto
- **Given** el usuario escribe solo 1 caracter
- **When** hay menos de 2 caracteres
- **Then** no se ejecuta la busqueda y muestra hint "Escribe al menos 2 caracteres"

### Scenario 5: Resultados filtrados por permisos
- **Given** un operador busca "admin settings"
- **When** los resultados se procesan
- **Then** solo muestra entidades a las que el operador tiene acceso segun su rol (no ve usuarios ni configuracion)

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Busqueda server-side con pg_trgm para fuzzy matching en PostgreSQL
- Queries paralelas a multiples tablas: `batches.code`, `products.sku, products.name`, `production_orders.code`, `zones.name`, `activity_types.name`, `users.full_name`
- Server Action: `globalSearch(query: string)` que retorna resultados agrupados
- Zod schema: `z.object({ query: z.string().min(2).max(100) })`
- RLS policies aseguran aislamiento por company_id automaticamente
- Filtrado por rol: el Server Action excluye categorias segun `auth.user_role()`
- Debounce client-side: 300ms con hook `useDebouncedValue`
- Highlight: componente `HighlightMatch` que envuelve texto coincidente en `<mark>`

## UI/UX Notes
- Resultados agrupados por seccion con header: icono + nombre de tipo + count
- Max 3 resultados por tipo, link "Ver todos" si hay mas
- Cada resultado: titulo (highlighted), subtitulo (metadata), icono de tipo
- Navegacion con flechas arriba/abajo entre resultados + Enter para seleccionar
- Loading: skeleton de 3 lineas durante busqueda
- Highlight: background #ECF7A3, border-radius 2px

## Dependencies
- Requiere pg_trgm extension habilitada en Supabase
- Requiere datos en multiples tablas (Fases 0-3)

## Estimation
- **Size**: L
- **Complexity**: High

---

# US-060-003: Historial de busquedas recientes

## User Story

**As a** operador,
**I want** ver mis busquedas recientes al abrir el modal de busqueda,
**So that** pueda repetir busquedas frecuentes sin volver a escribir el termino.

## Acceptance Criteria

### Scenario 1: Historial con busquedas previas
- **Given** el operador ha realizado 5 busquedas anteriores
- **When** abre el modal de busqueda con el campo vacio
- **Then** ve una lista "Recientes" con las ultimas 5 busquedas (texto + tipo de resultado seleccionado), ordenadas de mas reciente a mas antigua

### Scenario 2: Seleccionar busqueda del historial
- **Given** el operador ve "LOT-001" en su historial
- **When** toca ese item
- **Then** se ejecuta la busqueda de "LOT-001" y muestra los resultados actualizados

### Scenario 3: Limpiar historial
- **Given** el operador quiere limpiar su historial
- **When** toca "Limpiar historial"
- **Then** el historial se borra y muestra el estado vacio del modal

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Historial almacenado en `localStorage` con key `alquemist_search_history`
- Max 10 items, LIFO (ultimo entra, primero se muestra)
- Estructura: `{ query: string, resultType: string, timestamp: string }[]`
- Se actualiza al seleccionar un resultado, no al escribir

## UI/UX Notes
- Lista de recientes: icono reloj + texto + tipo badge
- Boton "Limpiar" en gris claro, esquina superior derecha de la seccion
- Transicion suave entre historial y resultados

## Dependencies
- Requiere modal de busqueda (US-060-001)

## Estimation
- **Size**: S
- **Complexity**: Low

---

# US-060-004: Navegacion desde resultado al detalle

## User Story

**As a** supervisor,
**I want** tocar un resultado de busqueda y navegar directamente a su pantalla de detalle,
**So that** llegue al dato que busco en un solo paso despues de encontrarlo.

## Acceptance Criteria

### Scenario 1: Navegar a batch
- **Given** el supervisor ve "LOT-GELATO-001" en los resultados de busqueda bajo "Batches"
- **When** toca ese resultado
- **Then** el modal se cierra y navega a `/batches/[id]` (pantalla `batch-detail`)

### Scenario 2: Navegar a orden
- **Given** el gerente ve "OP-2026-001" en resultados bajo "Ordenes"
- **When** selecciona ese resultado
- **Then** navega a `/orders/[id]` (pantalla `order-detail`)

### Scenario 3: Navegar a zona
- **Given** el supervisor selecciona "Sala Floracion A" bajo "Zonas"
- **When** toca el resultado
- **Then** navega a `/areas/zones/[id]` (pantalla `area-zone-detail`)

### Scenario 4: Resultado de entidad sin acceso
- **Given** un operador busca y aparece un resultado de tipo "Usuarios"
- **When** intenta acceder (no deberia ser posible por filtrado de permisos)
- **Then** el resultado no aparece en primer lugar (filtrado server-side), pero si por alguna razon navega a la URL, el middleware redirige a dashboard

## Definition of Done
- [ ] Implementation complete and code reviewed
- [ ] Unit tests written and passing
- [ ] Acceptance criteria verified
- [ ] Accessibility requirements met
- [ ] Performance within acceptable thresholds

## Technical Notes
- Mapa de rutas por tipo de entidad:
  - `batch` -> `/batches/{id}`
  - `product` -> `/inventory/products/{id}`
  - `production_order` -> `/orders/{id}`
  - `zone` -> `/areas/zones/{id}`
  - `activity` -> `/activities/{id}/execute`
  - `user` -> `/settings/users/{id}`
- `router.push()` de Next.js al seleccionar
- Cerrar modal antes de navegar

## UI/UX Notes
- Cursor pointer en cada resultado
- Hover: background surface, transicion 200ms
- Seleccion con keyboard: Enter navega al resultado focuseado

## Dependencies
- Requiere todas las pantallas de detalle existentes (Fases 0-3)

## Estimation
- **Size**: S
- **Complexity**: Low
